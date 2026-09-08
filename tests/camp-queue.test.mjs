import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,appendFileSync,rmSync,renameSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Queue,MAX_CHUNK} from '../camp/queue.mjs';
test('durable capture survives reopen, validates ACK, preserves truncation generations and final bytes',()=>{
 const root=mkdtempSync(join(tmpdir(),'camp-queue-')),path=join(root,'session.jsonl'),session=randomUUID();let q;
 try{
  writeFileSync(path,Buffer.alloc(MAX_CHUNK+13,65));q=new Queue(join(root,'spool'));
  const binding=q.bind({session,cwd:root,week:1,phase:'class'});q.capture(binding,path);assert.equal(q.pending().length,2);q.close();
  q=new Queue(join(root,'spool'));assert.equal(q.pending().length,2);q.capture(binding,path);assert.equal(q.pending().length,2);
  const item=q.pending()[0],payload=JSON.parse(item.payload),receipt={...payload,session_id:session,receipt_id:'a'.repeat(64),received_at:new Date().toISOString()};
  assert.throws(()=>q.acknowledge(item.id,{...receipt,end_offset:1}));assert.equal(q.pending().length,2);q.acknowledge(item.id,receipt);assert.equal(q.pending().length,1);
  appendFileSync(path,'last');q.capture(binding,path,{final:true});let p=JSON.parse(q.pending().at(-1).payload);assert.equal(p.final,true);assert.equal(Buffer.from(p.data_base64,'base64').toString(),'last');
  q.capture(binding,path,{final:true});assert.equal(q.pending().length,2);
  writeFileSync(path,'replacement');q.capture(binding,path,{final:true});p=JSON.parse(q.pending().at(-1).payload);assert.equal(p.generation,1);assert.equal(p.start_offset,0);assert.equal(Buffer.from(p.data_base64,'base64').toString(),'replacement');
 }finally{q?.close();rmSync(root,{recursive:true,force:true});}
});
test('bounded capture resumes exact byte offset and binds only explicit session/project',()=>{
 const root=mkdtempSync(join(tmpdir(),'camp-queue-')),path=join(root,'session.jsonl');let q;
 try{writeFileSync(path,'abcdefghij');q=new Queue(join(root,'spool'));const session=randomUUID(),id=q.bind({session,cwd:root,week:2,phase:'homework'});
 assert.equal(q.binding(randomUUID(),root),null);assert.throws(()=>q.bind({session,cwd:root,week:1,phase:'class'}));
 q.capture(id,path,{budget:3,final:true});assert.equal(JSON.parse(q.pending()[0].payload).final,false);q.capture(id,path,{final:true});
 assert.equal(q.pending().map(x=>Buffer.from(JSON.parse(x.payload).data_base64,'base64').toString()).join(''),'abcdefghij');assert.equal(JSON.parse(q.pending()[1].payload).final,true);
 }finally{q?.close();rmSync(root,{recursive:true,force:true});}
});
test('network failure and invalid receipt retain durable pending, valid replay completes',async()=>{
 const {flush}=await import('../camp/transport.mjs');const root=mkdtempSync(join(tmpdir(),'camp-queue-')),path=join(root,'session.jsonl');let q;
 try{writeFileSync(path,'TEST ONLY transcript');q=new Queue(join(root,'spool'));const session=randomUUID(),binding=q.bind({session,cwd:root,week:1,phase:'class'});q.capture(binding,path,{final:true});
 await assert.rejects(flush(q,{}, {send:async()=>{throw Error('offline');}}));assert.equal(q.pending().length,1);
 await assert.rejects(flush(q,{}, {send:async(_,op,p)=>op==='bind'?p:{receipt:{}}}));assert.equal(q.pending().length,1);
 const result=await flush(q,{}, {send:async(_,op,payload)=>op==='bind'?payload:{receipt:{...payload,session_id:session,receipt_id:'b'.repeat(64),received_at:new Date().toISOString()}}});assert.equal(result.pending,0);
 }finally{q?.close();rmSync(root,{recursive:true,force:true});}
});
test('explicit start anchors current transcript and excludes all earlier bytes',()=>{
 const root=mkdtempSync(join(tmpdir(),'camp-queue-')),path=join(root,'session.jsonl');let q;
 try{writeFileSync(path,'PRIVATE BEFORE START\n');q=new Queue(join(root,'spool'));const id=q.bind({session:randomUUID(),cwd:root,week:1,phase:'class',transcript:path});appendFileSync(path,'CAMP AFTER START\n');q.capture(id,path);const p=JSON.parse(q.pending()[0].payload);assert.equal(Buffer.from(p.data_base64,'base64').toString(),'CAMP AFTER START\n');assert.equal(p.base_offset,21);assert.equal(p.start_offset,21);
 }finally{q?.close();rmSync(root,{recursive:true,force:true});}
});
test('same inode rewrite preserving suffix gets a new generation; missing source error persists across other source success',()=>{
 const root=mkdtempSync(join(tmpdir(),'camp-queue-')),path=join(root,'session.jsonl'),other=join(root,'agent.jsonl');let q;
 try{writeFileSync(path,'A'.repeat(100)+'Z'.repeat(4096));writeFileSync(other,'agent');q=new Queue(join(root,'spool'));const id=q.bind({session:randomUUID(),cwd:root,week:1,phase:'class'});q.capture(id,path);writeFileSync(path,'B'.repeat(100)+'Z'.repeat(4096));q.capture(id,path);assert.equal(JSON.parse(q.pending()[1].payload).generation,1);
 rmSync(path);assert.throws(()=>q.capture(id,path));q.capture(id,other,{kind:'subagent'});assert.equal(q.db.prepare('SELECT error FROM bindings WHERE id=?').get(id).error,1);
 writeFileSync(path,'recovered');q.capture(id,path);assert.equal(q.db.prepare('SELECT error FROM bindings WHERE id=?').get(id).error,0);
 }finally{q?.close();rmSync(root,{recursive:true,force:true});}
});

test('rotation keeps original start exclusion; unknown boundary waits; first missing source is durable; final recovery clears error',()=>{
 const root=mkdtempSync(join(tmpdir(),'camp-queue-')),path=join(root,'session.jsonl'),replacement=join(root,'replacement'),agent=join(root,'agent.jsonl');let q;
 try{writeFileSync(path,'PRIVATE\n');q=new Queue(join(root,'spool'));const id=q.bind({session:randomUUID(),cwd:root,week:1,phase:'class',transcript:path});appendFileSync(path,'CAMP\n');q.capture(id,path);writeFileSync(replacement,'PRIVATE\nCAMP\nTAIL\n');renameSync(replacement,path);q.capture(id,path,{final:true});assert(q.pending().every(c=>!Buffer.from(JSON.parse(c.payload).data_base64,'base64').toString().includes('PRIVATE')));
 renameSync(path,replacement);assert.throws(()=>q.capture(id,path));renameSync(replacement,path);q.capture(id,path,{final:true});assert.equal(q.db.prepare('SELECT error FROM bindings WHERE id=?').get(id).error,0);
 assert.throws(()=>q.capture(id,agent,{kind:'subagent',final:true}));assert.deepEqual({...q.db.prepare('SELECT kind,final FROM source_intents WHERE path=?').get(agent)},{kind:'subagent',final:1});writeFileSync(agent,'RECOVERED AGENT');q.capture(id,agent,{kind:'subagent',final:true});assert.equal(q.db.prepare('SELECT error FROM bindings WHERE id=?').get(id).error,0);
 writeFileSync(path,'UNKNOWN COMPACTION');assert.throws(()=>q.capture(id,path),/boundary/);assert.equal(q.db.prepare('SELECT error FROM bindings WHERE id=?').get(id).error,1);
 }finally{q?.close();rmSync(root,{recursive:true,force:true});}
});
