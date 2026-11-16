import { get, post, setToken, logout, token, setStatusHandler, flush, queued } from './api.js';
import { $, $$, showStatus, esc } from './ui.js';
import { section } from './sections.js';
import { SECTIONS } from './configs.js';
import { dashboard, schedule, reports, settings, universityHours } from './views.js';

const PAGES = {
  dashboard: { title: 'Dashboard', run: (el) => dashboard(el) },
  schedule: { title: 'Schedule', tabs: ['Schedule', 'Tasks'], run: (el, tab, me) => (tab === 1 ? section(el, SECTIONS.tasks) : schedule(el, me.timezone)) },
  projects: { title: 'Projects', tabs: ['Projects', 'Milestones'], run: (el, tab) => section(el, tab ? SECTIONS.milestones : SECTIONS.projects) },
  university: { title: 'University', tabs: ['Courses', 'Assignments', 'Exams'], run: async (el, tab, me) => { el.innerHTML = '<div id="hrs"></div><div id="sec"></div>'; universityHours($('#hrs', el), me.timezone); await section($('#sec', el), [SECTIONS.courses, SECTIONS.assignments, SECTIONS.exams][tab]); } },
  research: { title: 'Research', run: (el) => section(el, SECTIONS.research) },
  business: { title: 'Business', tabs: ['Records', 'Finance'], run: (el, tab) => section(el, tab ? SECTIONS.finance : SECTIONS.business) },
  reports: { title: 'Reports', tabs: ['Reports', 'Monthly goals'], run: (el, tab, me) => (tab ? section(el, SECTIONS.goals) : reports(el, me.timezone)) },
  settings: { title: 'Settings', run: (el, _t, me) => settings(el, me, applyTheme) },
};
let me = null, tab = 0;
setStatusHandler(showStatus);

function applyTheme(t) { document.documentElement.dataset.theme = t === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : t; }

async function render() {
  const page = PAGES[location.hash.slice(1)] ? location.hash.slice(1) : 'dashboard'; const p = PAGES[page];
  $$('#nav a').forEach((a) => a.setAttribute('aria-current', a.dataset.page === page ? 'page' : 'false'));
  $('#page-title').textContent = p.title;
  const view = $('#view');
  const tabsHTML = p.tabs ? `<div class="tabs">${p.tabs.map((t, i) => `<button class="tab" data-tab="${i}" aria-selected="${i === tab}">${esc(t)}</button>`).join('')}</div>` : '';
  view.innerHTML = `${tabsHTML}<div id="page-body"><p class="muted">Loading…</p></div>`;
  $$('.tab', view).forEach((b) => b.addEventListener('click', () => { tab = Number(b.dataset.tab); render(); }));
  try { const body = $('#page-body'); body.innerHTML = ''; await p.run(body, tab, me); }
  catch (e) { $('#page-body').innerHTML = `<div class="card"><p class="error">Could not load: ${esc(e.message)}</p><button class="btn" id="retry">Retry</button></div>`; $('#retry').onclick = render; }
}
window.addEventListener('hashchange', () => { tab = 0; render(); });

async function start() {
  $('#login').hidden = !!token() ? true : false; $('#app').hidden = !token();
  if (!token()) return;
  try { me = await get('/api/auth/me'); } catch { return showLogin(); }
  applyTheme(me.theme || 'dark');
  $('#nav').innerHTML = `<div class="brand">PCC</div>${Object.entries(PAGES).map(([k, v]) => `<a href="#${k}" data-page="${k}">${v.title}</a>`).join('')}`;
  render(); flush();
  if (queued()) showStatus('offline');
}
function showLogin() { logout(); $('#app').hidden = true; $('#login').hidden = false; }
window.addEventListener('pcc:unauth', showLogin);
window.addEventListener('pcc:signout', () => { showLogin(); });

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault(); const f = e.target, err = $('#login-error'), btn = $('button', f); btn.disabled = true; err.textContent = '';
  try { const r = await post('/api/auth/login', { email: f.email.value, password: f.password.value }); setToken(r.token, r.expiresInSeconds); f.reset(); await start(); }
  catch (er) { err.textContent = er.status === 401 || er.status === 429 ? er.message : 'Could not reach the server. Check your connection and try again.'; }
  btn.disabled = false;
});
start();
