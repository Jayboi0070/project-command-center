import { route } from '../../middleware/http.js';
import { qj } from '../../services/db.js';
export default route({ methods: ['GET'] }, async (_req, uid) => ({ body: { rows: await qj(`SELECT to_jsonb(b) AS j FROM (SELECT id, kind, record_counts, sha256, created_at FROM backup_history WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30) b`, [uid]) } }));
