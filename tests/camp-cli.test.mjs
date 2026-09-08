import test from 'node:test';
import * as awaitFs from 'node:fs';
const mkdirForTest=awaitFs.mkdirSync;
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,appendFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {Queue} from '../camp/queue.mjs';
test('real CLI hooks register metadata only, explicit start excludes history, unrelated sessions ignored, end captures final bytes',()=>{
 const root=mkdtempSync(join(tmpdir(),'캠프 공백-')),transcript=join(root,'session.jsonl'),spool=join(root,'spool'),session=randomUUID(),cli=resolve('camp/cli.mjs');let q;
 const run=(args,input)=>{const r=spawnSync(process.execPath,[cli,...args],{cwd:root,env:{...process.env,CAMP_SPOOL_DIR:spool},input,encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stderr);return r.stdout;};
 const hook=name=>run(['hook'],JSON.stringify({session_id:session,cwd:root,transcript_path:transcript,hook_event_name:name}));
 try{
  writeFileSync(transcript,'BEFORE START\n');hook('SessionStart');q=new Queue(spool);assert.equal(q.pending().length,0);q.close();q=null;
  run(['start',session,'1','homework']);appendFileSync(transcript,'AFTER START\n');hook('Stop');
  run(['hook'],JSON.stringify({session_id:randomUUID(),cwd:root,transcript_path:transcript,hook_event_name:'Stop'}));
  appendFileSync(transcript,'FINAL BYTES\n');hook('SessionEnd');q=new Queue(spool);const chunks=q.pending().map(c=>JSON.parse(c.payload));assert.equal(chunks.map(c=>Buffer.from(c.data_base64,'base64').toString()).join(''),'AFTER START\nFINAL BYTES\n');assert.equal(chunks.at(-1).final,true);assert.equal(q.db.prepare('SELECT closed FROM bindings').get().closed,1);
 }finally{q?.close();rmSync(root,{recursive:true,force:true});}
});
test('missing main cannot suppress agent/end metadata; stop-before-start is recovered without reading unassociated agent',()=>{
 const root=mkdtempSync(join(tmpdir(),'camp-hook-order-')),transcript=join(root,'main.jsonl'),agentPath=join(root,'agent.jsonl'),spool=join(root,'spool'),session=randomUUID(),cli=resolve('camp/cli.mjs');let q;
 const run=(args,input)=>{const r=spawnSync(process.execPath,[cli,...args],{cwd:root,env:{...process.env,CAMP_SPOOL_DIR:spool},input,encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stderr);};
 const hook=(name,extra={})=>run(['hook'],JSON.stringify({session_id:session,cwd:root,transcript_path:transcript,hook_event_name:name,...extra}));
 try{writeFileSync(transcript,'BEFORE\n');writeFileSync(agentPath,'TEST ONLY AGENT\n');hook('SessionStart');run(['start',session,'1','class']);rmSync(transcript);
 hook('SubagentStop',{agent_id:'test-agent',agent_transcript_path:agentPath});q=new Queue(spool);assert.equal(q.db.prepare("SELECT count(*) n FROM source_intents WHERE kind='subagent'").get().n,0);q.close();q=null;
 hook('SubagentStart',{agent_id:'test-agent'});hook('SessionEnd');q=new Queue(spool);assert.equal(q.db.prepare("SELECT count(*) n FROM source_intents WHERE kind='subagent'").get().n,1);assert.equal(q.db.prepare('SELECT count(*) n FROM pending_agent_stops').get().n,0);assert.equal(q.db.prepare('SELECT closed FROM bindings').get().closed,1);assert(q.pending().some(c=>Buffer.from(JSON.parse(c.payload).data_base64,'base64').toString().includes('TEST ONLY AGENT')));
 }finally{q?.close();rmSync(root,{recursive:true,force:true});}
});

test('new unbound host session resumes old durable pending without collecting the new transcript',async()=>{
 const {createServer}=await import('node:http'),{setTimeout:delay}=await import('node:timers/promises'),{createHash}=await import('node:crypto');
 const root=mkdtempSync(join(tmpdir(),'camp-restart-')),spool=join(root,'spool'),transcript=join(root,'old.jsonl'),fresh=join(root,'fresh.jsonl'),session=randomUUID();
 let q=new Queue(spool),server;const config={token:'t'.repeat(43),camp_id:'TEST_ONLY_CAMP',owner_id:'test-owner'};
 try{
  writeFileSync(transcript,'');writeFileSync(fresh,'TEST ONLY unrelated session');const binding=q.bind({session,cwd:root,week:1,phase:'class',transcript});appendFileSync(transcript,'TEST ONLY pending after restart');q.capture(binding,transcript,{final:true});q.db.prepare('UPDATE bindings SET closed=1 WHERE id=?').run(binding);
  server=createServer(async(req,res)=>{let body='';for await(const p of req)body+=p;const p=JSON.parse(body);let result={};
   if(req.url.endsWith('/bind'))result={...p,camp_id:config.camp_id};
   if(req.url.endsWith('/chunk'))result={receipt:{...p,session_id:session,receipt_id:createHash('sha256').update('TEST ONLY RECEIPT').digest('hex'),received_at:new Date().toISOString()}};
   res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify(result));
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));config.origin='http://127.0.0.1:'+server.address().port;writeFileSync(join(spool,'connection.json'),JSON.stringify(config));
  const child=spawnSync(process.execPath,[resolve('camp/cli.mjs'),'hook'],{cwd:root,env:{...process.env,CAMP_SPOOL_DIR:spool,CAMP_TEST_LOOPBACK:'1'},input:JSON.stringify({session_id:randomUUID(),cwd:root,transcript_path:fresh,hook_event_name:'SessionStart'}),encoding:'utf8',timeout:10000});assert.equal(child.status,0,child.stderr);
  const deadline=Date.now()+15000;while(q.pending().length&&Date.now()<deadline)await delay(50);assert.equal(q.pending().length,0);assert.equal(q.db.prepare('SELECT count(*) n FROM bindings').get().n,1);
  while(q.db.prepare("SELECT count(*) n FROM sqlite_master WHERE name='worker'").get().n&&q.db.prepare('SELECT count(*) n FROM worker').get().n&&Date.now()<deadline)await delay(50);
 }finally{
  q.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}
  // The detached worker releases its lease before Windows releases its cwd.
  // Retry only cleanup; delivery and session-isolation assertions stay strict.
  await awaitFs.promises.rm(root,{recursive:true,force:true,maxRetries:10,retryDelay:100});
 }
});

test('host cwd alias and canonical process cwd resolve to the same explicit session',()=>{
 const {symlinkSync,realpathSync}=awaitFs;
 const root=mkdtempSync(join(tmpdir(),'camp-cwd-')),actual=join(root,'actual'),alias=join(root,'alias'),spool=join(root,'spool'),session=randomUUID(),cli=resolve('camp/cli.mjs');
 try{mkdirForTest(actual);symlinkSync(actual,alias,process.platform==='win32'?'junction':'dir');const transcript=join(actual,'session.jsonl');writeFileSync(transcript,'TEST ONLY before');
 const env={...process.env,CAMP_SPOOL_DIR:spool},hook=spawnSync(process.execPath,[cli,'hook'],{cwd:actual,env,input:JSON.stringify({session_id:session,cwd:alias,transcript_path:transcript,hook_event_name:'SessionStart'}),encoding:'utf8'});assert.equal(hook.status,0);
 const start=spawnSync(process.execPath,[cli,'start',session,'1','class'],{cwd:realpathSync(actual),env,encoding:'utf8'});assert.equal(start.status,0,start.stderr);
 const q=new Queue(spool);assert.equal(q.db.prepare('SELECT count(*) n FROM bindings').get().n,1);q.close();
 }finally{rmSync(root,{recursive:true,force:true});}
});
