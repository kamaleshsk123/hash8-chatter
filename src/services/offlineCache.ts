import { Message } from '@/types';

interface CachedConversation {
  id: string;
  messages: any[];
  lastUpdated: number;
  otherUser: {
    userId: string;
    name: string;
    avatar: string;
    role?: string;
  };
}

interface CachedMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file' | 'audio' | 'document';
  readBy: Array<{
    userId: string;
    userName: string;
    userAvatar: string;
    readAt: Date;
  }>;
  isRead: boolean;
  reactions?: Record<string, Array<{
    userId: string;
    userName: string;
    timestamp: Date;
  }>>;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  filePath?: string;
  isEdited?: boolean;
  editedAt?: Date;
  replyTo?: {
    messageId: string;
    text: string;
    senderName: string;
  };
  deleted?: boolean;
  hasPendingWrites?: boolean;
  cachedAt: number;
}

class OfflineCacheService {
  private static instance: OfflineCacheService;
  private readonly CACHE_PREFIX = 'chatter_offline_';
  private readonly MESSAGES_CACHE_KEY = 'conversations';
  private readonly PENDING_MESSAGES_KEY = 'pending_messages';
  private readonly MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours

  static getInstance(): OfflineCacheService {
    if (!OfflineCacheService.instance) {
      OfflineCacheService.instance = new OfflineCacheService();
    }
    return OfflineCacheService.instance;
  }

  private getStorageKey(key: string): string {
    return `${this.CACHE_PREFIX}${key}`;
  }

  // Cache conversation metadata for offline access
  cacheConversationMetadata(conversationId: string, otherUser: any): void {
    try {
      const key = `conversation_metadata_${conversationId}`;
      const metadata = {
        conversationId,
        otherUser,
        cachedAt: Date.now()
      };
      localStorage.setItem(this.getStorageKey(key), JSON.stringify(metadata));
    } catch (error) {
      console.error('Error caching conversation metadata:', error);
    }
  }

  // Get cached conversation metadata
  getCachedConversationMetadata(conversationId: string): any | null {
    try {
      const key = `conversation_metadata_${conversationId}`;
      const cached = localStorage.getItem(this.getStorageKey(key));
      if (cached) {
        const metadata = JSON.parse(cached);
        // Check if metadata is still valid (24 hours)
        if (Date.now() - metadata.cachedAt < this.MAX_CACHE_AGE) {
          return metadata;
        } else {
          localStorage.removeItem(this.getStorageKey(key));
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting cached conversation metadata:', error);
      return null;
    }
  }

  // Cache messages for a conversation
  cacheMessages(conversationId: string, messages: any[], otherUser: any): void {
    try {
      const conversations = this.getAllCachedConversations();
      const cachedMessages: CachedMessage[] = messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
        cachedAt: Date.now()
      }));

      conversations[conversationId] = {
        id: conversationId,
        messages: cachedMessages,
        lastUpdated: Date.now(),
        otherUser
      };

      localStorage.setItem(
        this.getStorageKey(this.MESSAGES_CACHE_KEY),
        JSON.stringify(conversations)
      );
    } catch (error) {
      console.error('Error caching messages:', error);
    }
  }

  // Get cached messages for a conversation
  getCachedMessages(conversationId: string): { messages: any[], otherUser?: any } | null {
    try {
      const conversations = this.getAllCachedConversations();
      const conversation = conversations[conversationId];
      
      if (!conversation) {
        return null;
      }

      // Check if cache is still valid
      if (Date.now() - conversation.lastUpdated > this.MAX_CACHE_AGE) {
        this.removeCachedConversation(conversationId);
        return null;
      }

      // Convert timestamps back to Date objects
      const messages = conversation.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
        editedAt: msg.editedAt ? new Date(msg.editedAt) : undefined,
        readBy: msg.readBy.map((receipt: any) => ({
          ...receipt,
          readAt: new Date(receipt.readAt)
        }))
      }));

      return {
        messages,
        otherUser: conversation.otherUser
      };
    } catch (error) {
      console.error('Error getting cached messages:', error);
      return null;
    }
  }

  // Get all cached conversations
  private getAllCachedConversations(): { [key: string]: CachedConversation } {
    try {
      const cached = localStorage.getItem(this.getStorageKey(this.MESSAGES_CACHE_KEY));
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      console.error('Error parsing cached conversations:', error);
      return {};
    }
  }

  // Remove a specific conversation from cache
  removeCachedConversation(conversationId: string): void {
    try {
      const conversations = this.getAllCachedConversations();
      delete conversations[conversationId];
      localStorage.setItem(
        this.getStorageKey(this.MESSAGES_CACHE_KEY),
        JSON.stringify(conversations)
      );
    } catch (error) {
      console.error('Error removing cached conversation:', error);
    }
  }

  // Check if messages exist in cache
  hasCachedMessages(conversationId: string): boolean {
    const conversations = this.getAllCachedConversations();
    return !!conversations[conversationId];
  }

  // Cache pending messages (for offline sending)
  cachePendingMessage(conversationId: string, message: any): void {
    try {
      const pending = this.getPendingMessages();
      if (!pending[conversationId]) {
        pending[conversationId] = [];
      }
      
      pending[conversationId].push({
        ...message,
        id: message.id || `pending_${Date.now()}_${Math.random()}`,
        timestamp: new Date(),
        isPending: true,
        cachedAt: Date.now()
      });

      localStorage.setItem(
        this.getStorageKey(this.PENDING_MESSAGES_KEY),
        JSON.stringify(pending)
      );
    } catch (error) {
      console.error('Error caching pending message:', error);
    }
  }

  // Get pending messages for a conversation
  getPendingMessages(conversationId?: string): any {
    try {
      const cached = localStorage.getItem(this.getStorageKey(this.PENDING_MESSAGES_KEY));
      const all = cached ? JSON.parse(cached) : {};
      
      if (conversationId) {
        return all[conversationId] || [];
      }
      return all;
    } catch (error) {
      console.error('Error getting pending messages:', error);
      return conversationId ? [] : {};
    }
  }

  // Remove pending message after successful send
  removePendingMessage(conversationId: string, messageId: string): void {
    try {
      const pending = this.getPendingMessages();
      if (pending[conversationId]) {
        pending[conversationId] = pending[conversationId].filter(
          (msg: any) => msg.id !== messageId
        );
        
        if (pending[conversationId].length === 0) {
          delete pending[conversationId];
        }

        localStorage.setItem(
          this.getStorageKey(this.PENDING_MESSAGES_KEY),
          JSON.stringify(pending)
        );
      }
    } catch (error) {
      console.error('Error removing pending message:', error);
    }
  }

  // Clear all cache
  clearCache(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.CACHE_PREFIX)
      );
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // Get cache size info
  getCacheInfo(): { conversationCount: number, totalMessages: number, cacheSize: string } {
    try {
      const conversations = this.getAllCachedConversations();
      const conversationCount = Object.keys(conversations).length;
      let totalMessages = 0;
      
      Object.values(conversations).forEach(conv => {
        totalMessages += conv.messages.length;
      });

      // Estimate cache size
      const cacheString = JSON.stringify(conversations);
      const cacheSize = `${(cacheString.length / 1024).toFixed(2)} KB`;

      return { conversationCount, totalMessages, cacheSize };
    } catch (error) {
      console.error('Error getting cache info:', error);
      return { conversationCount: 0, totalMessages: 0, cacheSize: '0 KB' };
    }
  }
}

export const offlineCache = OfflineCacheService.getInstance();