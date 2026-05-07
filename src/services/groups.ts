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
import { getUsersByIds } from './users';
import { generateUUID } from '@/utils/uuid';

// Create a new group in an organization
export const createGroup = async (groupData: {
  name: string;
  description?: string;
  organizationId: string;
  members: string[]; // Array of user IDs
  createdBy: string;
}) => {
  const groupId = generateUUID();
  const groupRef = doc(db, `organizations/${groupData.organizationId}/groups`, groupId);
  
  await setDoc(groupRef, {
    id: groupId,
    name: groupData.name,
    description: groupData.description || "",
    members: groupData.members,
    createdBy: groupData.createdBy,
    createdAt: new Date(),
    lastActivity: new Date(),
  });
  
  return groupId;
};

// Invite users to a group
export const inviteToGroup = async (invitationData: {
  organizationId: string;
  groupId: string;
  members: string[]; // Array of user IDs
  invitedBy: string;
}) => {
  const groupRef = doc(db, `organizations/${invitationData.organizationId}/groups`, invitationData.groupId);
  
  // Get the current group members
  const groupDoc = await getDoc(groupRef);
  if (!groupDoc.exists()) {
    throw new Error("Group not found");
  }
  const groupData = groupDoc.data();
  const existingMembers = groupData.members || [];

  // Filter out members who are already in the group
  const newMembers = invitationData.members.filter(
    (memberId) => !existingMembers.includes(memberId)
  );

  if (newMembers.length === 0) {
    return; // No new members to add
  }

  // Add the new members to the group
  await updateDoc(groupRef, {
    members: [...existingMembers, ...newMembers],
  });

  // TODO: Send a notification to the invited users
};

// Leave a group
export const leaveGroup = async (leaveData: {
  organizationId: string;
  groupId: string;
  userId: string;
}) => {
  const groupRef = doc(db, `organizations/${leaveData.organizationId}/groups`, leaveData.groupId);
  
  // Get the current group members
  const groupDoc = await getDoc(groupRef);
  if (!groupDoc.exists()) {
    throw new Error("Group not found");
  }
  const groupData = groupDoc.data();
  const existingMembers = groupData.members || [];

  // Filter out the user who is leaving
  const newMembers = existingMembers.filter(
    (memberId: string) => memberId !== leaveData.userId
  );

  // If the user is not in the group, do nothing
  if (newMembers.length === existingMembers.length) {
    return;
  }

  // If the user is the last member, delete the group
  if (newMembers.length === 0) {
    await deleteDoc(groupRef);
    return;
  }

  // Update the group with the new member list
  await updateDoc(groupRef, {
    members: newMembers,
  });
};

// Update a group
export const updateGroup = async (updateData: {
  organizationId: string;
  groupId: string;
  updates: any;
}) => {
  const groupRef = doc(db, `organizations/${updateData.organizationId}/groups`, updateData.groupId);
  await updateDoc(groupRef, updateData.updates);
};

// Send a system message to a group
export const sendSystemMessage = async (systemMessageData: {
  organizationId: string;
  groupId: string;
  text: string;
}) => {
  const messageId = generateUUID();
  const messageRef = doc(db, `organizations/${systemMessageData.organizationId}/groups/${systemMessageData.groupId}/messages`, messageId);
  
  const messageDoc = {
    id: messageId,
    groupId: systemMessageData.groupId,
    text: systemMessageData.text,
    senderId: "system",
    senderName: "System",
    type: "system",
    timestamp: serverTimestamp(),
  };
  
  await setDoc(messageRef, messageDoc);
  
  // Update group's lastActivity
  const groupRef = doc(db, `organizations/${systemMessageData.organizationId}/groups`, systemMessageData.groupId);
  await updateDoc(groupRef, {
    lastActivity: serverTimestamp()
  });
  
  return messageId;
};

// === GROUP MESSAGING FUNCTIONS ===

// Get messages for a specific group
export const getGroupMessages = async (orgId: string, groupId: string, limitCount: number = 50) => {
  try {
    const messagesRef = collection(db, `organizations/${orgId}/groups/${groupId}/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date()
    }));
  } catch (error) {
    console.error('Error getting group messages:', error);
    throw error;
  }
};

export const sendGroupMessage = async (orgId: string, groupId: string, messageData: {
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  type?: 'text' | 'image' | 'file';
  parentMessageId?: string;
}) => {
  try {
    const messageId = generateUUID();
    const messageRef = doc(db, `organizations/${orgId}/groups/${groupId}/messages`, messageId);
    
    const messageDoc = {
      id: messageId,
      groupId: groupId,
      text: messageData.text,
      senderId: messageData.senderId,
      senderName: messageData.senderName,
      senderAvatar: messageData.senderAvatar || '',
      type: messageData.type || 'text',
      timestamp: serverTimestamp(),
      reactions: [],
      isEdited: false,
      readBy: [],
      parentMessageId: messageData.parentMessageId || null
    };
    
    await setDoc(messageRef, messageDoc);

    // If it's a reply in a thread, increment the parent's reply count
    if (messageData.parentMessageId) {
      const parentRef = doc(db, `organizations/${orgId}/groups/${groupId}/messages`, messageData.parentMessageId);
      const parentDoc = await getDoc(parentRef);
      if (parentDoc.exists()) {
        const currentCount = parentDoc.data().replyCount || 0;
        await updateDoc(parentRef, {
          replyCount: currentCount + 1
        });
      }
    }
    
    // Update group's lastActivity
    const groupRef = doc(db, `organizations/${orgId}/groups`, groupId);
    await updateDoc(groupRef, {
      lastActivity: serverTimestamp()
    });
    
    return messageId;
  } catch (error) {
    console.error('Error sending group message:', error);
    throw error;
  }
};

// Real-time message listener for a group
export const subscribeToGroupMessages = (
  orgId: string, 
  groupId: string, 
  onSuccess: (messages: any[]) => void,
  onError?: (error: Error) => void
) => {
  const messagesRef = collection(db, `organizations/${orgId}/groups/${groupId}/messages`);
  const q = query(messagesRef, orderBy('timestamp', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        conversationId: data.conversationId || groupId,
        senderId: data.senderId,
        senderName: data.senderName,
        senderAvatar: data.senderAvatar || '',
        text: data.text,
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
        parentMessageId: data.parentMessageId,
        replyCount: data.replyCount || 0,
        isPinned: data.isPinned || false,
        pinnedBy: data.pinnedBy,
        pinnedAt: data.pinnedAt?.toDate(),
        hasPendingWrites: doc.metadata.hasPendingWrites // Added for offline support
      };
    });
    onSuccess(messages);
  }, (error) => {
    console.error('Error in message subscription:', error);
    if (onError) {
      onError(error);
    }
  });
};

// Add reaction to a group message
export const addGroupMessageReaction = async (orgId: string, groupId: string, messageId: string, emoji: string, userId: string) => {
  try {
    const messageRef = doc(db, `organizations/${orgId}/groups/${groupId}/messages`, messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }
    
    const messageData = messageDoc.data();
    const reactions = messageData.reactions || [];
    
    // Find existing reaction with this emoji
    const existingReactionIndex = reactions.findIndex((r: any) => r.emoji === emoji);
    
    if (existingReactionIndex >= 0) {
      // Reaction exists, toggle user
      const existingReaction = reactions[existingReactionIndex];
      const userIndex = existingReaction.userIds.indexOf(userId);
      
      if (userIndex >= 0) {
        // User already reacted, remove them
        existingReaction.userIds.splice(userIndex, 1);
        if (existingReaction.userIds.length === 0) {
          // Remove reaction if no users left
          reactions.splice(existingReactionIndex, 1);
        }
      } else {
        // User hasn't reacted, add them
        existingReaction.userIds.push(userId);
      }
    } else {
      // New reaction
      reactions.push({ emoji, userIds: [userId] });
    }
    
    await updateDoc(messageRef, { reactions });
  } catch (error) {
    console.error('Error adding message reaction:', error);
    throw error;
  }
};

// Update typing status in a group
export const updateTypingStatus = async (orgId: string, groupId: string, userId: string, userName: string, isTyping: boolean) => {
  try {
    const typingRef = doc(db, `organizations/${orgId}/groups/${groupId}/typing`, userId);
    
    if (isTyping) {
      await setDoc(typingRef, {
        userId,
        userName,
        timestamp: serverTimestamp(),
        isTyping: true
      });
    } else {
      await deleteDoc(typingRef);
    }
  } catch (error) {
    console.error('Error updating typing status:', error);
  }
};

// Subscribe to typing indicators in a group
export const subscribeToGroupTypingIndicators = (orgId: string, groupId: string, callback: (typingUsers: any[]) => void) => {
  const typingRef = collection(db, `organizations/${orgId}/groups/${groupId}/typing`);
  
  return onSnapshot(typingRef, (snapshot) => {
    const typingUsers = snapshot.docs.map(doc => doc.data());
    callback(typingUsers);
  });
};

// Get group details with member info
export const getGroupDetails = async (orgId: string, groupId: string) => {
  try {
    const groupRef = doc(db, `organizations/${orgId}/groups`, groupId);
    const groupDoc = await getDoc(groupRef);
    
    if (!groupDoc.exists()) {
      throw new Error('Group not found');
    }
    
    const groupData = groupDoc.data();
    
    // Get member profiles
    if (groupData.members && groupData.members.length > 0) {
      const memberProfiles = await getUsersByIds(groupData.members);
      groupData.memberProfiles = memberProfiles;
    }
    
    return { id: groupDoc.id, ...groupData };
  } catch (error) {
    console.error('Error getting group details:', error);
    throw error;
  }
};

// Mark messages as read for a user
export const markGroupMessagesAsRead = async (orgId: string, groupId: string, userId: string, lastReadMessageId: string) => {
  try {
    const readStatusRef = doc(db, `organizations/${orgId}/groups/${groupId}/readStatus`, userId);
    await setDoc(readStatusRef, {
      userId,
      lastReadMessageId,
      lastReadAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
};

// Get unread message count for a user in a group
export const getUnreadMessageCount = async (orgId: string, groupId: string, userId: string) => {
  try {
    const readStatusRef = doc(db, `organizations/${orgId}/groups/${groupId}/readStatus`, userId);
    const readStatusDoc = await getDoc(readStatusRef);
    
    if (!readStatusDoc.exists()) {
      // No read status, count all messages
      const messagesRef = collection(db, `organizations/${orgId}/groups/${groupId}/messages`);
      const snapshot = await getDocs(messagesRef);
      return snapshot.size;
    }
    
    const readStatus = readStatusDoc.data();
    const lastReadAt = readStatus.lastReadAt?.toDate();
    
    if (!lastReadAt) return 0;
    
    // Count messages after last read timestamp
    const messagesRef = collection(db, `organizations/${orgId}/groups/${groupId}/messages`);
    const q = query(messagesRef, where('timestamp', '>', lastReadAt));
    const snapshot = await getDocs(q);
    
    return snapshot.size;
  } catch (error) {
    console.error('Error getting unread message count:', error);
    return 0;
  }
};

// Add read receipt to a message
export const markMessageAsRead = async (
  orgId: string, 
  groupId: string, 
  messageId: string, 
  userId: string, 
  userName: string, 
  userAvatar?: string
) => {
  try {
    const messageRef = doc(db, `organizations/${orgId}/groups/${groupId}/messages`, messageId);
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
    
    await updateDoc(messageRef, { readBy });
  } catch (error) {
    console.error('Error marking message as read:', error);
  }
};

// Mark multiple messages as read (for when user scrolls through messages)
export const markMultipleMessagesAsRead = async (
  orgId: string,
  groupId: string,
  messageIds: string[],
  userId: string,
  userName: string,
  userAvatar?: string
) => {
  try {
    const batch = [];
    
    for (const messageId of messageIds) {
      batch.push(markMessageAsRead(orgId, groupId, messageId, userId, userName, userAvatar));
    }
    
    await Promise.all(batch);
  } catch (error) {
    console.error('Error marking multiple messages as read:', error);
  }
};

// Toggle pin status of a group message
export const togglePinGroupMessage = async (
  orgId: string,
  groupId: string,
  messageId: string,
  userId: string,
  isPinned: boolean
) => {
  try {
    const messageRef = doc(db, `organizations/${orgId}/groups/${groupId}/messages`, messageId);
    await updateDoc(messageRef, {
      isPinned,
      pinnedBy: isPinned ? userId : null,
      pinnedAt: isPinned ? serverTimestamp() : null
    });
  } catch (error) {
    console.error('Error toggling message pin:', error);
    throw error;
  }
};

// Delete a group message (for the message owner)
export const deleteGroupMessage = async (
  orgId: string,
  groupId: string,
  messageId: string
) => {
  try {
    const messageRef = doc(db, `organizations/${orgId}/groups/${groupId}/messages`, messageId);
    await updateDoc(messageRef, {
      deleted: true,
      deletedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error deleting group message:', error);
    throw error;
  }
};

// Edit a group message
export const editGroupMessage = async (
  orgId: string,
  groupId: string,
  messageId: string,
  newText: string
) => {
  try {
    const messageRef = doc(db, `organizations/${orgId}/groups/${groupId}/messages`, messageId);
    await updateDoc(messageRef, {
      text: newText,
      isEdited: true,
      editedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error editing group message:', error);
    throw error;
  }
};
