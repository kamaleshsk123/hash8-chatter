# Sprint 1 – Foundations

**Goal:** Harden security and improve developer experience.

## Actions
1. Refactor `firestore.rules` to enforce role‑based reads/writes (admin, moderator, member).
2. Replace `window.makeCurrentUserAdmin` with a Firebase Callable Cloud Function `setUserRole(uid, role)`.
3. Enable TypeScript `strict` mode and fix compile errors.
4. Add pre‑commit lint‑hook (`husky`) and a minimal CI workflow (lint + type‑check).

**Estimated effort:** 2–3 days
