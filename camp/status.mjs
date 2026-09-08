import {existsSync} from 'node:fs';
import {join} from 'node:path';
/** A local snapshot scoped to this host session. Never reads credentials or transcript content. */
export function participantStatus(queue,directory,session,cwd){
 const connection_saved=existsSync(join(directory,'connection.json'));
 const binding=session?queue.binding(session,cwd):null;
 const base={connection_saved,local_binding:!!binding,server_received:false};
 if(!binding)return {...base,state:'not_started',message:'이 대화에서는 아직 활동을 시작하지 않았어요.'};
 const {week,phase}=JSON.parse(binding.payload);
 const counts=queue.db.prepare('SELECT count(*) AS total, count(receipt) AS received FROM chunks WHERE binding=?').get(binding.id);
 const pending_chunks=counts.total-counts.received;
 const capture_error=!!binding.error||queue.db.prepare('SELECT count(*) AS n FROM pending_agent_stops WHERE binding=?').get(binding.id).n>0||(!!binding.closed&&queue.db.prepare('SELECT count(*) AS n FROM host_agents WHERE binding=? AND ended=0').get(binding.id).n>0);
 let state,message;
 if(capture_error){state='capture_attention';message='기록 일부를 보관했는지 확인이 필요해요. 실습은 계속하고 운영진에게 도움을 요청해 주세요.';}
 else if(!connection_saved){state='connection_needed';message='활동을 시작했어요. 기록을 보내려면 계정 연결이 필요해요. 연결 전에도 실습은 계속할 수 있어요.';}
 else if(pending_chunks){state='pending';message='이 대화의 기록 일부가 전송을 기다리고 있어요. 실습은 계속할 수 있어요.';}
 else if(counts.received){state='received';message='이 대화에서 전송한 기록의 서버 수신을 확인했어요. 새로 생긴 기록은 다음 전송을 기다릴 수 있어요.';}
 else {state='awaiting_receipt';message='계정 연결 정보가 저장돼 있어요. 아직 이 대화의 기록 수신은 확인되지 않았어요.';}
 return {...base,binding_id:binding.id,week,phase,closed:!!binding.closed,capture_error,pending_chunks,received_chunks:counts.received,server_received:counts.received>0,state,message};
}
