import { q, qj } from './db.js';
import { RESOURCES } from './resources.js';
import { RESTORE_ORDER, checksum, validateBackup } from './backup-validate.js';
import { HttpError } from './crud.js';

export async function exportAll(uid) {
  const tables = {};
  for (const name of RESTORE_ORDER) tables[name] = await qj(`SELECT to_jsonb(t) AS j FROM ${RESOURCES[name].table} t WHERE user_id=$1 ORDER BY created_at, id`, [uid]);
  const counts = Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length]));
  const sum = checksum(tables);
  await q(`INSERT INTO backup_history(user_id, kind, record_counts, sha256) VALUES ($1,'export',$2::jsonb,$3)`, [uid, JSON.stringify(counts), sum]);
  return { app: 'project-command-center', version: 1, exported_at: new Date().toISOString(), counts, checksum: sum, tables };
}

export async function restore(uid, backup, dryRun) {
  const { errors, clean } = validateBackup(backup, uid);
  if (errors.length) throw new HttpError(400, 'Backup rejected; nothing was changed', errors);
  const names = RESTORE_ORDER.filter((n) => clean[n].length);
  const existing = {};
  for (const n of names) {
    const r = await q(`SELECT id FROM ${RESOURCES[n].table} WHERE user_id=$1 AND id = ANY($2::uuid[])`, [uid, clean[n].map((x) => x.id)]);
    existing[n] = r.length;
  }
  const counts = Object.fromEntries(names.map((n) => [n, { in_file: clean[n].length, already_present: existing[n] }]));
  if (dryRun) return { dryRun: true, counts };
  if (!names.length) return { restored: {}, counts };
  // One statement = one transaction: either everything is restored or nothing is. ON CONFLICT DO NOTHING means existing records are never overwritten.
  const params = [], ctes = [], selects = [];
  names.forEach((n, k) => {
    const cols = Object.keys(clean[n][0]);
    params.push(JSON.stringify(clean[n]));
    ctes.push(`a${k} AS (INSERT INTO ${RESOURCES[n].table}(${cols.join(',')}) SELECT ${cols.join(',')} FROM jsonb_populate_recordset(NULL::${RESOURCES[n].table}, $${k + 1}::jsonb) ON CONFLICT DO NOTHING RETURNING 1)`);
    selects.push(`SELECT '${n}' AS t, (SELECT COUNT(*)::int FROM a${k}) AS n`);
  });
  const rows = await q(`WITH ${ctes.join(',')} ${selects.join(' UNION ALL ')}`, params);
  const restored = Object.fromEntries(rows.map((r) => [r.t, r.n]));
  await q(`INSERT INTO backup_history(user_id, kind, record_counts, sha256) VALUES ($1,'restore',$2::jsonb,$3)`, [uid, JSON.stringify(restored), backup.checksum]);
  return { restored, counts };
}
