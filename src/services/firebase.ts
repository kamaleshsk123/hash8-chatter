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
  return results;
};

export default app;
