#!/usr/bin/env python3
"""Build an installable local review marketplace; no remote writes or installation."""
import argparse, hashlib, json, subprocess, zipfile
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--discovery',required=True);p.add_argument('--output',required=True);a=p.parse_args()
source=Path(a.discovery).resolve();camp=Path(__file__).resolve().parents[1];out=Path(a.output).resolve()
out.mkdir(parents=True,exist_ok=False);pkg=out/'sparker-week3-preview';pkg.mkdir()
subprocess.run(['python3',str(source/'scripts/build-package.py'),'--output',str(out/'sparker-discovery.zip')],check=True)
with zipfile.ZipFile(out/'sparker-discovery.zip') as z:z.extractall(pkg/'discovery')
tracked=subprocess.check_output(['git','ls-files','-z'],cwd=camp).decode().split('\0')
allowed=[camp/f for f in tracked if f in ['.claude-plugin/plugin.json','package.json','README.md'] or f.startswith(('camp/','hooks/','skills/','sensor/'))]
for f in allowed:
 if not f.is_file() or any(q.is_symlink() for q in [f,*f.parents] if q!=camp.parent):
  raise ValueError('invalid release path: '+str(f))
with zipfile.ZipFile(out/'sparker-camp.zip','w',zipfile.ZIP_DEFLATED) as z:
 for f in sorted(set(allowed)):z.write(f,f.relative_to(camp))
with zipfile.ZipFile(out/'sparker-camp.zip') as z:z.extractall(pkg/'camp')
manifest={'name':'sparker-week3-preview','owner':{'name':'Delta Society'},'plugins':[{'name':'sparker-discovery','source':'./discovery'},{'name':'sparker-camp','source':'./camp'}]}
(pkg/'.claude-plugin').mkdir();(pkg/'.claude-plugin/marketplace.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(pkg/'START-HERE.md').write_text('''# Sparker 3회차 실습 플러그인

## 바로 시험하기 — 대화 수집 없이

ZIP을 풀고 실제 제품 폴더에서 다음 명령으로 Claude Code를 엽니다.
아래 경로를 압축 해제한 폴더의 실제 경로로 바꾸고 따옴표는 유지합니다.

```sh
claude --plugin-dir "/absolute/path/to/sparker-week3-preview/discovery"
```

Claude Code 안에서 `/sparker-discovery:week3`를 입력합니다. 기존 제품의 기획·코드를 먼저 읽고 여섯 기준으로 평가합니다. 코드를 바꾸거나 입력·출력을 연결하지 않고 상세 문답으로 평가합니다. 전체 초안을 검토한 뒤 한 장 PDF로 저장합니다. 중단했다가 같은 제품 폴더에서 같은 명령으로 이어갈 수 있습니다. “현재 기록을 내보내줘”라고 하면 미완료·막힘을 포함한 보고서를 만듭니다. 제출 서버 접수는 아닙니다.

## Camp 진입까지 검토하기

기존 설치와 중복 활성화하지 마세요. **별도 Claude 설정 디렉터리**를 사용하거나 기존 설치를 분리한 검토 환경에서 설치합니다. 새 설정에서는 기존 로그인이 그대로 적용되지 않을 수 있습니다.

```sh
claude plugin marketplace add "/absolute/path/to/sparker-week3-preview"
claude plugin install sparker-discovery@sparker-week3-preview
claude plugin install sparker-camp@sparker-week3-preview
```

제품 폴더에서 Claude Code를 다시 열어 `/sparker-camp:start 3주차 수업`을 입력합니다. 기록 동의·계정 연결은 기존 절차를 유지합니다. Camp를 설치하면 기존 기록 훅도 포함되므로 기능만 검토하려면 위 Discovery 직접 실행을 사용하세요.

## 수업 진행

1. 이전 작성 코드를 읽고 입력·처리·결과·사람 몫을 요약합니다.
2. 여섯 기준으로 상세하게 묻고 답하며 참가자의 반론·수정을 반영합니다.
3. 판단·근거·미확인·유지할 부분·다음 행동이 담긴 한 장 초안을 검토합니다.
4. 참가자 확인 뒤 한 장 PDF 평가서를 저장합니다. Python 3.9+와 기존 Edge/Chrome을 사용하며 한글 폰트는 번들에 포함됩니다.

Confluence·Outlook·Slack 연결은 이번 플러그인의 필수 과정이 아닙니다. 비밀번호·인증키를 보고서에 넣지 않습니다. 코드 관측·실행·사용자 설명·미확인을 구분하며 합성 시험을 실제 운영 성공으로 보고하지 않습니다. 이 묶음은 검토용이며 공통 marketplace에 자동 반영되지 않습니다. 기존 1·2회차도 보존합니다.
''')
receipt={'files':{str(f.relative_to(pkg)):hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(pkg.rglob('*')) if f.is_file()}}
(out/'manifest.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
with zipfile.ZipFile(out/'sparker-week3-preview.zip','w',zipfile.ZIP_DEFLATED) as z:
 for f in sorted(pkg.rglob('*')):
  if f.is_file():z.write(f,f.relative_to(out))
print(json.dumps({'kit':str(out/'sparker-week3-preview.zip'),'files':len(receipt['files'])},ensure_ascii=False))
