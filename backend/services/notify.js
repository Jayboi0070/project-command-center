import webpush from 'web-push';
import { q } from './db.js';
import { toMin, inWindow } from './notify-logic.js';

let ready = false;
function init() {
  if (ready) return true;
  const { VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: priv, VAPID_SUBJECT: subj } = process.env;
  if (!pub || !priv || !subj) return false;
  webpush.setVapidDetails(subj, pub, priv); ready = true; return true;
}
export const pushConfigured = () => init();
export const publicKey = () => process.env.VAPID_PUBLIC_KEY || null;

export async function sendToUser(uid, payload) {
  const subs = await q('SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id=$1', [uid]);
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600, urgency: 'high' });
      sent++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) await q('DELETE FROM push_subscriptions WHERE id=$1', [s.id]);   // dead subscription
      else console.error('push failed', e.statusCode);
    }
  }
  return { sent, subscriptions: subs.length };
}

// Each notification is "claimed" in notification_log first, so it can never be sent twice, even if the cron fires twice.
const claim = async (uid, key) => (await q('INSERT INTO notification_log(user_id,key) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING 1', [uid, key])).length > 0;

export async function tick() {
  if (!init()) return { skipped: 'push not configured' };
  const users = await q(`SELECT u.id, COALESCE(s.timezone,'Africa/Lagos') AS tz, COALESCE(s.notifications,'{}'::jsonb) AS n
    FROM users u LEFT JOIN app_settings s ON s.user_id=u.id WHERE EXISTS (SELECT 1 FROM push_subscriptions p WHERE p.user_id=u.id)`);
  const report = [];
  for (const u of users) {
    const n = u.n || {}, sent = [];
    const [t] = await q(`SELECT to_char(now() AT TIME ZONE $1,'YYYY-MM-DD') AS d, to_char(now() AT TIME ZONE $1,'HH24:MI') AS t`, [u.tz]);
    const lead = Number.isInteger(n.lead) ? n.lead : 10;
    const push = async (key, payload) => { if (await claim(u.id, key)) { await sendToUser(u.id, payload); sent.push(key.split(':')[0]); } };

    if (n.schedule !== false && lead > 0) {
      const rows = await q(`SELECT id, activity, to_char(start_time,'HH24:MI') AS at FROM daily_schedules
        WHERE user_id=$1 AND day=$2::date AND NOT completed AND start_time IS NOT NULL AND start_time > $3::time AND start_time <= ($3::time + ($4 || ' minutes')::interval)`, [u.id, t.d, t.t, String(lead)]);
      for (const r of rows) await push(`pre:${r.id}:${t.d}`, { title: `In ${toMin(r.at) - toMin(t.t)} min: ${r.activity}`, body: `Starts at ${r.at}`, url: './#schedule', tag: 'pre-' + r.id });
    }
    if (n.start !== false) {
      const rows = await q(`SELECT id, activity, to_char(start_time,'HH24:MI') AS at FROM daily_schedules
        WHERE user_id=$1 AND day=$2::date AND NOT completed AND start_time IS NOT NULL AND start_time <= $3::time AND start_time > ($3::time - interval '10 minutes')`, [u.id, t.d, t.t]);
      for (const r of rows) await push(`start:${r.id}:${t.d}`, { title: `Now: ${r.activity}`, body: `Scheduled for ${r.at}`, url: './#schedule', tag: 'start-' + r.id });
    }
    if (n.morning && inWindow(t.t, n.morning, 180)) {
      const [c] = await q(`SELECT COUNT(*)::int AS total, (SELECT activity FROM daily_schedules WHERE user_id=$1 AND day=$2::date ORDER BY start_time NULLS LAST LIMIT 1) AS first
        FROM daily_schedules WHERE user_id=$1 AND day=$2::date`, [u.id, t.d]);
      await push(`morning:${t.d}`, { title: 'Good morning', body: c.total ? `${c.total} activities today. First: ${c.first}` : 'Nothing scheduled yet. Plan your day.', url: './#schedule', tag: 'morning' });
    }
    if (n.review && inWindow(t.t, n.review, 180)) {
      const [c] = await q(`SELECT COUNT(*)::int AS total, (COUNT(*) FILTER (WHERE completed))::int AS done FROM daily_schedules WHERE user_id=$1 AND day=$2::date`, [u.id, t.d]);
      await push(`review:${t.d}`, { title: 'Daily review time', body: c.total ? `${c.done} of ${c.total} activities done today.` : 'Take 15 minutes to review your day.', url: './#dashboard', tag: 'review' });
    }
    report.push({ at: `${t.d} ${t.t}`, sent });
  }
  await q(`DELETE FROM notification_log WHERE sent_at < now() - interval '45 days'`);
  return { ok: true, report };
}
