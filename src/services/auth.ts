import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebaseConfig';

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
