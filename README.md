# AI Sparker — 시작하기

Claude와 작은 작업을 해보고, 내 업무에 쓸 기획서를 만듭니다. 처음 시작하거나 지난 실습을 이어갈 때 같은 명령을 쓰면 됩니다.

## 설치

Claude Code 대화창에 아래 세 줄을 한 줄씩 입력하세요.

```text
/plugin marketplace add delta-society/medit-sparker-plugin
/plugin install sparker-discovery@sparker
/plugin install sparker-camp@sparker
```

설치 후 Claude Code 대화창에 `/reload-plugins`를 입력하세요. 지원되지 않으면 종료한 뒤 자신의 실습 폴더에서 다시 실행하세요.

## 시작하거나 이어가기

```text
/sparker-camp:start
```

수업인지 과제인지 확인하고 필요한 준비부터 안내합니다. 이전에 한 실습은 저장된 진행 정보를 참고해 이어갑니다. “처음이에요”, “이어서 할게요”, “기획만 할게요”처럼 말해도 됩니다.

계정 연결이 필요하면 [참가자 앱](https://leaderboard-production-eac2.up.railway.app/)에서 코드를 만듭니다. 안내된 연결 프로그램을 **터미널**에서 열고 코드를 입력하세요. 코드는 Claude 대화창에 붙이지 않습니다. 자세한 순서는 [캠프 연결 안내](camp/PARTICIPANT.md)를 따릅니다.

## 1주차: 기획서 작성·제출

**작은 작업 해보기 → 반복 요청 만들기 → 외부 자료 연결 알아보기 → 내 업무 기획하기 → 과제 제출하기**

한 번에 한 행동씩 안내합니다. 어려우면 “쉽게 설명해줘”, 시간이 부족하면 “건너뛰기”라고 말하세요. 추가 기능 체험은 원할 때 진행합니다.

기획서를 확인한 뒤 `/sparker-discovery:week1-submit`을 실행하면 **1주차 기획서 ZIP**을 만듭니다. 파일을 검토하고 참가자 앱의 **1주차**에 직접 올리세요. 파일 준비와 실제 제출은 별개입니다. PDF는 읽거나 공유하기 위한 선택 사항이며 제출 ZIP과 별도로 보관합니다.

## 2주차: 기획서로 프로그램 만들기

`/sparker-camp:start 2주차 수업`으로 시작하세요. 기존 기획서의 위치를 알려주거나 파일을 제공하면, 로컬 제품 화면을 먼저 만들고 실제 스펙을 설명한 뒤, 제품 안의 작업 흐름 하나를 선택해 실행·수정·검증을 이어갑니다. “이어서”, “수정부터”, “검증부터”라고 요청할 수 있습니다.

`/sparker-discovery:week2-submit`은 **2주차 코드·실행 안내·검증 기록**을 준비합니다. 1주차 기획서를 다시 제출하거나 덮어쓰지 않습니다. 미완성 작업도 구현 기록으로 남길 수 있습니다.

원래 확정 기획서는 보존하고 제작 기록을 따로 저장합니다. 코드 작성과 실제 실행 성공은 구분하며, 자료가 없거나 실행이 막히면 그 사실과 다음 할 일을 남깁니다. 프로그램 전체를 업로드하지 않고 선택한 코드·실행 안내·시험 결과만 검토용으로 묶습니다. 2주차 구현 ZIP은 검토·공유용이며 기존 앱의 기획서 제출 ZIP과 형식이 다릅니다. 앱의 2주차 접수 지원은 별도 확인 전까지 완료로 안내하지 않습니다.

## 3주차: 코드 기반 평가·한 장 PDF

기존 설치자는 아래 [업데이트](#업데이트)를 실행하고 `/reload-plugins`를 입력하세요. 처음 참여하면 위 [설치](#설치)를 따릅니다. ZIP은 보조 배포이며 기존 설치와 중복해서 켜지 않습니다.

공통 Sparker 플러그인을 업데이트한 뒤 `/sparker-discovery:week3`으로 시작합니다. Camp 진입은 `/sparker-camp:start 3주차 수업`입니다. 이전 코드를 읽고 여섯 기준으로 상세하게 묻고 답하며, 참가자가 전체 초안을 검토한 뒤 한 장 PDF 평가서를 받습니다. 진행은 `.sparker-evaluation`에 저장해 재개할 수 있습니다. 입력·출력 연결과 제품 수정은 필수가 아니며 기존 1·2주차는 보존합니다. PDF는 Python 3.9+와 기존 Edge/Chrome을 사용합니다. 기존 설치자는 공통 업데이트 안내를 따르며 새 ZIP 설치는 필요하지 않습니다.

“현재 기록을 내보내줘”로 미완료·막힘까지 보고서에 남길 수 있습니다. 자료를 읽은 것과 제품에서 쓴 것, 발송 요청과 도착 확인은 구분합니다. 실제 서비스 접근이 막혀도 평가·설계는 계속하며, 로컬 연습을 Confluence·Outlook·Slack 연결 성공으로 표시하지 않습니다. 보고서 생성은 서버 제출이 아닙니다. 검토한 PDF가 준비되면 “이 보고서를 제출해줘” 또는 `/sparker-discovery:week3-submit`을 입력하세요. 처음에는 브라우저에서 기존 참가자 계정으로 로그인하고 터미널 제출 연결을 허용합니다. 이후 연결이 유효하면 웹을 열거나 파일을 선택하지 않고 **같은 터미널에서 PDF 전송과 접수 확인까지 완료**합니다. 이름·주차·파일을 다시 입력하지 않으며, 결과는 기존 홈페이지의 3주차 제출 내역에도 표시됩니다. 연결이 만료·해제됐을 때만 다시 연결합니다. Camp 기록 연결이나 그 연결 코드 재입력은 필요하지 않습니다.

## 필요한 준비물

| 준비물 | 언제 필요한가요? |
|---|---|
| Claude Code와 자신의 실습 폴더 | 시작할 때 |
| Node.js 22.13 이상 | Camp 도구를 실행할 때 |
| Python 3.9 이상 | 기획서 저장·제출 파일 준비, 설치 전에도 첫 대화·Skill 체험 가능 |
| Chrome 또는 Edge | PDF를 만들 때만 |

준비물 설치가 막히면 강사에게 알려주세요. 회사 보안 설정을 임의로 바꿀 필요는 없습니다.

## 업데이트

기존 설치자는 Claude Code 대화창에 아래 세 줄을 한 줄씩 입력하세요.

```text
/plugin marketplace update sparker
/plugin update sparker-discovery@sparker
/plugin update sparker-camp@sparker
```

완료 후 Claude Code 대화창에 `/reload-plugins`를 입력한 뒤 `/sparker-camp:start 3주차 수업`을 입력합니다. 기존 기획서·프로그램·평가 기록을 삭제하거나 다시 설치할 필요는 없습니다.

터미널에서 업데이트하려면 다음 명령을 사용합니다.

```sh
claude plugin marketplace update sparker
claude plugin update sparker-discovery@sparker
claude plugin update sparker-camp@sparker
```

## 더 알아보기

- [캠프 계정 연결·기록 상태·수업과 과제 전환](camp/PARTICIPANT.md)
- [기획서·과제 제출·다시 이어하기](https://github.com/delta-society/medit-sparker-discovery/blob/main/docs/plugin-guide.md)

운영진: [배포 기준](docs/distribution.md) · [Camp 운영·복구](camp/README.md) · [별도 교육 지원 센서](sensor/README.md)
