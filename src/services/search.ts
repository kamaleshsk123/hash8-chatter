import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  collectionGroup
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Message } from '@/types';

/**
 * Searches for messages across all group chats the user has access to.
 * Note: Requires a Firestore Collection Group Index on 'messages'.
 */
export const searchGlobalMessages = async (searchTerm: string, limitCount = 5): Promise<Message[]> => {
  if (!searchTerm || searchTerm.length < 2) return [];

  try {
    // Simple prefix search using Firestore query
    // This is a common pattern for basic search in Firestore
    const messagesQuery = query(
      collectionGroup(db, 'messages'),
      where('text', '>=', searchTerm),
      where('text', '<=', searchTerm + '\uf8ff'),
      orderBy('text'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(messagesQuery);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Message));
  } catch (error) {
    console.error("Global message search failed:", error);
    return [];
  }
};

/**
 * Searches for posts within an organization.
 */
export const searchOrgPosts = async (orgId: string, searchTerm: string, limitCount = 5) => {
  if (!orgId || !searchTerm || searchTerm.length < 2) return [];

  try {
    const postsQuery = query(
      collection(db, 'organizations', orgId, 'posts'),
      where('content', '>=', searchTerm),
      where('content', '<=', searchTerm + '\uf8ff'),
      orderBy('content'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(postsQuery);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Org post search failed:", error);
    return [];
  }
};
