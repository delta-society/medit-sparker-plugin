#!/usr/bin/env node
import {createHash,randomUUID,randomBytes} from 'node:crypto';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import * as fs from 'node:fs';
import {homedir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateEvent} from './protocol.mjs';
const source=dirname(fileURLToPath(import.meta.url));
const dir=join(homedir(),'.config','medit-sparker-sensor');
const configFile=join(dir,'config.json'),queueFile=join(dir,'queue.json');
const settingsFile=join(homedir(),'.claude','settings.json');
const marker='--sparker-education-hook';
const object=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const list=v=>Array.isArray(v)?v:[];
export function opaque(values){const h=createHash('sha256').update(JSON.stringify(values)).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;}
export function category(name){if(name==='Read')return 'read';if(['Write','Edit','MultiEdit','NotebookEdit'].includes(name))return 'write';if(['Grep','Glob','WebSearch','WebFetch'].includes(name))return 'search';if(name==='Bash')return 'execute';if(['EnterPlanMode','ExitPlanMode'].includes(name))return 'plan';return 'other';}
export function normalizeOtel(input,week){
 const events=[];
 for(const resource of list(object(input).resourceLogs))for(const scope of list(object(resource).scopeLogs))for(const value of list(object(scope).logRecords)){
  const a={};for(const attr of list(object(value).attributes)){const {key,value}=object(attr);if(['event.name','event.timestamp','event.sequence','session.id','tool_name','tool_use_id','success','duration_ms'].includes(key)){const v=object(value);a[key]=v.stringValue??v.boolValue??v.intValue??v.doubleValue;}}
  if(a['event.name']!=='tool_result')continue;
  if(typeof a['session.id']!=='string'||a['event.sequence']===undefined||![true,false,'true','false'].includes(a.success))throw Error('Invalid correlation');
  const event={event_id:opaque(['otel',a['session.id'],a['event.sequence'],a.tool_use_id]),week,ts:a['event.timestamp'],source_version:'1.0.0',event_type:'tool_result',session_id:opaque(['session',a['session.id']]),tool_category:category(a.tool_name),success:a.success===true||a.success==='true'};
  if(a.duration_ms!==undefined)event.duration_ms=Number(a.duration_ms);
  events.push(validateEvent(event));if(events.length>500)throw Error('Too many events');
 }return events;
}
export function normalizeHook(input,week,now=new Date().toISOString()){
 const v=object(input);if(!['PostToolUse','PostToolUseFailure'].includes(v.hook_event_name))return [];
 if(typeof v.session_id!=='string'||typeof v.tool_use_id!=='string')throw Error('Invalid correlation');
 return [validateEvent({event_id:opaque(['hook',v.session_id,v.tool_use_id]),week,ts:now,source_version:'1.0.0',event_type:'tool_result',session_id:opaque(['session',v.session_id]),tool_category:category(v.tool_name),success:v.hook_event_name==='PostToolUse'})];
}
function safe(file){let p=resolve(file);for(;;){try{if(fs.lstatSync(p).isSymbolicLink())throw Error('Unsafe path');}catch(e){if(e.code!=='ENOENT')throw e;}if(dirname(p)===p)break;p=dirname(p);}}
function read(file,fallback){safe(file);if(!fs.existsSync(file))return fallback;if(fs.statSync(file).size>2_000_000)throw Error('Local size limit');return JSON.parse(fs.readFileSync(file,'utf8'));}
function write(file,value){safe(file);fs.mkdirSync(dirname(file),{recursive:true,mode:0o700});const temp=file+'.'+randomUUID()+'.tmp';fs.writeFileSync(temp,typeof value==='string'?value:JSON.stringify(value),{mode:0o600,flag:'wx'});fs.renameSync(temp,file);}
// Lamport bakery claims: choosing/ticket files are named by PID, so a crash even
// before content is written cannot leave an ownerless permanent lock. Network
// operations are never inside these short critical sections.
async function locked(run){
 safe(dir);fs.mkdirSync(dir,{recursive:true,mode:0o700});const locks=join(dir,'locks');safe(locks);fs.mkdirSync(locks,{mode:0o700,recursive:true});
 const name=process.pid+'-'+randomUUID()+'.json',claim=join(locks,name);
 fs.writeFileSync(claim,JSON.stringify({ticket:0}),{flag:'wx',mode:0o600});
 function claims(){return fs.readdirSync(locks).flatMap(n=>{if(!/^\d+-[0-9a-f-]+\.json$/.test(n))return [];const path=join(locks,n);safe(path);const pid=Number(n.split('-')[0]);try{process.kill(pid,0);}catch(e){if(e.code==='ESRCH'){try{fs.unlinkSync(path);}catch(e){if(e.code!=='ENOENT')throw e;}return [];}}
  try{const value=JSON.parse(fs.readFileSync(path,'utf8')||'{}');return [{name:n,ticket:Number.isSafeInteger(value.ticket)?value.ticket:0}];}catch(e){if(e.code==='ENOENT')return [];if(e instanceof SyntaxError)return [{name:n,ticket:0}];throw e;}});}
 try{
  const ticket=Math.max(0,...claims().map(c=>c.ticket))+1;write(claim,{ticket});
  let acquired=false;for(let i=0;i<100;i++){if(!claims().some(c=>c.name!==name&&(c.ticket===0||c.ticket<ticket||(c.ticket===ticket&&c.name<name)))){acquired=true;break;}await new Promise(r=>setTimeout(r,25));}
  if(!acquired)throw Error('Sensor busy');
  // Recover interrupted atomic writes only after obtaining the queue/config lock.
  // These strict names are generated by write(); unrelated files are untouched.
  for(const file of fs.readdirSync(dir))if(/^(queue\.json|config\.json|sensor\.mjs|protocol\.mjs)\.[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.tmp$/.test(file)){const path=join(dir,file);safe(path);if(fs.lstatSync(path).isFile())fs.unlinkSync(path);}
  return await run();
 }finally{try{fs.unlinkSync(claim);}catch(e){if(e.code!=='ENOENT')throw e;}}
}
function configuration(){const c=read(configFile,{});if(c.consent!==true||!['otel','hook'].includes(c.transport)||!/^w[0-4]$/.test(c.week))throw Error('Opt in first');return c;}
function approvedConfiguration(){const c=configuration();if(!Number.isFinite(Date.parse(c.retentionUntil))||Date.parse(c.retentionUntil)<=Date.now())throw Error('Approval expired');return c;}
function credential(){const c=read(join(homedir(),'.config','medit-sparker','config.json'),{});const u=new URL(c.origin);if((u.protocol!=='https:'&&!(process.env.SPARKER_SENSOR_TEST==='1'&&u.hostname==='127.0.0.1'&&u.protocol==='http:'))||u.origin!==c.origin||u.username||u.password||typeof c.token!=='string'||c.token.length<32)throw Error('Participant usage connection required');return c;}
export async function sendEvent(origin,token,transport,event){validateEvent(event);const response=await fetch(origin+'/api/education-events',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify({schema_version:1,transport,event}),redirect:'error',signal:AbortSignal.timeout(5000)});await response.body?.cancel();return response.status;}
async function enqueue(events,transport,installationId){return locked(async()=>{const c=approvedConfiguration();if(c.transport!==transport||c.installationId!==installationId)throw Error('Enrollment changed');const now=Date.now();let queue=list(read(queueFile,[])).filter(e=>e.expires>now&&e.installationId===c.installationId);for(const event of events){validateEvent(event);if(!queue.some(e=>e.event.event_id===event.event_id)){if(queue.length>=500)throw Error('Queue full');queue.push({transport,event,installationId:c.installationId,expires:Math.min(now+86400000,Date.parse(c.retentionUntil))});}}write(queueFile,queue);});}
async function policy(){const {origin}=credential();const r=await fetch(origin+'/api/sensor/policy',{redirect:'error',signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('Policy unavailable');const p=await r.json();if(p.enabled!==true||typeof p.retentionUntil!=='string'||!Number.isFinite(Date.parse(p.retentionUntil))||Date.parse(p.retentionUntil)<=Date.now())throw Error('Policy not approved');return p;}
async function flush(){
 const batch=await locked(async()=>{const c=configuration();const queue=list(read(queueFile,[])).filter(e=>e.expires>Date.now()&&e.installationId===c.installationId);write(queueFile,queue);return {id:c.installationId,queue:Date.parse(c.retentionUntil)>Date.now()?queue.slice(0,10):[]};});
 const acknowledged=new Set();
 for(const entry of batch.queue){
  // Re-read consent before every dispatch. Uninstall/reinstall fences old work.
  const c=approvedConfiguration();if(c.installationId!==batch.id)break;
  try{const auth=credential();if(opaque([auth.origin,auth.token])!==c.credentialBinding)break;const status=await sendEvent(auth.origin,auth.token,entry.transport,entry.event);if([200,201,400,403,409,410].includes(status))acknowledged.add(entry.event.event_id);else break;}catch{break;}
 }
 return locked(async()=>{const c=read(configFile,{});if(c.consent!==true||c.installationId!==batch.id)return {pending:0};const queue=list(read(queueFile,[])).filter(e=>e.expires>Date.now()&&e.installationId===batch.id&&!acknowledged.has(e.event.event_id));write(queueFile,queue);return {pending:queue.length};});
}
async function receive(stream,max=512000){let size=0;const chunks=[];for await(const chunk of stream){size+=chunk.length;if(size>max)throw Error('Input size limit');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString());}
export function shellQuote(value,platform=process.platform){
 if(platform==='win32'){
  // Claude Windows hooks run through Git Bash. Paths use slash form; POSIX
  // single quoting protects $, backticks, spaces and apostrophes there too.
  value=value.replaceAll('\\','/');
 }
 if(/[\r\n\0]/.test(value))throw Error('Unsupported executable path');
 return "'"+value.replaceAll("'", "'\\''")+"'";
}
function removeHooks(settings){for(const key of ['PostToolUse','PostToolUseFailure']){if(Array.isArray(settings.hooks?.[key]))settings.hooks[key]=settings.hooks[key].map(entry=>({...entry,hooks:list(entry.hooks).filter(h=>!String(h.command||'').includes(marker))})).filter(e=>e.hooks.length);}}
async function install(args){if(!args.includes('--consent'))throw Error('Explicit --consent required');const week=args.find(v=>/^w[0-4]$/.test(v));const transport=args.includes('--hook-fallback')?'hook':'otel';if(!week)throw Error('Week required');const approved=await policy(),auth=credential();await locked(async()=>{const settings=read(settingsFile,{});removeHooks(settings);if(transport==='hook'){settings.hooks||={};for(const name of ['PostToolUse','PostToolUseFailure']){settings.hooks[name]||=[];settings.hooks[name].push({matcher:'*',hooks:[{type:'command',command:shellQuote(process.execPath)+' '+shellQuote(join(dir,'sensor.mjs'))+' '+marker,async:true,timeout:10}]});}}
 // OTel does not touch Claude settings unless removing a previous sensor fallback.
 if(JSON.stringify(settings)!==JSON.stringify(read(settingsFile,{}))){if(fs.existsSync(settingsFile))fs.copyFileSync(settingsFile,settingsFile+'.sparker-sensor-'+Date.now()+'.bak');write(settingsFile,settings);}
 for(const file of ['sensor.mjs','protocol.mjs'])if(resolve(source,file)!==resolve(dir,file))write(join(dir,file),fs.readFileSync(join(source,file),'utf8'));
 write(configFile,{consent:true,week,transport,installationId:randomUUID(),credentialBinding:opaque([auth.origin,auth.token]),retentionUntil:approved.retentionUntil});write(queueFile,[]);});console.log('교육 센서 동의와 설치가 완료되었습니다. OTel: node "$HOME/.config/medit-sparker-sensor/sensor.mjs" run');}
async function run(args){const c=approvedConfiguration();if(c.transport!=='otel')throw Error('OTel mode required');const nonce=randomBytes(24).toString('hex');let busy=false;
 const server=createServer(async(req,res)=>{let ownsBusy=false;try{if(req.method!=='POST'||req.url!=='/v1/logs'||req.headers.authorization!=='Bearer '+nonce){res.writeHead(403).end();return;}if(busy){res.writeHead(429).end();return;}busy=true;ownsBusy=true;const current=approvedConfiguration();if(current.installationId!==c.installationId)throw Error('Enrollment changed');const events=normalizeOtel(await receive(req),c.week);await enqueue(events,'otel',c.installationId);res.writeHead(200,{'content-type':'application/json'}).end('{}');void flush().catch(()=>{});}catch{res.writeHead(400).end();}finally{if(ownsBusy)busy=false;}});server.requestTimeout=5000;
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
 const env={...process.env,CLAUDE_CODE_ENABLE_TELEMETRY:'1',OTEL_METRICS_EXPORTER:'none',OTEL_TRACES_EXPORTER:'none',OTEL_LOGS_EXPORTER:'otlp',OTEL_EXPORTER_OTLP_PROTOCOL:'http/json',OTEL_EXPORTER_OTLP_LOGS_PROTOCOL:'http/json',OTEL_EXPORTER_OTLP_ENDPOINT:`http://127.0.0.1:${port}`,OTEL_EXPORTER_OTLP_LOGS_ENDPOINT:`http://127.0.0.1:${port}/v1/logs`,OTEL_EXPORTER_OTLP_HEADERS:'Authorization=Bearer '+nonce,OTEL_EXPORTER_OTLP_LOGS_HEADERS:'Authorization=Bearer '+nonce,OTEL_LOG_USER_PROMPTS:'0',OTEL_LOG_ASSISTANT_RESPONSES:'0',OTEL_LOG_TOOL_DETAILS:'0',OTEL_LOG_TOOL_CONTENT:'0',OTEL_LOG_RAW_API_BODIES:'0'};
 delete env.BETA_TRACING_ENDPOINT;delete env.OTEL_RESOURCE_ATTRIBUTES;
 const child=spawn('claude',args,{stdio:'inherit',env});const timer=setInterval(()=>void flush().catch(()=>{}),30000);timer.unref();let stopping=false;
 const finish=async(code)=>{if(stopping)return;stopping=true;clearInterval(timer);await new Promise(r=>server.close(r));await flush().catch(()=>{});process.exitCode=code??1;};child.on('exit',finish);child.on('error',()=>void finish(1));for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>child.kill(signal));}
async function main(){const [mode,...args]=process.argv.slice(2);if(mode)await locked(async()=>{if(fs.existsSync(queueFile))write(queueFile,list(read(queueFile,[])).filter(e=>e.expires>Date.now()));});if(mode==='install')return install(args);if(mode==='run')return run(args);if(mode==='flush'){configuration();console.log(JSON.stringify(await flush()));return;}if(mode==='status'){await locked(async()=>{const c=configuration();const queue=list(read(queueFile,[])).filter(e=>e.expires>Date.now()&&e.installationId===c.installationId);write(queueFile,queue);console.log(JSON.stringify({transport:c.transport,week:c.week,pending:queue.length}));});return;}if(mode==='uninstall'){await locked(async()=>{const settings=read(settingsFile,{});removeHooks(settings);write(settingsFile,settings);for(const file of [configFile,queueFile,join(dir,'sensor.mjs'),join(dir,'protocol.mjs'),join(dir,'lock')]){safe(file);if(fs.existsSync(file))fs.unlinkSync(file);}});return;}if(mode===marker){const c=approvedConfiguration();if(c.transport!=='hook')return;const timer=setTimeout(()=>process.stdin.destroy(),1000);let input;try{input=await receive(process.stdin);}finally{clearTimeout(timer);}await enqueue(normalizeHook(input,c.week),'hook',c.installationId);await flush();return;}throw Error('Usage: install --consent w1 [--hook-fallback] | run | flush | status | uninstall');}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{if(process.argv[2]!==marker){console.error('센서 작업 실패: 동의·사용량 연결·설정·네트워크를 확인하세요.');process.exitCode=1;}});
