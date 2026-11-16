// Pure backup validation (no DB access) so it can be unit tested. Restore is merge-only: it never overwrites or deletes.
import { createHash } from 'node:crypto';
import { RESOURCES, validate, isUuid } from './resources.js';

export const RESTORE_ORDER = ['projects', 'courses', 'project_milestones', 'tasks', 'daily_schedules', 'assignments', 'exams', 'research_records', 'business_activities', 'financial_records', 'monthly_goals'];
export const MAX_ROWS = 20000;
export const checksum = (tables) => createHash('sha256').update(JSON.stringify(tables)).digest('hex');
const sysCols = (res) => ['id', 'user_id', 'created_at', 'updated_at', 'client_id', ...(res.completion ? ['completed_at'] : [])];

export function validateBackup(b, userId) {
  const errors = [], clean = {};
  if (!b || b.app !== 'project-command-center' || b.version !== 1 || typeof b.tables !== 'object' || b.tables === null) return { errors: ['Not a Project Command Center v1 backup file'], clean };
  if (b.checksum !== checksum(b.tables)) return { errors: ['Checksum mismatch: the file is damaged or was edited'], clean };
  let total = 0;
  for (const name of Object.keys(b.tables)) if (!RESTORE_ORDER.includes(name)) errors.push(`Unexpected table: ${name}`);
  for (const name of RESTORE_ORDER) {
    const rows = b.tables[name] ?? []; const res = RESOURCES[name];
    if (!Array.isArray(rows)) { errors.push(`${name} must be a list`); continue; }
    total += rows.length;
    clean[name] = [];
    rows.forEach((row, i) => {
      const e = [];
      if (!isUuid(row?.id)) e.push('id missing or invalid');
      for (const k of Object.keys(res.cols)) if (!(k in row)) e.push(`missing column ${k}`);
      const body = Object.fromEntries(Object.entries(row ?? {}).filter(([k]) => !sysCols(res).includes(k)));
      const v = validate(res, body, false);
      if (v.errors.length) e.push(...v.errors);
      if (row.client_id != null && !isUuid(row.client_id)) e.push('client_id invalid');
      if (e.length) { if (errors.length < 20) errors.push(`${name}[${i}]: ${e.join('; ')}`); return; }
      const out = { ...v.values, id: row.id, user_id: userId, client_id: row.client_id ?? null,
        created_at: row.created_at ?? new Date().toISOString(), updated_at: row.updated_at ?? new Date().toISOString() };
      if (res.completion) out.completed_at = row.completed_at ?? null;
      clean[name].push(out);
    });
  }
  if (total > MAX_ROWS) errors.push(`Too many rows (${total}); limit ${MAX_ROWS}`);
  return { errors, clean };
}
