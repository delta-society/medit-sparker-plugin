#!/usr/bin/env python3
"""Exercise extracted Week3 CLI against a real local synthetic product, not SaaS."""
import argparse,csv,hashlib,json,subprocess,sys
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('plugin');p.add_argument('output');a=p.parse_args()
plugin=Path(a.plugin).resolve();root=Path(a.output).resolve();root.mkdir(parents=True,exist_ok=False)
cli=plugin/'scripts/week3.py'
(root/'planning.md').write_text('# 합성 실습\nCSV 금액을 합산해 로컬 수신 폴더에 전달한다.\n')
(root/'product.py').write_text('import csv,json,sys\nfrom pathlib import Path\nrows=list(csv.DictReader(Path(sys.argv[1]).open()))\nPath(sys.argv[2]).write_text(json.dumps({"total":sum(int(r["amount"]) for r in rows)}))\n')
original={n:hashlib.sha256((root/n).read_bytes()).hexdigest() for n in ['planning.md','product.py']}
def run(action,*args,ok=True):
 r=subprocess.run([sys.executable,str(cli),'--project',str(root),action,'practice',*args],cwd=root,capture_output=True,text=True,timeout=20)
 if ok:
  assert r.returncode==0,r.stderr
  return json.loads(r.stdout)
 assert r.returncode!=0
 return {'rejected':True}
def payload(name,data):
 f=root/name;f.write_text(json.dumps(data,ensure_ascii=False));return str(f)
s=run('new','--input',payload('source.json',{'summary':'합성 CSV 합계 업무','plan_ref':'planning.md','product_ref':'product.py'}))
def append(data,ok=True):
 global s
 r=run('append','--input',payload('event.json',data),'--expected-revision',str(s['revision']),ok=ok)
 if ok:s=r
 return r
def assessments(when):
 for criterion in ['쓸 이유','자료와 권한','결과 신뢰성','이용 가능성','업무 연결','지속 사용']:
  append({'kind':'assessment','when':when,'criterion':criterion,'judgment':'아직 모름','evidence':'합성 로컬 연습. 실사용 효과·SaaS 권한 미검증.','next_action':'실제 사용자 환경에서 확인'})
assessments('before')
assert original=={n:hashlib.sha256((root/n).read_bytes()).hexdigest() for n in original}
append({'kind':'design','trigger':'실습 요청','source':'합성 CSV','input':'amount','processing':'product.py 합계','human_decision':'합계와 원문 비교','output':'합계 JSON','recipient':'local-inbox','next_action':'확인 후 다음 업무 판단','failure_recovery':'행 오류 확인 후 재실행','change_consent':'합성 시험 참가자 역할: 로컬 연습 진행 동의'})
(root/'input.csv').write_text('amount\n10\n20\n')
def h(name):return hashlib.sha256((root/name).read_bytes()).hexdigest()
def ev(kind,name,**extra):return dict(kind=kind,run='local-1',mode='local_rehearsal',artifact=name,sha256=h(name),observation='실제 로컬 합성 실행 확인; SaaS 아님',**extra)
append(ev('input_read','input.csv'))
assert not s['evidence_chain_complete']
subprocess.run([sys.executable,str(root/'product.py'),str(root/'input.csv'),str(root/'result.json')],check=True)
assert json.loads((root/'result.json').read_text())['total']==30
append(ev('product_use','result.json',input_sha256=h('input.csv')))
append({'kind':'finish','consent':'합성 시험','next_action':'다음'},ok=False)
append({'kind':'output_approval','run':'local-1','mode':'local_rehearsal','recipient':'local-inbox','content_sha256':h('result.json'),'consent':'합성 시험 참가자 역할: 이 결과를 local-inbox로 전달'})
(root/'local-inbox').mkdir();(root/'local-inbox/result.json').write_bytes((root/'result.json').read_bytes())
(root/'sent.json').write_text(json.dumps({'target':'local-inbox/result.json','sha256':h('result.json')}))
append(ev('output_sent','sent.json',recipient='local-inbox',content_sha256=h('result.json')))
assert not s['evidence_chain_complete']
received=(root/'local-inbox/result.json').read_bytes();assert hashlib.sha256(received).hexdigest()==h('result.json')
(root/'receipt.json').write_text(json.dumps({'observed_total':json.loads(received)['total'],'readback_sha256':hashlib.sha256(received).hexdigest()}))
append(ev('output_received','receipt.json',recipient='local-inbox',content_sha256=h('result.json')))
assessments('after');append({'kind':'finish','consent':'합성 시험: 결과와 미검증 조건 확인','next_action':'실제 SaaS 권한·수신 도구 확인'})
reopened=run('show');assert reopened==s;assert s['learning_review_complete'];assert s['mode']=='local_rehearsal';assert s['production_readiness']=='not_certified'
export=run('export','--output',str(root/'report.md'));assert (root/'report.md').is_file()
assert original=={n:hashlib.sha256((root/n).read_bytes()).hexdigest() for n in original}
receipt={'source_plugin':str(plugin),'synthetic':True,'mode':s['mode'],'actual_product_result':json.loads((root/'result.json').read_text()),'input_used':True,'local_received_readback':True,'premature_finish_rejected':True,'sent_not_received':True,'resume_matches':True,'original_files_unchanged':True,'live_saas_verified':False,'model_dialogue_verified':False,'export':export}
(root/'acceptance.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n');print(json.dumps(receipt,ensure_ascii=False,indent=2))
