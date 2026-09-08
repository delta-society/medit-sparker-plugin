import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,appendFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Queue} from '../camp/queue.mjs';
import {participantStatus} from '../camp/status.mjs';

test('participant status is scoped, contains no secrets, and receipt requires acknowledged chunks',()=>{
 const root=mkdtempSync(join(tmpdir(),'camp-status-')),spool=join(root,'spool'),q=new Queue(spool),session=randomUUID(),other=randomUUID(),transcript=join(root,'main');
 try{
  writeFileSync(transcript,'');
  assert.equal(participantStatus(q,spool,session,root).state,'not_started');
  const binding=q.bind({session,cwd:root,week:1,phase:'class',transcript});
  assert.equal(participantStatus(q,spool,session,root).state,'connection_needed');
  writeFileSync(join(spool,'connection.json'),'SECRET_INVALID_JSON');
  q.db.prepare('UPDATE bindings SET bound=1 WHERE id=?').run(binding);
  assert.equal(participantStatus(q,spool,session,root).state,'awaiting_receipt');
  assert.equal(participantStatus(q,spool,session,root).server_received,false);
  appendFileSync(transcript,'SECRET_TRANSCRIPT');q.capture(binding,transcript);
  assert.equal(participantStatus(q,spool,session,root).state,'pending');
  const chunk=q.pending()[0],payload=JSON.parse(chunk.payload);
  q.acknowledge(chunk.id,{...payload,session_id:session,receipt_id:'a'.repeat(64),received_at:new Date().toISOString()});
  const received=participantStatus(q,spool,session,root);
  assert.equal(received.state,'received');assert.equal(received.server_received,true);
  assert(!JSON.stringify(received).includes('SECRET'));assert(!JSON.stringify(received).includes(transcript));
  assert.equal(participantStatus(q,spool,other,root).state,'not_started');
  // A different valid cwd must not borrow this session's receipts.
  assert.equal(participantStatus(q,spool,session,tmpdir()).state,'not_started');
  appendFileSync(transcript,'NEW');q.capture(binding,transcript);
  assert.equal(participantStatus(q,spool,session,root).state,'pending');
  q.db.prepare('UPDATE bindings SET error=1 WHERE id=?').run(binding);
  assert.equal(participantStatus(q,spool,session,root).state,'capture_attention');
 }finally{q.close();rmSync(root,{recursive:true,force:true});}
});

test('pending agent metadata prevents a reassuring received state',()=>{
 const root=mkdtempSync(join(tmpdir(),'camp-status-agent-')),q=new Queue(root),session=randomUUID(),transcript=join(root,'main');
 try{
  writeFileSync(transcript,'');const binding=q.bind({session,cwd:root,week:1,phase:'class',transcript});
  q.db.prepare('INSERT INTO pending_agent_stops VALUES(?,?,?,?)').run(session,'agent',binding,'unread');
  assert.equal(participantStatus(q,root,session,root).capture_error,true);
 }finally{q.close();rmSync(root,{recursive:true,force:true});}
});
