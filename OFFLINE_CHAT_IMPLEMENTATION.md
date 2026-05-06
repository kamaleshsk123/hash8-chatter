# Offline Chat Functionality

This document explains the offline chat capabilities added to Hash8 Chatter.

## 🎯 Problem Solved

**Issue**: When offline, switching between direct message conversations showed "Failed to start direct message" because Firebase couldn't load conversation data.

**Solution**: Implemented local caching and offline message queueing to maintain chat functionality even when disconnected.

## 🔧 New Features

### 1. **Offline Message Caching**
- Messages are automatically cached when loaded online
- Cached messages display when switching conversations offline
- Cache persists for 24 hours and survives browser restarts

### 2. **Offline Message Composition**
- Users can compose and send messages when offline
- Messages are queued locally and marked with "Sending..." indicator
- Optimistic UI updates show messages immediately

### 3. **Auto-Sync on Reconnection**
- Pending messages automatically sync when connection is restored
- Progress notifications show sync status
- Failed messages are reported and can be retried

### 4. **Visual Indicators**
- **Offline Mode Banner**: Yellow indicator shows when viewing cached messages
- **Pending Message Status**: Clock icon shows messages waiting to send
- **Network Status**: Toast notifications for online/offline transitions

## 🏗️ Architecture

### New Services

#### `OfflineCacheService` (`src/services/offlineCache.ts`)
- **Purpose**: Manages local storage of messages and conversations
- **Key Methods**:
  - `cacheMessages()`: Store conversation messages locally
  - `getCachedMessages()`: Retrieve cached messages for offline viewing
  - `cachePendingMessage()`: Queue messages for offline sending
  - `clearCache()`: Clear all cached data

#### `SyncService` (`src/services/syncService.ts`)
- **Purpose**: Handles synchronization of pending messages when online
- **Key Methods**:
  - `syncPendingMessages()`: Send all queued messages to server
  - `autoSync()`: Automatically sync when connection restored
  - `getPendingMessageCount()`: Get number of messages waiting to send

#### `useNetworkStatus` Hook (`src/hooks/useNetworkStatus.ts`)
- **Purpose**: Monitor online/offline state changes
- **Returns**:
  - `isOnline`: Current connection status
  - `wasOffline`: Flag indicating if user was previously offline
  - `resetWasOffline()`: Reset the offline flag

### Enhanced Components

#### `DirectMessage` Component
- **Offline Detection**: Uses network status to determine behavior
- **Cache Integration**: Loads cached messages when offline
- **Optimistic Updates**: Shows messages immediately when sent
- **Status Indicators**: Displays offline mode and message status

#### `ChatBubble` Component
- **Pending Status**: Shows clock icon for messages being sent
- **Visual Feedback**: Different styling for pending messages

## 📱 User Experience

### Online Mode (Default)
1. Messages load via Firebase real-time listeners
2. Messages are automatically cached for offline use
3. Sent messages appear immediately and sync to server

### Offline Mode
1. **Switching Conversations**: Cached messages load instantly
2. **Sending Messages**: Messages queue locally with "Sending..." status
3. **Visual Feedback**: Yellow banner indicates offline mode

### Coming Back Online
1. **Auto-Detection**: App detects network restoration
2. **Auto-Sync**: Pending messages automatically send to server
3. **Progress Feedback**: Notifications show sync progress and results

## 🔧 Technical Implementation

### Local Storage Schema
```javascript
// Cached conversations
"chatter_offline_conversations": {
  "user1_user2": {
    id: "user1_user2",
    messages: [...],
    lastUpdated: timestamp,
    otherUser: { userId, name, avatar, role }
  }
}

// Pending messages
"chatter_offline_pending_messages": {
  "user1_user2": [
    { id, text, senderId, timestamp, isPending: true }
  ]
}
```

### Message Flow
1. **Online Send**: DirectMessage → Firebase → Real-time update → Cache
2. **Offline Send**: DirectMessage → Local Queue → UI Update → Cache
3. **Offline Load**: DirectMessage → Cache → UI Display
4. **Sync**: Network Restored → SyncService → Firebase → Cache Clear

## 🚀 Testing the Feature

### Test Offline Functionality
1. Start the app online and send some messages
2. Open browser DevTools → Network tab
3. Set to "Offline" mode
4. Switch between different user conversations
5. Send new messages (should queue)
6. Go back online and verify messages sync

### Expected Behavior
- ✅ Conversations switch seamlessly when offline
- ✅ Messages show cached content
- ✅ New messages queue with pending indicator  
- ✅ Auto-sync occurs when back online
- ✅ Status notifications appear appropriately

## 🛠️ Configuration

### Cache Settings
- **Max Cache Age**: 24 hours (configurable in `offlineCache.ts`)
- **Storage Method**: localStorage (IndexedDB can be added later)
- **Cache Size**: Monitored but no automatic cleanup yet

### Sync Settings
- **Auto-Sync**: Enabled by default when network restored
- **Retry Logic**: Basic error handling (can be enhanced)
- **Batch Size**: No limit currently (can add pagination)

## 🔄 Future Enhancements

1. **IndexedDB Migration**: Better storage for large datasets
2. **Conflict Resolution**: Handle simultaneous edits
3. **File Upload Queue**: Cache media files for offline sending
4. **Selective Sync**: User control over what to cache
5. **Background Sync**: Service Worker integration
6. **Compression**: Reduce cache storage size

## 🐛 Known Limitations

1. **File Uploads**: Not supported in offline mode yet
2. **Real-time Features**: Typing indicators, read receipts disabled offline
3. **Cache Size**: No automatic cleanup when storage fills up
4. **Conflict Resolution**: Simple last-write-wins strategy

## 📊 Performance Impact

- **Storage**: ~1-5MB per conversation depending on message count
- **Memory**: Minimal impact, cache loaded on-demand
- **Network**: Reduced requests when offline, bulk sync when online
- **UI**: No noticeable performance impact