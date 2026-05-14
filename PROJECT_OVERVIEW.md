# Hash8 Intranet – Project Overview & Roadmap

## 1️⃣ Current Core Features
| Area | Status | Key Components |
|------|--------|----------------|
| **Authentication** | ✅ Working | Google OAuth & email/password (`AuthContext.tsx`) |
| **Organizations** | ✅ Working | Create / join, member management |
| **Groups** | ✅ Working | Group CRUD, invites, real‑time chat |
| **Group Chat** | ✅ Working | Live messages, reactions, typing, read receipts, **Sticky Date Separators** |
| **Direct Messages** | ✅ Working | 1‑on‑1 chat, file/voice support, **Clear Chat (Soft Delete)** |
| **Feed** | ✅ Working (partial) | `FeedDemo.tsx` (org‑scoped feed), `YourFeed.tsx` (global demo) |
| **User Profile** | ✅ Working | Edit profile, avatar, org view |
| **Moderation** | ✅ Working | Role‑based actions, audit log, **Message Recovery Dashboard** |
| **Dark Mode** | ✅ Working | Theme toggle |
| **Voice & File Sharing** | ✅ Working | Recorder, Cloudinary uploader |
| **Offline Cache** | ⚠️ Partial | IndexedDB persistence, custom sync service |
| **Bluetooth P2P** | ❌ Non‑functional | Web Bluetooth API advertising limitations |
| **Shared Calendar** | ✅ Working | Org-wide, group, and personal events |
| **Global Calendar** | ✅ Working | Aggregated participant view across organizations |

## 2️⃣ Critical Bugs / Technical Debt (Fix First)
| # | Issue | Why It Blocks Progress | Status |
|---|-------|------------------------|--------|
| **1** | `firebase.ts` is a 1,600‑line monolith | Split into focused service modules. | ✅ FIXED |
| **2** | Feed not org‑scoped | Posts moved under `organizations/{orgId}/posts`. | ✅ FIXED |
| **3** | `YourFeed.tsx` uses hard‑coded mock data | Replaced with real Firestore `onSnapshot` listener. | ✅ FIXED |
| **4** | Bluetooth auto‑enable throws `SecurityError` | Auto-enable removed; manual scan implemented. | ✅ FIXED |
| **5** | `getUsersByIds` performs N sequential reads | Batched reads with `in` query implemented. | ✅ FIXED |
| **6** | Notification switches are UI‑only | Wired to Firestore persistence. | ✅ FIXED |
| **7** | Security & Activity tabs are placeholders | Password reset, sign out, and live stats added. | ✅ FIXED |
| **8** | Clear Chat displays deleted placeholders | Refactored to hide cleared messages while keeping data for audit. | ✅ FIXED |
| **9** | Sticky Date Separators overlapping | Grouped by day with container-based sticky headers. | ✅ FIXED |

## 3️⃣ High‑Impact Feature Roadmap
| Tier | Feature | Why It Matters | Status |
|------|----------|----------------|--------|
| **P0** | Technical Debt Cleanup | Essential for scalability | ✅ COMPLETE |
| **P1** | Push Notifications (FCM) | Real-time engagement | ✅ COMPLETE |
| **P2** | Global Search | Find people and info fast | ✅ COMPLETE |
| **P3** | Pinned Messages | Keep important info visible | ✅ COMPLETE |
| **P4** | Message Threads | Organize deep conversations | ✅ COMPLETE |
| **P5** | Polls & Surveys | Collaborative decision making | ✅ COMPLETE |
| **P6** | **Shared Calendar / Events** | Coordinate meetings & events | ✅ COMPLETE |
| **P7** | **Task Management** | Project & personal task tracking | **NEXT UP** |
| **P8** | **Message Recovery Workflow** | Restore cleared chats via admin | ✅ COMPLETE |
| **P9** | **Audio/Video Calls (WebRTC)** | High-bandwidth communication | 🏗️ IN PROGRESS |

## 4️⃣ Suggested Next Steps
1. **Sprint 1 – Technical Debt** (✅ **COMPLETED**)
2. **Sprint 2 – Core UX Boost** (✅ **COMPLETED**)
3. **Sprint 3 – Advanced Messaging** (✅ **COMPLETED**)
   - Implement Polls & Surveys with live results.
   - Refine Clear Chat logic with 6-month data retention (soft-delete).
   - Implement non-overlapping Sticky Date Separators in all chat views.
4. **Sprint 4 – Coordination & Productivity** (✅ **COMPLETED**)
   - **Shared Calendar**: Organization-wide and group-specific events.
   - **Global Calendar**: Integrated view of all personal and organization events.
   - **Message Recovery**: Finalized the admin approval workflow for chat restoration.
5. **Sprint 5 – Advanced Workflow & Mobility** (🚀 **CURRENT**)
   - **Task Management**: Integrated Kanban boards and personal TODOs.
   - **PWA Support**: Full installable experience with optimized offline assets.
   - **WebRTC Calling**: Implement 1-on-1 audio/video calls within DMs.

> **Bottom line:** With the chat experience now fully polished—including threads, polls, pins, and robust clearing/grouping—the platform is ready to expand into team coordination with the Shared Calendar and Task Management systems.

---
*Generated on 2026‑05‑14*