// Web Bluetooth API type definitions
declare global {
  interface Navigator {
    bluetooth: Bluetooth;
  }
  
  interface Bluetooth {
    requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
  }
  
  interface BluetoothDevice {
    id: string;
    name?: string;
    gatt: BluetoothRemoteGATTServer;
  }
  
  interface RequestDeviceOptions {
    filters?: BluetoothLEScanFilter[];
    optionalServices?: BluetoothServiceUUID[];
  }
  
  interface BluetoothLEScanFilter {
    services?: BluetoothServiceUUID[];
    name?: string;
    namePrefix?: string;
  }
  
  type BluetoothServiceUUID = number | string;
  
  interface BluetoothRemoteGATTServer {
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>;
  }
  
  interface BluetoothRemoteGATTService {
    getCharacteristic(characteristic: BluetoothServiceUUID): Promise<BluetoothRemoteGATTCharacteristic>;
  }
  
  interface BluetoothRemoteGATTCharacteristic {
    startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    writeValue(value: BufferSource): Promise<void>;
    addEventListener(type: string, listener: EventListener): void;
    removeEventListener(type: string, listener: EventListener): void;
    value?: DataView;
  }
}

// Bluetooth P2P Messaging Service
interface ChatBluetoothDevice {
  id: string;
  name: string;
  connected: boolean;
  characteristic?: BluetoothRemoteGATTCharacteristic;
}

interface BluetoothMessage {
  id: string;
  conversationId: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file';
  via: 'bluetooth';
  needsSync: boolean;
}

class BluetoothMessagingService {
  private static instance: BluetoothMessagingService;
  private connectedDevices: Map<string, ChatBluetoothDevice> = new Map();
  private messageCallbacks: Array<(message: BluetoothMessage) => void> = [];
  private isScanning = false;
  private isSupported = false;

  // Bluetooth service UUID for Hash8 Chatter
  private readonly SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
  private readonly CHARACTERISTIC_UUID = '87654321-4321-4321-4321-cba987654321';

  static getInstance(): BluetoothMessagingService {
    if (!BluetoothMessagingService.instance) {
      BluetoothMessagingService.instance = new BluetoothMessagingService();
    }
    return BluetoothMessagingService.instance;
  }

  constructor() {
    this.checkBluetoothSupport();
  }

  private checkBluetoothSupport(): void {
    this.isSupported = 'bluetooth' in navigator && 'requestDevice' in (navigator as any).bluetooth;
    console.log('Bluetooth Web API supported:', this.isSupported);
  }

  // Check if Bluetooth is available for messaging
  isBluetoothAvailable(): boolean {
    return this.isSupported && this.connectedDevices.size > 0;
  }

  // Start scanning for nearby Hash8 Chatter devices
  async startScanning(): Promise<void> {
    if (!this.isSupported || this.isScanning) return;

    try {
      this.isScanning = true;
      console.log('Scanning for Hash8 Chatter devices...');

      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: [this.SERVICE_UUID] }],
        optionalServices: [this.SERVICE_UUID]
      });

      if (device) {
        await this.connectToDevice(device);
      }
    } catch (error) {
      console.error('Bluetooth scanning error:', error);
      throw error;
    } finally {
      this.isScanning = false;
    }
  }

  // Connect to a discovered device
  private async connectToDevice(device: any): Promise<void> {
    try {
      console.log('Connecting to device:', device.name);
      
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(this.SERVICE_UUID);
      const characteristic = await service.getCharacteristic(this.CHARACTERISTIC_UUID);

      // Set up message receiving
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', this.handleReceivedMessage.bind(this));

      const bluetoothDevice: ChatBluetoothDevice = {
        id: device.id,
        name: device.name || 'Unknown Device',
        connected: true,
        characteristic
      };

      this.connectedDevices.set(device.id, bluetoothDevice);
      console.log('Connected to device:', bluetoothDevice.name);

    } catch (error) {
      console.error('Device connection error:', error);
      throw error;
    }
  }

  // Handle incoming Bluetooth messages
  private handleReceivedMessage(event: any): void {
    try {
      const value = event.target.value;
      const decoder = new TextDecoder();
      const messageData = JSON.parse(decoder.decode(value));

      const bluetoothMessage: BluetoothMessage = {
        ...messageData,
        via: 'bluetooth',
        needsSync: true,
        timestamp: new Date(messageData.timestamp)
      };

      console.log('Received Bluetooth message:', bluetoothMessage);
      
      // Notify all listeners
      this.messageCallbacks.forEach(callback => {
        try {
          callback(bluetoothMessage);
        } catch (error) {
          console.error('Message callback error:', error);
        }
      });

    } catch (error) {
      console.error('Message parsing error:', error);
    }
  }

  // Send message via Bluetooth to connected devices
  async sendMessage(message: Omit<BluetoothMessage, 'via' | 'needsSync'>): Promise<boolean> {
    if (this.connectedDevices.size === 0) {
      throw new Error('No connected devices for Bluetooth messaging');
    }

    const bluetoothMessage: BluetoothMessage = {
      ...message,
      via: 'bluetooth',
      needsSync: true
    };

    const messageString = JSON.stringify(bluetoothMessage);
    const encoder = new TextEncoder();
    const data = encoder.encode(messageString);

    let sentToAny = false;

    for (const device of this.connectedDevices.values()) {
      if (device.connected && device.characteristic) {
        try {
          await device.characteristic.writeValue(data);
          console.log('Message sent to device:', device.name);
          sentToAny = true;
        } catch (error) {
          console.error(`Failed to send to device ${device.name}:`, error);
          // Mark device as disconnected
          device.connected = false;
        }
      }
    }

    if (!sentToAny) {
      throw new Error('Failed to send message to any connected device');
    }

    return sentToAny;
  }

  // Subscribe to incoming messages
  onMessage(callback: (message: BluetoothMessage) => void): () => void {
    this.messageCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.messageCallbacks.indexOf(callback);
      if (index > -1) {
        this.messageCallbacks.splice(index, 1);
      }
    };
  }

  // Get list of connected devices
  getConnectedDevices(): ChatBluetoothDevice[] {
    return Array.from(this.connectedDevices.values()).filter(device => device.connected);
  }

  // Disconnect from all devices
  async disconnectAll(): Promise<void> {
    for (const device of this.connectedDevices.values()) {
      try {
        if (device.characteristic) {
          await device.characteristic.stopNotifications();
        }
      } catch (error) {
        console.error('Error disconnecting device:', error);
      }
    }
    
    this.connectedDevices.clear();
    console.log('Disconnected from all Bluetooth devices');
  }

  // Check connection status
  hasConnectedDevices(): boolean {
    return Array.from(this.connectedDevices.values()).some(device => device.connected);
  }
}

export const bluetoothMessaging = BluetoothMessagingService.getInstance();
export type { BluetoothMessage, ChatBluetoothDevice };