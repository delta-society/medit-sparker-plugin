# AI Sparker — 참가자 설치 안내

교육 실습과 캠프 기록에 필요한 두 플러그인을 한 곳에서 설치합니다.

| 플러그인 | 하는 일 |
|---|---|
| `sparker-discovery` 0.6.1 | 온보딩·Week 1 실습, 업무 기획서, 선택형 PDF, 과제 제출 파일 준비 |
| `sparker-camp` 0.1.1 | 회차 연결 이후 대화 기록 보관·자동 전송, 반복 막힘 도움 안내 |

## 준비물

- 실행 가능한 Claude Code와 자신의 로컬 실습 폴더
- Node.js 22.13 이상: Camp 기록에 필요
- Python 3.9 이상: 기획서 저장·제출 파일 준비에 필요
- Chrome 또는 Edge: PDF를 만들 때만 필요

## 설치

Claude Code 대화창에 한 줄씩 입력하세요.

```text
/plugin marketplace add delta-society/medit-sparker-plugin
/plugin install sparker-discovery@sparker
/plugin install sparker-camp@sparker
```

설치 후 Claude Code를 종료하고 자신의 실습 폴더에서 다시 실행하세요. ZIP 다운로드나 Discovery 저장소의 별도 마켓플레이스 등록은 필요 없습니다.

## 캠프 연결과 첫 실습

1. [참가자 앱](https://leaderboard-production-eac2.up.railway.app/)에 로그인합니다. **내 계정·설정 → 캠프 대화 기록 연결**에서 연결 코드를 만들고 운영진과 함께 [계정 연결](camp/README.md)을 완료합니다. 코드는 대화창에 붙이지 않고 연결 프로그램의 입력창에 입력합니다.
2. Claude Code 대화창에서 이번 회차를 명시적으로 시작합니다. 1주차 수업은 `/sparker-camp:camp-start 1 class`, 과제는 `/sparker-camp:camp-start 1 homework`입니다.
3. 처음이면 `/sparker-discovery:onboarding`, 1주차 실습은 `/sparker-discovery:week1`을 실행합니다.

주차나 수업/과제를 바꿀 때는 `/clear`로 새 대화를 만든 뒤 해당 회차를 시작합니다. 기존 대화를 재개할 때는 기존 연결을 유지합니다. 설치만으로 계정 연결이나 서버 수신이 완료되지는 않습니다. 연결에 문제가 있어도 실습은 계속하고 운영진에게 확인합니다.

기획서와 제출 파일은 자신의 실습 폴더에 저장됩니다. 검토한 파일은 참가자 앱의 해당 회차에 직접 업로드합니다. **과제 ZIP에 세션 원본을 넣는 선택과 Camp 대화 기록 연결은 별개**입니다. ZIP 제출이 자동 수집을 대신하거나 수집 범위를 바꾸지는 않습니다.

## 업데이트

터미널에서 실행하고 Claude Code를 다시 시작하세요.

```sh
claude plugin marketplace update sparker
claude plugin update sparker-discovery@sparker
claude plugin update sparker-camp@sparker
```

## 상세 안내

- [Discovery 실습·기획서 사용법](https://github.com/delta-society/medit-sparker-discovery/blob/main/docs/plugin-guide.md)
- [Camp 계정 연결·기록 범위·복구](camp/README.md)
- [별도 교육 지원 센서](sensor/README.md): 운영진이 안내한 경우에만 설치
- [운영자 배포 기준과 검증](docs/distribution.md)
