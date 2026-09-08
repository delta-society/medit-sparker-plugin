# 참가자 배포 기준

참가자 설치 창구는 `delta-society/medit-sparker-plugin`, 마켓플레이스 이름은 `sparker` 하나다. 교육 기능 소스는 `medit-sparker-discovery`, Camp 수집 소스는 이 저장소에서 관리한다. 참가자 설치 이력은 없다는 사용자 확인에 따라 이전/삭제 절차는 제공하지 않는다.

## 배포 대상

- Discovery 0.6.1: `b580234ea123cb4648482d3a47c8159082995425`의 `plugin/`을 `git-subdir` + 전체 SHA로 고정한다. 해당 커밋의 문서에 남은 과거 Discovery 설치 경로보다 공통 README의 설치 안내를 우선한다.
- Camp 0.1.1: 공통 마켓플레이스와 같은 커밋의 루트 플러그인. 기존 훅·연결·수집 동작을 유지한다.
- Discovery main의 변경은 자동으로 참가자 배포본이 되지 않는다. 다음 배포는 검증된 커밋·플러그인 버전을 확인한 후 이 카탈로그의 SHA를 변경한다.

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
