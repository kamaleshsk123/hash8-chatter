import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  where,
  getDocs,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { uploadFile, deleteFile } from './fileStorage';
import { generateUUID } from '@/utils/uuid';

// === DIRECT MESSAGING ===

// Create conversation ID without Firebase calls (offline-friendly)
export const createConversationId = (userId1: string, userId2: string): string => {
  return [userId1, userId2].sort().join('_');
};

// Offline-friendly version of createOrGetDirectMessage
export const createOrGetDirectMessageOffline = (userId1: string, userId2: string, isOnline: boolean = true) => {
  const conversationId = createConversationId(userId1, userId2);
  
  if (!isOnline) {
    // Return a minimal conversation object for offline use
    return Promise.resolve({
      id: conversationId,
      participants: [userId1, userId2],
      createdAt: new Date(),
      lastActivity: new Date(),
      lastMessage: null,
      isOfflineGenerated: true
    });
  }
  
  // When online, use the original Firebase function
  return createOrGetDirectMessage(userId1, userId2);
};

// Create or get existing direct message conversation between two users
export const createOrGetDirectMessage = async (userId1: string, userId2: string) => {
  try {
    // Create a consistent conversation ID by sorting user IDs
    const conversationId = [userId1, userId2].sort().join('_');
    const conversationRef = doc(db, 'direct_messages', conversationId);
    
    // Check if conversation already exists
    const conversationSnap = await getDoc(conversationRef);
    
    if (conversationSnap.exists()) {
      return { id: conversationId, ...conversationSnap.data() };
    }
    
    // Create new conversation
    const conversationData = {
      id: conversationId,
      participants: [userId1, userId2],
      createdAt: serverTimestamp(),
      lastActivity: serverTimestamp(),
      lastMessage: null
    };
    
    await setDoc(conversationRef, conversationData);
    return { id: conversationId, ...conversationData };
  } catch (error) {
    console.error('Error creating/getting direct message:', error);
    throw error;
  }
};

// Send a direct message
export const sendDirectMessage = async (conversationId: string, messageData: {
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  type?: 'text' | 'image' | 'file';
  replyTo?: any;
}) => {
  try {
    const messageId = generateUUID();
    const messageRef = doc(db, `direct_messages/${conversationId}/messages`, messageId);
    
    const messageDoc: any = {
      id: messageId,
      conversationId: conversationId,
      text: messageData.text,
      senderId: messageData.senderId,
      senderName: messageData.senderName,
      senderAvatar: messageData.senderAvatar || '',
      type: messageData.type || 'text',
      timestamp: serverTimestamp(),
      readBy: [], // Array to track who has read the message
      isRead: false, // Legacy field for backward compatibility
      reactions: {}
    };

    // Add reply data if present
    if (messageData.replyTo) {
      messageDoc.replyTo = messageData.replyTo;
    }
    
    await setDoc(messageRef, messageDoc);
    
    // Update conversation's lastActivity and lastMessage
    const conversationRef = doc(db, 'direct_messages', conversationId);
    await updateDoc(conversationRef, {
      lastActivity: serverTimestamp(),
      lastMessage: {
        text: messageData.text,
        senderId: messageData.senderId,
        senderName: messageData.senderName,
        timestamp: serverTimestamp()
      }
    });
    
    return messageId;
  } catch (error) {
    console.error('Error sending direct message:', error);
    throw error;
  }
};

// Get direct message conversations for a user
export const getUserDirectMessageConversations = async (userId: string) => {
  try {
    const q = query(
      collection(db, 'direct_messages'),
      where('participants', 'array-contains', userId),
      orderBy('lastActivity', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting direct message conversations:', error);
    throw error;
  }
};

// Get direct messages for a conversation
export const getDirectMessages = async (conversationId: string, limitCount: number = 50) => {
  try {
    const messagesRef = collection(db, `direct_messages/${conversationId}/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date()
    }));
  } catch (error) {
    console.error('Error getting direct messages:', error);
    throw error;
  }
};

// Subscribe to direct messages in real-time
export const subscribeToDirectMessages = (
  conversationId: string,
  onSuccess: (messages: any[]) => void,
  onError?: (error: Error) => void
) => {
  const messagesRef = collection(db, `direct_messages/${conversationId}/messages`);
  const q = query(messagesRef, orderBy('timestamp', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      const messageData: any = {
        id: doc.id,
        text: data.text.trim(),
        senderId: data.senderId,
        senderName: data.senderName,
        senderAvatar: data.senderAvatar || '',
        type: data.type || 'text',
        timestamp: data.timestamp?.toDate() || new Date(),
        readBy: data.readBy || [],
        isRead: data.isRead || false,
        reactions: data.reactions || {},
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        filePath: data.filePath,
        isEdited: data.isEdited || false,
        editedAt: data.editedAt?.toDate(),
        replyTo: data.replyTo,
        hasPendingWrites: doc.metadata.hasPendingWrites // Added for offline support
      };

      // Add reply reference if replying
      if (data.replyTo) {
        messageData.replyTo = {
          messageId: data.replyTo.messageId,
          text: data.replyTo.text,
          senderName: data.replyTo.senderName
        };
      }
      return messageData;
    });
    onSuccess(messages);
  }, (error) => {
    console.error('Error in direct message subscription:', error);
    if (onError) {
      onError(error);
    }
  });
};

// Mark direct message as read
export const markDirectMessageAsRead = async (
  conversationId: string,
  messageId: string,
  userId: string,
  userName: string,
  userAvatar?: string
) => {
  try {
    const messageRef = doc(db, `direct_messages/${conversationId}/messages`, messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) {
      console.error('Message not found:', messageId);
      return;
    }
    
    const messageData = messageDoc.data();
    const readBy = messageData.readBy || [];
    
    // Check if user has already marked this message as read
    const existingReadIndex = readBy.findIndex((receipt: any) => receipt.userId === userId);
    
    if (existingReadIndex >= 0) {
      // Update existing read receipt timestamp
      readBy[existingReadIndex].readAt = new Date();
    } else {
      // Add new read receipt
      readBy.push({
        userId,
        userName,
        userAvatar: userAvatar || '',
        readAt: new Date()
      });
    }
    
    await updateDoc(messageRef, { 
      readBy,
      isRead: true, // Update legacy field
      reactions: messageData.reactions || {}
    });
  } catch (error) {
    console.error('Error marking direct message as read:', error);
  }
};

// Mark multiple direct messages as read
export const markMultipleDirectMessagesAsRead = async (
  conversationId: string,
  messageIds: string[],
  userId: string,
  userName: string,
  userAvatar?: string
) => {
  try {
    const batch = [];
    
    for (const messageId of messageIds) {
      batch.push(markDirectMessageAsRead(conversationId, messageId, userId, userName, userAvatar));
    }
    
    await Promise.all(batch);
  } catch (error) {
    console.error('Error marking multiple direct messages as read:', error);
  }
};

// Send message with file attachment
export const sendDirectMessageWithFile = async (
  conversationId: string,
  messageData: {
    text?: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    file?: File;
    fileType?: 'image' | 'document' | 'audio';
  }
) => {
  try {
    const messageId = generateUUID();
    let fileUrl = '';
    let fileName = '';
    let fileSize = 0;

    // Upload file if provided
    if (messageData.file) {
      const filePath = `direct_messages/${conversationId}/${messageId}/${messageData.file.name}`;
      fileUrl = await uploadFile(messageData.file, filePath);
      fileName = messageData.file.name;
      fileSize = messageData.file.size;
    }

    const messageRef = doc(db, `direct_messages/${conversationId}/messages`, messageId);
    
    const messageDoc = {
      id: messageId,
      conversationId: conversationId,
      text: messageData.text || '',
      senderId: messageData.senderId,
      senderName: messageData.senderName,
      senderAvatar: messageData.senderAvatar || '',
      type: messageData.fileType || 'text',
      timestamp: serverTimestamp(),
      readBy: [],
      isRead: false,
      ...(fileUrl && {
        fileUrl,
        fileName,
        fileSize,
        filePath: `direct_messages/${conversationId}/${messageId}/${fileName}`
      })
    };
    
    await setDoc(messageRef, messageDoc);
    
    // Update conversation's lastActivity and lastMessage
    const conversationRef = doc(db, 'direct_messages', conversationId);
    await updateDoc(conversationRef, {
      lastActivity: serverTimestamp(),
      lastMessage: {
        text: messageData.text || (fileName ? `📎 ${fileName}` : 'File'),
        senderId: messageData.senderId,
        senderName: messageData.senderName,
        timestamp: serverTimestamp(),
        type: messageData.fileType || 'text'
      }
    });
  } catch (error) {
    console.error('Error sending message with file:', error);
    throw error;
  }
};

// Add reaction to message
export const addMessageReaction = async (
  conversationId: string,
  messageId: string,
  userId: string,
  userName: string,
  emoji: string
) => {
  try {
    const messageRef = doc(db, `direct_messages/${conversationId}/messages`, messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }
    
    const messageData = messageDoc.data();
    let reactions = messageData.reactions || {};
    
    // Ensure reactions is an object
    if (typeof reactions !== 'object' || Array.isArray(reactions)) {
      reactions = {};
    }
    
    // Initialize emoji array if it doesn't exist
    if (!reactions[emoji] || !Array.isArray(reactions[emoji])) {
      reactions[emoji] = [];
    }
    
    // Check if user already reacted with this emoji
    const existingReactionIndex = reactions[emoji].findIndex((r: any) => r && r.userId === userId);
    
    if (existingReactionIndex >= 0) {
      // Remove reaction if already exists
      reactions[emoji].splice(existingReactionIndex, 1);
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    } else {
      // Add new reaction
      reactions[emoji].push({
        userId,
        userName,
        timestamp: new Date()
      });
    }
    
    await updateDoc(messageRef, { reactions });
  } catch (error) {
    console.error('Error adding message reaction:', error);
    throw error;
  }
};

// Edit message
export const editDirectMessage = async (
  conversationId: string,
  messageId: string,
  newText: string,
  userId: string
) => {
  try {
    const messageRef = doc(db, `direct_messages/${conversationId}/messages`, messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }
    
    const messageData = messageDoc.data();
    
    // Only allow sender to edit their own messages
    if (messageData.senderId !== userId) {
      throw new Error('Unauthorized to edit this message');
    }
    
    await updateDoc(messageRef, {
      text: newText,
      editedAt: serverTimestamp(),
      isEdited: true
    });
  } catch (error) {
    console.error('Error editing message:', error);
    throw error;
  }
};

// Delete message
export const deleteDirectMessage = async (
  conversationId: string,
  messageId: string,
  userId: string,
  isClearChat: boolean = false
) => {
  try {
    const messageRef = doc(db, `direct_messages/${conversationId}/messages`, messageId);
    
    // Check if user is a participant of the conversation
    const participants = conversationId.split('_');
    if (!participants.includes(userId)) {
      throw new Error('Unauthorized to delete messages in this conversation');
    }

    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }
    
    const messageData = messageDoc.data();
    
    // If not a clear chat operation, only allow sender to delete their own messages
    if (!isClearChat && messageData.senderId !== userId) {
      throw new Error('Unauthorized to delete this message');
    }
    
    // Delete associated file if exists
    if (messageData.filePath) {
      await deleteFile(messageData.filePath);
    }
    
    await deleteDoc(messageRef);
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};

// Soft delete message
export const softDeleteDirectMessage = async (
  conversationId: string,
  messageId: string,
  userId: string,
  isClearChat: boolean = false
) => {
  try {
    const messageRef = doc(db, `direct_messages/${conversationId}/messages`, messageId);
    
    // Check if user is a participant of the conversation
    const participants = conversationId.split('_');
    if (!participants.includes(userId)) {
      throw new Error('Unauthorized to delete messages in this conversation');
    }

    // If it's a clear chat operation, we don't need to check if the user is the sender
    if (!isClearChat) {
      const messageDoc = await getDoc(messageRef);
      if (!messageDoc.exists()) {
        throw new Error('Message not found');
      }
      const messageData = messageDoc.data();
      
      // For individual soft-delete, only allow sender
      if (messageData.senderId !== userId) {
        throw new Error('Unauthorized to delete this message');
      }
    }
    
    await updateDoc(messageRef, {
      text: 'This message has been deleted',
      deleted: true,
      deletedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};

// Set typing indicator
export const setTypingIndicator = async (
  conversationId: string,
  userId: string,
  userName: string,
  isTyping: boolean
) => {
  try {
    const typingRef = doc(db, `direct_messages/${conversationId}/typing`, userId);
    
    if (isTyping) {
      await setDoc(typingRef, {
        userId,
        userName,
        timestamp: serverTimestamp()
      });
    } else {
      await deleteDoc(typingRef);
    }
  } catch (error) {
    console.error('Error setting typing indicator:', error);
  }
};

// Subscribe to typing indicators
export const subscribeToTypingIndicators = (
  conversationId: string,
  currentUserId: string,
  onTypingChange: (typingUsers: Array<{userId: string, userName: string}>) => void
) => {
  const typingRef = collection(db, `direct_messages/${conversationId}/typing`);
  
  return onSnapshot(typingRef, (snapshot) => {
    const typingUsers = snapshot.docs
      .map(doc => doc.data())
      .filter(data => data.userId !== currentUserId)
      .map(data => ({
        userId: data.userId,
        userName: data.userName
      }));
    
    onTypingChange(typingUsers);
  });
};
