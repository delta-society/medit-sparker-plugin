---
name: readiness
description: 현재 캠프 세션의 Claude Code 설치·로그인·구독 관측을 다시 확인하여 기존 캠프 연결로 운영진에게 전달합니다.
---

Use only when the participant explicitly requests a readiness recheck. Never invoke automatically on start, resume, hooks, or another skill's behalf without that request.

Explain briefly in Korean: “Claude Code 버전·로그인 여부·인증 방식·확인 가능한 구독 종류와 현재 캠프의 실행 기록 여부를 기존 캠프 연결로 운영진에게 전달해요. 이메일·조직명·인증키는 보내지 않아요.” The participant's explicit request for this recheck authorizes this command; do not ask again.

Current host session: `${CLAUDE_SESSION_ID}`. Resolve this plugin root two directories above this skill, then run `node <resolved-root>/camp/cli.mjs readiness SESSION` in the current project using separately safely quoted arguments. Never run raw `claude auth status`, open connection files, or inspect the spool yourself. The helper requires an already connected Camp account and the current bound session. It does not start or enroll a session itself.

The helper says only queued; explain “준비 상태를 확인했고 전달을 기다리고 있어요.” Do not claim server receipt, subscription success, company-account match or gate completion. Unknown subscription stays unknown. On failure show the participant-safe error and offer existing `/sparker-camp:start` guidance; do not start collection or connect an account automatically.
