import { route } from '../../../middleware/http.js';
import { update, remove } from '../../../services/crud.js';
export default route({ methods: ['PATCH', 'DELETE'] }, async (req, userId) => {
  const { resource, id } = req.query;
  if (req.method === 'DELETE') { await remove(userId, resource, id); return { status: 204 }; }
  return { body: { row: await update(userId, resource, id, req.body) } };
});
