import { route } from '../../middleware/http.js';
import { restore } from '../../services/backup.js';
export default route({ methods: ['POST'] }, async (req, uid) => ({ body: await restore(uid, req.body?.backup, req.body?.dryRun === true) }));
