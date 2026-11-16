import { q, qj } from './db.js';
import { RESOURCES, validate, isUuid } from './resources.js';

export class HttpError extends Error { constructor(status, message, extra) { super(message); this.status = status; this.extra = extra; } }

export function resourceOr404(name) {
  const r = Object.hasOwn(RESOURCES, name) ? RESOURCES[name] : null;
  if (!r) throw new HttpError(404, 'Unknown resource');
  return r;
}

// Every referenced parent row (project_id, course_id) must belong to the same user.
async function assertRefs(res, values, userId) {
  for (const [k, v] of Object.entries(values)) {
    const spec = res.cols[k];
    if (spec?.t === 'ref' && v) {
      const ok = await q(`SELECT 1 FROM ${spec.table} WHERE id=$1 AND user_id=$2`, [v, userId]);
      if (!ok.length) throw new HttpError(400, `${k} does not exist`);
    }
  }
}
function derive(res, values) {
  if (res.completion && res.completion in values) values.completed_at = values[res.completion] ? new Date().toISOString() : null;
}
const logCte = (entity, action, userIdx) =>
  `l AS (INSERT INTO activity_log(user_id, entity, entity_id, action) SELECT $${userIdx}, '${entity}', id, '${action}' FROM r)`;

export async function list(userId, name, query) {
  const res = resourceOr404(name);
  const where = ['user_id=$1'], params = [userId];
  for (const f of res.filters) if (query[f] !== undefined) { params.push(query[f]); where.push(`${f}=$${params.length}`); }
  if (res.dateCol) for (const [k, op] of [['from', '>='], ['to', '<=']]) if (query[k] !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(query[k])) throw new HttpError(400, `${k} must be YYYY-MM-DD`);
    params.push(query[k]); where.push(`${res.dateCol}${op}$${params.length}`);
  }
  const limit = Math.min(parseInt(query.limit, 10) || 500, 1000);
  return qj(`SELECT to_jsonb(t) AS j FROM ${res.table} t WHERE ${where.join(' AND ')} ORDER BY ${res.order} LIMIT ${limit}`, params);
}

export async function create(userId, name, body) {
  const res = resourceOr404(name);
  const { values, errors } = validate(res, body, false);
  if (errors.length) throw new HttpError(400, 'Validation failed', errors);
  await assertRefs(res, values, userId);
  derive(res, values);
  const cols = ['user_id', ...Object.keys(values)];
  const params = [userId, ...Object.values(values)];
  const ph = cols.map((_, k) => `$${k + 1}`).join(',');
  const sql = `WITH r AS (INSERT INTO ${res.table}(${cols.join(',')}) VALUES (${ph}) ON CONFLICT (client_id) DO NOTHING RETURNING *), ${logCte(name, 'create', 1)} SELECT to_jsonb(r) AS j FROM r`;
  const rows = await qj(sql, params);
  if (rows.length) return { row: rows[0], duplicate: false };
  // Replayed offline submission: return the row that was already committed.
  const existing = await qj(`SELECT to_jsonb(t) AS j FROM ${res.table} t WHERE client_id=$1 AND user_id=$2`, [values.client_id, userId]);
  if (!existing.length) throw new HttpError(409, 'Conflict');
  return { row: existing[0], duplicate: true };
}

export async function update(userId, name, id, body) {
  const res = resourceOr404(name);
  if (!isUuid(id)) throw new HttpError(400, 'Invalid id');
  const { values, errors } = validate(res, body, true);
  if (errors.length) throw new HttpError(400, 'Validation failed', errors);
  await assertRefs(res, values, userId);
  derive(res, values);
  const keys = Object.keys(values);
  const sets = keys.map((k, n) => `${k}=$${n + 3}`).join(',');
  const sql = `WITH r AS (UPDATE ${res.table} SET ${sets}, updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING *), ${logCte(name, 'update', 2)} SELECT to_jsonb(r) AS j FROM r`;
  const rows = await qj(sql, [id, userId, ...keys.map((k) => values[k])]);
  if (!rows.length) throw new HttpError(404, 'Not found');
  return rows[0];
}

export async function remove(userId, name, id) {
  const res = resourceOr404(name);
  if (!isUuid(id)) throw new HttpError(400, 'Invalid id');
  const sql = `WITH r AS (DELETE FROM ${res.table} WHERE id=$1 AND user_id=$2 RETURNING id), ${logCte(name, 'delete', 2)} SELECT id FROM r`;
  const rows = await q(sql, [id, userId]);
  if (!rows.length) throw new HttpError(404, 'Not found');
}
