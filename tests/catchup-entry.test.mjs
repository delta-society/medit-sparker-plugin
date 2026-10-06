import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('catchup routes before activity binding without reclassifying past sessions', () => {
 const skill=readFileSync('skills/start/SKILL.md','utf8');
 const lane=skill.slice(skill.indexOf('## Submit previous weeks together'),skill.indexOf('## Choose the activity'));
 for (const text of ['sparker-discovery:catchup-submit','BEFORE','existing Camp binding/recording status unchanged','do not relabel','Submit the Week4 final ZIP separately','never reads Camp credentials']) assert.ok(lane.includes(text),text);
 assert.ok(readFileSync('README.md','utf8').includes('/sparker-discovery:catchup-submit'));
});
