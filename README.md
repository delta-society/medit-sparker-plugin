# AI Sparker — 시작하기

Claude와 작은 작업을 해보고, 내 업무에 쓸 기획서를 만듭니다. 처음 시작하거나 지난 실습을 이어갈 때 같은 명령을 쓰면 됩니다.

## 설치

Claude Code 대화창에 아래 세 줄을 한 줄씩 입력하세요.

```text
/plugin marketplace add delta-society/medit-sparker-plugin
/plugin install sparker-discovery@sparker
/plugin install sparker-camp@sparker
```

설치 후 Claude Code를 종료하고 자신의 실습 폴더에서 다시 실행하세요.

## 시작하거나 이어가기

```text
/sparker-camp:start
```

수업인지 과제인지 확인하고 필요한 준비부터 안내합니다. 이전에 한 실습은 저장된 진행 정보를 참고해 이어갑니다. “처음이에요”, “이어서 할게요”, “기획만 할게요”처럼 말해도 됩니다.

계정 연결이 필요하면 [참가자 앱](https://leaderboard-production-eac2.up.railway.app/)에서 코드를 만듭니다. 안내된 연결 프로그램을 **터미널**에서 열고 코드를 입력하세요. 코드는 Claude 대화창에 붙이지 않습니다. 자세한 순서는 [캠프 연결 안내](camp/PARTICIPANT.md)를 따릅니다.

## 실습에서 할 일

**작은 작업 해보기 → 반복 요청 만들기 → 외부 자료 연결 알아보기 → 내 업무 기획하기 → 과제 제출하기**

한 번에 한 행동씩 안내합니다. 어려우면 “쉽게 설명해줘”, 시간이 부족하면 “건너뛰기”라고 말하세요. 추가 기능 체험은 원할 때 진행합니다.

기획서를 확인한 뒤 “제출 준비해줘”라고 말하면 제출 ZIP을 만듭니다. 파일을 검토하고 참가자 앱의 같은 회차에 직접 올리세요. 파일 준비와 실제 제출은 별개입니다. PDF는 읽거나 공유하기 위한 선택 사항이며 제출 ZIP과 별도로 보관합니다.

## 필요한 준비물

| 준비물 | 언제 필요한가요? |
|---|---|
| Claude Code와 자신의 실습 폴더 | 시작할 때 |
| Node.js 22.13 이상 | Camp 도구를 실행할 때 |
| Python 3.9 이상 | 기획서 저장·제출 파일 준비, 설치 전에도 첫 대화·Skill 체험 가능 |
| Chrome 또는 Edge | PDF를 만들 때만 |

준비물 설치가 막히면 강사에게 알려주세요. 회사 보안 설정을 임의로 바꿀 필요는 없습니다.

## 업데이트

터미널에서 실행하고 Claude Code를 다시 시작하세요.

```sh
claude plugin marketplace update sparker
claude plugin update sparker-discovery@sparker
claude plugin update sparker-camp@sparker
```

## 더 알아보기

- [캠프 계정 연결·기록 상태·수업과 과제 전환](camp/PARTICIPANT.md)
- [기획서·과제 제출·다시 이어하기](https://github.com/delta-society/medit-sparker-discovery/blob/main/docs/plugin-guide.md)

운영진: [배포 기준](docs/distribution.md) · [Camp 운영·복구](camp/README.md) · [별도 교육 지원 센서](sensor/README.md)
