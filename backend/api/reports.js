import { route } from '../middleware/http.js';
import { HttpError } from '../services/crud.js';
import { q } from '../services/db.js';
import { series, KINDS, DEFAULT_TARGETS, addDays } from '../services/stats.js';

export default route({ methods: ['GET'] }, async (req, uid) => {
  const { from, to } = req.query, re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(from || '') || !re.test(to || '') || from > to) throw new HttpError(400, 'from and to must be YYYY-MM-DD with from <= to');
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 864e5) + 1;
  if (days > 400) throw new HttpError(400, 'Range too large');
  const [me] = await q(`SELECT COALESCE(s.timezone,'Africa/Lagos') tz, s.daily_targets FROM users u LEFT JOIN app_settings s ON s.user_id=u.id WHERE u.id=$1`, [uid]);
  const targets = { ...DEFAULT_TARGETS, ...(me.daily_targets || {}) };
  const [sched, tasks, proj, biz, fin, goals] = await Promise.all([
    q(`SELECT to_char(day,'YYYY-MM-DD') AS day, kind, COALESCE(SUM(actual_minutes),0)::int AS m, COUNT(*)::int AS total, (COUNT(*) FILTER (WHERE completed))::int AS done FROM daily_schedules WHERE user_id=$1 AND day BETWEEN $2 AND $3 GROUP BY day, kind`, [uid, from, to]),
    q(`SELECT COUNT(*)::int n FROM tasks WHERE user_id=$1 AND done AND (completed_at AT TIME ZONE $4)::date BETWEEN $2 AND $3`, [uid, from, to, me.tz]),
    q(`SELECT COUNT(*)::int n FROM projects WHERE user_id=$1 AND status='completed' AND (updated_at AT TIME ZONE $4)::date BETWEEN $2 AND $3`, [uid, from, to, me.tz]),
    q(`SELECT kind, COUNT(*)::int n FROM business_activities WHERE user_id=$1 AND (created_at AT TIME ZONE $4)::date BETWEEN $2 AND $3 GROUP BY kind`, [uid, from, to, me.tz]),
    q(`SELECT type, currency, COALESCE(SUM(amount),0)::float8 total FROM financial_records WHERE user_id=$1 AND entry_date BETWEEN $2 AND $3 GROUP BY type, currency`, [uid, from, to]),
    q(`SELECT title, to_char(month,'YYYY-MM') month, achieved FROM monthly_goals WHERE user_id=$1 AND month BETWEEN date_trunc('month',$2::date) AND $3 ORDER BY month`, [uid, from, to]),
  ]);
  const daily = series(sched, to, days, targets);
  const hours = Object.fromEntries(KINDS.map((k) => [k, Math.round(daily.reduce((a, d) => a + d.minutes[k], 0) / 6) / 10]));
  return { body: {
    from, to, days, daily, hours_by_area: hours,
    avg_score: Math.round(daily.reduce((a, d) => a + d.score, 0) / days),
    days_meeting_60: daily.filter((d) => d.score >= 60).length,
    tasks_completed: tasks[0].n, projects_completed: proj[0].n,
    business_by_kind: biz, finance: fin, goals,
    goals_achieved: goals.filter((g) => g.achieved).length, goals_total: goals.length,
  } };
});
