export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
export const fmtDate = (d) => (d ? new Date(String(d).slice(0, 10) + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');
export const fmtDT = (d) => (d ? new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
export const money = (n, cur = 'NGN') => { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur }).format(n); } catch { return `${cur} ${n}`; } };
export const localInput = (iso) => { if (!iso) return ''; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

const LABELS = { saving: ['Saving…', 'busy'], saved: ['Saved successfully', 'ok'], lost: ['Connection lost', 'warn'], failed: ['Save failed', 'bad'], offline: ['Offline: changes queued', 'warn'] };
export function showStatus(kind, detail) {
  const el = $('#status'); if (!el) return;
  const [text, cls] = LABELS[kind] ?? ['', ''];
  el.className = `status ${cls}`; el.textContent = detail ? `${text} (${detail})` : text;
  if (kind === 'saved') setTimeout(() => { if (el.textContent === text) { el.textContent = ''; el.className = 'status'; } }, 2500);
}

export function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type })); const a = document.createElement('a');
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const cell = (v) => { let s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
export const toCSV = (rows, cols) => [cols.map(cell).join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n');

export function modal(html, onMount) {
  const m = $('#modal'); m.innerHTML = html; if (!m.open) m.showModal();
  $$('[data-close]', m).forEach((b) => b.addEventListener('click', () => m.close()));
  onMount?.(m); return m;
}
export const closeModal = () => $('#modal').close();

// Field spec -> form. Values are read back with the right types; empty optional fields become null (update) or are omitted (create).
export function fieldHTML(f, v, refs) {
  const val = v ?? '', id = `f_${f.k}`, req = f.req ? 'required' : '';
  let input;
  if (f.t === 'select') input = `<select id="${id}" name="${f.k}" ${req}>${f.req ? '' : '<option value=""></option>'}${f.o.map((o) => `<option ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  else if (f.t === 'ref') input = `<select id="${id}" name="${f.k}" ${req}>${f.req ? '' : '<option value=""></option>'}${(refs[f.res] || []).map((r) => `<option value="${r.id}" ${r.id === val ? 'selected' : ''}>${esc(r[f.label])}</option>`).join('')}</select>`;
  else if (f.t === 'textarea') input = `<textarea id="${id}" name="${f.k}" rows="3" maxlength="${f.max || 5000}">${esc(val)}</textarea>`;
  else if (f.t === 'checkbox') input = `<input id="${id}" name="${f.k}" type="checkbox" ${v ? 'checked' : ''}>`;
  else if (f.t === 'time') input = `<input id="${id}" name="${f.k}" type="time" value="${esc(String(val).slice(0, 5))}">`;
  else if (f.t === 'datetime') input = `<input id="${id}" name="${f.k}" type="datetime-local" value="${localInput(v)}" ${req}>`;
  else if (f.t === 'number') input = `<input id="${id}" name="${f.k}" type="number" min="${f.min ?? ''}" max="${f.max ?? ''}" step="${f.step ?? 1}" value="${esc(val)}" ${req}>`;
  else input = `<input id="${id}" name="${f.k}" type="${f.t || 'text'}" value="${esc(String(val).slice(0, f.t === 'date' ? 10 : 500))}" maxlength="500" ${req}>`;
  return `<label class="${f.t === 'checkbox' ? 'inline' : ''}">${esc(f.l)}${input}</label>`;
}
export function readForm(form, fields, creating) {
  const out = {};
  for (const f of fields) {
    const el = form.elements[f.k]; if (!el) continue;
    let v;
    if (f.t === 'checkbox') v = el.checked;
    else if (el.value === '') v = creating ? undefined : null;
    else if (f.t === 'number') v = Number(el.value);
    else if (f.t === 'datetime') v = new Date(el.value).toISOString();
    else v = el.value;
    if (v !== undefined) out[f.k] = v;
  }
  return out;
}
