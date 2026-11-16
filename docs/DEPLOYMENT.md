# Deployment Guide (beginner friendly)

You will set up three free services: **Neon** (database), **Vercel** (API), **GitHub** (code + website).
Time: about 45 minutes. Do the steps in order. Never paste passwords or the database link into the frontend folder, chats, or a public place.

You need: a GitHub account, Node.js 20+ installed on your computer (nodejs.org, choose LTS), and Git.

---
## A. Create the Neon database
1. Go to neon.tech and sign up. Create a project named `project-command-center`. Choose the region closest to you (for Nigeria, a Europe region such as Frankfurt is usually lowest latency) and the newest Postgres version.
2. Open the project, then **SQL Editor**.
3. Open `database/schema.sql` from this project, copy everything, paste into the SQL Editor, and press **Run**. It should finish without red errors. If you see an error, copy the exact message and send it to me before continuing.
4. Open **Tables**. You should see 17 tables (users, projects, tasks, ...).

## B. Get the connection string
1. In the Neon dashboard click **Connect**. Pick the **pooled** connection and copy the string. It looks like `postgresql://user:password@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require`.
2. Treat this like a password. Keep it in a password manager.

## C. Configure secrets safely
Secrets live only in (1) a local `.env` file that Git ignores and (2) Vercel's environment settings.
1. Copy `.env.example` to `.env` (same folder) and fill in:
   - `DATABASE_URL`: the string from step B.
   - `JWT_SECRET`: a long random value. Generate one by running `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
   - `OWNER_EMAIL`: the email you will sign in with.
   - `ALLOWED_ORIGIN`: `https://YOUR-GITHUB-USERNAME.github.io` (origin only: no trailing slash and no `/repo-name`). You will confirm it in step E.
2. Confirm `.env` is NOT listed by `git status` (the `.gitignore` already excludes it).

## D. Create your account and deploy the API
**Create your owner account (once, on your computer):**
```
cd backend
npm install
export DATABASE_URL='paste-here'   # Windows PowerShell: $env:DATABASE_URL='paste-here'
export OWNER_EMAIL='you@example.com'
npm run create-owner
```
Choose a strong password (12+ characters, ideally a long passphrase stored in a password manager). It refuses to run if an owner already exists. There is no public signup anywhere.

**Deploy the backend:**
1. Push the project to a GitHub repository (see E.1 for how).
2. On vercel.com sign in with GitHub, click **Add New, Project**, import the repository.
3. Set **Root Directory** to `backend`. Framework preset: **Other**.
4. Under **Environment Variables** add the four variables from step C (names exactly as in `.env.example`). For `ALLOWED_ORIGIN` use your GitHub Pages origin.
5. Deploy. Note the address, e.g. `https://project-command-center-api.vercel.app`.
6. Visit `https://YOUR-API/api/auth/me` in a browser: you should see `{"error":"Not authenticated"}`. That means the API is alive and protected.

## E. Connect GitHub Pages to the backend
1. Create a GitHub repo (name it anything). In the project folder: `git init`, `git add .`, `git commit -m "first"`, add the remote GitHub shows you, `git push -u origin main`.
2. Open `frontend/js/config.js` and set `API_BASE` to your Vercel address (no trailing slash). Commit and push. The API address is public information, not a secret.
3. On GitHub: repo **Settings, Pages, Source: GitHub Actions**. The included workflow `.github/workflows/pages.yml` publishes the `frontend` folder on every push. Wait for the green check under **Actions**.
4. Your site is at `https://YOUR-USERNAME.github.io/REPO-NAME/`. Its *origin* (what goes in `ALLOWED_ORIGIN`) is `https://YOUR-USERNAME.github.io`.
5. Note: GitHub Pages on a free account requires a public repository. That is fine because no secrets are in it, but your code is visible. Your data is not: it is behind your login.

## F. Configure CORS
CORS is controlled only by `ALLOWED_ORIGIN` in Vercel. If the site says "Could not reach the server", the usual cause is a wrong value (for example including `/REPO-NAME`, `http://` instead of `https://`, or a trailing slash). Fix it in Vercel (Settings, Environment Variables), then **Redeploy** (variable changes only apply to new deployments).

## G. Authentication
Open your site, sign in with `OWNER_EMAIL` and your password. Sessions last 12 hours. Five wrong passwords lock the account for 15 minutes. Change your password in Settings at any time.
Fingerprint/Face ID sign-in (passkeys) is **not built yet**.

## H. Test that data really persists
1. From `backend/`, run the live test (it creates and deletes one test project):
```
API_URL=https://YOUR-API.vercel.app EMAIL=you@example.com PASSWORD='your-password' node tests/live-smoke.js
```
All lines should say PASS. Send me any FAIL line.
2. In the site create a project, refresh the page: it must still be there.
3. Open the site on your phone, sign in, confirm the same project appears (cross-device check).
4. Turn on airplane mode, add a task: you should see "Offline: changes queued". Turn it off: it should sync and appear once.
Full checklist: `docs/TESTING.md`.

## I. Configure backups
Read `docs/BACKUP_AND_RECOVERY.md`. Minimum setup: (1) download a JSON backup weekly from Settings, (2) enable the encrypted weekly workflow by adding two GitHub secrets (`DATABASE_URL`, `BACKUP_PASSPHRASE`), (3) know how to use Neon's restore.

## J. Updating after deployment
- Frontend change: edit, commit, push. GitHub Actions republishes automatically.
- Backend change: commit and push; Vercel redeploys automatically.
- Database change: add a new numbered file in `database/migrations/` (for example `003_xxx.sql`), run it in the Neon SQL Editor, and record it in `schema_migrations`. **Take a backup before every migration.**
- Rotating secrets: change `JWT_SECRET` in Vercel and redeploy (this signs you out everywhere). To change the database password, reset it in Neon, update `DATABASE_URL` in Vercel, redeploy.
- Moving host later: the API is plain Node handlers; only Vercel's file-based routing would need adapting.

## Troubleshooting
| Symptom | Likely cause |
|---|---|
| "Could not reach the server" | `API_BASE` wrong, or `ALLOWED_ORIGIN` mismatch (see F) |
| Login always says invalid | Wrong email (must equal the one used in create-owner), or locked for 15 min |
| 500 errors | Missing/incorrect Vercel env vars; check Vercel, Logs |
| Blank page after deploy | Pages source not set to GitHub Actions |
