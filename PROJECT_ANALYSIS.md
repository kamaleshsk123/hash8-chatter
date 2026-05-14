# Project Analysis & Improvement Plan

**High‑level project health check**

| Area | Current state | Quick win | Medium‑term focus |
|------|---------------|-----------|-------------------|
| **Type safety** | `tsconfig` disables `strict`, `noImplicitAny`, `strictNullChecks`. | Turn on `strict: true` (and clean up any uncovered errors). | Keep the strict‑mode baseline as new code is added. |
| **Lint / format** | ESLint config is present but `no‑unused‑vars` is turned off and there is no CI enforcement. | Add a pre‑commit hook (`husky` + `lint‑staged`) to run `eslint . && tsc --noEmit`. | Enforce linting in a GitHub Actions workflow. |
| **Testing** | Only ~5 unit tests (mostly UI components). No coverage for admin services, hooks, or security rules. | Write unit tests for `usePermissions`, `setUserRole`, and the admin fetch functions; add a simple integration test for `AdminControl` with mocked Firestore. | Introduce end‑to‑end tests (Cypress/Playwright) that exercise the admin UI, recovery flow, and permission gating. |
| **CI/CD** | No `.github` folder, no automated lint/type‑check/tests. | Add a basic workflow that runs `npm ci`, `npm run lint`, `npm run build`, and `npm test`. |
| **Security** | Firestore rule `allow read, write: if request.auth != null;` gives any authenticated user full read/write rights. Admin utilities expose a global `window.makeCurrentUserAdmin`. | **Hardening 1** – Replace the permissive rule with role‑based checks (e.g., only admins can write to `users/{uid}` role field, only moderators can delete messages, etc.). <br>**Hardening 2** – Move role‑change logic into a Cloud Function that validates the caller’s `customClaims` instead of a global client‑side helper. |
| **Performance / scalability** | `AdminControl` calls `getAllMessages` → per‑message Firestore reads to resolve group/user names. This can become expensive when the admin page lists many rows. | Refactor `getAllMessages` to embed the required `context` (group name, DM participants) directly in the message document via a Cloud Function or Firestore trigger. |
| **Code organization** | Some utilities (e.g., `setUserRole`) are attached to the `window` object; Admin‑specific data fetching lives in the page component. | Extract admin‑related logic into a custom hook (`useAdminData`) that returns `messages`, `recoveryRequests`, loading state, and refresh handler. |
| **UI/UX** | Admin UI works but there are a few UX gaps: loading placeholders are duplicated, error handling is generic, and the “Access Denied” page hard‑codes a specific user name/email. | Replace the name/email check with a role‑based check (`user.role === 'super_admin'`). Add skeleton loaders for tables, and surface API errors via toast. |
| **Documentation** | `README` covers dev setup; no docs for admin workflow or security model. | Add a `docs/admin.md` that explains: required Firestore rules, how to grant admin rights (via Cloud Function), and UI overview. |

---

## Concrete next‑step plan (prioritized)

| Phase | Goal | Actions (owner) | Estimated effort |
|-------|------|----------------|-----------------|
| **Sprint 1 – Foundations** | Harden security and improve developer experience. | 1. Refactor `firestore.rules` to enforce role‑based reads/writes (admin, moderator, member). <br>2. Replace `window.makeCurrentUserAdmin` with a Firebase Callable Cloud Function `setUserRole(uid, role)`. <br>3. Enable TypeScript `strict` mode and fix compile errors. <br>4. Add pre‑commit lint‑hook (`husky`) and a minimal CI workflow (lint + type‑check). | 2–3 days |
| **Sprint 2 – Test & Performance** | Ensure reliability and scale admin pages. | 1. Write unit tests for `usePermissions`, `setUserRole`, and `admin` service functions. <br>2. Refactor `getAllMessages` to include `context` in the message document (via a small Firestore trigger or batch update script). <br>3. Add skeleton loaders and proper error‑toasts in `AdminControl`. | 4 days |
| **Sprint 3 – Feature Delivery** | Build the next high‑impact feature. | 1. Implement **Task Management** (Kanban) UI + Firestore schema (`tasks` collection). <br>2. Add CRUD hooks, drag‑and‑drop support, and integration with React Query. <br>3. Write component tests and e2e flow for task creation/assignment. | 1 week |
| **Sprint 4 – Collaboration & Ops** | Polish workflow and prepare for production. | 1. Expand CI to run the full test suite on every PR. <br>2. Add a GitHub Actions step that validates Firestore security rules (`firebase emulators:exec`). <br>3. Document admin workflows (`docs/admin.md`) and update `README` with a *Security* section. | 3 days |
| **Sprint 5‑6 – Long‑term enhancements** | Real‑time communication upgrades. | 1. Prototype **WebRTC audio/video calls** (use Firebase Realtime Database for signaling). <br>2. Implement **Push Notifications** (FCM) for chat events and admin alerts. <br>3. Optimize admin message fetching with pagination & server‑side aggregation. | 2 weeks (spread over two sprints) |

*If you prefer a different ordering (e.g., tackle Task Management before security hardening), let me know and I can adjust the plan.*

---

### Immediate actionable checklist (you can start now)
1. **Lock down Firestore rules** – replace line 5 with role checks (`request.auth.token.role == 'admin'`).
2. **Remove global admin helpers** – delete `window.makeCurrentUserAdmin` and create a Callable function (`functions/setUserRole`).
3. **Switch TS to strict** – add `"strict": true` in `tsconfig.app.json` and fix the resulting errors.
4. **Add a GitHub Actions workflow** (`.github/workflows/ci.yml`) that runs `npm ci`, `npm run lint`, `npm run build`, `npm test`.
5. **Create a reusable admin data hook** (`src/hooks/useAdminData.ts`) to centralize fetching and pagination.

Feel free to ask for sample code snippets (e.g., a Firestore rule example, a starter CI file, or the Callable function skeleton) and I’ll provide them.