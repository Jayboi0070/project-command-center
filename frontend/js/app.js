import { get, post, setToken, logout, token, setStatusHandler, flush, queued } from './api.js';
import { $, $$, showStatus, esc, modal } from './ui.js';
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
const TABS = [['dashboard', 'Home'], ['schedule', 'Schedule'], ['projects', 'Projects'], ['university', 'Study']];
const MORE = ['research', 'business', 'reports', 'settings'];
const ICONS = {
  dashboard: '<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  schedule: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  projects: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  university: '<path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2z"/><path d="M22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z"/>',
  more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
};
const icon = (k) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`;
let me = null, tab = 0;
setStatusHandler(showStatus);

function applyTheme(t) { document.documentElement.dataset.theme = t === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : t; }

async function render() {
  const page = PAGES[location.hash.slice(1)] ? location.hash.slice(1) : 'dashboard'; const p = PAGES[page];
  $$('#nav a, #tabbar a').forEach((a) => a.setAttribute('aria-current', a.dataset.page === page ? 'page' : 'false'));
  $('#more-btn')?.setAttribute('aria-current', MORE.includes(page) ? 'page' : 'false');
  window.scrollTo(0, 0);
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
  $('#tabbar').innerHTML = TABS.map(([k, label]) => `<a href="#${k}" data-page="${k}">${icon(k)}<span>${label}</span></a>`).join('') + `<button id="more-btn" type="button">${icon('more')}<span>More</span></button>`;
  $('#more-btn').addEventListener('click', () => modal(`<div class="sheet"><h3>More</h3>${MORE.map((k) => `<a class="sheet-link" href="#${k}" data-close>${esc(PAGES[k].title)}</a>`).join('')}</div>`));
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
