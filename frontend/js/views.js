import { get, post, write, uuid } from './api.js';
import { esc, $, $$, fmtDate, fmtDT, download, toCSV } from './ui.js';
import { openForm, loadRefs } from './sections.js';

const KINDS = ['reading', 'research', 'development', 'business', 'exercise', 'review'];
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const todayLocal = (tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz || undefined }).format(new Date());
const bar = (data, key = 'score') => `<svg viewBox="0 0 ${data.length * 40} 130" class="chart" role="img" aria-label="Chart">${data.map((d, i) => {
  const h = Math.max(2, Math.round((d[key] / 100) * 90));
  return `<rect x="${i * 40 + 8}" y="${100 - h}" width="24" height="${h}" rx="4"/><text x="${i * 40 + 20}" y="${94 - h}" text-anchor="middle" class="v">${d[key]}</text><text x="${i * 40 + 20}" y="118" text-anchor="middle">${esc(new Date(d.day + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' }))}</text>`;
}).join('')}</svg>`;

export async function dashboard(root) {
  const d = await get('/api/dashboard');
  const first = d.name.split(' ')[0]; const hr = new Date().getHours();
  const hello = `${hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening'}, ${first[0]}${first.slice(1).toLowerCase()}`;
  const li = (a, f) => (a.length ? `<ul class="list">${a.map(f).join('')}</ul>` : '<p class="muted">Nothing yet.</p>');
  root.innerHTML = `<div class="hero"><h3>${esc(hello)}</h3><p class="muted">${esc(fmtDate(d.today))} · ${esc(d.timezone)}</p></div>
  <div class="stats">
    <div class="stat"><span>Productivity score today</span><b>${d.score}</b></div><div class="stat"><span>Completion today</span><b>${d.completion}%</b></div>
    <div class="stat"><span>Tasks completed today</span><b>${d.tasks.done_today}</b></div><div class="stat"><span>Pending tasks</span><b>${d.tasks.pending}</b><small>${d.tasks.overdue} overdue</small></div>
    <div class="stat"><span>Weekly consistency</span><b>${d.consistency_week}%</b><small>days at 60+ score</small></div><div class="stat"><span>Monthly average score</span><b>${d.month.avg_score}</b><small>${d.month.hours} h over ${d.month.days_logged} active days</small></div></div>
  <div class="cols"><div class="card"><h4>Weekly productivity</h4>${bar(d.weekly)}</div>
  <div class="card"><h4>Upcoming deadlines (14 days)</h4>${li(d.upcoming, (u) => `<li><span class="tag">${esc(u.kind)}</span> ${esc(u.title)} <em>${esc(fmtDate(u.due))}</em></li>`)}</div>
  <div class="card"><h4>Active projects</h4>${li(d.active_projects, (p) => `<li>${esc(p.name)} <span class="tag">${esc(p.status)}</span><progress max="100" value="${p.progress}"></progress></li>`)}</div>
  <div class="card"><h4>Recent activity</h4>${li(d.recent, (a) => `<li>${esc(a.action)} · ${esc(a.entity.replace(/_/g, ' '))} <em>${esc(a.at)}</em></li>`)}</div></div>`;
}

const SCHED_FIELDS = [
  { k: 'day', l: 'Date', t: 'date', req: 1 }, { k: 'activity', l: 'Activity', t: 'text', req: 1 },
  { k: 'kind', l: 'Type', t: 'select', req: 1, o: [...KINDS, 'meal', 'rest', 'sleep', 'personal', 'other'] },
  { k: 'start_time', l: 'Start', t: 'time' }, { k: 'end_time', l: 'End', t: 'time' }, { k: 'planned_minutes', l: 'Planned minutes', t: 'number', min: 0, max: 1440 },
  { k: 'actual_minutes', l: 'Actual minutes', t: 'number', min: 0, max: 1440 }, { k: 'completed', l: 'Completed', t: 'checkbox' }, { k: 'notes', l: 'Notes', t: 'textarea', max: 2000 }];
const PRESET = [['University reading', 'reading', 105], ['Research', 'research', 120], ['Software development', 'development', 180], ['Business activity', 'business', 30], ['Exercise', 'exercise', 30], ['Daily review', 'review', 15]];

export async function schedule(root, tz) {
  let day = todayLocal(tz), mode = 'day';
  async function draw() {
    const from = mode === 'day' ? day : addDays(day, -((new Date(day + 'T00:00:00Z').getUTCDay() + 6) % 7)), to = mode === 'day' ? day : addDays(from, 6);
    let rows = []; let err = '';
    try { rows = (await get(`/api/records/daily_schedules?from=${from}&to=${to}`)).rows; } catch (e) { err = e.message; }
    const byDay = {}; rows.forEach((r) => (byDay[r.day] ??= []).push(r));
    const days = mode === 'day' ? [day] : Array.from({ length: 7 }, (_, i) => addDays(from, i));
    root.innerHTML = `<div class="toolbar"><button class="btn" data-a="prev">‹</button><b>${esc(fmtDate(day))}</b><button class="btn" data-a="next">›</button><button class="btn" data-a="today">Today</button>
      <span class="grow"></span><button class="btn" data-a="mode">${mode === 'day' ? 'Week view' : 'Day view'}</button><button class="btn" data-a="preset">+ Daily targets</button><button class="btn" data-a="resched">Move unfinished to tomorrow</button><button class="btn primary" data-a="add">+ Activity</button></div>
      <p class="error">${esc(err)}</p>
      ${days.map((dd) => `<div class="card"><h4>${esc(fmtDate(dd))}</h4>${(byDay[dd] || []).length ? `<ul class="list">${byDay[dd].map((r) => `<li><input type="checkbox" data-done="${r.id}" ${r.completed ? 'checked' : ''} aria-label="Completed">
        <span class="grow"><b>${esc(r.activity)}</b> <span class="tag">${esc(r.kind)}</span> <em>${esc(String(r.start_time ?? '').slice(0, 5))}${r.end_time ? '–' + esc(String(r.end_time).slice(0, 5)) : ''}</em></span>
        <label class="inline mins">actual <input type="number" min="0" max="1440" value="${r.actual_minutes}" data-mins="${r.id}"> min${r.planned_minutes ? ` / ${r.planned_minutes}` : ''}</label>
        <button class="btn sm" data-edit="${r.id}">Edit</button><button class="btn sm danger" data-del="${r.id}">Delete</button></li>`).join('')}</ul>` : '<p class="muted">No activities.</p>'}</div>`).join('')}`;
    root._rows = rows;
  }
  root.onclick = async (ev) => {
    const b = ev.target.closest('button'); if (!b) return; const a = b.dataset.a;
    if (a === 'prev') day = addDays(day, mode === 'day' ? -1 : -7); else if (a === 'next') day = addDays(day, mode === 'day' ? 1 : 7);
    else if (a === 'today') day = todayLocal(tz); else if (a === 'mode') mode = mode === 'day' ? 'week' : 'day';
    else if (a === 'add') return openForm({ res: 'daily_schedules', title: 'Add activity', fields: SCHED_FIELDS, refs: {}, defaults: { day }, afterSave: draw });
    else if (a === 'preset') { for (const [activity, kind, m] of PRESET) await write('POST', '/api/records/daily_schedules', { client_id: uuid(), day, activity, kind, planned_minutes: m }).catch(() => {}); }
    else if (a === 'resched') { const next = addDays(day, 1); for (const r of root._rows.filter((x) => !x.completed && x.day === day)) await write('PATCH', `/api/records/daily_schedules/${r.id}`, { day: next, rescheduled_from: day }).catch(() => {}); }
    else if (b.dataset.edit) return openForm({ res: 'daily_schedules', title: 'Edit activity', fields: SCHED_FIELDS, row: root._rows.find((r) => r.id === b.dataset.edit), refs: {}, afterSave: draw });
    else if (b.dataset.del && confirm('Delete this activity?')) await write('DELETE', `/api/records/daily_schedules/${b.dataset.del}`).catch(() => {});
    draw();
  };
  root.onchange = async (ev) => {
    const t = ev.target;
    if (t.dataset.done) await write('PATCH', `/api/records/daily_schedules/${t.dataset.done}`, { completed: t.checked }).catch(() => {});
    else if (t.dataset.mins) await write('PATCH', `/api/records/daily_schedules/${t.dataset.mins}`, { actual_minutes: Number(t.value) || 0 }).catch(() => {});
    else return; draw();
  };
  await draw();
}

export async function universityHours(el, tz) {
  const to = todayLocal(tz), from = addDays(to, -6);
  try {
    const { rows } = await get(`/api/records/daily_schedules?from=${from}&to=${to}&kind=reading`);
    const m = rows.reduce((a, r) => a + r.actual_minutes, 0);
    el.innerHTML = `<div class="stats"><div class="stat"><span>Study hours, last 7 days</span><b>${(m / 60).toFixed(1)}</b><small>from your schedule's reading entries</small></div></div>`;
  } catch { el.innerHTML = ''; }
}

export async function reports(root, tz) {
  const t = todayLocal(tz); const monthStart = t.slice(0, 8) + '01';
  root.innerHTML = `<div class="toolbar no-print"><select id="period"><option value="week">Last 7 days</option><option value="month" selected>This month</option></select><span class="grow"></span>
    <button class="btn" id="x-csv">CSV</button><button class="btn" id="x-json">JSON</button><button class="btn" id="x-pdf">Print / Save as PDF</button></div><div id="rep"></div><div id="goals"></div>`;
  let data;
  async function load() {
    const w = $('#period', root).value === 'week'; const from = w ? addDays(t, -6) : monthStart;
    data = await get(`/api/reports?from=${from}&to=${t}`);
    const fin = data.finance.map((f) => `${f.type.replace('_', ' ')}: ${f.currency} ${f.total.toLocaleString()}`).join(' · ') || 'none recorded';
    $('#rep', root).innerHTML = `<div class="stats"><div class="stat"><span>Average score</span><b>${data.avg_score}</b></div><div class="stat"><span>Days at 60+</span><b>${data.days_meeting_60}/${data.days}</b></div>
      <div class="stat"><span>Tasks completed</span><b>${data.tasks_completed}</b></div><div class="stat"><span>Projects completed</span><b>${data.projects_completed}</b></div>
      <div class="stat"><span>Goals achieved</span><b>${data.goals_achieved}/${data.goals_total}</b></div></div>
      <div class="cols"><div class="card"><h4>Daily score</h4>${data.days <= 14 ? bar(data.daily) : bar(data.daily.slice(-14))}</div>
      <div class="card"><h4>Hours by area</h4><ul class="list">${KINDS.map((k) => `<li>${esc(k)} <b>${data.hours_by_area[k]} h</b></li>`).join('')}</ul></div>
      <div class="card"><h4>Business</h4><p>${data.business_by_kind.map((b) => `${esc(b.kind)}: ${b.n}`).join(' · ') || 'No new records.'}</p><p class="muted">${esc(fin)}</p></div></div>`;
  }
  $('#period', root).onchange = load;
  $('#x-json', root).onclick = () => download(`report-${data.from}_${data.to}.json`, JSON.stringify(data, null, 2), 'application/json');
  $('#x-csv', root).onclick = () => download(`report-${data.from}_${data.to}.csv`, toCSV(data.daily.map((d) => ({ day: d.day, score: d.score, completion: d.completion, hours: d.hours, ...d.minutes })), ['day', 'score', 'completion', 'hours', ...KINDS]), 'text/csv');
  $('#x-pdf', root).onclick = () => window.print();
  await load();
}

export async function settings(root, me, onTheme) {
  const s = await get('/api/settings'); const hist = (await get('/api/backup/history')).rows;
  const tzs = Intl.supportedValuesOf('timeZone'); if (!tzs.includes('Africa/Lagos')) tzs.unshift('Africa/Lagos');
  const n = s.notifications || {};
  root.innerHTML = `<div class="cols">
  <div class="card"><h4>Profile</h4><p><b>${esc(me.full_name)}</b><br><span class="muted">${esc(me.email)}</span></p>
    <label>Time zone<select id="tz">${tzs.map((z) => `<option ${z === s.timezone ? 'selected' : ''}>${esc(z)}</option>`).join('')}</select></label>
    <label>Theme<select id="theme">${['dark', 'light', 'system'].map((z) => `<option ${z === s.theme ? 'selected' : ''}>${z}</option>`).join('')}</select></label>
    <label class="inline"><input type="checkbox" id="n-daily" ${n.daily_review ? 'checked' : ''}> Daily review reminder (preference only; reminders are not sent yet)</label>
    <button class="btn primary" id="save-prefs">Save preferences</button></div>
  <div class="card"><h4>Daily targets (hours)</h4>${KINDS.map((k) => `<label>${k}<input type="number" step="0.25" min="0" max="24" data-target="${k}" value="${s.daily_targets[k]}"></label>`).join('')}<button class="btn primary" id="save-targets">Save targets</button></div>
  <div class="card"><h4>Password</h4><form id="pw"><label>Current<input type="password" name="current" autocomplete="current-password" required></label><label>New (12+ characters)<input type="password" name="next" minlength="12" autocomplete="new-password" required></label><p class="error" id="pw-msg"></p><button class="btn primary">Change password</button></form></div>
  <div class="card"><h4>Backup &amp; restore</h4><p class="muted">A backup file on this device is not enough protection. Keep a copy somewhere else too (see docs/BACKUP_AND_RECOVERY.md).</p>
    <button class="btn primary" id="bk-export">Download full JSON backup</button>
    <label>Restore from backup file<input type="file" id="bk-file" accept="application/json"></label><div id="bk-preview"></div>
    <h4>History</h4>${hist.length ? `<ul class="list">${hist.map((h) => `<li>${esc(h.kind)} <em>${esc(fmtDT(h.created_at))}</em></li>`).join('')}</ul>` : '<p class="muted">No backups yet.</p>'}</div>
  <div class="card"><h4>Account security</h4><p class="muted">Single-owner account. Sessions last 12 hours; the account locks for 15 minutes after 5 wrong passwords.</p><button class="btn" id="signout">Sign out</button></div></div>`;
  const patch = async (b) => { try { await write('PATCH', '/api/settings', b); return true; } catch { return false; } };
  $('#save-prefs', root).onclick = async () => { if (await patch({ timezone: $('#tz', root).value, theme: $('#theme', root).value, notifications: { daily_review: $('#n-daily', root).checked } })) { onTheme($('#theme', root).value); } };
  $('#save-targets', root).onclick = () => patch({ daily_targets: Object.fromEntries($$('[data-target]', root).map((i) => [i.dataset.target, Number(i.value)])) });
  $('#pw', root).onsubmit = async (e) => { e.preventDefault(); const f = e.target; try { await write('POST', '/api/auth/change-password', { current: f.current.value, next: f.next.value }); $('#pw-msg', root).textContent = 'Password changed.'; f.reset(); } catch (er) { $('#pw-msg', root).textContent = er.message; } };
  $('#bk-export', root).onclick = async () => { try { const b = await get('/api/backup/export'); download(`pcc-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(b), 'application/json'); } catch (e) { alert(e.message); } };
  $('#bk-file', root).onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return; const box = $('#bk-preview', root);
    try {
      const backup = JSON.parse(await file.text()); const p = await post('/api/backup/restore', { backup, dryRun: true });
      box.innerHTML = `<p>Backup is valid. Restore only <b>adds missing records</b>; existing records are never overwritten.</p><ul class="list">${Object.entries(p.counts).map(([k, v]) => `<li>${esc(k)}: ${v.in_file} in file, ${v.already_present} already present</li>`).join('')}</ul><button class="btn primary" id="bk-go">Restore missing records</button>`;
      $('#bk-go', root).onclick = async () => { try { const r = await post('/api/backup/restore', { backup }); box.innerHTML = `<p class="ok">Restored: ${esc(JSON.stringify(r.restored))}</p>`; } catch (er) { box.innerHTML = `<p class="error">${esc(er.message)}</p>`; } };
    } catch (er) { box.innerHTML = `<p class="error">${esc(er.message)} ${(er.details || []).map(esc).join('; ')}</p>`; }
  };
  $('#signout', root).onclick = () => window.dispatchEvent(new Event('pcc:signout'));
}
