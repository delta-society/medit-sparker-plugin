#!/usr/bin/env node
// Explicit diagnostic: sanitized metadata uses only the already enrolled Camp spool.
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { safeOrigin } from './transport.mjs';
export function runCommand(args) {
  return new Promise(resolve=>execFile('claude',args,{timeout:5000,maxBuffer:16384,encoding:'utf8',windowsHide:true},(error,stdout)=>resolve({ok:!error||(args[0]==='auth'&&error.code===1&&!error.killed),stdout:!error||(args[0]==='auth'&&error.code===1&&!error.killed)?stdout:''})));
}
export async function probe(runner=runCommand,now=new Date().toISOString(),reportId=randomUUID()) {
  const version=await runner(['--version']);
  const match=version.ok&&/^\s*(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]{1,40})?)(?:\s+\(Claude Code\))?\s*$/.exec(version.stdout);
  const auth=await runner(['auth','status','--json']);
  let parsed=null;
  try {if(auth.ok) parsed=JSON.parse(auth.stdout);} catch {}
  const valid=parsed&&typeof parsed==='object'&&!Array.isArray(parsed)&&typeof parsed.loggedIn==='boolean';
  const cliAvailable=!!match;
  const loggedIn=cliAvailable&&valid?parsed.loggedIn:null;
  return {schemaVersion:1,reportId,observedAt:now,cliVersion:match?match[1]:null,pluginVersion:null,firstRunObserved:null,cliAvailable,loggedIn,
    authMethod:loggedIn!==null?(['claudeai','api_key'].includes(parsed.authMethod)?parsed.authMethod:typeof parsed.authMethod==='string'?'other':'unknown'):'unknown',
    subscriptionType:loggedIn===true&&['pro','max','team','enterprise'].includes(parsed.subscriptionType)?parsed.subscriptionType:'unknown',
    probeStatus:cliAvailable&&valid?'ok':cliAvailable?'partial':'failed'};
}

export async function captureReadiness(queue,directory,session,cwd,{runner=runCommand}={}) {
  const config=JSON.parse(readFileSync(join(directory,'connection.json'),'utf8'));
  safeOrigin(config.origin);
  if(!/^[a-zA-Z0-9_-]{43}$/.test(config.token)||typeof config.owner_id!=='string'||!config.owner_id||typeof config.camp_id!=='string'||!config.camp_id) throw Error('Camp enrollment required');
  const binding=queue.binding(session,cwd);
  if(!binding) throw Error('Camp binding required');
  const readiness=await probe(runner);
  const rows=queue.db.prepare("SELECT offset,base FROM sources WHERE binding=? AND kind='main'").all(binding.id);
  readiness.firstRunObserved=rows.some(r=>r.offset>r.base)?true:null;
  try {
    const version=JSON.parse(readFileSync(new URL('../.claude-plugin/plugin.json',import.meta.url),'utf8')).version;
    if(/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]{1,40})?$/.test(version)) readiness.pluginVersion=version;
  } catch {}
  queue.db.exec('CREATE TABLE IF NOT EXISTS readiness_diagnostics(binding TEXT PRIMARY KEY,owner TEXT NOT NULL,camp TEXT NOT NULL,payload TEXT NOT NULL)');
  queue.db.prepare('INSERT INTO readiness_diagnostics VALUES(?,?,?,?) ON CONFLICT(binding) DO UPDATE SET owner=excluded.owner,camp=excluded.camp,payload=excluded.payload').run(binding.id,config.owner_id,config.camp_id,JSON.stringify(readiness));
  return readiness;
}
export function queuedReadiness(queue,binding,config) {
  if(!queue.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='readiness_diagnostics'").get())return null;
  const row=queue.db.prepare('SELECT payload FROM readiness_diagnostics WHERE binding=? AND owner=? AND camp=?').get(binding,config.owner_id,config.camp_id);
  return row?JSON.parse(row.payload):null;
}

// Revoke only this spool's worker lease. Its token-guarded heartbeat and cleanup
// cannot renew the lease or delete the replacement worker's claim.
export function handoverReadinessWorker(queue) {
  return queue.transaction(()=>{
    if(!queue.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='worker'").get())return false;
    return queue.db.prepare('UPDATE worker SET until=0,token=? WHERE id=1').run(randomUUID()).changes>0;
  });
}
