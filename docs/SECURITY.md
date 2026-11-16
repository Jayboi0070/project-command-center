# Security: what is implemented, and what is not

## Implemented (in code)
- Single owner: no registration endpoint; the account is created by a local script; a database unique index prevents a second user.
- Passwords hashed with bcrypt (cost 12). Constant-time-ish login (dummy hash for unknown email). 5 failures locks the account 15 minutes.
- Session = signed JWT (HS256, 12 h, issuer-checked), sent as `Authorization: Bearer`.
- Every API endpoint except login requires a valid token, checked server-side.
- Authorization: all queries filter by the authenticated `user_id`; `user_id`/`id` can never be set from request data; parent links (project, course) are verified to belong to you.
- Input validation by whitelist: unknown fields rejected, enums/ranges/dates/URLs checked; URLs must be http(s).
- SQL injection: values are always parameters; table and column names come only from a fixed server-side whitelist.
- CORS: only origins in `ALLOWED_ORIGIN`.
- Secrets only in environment variables; `.env` git-ignored; `.env.example` has placeholders only.
- Frontend: all dynamic text is HTML-escaped; strict Content-Security-Policy (scripts and styles only from the site itself, no inline code); CSV export neutralises spreadsheet formulas.
- Errors return generic messages; stack traces are logged server-side only.
- Restore: checksum-verified, schema-validated, merge-only, single transaction.

## Known limits (honest)
- **Token in browser storage.** The login token is stored in `localStorage` (a GitHub Pages site and a Vercel API are different sites, so HttpOnly cookies would be blocked by browsers). A cross-site-scripting bug would expose it. Mitigations: strict CSP, escaping, 12 h expiry. Using one custom domain for both would allow HttpOnly cookies later.
- **No general rate limiting.** Only the login lockout exists. In-memory counters do not work on serverless. Add Vercel's firewall/rate-limit rules if you want it.
- **Lockout can be abused** to keep you out for 15 minutes by someone guessing your email. Acceptable for a personal app; use a long passphrase.
- **No password reset email.** If you forget the password, re-run a small SQL update (see BACKUP_AND_RECOVERY.md, "Forgotten password"). Store the password in a password manager.
- **Clickjacking header** cannot be set on GitHub Pages (meta tags cannot do it).
- **No passkeys/biometrics, no 2FA yet.**
- Data is protected in transit (HTTPS) and by Neon's at-rest encryption, but is not end-to-end encrypted: Neon/Vercel operators could technically read it.
- Dependencies (`bcryptjs`, `jose`, `@neondatabase/serverless`) should be updated periodically (`npm audit`).
- Notification preference is stored but reminders are not sent.
