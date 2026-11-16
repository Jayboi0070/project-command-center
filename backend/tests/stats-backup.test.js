import assert from 'node:assert/strict';
import { dayStats, series, consistency, addDays } from '../services/stats.js';
import { validateBackup, checksum } from '../services/backup-validate.js';

// scoring: hitting every target = 100; huge hours in one area cannot exceed its cap
const full = [['reading',90],['research',120],['development',180],['business',30],['exercise',30],['review',15]].map(([kind,m]) => ({ kind, m, total: 1, done: 1 }));
assert.equal(dayStats(full).score, 100);
assert.equal(dayStats(full).completion, 100);
assert.equal(dayStats([{ kind: 'development', m: 2000, total: 1, done: 0 }]).score, 17);   // 1/6 only
assert.equal(dayStats([]).score, 0);
assert.equal(addDays('2026-11-30', 1), '2026-12-01');
const s = series([{ day: '2026-11-16', ...full[0] }], '2026-11-16', 7, undefined);
assert.equal(s.length, 7); assert.equal(s[6].day, '2026-11-16'); assert.equal(consistency(s), 0);

// backup validation
const U = '11111111-1111-4111-8111-111111111111';
const proj = { id: '22222222-2222-4222-8222-222222222222', user_id: 'other', client_id: null, name: 'App', description: null, category: 'Research', priority: 'medium', status: 'idea',
  start_date: null, deadline: null, progress: 0, next_milestone: null, notes: null, github_url: null, live_url: null, archived: false, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' };
const mk = (tables) => ({ app: 'project-command-center', version: 1, tables, checksum: checksum(tables) });
const good = validateBackup(mk({ projects: [proj] }), U);
assert.equal(good.errors.length, 0);
assert.equal(good.clean.projects[0].user_id, U);                       // forced to current user, never trusted from file
assert.ok(validateBackup({ ...mk({ projects: [proj] }), checksum: 'x' }, U).errors[0].includes('Checksum'));
assert.ok(validateBackup({ hello: 1 }, U).errors.length);
assert.ok(validateBackup(mk({ projects: [{ ...proj, category: 'Hack' }] }), U).errors.length);
assert.ok(validateBackup(mk({ users: [] }), U).errors.some((e) => e.includes('Unexpected table')));
assert.ok(validateBackup(mk({ projects: [{ ...proj, id: 'nope' }] }), U).errors.length);
const { name, ...incomplete } = proj;
assert.ok(validateBackup(mk({ projects: [incomplete] }), U).errors.length);
console.log('stats + backup tests passed');
