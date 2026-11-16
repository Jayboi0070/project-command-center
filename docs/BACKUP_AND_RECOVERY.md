# Backup and Recovery

Rule: **three copies, two places.** A backup on the same laptop or phone is not protection against losing that device, and a database cannot protect itself from your own mistakes.

## Layer 1: JSON backup (Settings, Download full JSON backup)
- Contains all your records plus a checksum. Do it weekly, and before any migration or big clean-up.
- Store copies **outside this device**: e.g. a password-protected cloud drive folder, or email it to yourself. The file contains personal data, so do not leave it in a public place.
- Restore (Settings, choose file): the file is checked first (format, checksum, every record). A preview shows what is already present. Restoring only **adds missing records**; it never overwrites or deletes existing ones, and runs as one transaction (all or nothing).
- Limits: restore re-adds records with their original IDs, so a record you edited after the backup is not reverted (by design). To roll back to an earlier state use Layer 3. Settings and the account are not part of the JSON file.

## Layer 2: Scheduled encrypted off-database copy (GitHub Actions)
`.github/workflows/backup.yml` runs weekly (Sundays 03:00 UTC), dumps the whole database with `pg_dump`, encrypts it with AES-256, and keeps it 90 days as a workflow artifact.
Setup: repo **Settings, Secrets and variables, Actions**, add `DATABASE_URL` and `BACKUP_PASSPHRASE` (long, stored in your password manager; **if you lose it the backups are unreadable**). Run it once manually (Actions, Run workflow) and confirm green.
Download a file monthly to a second location. To restore: `gpg -d pcc-DATE.dump.gpg > pcc.dump`, create an empty Neon branch or database, then `pg_restore --no-owner -d "NEW_CONNECTION_STRING" pcc.dump`. Test this once now, not during an emergency.
This workflow was written but not run in development; the first manual run is its test.

## Layer 3: Neon's own recovery
Neon keeps a history of changes and lets you restore a branch to an earlier point in time, or create a branch from a past moment. How far back you can go depends on your plan (the free plan has a short window, paid plans longer), and plans change, so check the current limits on neon.tech/pricing and in the project's **Settings, Storage / Restore window**.
To recover: Neon console, **Branches**, choose your branch, **Restore** (pick a time before the mistake). Safer variant: create a *new* branch from that time, inspect the data there, then point `DATABASE_URL` at it or copy data over. Do this the moment you notice a problem, because the window keeps moving.
Before risky operations (migrations), create a manual branch named `pre-migration-DATE`.

## Disaster scenarios
| Problem | Fix |
|---|---|
| Deleted a record by mistake | Restore a recent JSON backup (adds it back) |
| Wrote bad data over many records | Neon point-in-time restore / branch |
| Database lost or Neon account problem | Newest encrypted dump (Layer 2), or JSON backup into a fresh Neon project: run `schema.sql`, `create-owner`, then restore JSON |
| Lost laptop/phone | Nothing is stored only locally; sign in elsewhere |
| Forgotten password | In Neon SQL Editor: generate a bcrypt hash locally with `node -e "console.log(require('bcryptjs').hashSync('NEW-LONG-PASSWORD',12))"` (run in `backend/` after `npm install`), then `UPDATE users SET password_hash='<hash>', failed_logins=0, locked_until=NULL;` |

## Rebuilding on a new Neon project
1. Create project, run `database/schema.sql`. 2. `npm run create-owner`. 3. Update `DATABASE_URL` in Vercel, redeploy. 4. Sign in, Settings, restore your JSON backup.
