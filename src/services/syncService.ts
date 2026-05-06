import { offlineCache } from './offlineCache';
import { sendDirectMessage } from './firebase';

interface SyncResult {
  success: number;
  failed: number;
  errors: Array<{ conversationId: string; messageId: string; error: string }>;
}

class SyncService {
  private static instance: SyncService;
  private isSyncing = false;
  private syncCallbacks: Array<(result: SyncResult) => void> = [];

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  // Add callback for sync completion
  onSyncComplete(callback: (result: SyncResult) => void): void {
    this.syncCallbacks.push(callback);
  }

  // Remove callback
  removeSyncCallback(callback: (result: SyncResult) => void): void {
    this.syncCallbacks = this.syncCallbacks.filter(cb => cb !== callback);
  }

  // Sync all pending messages
  async syncPendingMessages(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return { success: 0, failed: 0, errors: [] };
    }

    this.isSyncing = true;
    const result: SyncResult = { success: 0, failed: 0, errors: [] };

    try {
      const allPendingMessages = offlineCache.getPendingMessages();
      const conversationIds = Object.keys(allPendingMessages);

      console.log(`Starting sync for ${conversationIds.length} conversations`);

      for (const conversationId of conversationIds) {
        const messages = allPendingMessages[conversationId];
        
        for (const message of messages) {
          try {
            // Prepare message data for sending
            const messageData = {
              text: message.text,
              senderId: message.senderId,
              senderName: message.senderName,
              senderAvatar: message.senderAvatar || '',
              type: message.type || 'text',
              replyTo: message.replyTo
            };

            await sendDirectMessage(conversationId, messageData);
            
            // Remove from pending messages on success
            offlineCache.removePendingMessage(conversationId, message.id);
            result.success++;
            
            console.log(`Successfully synced message ${message.id} in conversation ${conversationId}`);
          } catch (error) {
            console.error(`Failed to sync message ${message.id}:`, error);
            result.failed++;
            result.errors.push({
              conversationId,
              messageId: message.id,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }

      console.log(`Sync completed: ${result.success} success, ${result.failed} failed`);
      
      // Notify all callbacks
      this.syncCallbacks.forEach(callback => {
        try {
          callback(result);
        } catch (error) {
          console.error('Error in sync callback:', error);
        }
      });

      return result;
    } catch (error) {
      console.error('Error during sync:', error);
      return { success: 0, failed: 0, errors: [{ conversationId: 'unknown', messageId: 'unknown', error: 'Sync failed to start' }] };
    } finally {
      this.isSyncing = false;
    }
  }

  // Check if syncing is in progress
  get isCurrentlySyncing(): boolean {
    return this.isSyncing;
  }

  // Get count of pending messages
  getPendingMessageCount(): number {
    const allPending = offlineCache.getPendingMessages();
    let count = 0;
    Object.values(allPending).forEach((messages: any[]) => {
      count += messages.length;
    });
    return count;
  }

  // Auto-sync when network is restored
  async autoSync(): Promise<SyncResult> {
    const pendingCount = this.getPendingMessageCount();
    if (pendingCount > 0) {
      console.log(`Auto-syncing ${pendingCount} pending messages`);
      return await this.syncPendingMessages();
    }
    return { success: 0, failed: 0, errors: [] };
  }
}

export const syncService = SyncService.getInstance();