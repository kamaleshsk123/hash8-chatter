import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  enableIndexedDbPersistence,
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  where,
  serverTimestamp,
  Timestamp,
  limit,
  startAfter,
  DocumentSnapshot,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
enableIndexedDbPersistence(db)
  .then(() => {
    console.log('Firestore persistence enabled successfully.');
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence failed: The current browser does not support all of the features required to enable persistence.');
    } else {
      console.error('Firestore persistence failed:', err);
    }
  });
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google Auth Provider
googleProvider.setCustomParameters({
  prompt: "select_account",
});

// Auth functions
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    console.error("Error signing in with email:", error);
    throw error;
  }
};

export const registerWithEmail = async (
  email: string,
  password: string,
  name?: string
) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    // Update profile with name
    if (name) {
      await updateProfile(result.user, { displayName: name });
    }
    // Store user profile with name
    await upsertUserProfile({
      uid: result.user.uid,
      displayName: name || "",
      photoURL: "",
    });
    return result.user;
  } catch (error) {
    console.error("Error registering with email:", error);
    throw error;
  }
};

export const signOutUser = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

// Upsert user profile in /users/{userId}
export const upsertUserProfile = async (user: {
  uid: string;
  displayName?: string;
  photoURL?: string;
}) => {
  if (!user.uid) return;
  await setDoc(
    doc(db, "users", user.uid),
    {
      displayName: user.displayName || "",
      avatar: user.photoURL || "",
    },
    { merge: true }
  );
};

// Organization and Membership Firestore functions
export const createOrganization = async (
  orgName: string,
  creator: { uid: string; email: string }
) => {
  // creator: { uid, email }
  const orgUID = crypto.randomUUID();
  const orgRef = doc(db, "organizations", orgUID);
  await setDoc(orgRef, {
    id: orgUID,
    name: orgName,
    admins: [creator.email],
    createdAt: new Date(),
  });
  // Add membership for creator
  const membershipRef = doc(
    db,
    "organization_memberships",
    `${creator.uid}_${orgUID}`
  );
  await setDoc(membershipRef, {
    userId: creator.uid,
    organizationId: orgUID,
    role: "admin",
    joinedAt: new Date(),
  });
  return orgUID;
};

export const joinOrganization = async (
  orgUID: string,
  user: { uid: string; email: string }
) => {
  // user: { uid, email }
  const orgRef = doc(db, "organizations", orgUID);
  const orgSnap = await getDoc(orgRef);
  if (!orgSnap.exists()) throw new Error("Organization not found");
  // Check if membership already exists
  const membershipRef = doc(
    db,
    "organization_memberships",
    `${user.uid}_${orgUID}`
  );
  const membershipSnap = await getDoc(membershipRef);
  if (membershipSnap.exists()) {
    throw new Error("already a member");
  }
  // Add membership
  await setDoc(membershipRef, {
    userId: user.uid,
    organizationId: orgUID,
    role: "member",
    joinedAt: new Date(),
  });
  return orgSnap.data();
};

export const getOrganizationByUID = async (orgUID: string) => {
  const orgRef = doc(db, "organizations", orgUID);
  const orgSnap = await getDoc(orgRef);
  if (!orgSnap.exists()) return null;
  return orgSnap.data();
};

export const getUserOrganizations = async (userId: string) => {
  const q = query(
    collection(db, "organization_memberships"),
    where("userId", "==", userId)
  );
  const memberships = await getDocs(q);
  const orgIds = memberships.docs.map((doc) => doc.data().organizationId);
  if (orgIds.length === 0) return [];
  const orgs = [];
  for (const orgId of orgIds) {
    const org = await getOrganizationByUID(orgId);
    if (org) orgs.push(org);
  }
  return orgs;
};

// Get the number of members in an organization
export const getOrganizationMemberCount = async (orgUID: string) => {
  const q = query(
    collection(db, "organization_memberships"),
    where("organizationId", "==", orgUID)
  );
  const snapshot = await getDocs(q);
  return snapshot.size;
};

// Get the user's role in an organization
export const getUserRoleInOrganization = async (
  userId: string,
  orgUID: string
) => {
  const membershipRef = doc(
    db,
    "organization_memberships",
    `${userId}_${orgUID}`
  );
  const membershipSnap = await getDoc(membershipRef);
  if (!membershipSnap.exists()) return null;
  return membershipSnap.data().role;
};

// Get all groups for an organization
export const getOrganizationGroups = async (orgUID: string) => {
  const q = query(collection(db, `organizations/${orgUID}/groups`));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Get all members for an organization
export const getOrganizationMembers = async (orgUID: string) => {
  const q = query(
    collection(db, "organization_memberships"),
    where("organizationId", "==", orgUID)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data());
};

// Update organization details
export const updateOrganization = async (
  orgUID: string,
  updates: {
    name?: string;
    description?: string;
  }
) => {
  const orgRef = doc(db, "organizations", orgUID);
  await setDoc(orgRef, updates, { merge: true });
  return { id: orgUID, ...updates };
};

// Remove member from organization
export const removeMemberFromOrganization = async (
  orgUID: string,
  memberUserId: string
) => {
  const membershipRef = doc(
    db,
    "organization_memberships",
    `${memberUserId}_${orgUID}`
  );
  await deleteDoc(membershipRef); // Actually delete the document
  return true;
};

// Get user profiles for an array of userIds from /users collection
export const getUsersByIds = async (userIds: string[]) => {
  if (!userIds.length) return [];
  const results = [];
  for (const userId of userIds) {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      results.push({ userId, ...userDoc.data() });
    }
  }
  return results.filter(Boolean);
};

// Update user profile
export const updateUserProfile = async (userId: string, updates: any) => {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: new Date(),
  });
};

// Create a new group in an organization
export const createGroup = async (groupData: {
  name: string;
  description?: string;
  organizationId: string;
  members: string[]; // Array of user IDs
  createdBy: string;
}) => {
  const groupId = crypto.randomUUID();
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
  const messageId = crypto.randomUUID();
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

// Send a message to a group
export const sendGroupMessage = async (orgId: string, groupId: string, messageData: {
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  type?: 'text' | 'image' | 'file';
}) => {
  try {
    const messageId = crypto.randomUUID();
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
      readBy: []
    };
    
    await setDoc(messageRef, messageDoc);
    
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

// === User Presence ===

export const updateUserStatus = async (userId: string, isOnline: boolean) => {
  const statusRef = doc(db, "user_status", userId);
  await setDoc(statusRef, {
    isOnline,
    lastSeen: serverTimestamp(),
  }, { merge: true });
};

export const subscribeToUserStatus = (userIds: string[], callback: (statuses: any) => void) => {
  if (!userIds.length) {
    return () => {}; // Return an empty unsubscribe function
  }
  const q = query(collection(db, "user_status"), where("__name__", "in", userIds));
  return onSnapshot(q, (snapshot) => {
    const statuses: any = {};
    snapshot.forEach((doc) => {
      statuses[doc.id] = doc.data();
    });
    callback(statuses);
  });
};

// === DIRECT MESSAGING ===

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
    const messageId = crypto.randomUUID();
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

// File upload functionality
export const uploadFile = async (
  file: File,
  path: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytes(storageRef, file);
    
    const snapshot = await uploadTask;
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// Delete file from storage
export const deleteFile = async (filePath: string) => {
  try {
    const fileRef = ref(storage, filePath);
    await deleteObject(fileRef);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
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
    const messageId = crypto.randomUUID();
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
  userId: string
) => {
  try {
    const messageRef = doc(db, `direct_messages/${conversationId}/messages`, messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }
    
    const messageData = messageDoc.data();
    
    // Only allow sender to delete their own messages
    if (messageData.senderId !== userId) {
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
  userId: string
) => {
  try {
    const messageRef = doc(db, `direct_messages/${conversationId}/messages`, messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }
    
    const messageData = messageDoc.data();
    
    // Only allow sender to delete their own messages
    if (messageData.senderId !== userId) {
      throw new Error('Unauthorized to delete this message');
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

export default app;

// === MODERATOR ROLE MANAGEMENT ===

// Promote a member to moderator
export const promoteToModerator = async (
  userId: string, 
  orgId: string, 
  promotedBy: string,
  promotedByName: string
) => {
  const membershipRef = doc(db, "organization_memberships", `${userId}_${orgId}`);
  
  // Check if membership exists
  const membershipSnap = await getDoc(membershipRef);
  if (!membershipSnap.exists()) {
    throw new Error("User is not a member of this organization");
  }
  
  const currentRole = membershipSnap.data().role;
  if (currentRole === 'admin') {
    throw new Error("Cannot change admin role");
  }
  
  if (currentRole === 'moderator') {
    throw new Error("User is already a moderator");
  }
  
  // Update role to moderator
  await updateDoc(membershipRef, {
    role: 'moderator',
    promotedAt: serverTimestamp(),
    promotedBy: promotedBy
  });
  
  // Log the moderation action
  await logModerationAction({
    id: crypto.randomUUID(),
    actionType: 'promote_user',
    targetId: userId,
    moderatorId: promotedBy,
    moderatorName: promotedByName,
    reason: 'Promoted to moderator',
    timestamp: new Date(),
    organizationId: orgId,
    details: { newRole: 'moderator', previousRole: currentRole }
  });
  
  return true;
};

// Demote a moderator to member
export const demoteFromModerator = async (
  userId: string, 
  orgId: string, 
  demotedBy: string,
  demotedByName: string
) => {
  const membershipRef = doc(db, "organization_memberships", `${userId}_${orgId}`);
  
  // Check if membership exists
  const membershipSnap = await getDoc(membershipRef);
  if (!membershipSnap.exists()) {
    throw new Error("User is not a member of this organization");
  }
  
  const currentRole = membershipSnap.data().role;
  if (currentRole === 'admin') {
    throw new Error("Cannot demote admin");
  }
  
  if (currentRole !== 'moderator') {
    throw new Error("User is not a moderator");
  }
  
  // Update role to member
  await updateDoc(membershipRef, {
    role: 'member',
    demotedAt: serverTimestamp(),
    demotedBy: demotedBy
  });
  
  // Log the moderation action
  await logModerationAction({
    id: crypto.randomUUID(),
    actionType: 'demote_user',
    targetId: userId,
    moderatorId: demotedBy,
    moderatorName: demotedByName,
    reason: 'Demoted from moderator',
    timestamp: new Date(),
    organizationId: orgId,
    details: { newRole: 'member', previousRole: currentRole }
  });
  
  return true;
};

// === MODERATION ACTIONS ===

// Log a moderation action
export const logModerationAction = async (action: {
  id: string;
  actionType: string;
  targetId: string;
  targetName?: string;
  moderatorId: string;
  moderatorName: string;
  reason: string;
  timestamp: Date;
  organizationId: string;
  details?: any;
}) => {
  const actionRef = doc(db, `organizations/${action.organizationId}/moderation_actions`, action.id);
  await setDoc(actionRef, {
    ...action,
    timestamp: serverTimestamp()
  });
};

// Get moderation actions for an organization
export const getModerationActions = async (orgId: string, limit: number = 50) => {
  try {
    const q = query(
      collection(db, `organizations/${orgId}/moderation_actions`),
      orderBy('timestamp', 'desc'),
      limit(limit)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date()
    }));
  } catch (error) {
    console.error('Error getting moderation actions:', error);
    return [];
  }
};

// Delete a message (moderation action)
export const deleteMessageAsModerator = async (
  orgId: string,
  groupId: string,
  messageId: string,
  moderatorId: string,
  moderatorName: string,
  reason: string
) => {
  try {
    const messageRef = doc(db, `organizations/${orgId}/groups/${groupId}/messages`, messageId);
    
    // Get message data before deletion for logging
    const messageSnap = await getDoc(messageRef);
    if (!messageSnap.exists()) {
      throw new Error('Message not found');
    }
    
    const messageData = messageSnap.data();
    
    // Mark message as deleted instead of actually deleting it
    await updateDoc(messageRef, {
      deleted: true,
      deletedBy: moderatorId,
      deletedAt: serverTimestamp(),
      deletionReason: reason,
      originalText: messageData.text // Preserve original text for audit
    });
    
    // Log the moderation action
    await logModerationAction({
      id: crypto.randomUUID(),
      actionType: 'delete_message',
      targetId: messageId,
      targetName: `Message by ${messageData.senderName}`,
      moderatorId: moderatorId,
      moderatorName: moderatorName,
      reason: reason,
      timestamp: new Date(),
      organizationId: orgId,
      details: {
        groupId: groupId,
        originalSender: messageData.senderId,
        originalText: messageData.text?.substring(0, 100) + (messageData.text?.length > 100 ? '...' : '')
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error deleting message as moderator:', error);
    throw error;
  }
};

// Ban a user from organization (moderation action)
export const banUserFromOrganization = async (
  orgId: string,
  userId: string,
  userName: string,
  moderatorId: string,
  moderatorName: string,
  reason: string,
  duration?: number // Duration in hours, undefined for permanent
) => {
  try {
    const banRef = doc(db, `organizations/${orgId}/banned_users`, userId);
    const banData = {
      userId: userId,
      userName: userName,
      bannedBy: moderatorId,
      bannedAt: serverTimestamp(),
      reason: reason,
      permanent: !duration,
      ...(duration && { expiresAt: new Date(Date.now() + duration * 60 * 60 * 1000) })
    };
    
    await setDoc(banRef, banData);
    
    // Log the moderation action
    await logModerationAction({
      id: crypto.randomUUID(),
      actionType: 'ban_user',
      targetId: userId,
      targetName: userName,
      moderatorId: moderatorId,
      moderatorName: moderatorName,
      reason: reason,
      timestamp: new Date(),
      organizationId: orgId,
      details: {
        duration: duration,
        permanent: !duration
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error banning user:', error);
    throw error;
  }
};

// Check if user is banned
export const isUserBanned = async (orgId: string, userId: string): Promise<boolean> => {
  try {
    const banRef = doc(db, `organizations/${orgId}/banned_users`, userId);
    const banSnap = await getDoc(banRef);
    
    if (!banSnap.exists()) {
      return false;
    }
    
    const banData = banSnap.data();
    
    // Check if ban is permanent
    if (banData.permanent) {
      return true;
    }
    
    // Check if temporary ban has expired
    if (banData.expiresAt && banData.expiresAt.toDate() > new Date()) {
      return true;
    }
    
    // Ban has expired, remove it
    if (banData.expiresAt && banData.expiresAt.toDate() <= new Date()) {
      await deleteDoc(banRef);
      return false;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking if user is banned:', error);
    return false;
  }
};