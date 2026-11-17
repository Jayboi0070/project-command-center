import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const e = process.env;
  const out = {
    DATABASE_URL_set: !!e.DATABASE_URL,
    JWT_SECRET_set: !!e.JWT_SECRET,
    JWT_SECRET_32plus_chars: (e.JWT_SECRET || '').length >= 32,
    OWNER_EMAIL_set: !!e.OWNER_EMAIL,
    ALLOWED_ORIGIN: e.ALLOWED_ORIGIN || null,
  };
  try {
    const sql = neon(e.DATABASE_URL);
    const r = await sql.query('SELECT count(*)::int AS n FROM users');
    out.database = 'ok';
    out.owner_account_exists = r[0].n > 0;
  } catch (err) {
    out.database = 'FAILED: ' + String(err.message).slice(0, 120);
  }
  res.status(200).json(out);
}
