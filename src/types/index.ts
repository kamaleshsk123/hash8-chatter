export interface User {
  uid: string;
  name: string;
  email: string;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: Date;
  role?: UserRole;
  phone?: string;
  jobTitle?: string;
  department?: string;
  bio?: string;
  location?: string;
  createdAt?: Date;
  updatedAt?: Date;
  notifications?: {
    desktop?: boolean;
    sound?: boolean;
    email?: boolean;
    pushEnabled?: boolean;
  };
  fcmTokens?: string[];
}

export type UserRole = 'super_admin' | 'admin' | 'moderator' | 'member';

export interface ModeratorPermissions {
  canManageMessages: boolean;
  canManageMembers: boolean;
  canManageGroups: boolean;
  canViewReports: boolean;
  canBanUsers: boolean;
}

export interface ModerationAction {
  id: string;
  actionType: 'delete_message' | 'ban_user' | 'warn_user' | 'delete_group' | 'promote_user' | 'demote_user';
  targetId: string; // message ID, user ID, or group ID
  targetName?: string; // name of the target for display
  moderatorId: string;
  moderatorName: string;
  reason: string;
  timestamp: Date;
  organizationId: string;
  details?: any; // Additional action-specific data
}

export interface Group {
  id: string;
  name: string;
  avatar?: string;
  members: string[]; // user IDs
  createdBy: string;
  createdAt: Date;
  lastMessage?: Message;
  unreadCount?: number;
}

export interface Message {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file' | 'system' | 'poll';
  pollData?: {
    question: string;
    options: {
      id: string;
      text: string;
      userIds: string[];
    }[];
    allowMultipleAnswers: boolean;
  };
  reactions?: Reaction[];
  isEdited?: boolean;
  readBy?: ReadReceipt[];
  deleted?: boolean;
  deletedBy?: string;
  deletedAt?: Date;
  deletionReason?: string;
  originalText?: string;
  isPinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: Date;
  hasPendingWrites?: boolean; // Added for offline support
  parentMessageId?: string; // For threads
  replyCount?: number;      // Number of replies in the thread
  isCleared?: boolean;
  clearedAt?: Date;
}

export interface ReadReceipt {
  userId: string;
  userName: string;
  userAvatar?: string;
  readAt: Date;
}

export interface Reaction {
  emoji: string;
  userIds: string[];
}

export interface TypingStatus {
  groupId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface ChatState {
  selectedGroup?: Group;
  messages: Message[];
  typingUsers: TypingStatus[];
  isLoading: boolean;
}

export interface CalendarEvent {
  id: string;
  orgId: string;
  groupId?: string; // Optional for org-wide events
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  createdBy: string;
  createdAt: Date;
  type: 'org' | 'group';
}