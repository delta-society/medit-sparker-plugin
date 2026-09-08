import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {randomUUID} from 'node:crypto';
import {Queue} from '../camp/queue.mjs';import {suggestHelp} from '../camp/help.mjs';
test('help gates repeated attempts, serious homework and persists once-per-issue across restart',()=>{
 const root=mkdtempSync(join(tmpdir(),'camp-help-'));let q;
 try{q=new Queue(root);const id=q.bind({session:randomUUID(),cwd:root,week:1,phase:'homework'}),issue='github-login-permission';
 assert.equal(suggestHelp(q,id,{issue,attempts:2,serious:true}).suggest,false);assert.equal(suggestHelp(q,id,{issue,attempts:5}).suggest,false);assert.equal(suggestHelp(q,id,{issue,attempts:3,serious:true}).suggest,true);q.close();q=new Queue(root);assert.equal(suggestHelp(q,id,{issue,attempts:8,serious:true}).suggest,false);
 const classId=q.bind({session:randomUUID(),cwd:root,week:1,phase:'class'});assert.equal(suggestHelp(q,classId,{issue,attempts:3}).suggest,true);
 }finally{q?.close();rmSync(root,{recursive:true,force:true});}
});
