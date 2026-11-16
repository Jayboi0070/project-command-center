import { neon } from '@neondatabase/serverless';
import { config } from '../config/env.js';
let _sql;
// Parameterised queries only: values are never concatenated into SQL text.
export function q(text, params = []) {
  _sql ??= neon(config().databaseUrl);
  return _sql.query(text, params);
}
// Row-returning helpers use to_jsonb(...) AS j so dates/numerics arrive as exact JSON (no timezone-shifted Date objects).
export async function qj(text, params = []) { return (await q(text, params)).map((r) => r.j); }
