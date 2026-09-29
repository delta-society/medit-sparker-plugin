import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
test('week3 class/homework resumes and never switches another bound week',()=>{
 const root=mkdtempSync(join(tmpdir(),'sparker-week3-'));const cli=resolve('camp/cli.mjs');
 const run=(args,input)=>spawnSync(process.execPath,[cli,...args],{cwd:root,env:{...process.env,CAMP_SPOOL_DIR:join(root,'spool')},input,encoding:'utf8',timeout:10000});
 try{for(const phase of ['class','homework']){
  const id=randomUUID(),transcript=join(root,id+'.jsonl');writeFileSync(transcript,'SYNTHETIC TEST\n');
  assert.equal(run(['hook'],JSON.stringify({session_id:id,cwd:root,transcript_path:transcript,hook_event_name:'SessionStart'})).status,0);
  assert.equal(run(['start',id,'3',phase]).status,0);
  const s=JSON.parse(run(['participant-status',id]).stdout);assert.equal(s.week,3);assert.equal(s.phase,phase);assert.equal(s.server_received,false);
  assert.equal(run(['start',id,'3',phase]).status,0);
  assert.notEqual(run(['start',id,'2',phase]).status,0);
  assert.equal(JSON.parse(run(['participant-status',id]).stdout).week,3);
 }}finally{rmSync(root,{recursive:true,force:true});}
});
test('week3 entry preserves consent, known context and incomplete export',()=>{
 const s=readFileSync('skills/start/SKILL.md','utf8');
 for(const word of ['sparker-discovery:week1','sparker-discovery:week2','sparker-discovery:week3','do not bind until clarified','including incomplete and blocked work','/plugin update sparker-camp@sparker','without editing product code'])assert.ok(s.includes(word),word);
});
