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
  
  // Firestore "in" query is limited to 30 items per query
  const batches = [];
  for (let i = 0; i < userIds.length; i += 30) {
    batches.push(userIds.slice(i, i + 30));
  }
  
  const results: any[] = [];
  
  // Run batches in parallel for better performance
  const batchPromises = batches.map(async (batch) => {
    const q = query(collection(db, "users"), where("__name__", "in", batch));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ userId: doc.id, ...doc.data() }));
  });
  
  const barchResults = await Promise.all(batchPromises);
  barchResults.forEach(batchResult => results.push(...batchResult));
  
  return results;
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

// Search users by name prefix
export const searchUsers = async (searchTerm: string) => {
  if (!searchTerm || searchTerm.length < 2) return [];
  
  const q = query(
    collection(db, "users"),
    where("name", ">=", searchTerm),
    where("name", "<=", searchTerm + '\uf8ff'),
    limit(10)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ userId: doc.id, ...doc.data() }));
};
