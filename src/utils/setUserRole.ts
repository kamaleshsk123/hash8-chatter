import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { UserRole } from '@/types';

/**
 * Utility function to set a user's role in Firestore
 * This should only be used by authorized administrators
 */
export const setUserRole = async (userId: string, role: UserRole): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      role: role
    });
    console.log(`Successfully updated user ${userId} role to ${role}`);
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

/**
 * Helper function to make current user an admin
 * Call this from browser console: window.makeCurrentUserAdmin()
 */
export const makeCurrentUserAdmin = async (currentUserId: string): Promise<void> => {
  if (!currentUserId) {
    throw new Error('No user ID provided');
  }
  
  await setUserRole(currentUserId, 'admin');
  alert('User role updated to admin! Please refresh the page to see changes.');
};

// Make function available globally for easy access from browser console
if (typeof window !== 'undefined') {
  (window as any).setUserRole = setUserRole;
  (window as any).makeCurrentUserAdmin = makeCurrentUserAdmin;
}
