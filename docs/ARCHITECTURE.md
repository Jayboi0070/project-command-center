# Architecture

Browser (GitHub Pages, static) --HTTPS + Bearer token--> Serverless API (Vercel, Node 20) --TLS--> Neon PostgreSQL

## Decisions
- **API host: Vercel serverless functions** (`backend/`, deploy with Root Directory = backend) using `@neondatabase/serverless`. Handlers are plain `(req,res)` functions, so another host needs only a thin adapter. Python cannot run on GitHub Pages, so the backend is separate.
- **Single owner, no registration.** The account is created once by `npm run create-owner`; a unique index makes a second user impossible. No Google sign-in.
- **Auth:** email + bcrypt password, 12 h JWT in an Authorization header (cross-site cookies are blocked by browsers). Trade-offs in SECURITY.md.
- **Authorization:** every query is filtered by the authenticated user; ids and user_id cannot be supplied by the client.
- **Generic record API:** `/api/records/:resource[/:id]` driven by a server-side whitelist (`services/resources.js`) for validation and allowed columns. Plus `/api/dashboard`, `/api/reports`, `/api/settings`, `/api/backup/*`, `/api/auth/*`.
- **Saving:** UI shows "Saved successfully" only after the API confirms the committed row. Network failures retry 3 times, then go to a local offline queue (localStorage) that replays in order on reconnect. Creates carry a `client_id` (UNIQUE), so replays never duplicate. Rejected queued changes are kept for review, never silently dropped.
- **Dates/numbers:** rows are fetched with `to_jsonb(...)` so dates and numerics arrive exact, without timezone shifts.
- **Frontend:** no framework or build step (vanilla ES modules), strict CSP, responsive (sidebar on desktop, bottom nav on phone).

## Offline limits
Offline mode queues *writes* only. Lists are not cached, so while offline you cannot browse data, and a record created offline cannot be edited until it has synced.

## Build status
Stages 1-10 written. Automated tests and a mock-API browser test pass; the live-stack items are listed in TESTING.md.
