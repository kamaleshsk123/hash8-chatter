import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile, // Import updateProfile
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  query,
  where,
  getDocs,
  count,
  deleteDoc,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

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

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Configure Google Auth Provider
const googleProvider = new GoogleAuthProvider();
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
    await signOut(auth);
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
        groupId: data.groupId || groupId,
        senderId: data.senderId,
        senderName: data.senderName,
        senderAvatar: data.senderAvatar || '',
        text: data.text,
        type: data.type || 'text',
        timestamp: data.timestamp?.toDate() || new Date(),
        reactions: data.reactions || [],
        isEdited: data.isEdited || false,
        readBy: data.readBy || []
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

// Add reaction to a message
export const addMessageReaction = async (orgId: string, groupId: string, messageId: string, emoji: string, userId: string) => {
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
export const subscribeToTypingIndicators = (orgId: string, groupId: string, callback: (typingUsers: any[]) => void) => {
  const typingRef = collection(db, `organizations/${orgId}/groups/${groupId}/typing`);
  
  return onSnapshot(typingRef, (snapshot) => {
    const typingUsers = snapshot.docs
      .map(doc => doc.data())
      .filter(user => {
        // Filter out old typing indicators (older than 10 seconds)
        const timestamp = user.timestamp?.toDate();
        if (!timestamp) return false;
        const now = new Date();
        return (now.getTime() - timestamp.getTime()) < 10000; // 10 seconds
      });
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