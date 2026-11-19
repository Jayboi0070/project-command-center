// Pure helpers (no dependencies) so they can be unit tested.
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
export const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
// minutes since `target` (wraps midnight); null if invalid
export const minutesSince = (nowHHMM, targetHHMM) => ((toMin(nowHHMM) - toMin(targetHHMM)) % 1440 + 1440) % 1440;
// true if now is within [target, target + windowMin]
export const inWindow = (now, target, windowMin) => HHMM.test(target || '') && minutesSince(now, target) <= windowMin;

// Validates the notification preferences object. Returns { error } or { value }.
export function validateNotifications(n) {
  if (!n || typeof n !== 'object' || Array.isArray(n)) return { error: 'Invalid notifications' };
  const out = {};
  for (const [k, v] of Object.entries(n)) {
    if (k === 'schedule' || k === 'start') { if (typeof v !== 'boolean') return { error: `${k} must be true/false` }; }
    else if (k === 'lead') { if (!Number.isInteger(v) || v < 0 || v > 120) return { error: 'lead must be 0-120 minutes' }; }
    else if (k === 'morning' || k === 'review') { if (v !== '' && !HHMM.test(v)) return { error: `${k} must be HH:MM or empty` }; }
    else return { error: `Unknown notification option: ${k}` };
    out[k] = v;
  }
  return { value: out };
}
