import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, MoreVertical, Check, CheckCheck, Paperclip, Edit2, Trash2, Reply, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { EmojiPickerComponent } from "@/components/EmojiPicker";
import { MessageReactions } from "@/components/MessageReactions";
import { ReplyToMessage } from "@/components/ReplyToMessage";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import imageCompression from 'browser-image-compression';
import { uploadDocumentToCloudinary, uploadImageToCloudinary } from '@/services/cloudinary';
import { 
  sendDirectMessage, 
  getDirectMessages,
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
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

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
}

export const DirectMessage: React.FC<DirectMessageProps> = ({
  conversationId,
  otherUser,
  onBack
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Array<{userId: string, userName: string}>>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load and subscribe to messages
  useEffect(() => {
    if (!conversationId) return;
    
    setIsLoading(true);
    
    // Subscribe to real-time messages
    const unsubscribe = subscribeToDirectMessages(
      conversationId,
      (newMessages) => {
        setMessages(newMessages);
        setIsLoading(false);
        
        // Mark messages as read when they come in (if not sent by current user)
        if (user) {
          const unreadMessages = newMessages.filter(msg => 
            msg.senderId !== user.uid && 
            !msg.readBy.some(receipt => receipt.userId === user.uid)
          );
          
          if (unreadMessages.length > 0) {
            // Mark all unread messages as read
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
        toast({
          title: "Error",
          description: "Failed to load messages"
        });
      }
    );

    return () => unsubscribe();
  }, [conversationId, toast, user]);

  // Subscribe to typing indicators
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
        // Edit existing message
        await editDirectMessage(conversationId, editingMessageId, newMessage.trim(), user.uid);
        setEditingMessageId(null);
        setEditingText('');
      } else {
        // Send new message
        const messageData: any = {
          text: newMessage.trim(),
          senderId: user.uid,
          senderName: user.name || 'Unknown User',
          senderAvatar: user.avatar || '',
          type: 'text'
        };

        // Add reply reference if replying
        if (replyToMessage) {
          messageData.replyTo = {
            messageId: replyToMessage.id,
            text: replyToMessage.text,
            senderName: replyToMessage.senderName
          };
        }

        await sendDirectMessage(conversationId, messageData);
        setReplyToMessage(null);
      }

      setNewMessage('');
      
      // Clear typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      await setTypingIndicator(conversationId, user.uid, user.name || 'Unknown User', false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle typing indicators
  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    if (!user) return;

    // Set typing indicator
    await setTypingIndicator(conversationId, user.uid, user.name || 'Unknown User', true);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to clear typing indicator
    typingTimeoutRef.current = setTimeout(async () => {
      await setTypingIndicator(conversationId, user.uid, user.name || 'Unknown User', false);
    }, 2000);
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!user || isSending) return;

    setIsSending(true);
    try {
      let fileUrl = '';
      let processedFile = file;
      let fileType: 'image' | 'document' | 'audio' = 'document';

      // Determine file type and upload strategy
      if (file.type.startsWith('image/')) {
        fileType = 'image';
        // Compress image
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true
        };
        processedFile = await imageCompression(file, options);
        // Upload to Cloudinary for images
        fileUrl = await uploadImageToCloudinary(processedFile);
      } else if (file.type.startsWith('audio/')) {
        fileType = 'audio';
        // Use Firebase for audio files
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
        // Upload documents to Cloudinary
        fileUrl = await uploadDocumentToCloudinary(file);
      }

      // Send message with Cloudinary URL
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
      
      // Update conversation's lastActivity
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

  // Handle voice message
  const handleVoiceMessage = async (audioBlob: Blob, duration: number) => {
    if (!user || isSending) return;

    setIsSending(true);
    try {
      // Convert blob to base64 for Cloudinary upload
      const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, {
        type: 'audio/webm'
      });

      // Upload voice message to Cloudinary instead of Firebase
      const fileUrl = await uploadDocumentToCloudinary(audioFile);

      // Send message with Cloudinary URL
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
      
      // Update conversation's lastActivity
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

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
  };

  // Handle message reaction
  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

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

  // Handle message editing
  const handleEditMessage = (message: Message) => {
    setEditingMessageId(message.id);
    setEditingText(message.text);
    setNewMessage(message.text);
  };

  // Handle message deletion
  const handleDeleteMessage = async (messageId: string) => {
    if (!user) return;

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

  // Handle reply to message
  const handleReplyToMessage = (message: Message) => {
    setReplyToMessage(message);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditingText('');
    setNewMessage('');
  };

  // Cancel reply
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
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-3 flex-1">
          <Avatar className="h-10 w-10">
            <AvatarImage src={otherUser.avatar} alt={otherUser.name} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {otherUser.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">{otherUser.name}</h3>
            {otherUser.role && (
              <p className="text-xs text-muted-foreground">
                {otherUser.role}
              </p>
            )}
          </div>
        </div>

        <Button variant="ghost" size="sm" className="p-2">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-muted-foreground">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <div className="text-sm text-muted-foreground mb-2">
              No messages yet
            </div>
            <div className="text-xs text-muted-foreground">
              Start a conversation with {otherUser.name}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwnMessage = message.senderId === user?.uid;
              
              return (
                <div
                  key={message.id}
                  ref={(el) => {
                    if (el) messageRefs.current[message.id] = el;
                  }}
                  className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {!isOwnMessage && (
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarImage src={message.senderAvatar} alt={message.senderName} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {message.senderName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={`flex flex-col max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'} group`}>
                    {/* Reply indicator - WhatsApp style */}
                    {message.replyTo && (
                      <ReplyToMessage
                        senderName={message.replyTo.senderName}
                        text={message.replyTo.text}
                        isOwnMessage={isOwnMessage}
                        onClick={() => handleReplyClick(message.replyTo.messageId)}
                      />
                    )}
                    
                    <div className="relative">
                      <div
                        className={`rounded-lg px-3 py-2 ${
                          isOwnMessage
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                        
                      >
                        {/* File/Voice message display */}
                        {message.fileUrl && (
                          <div className="mb-2">
                            {message.type === 'image' ? (
                              <img 
                                src={message.fileUrl} 
                                alt={message.fileName} 
                                className="max-w-xs rounded cursor-pointer"
                                onClick={() => window.open(message.fileUrl, '_blank')}
                              />
                            ) : message.type === 'audio' ? (
                              <div className="flex items-center gap-2 p-2 bg-background/10 rounded">
                                <audio controls className="max-w-xs" preload="auto" crossOrigin="anonymous">
                                  <source src={message.fileUrl} type="audio/webm" />
                                  <source src={message.fileUrl} type="audio/wav" />
                                  <source src={message.fileUrl} type="audio/ogg" />
                                  <source src={message.fileUrl} type="audio/mp3" />
                                  <source src={message.fileUrl} type="audio/mpeg" />
                                  Your browser does not support the audio element.
                                </audio>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 p-2 bg-background/10 rounded cursor-pointer"
                                   onClick={() => window.open(message.fileUrl, '_blank')}>
                                <Paperclip className="h-4 w-4" />
                                <span className="text-sm">{message.fileName}</span>
                                <span className="text-xs opacity-70">({Math.round((message.fileSize || 0) / 1024)} KB)</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {(message.text || (!message.fileUrl && !message.text)) && (
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.deleted ? (
                              <span className="text-muted-foreground italic">This message has been deleted</span>
                            ) : (
                              <>
                                {message.text || "Document"}
                                {message.isEdited && <span className="text-xs opacity-70 ml-1">(edited)</span>}
                              </>
                            )}
                          </p>
                        )}
                      </div>
                      
                      {/* Message actions dropdown */}
                      {!message.deleted && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className={`absolute ${isOwnMessage ? '-left-8' : '-right-8'} top-0 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity p-1 h-6 w-6`}
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {isOwnMessage && (
                              <>
                                <DropdownMenuItem onClick={() => handleEditMessage(message)}>
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteMessage(message.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem onClick={() => handleReplyToMessage(message)}>
                              <Reply className="h-4 w-4 mr-2" />
                              Reply
                            </DropdownMenuItem>
                            <EmojiPickerComponent onEmojiSelect={(emoji) => handleReaction(message.id, emoji)} />
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    
                    {/* Message reactions */}
                    <MessageReactions 
                      reactions={message.reactions || {}}
                      currentUserId={user?.uid || ''}
                      onReactionClick={(emoji) => handleReaction(message.id, emoji)}
                    />
                    
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <span>
                        {message.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                      {isOwnMessage && (
                        <div className="flex items-center">
                          {message.readBy.some(receipt => receipt.userId === otherUser.userId) ? (
                            <CheckCheck className="h-3 w-3 text-blue-500" title="Seen" />
                          ) : (
                            <Check className="h-3 w-3 text-muted-foreground" title="Sent" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
        
        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="px-4 py-2">
            <div className="text-xs text-muted-foreground">
              {typingUsers.map(u => u.userName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Input area */}
      <div className="p-4 border-t">
        {/* Reply indicator */}
        {replyToMessage && (
          <div className="mb-3 p-2 bg-muted rounded-md border-l-2 border-primary">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-xs font-medium text-primary mb-1">
                  Replying to {replyToMessage.senderName}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {replyToMessage.text.substring(0, 50)}...
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={cancelReply} className="h-6 w-6 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Editing indicator */}
        {editingMessageId && (
          <div className="mb-3 p-2 bg-muted rounded-md border-l-2 border-orange-500">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-orange-600 dark:text-orange-400">
                Editing message
              </div>
              <Button variant="ghost" size="sm" onClick={cancelEditing} className="h-6 w-6 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        <div className="flex gap-2 items-center bg-background rounded-lg border p-2">
          {/* File upload */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFileUpload(file);
                e.target.value = '';
              }
            }}
            className="hidden"
            accept="image/*,audio/*,.pdf,.doc,.docx,.txt"
          />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
            className="p-2 shrink-0 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-full transition-colors"
          >
            <Paperclip className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          </Button>
          
          {/* Voice recorder */}
          <div className="shrink-0">
            <VoiceRecorder 
              onSendVoiceMessage={handleVoiceMessage}
              disabled={isSending}
            />
          </div>
          
          {/* Emoji picker */}
          <div className="shrink-0">
            <EmojiPickerComponent 
              onEmojiSelect={handleEmojiSelect}
              disabled={isSending}
              showText={false}
            />
          </div>
          
          <Input
            value={newMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={editingMessageId ? "Edit message..." : `Message ${otherUser.name}...`}
            className="flex-1 min-w-0 border-0 bg-transparent focus-visible:ring-0 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400"
            disabled={isSending}
          />
          
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
            size="sm"
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full p-2 shadow-md transition-all duration-200 hover:shadow-lg disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
