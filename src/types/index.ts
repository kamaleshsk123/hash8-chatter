export interface User {
  uid: string;
  name: string;
  email: string;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: Date;
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
  type: 'text' | 'image' | 'file';
  reactions?: Reaction[];
  isEdited?: boolean;
  readBy?: ReadReceipt[];
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