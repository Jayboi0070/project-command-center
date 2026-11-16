import assert from 'node:assert/strict';
import { RESOURCES, validate } from '../services/resources.js';
const P = RESOURCES.projects;
const ok = (b, partial = false) => validate(P, b, partial);
assert.equal(ok({ name: 'X', category: 'Research' }).errors.length, 0);
assert.ok(ok({ category: 'Research' }).errors.some((e) => e.includes('name is required')));
assert.ok(ok({ name: 'X', category: 'Nope' }).errors.length);                       // bad enum
assert.ok(ok({ name: 'X', category: 'Research', user_id: 'evil' }).errors.some((e) => e.includes('Unknown field'))); // cannot inject user_id
assert.ok(ok({ name: 'X', category: 'Research', progress: 101 }).errors.length);     // range
assert.ok(ok({ name: 'X', category: 'Research', live_url: 'javascript:alert(1)' }).errors.length); // url scheme
assert.ok(ok({ name: 'X', category: 'Research', id: 'abc' }).errors.length);         // cannot set id
assert.equal(ok({ progress: 50 }, true).errors.length, 0);                           // partial update ok
assert.ok(ok({ name: 'X', category: 'Research', client_id: 'bad' }).errors.length);
assert.ok(validate(RESOURCES.financial_records, { entry_date: '2026-13-45x', type: 'expense', amount: 5 }, false).errors.length);
assert.ok(validate(RESOURCES.financial_records, { entry_date: '2026-11-16', type: 'expense', amount: -5 }, false).errors.length > 0);
assert.equal(validate(RESOURCES.financial_records, { entry_date: '2026-11-16', type: 'expense', amount: 5 }, false).errors.length, 0);
console.log('validation tests passed');
