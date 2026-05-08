# Hash8 Intranet – Project Overview & Roadmap

## 1️⃣ Current Core Features
| Area | Status | Key Components |
|------|--------|----------------|
| **Authentication** | ✅ Working | Google OAuth & email/password (`AuthContext.tsx`) |
| **Organizations** | ✅ Working | Create / join, member management |
| **Groups** | ✅ Working | Group CRUD, invites, real‑time chat |
| **Group Chat** | ✅ Working | Live messages, reactions, typing, read receipts |
| **Direct Messages** | ✅ Working | 1‑on‑1 chat, file/voice support |
| **Feed** | ✅ Working (partial) | `FeedDemo.tsx` (org‑scoped feed), `YourFeed.tsx` (global demo) |
| **User Profile** | ✅ Working | Edit profile, avatar, org view |
| **Moderation** | ✅ Working | Role‑based actions, audit log |
| **Dark Mode** | ✅ Working | Theme toggle |
| **Voice & File Sharing** | ✅ Working | Recorder, Cloudinary uploader |
| **Offline Cache** | ⚠️ Partial | IndexedDB persistence, custom sync service |
| **Bluetooth P2P** | ❌ Non‑functional | Web Bluetooth API errors |

## 2️⃣ Critical Bugs / Technical Debt (Fix First)
| # | Issue | Why It Blocks Progress | Quick Fix Idea |
|---|-------|------------------------|----------------|
| **1** | `firebase.ts` is a 1,600‑line monolith | ✅ **FIXED** | Split into focused service modules. |
| **2** | Feed not org‑scoped | ✅ **FIXED** | Posts moved under `organizations/{orgId}/posts`. |
| **3** | `YourFeed.tsx` uses hard‑coded mock data | ✅ **FIXED** | Replaced with real Firestore `onSnapshot` listener. |
| **4** | Bluetooth auto‑enable throws `SecurityError` | ✅ **FIXED** | Auto-enable removed; manual scan implemented. |
| **5** | `getUsersByIds` performs N sequential reads | ✅ **FIXED** | Batched reads with `in` query implemented. |
| **6** | Notification switches in `UserProfile.tsx` are UI‑only | ✅ **FIXED** | Wired to Firestore persistence. |
| **7** | Security & Activity tabs are placeholders | ✅ **FIXED** | Password reset, sign out, and live stats added. |
| **8** | Large components manage all state locally | ⚠️ **PARTIAL** | Core services split; shared store planned for Sprint 2. |
| **9** | Routing limited to `/login` & `/chat` | ⚠️ **PARTIAL** | URL-based state persistence added. |

## 3️⃣ High‑Impact Feature Roadmap
| Tier | Feature | Why It Matters | Rough Effort |
|------|----------|----------------|--------------|
| **P0** (must‑do) | Technical Debt Cleanup | ✅ **COMPLETE** | 2‑4 days total |
| **P1** | Push Notifications (Web Push + FCM) | ✅ **COMPLETE** | 2‑3 days |
| **P2** | Global Search (messages, users, posts) | ✅ **COMPLETE** | 2 days |
| **P3** | Pinned Messages | ✅ **COMPLETE** | Persistent sidebar + highlight |
| **P4** | Message Threads | ✅ **COMPLETE** | UI refinements & logic added |
| **P5** | Audio/Video Calls (WebRTC) | ⏸️ **PAUSED** | 5‑7 days |
| **P6** | PWA / Installable App | ⏸️ **PAUSED** | 2‑3 days |
| **P7** | Polls & Surveys | **NEXT UP** | 2‑3 days |
| **P8** | Shared Calendar / Events | **PLANNED** | 3‑4 days |

## 4️⃣ Suggested Next Steps
1. **Sprint 1 – Technical Debt** (✅ **COMPLETED**)
   - Break out `firebase.ts` into dedicated service modules and update imports.
   - Scope the feed to `organizations/{orgId}/posts`.
   - Replace mock data in `YourFeed.tsx` with a real Firestore listener.
   - Remove the auto‑Bluetooth call or gate it behind a user action.
   - Optimize `getUsersByIds` with batched queries.
   - Wire notification switches and security features in `UserProfile.tsx`.
2. **Sprint 2 – Core UX Boost** (✅ **COMPLETED**)
   - Implement Message Threads (UI refined, parent message simplified).
   - Enhance Pinned Messages (Persistent sidebar with auto-scroll & highlight).
   - Implement Global Search (✅ **COMPLETED**).
   - Integrate Push Notifications via FCM (✅ **COMPLETED**).
3. **Sprint 3 – Advanced Features** (🚀 **CURRENT**)
   - Implement Polls & Surveys for team collaboration (NEXT UP).
   - Begin Shared Calendar / Events.
   - *Note: Audio/Video Call integration (WebRTC) and PWA support are currently paused.*

> **Bottom line:** With Global Search and Notifications successfully integrated, the application provides a highly polished core chat experience. The focus now shifts toward team productivity features, starting with interactive Polls.

---
*Generated on 2026‑05‑07*