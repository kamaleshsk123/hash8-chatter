import { sendDirectMessage } from './firebase';
import { bluetoothMessaging, BluetoothMessage } from './bluetoothMessaging';
import { offlineCache } from './offlineCache';
import { syncService } from './syncService';

type MessageTransport = 'firebase' | 'bluetooth' | 'cache';

interface HybridMessage {
  id: string;
  conversationId: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file';
  transport: MessageTransport;
  needsFirebaseSync?: boolean;
  bluetoothSent?: boolean;
  replyTo?: {
    messageId: string;
    text: string;
    senderName: string;
  };
}

interface MessageSendResult {
  success: boolean;
  transport: MessageTransport;
  message: string;
  messageId?: string;
}

class HybridMessagingService {
  private static instance: HybridMessagingService;
  private messageListeners: Array<(message: HybridMessage) => void> = [];

  static getInstance(): HybridMessagingService {
    if (!HybridMessagingService.instance) {
      HybridMessagingService.instance = new HybridMessagingService();
    }
    return HybridMessagingService.instance;
  }

  constructor() {
    this.setupBluetoothListener();
  }

  // Set up listener for incoming Bluetooth messages
  private setupBluetoothListener(): void {
    bluetoothMessaging.onMessage((bluetoothMessage: BluetoothMessage) => {
      const hybridMessage: HybridMessage = {
        id: bluetoothMessage.id,
        conversationId: bluetoothMessage.conversationId,
        text: bluetoothMessage.text,
        senderId: bluetoothMessage.senderId,
        senderName: bluetoothMessage.senderName,
        timestamp: bluetoothMessage.timestamp,
        type: bluetoothMessage.type,
        transport: 'bluetooth',
        needsFirebaseSync: true,
        bluetoothSent: false // This is a received message
      };

      // Store in cache for sync when online
      offlineCache.cachePendingMessage(bluetoothMessage.conversationId, hybridMessage);
      
      // Notify listeners
      this.notifyListeners(hybridMessage);
    });
  }

  // Intelligently send message using the best available transport
  async sendMessage(
    conversationId: string,
    messageData: Omit<HybridMessage, 'id' | 'timestamp' | 'transport' | 'conversationId'>,
    isOnline: boolean
  ): Promise<MessageSendResult> {
    const messageId = crypto.randomUUID();
    const message: HybridMessage = {
      id: messageId,
      conversationId,
      timestamp: new Date(),
      transport: 'cache', // Default fallback
      ...messageData
    };

    // Priority 1: Online -> Use Firebase
    if (isOnline) {
      try {
        await sendDirectMessage(conversationId, {
          text: messageData.text,
          senderId: messageData.senderId,
          senderName: messageData.senderName,
          senderAvatar: messageData.senderAvatar,
          type: messageData.type,
          replyTo: messageData.replyTo
        });

        message.transport = 'firebase';
        this.notifyListeners(message);

        return {
          success: true,
          transport: 'firebase',
          message: 'Message sent via internet',
          messageId
        };
      } catch (error) {
        console.error('Firebase send failed, trying Bluetooth:', error);
        // Fall through to Bluetooth if Firebase fails
      }
    }

    // Priority 2: Offline with Bluetooth -> Use Bluetooth P2P
    if (bluetoothMessaging.hasConnectedDevices()) {
      try {
        const bluetoothMessage: Omit<BluetoothMessage, 'via' | 'needsSync'> = {
          id: messageId,
          conversationId,
          text: messageData.text,
          senderId: messageData.senderId,
          senderName: messageData.senderName,
          timestamp: message.timestamp,
          type: messageData.type
        };

        await bluetoothMessaging.sendMessage(bluetoothMessage);
        
        message.transport = 'bluetooth';
        message.needsFirebaseSync = true;
        message.bluetoothSent = true;

        // Cache for Firebase sync when online
        offlineCache.cachePendingMessage(conversationId, message);
        this.notifyListeners(message);

        return {
          success: true,
          transport: 'bluetooth',
          message: 'Message sent via Bluetooth to nearby devices',
          messageId
        };
      } catch (error) {
        console.error('Bluetooth send failed, caching locally:', error);
        // Fall through to local cache
      }
    }

    // Priority 3: Pure Offline -> Cache for later sync
    message.transport = 'cache';
    message.needsFirebaseSync = true;
    
    offlineCache.cachePendingMessage(conversationId, message);
    this.notifyListeners(message);

    return {
      success: true,
      transport: 'cache',
      message: isOnline 
        ? 'Message cached due to connection issues' 
        : 'Message cached for sending when online',
      messageId
    };
  }

  // Initialize Bluetooth scanning when going offline
  async enableBluetoothMode(): Promise<boolean> {
    try {
      if (!bluetoothMessaging.isBluetoothAvailable()) {
        await bluetoothMessaging.startScanning();
      }
      return bluetoothMessaging.hasConnectedDevices();
    } catch (error) {
      console.error('Failed to enable Bluetooth mode:', error);
      return false;
    }
  }

  // Sync all offline messages when coming back online
  async syncOfflineMessages(): Promise<void> {
    try {
      // Get all cached messages (including Bluetooth ones)
      const allPending = offlineCache.getPendingMessages();
      
      for (const conversationId of Object.keys(allPending)) {
        const messages = allPending[conversationId];
        
        for (const message of messages) {
          try {
            // Send Bluetooth messages to Firebase
            if (message.transport === 'bluetooth' || message.needsFirebaseSync) {
              await sendDirectMessage(conversationId, {
                text: message.text,
                senderId: message.senderId,
                senderName: message.senderName,
                senderAvatar: message.senderAvatar,
                type: message.type,
                replyTo: message.replyTo
              });

              // Remove from cache after successful sync
              offlineCache.removePendingMessage(conversationId, message.id);
              
              console.log(`Synced ${message.transport} message to Firebase:`, message.id);
            }
          } catch (error) {
            console.error('Failed to sync message:', message.id, error);
          }
        }
      }
    } catch (error) {
      console.error('Error during offline message sync:', error);
    }
  }

  // Subscribe to messages from all transports
  onMessage(callback: (message: HybridMessage) => void): () => void {
    this.messageListeners.push(callback);
    
    return () => {
      const index = this.messageListeners.indexOf(callback);
      if (index > -1) {
        this.messageListeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners of new messages
  private notifyListeners(message: HybridMessage): void {
    this.messageListeners.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('Message listener error:', error);
      }
    });
  }

  // Get current messaging status
  getMessagingStatus(isOnline: boolean): {
    primary: MessageTransport;
    available: MessageTransport[];
    bluetoothDevices: number;
  } {
    const available: MessageTransport[] = ['cache']; // Always available
    
    if (isOnline) {
      available.unshift('firebase');
    }
    
    if (bluetoothMessaging.hasConnectedDevices()) {
      available.splice(isOnline ? 1 : 0, 0, 'bluetooth');
    }

    return {
      primary: available[0],
      available,
      bluetoothDevices: bluetoothMessaging.getConnectedDevices().length
    };
  }

  // Cleanup Bluetooth connections
  async cleanup(): Promise<void> {
    await bluetoothMessaging.disconnectAll();
  }
}

export const hybridMessaging = HybridMessagingService.getInstance();
export type { HybridMessage, MessageSendResult, MessageTransport };