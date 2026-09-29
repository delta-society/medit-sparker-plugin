#!/usr/bin/env python3
"""Assemble a local review marketplace, without publishing or installing it."""
import argparse, hashlib, json, subprocess, zipfile
from pathlib import Path

p=argparse.ArgumentParser();p.add_argument('--discovery',required=True);p.add_argument('--output',required=True);p.add_argument('--week',type=int,choices=[2,3],default=2);a=p.parse_args()
market=f'sparker-week{a.week}-preview'
source=Path(a.discovery).resolve();camp=Path(__file__).resolve().parents[1];out=Path(a.output).resolve()
if out.exists():raise SystemExit('output already exists; choose a fresh path')
out.mkdir(parents=True);pkg=out/market;pkg.mkdir()
subprocess.run(['python3',str(source/'scripts/build-package.py'),'--output',str(out/'sparker-discovery.zip')],check=True)
with zipfile.ZipFile(out/'sparker-discovery.zip') as z:z.extractall(pkg/'discovery')
files=subprocess.check_output(['git','ls-files','-z'],cwd=camp).decode().split('\0')
allowed=['.claude-plugin/plugin.json','package.json','README.md']
allowed += [f for f in files if f.startswith(('camp/','hooks/','skills/','sensor/')) and not f.endswith('.test.mjs')]
with zipfile.ZipFile(out/'sparker-camp.zip','w',zipfile.ZIP_DEFLATED) as z:
 for name in sorted(set(allowed)):
  f=camp/name
  if not f.is_file() or f.is_symlink():raise ValueError('invalid release file: '+name)
  data=f.read_bytes();z.writestr(name,data)
with zipfile.ZipFile(out/'sparker-camp.zip') as z:z.extractall(pkg/'camp')
manifest={'name':market,'owner':{'name':'Delta Society'},'plugins':[{'name':'sparker-discovery','source':'./discovery'},{'name':'sparker-camp','source':'./camp'}]}
(pkg/'.claude-plugin').mkdir();(pkg/'.claude-plugin/marketplace.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(pkg/'START-HERE.md').write_text('''# Sparker @WEEK@주차 검토용 패키지

이 ZIP을 풀고 Claude Code 터미널에서 실행하세요. 설치 경로는 실제 압축 해제 경로로 바꿉니다.

```sh
claude plugin marketplace add /absolute/path/to/@MARKET@
claude plugin install sparker-discovery@@MARKET@
claude plugin install sparker-camp@@MARKET@
```

기존 sparker 버전과 검토 버전을 동시에 켜면 Camp 훅이 중복 실행될 수 있습니다. 기존 버전이 있으면 별도의 Claude 설정 디렉터리에서 검토하세요. 이번 패키지는 자동 업데이트되지 않습니다.
Claude Code 대화창에서 `/reload-plugins`를 실행한 뒤 `/sparker-camp:start @WEEK@주차 수업`을 입력합니다. 기록 동의·계정 연결은 기존 절차를 따릅니다.
Camp 기록 없이 기능만 검토하려면 Discovery ZIP만 `claude --plugin-dir /absolute/path/to/sparker-discovery.zip`로 열고 `/sparker-discovery:week@WEEK@`를 사용합니다.

## 주차별 시작과 제출 준비

| 주차 | 시작 | 제출 준비 | 결과물 |
|---|---|---|---|
| 1주차 | `/sparker-discovery:week1` | `/sparker-discovery:week1-submit` | 기획서 ZIP |
| 2주차 | `/sparker-discovery:week2` | `/sparker-discovery:week2-submit` | 코드·실행 안내·검증 기록 |
| 3주차 | `/sparker-discovery:week3` | `/sparker-discovery:week3-submit` | 참가자 확인 PDF 터미널 제출 |

3주차 제출은 최초 웹 계정 연결 뒤 터미널에서 전송·접수 확인까지 진행합니다. 검토본의 서버 기능은 운영에 아직 반영되지 않았으므로 제작자가 지정한 격리 시험 서버에서만 검증하세요. 운영 계정·실제 과제를 시험에 사용하지 마세요.

기존 `/sparker-discovery:submit`은 주차를 확인해 연결하는 호환 명령입니다. 2주차 작업을 1주차로 제출하지 않습니다.

기획서 읽기 → 첫 기능 선택 → 실제 실행 → 수정 → 검증·재개를 지원합니다. 제작 기록은 확정 기획서와 별도로 보존합니다. 제작 결과 ZIP은 선택한 파일만 담는 검토용이며 앱 업로드 완료를 뜻하지 않습니다.

검증 한계: 실제 Claude 모델 대화는 검증 계정의 API 잔액 부족으로 미실행입니다. 로컬 도우미/설치 시험 결과와 혼동하지 않습니다. 참가자용 main 배포는 별도 확인 전입니다.
'''.replace('@WEEK@',str(a.week)).replace('@MARKET@',market))
receipt={}
for repo in [source,camp]:
 receipt[repo.name]={'source_head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip(),'dirty':bool(subprocess.check_output(['git','status','--porcelain'],cwd=repo))}
receipt['files']={str(f.relative_to(pkg)):hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(pkg.rglob('*')) if f.is_file()}
(out/'manifest.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
with zipfile.ZipFile(out/(market+'.zip'),'w',zipfile.ZIP_DEFLATED) as z:
 for f in sorted(pkg.rglob('*')):
  if f.is_file():z.write(f,f.relative_to(out))
print(json.dumps({'kit':str(out/(market+'.zip')),'files':len(receipt['files'])},ensure_ascii=False))
