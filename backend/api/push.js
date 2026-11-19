// One function for all notification actions (keeps the endpoint count low on Vercel's free plan).
//   GET  /api/push?action=key                 -> public key           (login required)
//   POST /api/push {action:'subscribe'|'unsubscribe'|'test'}        (login required)
//   GET  /api/push?action=tick&key=CRON_SECRET -> called by the scheduler
import { createHash, timingSafeEqual } from 'node:crypto';
import { route, authenticate } from '../middleware/http.js';
import { HttpError } from '../services/crud.js';
import { q } from '../services/db.js';
import { tick, sendToUser, publicKey, pushConfigured } from '../services/notify.js';

const same = (a, b) => timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
const B64 = /^[A-Za-z0-9_-]+=*$/;
function okEndpoint(u) {
  try {
    const x = new URL(u); const h = x.hostname;
    return x.protocol === 'https:' && u.length <= 800 && (h === 'fcm.googleapis.com' || h.endsWith('.push.apple.com') || h === 'push.apple.com' || h.endsWith('.push.services.mozilla.com') || h.endsWith('.notify.windows.com'));
  } catch { return false; }
}

export default route({ methods: ['GET', 'POST'], auth: false }, async (req) => {
  const action = req.query.action || req.body?.action;
  if (action === 'tick') {
    const secret = process.env.CRON_SECRET || '';
    if (secret.length < 20 || !same(String(req.query.key || ''), secret)) throw new HttpError(401, 'Not authenticated');
    return { body: await tick() };
  }
  if (!['key'].includes(action) && req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
  const uid = await authenticate(req);
  if (action === 'key') {
    if (!pushConfigured()) throw new HttpError(400, 'Notifications are not configured on the server yet (missing VAPID keys).');
    return { body: { publicKey: publicKey() } };
  }
  if (action === 'subscribe') {
    const s = req.body?.subscription, k = s?.keys;
    if (!s || !okEndpoint(s.endpoint) || typeof k?.p256dh !== 'string' || typeof k?.auth !== 'string' || !B64.test(k.p256dh) || !B64.test(k.auth) || k.p256dh.length > 200 || k.auth.length > 100) throw new HttpError(400, 'Invalid subscription');
    await q(`INSERT INTO push_subscriptions(user_id, endpoint, p256dh, auth) VALUES ($1,$2,$3,$4)
      ON CONFLICT (endpoint) DO UPDATE SET user_id=EXCLUDED.user_id, p256dh=EXCLUDED.p256dh, auth=EXCLUDED.auth`, [uid, s.endpoint, k.p256dh, k.auth]);
    await q(`DELETE FROM push_subscriptions WHERE user_id=$1 AND id NOT IN (SELECT id FROM push_subscriptions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 5)`, [uid]);
    return { body: { ok: true } };
  }
  if (action === 'unsubscribe') {
    if (typeof req.body?.endpoint !== 'string') throw new HttpError(400, 'endpoint required');
    await q('DELETE FROM push_subscriptions WHERE user_id=$1 AND endpoint=$2', [uid, req.body.endpoint]);
    return { body: { ok: true } };
  }
  if (action === 'test') {
    if (!pushConfigured()) throw new HttpError(400, 'Notifications are not configured on the server yet (missing VAPID keys).');
    const r = await sendToUser(uid, { title: 'Command Center', body: 'Notifications are working.', url: './#settings', tag: 'test' });
    if (!r.subscriptions) throw new HttpError(400, 'This device is not subscribed yet. Tap Enable first.');
    return { body: r };
  }
  throw new HttpError(404, 'Unknown action');
});
