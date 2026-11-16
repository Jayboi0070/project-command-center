import { route } from '../../middleware/http.js';
import { exportAll } from '../../services/backup.js';
export default route({ methods: ['GET'] }, async (_req, uid) => ({ body: await exportAll(uid) }));
