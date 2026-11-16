# Testing

## Automated, already passing in development
- `cd backend && npm test`: input validation, scoring maths, and backup validation (tamper detection, forced owner, bad data rejected).
- Browser test against a **mock** API (Chromium): login failure/success, create, edit, delete, duplicate protection, all pages load, offline queue and sync, no horizontal scroll on a 390px phone.

## NOT yet verified (needs your real Neon + Vercel)
These were written but never run against a live database or server, because the development sandbox had no Postgres or network:
- `schema.sql` executing on Neon; the login/bcrypt/JWT flow; every SQL query (dashboard, reports, restore); CORS; Vercel routing.
- Real cross-device access and mobile Safari/Chrome behaviour.
Run `backend/tests/live-smoke.js` (see DEPLOYMENT.md H) first. If anything fails, send me the output and I will fix it.

## Manual checklist
| Area | Check | Pass |
|---|---|---|
| Auth | Wrong password rejected; correct works; wrong 5x locks 15 min | |
| Auth | Reloading after 12h asks to sign in again | |
| DB | live-smoke.js all PASS | |
| CRUD | Create, edit, delete each section (projects, tasks, schedule, courses, assignments, exams, research, business, finance, goals) | |
| Persistence | Refresh browser; record still there | |
| Cross-device | Create on laptop, sign in on phone, see it | |
| Authorization | `GET /api/records/projects` without token returns 401 | |
| Backup | Download JSON; open it; contains your data | |
| Restore | Upload the file: preview shows "already present"; restoring changes nothing; delete one project in the app, restore, it returns | |
| Offline | Airplane mode, add item: queued message; reconnect: appears once | |
| Mobile | Every page usable at phone width; bottom navigation scrolls | |
| Errors | Stop the API (or wrong API_BASE): pages show a clear error and Retry | |
