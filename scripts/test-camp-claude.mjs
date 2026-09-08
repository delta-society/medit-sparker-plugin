/** Explicit opt-in real authenticated Claude host probe; synthetic dialogue only. */
import {spawn} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Queue} from '../camp/queue.mjs';
if(!process.argv.includes('--run-real-claude'))throw Error('Use --run-real-claude for this authenticated provider probe');
const root=mkdtempSync(join(tmpdir(),'camp-real-host-')),spool=join(root,'spool'),session=randomUUID(),plugin=resolve('.');
const child=spawn(process.env.CAMP_CLAUDE_BIN||'claude',['--print','--session-id',session,'--plugin-dir',plugin,'--setting-sources','','--settings','{"disableAllHooks":false}','--strict-mcp-config','--tools','Bash,Skill','--allowedTools','Bash,Skill','--output-format','json','--model',process.env.CAMP_ANALYSIS_MODEL||'sonnet'],{cwd:root,env:{...process.env,CAMP_SPOOL_DIR:spool},stdio:['pipe','pipe','pipe'],windowsHide:true});
let output='',diagnostics='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>diagnostics+=b);
child.stdin.end(`This is an isolated synthetic Camp integration test. Invoke /sparker-camp:camp-start 1 class for the current session. The helper is ${join(plugin,'camp/cli.mjs')}. After the binding succeeds, use Bash to run node -e "process.stdout.write('TEST_ONLY_CAPTURE_AFTER_BIND\\n')" once, then reply TEST_ONLY_DONE. Do not read other projects or use the network. A local-only binding without enrollment is expected for this test; continue the synthetic task.`);
let timer=setTimeout(()=>child.kill(),180000),q;
try{
 const code=await new Promise(r=>{child.on('error',()=>r(-1));child.on('close',r);});clearTimeout(timer);
 const result=JSON.parse(output);if(code!==0)console.error(JSON.stringify({subtype:result.subtype,api_error_status:result.api_error_status,terminal_reason:result.terminal_reason,permission_denials:result.permission_denials?.length||0}));assert.equal(code,0,'Claude probe failed');assert.equal(result.is_error,false);assert.equal(result.permission_denials?.length||0,0,'Unexpected tool permission denial');
 q=new Queue(spool);const binding=q.db.prepare('SELECT * FROM bindings WHERE session=?').get(session);assert(binding,'Actual Claude skill did not create a binding');
 const source=q.db.prepare("SELECT * FROM sources WHERE binding=? AND kind='main'").get(binding.id);assert(source,'Actual transcript source was not captured');
 const chunks=q.db.prepare('SELECT payload FROM chunks WHERE binding=? ORDER BY id').all(binding.id).map(c=>JSON.parse(c.payload)),captured=Buffer.concat(chunks.map(c=>Buffer.from(c.data_base64,'base64'))),original=readFileSync(source.path).subarray(source.base);
 assert(captured.includes(Buffer.from('TEST_ONLY_CAPTURE_AFTER_BIND')),'Expected real tool event absent');assert.deepEqual(captured,original,'Actual host bytes differ from durable capture');
 console.log(JSON.stringify({test_only:true,host:'Claude Code',os:process.platform,session_id:session,models:Object.keys(result.modelUsage||{}),chunks:chunks.length,captured_bytes:captured.length,sha256:createHash('sha256').update(captured).digest('hex'),session_end_observed:!!binding.closed,closed:!!binding.closed,exact_bytes:true}));
}catch(error){console.error(error instanceof Error?error.message:'TEST ONLY host probe failed');console.error(JSON.stringify({stdout_bytes:output.length,stderr_bytes:diagnostics.length}));process.exitCode=1;}finally{clearTimeout(timer);q?.close();rmSync(root,{recursive:true,force:true});}
