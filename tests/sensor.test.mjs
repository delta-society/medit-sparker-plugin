import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeOtel,normalizeHook,sendEvent} from '../sensor/sensor.mjs';
import {validateEvent} from '../sensor/protocol.mjs';
import {randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
const session=randomUUID(),tool=randomUUID();
const hook={hook_event_name:'PostToolUse',session_id:session,tool_use_id:tool,tool_name:'Bash',tool_input:{command:'SECRET COMMAND'},tool_response:'SECRET CONTENT',transcript_path:'/PRIVATE/FILE'};
test('Hook/OTel raw content never survives normalization; commands never imply verification',()=>{
 const events=normalizeHook(hook,'w1');assert.equal(events[0].tool_category,'execute');assert.equal(events[0].success,true);assert.ok(!JSON.stringify(events).includes('SECRET'));assert.ok(!JSON.stringify(events).includes('PRIVATE'));
 const attrs={'event.name':'tool_result','event.timestamp':new Date().toISOString(),'event.sequence':'1','session.id':session,'tool_use_id':tool,'tool_name':'Read',success:'false',error:'SECRET ERROR',tool_parameters:'SECRET COMMAND',email:'SECRET EMAIL'};
 const input={resourceLogs:[{resource:{attributes:[{key:'email',value:{stringValue:'SECRET EMAIL'}}]},scopeLogs:[{logRecords:[{attributes:Object.entries(attrs).map(([key,v])=>({key,value:{stringValue:v}}))}]}]}]};
 const result=normalizeOtel(input,'w1');assert.equal(result[0].success,false);assert.equal(result[0].tool_category,'read');assert.equal(result[0].event_id,normalizeOtel(input,'w1')[0].event_id);assert.ok(!JSON.stringify(result).includes('SECRET'));
 for(const key of ['participantId','email','command','prompt','response','code','tool_name','tool_args','file_path','url','error_message'])assert.throws(()=>validateEvent({...events[0],[key]:'SECRET'}));
 assert.throws(()=>validateEvent({...events[0],ts:'2020-01-01T00:00:00Z'}));
});
test('sender carries participant bearer and only projected metadata; redirects not followed',async()=>{
 let body='',authorization='',redirect=false;const server=createServer(async(req,res)=>{authorization=req.headers.authorization;for await(const c of req)body+=c;res.writeHead(!redirect?201:302,{Location:'http://example.test'}).end();});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const event=normalizeHook(hook,'w1')[0];assert.equal(await sendEvent('http://127.0.0.1:'+server.address().port,'TEST-TOKEN','hook',event),201);assert.equal(authorization,'Bearer TEST-TOKEN');assert.deepEqual(JSON.parse(body),{schema_version:1,transport:'hook',event});assert.ok(!body.includes('SECRET'));redirect=true;await assert.rejects(()=>sendEvent('http://127.0.0.1:'+server.address().port,'TEST-TOKEN','hook',event));}finally{server.close();}
});

test('POSIX hook paths are literal even with dollar substitutions, backticks and apostrophes',async()=>{
 const {shellQuote}=await import('../sensor/sensor.mjs');const {spawnSync}=await import('node:child_process');
 const hostile="/tmp/home ' $(printf INJECTED) `printf ALSO_INJECTED`/sensor.mjs";
 const command=[process.execPath,'-e','process.stdout.write(process.argv[1])',hostile].map(v=>shellQuote(v)).join(' ');
 const child=spawnSync('/bin/sh',['-c',command],{encoding:'utf8'});assert.equal(child.status,0);assert.equal(child.stdout,hostile);
 assert.equal(shellQuote('C:\\Users\\A $HOME\\sensor.mjs','win32'),"'C:/Users/A $HOME/sensor.mjs'");
 assert.throws(()=>shellQuote('/tmp/new\nline'));
});
