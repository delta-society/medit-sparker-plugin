import {queuedReadiness} from './readiness.mjs';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,renameSync} from 'node:fs';
import {join} from 'node:path';
export function safeOrigin(value){const u=new URL(value);const local=process.env.CAMP_TEST_LOOPBACK==='1'&&u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname);if(u.origin!==value||u.username||u.password||(u.protocol!=='https:'&&!local))throw Error('Camp requires an HTTPS origin');return u.origin;}
export async function request(config,operation,payload){
 const response=await fetch(safeOrigin(config.origin)+'/api/camp/'+operation,{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{'content-type':'application/json',...(config.token?{authorization:'Bearer '+config.token}:{})},body:JSON.stringify(payload)});
 if(!response.ok)throw Error('Camp request pending ('+response.status+')');
 const reader=response.body.getReader(),parts=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>128000){await reader.cancel();throw Error('Camp response too large');}parts.push(value);}
 return JSON.parse(Buffer.concat(parts).toString('utf8'));
}
export async function enroll(directory,origin,code){
 safeOrigin(origin);if(!/^[a-zA-Z0-9_-]{24}$/.test(code))throw Error('Invalid setup code');
 let old;try{old=JSON.parse(readFileSync(join(directory,'connection.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 if(old&&old.origin!==origin)throw Error('Use a separate spool for another Camp origin');
 const config=await request({origin},'exchange',{code});
 if(config.origin!==origin||!/^[a-zA-Z0-9_-]{43}$/.test(config.token)||typeof config.owner_id!=='string'||typeof config.camp_id!=='string')throw Error('Invalid enrollment response');
 mkdirSync(directory,{recursive:true,mode:0o700});
 if(old&&(old.origin!==config.origin||old.owner_id!==config.owner_id||old.camp_id!==config.camp_id))throw Error('Use a separate spool for another Camp account');
 const temporary=join(directory,'connection.new');writeFileSync(temporary,JSON.stringify(config),{mode:0o600});renameSync(temporary,join(directory,'connection.json'));return {owner_id:config.owner_id,camp_id:config.camp_id};
}
export async function flush(queue,config,{limit=128,send=request}={}){
 for(const binding of queue.db.prepare('SELECT * FROM bindings WHERE bound=0').all()){
  const expected=JSON.parse(binding.payload),ack=await send(config,'bind',expected);
  for(const key of ['binding_id','activity_id','session_id','week','phase'])if(ack?.[key]!==expected[key])throw Error('Invalid binding receipt');
  if(ack.camp_id!==config.camp_id)throw Error('Invalid binding Camp');
  queue.db.prepare('UPDATE bindings SET bound=1 WHERE id=?').run(binding.id);
 }
 let count=0;
 for(const item of queue.pending(limit)){
  const response=await send(config,'chunk',JSON.parse(item.payload));queue.acknowledge(item.id,response.receipt);count++;
 }
 await report(queue,config,send);
 return {sent:count,pending:queue.db.prepare('SELECT count(*) AS n FROM chunks WHERE receipt IS NULL').get().n};
}

export async function report(queue,config,send=request){
 queue.db.exec('CREATE TABLE IF NOT EXISTS report_sequences(binding TEXT PRIMARY KEY,sequence INTEGER NOT NULL,last_hash TEXT,sent_at INTEGER NOT NULL DEFAULT 0)');
 for(const binding of queue.db.prepare('SELECT * FROM bindings WHERE bound=1').all()){
  const payload=queue.transaction(()=>{
   const previous=queue.db.prepare('SELECT * FROM report_sequences WHERE binding=?').get(binding.id),sequence=(previous?.sequence||0)+1;
   const pending=queue.db.prepare("SELECT count(*) AS chunks,coalesce(sum(json_extract(payload,'$.end_offset')-json_extract(payload,'$.start_offset')),0) AS bytes FROM chunks WHERE binding=? AND receipt IS NULL").get(binding.id);
   const sources=queue.db.prepare('SELECT stream,generation,offset,final FROM sources WHERE binding=? LIMIT 257').all(binding.id);
   const readiness=queuedReadiness(queue,binding.id,config);
   const payload={binding_id:binding.id,sequence,report:{...(readiness?{readiness}:{}),pending_chunks:pending.chunks,pending_bytes:pending.bytes,capture_error:!!binding.error||sources.length>256||queue.db.prepare('SELECT count(*) AS n FROM pending_agent_stops WHERE binding=?').get(binding.id).n>0||(!!binding.closed&&queue.db.prepare('SELECT count(*) AS n FROM host_agents WHERE binding=? AND ended=0').get(binding.id).n>0),closed:!!binding.closed,sources:sources.slice(0,256).map(s=>({stream_id:s.stream,generation:s.generation,observed_offset:s.offset,final_requested:!!s.final}))}};
   const signature=createHash('sha256').update(JSON.stringify(payload.report)).digest('hex');
   if(previous?.last_hash===signature&&((payload.report.closed&&!payload.report.capture_error&&!pending.chunks)||Date.now()-previous.sent_at<60000))return null;
   queue.db.prepare('INSERT INTO report_sequences(binding,sequence) VALUES(?,?) ON CONFLICT(binding) DO UPDATE SET sequence=excluded.sequence').run(binding.id,sequence);
   return {payload,signature};
  });
  if(!payload)continue;
  await send(config,'report',payload.payload);
  queue.db.prepare('UPDATE report_sequences SET last_hash=?,sent_at=? WHERE binding=? AND sequence=?').run(payload.signature,Date.now(),binding.id,payload.payload.sequence);
 }
}
