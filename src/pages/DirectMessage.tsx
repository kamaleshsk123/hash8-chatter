import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Button } from "@/components/ui/button";
import { Bluetooth, Loader2 } from "lucide-react";
import imageCompression from 'browser-image-compression';
import { uploadDocumentToCloudinary, uploadImageToCloudinary } from '@/services/cloudinary';
import { 
  subscribeToDirectMessages,
  markDirectMessageAsRead,
  sendDirectMessageWithFile,
  addMessageReaction,
  editDirectMessage,
  softDeleteDirectMessage,
  setTypingIndicator,
  subscribeToTypingIndicators,
  db
} from "@/services/firebase";
import { offlineCache } from "@/services/offlineCache";
import { hybridMessaging, HybridMessage } from "@/services/hybridMessaging";
import { bluetoothMessaging } from "@/services/bluetoothMessaging";
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { DirectMessageHeader } from '@/components/direct-message/DirectMessageHeader';
import { MessageList } from '@/components/direct-message/MessageList';
import { MessageInput } from '@/components/direct-message/MessageInput';

interface DirectMessageProps {
  conversationId: string;
  otherUser: {
    userId: string;
    name: string;
    avatar: string;
    role?: string;
  };
  onBack: () => void;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file' | 'audio' | 'document';
  readBy: Array<{
    userId: string;
    userName: string;
    userAvatar: string;
    readAt: Date;
  }>;
  isRead: boolean;
  reactions?: Record<string, Array<{
    userId: string;
    userName: string;
    timestamp: Date;
  }>>;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  filePath?: string;
  isEdited?: boolean;
  editedAt?: Date;
  replyTo?: {
    messageId: string;
    text: string;
    senderName: string;
  };
  deleted?: boolean;
  hasPendingWrites?: boolean; // Added for offline support
}

export const DirectMessage: React.FC<DirectMessageProps> = ({
  conversationId,
  otherUser,
  onBack
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isOnline, wasOffline } = useNetworkStatus();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Array<{userId: string, userName: string}>>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [bluetoothStatus, setBluetoothStatus] = useState<{
    enabled: boolean;
    deviceCount: number;
    scanning: boolean;
  }>({ enabled: false, deviceCount: 0, scanning: false });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load messages with offline support
  useEffect(() => {
    if (!conversationId) return;
    
    setIsLoading(true);
    let unsubscribe: (() => void) | null = null;

    const loadMessages = async () => {
      // Get cached conversation metadata if otherUser is missing info
      let effectiveOtherUser = otherUser;
      if (!otherUser.name || otherUser.name === otherUser.userId) {
        const cachedMetadata = offlineCache.getCachedConversationMetadata(conversationId);
        if (cachedMetadata && cachedMetadata.otherUser) {
          effectiveOtherUser = {
            ...otherUser,
            ...cachedMetadata.otherUser
          };
        }
      }
      
      // Try to get cached messages first (especially important when offline)
      const cachedData = offlineCache.getCachedMessages(conversationId);
      
      if (cachedData && cachedData.messages.length > 0) {
        console.log('Loading cached messages for conversation:', conversationId);
        setMessages(cachedData.messages);
        setIsLoading(false);
        setIsOfflineMode(!isOnline);
        
        // Show offline indicator
        if (!isOnline) {
          toast({
            title: "Offline Mode",
            description: "Showing cached messages. New messages will sync when online.",
            duration: 3000,
          });
        }
      }

      // If online, also set up real-time subscription
      if (isOnline) {
        try {
          unsubscribe = subscribeToDirectMessages(
            conversationId,
            (newMessages) => {
              console.log('Received live messages for conversation:', conversationId);
              setMessages(newMessages);
              setIsLoading(false);
              setIsOfflineMode(false);
              
              // Cache the messages for offline use
              offlineCache.cacheMessages(conversationId, newMessages, effectiveOtherUser);
              
              if (user) {
                const unreadMessages = newMessages.filter(msg => 
                  msg.senderId !== user.uid && 
                  !msg.readBy.some(receipt => receipt.userId === user.uid)
                );
                
                if (unreadMessages.length > 0) {
                  unreadMessages.forEach(msg => {
                    markDirectMessageAsRead(
                      conversationId,
                      msg.id,
                      user.uid,
                      user.name || 'Unknown User',
                      user.avatar || ''
                    );
                  });
                }
              }
            },
            (error) => {
              console.error('Error subscribing to messages:', error);
              setIsLoading(false);
              
              // If subscription fails and we don't have cached data, show error
              if (!cachedData) {
                toast({
                  title: "Error",
                  description: "Failed to load messages. Check your connection."
                });
              } else {
                // We have cached data, just show offline mode
                setIsOfflineMode(true);
                toast({
                  title: "Connection Issue",
                  description: "Showing cached messages. Trying to reconnect...",
                  duration: 3000,
                });
              }
            }
          );
        } catch (error) {
          console.error('Failed to establish subscription:', error);
          setIsLoading(false);
          setIsOfflineMode(true);
        }
      } else {
        // Offline mode
        if (!cachedData) {
          // No cached messages, but that's OK for a new conversation
          setIsLoading(false);
          setIsOfflineMode(true);
          console.log('Starting fresh offline conversation:', conversationId);
          
          // Don't show an error toast for new conversations - this is normal
          // The user can still compose messages that will be queued
        }
      }
    };

    loadMessages();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [conversationId, toast, user, isOnline, otherUser]);

  // Set up hybrid messaging listener
  useEffect(() => {
    const unsubscribe = hybridMessaging.onMessage((hybridMessage: HybridMessage) => {
      if (hybridMessage.conversationId === conversationId) {
        // Convert hybrid message to regular message format
        const message: Message = {
          id: hybridMessage.id,
          text: hybridMessage.text,
          senderId: hybridMessage.senderId,
          senderName: hybridMessage.senderName,
          senderAvatar: hybridMessage.senderAvatar,
          timestamp: hybridMessage.timestamp,
          type: hybridMessage.type,
          readBy: [],
          isRead: false,
          reactions: {},
          hasPendingWrites: hybridMessage.transport !== 'firebase',
          replyTo: hybridMessage.replyTo
        };

        // Add transport indicator for UI
        (message as any).transport = hybridMessage.transport;
        
        setMessages(prev => {
          // Avoid duplicates
          const exists = prev.some(msg => msg.id === message.id);
          if (exists) return prev;
          return [...prev, message];
        });
      }
    });

    return unsubscribe;
  }, [conversationId]);

  // Update offline mode based on network status
  useEffect(() => {
    setIsOfflineMode(!isOnline);
  }, [isOnline]);

  // Handle network status changes for Bluetooth
  useEffect(() => {
    if (!isOnline && !bluetoothStatus.enabled && !bluetoothStatus.scanning) {
      // Try to enable Bluetooth when going offline
      setBluetoothStatus(prev => ({ ...prev, scanning: true }));
      
      hybridMessaging.enableBluetoothMode()
        .then(enabled => {
          setBluetoothStatus({
            enabled,
            deviceCount: enabled ? bluetoothMessaging.getConnectedDevices().length : 0,
            scanning: false
          });
          
          if (enabled) {
            toast({
              title: "Bluetooth Messaging Enabled",
              description: `Connected to ${bluetoothMessaging.getConnectedDevices().length} nearby device(s)`,
              duration: 4000,
            });
          }
        })
        .catch(error => {
          console.error('Bluetooth initialization failed:', error);
          setBluetoothStatus({ enabled: false, deviceCount: 0, scanning: false });
        });
    } else if (isOnline && bluetoothStatus.enabled) {
      // Sync Bluetooth messages when coming back online
      hybridMessaging.syncOfflineMessages()
        .then(() => {
          toast({
            title: "Messages Synced",
            description: "Bluetooth messages have been synced to the server.",
            duration: 3000,
          });
        })
        .catch(error => {
          console.error('Sync failed:', error);
        });
    }
  }, [isOnline, bluetoothStatus.enabled, bluetoothStatus.scanning, toast]);

  useEffect(() => {
    if (!conversationId || !user) return;

    const unsubscribe = subscribeToTypingIndicators(
      conversationId,
      user.uid,
      setTypingUsers
    );

    return () => unsubscribe();
  }, [conversationId, user]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || isSending) return;

    setIsSending(true);
    
    const messageData = {
      text: newMessage.trim(),
      senderId: user.uid,
      senderName: user.name || 'Unknown User',
      senderAvatar: user.avatar || '',
      type: 'text' as const,
      replyTo: replyToMessage ? {
        messageId: replyToMessage.id,
        text: replyToMessage.text,
        senderName: replyToMessage.senderName
      } : undefined
    };
    
    try {
      // Clear input immediately for better UX
      setNewMessage('');
      setReplyToMessage(null);
      
      // Use hybrid messaging system
      const result = await hybridMessaging.sendMessage(
        conversationId,
        messageData,
        isOnline
      );

      // Show appropriate feedback based on transport used
      if (result.transport === 'bluetooth') {
        toast({
          title: "Sent via Bluetooth",
          description: `Message sent to ${bluetoothStatus.deviceCount} nearby device(s). Will sync when online.`,
          duration: 4000,
        });
      } else if (result.transport === 'cache') {
        toast({
          title: "Message Queued",
          description: isOnline 
            ? "Message cached due to connection issues."
            : "Message will be sent when you're back online.",
          duration: 3000,
        });
      }
      // Firebase messages don't need toast (normal behavior)
      
      // Clear typing indicator if online
      if (isOnline && typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        try {
          await setTypingIndicator(conversationId, user.uid, user.name || 'Unknown User', false);
        } catch (error) {
          console.log('Typing indicator error:', error);
        }
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Restore message on error
      setNewMessage(messageData.text);
      if (messageData.replyTo) {
        setReplyToMessage({
          id: messageData.replyTo.messageId,
          text: messageData.replyTo.text,
          senderName: messageData.replyTo.senderName
        } as Message);
      }
      
      toast({
        title: "Send Failed",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleManualBluetoothScan = async () => {
    setBluetoothStatus(prev => ({ ...prev, scanning: true }));
    
    try {
      const success = await hybridMessaging.enableBluetoothMode();
      
      if (success) {
        const deviceCount = bluetoothMessaging.getConnectedDevices().length;
        setBluetoothStatus({
          enabled: true,
          deviceCount,
          scanning: false
        });
        
        toast({
          title: "Bluetooth Connected",
          description: `Successfully connected to ${deviceCount} device${deviceCount !== 1 ? 's' : ''}. You can now send messages via Bluetooth.`,
          duration: 4000,
        });
      } else {
        setBluetoothStatus({ enabled: false, deviceCount: 0, scanning: false });
        
        toast({
          title: "No Devices Found",
          description: "No compatible Hash8 Chatter devices found nearby. Make sure Bluetooth is enabled and devices are close by.",
          variant: "destructive",
          duration: 4000,
        });
      }
    } catch (error: any) {
      console.error('Manual Bluetooth scan failed:', error);
      setBluetoothStatus({ enabled: false, deviceCount: 0, scanning: false });
      
      // Handle user cancellation gracefully
      if (error?.message?.includes('User cancelled') || error?.name === 'NotFoundError') {
        toast({
          title: "Scan Cancelled",
          description: "Bluetooth device selection was cancelled.",
          duration: 3000,
        });
      } else {
        toast({
          title: "Bluetooth Error",
          description: "Failed to connect to Bluetooth devices. Make sure Bluetooth is enabled on your device.",
          variant: "destructive",
          duration: 4000,
        });
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    if (!user || !isOnline) return; // Skip typing indicators when offline

    try {
      await setTypingIndicator(conversationId, user.uid, user.name || 'Unknown User', true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(async () => {
        try {
          await setTypingIndicator(conversationId, user.uid, user.name || 'Unknown User', false);
        } catch (error) {
          // Ignore typing indicator errors when offline
          console.log('Typing indicator error (offline):', error);
        }
      }, 2000);
    } catch (error) {
      // Ignore typing indicator errors when offline
      console.log('Typing indicator error (offline):', error);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!user || isSending) return;

    // Check if we're offline and warn user about file uploads
    if (!isOnline) {
      toast({
        title: "File Upload Unavailable",
        description: "File uploads require an internet connection. Please try again when online.",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    setIsSending(true);
    try {
      let fileUrl = '';
      let processedFile = file;
      let fileType: 'image' | 'document' | 'audio' = 'document';

      if (file.type.startsWith('image/')) {
        fileType = 'image';
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true
        };
        processedFile = await imageCompression(file, options);
        fileUrl = await uploadImageToCloudinary(processedFile);
      } else if (file.type.startsWith('audio/')) {
        fileType = 'audio';
        await sendDirectMessageWithFile(conversationId, {
          text: '',
          senderId: user.uid,
          senderName: user.name || 'Unknown User',
          senderAvatar: user.avatar || '',
          file: processedFile,
          fileType
        });
        return;
      } else {
        fileUrl = await uploadDocumentToCloudinary(file);
      }

      const messageId = crypto.randomUUID();
      const messageRef = doc(db, `direct_messages/${conversationId}/messages`, messageId);
      
      const messageDoc = {
        id: messageId,
        conversationId: conversationId,
        text: fileType === 'image' ? '' : file.name,
        senderId: user.uid,
        senderName: user.name || 'Unknown User',
        senderAvatar: user.avatar || '',
        type: fileType,
        timestamp: serverTimestamp(),
        readBy: [],
        isRead: false,
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        reactions: {}
      };
      
      await setDoc(messageRef, messageDoc);
      
      const conversationRef = doc(db, 'direct_messages', conversationId);
      await updateDoc(conversationRef, {
        lastActivity: serverTimestamp(),
        lastMessage: {
          text: `📎 ${file.name}`,
          senderId: user.uid,
          senderName: user.name || 'Unknown User',
          timestamp: serverTimestamp(),
          type: fileType
        }
      });

    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload file"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleVoiceMessage = async (audioBlob: Blob, duration: number) => {
    if (!user || isSending) return;

    // Check if we're offline and warn user about voice messages
    if (!isOnline) {
      toast({
        title: "Voice Message Unavailable",
        description: "Voice messages require an internet connection. Please try again when online.",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    setIsSending(true);
    try {
      const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, {
        type: 'audio/webm'
      });

      const fileUrl = await uploadDocumentToCloudinary(audioFile);

      const messageId = crypto.randomUUID();
      const messageRef = doc(db, `direct_messages/${conversationId}/messages`, messageId);
      
      const messageDoc = {
        id: messageId,
        conversationId: conversationId,
        text: `Voice message (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})`,
        senderId: user.uid,
        senderName: user.name || 'Unknown User',
        senderAvatar: user.avatar || '',
        type: 'audio',
        timestamp: serverTimestamp(),
        readBy: [],
        isRead: false,
        fileUrl,
        fileName: audioFile.name,
        fileSize: audioFile.size,
        reactions: {}
      };
      
      await setDoc(messageRef, messageDoc);
      
      const conversationRef = doc(db, 'direct_messages', conversationId);
      await updateDoc(conversationRef, {
        lastActivity: serverTimestamp(),
        lastMessage: {
          text: `🎤 Voice message`,
          senderId: user.uid,
          senderName: user.name || 'Unknown User',
          timestamp: serverTimestamp(),
          type: 'audio'
        }
      });

    } catch (error) {
      console.error('Error sending voice message:', error);
      toast({
        title: "Error",
        description: "Failed to send voice message"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    // Skip reactions when offline
    if (!isOnline) {
      toast({
        title: "Reactions Unavailable",
        description: "Message reactions require an internet connection.",
        duration: 3000,
      });
      return;
    }

    try {
      await addMessageReaction(conversationId, messageId, user.uid, user.name || 'Unknown User', emoji);
    } catch (error) {
      console.error('Error adding reaction:', error);
      toast({
        title: "Error",
        description: "Failed to add reaction"
      });
    }
  };

  const handleEditMessage = (message: Message) => {
    // Skip editing when offline
    if (!isOnline) {
      toast({
        title: "Edit Unavailable",
        description: "Message editing requires an internet connection.",
        duration: 3000,
      });
      return;
    }
    
    setEditingMessageId(message.id);
    setEditingText(message.text);
    setNewMessage(message.text);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user) return;

    // Skip deletion when offline
    if (!isOnline) {
      toast({
        title: "Delete Unavailable",
        description: "Message deletion requires an internet connection.",
        duration: 3000,
      });
      return;
    }

    try {
      await softDeleteDirectMessage(conversationId, messageId, user.uid);
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message"
      });
    }
  };

  const handleReplyToMessage = (message: Message) => {
    setReplyToMessage(message);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditingText('');
    setNewMessage('');
  };

  const cancelReply = () => {
    setReplyToMessage(null);
  };

  const handleReplyClick = (messageId: string) => {
    const messageElement = messageRefs.current[messageId];
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background">
      <DirectMessageHeader otherUser={otherUser} />
      
      {/* Offline/Bluetooth Mode Indicator */}
      {(isOfflineMode || bluetoothStatus.enabled) && (
        <div className={`border-b px-4 py-2 ${
          bluetoothStatus.enabled 
            ? 'bg-blue-100 dark:bg-blue-900' 
            : 'bg-yellow-100 dark:bg-yellow-900'
        }`}>
          <div className={`flex items-center justify-between ${
            bluetoothStatus.enabled 
              ? 'text-blue-800 dark:text-blue-200' 
              : 'text-yellow-800 dark:text-yellow-200'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                bluetoothStatus.enabled ? 'bg-blue-500' : 'bg-yellow-500'
              }`}></div>
              <span className="text-sm font-medium">
                {bluetoothStatus.enabled 
                  ? `Bluetooth Mode (${bluetoothStatus.deviceCount} device${bluetoothStatus.deviceCount !== 1 ? 's' : ''})` 
                  : 'Offline Mode'
                }
              </span>
              <span className="text-xs opacity-75">
                {bluetoothStatus.enabled 
                  ? '- P2P messaging active'
                  : bluetoothStatus.scanning 
                    ? '- Scanning for devices...'
                    : '- Showing cached messages'
                }
              </span>
            </div>
            
            {/* Manual Bluetooth Scan Button - only show when offline and not already connected */}
            {!isOnline && !bluetoothStatus.enabled && (
              <Button
                onClick={handleManualBluetoothScan}
                disabled={bluetoothStatus.scanning}
                size="sm"
                variant="outline"
                className="text-xs h-7 border-current"
              >
                {bluetoothStatus.scanning ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Scanning
                  </>
                ) : (
                  <>
                    <Bluetooth className="h-3 w-3 mr-1" />
                    Find Devices
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}
      
      <MessageList
        messages={messages}
        user={user}
        otherUser={otherUser}
        isLoading={isLoading}
        messagesEndRef={messagesEndRef}
        messageRefs={messageRefs}
        handleEditMessage={handleEditMessage}
        handleDeleteMessage={handleDeleteMessage}
        handleReplyToMessage={handleReplyToMessage}
        handleReaction={handleReaction}
        handleReplyClick={handleReplyClick}
      />
      {typingUsers.length > 0 && (
        <div className="px-4 py-2">
          <div className="text-xs text-muted-foreground">
            {typingUsers.map(u => u.userName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        </div>
      )}
      <MessageInput
        newMessage={newMessage}
        isSending={isSending}
        editingMessageId={editingMessageId}
        otherUser={otherUser}
        replyToMessage={replyToMessage}
        fileInputRef={fileInputRef}
        handleInputChange={handleInputChange}
        handleKeyPress={handleKeyPress}
        handleSendMessage={handleSendMessage}
        handleFileUpload={handleFileUpload}
        handleVoiceMessage={handleVoiceMessage}
        handleEmojiSelect={handleEmojiSelect}
        cancelReply={cancelReply}
        cancelEditing={cancelEditing}
        isOfflineMode={isOfflineMode}
      />
    </div>
  );
};