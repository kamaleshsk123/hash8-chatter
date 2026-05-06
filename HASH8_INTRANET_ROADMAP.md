# Hash8 Intranet — Deep Analysis & Feature Roadmap

After reading every file in the project, here is a thorough assessment of the current state, what's working well, what needs fixing, and what new features would make Hash8 Intranet a truly compelling product.

---

## Current State Summary

### What's Built

| Module | Status | Key Files |
|---|---|---|
| **Authentication** | ✅ Working | Google OAuth + Email/Password login, `AuthContext.tsx` |
| **Organizations** | ✅ Working | Create, Join (UID/QR), Settings, Member management |
| **Groups** | ✅ Working | Create within orgs, invite members, group messaging |
| **Group Chat** | ✅ Working | Real-time messages, reactions, read receipts, typing indicators |
| **Direct Messages** | ✅ Working | 1:1 chat with file/image/voice support |
| **Organization Feed** | ✅ Working | Posts, comments, reactions, save/bookmark, delete |
| **Your Feed** | ⚠️ Partial | Global feed view exists but shares same `posts` collection — no org-scoping |
| **User Profile** | ✅ Working | Edit name, bio, avatar upload, view orgs |
| **Moderation** | ✅ Working | Role-based permissions, message deletion, promotion/demotion, audit log |
| **Offline Support** | ⚠️ Partial | Firebase IndexedDB persistence, custom `offlineCache`, `syncService` |
| **Bluetooth P2P** | ❌ Non-functional | Web Bluetooth API cannot advertise; browser-to-browser is impossible |
| **Dark Mode** | ✅ Working | System/Light/Dark toggle via `ThemeContext` |
| **Voice Messages** | ✅ Working | Record, preview, send via `VoiceRecorder` |
| **File Sharing** | ✅ Working | Image compression + Cloudinary upload for images & documents |

### Architecture Overview

```
App.tsx
├── AuthProvider (context/AuthContext.tsx)
├── ThemeProvider (context/ThemeContext.tsx)
└── BrowserRouter
    ├── /login → Login.tsx
    └── /chat → Chat.tsx (Main Shell)
        ├── ChatSidebar.tsx
        │   └── OrganizationSidebar.tsx
        ├── Group Chat View (Chat.tsx inline)
        ├── DirectMessage.tsx
        ├── FeedDemo.tsx (Organization Feed)
        ├── YourFeed.tsx (Global Feed)
        └── OrganizationSettingsView.tsx

Services:
├── firebase.ts (1,628 lines — Auth, Orgs, Groups, Messages, DMs, Moderation, Users)
├── offlineCache.ts (localStorage-based message cache)
├── syncService.ts (offline message queue & sync)
├── hybridMessaging.ts (Firebase ↔ Bluetooth routing)
├── bluetoothMessaging.ts (Web Bluetooth scanning & GATT)
└── cloudinary.ts (image/document upload)
```

---

## 🔴 Critical Issues & Bugs

These should be fixed **before** adding new features:

### 1. `firebase.ts` is a 1,628-line monolith

This single file contains **everything**: auth, org management, group CRUD, messaging, direct messages, moderation, user status, typing indicators. It's the single biggest risk in the codebase — any change can break unrelated features.

**Recommendation**: Split `firebase.ts` into focused modules:
- `services/auth.ts` — sign in/out, profile upsert
- `services/organizations.ts` — org CRUD, membership
- `services/groups.ts` — group CRUD, group messaging
- `services/directMessages.ts` — DM conversations, messages
- `services/moderation.ts` — moderation actions, audit log
- `services/users.ts` — user profiles, status, presence

### 2. Feed is not org-scoped

`FeedDemo.tsx` reads from a global `posts` collection. Every organization sees the same feed. The feed should be scoped to `organizations/{orgId}/posts`.

### 3. `YourFeed.tsx` has hardcoded sample data

The "Your Feed" page has mock users and sample posts hardcoded in the component. It also does a one-shot `getDocs` instead of a real-time `onSnapshot`, so new posts won't appear without a page refresh.

### 4. Bluetooth code auto-triggers with a `SecurityError`

`DirectMessage.tsx` (lines 271-295) has a `useEffect` that calls `hybridMessaging.enableBluetoothMode()` automatically when going offline. This **always** throws a `SecurityError` because Bluetooth requires a user gesture. This code should be removed.

### 5. `getUsersByIds` makes N sequential Firestore reads

`firebase.ts` (lines 301-311) loops through user IDs one at a time with `getDoc`. For an org with 50 members, that's 50 sequential reads. This should use batched reads or Firestore's `in` query (max 30 per batch).

### 6. Notification switches in UserProfile are non-functional

The Settings tab in `UserProfile.tsx` has `<Switch />` components for Desktop, Sound, and Email notifications, but they aren't wired to any state or backend. They're purely visual.

### 7. Security tab is a placeholder

`UserProfile.tsx` (lines 557-569): "Security settings coming soon..." — no password change, 2FA setup, or session management.

### 8. Activity tab is a placeholder

`UserProfile.tsx` (lines 467-480): "Activity stats coming soon..." — no actual activity data.

---

## 🟡 Architecture Improvements

### 1. State Management

Currently `Chat.tsx` (1,052 lines) and `DirectMessage.tsx` (857 lines) manage all state locally with `useState`. As features grow, this becomes unmaintainable.

**Recommendation**: Introduce **Zustand** for shared state:
- `useAuthStore` — user data, online status
- `useChatStore` — active conversation, messages, typing
- `useOrgStore` — organizations, memberships, roles
- `useNotificationStore` — unread counts, push notification state

### 2. Custom Hooks Extraction

Extract business logic from page components into hooks:
- `useGroupChat(orgId, groupId)` — messages, send, typing, reactions
- `useDirectMessages(conversationId)` — DM-specific logic
- `useOrganizations(userId)` — org list, roles, member counts
- `usePresence(userIds)` — online/offline status tracking

### 3. Route-Based Code Splitting

The app has exactly two routes: `/login` and `/chat`. Everything else is conditional rendering inside `Chat.tsx`. This means the entire app loads upfront. Consider adding proper routes like `/chat/org/:orgId`, `/chat/dm/:conversationId`, etc.

---

## 🟢 New Feature Proposals

### Tier 1 — High Impact, Buildable Now

#### 1. 🔔 Push Notifications (Web Push API)
- **Why**: Users have no way to know about new messages unless the tab is open.
- **How**: Firebase Cloud Messaging (FCM) + Service Worker. Firebase is already set up.
- **Effort**: Medium (2-3 days)

#### 2. 🔍 Global Search
- **Why**: No way to find old messages, users, or posts.
- **How**: Client-side search using FlexSearch across cached messages, or a simple Firestore query-based search for recent messages.
- **Effort**: Medium (2 days)

#### 3. 📌 Pinned Messages
- **Why**: Important messages get lost in chat history.
- **How**: Add `isPinned` field to messages, show a pinned messages panel in group/DM views.
- **Effort**: Low (1 day)

#### 4. 🧵 Message Threads
- **Why**: Group chats become chaotic with interleaved conversations.
- **How**: Add `threadId` field to messages. Clicking "Reply in thread" opens a side panel.
- **Effort**: Medium-High (3-4 days)

#### 5. 📎 Link Previews (Open Graph)
- **Why**: Shared links are plain text with no context.
- **How**: Use a Cloud Function or proxy to fetch OG metadata (title, image, description) and render a rich preview card.
- **Effort**: Medium (2 days)

#### 6. 📊 Polls & Surveys
- **Why**: Perfect for intranet teams — quickly gather opinions.
- **How**: New message type `poll` with options array, vote tracking.
- **Effort**: Medium (2-3 days)

---

### Tier 2 — Premium Features

#### 7. 📞 Audio/Video Calling (WebRTC)
- **Why**: The natural evolution of a messaging platform.
- **How**: WebRTC with a signaling server (Firebase Realtime DB works well for this).
- **Components**: `CallProvider`, `VideoCallView`, `AudioCallView`, `IncomingCallDialog`
- **Effort**: High (5-7 days)

#### 8. 🗓️ Shared Calendar / Events
- **Why**: Teams need to schedule meetings, deadlines, and events.
- **How**: `organizations/{orgId}/events` collection. Calendar UI component.
- **Effort**: Medium-High (3-4 days)

#### 9. 📋 Task Board / Kanban
- **Why**: Light project management integrated into the intranet.
- **How**: `organizations/{orgId}/tasks` with status columns (To Do, In Progress, Done).
- **Effort**: High (4-5 days)

#### 10. 🔐 End-to-End Encryption (E2EE)
- **Why**: For sensitive corporate communication.
- **How**: Web Crypto API for key generation and message encryption/decryption. Key exchange via Firestore.
- **Effort**: Very High (7-10 days)

#### 11. 📱 PWA / Installable App
- **Why**: App-like experience without app stores. Instant load offline.
- **How**: Service Worker, Web App Manifest, cache strategies.
- **Effort**: Medium (2-3 days)

---

### Tier 3 — Nice to Have

#### 12. 🤖 AI Chat Assistant / Bot
- **Why**: Help users find info, answer FAQs, summarize long threads.
- **How**: Integrate Gemini or OpenAI API. Add a `@bot` mention handler.
- **Effort**: Medium (3 days)

#### 13. 📸 Stories / Status Updates
- **Why**: Ephemeral content for casual team updates.
- **How**: 24-hour expiring posts with media support.
- **Effort**: Medium (3 days)

#### 14. 🏷️ Channel Tags / Topics
- **Why**: Organize conversations within groups by topic.
- **How**: Hashtag-based filtering within group messages.
- **Effort**: Low (1-2 days)

#### 15. 📊 Analytics Dashboard (Admin)
- **Why**: Admins need visibility into engagement — active users, message volume, popular groups.
- **How**: Aggregate Firestore data into dashboard cards.
- **Effort**: Medium (2-3 days)

---

## Proposed Priority Order

Based on impact, effort, and building on what's already there:

| Priority | Feature | Why First |
|---|---|---|
| **P0** | Fix critical bugs (Bluetooth SecurityError, firebase.ts split, feed scoping) | Stability first |
| **P1** | Push Notifications | Users are blind without them |
| **P2** | Global Search | Core usability gap |
| **P3** | Pinned Messages | Low effort, high value |
| **P4** | Message Threads | Transforms group chat usability |
| **P5** | Audio/Video Calls | Major differentiator |
| **P6** | PWA Support | Professional feel, offline capability |
| **P7** | Polls & Surveys | Team engagement feature |
| **P8** | Shared Calendar | Intranet-specific high value |

---

## Tech Stack Reference

| Dependency | Version | Purpose |
|---|---|---|
| React | 18.x | UI framework |
| Vite | 5.x | Build tool |
| Firebase | 12.x | Auth, Firestore, Storage |
| TailwindCSS | 3.x | Styling |
| shadcn/ui | latest | Component library |
| Framer Motion | latest | Animations |
| React Router | 6.x | Client-side routing |
| React Query | latest | Server state management |
| Cloudinary | — | Image/document CDN |
| date-fns | latest | Date formatting |

---

*Last Updated: May 5, 2026*
*Generated by deep analysis of the Hash8 Intranet codebase*
