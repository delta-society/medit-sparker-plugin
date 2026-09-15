import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';

test('week2 class/homework binds and resumes without changing existing session activity',()=>{
 const root=mkdtempSync(join(tmpdir(),'sparker-week2-'));
 const cli=resolve('camp/cli.mjs');
 const run=(args,input)=>spawnSync(process.execPath,[cli,...args],{cwd:root,env:{...process.env,CAMP_SPOOL_DIR:join(root,'spool')},input,encoding:'utf8',timeout:10000});
 try {
  for (const phase of ['class','homework']) {
   const id=randomUUID();
   const transcript=join(root,id+".jsonl");writeFileSync(transcript,"SYNTHETIC TEST\n");
   assert.equal(run(["hook"],JSON.stringify({session_id:id,cwd:root,transcript_path:transcript,hook_event_name:"SessionStart"})).status,0);
   const start=run(['start',id,'2',phase]);assert.equal(start.status,0,start.stderr);
   const state=JSON.parse(run(['participant-status',id]).stdout);
   assert.equal(state.week,2);assert.equal(state.phase,phase);assert.equal(state.server_received,false);
   assert.equal(run(['start',id,'2',phase]).status,0);
   const changed=run(['start',id,'1',phase]);assert.notEqual(changed.status,0);
   assert.equal(JSON.parse(run(['participant-status',id]).stdout).week,2);
  }
 } finally {rmSync(root,{recursive:true,force:true});}
});

test('participant routing points to installed week2 while retaining week1 and consent boundaries',()=>{
 const skill=readFileSync('skills/start/SKILL.md','utf8');
 assert.match(skill,/sparker-discovery:week2/);
 assert.match(skill,/sparker-discovery:week1/);
 assert.match(skill,/For weeks 3–4/);
 assert.match(skill,/recording status \(including any failure\)/);
 assert.match(skill,/do not bind until clarified/);
});
