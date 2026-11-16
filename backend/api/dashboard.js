import { route } from '../middleware/http.js';
import { q, qj } from '../services/db.js';
import { series, consistency, DEFAULT_TARGETS } from '../services/stats.js';

export default route({ methods: ['GET'] }, async (_req, uid) => {
  const [me] = await q(`SELECT u.full_name, COALESCE(s.timezone,'Africa/Lagos') tz, s.daily_targets FROM users u LEFT JOIN app_settings s ON s.user_id=u.id WHERE u.id=$1`, [uid]);
  const [{ today }] = await q(`SELECT to_char((now() AT TIME ZONE $1)::date,'YYYY-MM-DD') AS today`, [me.tz]);
  const targets = { ...DEFAULT_TARGETS, ...(me.daily_targets || {}) };
  const [sched, tasks, active, upcoming, recent] = await Promise.all([
    q(`SELECT to_char(day,'YYYY-MM-DD') AS day, kind, COALESCE(SUM(actual_minutes),0)::int AS m, COUNT(*)::int AS total, (COUNT(*) FILTER (WHERE completed))::int AS done
       FROM daily_schedules WHERE user_id=$1 AND day BETWEEN $2::date-34 AND $2::date GROUP BY day, kind`, [uid, today]),
    q(`SELECT (COUNT(*) FILTER (WHERE done AND (completed_at AT TIME ZONE $2)::date=$3::date))::int AS done_today,
              (COUNT(*) FILTER (WHERE NOT done))::int AS pending,
              (COUNT(*) FILTER (WHERE NOT done AND due_date < $3::date))::int AS overdue
       FROM tasks WHERE user_id=$1`, [uid, me.tz, today]),
    qj(`SELECT to_jsonb(p) AS j FROM (SELECT id,name,status,progress,next_milestone,to_char(deadline,'YYYY-MM-DD') deadline FROM projects
        WHERE user_id=$1 AND NOT archived AND status IN ('planning','building','testing') ORDER BY deadline NULLS LAST LIMIT 8) p`, [uid]),
    qj(`SELECT to_jsonb(u) AS j FROM (
          SELECT 'Task' kind, title, to_char(due_date,'YYYY-MM-DD') due FROM tasks WHERE user_id=$1 AND NOT done AND due_date BETWEEN $2::date AND $2::date+14
          UNION ALL SELECT 'Project', name, to_char(deadline,'YYYY-MM-DD') FROM projects WHERE user_id=$1 AND NOT archived AND status NOT IN ('completed','paused') AND deadline BETWEEN $2::date AND $2::date+14
          UNION ALL SELECT 'Assignment', title, to_char(due_date,'YYYY-MM-DD') FROM assignments WHERE user_id=$1 AND status IN ('pending','in_progress') AND due_date BETWEEN $2::date AND $2::date+14
          UNION ALL SELECT 'Exam', c.code, to_char(e.exam_date AT TIME ZONE $3,'YYYY-MM-DD') FROM exams e JOIN courses c ON c.id=e.course_id WHERE e.user_id=$1 AND (e.exam_date AT TIME ZONE $3)::date BETWEEN $2::date AND $2::date+14
          UNION ALL SELECT 'Follow-up', title, to_char(follow_up_date,'YYYY-MM-DD') FROM business_activities WHERE user_id=$1 AND follow_up_date BETWEEN $2::date AND $2::date+14
          ORDER BY 3 LIMIT 15) u`, [uid, today, me.tz]),
    qj(`SELECT to_jsonb(a) AS j FROM (SELECT entity, action, to_char(created_at AT TIME ZONE $2,'YYYY-MM-DD HH24:MI') at FROM activity_log WHERE user_id=$1 ORDER BY id DESC LIMIT 10) a`, [uid, me.tz]),
  ]);
  const s35 = series(sched, today, 35, targets), week = s35.slice(-7), month = s35.slice(-30);
  const logged = month.filter((d) => d.hours > 0);
  return { body: {
    name: me.full_name, today, timezone: me.tz,
    score: s35.at(-1).score, completion: s35.at(-1).completion, hours_today: s35.at(-1).hours,
    tasks: tasks[0], active_projects: active, upcoming, recent, weekly: week,
    consistency_week: consistency(week),
    month: { avg_score: month.length ? Math.round(month.reduce((a, d) => a + d.score, 0) / month.length) : 0, days_logged: logged.length, hours: Math.round(month.reduce((a, d) => a + d.hours, 0) * 10) / 10 },
  } };
});
