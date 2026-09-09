#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync,existsSync,realpathSync} from 'node:fs';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {spawn} from 'node:child_process';
import {Queue} from './queue.mjs';
import {captureReadiness,handoverReadinessWorker} from './readiness.mjs';
import {suggestHelp} from './help.mjs';
import {participantStatus} from './status.mjs';
import {enroll,flush} from './transport.mjs';
const directory=process.env.CAMP_SPOOL_DIR||join(homedir(),'.sparker-camp');
const command=process.argv[2],args=process.argv.slice(3);
function wake(){if(!existsSync(join(directory,'connection.json')))return;const p=spawn(process.execPath,[fileURLToPath(import.meta.url),'worker'],{detached:true,stdio:'ignore',windowsHide:true,env:process.env});p.on('error',()=>{});p.unref();}
let queue;
try{
 if(command==='enroll'){
  // Setup code enters stdin, never an OS command-line argument.
  console.log(JSON.stringify(await enroll(directory,args[0],readFileSync(0,'utf8').trim())));wake();
 }else{
  queue=new Queue(directory);
  queue.db.exec('CREATE TABLE IF NOT EXISTS host_sessions(session TEXT PRIMARY KEY,cwd TEXT NOT NULL,transcript TEXT NOT NULL); CREATE TABLE IF NOT EXISTS host_agents(session TEXT NOT NULL,agent TEXT NOT NULL,binding TEXT NOT NULL,ended INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(session,agent)); CREATE TABLE IF NOT EXISTS pending_agent_stops(session TEXT NOT NULL,agent TEXT NOT NULL,binding TEXT NOT NULL,path TEXT NOT NULL,PRIMARY KEY(session,agent))');
  if(command==='start'){
   const [session,week,requestedPhase]=args;
   const phase=({'수업':'class','과제':'homework'})[requestedPhase]||requestedPhase;
   const host=queue.db.prepare('SELECT * FROM host_sessions WHERE session=? AND cwd=?').get(session,realpathSync(process.cwd()));
   if(!host)throw Error('Host session hook has not registered the transcript');
   queue.bind({session,cwd:process.cwd(),week:Number(week),phase,transcript:host.transcript});
   console.log(JSON.stringify(participantStatus(queue,directory,session,process.cwd())));wake();
  }else if(command==='hook'){
   const input=readFileSync(0,'utf8');if(Buffer.byteLength(input)>1048576)throw Error('Hook too large');
   const event=JSON.parse(input);
   if(typeof event.session_id==='string'&&typeof event.cwd==='string'&&typeof event.transcript_path==='string')queue.db.prepare('INSERT OR REPLACE INTO host_sessions VALUES(?,?,?)').run(event.session_id,realpathSync(event.cwd),event.transcript_path);
   const binding=queue.binding(event.session_id,event.cwd);
   if(binding){
    const capture=(path,options)=>{try{queue.capture(binding.id,path,options);}catch{}};
    // Lifecycle and pending paths are durable before any potentially failing file read.
    if(event.hook_event_name==='SessionStart'){queue.db.prepare('UPDATE bindings SET closed=0 WHERE id=?').run(binding.id);queue.db.prepare("UPDATE source_intents SET final=0 WHERE binding=? AND kind='main'").run(binding.id);}
    if(event.hook_event_name==='SessionEnd')queue.db.prepare('UPDATE bindings SET closed=1 WHERE id=?').run(binding.id);
    if(event.hook_event_name==='SubagentStart'&&typeof event.agent_id==='string'){
     queue.db.prepare('INSERT OR IGNORE INTO host_agents(session,agent,binding) VALUES(?,?,?)').run(event.session_id,event.agent_id,binding.id);
     const pending=queue.db.prepare('SELECT * FROM pending_agent_stops WHERE session=? AND agent=? AND binding=?').get(event.session_id,event.agent_id,binding.id);
     if(pending){queue.db.prepare('UPDATE host_agents SET ended=1 WHERE session=? AND agent=?').run(event.session_id,event.agent_id);capture(pending.path,{kind:'subagent',final:true});queue.db.prepare('DELETE FROM pending_agent_stops WHERE session=? AND agent=?').run(event.session_id,event.agent_id);}
    }
    if(event.hook_event_name==='SubagentStop'&&event.agent_transcript_path&&typeof event.agent_id==='string'){
     queue.db.prepare('INSERT OR REPLACE INTO pending_agent_stops VALUES(?,?,?,?)').run(event.session_id,event.agent_id,binding.id,event.agent_transcript_path);
     const agent=queue.db.prepare('SELECT binding FROM host_agents WHERE session=? AND agent=?').get(event.session_id,event.agent_id);
     if(agent?.binding===binding.id){queue.db.prepare('UPDATE host_agents SET ended=1 WHERE session=? AND agent=?').run(event.session_id,event.agent_id);capture(event.agent_transcript_path,{kind:'subagent',final:true});queue.db.prepare('DELETE FROM pending_agent_stops WHERE session=? AND agent=?').run(event.session_id,event.agent_id);}
    }
    if(event.transcript_path&&event.hook_event_name!=='SubagentStart')capture(event.transcript_path,{final:event.hook_event_name==='SessionEnd'});
    wake();
   }else if(event.hook_event_name==='SessionStart'){
    // Resume old durable work after a host/PC restart without binding the new session.
    wake();
   }
  }else if(command==='worker'){
   queue.db.exec('CREATE TABLE IF NOT EXISTS worker(id INTEGER PRIMARY KEY,until INTEGER NOT NULL,token TEXT NOT NULL)');
   const token=randomUUID();
   const claimed=queue.transaction(()=>{const row=queue.db.prepare('SELECT until FROM worker WHERE id=1').get();if(row?.until>Date.now())return false;queue.db.prepare('INSERT OR REPLACE INTO worker VALUES(1,?,?)').run(Date.now()+60000,token);return true;});
   if(claimed){
    const heartbeat=setInterval(()=>{try{queue.db.prepare('UPDATE worker SET until=? WHERE id=1 AND token=?').run(Date.now()+60000,token);}catch{}},10000);
    let failures=0;
    try{for(;;){
     if(queue.db.prepare('SELECT token FROM worker WHERE id=1').get()?.token!==token)break;
     try{
      const config=JSON.parse(readFileSync(join(directory,'connection.json'),'utf8'));
      for(const source of queue.db.prepare('SELECT s.binding,s.path,s.kind,s.final,b.closed FROM source_intents s JOIN bindings b ON b.id=s.binding').all()){
       try{queue.capture(source.binding,source.path,{kind:source.kind,final:source.kind==='main'?!!source.closed:!!source.final});}catch{}
      }
      const result=await flush(queue,config,{limit:16});failures=0;
      const active=queue.db.prepare('SELECT count(*) AS n FROM bindings WHERE closed=0 OR error=1').get().n;
      if(!result.pending&&!active)break;
      await delay(result.pending?100:5000);
     }catch(error){
      // A missing enrollment needs explicit operator setup. Never drop queued bytes.
      if(error.code==='ENOENT')break;
      failures++;await delay(Math.min(60000,1000*2**Math.min(failures,6)));
     }
    }}finally{clearInterval(heartbeat);queue.db.prepare('DELETE FROM worker WHERE id=1 AND token=?').run(token);}
   }
  }else if(command==='help'){
   const [session,issue,attempts,severity]=args,binding=queue.binding(session,process.cwd());
   console.log(JSON.stringify(binding?suggestHelp(queue,binding.id,{issue,attempts:Number(attempts),serious:severity==='serious'}):{suggest:false}));
  }else if(command==='readiness'){
   await captureReadiness(queue,directory,args[0],process.cwd());
   handoverReadinessWorker(queue);
   console.log(JSON.stringify({readiness:'queued',server_received:false}));wake();
  }else if(command==='participant-status'){
   console.log(JSON.stringify(participantStatus(queue,directory,args[0],process.cwd())));
  }else if(command==='status'){
   console.log(JSON.stringify({bindings:queue.db.prepare('SELECT id,session,closed,error FROM bindings').all(),pending_chunks:queue.db.prepare('SELECT count(*) AS n FROM chunks WHERE receipt IS NULL').get().n}));
  }else throw Error('Usage: camp start SESSION WEEK class|homework; enroll ORIGIN < code; status; readiness SESSION; worker');
 }
}catch(error){
 // Hooks must never stop Claude or print transcript/token values.
 if(command!=='hook'&&command!=='worker'){console.error(error.message==='Session already bound; start a new session'?'이 대화는 다른 활동에 연결돼 있어요. 진행 내용을 저장한 뒤 /clear로 새 대화를 열고 원하는 활동을 시작해 주세요.':error.message==='Host session hook has not registered the transcript'?'아직 이 대화의 기록 준비를 확인하지 못했어요. Claude Code를 다시 열어 시작해 주세요. 계속 안 되면 운영진에게 도움을 요청해 주세요.':'캠프 기록 상태를 확인하지 못했어요. 실습은 계속할 수 있어요. 운영진에게 계정 연결과 기록 상태를 확인해 달라고 요청해 주세요.');process.exitCode=1;}
 else {try{mkdirSync(directory,{recursive:true,mode:0o700});writeFileSync(join(directory,'recovery-needed'),new Date().toISOString(),{mode:0o600});}catch{}}
}finally{queue?.close();}
