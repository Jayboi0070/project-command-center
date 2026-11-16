import { route } from '../../middleware/http.js';
import { q } from '../../services/db.js';
export default route({ methods: ['GET'] }, async (_req, userId) => {
  const [u] = await q('SELECT u.id, u.email, u.full_name, s.timezone, s.theme FROM users u LEFT JOIN app_settings s ON s.user_id=u.id WHERE u.id=$1', [userId]);
  return { body: u };
});
