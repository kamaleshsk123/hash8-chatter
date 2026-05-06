import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { generateUUID } from '@/utils/uuid';

// Organization and Membership Firestore functions
export const createOrganization = async (
  orgName: string,
  creator: { uid: string; email: string }
) => {
  // creator: { uid, email }
  const orgUID = generateUUID();
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
