import bcrypt from 'bcryptjs';
import { route } from '../../middleware/http.js';
import { HttpError } from '../../services/crud.js';
import { q } from '../../services/db.js';
export default route({ methods: ['POST'] }, async (req, userId) => {
  const { current, next } = req.body || {};
  if (typeof current !== 'string' || typeof next !== 'string' || next.length < 12 || next.length > 200) throw new HttpError(400, 'New password must be 12-200 characters');
  const [u] = await q('SELECT password_hash FROM users WHERE id=$1', [userId]);
  if (!u || !(await bcrypt.compare(current, u.password_hash))) throw new HttpError(401, 'Current password is incorrect');
  await q('UPDATE users SET password_hash=$2, updated_at=now() WHERE id=$1', [userId, await bcrypt.hash(next, 12)]);
  return { body: { ok: true } };
});
