import { API_BASE } from './config.js';
const TK = 'pcc_token', QK = 'pcc_queue', FK = 'pcc_failed';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const load = (k) => { try { return JSON.parse(localStorage.getItem(k)) ?? []; } catch { return []; } };
const store = (k, v) => localStorage.setItem(k, JSON.stringify(v));
let onStatus = () => {};
export const setStatusHandler = (f) => { onStatus = f; };
export const uuid = () => crypto.randomUUID();

export function token() {
  try { const t = JSON.parse(localStorage.getItem(TK)); if (t && t.exp > Date.now()) return t.v; } catch { /* ignore */ }
  localStorage.removeItem(TK); return null;
}
export const setToken = (v, sec) => localStorage.setItem(TK, JSON.stringify({ v, exp: Date.now() + sec * 1000 - 60000 }));
export const logout = () => localStorage.removeItem(TK);
export const queued = () => load(QK).length;
export const failedWrites = () => load(FK);
export const clearFailed = () => store(FK, []);

export class ApiError extends Error { constructor(status, message, details) { super(message); this.status = status; this.details = details; } }
class NetError extends Error {}

async function once(method, path, body) {
  let res;
  try {
    res = await fetch(API_BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  } catch { throw new NetError('network'); }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token()) { logout(); window.dispatchEvent(new Event('pcc:unauth')); }
    throw new ApiError(res.status, data.error || `Request failed (${res.status})`, data.details);
  }
  return data;
}
// Retries temporary failures (network drop, 502/503/504) with backoff.
async function request(method, path, body) {
  for (let a = 0; ; a++) {
    try { return await once(method, path, body); }
    catch (e) {
      const temp = e instanceof NetError || (e instanceof ApiError && [502, 503, 504].includes(e.status));
      if (!temp || a >= 2) throw e;
      await sleep(600 * 2 ** a);
    }
  }
}
export const get = (path) => request('GET', path);
export const post = (path, body) => request('POST', path, body);

// Writes: "Saved" is only reported after the server confirms. Network failures go to the offline queue and sync later.
export async function write(method, path, body) {
  onStatus('saving');
  try {
    const out = await request(method, path, body);
    onStatus('saved'); return { ok: true, data: out };
  } catch (e) {
    if (e instanceof NetError || (e instanceof ApiError && [502, 503, 504].includes(e.status))) {
      store(QK, [...load(QK), { method, path, body, at: Date.now() }]);
      onStatus('offline'); return { ok: false, queued: true };
    }
    onStatus('failed', e.message); throw e;
  }
}
let flushing = false;
export async function flush() {
  if (flushing || !token()) return;
  flushing = true;
  try {
    let q = load(QK);
    while (q.length) {
      try { await once(q[0].method, q[0].path, q[0].body); q.shift(); store(QK, q); }
      catch (e) {
        if (e instanceof NetError || (e instanceof ApiError && [401, 429, 502, 503, 504].includes(e.status))) break;
        store(FK, [...load(FK), { ...q[0], error: e.message }]); q.shift(); store(QK, q);   // permanent rejection: keep for review, never silently drop
      }
    }
    onStatus(q.length ? 'offline' : failedWrites().length ? 'failed' : 'saved', failedWrites().length ? `${failedWrites().length} queued change(s) were rejected` : undefined);
    window.dispatchEvent(new Event('pcc:synced'));
  } finally { flushing = false; }
}
window.addEventListener('online', flush);
window.addEventListener('offline', () => onStatus('lost'));
