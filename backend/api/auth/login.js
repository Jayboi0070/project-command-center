import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { route } from '../../middleware/http.js';
import { HttpError } from '../../services/crud.js';
import { config } from '../../config/env.js';
import { q } from '../../services/db.js';

const MAX_FAILS = 5, LOCK_MIN = 15;
const DUMMY = bcrypt.hashSync('not-a-real-password', 12); // equalises timing when the email is unknown

export default route({ methods: ['POST'], auth: false }, async (req) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || password.length > 200) throw new HttpError(400, 'Email and password required');
  const [u] = await q('SELECT id, password_hash, full_name, failed_logins, locked_until FROM users WHERE email=$1', [email.trim().toLowerCase()]);
  const hash = u?.password_hash ?? DUMMY;
  if (u?.locked_until && new Date(u.locked_until) > new Date()) throw new HttpError(429, 'Too many attempts. Try again later.');
  const ok = await bcrypt.compare(password, hash);
  if (!u || !ok) {
    if (u) await q(`UPDATE users SET failed_logins=failed_logins+1, locked_until=CASE WHEN failed_logins+1>=$2 THEN now()+($3||' minutes')::interval END WHERE id=$1`, [u.id, MAX_FAILS, String(LOCK_MIN)]);
    throw new HttpError(401, 'Invalid email or password');
  }
  await q('UPDATE users SET failed_logins=0, locked_until=NULL WHERE id=$1', [u.id]);
  const token = await new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(u.id).setIssuer('pcc')
    .setIssuedAt().setExpirationTime('12h').sign(new TextEncoder().encode(config().jwtSecret));
  return { body: { token, expiresInSeconds: 43200, name: u.full_name } };
});
