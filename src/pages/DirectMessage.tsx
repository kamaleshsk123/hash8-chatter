import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import imageCompression from 'browser-image-compression';
import { uploadDocumentToCloudinary, uploadImageToCloudinary } from '@/services/cloudinary';
import { 
  sendDirectMessage, 
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!conversationId) return;
    
    setIsLoading(true);
    
    const unsubscribe = subscribeToDirectMessages(
      conversationId,
      (newMessages) => {
        setMessages(newMessages);
        setIsLoading(false);
        
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
        toast({
          title: "Error",
          description: "Failed to load messages"
        });
      }
    );

    return () => unsubscribe();
  }, [conversationId, toast, user]);

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
        await editDirectMessage(conversationId, editingMessageId, newMessage.trim(), user.uid);
        setEditingMessageId(null);
        setEditingText('');
      } else {
        const messageData: any = {
          text: newMessage.trim(),
          senderId: user.uid,
          senderName: user.name || 'Unknown User',
          senderAvatar: user.avatar || '',
          type: 'text'
        };

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

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    if (!user) return;

    await setTypingIndicator(conversationId, user.uid, user.name || 'Unknown User', true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(async () => {
      await setTypingIndicator(conversationId, user.uid, user.name || 'Unknown User', false);
    }, 2000);
  };

  const handleFileUpload = async (file: File) => {
    if (!user || isSending) return;

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
    setEditingMessageId(message.id);
    setEditingText(message.text);
    setNewMessage(message.text);
  };

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
      />
    </div>
  );
};