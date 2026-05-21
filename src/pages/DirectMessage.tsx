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
  deleteDirectMessage,
  softDeleteDirectMessage,
  setTypingIndicator,
  resetUnreadCount,
  subscribeToTypingIndicators,
  togglePinDirectMessage,
  createRecoveryRequest,
  db
} from "@/services/firebase";
import { offlineCache } from "@/services/offlineCache";
import { generateUUID } from "@/utils/uuid";
import { hybridMessaging, HybridMessage } from "@/services/hybridMessaging";
import { bluetoothMessaging } from "@/services/bluetoothMessaging";
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { DirectMessageHeader } from '@/components/direct-message/DirectMessageHeader';
import { MessageList } from '@/components/direct-message/MessageList';
import { MessageInput } from '@/components/direct-message/MessageInput';
import { ThreadView } from '@/components/ThreadView';
import { PinnedMessagesSidebar } from '@/components/PinnedMessagesSidebar';
import { CreatePollDialog } from '@/components/CreatePollDialog';
import { PollVotersSidebar } from '@/components/PollVotersSidebar';

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
  type: 'text' | 'image' | 'file' | 'audio' | 'document' | 'poll';
  pollData?: {
    question: string;
    options: { id: string; text: string; userIds: string[] }[];
    allowMultipleAnswers: boolean;
  };
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
  isPinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: Date;
  isCleared?: boolean;
  clearedAt?: Date;
  parentMessageId?: string;
  replyCount?: number;
}

export const DirectMessage: React.FC<DirectMessageProps> = ({
  conversationId,
  otherUser,
  onBack
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isOnline, wasOffline } = useNetworkStatus();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string, userName: string }>>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [selectedThreadMessage, setSelectedThreadMessage] = useState<Message | null>(null);
  const [showPinnedSidebar, setShowPinnedSidebar] = useState(false);
  const [isPollDialogOpen, setIsPollDialogOpen] = useState(false);
  const [selectedPollIdForVoters, setSelectedPollIdForVoters] = useState<string | null>(null);

  // Clear poll voters sidebar when switching conversations
  useEffect(() => {
    setSelectedPollIdForVoters(null);
  }, [conversationId]);
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

  const clearChat = async () => {
    // Soft delete all messages in this conversation
    if (!user) return;

    // Only proceed if there are messages to delete
    // Only proceed if there are messages that haven't been cleared yet
    const activeMessages = messages.filter((msg) => !msg.isCleared);
    if (activeMessages.length === 0) {
      toast({
        title: 'Chat is already empty',
        description: 'There are no messages to clear.',
      });
      return;
    }

    try {
      // Use a loading toast for large deletions
      const isLargeChat = activeMessages.length > 10;
      if (isLargeChat) {
        toast({
          title: 'Clearing chat...',
          description: `Deleting ${activeMessages.length} messages. This may take a moment.`,
        });
      }

      const deletePromises = activeMessages.map((msg) =>
        deleteDirectMessage(conversationId, msg.id, user.uid, true)
      );

      await Promise.all(deletePromises);

      setMessages([]);
      // Remove cached messages for this conversation
      offlineCache.removeCachedConversation(conversationId);

      toast({
        title: 'Chat cleared',
        description: 'All messages have been removed. They can be recovered within 6 months.',
      });
    } catch (error) {
      console.error('Error clearing chat:', error);
      toast({
        title: 'Error clearing chat',
        description: 'Something went wrong while trying to clear the messages. Please try again.',
        variant: 'destructive',
      });
    }
  }

  const handleRequestRecovery = async () => {
    if (!user) return;
    
    try {
      await createRecoveryRequest(conversationId, user.uid, user.name || 'Unknown User');
      toast({
        title: 'Recovery request sent',
        description: 'Your request has been sent to the administrator for approval.',
      });
    } catch (error) {
      console.error('Error requesting recovery:', error);
      toast({
        title: 'Request failed',
        description: 'Failed to send recovery request. Please try again later.',
        variant: 'destructive',
      });
    }
  };


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-primary/20', 'transition-colors', 'duration-500');
      setTimeout(() => {
        el.classList.remove('bg-primary/20');
      }, 2000);
    }
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

      // Reset unread count immediately if online
      if (isOnline && user) {
        resetUnreadCount(conversationId, user.uid);
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
                  // Reset conversation unread count
                  resetUnreadCount(conversationId, user.uid);

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
    if (!isOnline && !bluetoothStatus.enabled) {
      // We can no longer automatically scan for Bluetooth devices when going offline
      // because browsers require a user gesture (like a button click) to open the
      // Bluetooth device chooser (SecurityError).
      console.log("[Bluetooth] Offline mode detected. User must manually initiate Bluetooth scan.");
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
  }, [isOnline, bluetoothStatus.enabled, toast]);

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

    try {
      if (editingMessageId) {
        // Handle edit mode
        await editDirectMessage(conversationId, editingMessageId, newMessage.trim(), user.uid);
        setEditingMessageId(null);
        setEditingText('');
        setNewMessage('');
        toast({
          title: "Message updated",
          description: "Your message has been edited successfully."
        });
      } else {
        // Handle new message mode
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

        // Clear typing indicator if online
        if (isOnline && typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          try {
            await setTypingIndicator(conversationId, user.uid, user.name || 'Unknown User', false);
          } catch (error) {
            console.log('Typing indicator error:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error in message action:', error);

      // Restore message on error
      if (!editingMessageId) {
        setNewMessage(newMessage.trim());
      }

      toast({
        title: "Action Failed",
        description: editingMessageId ? "Failed to update message." : "Failed to send message.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handlePollSubmit = async (pollData: any) => {
    if (!user) return;
    
    setIsSending(true);
    try {
      const messageData = {
        text: `📊 Poll: ${pollData.question}`,
        senderId: user.uid,
        senderName: user.name || 'Unknown User',
        senderAvatar: user.avatar || '',
        type: 'poll' as const,
        pollData: pollData
      };

      await hybridMessaging.sendMessage(
        conversationId,
        messageData,
        isOnline
      );

      toast({
        title: "Poll created",
        description: "Your poll has been sent to the chat."
      });
    } catch (error) {
      console.error('Error sending poll:', error);
      toast({
        title: "Failed to send poll",
        description: "An error occurred while creating the poll.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleTogglePin = async (messageId: string, isPinned: boolean) => {
    if (!user) return;

    // Skip pinning when offline
    if (!isOnline) {
      toast({
        title: "Pin Unavailable",
        description: "Message pinning requires an internet connection.",
        duration: 3000,
      });
      return;
    }

    try {
      await togglePinDirectMessage(conversationId, messageId, user.uid, isPinned);
      toast({
        title: isPinned ? "Message Pinned" : "Message Unpinned",
        description: isPinned ? "The message has been pinned." : "The message has been unpinned."
      });
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast({
        title: "Error",
        description: "Failed to update pinned status",
        variant: "destructive"
      });
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
          description: "No compatible Chatter devices found nearby. Make sure Bluetooth is enabled and devices are close by.",
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

      const messageId = generateUUID();
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

      const messageId = generateUUID();
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
    <div className="flex-1 flex overflow-hidden h-full">
      <div className="flex-1 flex flex-col min-w-0 bg-background relative">
        <DirectMessageHeader 
          otherUser={otherUser}
          onClearChat={clearChat}
          onRequestRecovery={handleRequestRecovery}
          messages={messages}
          onTogglePinnedSidebar={() => setShowPinnedSidebar(!showPinnedSidebar)}
        />

        {/* Offline/Bluetooth Mode Indicator */}
        {(isOfflineMode || bluetoothStatus.enabled) && (
          <div className={`border-b px-4 py-2 ${bluetoothStatus.enabled
            ? 'bg-blue-100 dark:bg-blue-900'
            : 'bg-yellow-100 dark:bg-yellow-900'
            }`}>
            <div className={`flex items-center justify-between ${bluetoothStatus.enabled
              ? 'text-blue-800 dark:text-blue-200'
              : 'text-yellow-800 dark:text-yellow-200'
              }`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${bluetoothStatus.enabled ? 'bg-blue-500' : 'bg-yellow-500'
                  } animate-pulse`} />
                <span className="text-xs font-medium">
                  {bluetoothStatus.enabled
                    ? `Bluetooth Active: ${bluetoothStatus.deviceCount} device(s) connected`
                    : 'Offline Mode: Messages will sync when online'
                  }
                </span>
              </div>
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
          messages={messages.filter(m => !m.parentMessageId && !m.isCleared)}
          conversationId={conversationId}
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
          handleTogglePin={handleTogglePin}
          onOpenThread={(msg) => setSelectedThreadMessage(msg as any)}
          onViewVoters={(msg) => setSelectedPollIdForVoters(msg.id)}
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
          editingText={editingText}
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
          handleCreatePoll={() => setIsPollDialogOpen(true)}
          isOfflineMode={isOfflineMode}
        />
      </div>

      <CreatePollDialog
        isOpen={isPollDialogOpen}
        onClose={() => setIsPollDialogOpen(false)}
        onSubmit={handlePollSubmit}
      />
      {selectedPollIdForVoters && (
        <PollVotersSidebar 
          message={messages.find(m => m.id === selectedPollIdForVoters)! as any}
          onClose={() => setSelectedPollIdForVoters(null)}
        />
      )}

      {selectedThreadMessage && (
        <ThreadView
          parentMessage={selectedThreadMessage as any}
          groupId={conversationId}
          isDM={true}
          onClose={() => setSelectedThreadMessage(null)}
        />
      )}
      {showPinnedSidebar && (
        <PinnedMessagesSidebar
          messages={messages}
          onClose={() => setShowPinnedSidebar(false)}
          onTogglePin={handleTogglePin}
          onMessageClick={scrollToMessage}
        />
      )}
    </div>
  );
};