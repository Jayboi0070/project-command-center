# Database

PostgreSQL on Neon. Source of truth: `database/schema.sql` (= `001_init.sql` + `002_single_owner.sql`). Run migrations in order in the Neon SQL Editor and record them in `schema_migrations`.

| Table | Purpose |
|---|---|
| users | the single owner (bcrypt hash, lockout counters) |
| app_settings | time zone (default Africa/Lagos), theme, notifications, daily targets |
| projects, project_milestones | Project Vault |
| tasks | to-dos, optionally linked to a project |
| daily_schedules | schedule blocks with planned and actual minutes (feeds scorecard) |
| courses, assignments, exams | University |
| research_records | Research workspace |
| business_activities, financial_records | Business; revenue types `revenue_received`, `revenue_projected`, `expense` are kept separate |
| monthly_goals | goals per month |
| productivity_logs | reserved; the scorecard is currently computed live from daily_schedules |
| backup_history | when exports/restores happened (counts + checksum) |
| activity_log | audit trail written in the same statement as each change |

Design rules: UUID primary keys; every private table has `user_id` with `ON DELETE CASCADE`; CHECK constraints for statuses/ranges; `client_id UNIQUE` makes offline replays idempotent; timestamps `timestamptz`; indexes on `(user_id, ...)` access paths.

## Scorecard formula
Each of six areas (reading, research, development, business, exercise, review) scores `min(1, actual_hours / target_hours)`. Daily score = average x 100. Overtime in one area cannot raise another, so consistency across areas is rewarded rather than long hours. Weekly consistency = share of the last 7 days scoring 60 or more. Targets are editable in Settings.
