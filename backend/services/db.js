import { neon } from '@neondatabase/serverless';
import { config } from '../config/env.js';
let _sql;
// Parameterised queries only: values are never concatenated into SQL text.
export function q(text, params = []) {
  _sql ??= neon(config().databaseUrl);
  // Works with both old and new versions of the Neon driver.
  return typeof _sql.query === 'function' ? _sql.query(text, params) : _sql(text, params);
}
// Row-returning helpers use to_jsonb(...) AS j so dates/numerics arrive as exact JSON.
export async function qj(text, params = []) { return (await q(text, params)).map((r) => r.j); }
