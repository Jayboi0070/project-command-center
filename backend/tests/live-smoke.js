// Run AFTER deploying. Exercises the real API + real Neon database end to end.
//   API_URL=https://xxx.vercel.app EMAIL=you@example.com PASSWORD='...' node tests/live-smoke.js
import assert from 'node:assert/strict';
const { API_URL, EMAIL, PASSWORD } = process.env;
if (!API_URL || !EMAIL || !PASSWORD) { console.error('Set API_URL, EMAIL, PASSWORD'); process.exit(1); }
let token, pass = 0;
const call = async (method, path, body, auth = true) => {
  const r = await fetch(API_URL + path, { method, headers: { 'Content-Type': 'application/json', ...(auth && token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: r.status === 204 ? null : await r.json().catch(() => null) };
};
const ok = (name, fn) => fn().then(() => { pass++; console.log('PASS', name); }).catch((e) => { console.log('FAIL', name, '-', e.message); process.exitCode = 1; });
const cid = () => crypto.randomUUID();

await ok('rejects unauthenticated access', async () => assert.equal((await call('GET', '/api/records/projects', null, false)).status, 401));
await ok('rejects wrong password', async () => assert.equal((await call('POST', '/api/auth/login', { email: EMAIL, password: 'definitely-wrong-password' }, false)).status, 401));
await ok('login', async () => { const r = await call('POST', '/api/auth/login', { email: EMAIL, password: PASSWORD }, false); assert.equal(r.status, 200); token = r.body.token; });
let id; const client_id = cid();
await ok('create project', async () => { const r = await call('POST', '/api/records/projects', { name: 'SMOKE TEST', category: 'Research', client_id }); assert.equal(r.status, 201); id = r.body.row.id; });
await ok('duplicate submit returns same row (no duplicate)', async () => { const r = await call('POST', '/api/records/projects', { name: 'SMOKE TEST', category: 'Research', client_id }); assert.equal(r.body.duplicate, true); assert.equal(r.body.row.id, id); });
await ok('edit project', async () => { const r = await call('PATCH', `/api/records/projects/${id}`, { progress: 55 }); assert.equal(r.body.row.progress, 55); });
await ok('persisted on re-read', async () => { const r = await call('GET', '/api/records/projects'); assert.equal(r.body.rows.find((p) => p.id === id).progress, 55); });
await ok('validation rejects bad input', async () => assert.equal((await call('POST', '/api/records/projects', { name: 'x', category: 'Nope' })).status, 400));
await ok('cannot inject user_id', async () => assert.equal((await call('POST', '/api/records/projects', { name: 'x', category: 'Research', user_id: cid() })).status, 400));
await ok('dashboard computes from DB', async () => { const r = await call('GET', '/api/dashboard'); assert.equal(r.status, 200); assert.equal(typeof r.body.score, 'number'); });
await ok('report', async () => { const d = new Date().toISOString().slice(0, 10); const r = await call('GET', `/api/reports?from=${d.slice(0, 8)}01&to=${d}`); assert.equal(r.status, 200); });
await ok('settings', async () => assert.equal((await call('GET', '/api/settings')).status, 200));
let backup;
await ok('backup export', async () => { const r = await call('GET', '/api/backup/export'); assert.equal(r.status, 200); backup = r.body; assert.ok(backup.tables.projects.some((p) => p.id === id)); });
await ok('restore dry-run accepts valid backup', async () => { const r = await call('POST', '/api/backup/restore', { backup, dryRun: true }); assert.equal(r.status, 200); });
await ok('restore rejects tampered backup', async () => { const bad = structuredClone(backup); bad.tables.projects[0].name = 'tampered'; assert.equal((await call('POST', '/api/backup/restore', { backup: bad, dryRun: true })).status, 400); });
await ok('delete project, then restore brings it back without touching others', async () => {
  assert.equal((await call('DELETE', `/api/records/projects/${id}`)).status, 204);
  const r = await call('POST', '/api/backup/restore', { backup }); assert.equal(r.status, 200); assert.ok(r.body.restored.projects >= 1);
  assert.ok((await call('GET', '/api/records/projects')).body.rows.some((p) => p.id === id));
});
await call('DELETE', `/api/records/projects/${id}`);   // clean up
console.log(`\n${pass} checks passed${process.exitCode ? ' (some FAILED, see above)' : ''}`);
