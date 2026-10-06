# 참가자 배포 기준

참가자 설치 창구는 `delta-society/medit-sparker-plugin`, 마켓플레이스 이름은 `sparker` 하나다. 교육 기능 소스는 `medit-sparker-discovery`, Camp 수집 소스는 이 저장소에서 관리한다. 기존 설치자는 README의 marketplace refresh와 두 플러그인 update를 실행한 후 `/reload-plugins`로 적용한다. 지원하지 않는 호스트만 재시작한다. 신규 설치와 업데이트는 별도로 검증한다.

## 배포 대상

- Discovery 0.11.0: `e2514008d13f6e00350ff1ecec82ad56def87eb8`의 `plugin/`을 `git-subdir` + 전체 SHA로 고정한다. 참가자 시작은 `/sparker-camp:start`로 연결한다.
- Camp 현재 작업 후보는 0.6.0이다. 1·2·3주차 경로와 기존 원문 수집·동의·계정 계약을 유지하고, 4주차를 Discovery `week4` / `week4-submit`으로 연결한다. 4주차 코드·PDF 묶음은 로컬 준비 가능하지만 운영 제출은 미배포·차단이며 승인된 격리 로컬 제출 시험만 허용한다. 이 변경은 Discovery 카탈로그 SHA/버전을 갱신하지 않으며, 4주차 포함 Discovery 공통 배포·실제 설치와 모델 대화 검증은 별도다. 이 문구는 main·운영 반영 완료를 뜻하지 않는다.
- Discovery main의 변경은 자동으로 참가자 배포본이 되지 않는다. 다음 배포는 검증된 커밋·플러그인 버전을 확인한 후 이 카탈로그의 SHA를 변경한다.

## 과거 2주차 검토 패키지 기록

아래는 당시 검토 기록이며 현행 공개 상태는 위 배포 대상을 따른다. Camp 0.3.0은 `start`에서 2주차를 Discovery의 `week2`로 연결한다. 기존 수집/동의/계정 계약을 유지한다. 구현 소스·검토 패키지 준비와 참가자 배포는 별개이며, 아래 기존 공개 카탈로그 고정 SHA는 main 반영 승인 전까지 바꾸지 않는다.

`python3 scripts/build-week2-preview.py --discovery /absolute/path/to/discovery --output /new/output/path`로 로컬 검토 marketplace와 단독 ZIP 두 개를 만든다. 출력 폴더는 새 경로여야 한다. Discovery는 기존 명시 목록 빌더를 사용하고 Camp는 추적 중인 배포 폴더만 담는다. 실제 설치 시험에서는 별도 `CLAUDE_CONFIG_DIR`로 기존 사용자 설정·Camp 수집과 분리한다.

macOS Claude Code 2.1.205에서 Camp 0.3.0의 실제 설치·enabled 및 매니페스트/시작 스킬/CLI/훅 바이트 일치 확인. Node 19개 회귀 통과. 실제 모델 대화는 준비된 API 계정의 `Credit balance is too low`로 미실행이며 설치·도우미 통과로 대체하지 않는다. main 반영 승인 이후 Discovery commit을 먼저 push/readback하고, 그 전체 SHA를 아래 카탈로그에 고정한 다음 공통 배포본을 반영한다.

## 새 버전 배포

1. 원본 저장소의 main·매니페스트 버전·검증 결과를 확인한다.
2. 카탈로그의 Discovery SHA를 변경하고 격리된 `CLAUDE_CONFIG_DIR`에서 마켓플레이스 등록·두 플러그인 설치를 확인한다.
3. 설치 캐시의 버전, Discovery 예시·도우미·PDF 자산과 Camp 스킬·훅 파일을 확인하고 원본 커밋과 바이트를 비교한다.
4. PR 검토와 CI 후 main에 반영한다. 참가자는 README의 업데이트 명령으로 받는다.

`git-subdir`와 SHA 고정은 [Claude Code 공식 마켓플레이스 규격](https://code.claude.com/docs/en/plugin-marketplaces#git-subdirectories)을 따른다. 로컬 검증에 사용한 Claude Code는 2.1.263이다.

## 접근과 운영 활성화

2026-09-08 사용자가 내부 문서·Git 이력의 공개 범위를 확인하고 공개 전환을 승인했다. 공통 저장소는 public이며 참가자는 별도 GitHub 저장소 권한 없이 설치할 수 있다.

패키지 설치와 Camp 운영 활성화는 별개다. 계정 연결, 서버 설정, 기록 범위와 복구는 `camp/README.md`를 따른다. 배포 창구 변경으로 참가자 인증·수집 정책·운영 DB를 변경하지 않는다.

## 2026-09-08 검증 결과

Linux Claude Code 2.1.263의 빈 설정 디렉터리에서 공통 로컬 카탈로그를 등록했다. Discovery는 GitHub의 고정 커밋에서 실제 다운로드하고 Camp는 공통 카탈로그에서 설치했다.

- Discovery 0.6.1·Camp 0.1.1 모두 `enabled: true`.
- 설치된 Discovery 파일 51개를 고정 커밋의 `plugin/`과 바이트 비교하여 전부 일치. Camp의 camp/hooks/skills/sensor 파일도 원본과 일치.
- 설치 캐시의 `submission.py --example standard-time --linked` 실행 성공.
- 마켓플레이스 refresh 및 두 플러그인 update 성공, 버전 유지.
- `npm test` 14 PASS, 두 매니페스트 검증과 두 저장소 `git diff --check` PASS.

위 결과는 공개 전환 전의 로컬 카탈로그 검증이다. 추가로 GitHub 작업 브랜치에서도 두 플러그인을 설치했으며, 공개 main의 미인증 설치는 병합 후 확인한다. 원문 수집 활성화·실제 참가자 대화·Windows/macOS 설치 재시험은 이 변경의 검증에 포함하지 않았다.

공개 작업 브랜치를 GitHub token·credential helper·추가 인증 헤더 없이 새 설정에서 등록하고 두 플러그인 설치를 확인했다. 최초 공개 CI에서 Windows 테스트 정리 중 detached worker의 cwd 잠금으로 EBUSY가 발생했다. 전달·세션 격리 검증은 유지하고 테스트 임시 폴더 삭제에만 제한된 재시도를 추가했다. 런타임 변경은 없다.

## 참가자 UX — Camp 0.2.0 / Discovery 0.7.0

서브에이전트 3명이 Camp 시작·상태, 실습·재개, 제출·문구를 분담하고 상호 검토했다. participant-status는 현재 세션·폴더의 기록만 집계하고 로컬 연결 파일 존재를 서버 인증 성공으로 취급하지 않는다. 과거 영수증은 해당 전송분의 수신 근거일 뿐 앞으로의 전달을 보장하지 않는다. 연결 코드는 참가자 별도 터미널에서만 입력하며 기본 앱 주소를 제공한다.

로컬 Node 회귀 17 PASS. 실제 Claude Code 2.1.263 Haiku 대화에서 1주차 수업·명시적 기록 동의·계정 연결 나중·실습 파일 저장 거절을 입력해 현재 세션 binding 1개와 Discovery onboarding Skill 호출을 확인했다. 개인 실습 파일은 생성하지 않았다. 원격 인증/수신은 시험하지 않았다. 최초 시도에서 중복 동의 질문과 한글 phase 전달 실패가 나와 지침·정확한 한글 별칭 처리·CLI 회귀를 보완한 뒤 재시험했다.

Discovery의 실제 진행 저장·재개·기획서만 제출, 패키지·회귀 범위는 해당 저장소 docs/reviews/2026-09-08/PARTICIPANT-UX.md를 따른다. 새로운 모든 문구가 모든 모델에서 동일하게 나온다는 보장은 아니며 실제 수업 리허설은 별도다.
