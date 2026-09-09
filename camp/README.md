# Camp 운영자 설치·복구 안내

이 경로는 승인된 캠프 대화 원문 전용이다. `sensor/`의 콘텐츠 없는 센서와 별도 인증·저장소·보존 계약을 사용한다. 참가자 코드/대화의 선택 삭제 기능은 제공하지 않는다. Claude 원본 파일은 변경하거나 삭제하지 않는다.

## 배포 전 준비

- Node.js 22.13 이상과 Claude Code를 운영진이 먼저 준비한다.
- 참가자 앱에는 `CAMP_ID`, `CAMP_CONSOLE_ORIGIN`, `CAMP_BRIDGE_KEY`가 필요하다. 운영 콘솔에는 같은 캠프 ID/bridge key, 별도 `CAMP_RPC_TOKEN`, 원문 운영자 3인의 `CAMP_RAW_OPERATORS`가 필요하다. 운영 키는 참가자 PC에 배포하지 않는다.
- 콘솔의 `migrations/005-camp-telemetry.sql`을 영속 PostgreSQL/Supabase에 적용하고, 별도 RPC 토큰의 SHA-256을 비공개 auth 테이블에 설정한다. DB 소유자 또는 승인된 배포자가 실행한다. 로컬 PGlite 합성 테스트는 운영 저장소 활성화 증거가 아니다.
- 이 브랜치가 배포되기 전 원격 main의 설치 명령으로 Camp 기능이 제공된다고 안내하지 않는다.

두 플러그인 설치·업데이트는 [공통 설치 안내](../README.md)를 따른다.

운영진이 설치한 플러그인 경로에서 `node camp/connect.mjs https://참가자앱주소`를 실행한다. 참가자는 로그인한 앱의 **내 계정·설정 → 캠프 대화 기록 연결**에서 만든 코드를 입력한다. 코드는 stdin으로 받고 OS 명령행 인자에 넣지 않는다. 연결 코드는 10분·한 번 사용, 기기 인증은 서버의 90일 초기값이며 계정 비활성화·재설정으로 회수된다.

## 회차 시작과 범위

Claude Code에서 `/sparker-camp:camp-start 1 class` 또는 `/sparker-camp:camp-start 1 homework`를 호출한다. 같은 대화를 재개하면 기존 연결과 안내 이력을 유지한다. 주차·수업/과제를 바꿀 때는 `/clear`로 새 세션을 만든 뒤 시작한다. 폴더·시간만으로 다른 세션을 편입하지 않는다.

시작 순간의 파일 위치 이전 바이트는 수집하지 않는다. 연결 이후의 주 대화와 시작이 확인된 보조 에이전트가 대상이다. 외부 첨부 파일 자체까지 보관한다고 주장하지 않는다. 보조 에이전트 시작/종료 이벤트가 누락되면 수집 보고에 확인 필요로 남긴다. 동기 SessionStart/SubagentStart는 연결 메타데이터를 먼저 등록한다. SessionEnd는 로컬 종료 상태와 바이트만 기록하며 네트워크를 기다리지 않는다. 나머지 훅은 비동기다.

Claude Code `-p` 일괄 실행은 실제 검증에서 SessionEnd를 제공하지 않은 경우가 있다. Stop을 종료로 바꾸지 않으며 해당 기록은 종료 미확인으로 유지한다. 수신 범위와 전체 수집 완료는 구별한다.

## 로컬 보관과 복구

기본 위치는 사용자 홈의 `.sparker-camp/`이다. `camp.sqlite`에 원문 조각·읽은 위치·서버 영수증을, `connection.json`에 참가자 전용 기기 인증을 보관한다. 전송 대기 사본에는 TTL/건수 제한으로 인한 자동 폐기가 없다. 서버의 범위·해시·세션이 맞는 영속 ACK만 완료 처리한다. 전송용 사본 정리는 아직 자동화하지 않았다.

```sh
node camp/cli.mjs status
node camp/cli.mjs worker
```

네트워크 실패는 대기 기록을 유지하고 최대 60초 간격으로 재시도한다. 재시작 후 다음 훅 또는 위 worker 명령으로 복구한다. 훅은 연결 실패 때문에 참가자 작업을 차단하지 않는다. 계정 연결이 없거나 만료됐다면 새 코드를 받아 같은 캠프·계정·서버에 다시 연결한다. 다른 서버/계정에는 기존 대기를 전송하지 않는다.

파일 교체 때 시작 경계를 검증할 수 있으면 새 generation으로 보존한다. 과거 바이트를 제외할 경계가 불명확한 compaction/파일 교체는 조용히 성공시키거나 처음부터 소급 수집하지 않고 확인 필요로 보존한다. 다음 수업 전 운영자가 원본 파일과 수신 범위를 대조해 복구 범위를 확인한다. 파일 접근 실패·디스크 부족도 확인 필요이며, 원본과 spool을 먼저 보관한다.

## 운영 검토

콘솔 `/camp`에서 회차·활동별 명부 대조, 마지막 보고, 대기·오류·종료 미확인, 수신 byte 범위를 본다. 원문은 지정된 3인만 읽고 열람은 감사 이력에 남는다. 고객 HR에는 운영진이 검토한 요약을 전달한다. 운영자 자동 메시지·실시간 알림은 보내지 않는다.

도움 판단은 현재 대화의 Claude가 담당한다. 동일 의미의 문제 키를 유지하고 3회 실패를 초기 최소값으로 사용한다. `help` helper가 회차와 지속된 안내 이력을 검사하며 과제는 `serious`만 허용한다. 이 숫자는 구현 초기값이며 교육 효과를 입증한 임계값이 아니다. 정상적인 진전이 있으면 안내를 요청하지 않는다.

## 검증

- `npm test`: 합성 원문으로 큐·ACK·교체/누락·훅 순서·도움 이력 검증.
- Windows/macOS CI는 `tests/camp-*.test.mjs`를 실행한다. 합성 훅 테스트를 실제 Claude/회사 PC 인수로 표시하지 않는다.
- `node scripts/test-camp-claude.mjs --run-real-claude`: 현재 사용자의 실제 Claude 인증으로 **합성** 세션을 만들고 호스트 원문과 spool 바이트를 대조한다. 명시적으로 실행하는 운영자 검증이며 CI에서 자동 실행하지 않는다.

### 명시적 준비 상태 재확인

참가자가 `/sparker-camp:readiness`를 요청하면 이미 연결한 현재 Camp 세션에서만 `node camp/cli.mjs readiness SESSION`을 실행한다. 훅·시작 스킬은 이 진단을 자동 실행하지 않는다. Claude CLI `--version`, `auth status --json`을 각 5초·16 KiB로 제한하고 이메일·조직·키·원문 오류를 버린다. 비로그인 exit 1 JSON도 boolean 관측으로 처리한다. 구독 필드가 없는 CLI는 `unknown`이며 로그인으로 구독을 추정하지 않는다.

보고서는 기존 0600 Camp SQLite에 세션별 최신 한 건만 저장하고 기존 owner/camp/binding의 report.readiness로 전달한다. 별도 토큰·수신 API·보존 정책을 만들지 않는다. 접근·보존은 기존 Camp 계약을 따른다. 필드는 schemaVersion, reportId, observedAt, cliVersion, pluginVersion, cliAvailable, loggedIn, authMethod, subscriptionType, firstRunObserved, probeStatus뿐이다. firstRunObserved는 명시적 시작 이후 주 대화의 로컬 수집 바이트 관측으로, 성공한 모델 답변이나 사람의 완료 판정을 의미하지 않는다. CLI 출력의 queued는 서버 수신 확인이 아니다.

### 0.3.0 적용 순서와 재확인

운영 콘솔의 선택적 `report.readiness` 수신·조회 지원을 먼저 배포한다. 구버전 report는 readiness 필드 없이 계속 정상 수신하며, 새 진단 보고도 기존 sequence/idempotency 계약을 따른다. 이후 이 플러그인 0.3.0을 배포한다. 참가자 설치본을 운영자가 강제로 실행하거나 업데이트하지 않는다.

참가자는 기존 설치 창구에서 다음 명령을 직접 실행한다.

```sh
claude plugin marketplace update sparker
claude plugin update sparker-camp@sparker
```

Claude Code를 완전히 종료하고 다시 열어 `/plugin`에서 `sparker-camp` 0.3.0을 확인한다. 기존 계정 연결과 로컬 큐를 삭제하거나 재가입하지 않는다. `/sparker-camp:start`로 현재 수업/과제 활동이 연결된 상태를 확인한 다음 `/sparker-camp:readiness`를 명시 실행한다. 운영진은 해당 인물의 ‘플러그인 준비 근거’에서 진단 시각·CLI 버전·플러그인 버전·보고 ID와 서버 수신을 확인한다. queued만으로 완료라 알리지 않는다.

CLI가 구독 유형을 제공하지 않으면 unknown이 정상 결과다. 운영자가 참가자와 Claude의 구독 화면을 함께 확인하고 콘솔의 기존 구독 관문에 판단을 남긴다. 계정 이메일이나 결제 화면을 채팅·Git·로그에 복제하지 않는다.

문제가 생기면 새 readiness 명령 실행을 중지하고 기존 보고·과제 수집은 유지한다. 이미 새 필드가 전송 중인 기기가 있으면 서버의 선택적 필드 수신을 먼저 제거하지 않는다(그 기기의 전체 report가 거부될 수 있다). 서버는 이전·새 report를 모두 수락하도록 유지한 채 진단 표시만 비활성화하거나 이전 플러그인으로 되돌리고, 로컬 큐 및 기존 계정 연결을 보존한다. 구버전 설치 캐시를 수동 삭제하지 않는다.

플러그인 업데이트 후 Claude를 다시 여는 것만으로 이미 분리 실행 중인 이전 worker가 교체되지는 않는다. 명시적 `readiness` 명령은 진단을 저장한 뒤 같은 spool의 worker 임대 토큰을 폐기하고 새 worker를 깨운다. 이전 worker는 진행 중 요청을 마친 뒤 토큰 확인에서 종료하며, 오래된 heartbeat·정리는 새 worker의 토큰을 덮거나 삭제하지 못한다. OS 프로세스 종료나 다른 spool 조작은 하지 않는다. 일반 훅은 이 인계를 실행하지 않는다.
