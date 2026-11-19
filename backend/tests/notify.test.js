import assert from 'node:assert/strict';
import { toMin, minutesSince, inWindow, validateNotifications } from '../services/notify-logic.js';
assert.equal(toMin('07:30'), 450);
assert.equal(minutesSince('08:00', '07:30'), 30);
assert.equal(minutesSince('00:10', '23:50'), 20);            // wraps midnight
assert.ok(inWindow('08:00', '07:30', 180)); assert.ok(!inWindow('07:00', '07:30', 180)); assert.ok(!inWindow('11:00', '07:30', 180));
assert.ok(!inWindow('08:00', '', 180)); assert.ok(!inWindow('08:00', '25:99', 180));
assert.deepEqual(validateNotifications({ schedule: true, lead: 15, morning: '07:00', review: '' }).value, { schedule: true, lead: 15, morning: '07:00', review: '' });
for (const bad of [{ lead: 500 }, { lead: 1.5 }, { schedule: 'yes' }, { morning: '7am' }, { evil: 1 }, null, []]) assert.ok(validateNotifications(bad).error, JSON.stringify(bad));
console.log('notify tests passed');
