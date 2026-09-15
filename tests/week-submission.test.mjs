import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('Camp separates planning submission from implementation results and does not claim upload',()=>{
 const s=readFileSync('skills/start/SKILL.md','utf8');
 assert.match(s,/week 1 invokes `sparker-discovery:week1-submit`/);
 assert.match(s,/week 2 invokes `sparker-discovery:week2-submit`/);
 assert.match(s,/If week is unknown, ask only which week, once/);
 assert.match(s,/Preparing files does not mean uploading/);
 const r=readFileSync('README.md','utf8');
 assert.match(r,/## 1주차: 기획서 작성·제출/);
 assert.match(r,/## 2주차: 기획서로 프로그램 만들기/);
 assert.match(r,/week1-submit/);assert.match(r,/week2-submit/);
});
