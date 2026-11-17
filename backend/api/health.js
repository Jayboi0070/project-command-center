import { q } from '../services/db.js';

export default async function handler(req, res) {
  const e = process.env;
  const out = {
    DATABASE_URL_set: !!e.DATABASE_URL,
    JWT_SECRET_32plus_chars: (e.JWT_SECRET || '').length >= 32,
    OWNER_EMAIL_set: !!e.OWNER_EMAIL,
    ALLOWED_ORIGIN: e.ALLOWED_ORIGIN || null,
  };
  try {
    const r = await q('SELECT count(*)::int AS n FROM users');
    out.database = 'ok';
    out.owner_account_exists = r[0].n > 0;
  } catch (err) {
    out.database = 'FAILED: ' + String(err.message).slice(0, 120);
  }
  res.status(200).json(out);
}
