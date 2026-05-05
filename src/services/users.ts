import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
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
