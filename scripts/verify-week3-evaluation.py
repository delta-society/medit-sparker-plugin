"""Exercise final extracted plugin with explicitly synthetic evaluation, including PDF."""
import json,subprocess,sys
from pathlib import Path
plugin=Path(sys.argv[1]).resolve();out=Path(sys.argv[2]).resolve();out.mkdir(parents=True,exist_ok=False)
cmd=[sys.executable,str(plugin/'scripts/evaluation.py'),'--root',str(out/'records'),'--case','sample']
def run(*args,ok=True):
 r=subprocess.run(cmd+list(args),capture_output=True,text=True,timeout=80)
 if ok and r.returncode:raise RuntimeError(r.stdout+r.stderr)
 if not ok:assert r.returncode!=0;return r.stdout
 return json.loads(r.stdout)
d=run('template')
d.update(title='실패 알림 문안 도구 · 합성 예시',user='빌드 오류를 확인하는 개발 담당자',purpose='실패 기록과 관련 변경을 모아 담당자에게 보낼 메일 초안을 만든다.',done_when='사람이 근거와 수신자를 검토한 뒤 메일을 발송한다.',source='합성 사례. 실제 참가자의 답변·최종 평가가 아닙니다.',human='원인 관련성·수신자·문안을 확인하고 직접 발송한다.',keep='사람의 검토와 수동 발송. 자동 발송을 필수 개선으로 잡지 않는다.')
rows=[('아직 모름','미확인','실제 업무에서 가장 오래 걸리는 단계와 절감 효과는 미측정.','최근 실패 한 건의 작업 순서와 시간을 확인한다.'),('아직 모름','미확인','다른 사용자의 사내 자료 조회 권한은 확인하지 못함.','실사용자가 본인인지 동료까지인지 먼저 정한다.'),('부족함','실행','합성 시험: 키워드가 겹치는 작성자가 후보가 되어도 실제 담당자는 별도 판단 필요.','원인과 관련된 변경 내용을 후보와 함께 확인한다.'),('확인됨','코드','합성 코드 조건: 본인 PC에서 실행하는 로컬 도구. 공용 배포 필요는 미확인.','본인 PC에서만 쓰는 방식이 충분한지 확인한다.'),('확인됨','사용자 설명','가정한 답: 사람이 검토·발송하면 업무가 끝나며 자동 발송은 필요하지 않음.','실제 참가자 답에 따라 완료 기준을 보정한다.'),('아직 모름','미확인','장기 사용과 오류 발생 시 복구 절차는 시험하지 않음.','처리 표시 실수와 재발 때의 대응을 확인한다.')]
for item,(j,e,b,n) in zip(d['criteria'],rows):item.update(judgment=j,evidence=e,basis=b,next=n,reviewed=True)
d['actions']=[dict(action='실제 실패 사례에서 추천 후보와 조치 담당자를 대조한다.',check='잘못된 후보를 사람이 근거로 구분할 수 있는지 확인한다.'),dict(action='실사용자와 업무 완료 시점을 확인한다.',check='본인 전용·수동 발송으로 목적을 달성하는지 실제 사용자에게 묻는다.')]
f=out/'draft.json';f.write_text(json.dumps(d,ensure_ascii=False),encoding='utf-8')
r=run('save','--file',str(f));assert run('show')==r
rejected=run('pdf',ok=False)
c=run('confirm','--digest',r['digest'],'--statement','합성 시험용 확인 — 실제 참가자 승인 아님')
pdf=run('pdf');assert Path(pdf['pdf']).is_file()
d['purpose']='합성 수정: 기존 목적을 바꾸면 확인을 다시 받는다.';f.write_text(json.dumps(d,ensure_ascii=False),encoding='utf-8');edited=run('save','--file',str(f));assert edited['status']=='draft';run('pdf',ok=False)
receipt=dict(fixture='synthetic; not participant approval',draft_pdf_rejected=bool(rejected),fresh_process_resume=True,confirmed_pdf=pdf,edit_resets_confirmation=True)
(out/'receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(receipt,ensure_ascii=False,indent=2))
