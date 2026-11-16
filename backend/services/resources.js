// Whitelist of tables/columns the API may touch, plus validation. No dependencies so it is unit-testable.
const PRIORITY = ['low', 'medium', 'high', 'critical'];
const s = (max, req = false) => ({ t: 'str', max, req });
const e = (vals, req = false) => ({ t: 'enum', vals, req });
const i = (min, max, req = false) => ({ t: 'int', min, max, req });
const d = (req = false) => ({ t: 'date', req });
const tm = () => ({ t: 'time' });
const b = () => ({ t: 'bool' });
const n = (req = false, min = -1e12) => ({ t: 'num', req, min });
const ts = (req = false) => ({ t: 'ts', req });
const ref = (table, req = false) => ({ t: 'ref', table, req });
const url = () => ({ t: 'url' });

export const RESOURCES = {
  projects: { table: 'projects', order: 'updated_at DESC', filters: ['status', 'category', 'archived'], cols: {
    name: s(200, true), description: s(5000),
    category: e(['AI Development', 'Software Development', 'Health Technology', 'Research', 'Business'], true),
    priority: e(PRIORITY), status: e(['idea', 'planning', 'building', 'testing', 'deployed', 'completed', 'paused']),
    start_date: d(), deadline: d(), progress: i(0, 100), next_milestone: s(500), notes: s(20000),
    github_url: url(), live_url: url(), archived: b() } },
  project_milestones: { table: 'project_milestones', order: 'due_date NULLS LAST', filters: ['project_id', 'done'], completion: 'done', cols: {
    project_id: ref('projects', true), title: s(300, true), due_date: d(), done: b() } },
  tasks: { table: 'tasks', order: 'done, due_date NULLS LAST', filters: ['done', 'project_id'], completion: 'done', cols: {
    project_id: ref('projects'), title: s(300, true), notes: s(5000), priority: e(PRIORITY), due_date: d(), done: b() } },
  daily_schedules: { table: 'daily_schedules', order: 'day, start_time NULLS LAST', dateCol: 'day', filters: ['day', 'kind', 'completed'], cols: {
    day: d(true), activity: s(300, true),
    kind: e(['reading', 'research', 'development', 'business', 'exercise', 'review', 'meal', 'rest', 'sleep', 'personal', 'other'], true),
    start_time: tm(), end_time: tm(), planned_minutes: i(0, 1440), actual_minutes: i(0, 1440), completed: b(),
    rescheduled_from: d(), notes: s(2000) } },
  courses: { table: 'courses', order: 'code', filters: ['semester'], cols: {
    code: s(30, true), title: s(200, true), semester: s(50), credit_units: i(0, 30), reading_plan: s(5000),
    notes: s(20000), revision_progress: i(0, 100) } },
  assignments: { table: 'assignments', order: 'due_date NULLS LAST', filters: ['course_id', 'status'], cols: {
    course_id: ref('courses', true), title: s(300, true), due_date: d(),
    status: e(['pending', 'in_progress', 'submitted', 'graded']), score: n(false, 0), notes: s(5000) } },
  exams: { table: 'exams', order: 'exam_date', filters: ['course_id'], cols: {
    course_id: ref('courses', true), exam_date: ts(true), venue: s(200), revision_plan: s(10000), notes: s(5000) } },
  research_records: { table: 'research_records', order: 'updated_at DESC', filters: ['category', 'status'], cols: {
    topic: s(300, true), category: e(['Public Health', 'Artificial Intelligence', 'Software Engineering', 'Business', 'Innovation'], true),
    description: s(10000), sources: s(20000), key_findings: s(20000), notes: s(20000), date_started: d(),
    status: e(['idea', 'active', 'writing', 'review', 'completed', 'paused']), next_action: s(1000) } },
  business_activities: { table: 'business_activities', order: 'follow_up_date NULLS LAST', filters: ['kind', 'status'], cols: {
    kind: e(['client', 'opportunity', 'outreach', 'activity'], true), title: s(300, true), contact: s(300),
    status: s(100), follow_up_date: d(), notes: s(10000) } },
  financial_records: { table: 'financial_records', order: 'entry_date DESC', dateCol: 'entry_date', filters: ['type'], cols: {
    entry_date: d(true), type: e(['revenue_received', 'revenue_projected', 'expense'], true),
    amount: n(true, 0), currency: s(8), description: s(500), notes: s(5000) } },
  monthly_goals: { table: 'monthly_goals', order: 'month DESC', filters: ['month'], cols: {
    month: d(true), title: s(300, true), target_value: n(), current_value: n(), achieved: b() } },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v) => typeof v === 'string' && UUID.test(v);

function check(name, spec, v) {
  if (v === null || v === '') return spec.req ? `${name} is required` : null;
  switch (spec.t) {
    case 'str': return typeof v === 'string' && v.length <= spec.max ? null : `${name} must be text up to ${spec.max} characters`;
    case 'enum': return spec.vals.includes(v) ? null : `${name} must be one of: ${spec.vals.join(', ')}`;
    case 'int': return Number.isInteger(v) && v >= spec.min && v <= spec.max ? null : `${name} must be an integer ${spec.min}-${spec.max}`;
    case 'num': return typeof v === 'number' && Number.isFinite(v) && v >= spec.min && v < 1e12 ? null : `${name} must be a number`;
    case 'bool': return typeof v === 'boolean' ? null : `${name} must be true or false`;
    case 'date': return /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) ? null : `${name} must be YYYY-MM-DD`;
    case 'time': return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(v) ? null : `${name} must be HH:MM`;
    case 'ts': return typeof v === 'string' && !isNaN(Date.parse(v)) ? null : `${name} must be an ISO date-time`;
    case 'ref': return isUuid(v) ? null : `${name} must be an id`;
    case 'url': return typeof v === 'string' && v.length <= 500 && /^https?:\/\//i.test(v) ? null : `${name} must be an http(s) URL`;
  }
  return `${name} invalid`;
}

// Returns { values, errors }. Unknown fields are rejected, never silently stored.
export function validate(res, body, partial) {
  const errors = [], values = {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { values, errors: ['Body must be a JSON object'] };
  for (const k of Object.keys(body)) if (k !== 'client_id' && !(k in res.cols)) errors.push(`Unknown field: ${k}`);
  for (const [name, spec] of Object.entries(res.cols)) {
    if (!(name in body)) { if (!partial && spec.req) errors.push(`${name} is required`); continue; }
    const err = check(name, spec, body[name]);
    if (err) errors.push(err); else values[name] = body[name] === '' ? null : body[name];
  }
  if ('client_id' in body && !partial) { if (isUuid(body.client_id)) values.client_id = body.client_id; else errors.push('client_id must be a UUID'); }
  if (!Object.keys(values).length && !errors.length) errors.push('No fields to save');
  return { values, errors };
}
