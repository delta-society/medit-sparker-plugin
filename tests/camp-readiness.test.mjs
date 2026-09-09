import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,appendFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Queue} from '../camp/queue.mjs';
import {probe,captureReadiness,queuedReadiness} from '../camp/readiness.mjs';
import {report} from '../camp/transport.mjs';
const runner=async args=>args[0]==='--version'?{ok:true,stdout:'2.1.0 (Claude Code)'}:{ok:true,stdout:JSON.stringify({loggedIn:true,authMethod:'claudeai',subscriptionType:'pro',email:'PRIVATE_EMAIL',org:'PRIVATE_ORG',token:'PRIVATE_TOKEN'})};
test('probe only projects allowlisted fields, preserves logged-out and unknown subscription',async()=>{
 const data=await probe(runner);assert.equal(data.loggedIn,true);assert.equal(data.subscriptionType,'pro');assert(!JSON.stringify(data).includes('PRIVATE'));
 const out=await probe(async args=>args[0]==='--version'?runner(args):{ok:true,stdout:'{"loggedIn":false,"subscriptionType":"max"}'});assert.equal(out.loggedIn,false);assert.equal(out.subscriptionType,'unknown');
 const missing=await probe(async args=>args[0]==='--version'?runner(args):{ok:true,stdout:'{"loggedIn":true,"authMethod":"claudeai"}'});assert.equal(missing.subscriptionType,'unknown');
 const error=await probe(async()=>({ok:false,stdout:'PRIVATE_ERROR_PATH'}));assert.equal(error.probeStatus,'failed');assert(!JSON.stringify(error).includes('PRIVATE'));
});
test('explicit capture requires enrollment + existing scoped binding; persists metadata and forwards in existing report',async()=>{
 const root=mkdtempSync(join(tmpdir(),'readiness-')),spool=join(root,'spool'),path=join(root,'main');let q=new Queue(spool);
 try {
  const session=randomUUID(),config={origin:'https://synthetic.example',token:'a'.repeat(43),owner_id:'synthetic-owner',camp_id:'synthetic-camp'};
  await assert.rejects(captureReadiness(q,spool,session,root,{runner}));
  writeFileSync(join(spool,'connection.json'),JSON.stringify(config));
  await assert.rejects(captureReadiness(q,spool,session,root,{runner}));
  writeFileSync(path,'BEFORE');const binding=q.bind({session,cwd:root,week:1,phase:'class',transcript:path});
  const first=await captureReadiness(q,spool,session,root,{runner});assert.equal(first.firstRunObserved,null);
  appendFileSync(path,'AFTER');q.capture(binding,path);const observed=await captureReadiness(q,spool,session,root,{runner});assert.equal(observed.firstRunObserved,true);
  assert.equal(queuedReadiness(q,binding,{...config,owner_id:'other'}),null);
  q.db.prepare('UPDATE bindings SET bound=1 WHERE id=?').run(binding);q.close();q=new Queue(spool);
  const sent=[];const send=async(c,op,p)=>{sent.push({op,p});return {}};
  await report(q,config,send);assert.equal(sent.length,1);assert.equal(sent[0].op,'report');assert.deepEqual(sent[0].p.report.readiness,observed);
  assert(!JSON.stringify(sent[0].p.report.readiness).includes('PRIVATE'));
  await report(q,config,send);assert.equal(sent.length,1);
  await captureReadiness(q,spool,session,root,{runner});await report(q,config,send);assert.equal(sent.length,2);
  // Failed delivery never marks the new diagnostic report acknowledged.
  await captureReadiness(q,spool,session,root,{runner});await assert.rejects(report(q,config,async()=>{throw Error('offline')}));
  await report(q,config,send);assert.equal(sent.length,3);
 } finally {q.close();rmSync(root,{recursive:true,force:true});}
});
test('actual command wrapper accepts logged-out exit 1 and suppresses oversized output',async()=>{
 const {chmodSync}=await import('node:fs'),{runCommand}=await import('../camp/readiness.mjs');
 const root=mkdtempSync(join(tmpdir(),'readiness-bin-')),old=process.env.PATH;
 try {
  const bin=join(root,'claude');writeFileSync(bin,'#!/bin/sh\nprintf \'{"loggedIn":false,"email":"PRIVATE_EMAIL"}\'\nexit 1\n');chmodSync(bin,0o700);process.env.PATH=root;
  const loggedOut=await runCommand(['auth','status','--json']);assert.equal(loggedOut.ok,true);
  const result=await probe(async args=>args[0]==='--version'?{ok:true,stdout:'2.1.0'}:loggedOut);assert.equal(result.loggedIn,false);assert(!JSON.stringify(result).includes('PRIVATE'));
  writeFileSync(bin,'#!'+process.execPath+'\nprocess.stdout.write("A".repeat(20000))\n');
  const oversized=await runCommand(['auth','status','--json']);assert.equal(oversized.ok,false);assert.equal(oversized.stdout,'');
 } finally {process.env.PATH=old;rmSync(root,{recursive:true,force:true});}
});
test('explicit diagnostic handover revokes only own spool lease and stale heartbeat/cleanup cannot replace new worker',async()=>{
 const {handoverReadinessWorker}=await import('../camp/readiness.mjs');
 const root=mkdtempSync(join(tmpdir(),'readiness-handover-')),q=new Queue(join(root,'one')),other=new Queue(join(root,'other'));
 try {
  assert.equal(handoverReadinessWorker(q),false);
  for(const queue of [q,other]) {
   queue.db.exec('CREATE TABLE worker(id INTEGER PRIMARY KEY,until INTEGER NOT NULL,token TEXT NOT NULL)');
   queue.db.prepare('INSERT INTO worker VALUES(1,?,?)').run(Date.now()+60000,'OLD');
  }
  assert.equal(handoverReadinessWorker(q),true);
  assert.equal(q.db.prepare('SELECT until FROM worker WHERE id=1').get().until,0);
  assert.equal(q.db.prepare('UPDATE worker SET until=? WHERE id=1 AND token=?').run(Date.now()+60000,'OLD').changes,0);
  const claimed=q.transaction(()=>{const row=q.db.prepare('SELECT until FROM worker WHERE id=1').get();if(row?.until>Date.now())return false;q.db.prepare('INSERT OR REPLACE INTO worker VALUES(1,?,?)').run(Date.now()+60000,'NEW');return true;});
  assert.equal(claimed,true);
  q.db.prepare('DELETE FROM worker WHERE id=1 AND token=?').run('OLD');
  assert.equal(q.db.prepare('SELECT token FROM worker WHERE id=1').get().token,'NEW');
  assert.equal(other.db.prepare('SELECT token FROM worker WHERE id=1').get().token,'OLD');
 } finally {q.close();other.close();rmSync(root,{recursive:true,force:true});}
});
test('ordinary hooks leave a live worker lease intact',async()=>{
 const {spawnSync}=await import('node:child_process');
 const root=mkdtempSync(join(tmpdir(),'readiness-hook-')),q=new Queue(root);
 try {
  q.db.exec('CREATE TABLE worker(id INTEGER PRIMARY KEY,until INTEGER NOT NULL,token TEXT NOT NULL)');
  const until=Date.now()+60000;q.db.prepare('INSERT INTO worker VALUES(1,?,?)').run(until,'UNCHANGED');
  const child=spawnSync(process.execPath,[new URL('../camp/cli.mjs',import.meta.url).pathname,'hook'],{input:JSON.stringify({hook_event_name:'SessionStart',session_id:randomUUID(),cwd:root}),encoding:'utf8',env:{...process.env,CAMP_SPOOL_DIR:root}});
  assert.equal(child.status,0);
  const row=q.db.prepare('SELECT token,until FROM worker WHERE id=1').get();assert.equal(row.token,'UNCHANGED');assert.equal(row.until,until);
 } finally {q.close();rmSync(root,{recursive:true,force:true});}
});
