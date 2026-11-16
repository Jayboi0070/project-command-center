-- 001_init.sql : core schema. Every private table carries user_id with ON DELETE CASCADE.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  failed_logins int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app_settings (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  timezone text NOT NULL DEFAULT 'Africa/Lagos',
  theme text NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark','light','system')),
  notifications jsonb NOT NULL DEFAULT '{}',
  daily_targets jsonb NOT NULL DEFAULT '{"reading":1.5,"research":2,"development":3,"business":0.5,"exercise":0.5,"review":0.25}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id uuid UNIQUE,
  name text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('AI Development','Software Development','Health Technology','Research','Business')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'idea' CHECK (status IN ('idea','planning','building','testing','deployed','completed','paused')),
  start_date date, deadline date,
  progress int NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  next_milestone text, notes text, github_url text, live_url text,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON projects(user_id, status) WHERE NOT archived;

CREATE TABLE project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id uuid UNIQUE,
  title text NOT NULL, due_date date, done boolean NOT NULL DEFAULT false, completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON project_milestones(user_id, project_id);

CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id uuid UNIQUE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  title text NOT NULL, notes text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  due_date date, done boolean NOT NULL DEFAULT false, completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON tasks(user_id, done, due_date);

CREATE TABLE daily_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id uuid UNIQUE,
  day date NOT NULL,
  activity text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('reading','research','development','business','exercise','review','meal','rest','sleep','personal','other')),
  start_time time, end_time time,
  planned_minutes int CHECK (planned_minutes >= 0),
  actual_minutes int NOT NULL DEFAULT 0 CHECK (actual_minutes >= 0),
  completed boolean NOT NULL DEFAULT false,
  rescheduled_from date, notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON daily_schedules(user_id, day);

CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id uuid UNIQUE,
  code text NOT NULL, title text NOT NULL, semester text, credit_units int,
  reading_plan text, notes text, revision_progress int NOT NULL DEFAULT 0 CHECK (revision_progress BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON courses(user_id);

CREATE TABLE assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  client_id uuid UNIQUE,
  title text NOT NULL, due_date date, status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','submitted','graded')),
  score numeric(5,2), notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON assignments(user_id, due_date);

CREATE TABLE exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  client_id uuid UNIQUE,
  exam_date timestamptz NOT NULL, venue text, revision_plan text, notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON exams(user_id, exam_date);

CREATE TABLE research_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id uuid UNIQUE,
  topic text NOT NULL,
  category text NOT NULL CHECK (category IN ('Public Health','Artificial Intelligence','Software Engineering','Business','Innovation')),
  description text, sources text, key_findings text, notes text,
  date_started date, status text NOT NULL DEFAULT 'active' CHECK (status IN ('idea','active','writing','review','completed','paused')),
  next_action text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON research_records(user_id, status);

CREATE TABLE business_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id uuid UNIQUE,
  kind text NOT NULL CHECK (kind IN ('client','opportunity','outreach','activity')),
  title text NOT NULL, contact text, status text, follow_up_date date, notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON business_activities(user_id, follow_up_date);

CREATE TABLE financial_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id uuid UNIQUE,
  entry_date date NOT NULL,
  type text NOT NULL CHECK (type IN ('revenue_received','revenue_projected','expense')),
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'NGN',
  description text, notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON financial_records(user_id, entry_date);

CREATE TABLE productivity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day date NOT NULL,
  reading_min int NOT NULL DEFAULT 0, research_min int NOT NULL DEFAULT 0, development_min int NOT NULL DEFAULT 0,
  business_min int NOT NULL DEFAULT 0, exercise_min int NOT NULL DEFAULT 0, review_min int NOT NULL DEFAULT 0,
  reflection text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);

CREATE TABLE monthly_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id uuid UNIQUE,
  month date NOT NULL CHECK (extract(day from month) = 1),
  title text NOT NULL, target_value numeric, current_value numeric NOT NULL DEFAULT 0, achieved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON monthly_goals(user_id, month);

CREATE TABLE backup_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('export','restore')),
  record_counts jsonb NOT NULL, sha256 text, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE activity_log (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity text NOT NULL, entity_id uuid, action text NOT NULL, summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON activity_log(user_id, created_at DESC);

INSERT INTO schema_migrations(version) VALUES ('001_init');

-- 002: enforce single-owner at the database level. A second users row is impossible.
CREATE UNIQUE INDEX users_single_owner ON users ((true));
INSERT INTO schema_migrations(version) VALUES ('002_single_owner');
