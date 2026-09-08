#!/usr/bin/env node
import {createInterface} from 'node:readline/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {enroll} from './transport.mjs';
const input=createInterface({input:process.stdin,output:process.stdout});
try{
 if(!process.stdin.isTTY)throw Error('Use your own interactive terminal');
 const origin=process.argv[2]||'https://leaderboard-production-eac2.up.railway.app';
 const code=(await input.question('참가자 앱에서 만든 캠프 연결 코드: ')).trim();
 await enroll(process.env.CAMP_SPOOL_DIR||join(homedir(),'.sparker-camp'),origin,code);
 console.log('계정 연결을 저장했어요. Claude Code로 돌아가 /sparker-camp:start를 입력해 주세요. 기록 수신 여부는 활동을 시작한 뒤 확인할 수 있어요.');
 const worker=spawn(process.execPath,['--disable-warning=ExperimentalWarning',fileURLToPath(new URL('./cli.mjs',import.meta.url)),'worker'],{detached:true,stdio:'ignore',windowsHide:true});worker.on('error',()=>{});worker.unref();
}catch{console.error('연결하지 못했습니다. 참가자 앱에서 새 코드를 만들고 운영진과 함께 다시 확인해 주세요. 기존 대기 기록은 보관됩니다.');process.exitCode=1;}finally{input.close();}
