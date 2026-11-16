import { get, write, uuid } from './api.js';
import { esc, $, $$, fmtDate, fmtDT, money, modal, closeModal, fieldHTML, readForm, download, toCSV } from './ui.js';

const refCache = {};
export async function loadRefs(fields) {
  const refs = {};
  for (const f of fields.filter((x) => x.t === 'ref')) refs[f.res] = (await get(`/api/records/${f.res}`)).rows;
  return refs;
}
// Opens a create/edit form. Save button is disabled while saving (duplicate-submit protection); client_id makes retries idempotent.
export async function openForm({ res, title, fields, row, refs, defaults = {}, afterSave }) {
  const creating = !row; const clientId = uuid();
  modal(`<form method="dialog" class="form" id="rec-form"><h3>${esc(title)}</h3>
    <div class="grid">${fields.map((f) => fieldHTML(f, row ? row[f.k] : defaults[f.k], refs)).join('')}</div>
    <p class="error" id="form-error" role="alert"></p>
    <div class="row end"><button type="button" class="btn" data-close>Cancel</button><button class="btn primary" type="submit">Save</button></div></form>`,
  (m) => {
    $('#rec-form', m).addEventListener('submit', async (ev) => {
      ev.preventDefault(); const form = ev.target, btn = $('button[type=submit]', form); btn.disabled = true;
      try {
        const body = readForm(form, fields, creating);
        if (creating) body.client_id = clientId;
        const r = await write(creating ? 'POST' : 'PATCH', creating ? `/api/records/${res}` : `/api/records/${res}/${row.id}`, body);
        closeModal(); afterSave?.(r);
      } catch (e) { $('#form-error', form).textContent = [e.message, ...(e.details || [])].join(' • '); btn.disabled = false; }
    });
  });
}

const FMT = {
  date: (v) => fmtDate(v), dt: (v) => fmtDT(v), time: (v) => String(v ?? '').slice(0, 5),
  progress: (v) => `<progress max="100" value="${Number(v) || 0}"></progress> ${Number(v) || 0}%`,
  bool: (v) => (v ? '✓' : ''), money: (v, r) => money(v, r.currency), tag: (v) => (v ? `<span class="tag">${esc(v)}</span>` : ''),
};
// Generic list + CRUD section driven by a config object.
export async function section(root, cfg) {
  const refs = await loadRefs(cfg.fields);
  let rows = [], search = '', filters = { ...(cfg.query || {}) };
  root.innerHTML = `<div class="toolbar"><h3>${esc(cfg.title)}</h3><span class="grow"></span>
    ${cfg.search ? '<input id="q" type="search" placeholder="Search…" aria-label="Search">' : ''}
    ${(cfg.filters || []).map((f) => `<select data-filter="${f.k}" aria-label="${esc(f.l)}"><option value="">${esc(f.l)}: all</option>${f.o.map((o) => `<option>${esc(o)}</option>`).join('')}</select>`).join('')}
    ${cfg.archive ? '<label class="inline"><input type="checkbox" id="show-arch"> Archived</label>' : ''}
    <button class="btn" id="csv">CSV</button><button class="btn primary" id="add">+ Add</button></div>
    <div id="summary"></div><div class="table-wrap"><table><thead><tr>${cfg.cols.map((c) => `<th>${esc(c.l)}</th>`).join('')}<th></th></tr></thead><tbody id="rows"></tbody></table></div><p class="muted" id="empty"></p>`;
  const refName = (c, r) => { const f = cfg.fields.find((x) => x.k === c.k); return f?.t === 'ref' ? (refs[f.res].find((x) => x.id === r[c.k])?.[f.label] ?? '') : null; };
  function draw() {
    const s = search.toLowerCase();
    const shown = rows.filter((r) => !s || JSON.stringify(r).toLowerCase().includes(s));
    $('#rows', root).innerHTML = shown.map((r) => `<tr>${cfg.cols.map((c, i) => {
      const raw = r[c.k]; const rn = refName(c, r);
      const content = c.toggle ? `<input type="checkbox" data-toggle="${c.k}" data-id="${r.id}" ${raw ? 'checked' : ''} aria-label="${esc(c.l)}">` : rn !== null ? esc(rn) : c.f ? FMT[c.f](raw, r) : esc(raw ?? '');
      return `<td data-label="${esc(c.l)}" class="${i === 0 ? 'strong' : ''}">${content}</td>`;
    }).join('')}<td class="actions"><button class="btn sm" data-edit="${r.id}">Edit</button>${cfg.archive ? `<button class="btn sm" data-arch="${r.id}">${r.archived ? 'Restore' : 'Archive'}</button>` : ''}<button class="btn sm danger" data-del="${r.id}">Delete</button></td></tr>`).join('');
    $('#empty', root).textContent = shown.length ? '' : 'Nothing here yet.';
    cfg.onDraw?.(rows, $('#summary', root));
  }
  async function reload() {
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== '' && v != null)).toString();
    try { rows = (await get(`/api/records/${cfg.res}${qs ? '?' + qs : ''}`)).rows; draw(); }
    catch (e) { $('#empty', root).textContent = `Could not load: ${e.message}`; }
  }
  const find = (id) => rows.find((r) => r.id === id);
  root.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.id === 'add') openForm({ res: cfg.res, title: `Add ${cfg.title}`, fields: cfg.fields, refs, defaults: cfg.defaults, afterSave: reload });
    else if (b.id === 'csv') download(`${cfg.res}.csv`, toCSV(rows, cfg.fields.map((f) => f.k)), 'text/csv');
    else if (b.dataset.edit) openForm({ res: cfg.res, title: `Edit ${cfg.title}`, fields: cfg.fields, row: find(b.dataset.edit), refs, afterSave: reload });
    else if (b.dataset.arch) { const r = find(b.dataset.arch); await write('PATCH', `/api/records/${cfg.res}/${r.id}`, { archived: !r.archived }).catch(() => {}); reload(); }
    else if (b.dataset.del && confirm('Delete this record permanently?')) { await write('DELETE', `/api/records/${cfg.res}/${b.dataset.del}`).catch(() => {}); reload(); }
  });
  root.addEventListener('change', async (ev) => {
    const t = ev.target;
    if (t.dataset.toggle) { await write('PATCH', `/api/records/${cfg.res}/${t.dataset.id}`, { [t.dataset.toggle]: t.checked }).catch(() => {}); reload(); }
    else if (t.dataset.filter) { filters[t.dataset.filter] = t.value; reload(); }
    else if (t.id === 'show-arch') { filters.archived = t.checked ? 'true' : 'false'; reload(); }
  });
  $('#q', root)?.addEventListener('input', (e) => { search = e.target.value; draw(); });
  if (cfg.archive) filters.archived = 'false';
  window.addEventListener('pcc:synced', reload, { once: true });
  await reload();
}
