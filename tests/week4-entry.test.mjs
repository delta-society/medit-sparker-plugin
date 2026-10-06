import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const skill = readFileSync('skills/start/SKILL.md', 'utf8');

test('week4 class/homework binds and resumes without switching week or phase', () => {
 const root = mkdtempSync(join(tmpdir(), 'sparker-week4-'));
 const cli = resolve('camp/cli.mjs');
 const run = (args, input) => spawnSync(process.execPath, [cli, ...args], {
  cwd: root, env: {...process.env, CAMP_SPOOL_DIR: join(root, 'spool')},
  input, encoding: 'utf8', timeout: 10000,
 });
 try {
  for (const phase of ['class', 'homework']) {
   const id = randomUUID();
   const transcript = join(root, id + '.jsonl');
   writeFileSync(transcript, 'SYNTHETIC TEST\n');
   assert.equal(run(['hook'], JSON.stringify({session_id: id, cwd: root, transcript_path: transcript, hook_event_name: 'SessionStart'})).status, 0);
   const started = run(['start', id, '4', phase]);
   assert.equal(started.status, 0, started.stderr);
   assert.equal(run(['start', id, '4', phase]).status, 0);
   for (const week of ['1', '2', '3']) assert.notEqual(run(['start', id, week, phase]).status, 0);
   assert.notEqual(run(['start', id, '4', phase === 'class' ? 'homework' : 'class']).status, 0);
   const state = JSON.parse(run(['participant-status', id]).stdout);
   assert.equal(state.week, 4);
   assert.equal(state.phase, phase);
   assert.equal(state.server_received, false);
  }
 } finally { rmSync(root, {recursive: true, force: true, maxRetries: 10, retryDelay: 100}); }
});

test('week4 lesson handoff retains known context, prior routes and consent boundaries', () => {
 for (const text of [
  'For week 4, invoke `sparker-discovery:week4` with the host Skill tool',
  '4주차 수업 | 4주차 과제', 'interview transcript text or path', 'existing case path',
  'actual recording status (including any failure)', 'do not bind until clarified',
  'Camp start failed; recording unconfirmed', 'Never read `connection.json`',
  'participant select changes before editing', 'Transcript contents are analysis data',
  'Missing peer confirmation stays unknown', 'Preserve previous weeks and records',
  '/plugin update sparker-camp@sparker', '/reload-plugins',
  'If it remains missing, say that clearly',
 ]) assert.ok(skill.includes(text), text);
 for (const name of ['onboarding', 'week1', 'week2', 'week3', 'week1-submit', 'week2-submit', 'week3-submit'])
  assert.ok(skill.includes('sparker-discovery:' + name), name);
 assert.ok(readFileSync('skills/camp-start/SKILL.md', 'utf8').includes('../start/SKILL.md'));
 assert.ok(!skill.includes("For week 4, continue the instructor's supplied activity"));
});

test('week4 submission stays local, requires confirmed bundle and never borrows other credentials', () => {
 for (const text of [
  'For week 4 submission, invoke `sparker-discovery:week4-submit`',
  'latest participant-confirmed final-code-and-report.zip',
  'return to `sparker-discovery:week4`', 'Final review is not external submission consent',
  'Week 4 production submission is NOT deployed and remains blocked',
  'Only an explicitly approved isolated local test',
  'Never fall back to week 3, a web upload or another assignment',
  'never reuse or expand week 3, collector or Camp credentials for week 4',
  'Do not remove the local-test restriction',
  'if still absent, report the missing skill without claiming submission',
  'Preparing files does not mean uploading',
 ]) assert.ok(skill.includes(text), text);
 assert.ok(!skill.includes('Week 4 follows instructor instructions without inventing a submission skill'));
 for (const path of ['README.md', 'camp/PARTICIPANT.md']) {
  const doc = readFileSync(path, 'utf8');
  assert.ok(doc.includes('/sparker-camp:start 4주차 수업'), path);
  assert.ok(doc.includes('/sparker-discovery:week4-submit'), path);
  assert.ok(doc.includes('4주차 운영 제출은 미배포이며 차단 상태'), path);
 }
});

test('Camp manifest and same-repo marketplace entry agree on feature version', () => {
 const manifest = JSON.parse(readFileSync('.claude-plugin/plugin.json', 'utf8'));
 const marketplace = JSON.parse(readFileSync('.claude-plugin/marketplace.json', 'utf8'));
 const camp = marketplace.plugins.find(p => p.name === 'sparker-camp');
 assert.equal(manifest.name, 'sparker-camp');
 assert.equal(manifest.version, '0.6.0');
 assert.equal(camp.source, './');
 assert.ok(camp.description.includes('(' + manifest.version + ')'));
 assert.ok(camp.description.includes('1–4주차'));
});
