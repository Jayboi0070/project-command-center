import { route } from '../middleware/http.js';
import { HttpError } from '../services/crud.js';
import { q } from '../services/db.js';
import { KINDS } from '../services/stats.js';

export default route({ methods: ['GET', 'PATCH'] }, async (req, uid) => {
  if (req.method === 'PATCH') {
    const b = req.body || {}, sets = [], params = [uid];
    const add = (col, v, cast = '') => { params.push(v); sets.push(`${col}=$${params.length}${cast}`); };
    for (const k of Object.keys(b)) if (!['timezone', 'theme', 'notifications', 'daily_targets'].includes(k)) throw new HttpError(400, `Unknown field: ${k}`);
    if ('timezone' in b) { if (!Intl.supportedValuesOf('timeZone').includes(b.timezone) && b.timezone !== 'Africa/Lagos' && b.timezone !== 'UTC') throw new HttpError(400, 'Unknown time zone'); add('timezone', b.timezone); }
    if ('theme' in b) { if (!['dark', 'light', 'system'].includes(b.theme)) throw new HttpError(400, 'Invalid theme'); add('theme', b.theme); }
    if ('notifications' in b) {
      const n = b.notifications; if (!n || typeof n !== 'object' || Object.values(n).some((v) => typeof v !== 'boolean') || Object.keys(n).length > 20) throw new HttpError(400, 'Invalid notifications');
      add('notifications', JSON.stringify(n), '::jsonb');
    }
    if ('daily_targets' in b) {
      const t = b.daily_targets; if (!t || typeof t !== 'object' || Object.entries(t).some(([k, v]) => !KINDS.includes(k) || typeof v !== 'number' || v < 0 || v > 24)) throw new HttpError(400, 'Invalid daily targets (hours 0-24)');
      add('daily_targets', JSON.stringify(t), '::jsonb');
    }
    if (!sets.length) throw new HttpError(400, 'Nothing to update');
    await q(`UPDATE app_settings SET ${sets.join(',')}, updated_at=now() WHERE user_id=$1`, params);
  }
  const [row] = await q(`SELECT timezone, theme, notifications, daily_targets FROM app_settings WHERE user_id=$1`, [uid]);
  return { body: row };
});
