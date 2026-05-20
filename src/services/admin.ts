import { collectionGroup, query, orderBy, limit, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Message } from '@/types';

export interface AdminMessage extends Message {
  path: string;
  context?: string; // e.g. "Group: Developers" or "DM: Alice <> Bob"
  isCleared?: boolean;
  clearedAt?: any;
  restoredAt?: any;
}

export const getAllMessages = async (limitCount: number = 200): Promise<AdminMessage[]> => {
  try {
    const q = query(collectionGroup(db, 'messages'), orderBy('timestamp', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    
    const messages = await Promise.all(snapshot.docs.map(async (messageDoc) => {
      const data = messageDoc.data() as Record<string, any>;
      const path = messageDoc.ref.path;
      let context = 'Unknown';

      // Parse path to get context
      // organizations/{orgId}/groups/{groupId}/messages/{msgId}
      // direct_messages/{convId}/messages/{msgId}
      
      const parts = path.split('/');
      if (parts[0] === 'organizations') {
        const orgId = parts[1];
        const groupId = parts[3];
        // Fetch group name for better context
        try {
          const groupDoc = await getDoc(doc(db, `organizations/${orgId}/groups`, groupId));
          if (groupDoc.exists()) {
            context = `Group: ${groupDoc.data().name}`;
          }
        } catch (e) {
          context = `Group: ${groupId}`;
        }
      } else if (parts[0] === 'direct_messages') {
        const convId = parts[1];
        const uids = convId.split('_');
        // Fetch user names for better context
        try {
          const user1Doc = await getDoc(doc(db, 'users', uids[0]));
          const user2Doc = await getDoc(doc(db, 'users', uids[1]));
          const name1 = user1Doc.exists() ? (user1Doc.data().name || user1Doc.data().displayName) : uids[0];
          const name2 = user2Doc.exists() ? (user2Doc.data().name || user2Doc.data().displayName) : uids[1];
          context = `DM: ${name1} <> ${name2}`;
        } catch (e) {
          context = `DM: ${convId}`;
        }
      }

      return {
        id: messageDoc.id,
        ...data,
        timestamp: data.timestamp?.toDate() || new Date(),
        isCleared: data.isCleared || false,
        clearedAt: data.clearedAt?.toDate(),
        restoredAt: data.restoredAt?.toDate(),
        path,
        context
      } as AdminMessage;
    }));

    return messages;
  } catch (error) {
    console.error('Error getting all messages:', error);
    throw error;
  }
};

/**
 * Securely updates a user's role in Firestore.
 * Access is further restricted by Firestore rules.
 */
export const setUserRole = async (targetUserId: string, newRole: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', targetUserId);
    await updateDoc(userRef, {
      role: newRole,
      updatedAt: new Date()
    });
    console.log(`Successfully updated user ${targetUserId} role to ${newRole}`);
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};
