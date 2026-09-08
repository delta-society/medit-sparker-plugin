/** Durable Camp spool. No network operation runs inside capture transactions. */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync, openSync, closeSync, fstatSync, readSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
export const MAX_CHUNK = 262144;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function prefixHasher(fd,size){const hash=createHash('sha256'),buffer=Buffer.alloc(65536);for(let at=0;at<size;){const n=Math.min(buffer.length,size-at);if(readSync(fd,buffer,0,n,at)!==n)throw Error('Transcript changed during verification');hash.update(buffer.subarray(0,n));at+=n;}return hash;}
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export class Queue {
  constructor(directory) {
    mkdirSync(directory,{recursive:true,mode:0o700});
    this.db = new DatabaseSync(join(directory,'camp.sqlite'));
    chmodSync(join(directory,'camp.sqlite'),0o600);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS bindings(id TEXT PRIMARY KEY,session TEXT UNIQUE NOT NULL,cwd TEXT NOT NULL,payload TEXT NOT NULL,bound INTEGER NOT NULL DEFAULT 0,closed INTEGER NOT NULL DEFAULT 0,error INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS sources(binding TEXT NOT NULL,path TEXT NOT NULL,stream TEXT NOT NULL,generation INTEGER NOT NULL,kind TEXT NOT NULL,identity TEXT NOT NULL,offset INTEGER NOT NULL,base INTEGER NOT NULL,tail TEXT NOT NULL,final INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(binding,path));
      CREATE TABLE IF NOT EXISTS pending_agent_stops(session TEXT NOT NULL,agent TEXT NOT NULL,binding TEXT NOT NULL,path TEXT NOT NULL,PRIMARY KEY(session,agent));
      CREATE TABLE IF NOT EXISTS host_agents(session TEXT NOT NULL,agent TEXT NOT NULL,binding TEXT NOT NULL,ended INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(session,agent));
      CREATE TABLE IF NOT EXISTS source_intents(binding TEXT NOT NULL,path TEXT NOT NULL,kind TEXT NOT NULL,final INTEGER NOT NULL,PRIMARY KEY(binding,path));
      CREATE TABLE IF NOT EXISTS anchors(binding TEXT PRIMARY KEY,offset INTEGER NOT NULL,hash TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS source_errors(binding TEXT NOT NULL,path TEXT NOT NULL,kind TEXT NOT NULL,final INTEGER NOT NULL,PRIMARY KEY(binding,path));
      CREATE TABLE IF NOT EXISTS chunks(id INTEGER PRIMARY KEY,binding TEXT NOT NULL,payload TEXT NOT NULL,receipt TEXT,UNIQUE(binding,payload));`);
  }
  close(){this.db.close();}
  transaction(fn){this.db.exec('BEGIN IMMEDIATE');try{const result=fn();this.db.exec('COMMIT');return result;}catch(error){this.db.exec('ROLLBACK');throw error;}}
  bind({session,cwd,week,phase,activity=randomUUID(),transcript}) {
    if(!uuid(session)||!uuid(activity)||!Number.isInteger(week)||week<1||week>4||!['class','homework'].includes(phase))throw Error('Invalid Camp binding');
    const root=realpathSync(cwd);
    return this.transaction(()=>{
      const old=this.db.prepare('SELECT * FROM bindings WHERE session=?').get(session);
      if(old){const p=JSON.parse(old.payload);if(old.cwd!==root||p.week!==week||p.phase!==phase||old.closed)throw Error('Session already bound; start a new session');return old.id;}
      const id=randomUUID(),payload={contract_version:1,binding_id:id,activity_id:activity,session_id:session,week,phase};
      this.db.prepare('INSERT INTO bindings(id,session,cwd,payload) VALUES(?,?,?,?)').run(id,session,root,JSON.stringify(payload));
      if(transcript){const path=realpathSync(transcript),fd=openSync(path,'r');try{const stat=fstatSync(fd);if(!stat.isFile())throw Error('Transcript must be a file');const anchorHash=prefixHasher(fd,stat.size).digest('hex');this.db.prepare('INSERT INTO sources VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,path,randomUUID(),0,'main',`${stat.dev}:${stat.ino}`,stat.size,stat.size,anchorHash,0);this.db.prepare('INSERT INTO anchors VALUES(?,?,?)').run(id,stat.size,anchorHash);this.db.prepare('INSERT INTO source_intents VALUES(?,?,?,0)').run(id,path,'main');}finally{closeSync(fd);}}
      return id;
    });
  }
  binding(session,cwd){const b=this.db.prepare('SELECT * FROM bindings WHERE session=?').get(session);return b&&b.cwd===realpathSync(cwd)?b:null;}
  capture(binding,path,{kind='main',final=false,budget=8*1024*1024}={}) {
    if(!['main','subagent'].includes(kind))throw Error('Invalid source');
    this.db.prepare('INSERT INTO source_intents VALUES(?,?,?,?) ON CONFLICT(binding,path) DO UPDATE SET final=max(final,excluded.final)').run(binding,path,kind,+final);
    let fd;
    try{const canonical=realpathSync(path);fd=openSync(canonical,'r');return this.transaction(()=>{
      const b=this.db.prepare('SELECT * FROM bindings WHERE id=?').get(binding);if(!b)throw Error('Unknown binding');
      const stat=fstatSync(fd);if(!stat.isFile())throw Error('Transcript must be a regular file');
      const identity=`${stat.dev}:${stat.ino}`;
      let source=this.db.prepare('SELECT * FROM sources WHERE binding=? AND path=?').get(binding,canonical);
      const anchor=kind==='main'?this.db.prepare('SELECT * FROM anchors WHERE binding=?').get(binding):null;
      const anchorOffset=()=>{if(!anchor)return 0;if(stat.size<anchor.offset||prefixHasher(fd,anchor.offset).digest('hex')!==anchor.hash)throw Error('Cannot verify start boundary after rotation');return anchor.offset;};
      if(!source){const base=anchorOffset();source={stream:randomUUID(),generation:0,kind,identity,offset:base,base,tail:'',final:0};}
      if(source.kind!==kind)throw Error('Source kind changed');
      const replaced=source.identity!==identity||stat.size<source.offset||(source.tail&&prefixHasher(fd,source.offset).digest('hex')!==source.tail);
      if(replaced){const base=anchorOffset();source={...source,generation:source.generation+1,identity,offset:base,base,tail:'',final:0};}
      if(source.final){if(stat.size===source.offset){this.clearError(binding,path);return 0;}source={...source,generation:source.generation+1,base:source.offset,final:0};}
      const snapshot=prefixHasher(fd,source.offset);
      let captured=0;
      while(source.offset<stat.size&&captured<budget){
        const length=Math.min(MAX_CHUNK,stat.size-source.offset,budget-captured),bytes=Buffer.alloc(length);
        if(readSync(fd,bytes,0,length,source.offset)!==length)throw Error('Transcript changed during read');
        snapshot.update(bytes);
        const end=source.offset+length,isFinal=final&&end===stat.size;
        this.enqueue(binding,source,bytes,isFinal);source.offset=end;source.final=+isFinal;captured+=length;
      }
      if(final&&!source.final&&source.offset===stat.size){this.enqueue(binding,source,Buffer.alloc(0),true);source.final=1;}
      source.tail=snapshot.digest('hex');
      if(prefixHasher(fd,source.offset).digest('hex')!==source.tail)throw Error('Transcript changed during capture');
      this.db.prepare(`INSERT INTO sources VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(binding,path) DO UPDATE SET
        generation=excluded.generation,identity=excluded.identity,offset=excluded.offset,base=excluded.base,tail=excluded.tail,final=excluded.final`)
        .run(binding,canonical,source.stream,source.generation,kind,identity,source.offset,source.base,source.tail,source.final);
      this.clearError(binding,path);return captured;
    });}catch(error){this.db.prepare('INSERT INTO source_errors VALUES(?,?,?,?) ON CONFLICT(binding,path) DO UPDATE SET final=max(final,excluded.final)').run(binding,path,kind,+final);this.db.prepare('UPDATE bindings SET error=1 WHERE id=?').run(binding);throw error;}finally{if(fd!==undefined)closeSync(fd);}
  }
  clearError(binding,path){this.db.prepare('DELETE FROM source_errors WHERE binding=? AND path=?').run(binding,path);this.db.prepare('UPDATE bindings SET error=EXISTS(SELECT 1 FROM source_errors WHERE binding=?) WHERE id=?').run(binding,binding);}
  enqueue(binding,s,bytes,final){const payload={contract_version:1,binding_id:binding,stream_id:s.stream,generation:s.generation,source_kind:s.kind,base_offset:s.base,start_offset:s.offset,end_offset:s.offset+bytes.length,content_sha256:digest(bytes),data_base64:bytes.toString('base64'),final};this.db.prepare('INSERT INTO chunks(binding,payload) VALUES(?,?)').run(binding,JSON.stringify(payload));}
  pending(limit=128){return this.db.prepare('SELECT id,binding,payload FROM chunks WHERE receipt IS NULL ORDER BY id LIMIT ?').all(limit);}
  acknowledge(id,receipt){
    return this.transaction(()=>{const c=this.db.prepare('SELECT * FROM chunks WHERE id=?').get(id);if(!c)throw Error('Unknown chunk');const p=JSON.parse(c.payload);
      for(const key of ['contract_version','binding_id','stream_id','generation','start_offset','end_offset','content_sha256','final'])if(receipt?.[key]!==p[key])throw Error('Mismatched durable receipt');
      const b=JSON.parse(this.db.prepare('SELECT payload FROM bindings WHERE id=?').get(c.binding).payload);
      if(receipt.session_id!==b.session_id||typeof receipt.receipt_id!=='string'||!/^[a-f0-9]{64}$/.test(receipt.receipt_id)||!Number.isFinite(Date.parse(receipt.received_at)))throw Error('Invalid durable receipt');
      this.db.prepare('UPDATE chunks SET receipt=? WHERE id=?').run(JSON.stringify(receipt),id);
    });
  }
}
