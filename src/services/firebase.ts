/**
 * Firebase Service — Barrel Re-export
 * 
 * This file was previously a 1,628-line monolith containing all Firebase logic.
 * It has been split into focused modules for better maintainability:
 * 
 * - firebaseConfig.ts  — Firebase initialization (app, db, auth, storage)
 * - auth.ts            — Authentication (sign in, register, sign out)
 * - organizations.ts   — Organization CRUD, membership management
 * - groups.ts          — Group CRUD, group messaging, typing, reactions
 * - directMessages.ts  — DM conversations, messages, reactions, typing
 * - users.ts           — User profiles, presence/status
 * - moderation.ts      — Moderation actions, role management, banning
 * - fileStorage.ts     — File upload/delete (Firebase Storage)
 * 
 * All exports are re-exported here so existing imports continue to work.
 * New code should import directly from the specific module.
 */

// === Firebase Core ===
export { default } from './firebaseConfig';
export { auth, db, storage, googleProvider } from './firebaseConfig';

// === Authentication ===
export { 
  signInWithGoogle, 
  signInWithEmail, 
  registerWithEmail, 
  signOutUser, 
  upsertUserProfile,
  resetPassword 
} from './auth';

// === Organizations ===
export { 
  createOrganization, 
  joinOrganization, 
  getOrganizationByUID, 
  getUserOrganizations, 
  getOrganizationMemberCount, 
  getUserRoleInOrganization, 
  getOrganizationGroups, 
  getOrganizationMembers, 
  updateOrganization, 
  removeMemberFromOrganization 
} from './organizations';

// === Users ===
export { 
  getUsersByIds, 
  updateUserProfile, 
  updateUserStatus, 
  subscribeToUserStatus,
  searchUsers 
} from './users';

// === Groups ===
export { 
  createGroup, 
  inviteToGroup, 
  leaveGroup, 
  updateGroup, 
  sendSystemMessage, 
  getGroupMessages, 
  sendGroupMessage, 
  subscribeToGroupMessages, 
  addGroupMessageReaction, 
  updateTypingStatus, 
  subscribeToGroupTypingIndicators, 
  getGroupDetails, 
  markGroupMessagesAsRead, 
  getUnreadMessageCount, 
  markMessageAsRead, 
  markMultipleMessagesAsRead,
  togglePinGroupMessage,
  deleteGroupMessage 
} from './groups';

// === Direct Messages ===
export { 
  createConversationId,
  createOrGetDirectMessageOffline,
  createOrGetDirectMessage, 
  sendDirectMessage, 
  getUserDirectMessageConversations, 
  getDirectMessages, 
  subscribeToDirectMessages, 
  markDirectMessageAsRead, 
  markMultipleDirectMessagesAsRead, 
  sendDirectMessageWithFile, 
  addMessageReaction, 
  editDirectMessage, 
  deleteDirectMessage, 
  softDeleteDirectMessage, 
  setTypingIndicator, 
  subscribeToTypingIndicators,
  subscribeToConversations,
  resetUnreadCount,
  togglePinDirectMessage
} from './directMessages';

// === File Storage ===
export { 
  uploadFile, 
  deleteFile 
} from './fileStorage';

// === Moderation ===
export { 
  logModerationAction, 
  getModerationActions, 
  promoteToModerator, 
  demoteFromModerator, 
  deleteMessageAsModerator, 
  banUserFromOrganization, 
  isUserBanned 
} from './moderation';