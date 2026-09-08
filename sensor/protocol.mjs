// Public metadata-only wire contract. Identity is supplied by the authenticated server.
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const enums = {
 event_type:['session_start','session_end','tool_result','permission_decision','mcp_status','usage'],
 week:['w0','w1','w2','w3','w4'], start_type:['fresh','resume','compact'],
 tool_category:['read','plan','write','execute','verify','search','other'],
 error_category:['none','permission','validation','execution','network','timeout','other'],
 permission_decision:['allow','deny','ask'],mcp_status:['connected','disconnected','error'],
};
const keys=['event_id','week','ts','source_version','event_type','session_id','start_type','tool_category','success','error_category','duration_ms','permission_decision','mcp_status','tokens_in','tokens_out'];
export function validateEvent(input, now=Date.now()) {
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!keys.includes(k)))throw Error('Invalid sensor fields');
 /** @type {Record<string, any>} */
 const event={};
 for(const k of keys)if(Object.hasOwn(input,k))event[k]=input[k];
 if(!UUID.test(event.event_id)||typeof event.source_version!=='string'||!/^\d{1,3}(?:\.\d{1,3}){0,3}$/.test(event.source_version)||typeof event.ts!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(event.ts)||!Number.isFinite(Date.parse(event.ts))||Date.parse(event.ts)>now+60000||Date.parse(event.ts)<now-7*86400000)throw Error('Invalid sensor metadata');
 for(const [key,values] of Object.entries(enums))if((['event_type','week'].includes(key)||key in event)&&!values.includes(event[key]))throw Error('Invalid sensor category');
 if('session_id'in event&&!UUID.test(event.session_id))throw Error('Invalid session');
 if('success'in event&&typeof event.success!=='boolean')throw Error('Invalid result');
 for(const key of ['duration_ms','tokens_in','tokens_out'])if(key in event&&(!Number.isSafeInteger(event[key])||event[key]<0||event[key]>1e9))throw Error('Invalid count');
 if(event.event_type==='tool_result'&&(!event.tool_category||typeof event.success!=='boolean'))throw Error('Missing result');
 if(event.event_type==='permission_decision'&&!event.permission_decision)throw Error('Missing decision');
 if(event.event_type==='mcp_status'&&!event.mcp_status)throw Error('Missing status');
 event.ts=new Date(event.ts).toISOString();return event;
}
