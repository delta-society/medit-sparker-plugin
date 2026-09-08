/** Model chooses a semantic issue key; durable gate enforces frequency and homework severity. */
export function suggestHelp(queue,binding,{issue,attempts,serious=false}){
 if(typeof issue!=='string'||!/^[a-z][a-z0-9-]{2,79}$/.test(issue)||!Number.isInteger(attempts)||attempts<3)return {suggest:false};
 const row=queue.db.prepare('SELECT payload FROM bindings WHERE id=?').get(binding);if(!row)return {suggest:false};
 const {phase}=JSON.parse(row.payload);if(phase==='homework'&&!serious)return {suggest:false};
 queue.db.exec('CREATE TABLE IF NOT EXISTS help_suggestions(binding TEXT NOT NULL,issue TEXT NOT NULL,at TEXT NOT NULL,PRIMARY KEY(binding,issue))');
 return queue.transaction(()=>{
  const inserted=queue.db.prepare('INSERT OR IGNORE INTO help_suggestions VALUES(?,?,?)').run(binding,issue,new Date().toISOString());
  if(!inserted.changes)return {suggest:false};
  return {suggest:true,message:phase==='class'?'같은 문제에서 몇 차례 시도했지만 아직 진행하지 못했어요. 손을 들어 운영자에게 함께 확인해 달라고 요청해 주세요.':'여러 방법을 시도했지만 과제를 계속하기 어려운 상태예요. 지금 막힌 상황을 운영자에게 알려 도움을 요청해 주세요.'};
 });
}
