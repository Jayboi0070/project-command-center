import { route } from '../../../middleware/http.js';
import { list, create } from '../../../services/crud.js';
export default route({ methods: ['GET', 'POST'] }, async (req, userId) => {
  const name = req.query.resource;
  if (req.method === 'GET') return { body: { rows: await list(userId, name, req.query) } };
  const { row, duplicate } = await create(userId, name, req.body);
  return { status: duplicate ? 200 : 201, body: { row, duplicate } };
});
