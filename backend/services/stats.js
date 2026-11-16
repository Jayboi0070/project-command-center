// Pure scoring logic. Score rewards consistency across the six daily areas, capped per area so long hours in one area can't inflate it.
export const KINDS = ['reading', 'research', 'development', 'business', 'exercise', 'review'];
export const DEFAULT_TARGETS = { reading: 1.5, research: 2, development: 3, business: 0.5, exercise: 0.5, review: 0.25 };

export function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}
// rows: [{kind, m (actual minutes), total, done}] for ONE day.
export function dayStats(rows, targets = DEFAULT_TARGETS) {
  const by = Object.fromEntries(KINDS.map((k) => [k, 0]));
  let total = 0, done = 0;
  for (const r of rows) { if (r.kind in by) by[r.kind] += r.m; total += r.total; done += r.done; }
  const parts = KINDS.map((k) => { const t = (targets[k] ?? DEFAULT_TARGETS[k]) * 60; return t > 0 ? Math.min(1, by[k] / t) : 0; });
  const score = Math.round((parts.reduce((a, b) => a + b, 0) / KINDS.length) * 100);
  const hours = Math.round((KINDS.reduce((a, k) => a + by[k], 0) / 60) * 10) / 10;
  return { score, completion: total ? Math.round((done / total) * 100) : 0, minutes: by, hours };
}
// rows: [{day, kind, m, total, done}] -> [{day, ...dayStats}] for n days ending at `end`.
export function series(rows, end, n, targets) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const day = addDays(end, -i);
    out.push({ day, ...dayStats(rows.filter((r) => r.day === day), targets) });
  }
  return out;
}
export const consistency = (s) => (s.length ? Math.round((s.filter((d) => d.score >= 60).length / s.length) * 100) : 0);
