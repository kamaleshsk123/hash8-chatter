import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  query, 
  orderBy, 
  getDocs,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { generateUUID } from '@/utils/uuid';

// === MODERATOR ROLE MANAGEMENT ===

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
export const getModerationActions = async (orgId: string, limitCount: number = 50) => {
  try {
    const q = query(
      collection(db, `organizations/${orgId}/moderation_actions`),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
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
    id: generateUUID(),
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
    id: generateUUID(),
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
      id: generateUUID(),
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
      id: generateUUID(),
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
