# Sparker 교육 지원 센서

Node.js 22.13 이상, Claude Code, 참가자 앱의 **사용량 연결**을 먼저 설치합니다. 이 패키지는 DEL-472 교육 메타데이터 전송 부분입니다. 토큰 사용량 수집기는 참가자 앱의 별도 기존 설치가 담당합니다.

1. 참가자 앱 ‘사용량 연결 → 선택: 교육 지원 센서 연결’에서 `sensor.mjs`, `protocol.mjs`를 같은 폴더에 내려받습니다.
2. 운영진의 보존 승인 후 해당 폴더에서 `node sensor.mjs install --consent w1`을 실행합니다. 주차는 현재 교육 주차로 바꿉니다.
3. 교육 작업 시작 시 `node "$HOME/.config/medit-sparker-sensor/sensor.mjs" run`을 실행합니다. Windows PowerShell도 `$HOME`을 지원합니다.
4. `node "$HOME/.config/medit-sparker-sensor/sensor.mjs" status`에서 대기 사건 수를 확인합니다. `flush`로 재시도합니다.
5. OTel이 회사 정책 때문에 막히면 운영진 확인 후 `install --consent w1 --hook-fallback`을 사용하고 Claude를 재시작합니다. fallback에서는 평소처럼 Claude를 시작합니다.
6. 중단: `node "$HOME/.config/medit-sparker-sensor/sensor.mjs" uninstall`. 센서 설정·개인 대기 사건·자기 훅만 제거합니다. 기존 사용량 연결은 유지됩니다.

전송: 도구 범주·실행 성공 여부·시각·주차·불투명 사건 ID. 대화·코드·명령·오류 원문·파일 경로·도구 이름·신원은 전송하지 않습니다. 독립 수행·숙련·순위 자동 판정에 사용하지 않습니다. 운영자 자격증명은 필요하지 않습니다.

로컬 대기 사건은 최대 500건·24시간, 서버는 최대 100,000건·사건 시점 7일/승인 기한 중 먼저 도달하는 시점까지입니다. 최초 설치는 온라인 보존 승인 확인이 필요합니다. 설치 시 확인한 승인 기한 안에서는 일시적인 오프라인에도 정규화 사건을 대기하며, 승인 만료 후에는 새 사건을 모으지 않습니다. 사용량 연결을 다시 설치하여 개인 인증이 바뀌면 센서도 다시 설치하세요. 다른 계정 인증으로 과거 사건을 보내지 않습니다. 센서 재설치는 이전 대기 사건을 삭제하고 새 동의를 시작합니다. 운영 DB/백업 삭제 책임자는 서버의 승인 정책에 따릅니다. 각 설정 변경 시 기존 Claude 설정 백업은 개인 PC에 남습니다.

OTel을 사용하는 `run` 명령은 이 프로세스만 로컬 수신기로 연결하고 Claude 전역 환경 설정을 변경하지 않습니다. 관리 정책이 로컬 exporter를 덮어쓰면 자동 우회하지 않습니다. 회사 IT와 운영진의 지원이 필요합니다.

공식 근거(2026-09-08 확인): [Claude Monitoring](https://code.claude.com/docs/en/monitoring-usage), [Hooks](https://code.claude.com/docs/en/hooks). OTLP HTTP/JSON `tool_result`와 PostToolUse/Failure만 해석합니다. API 본문과 transcript는 열거나 저장하지 않습니다.
