---
name: start
description: 캠프 수업이나 과제를 시작하거나 이어서 합니다. 계정 연결과 기록 상태를 확인하고 실습으로 안내합니다.
argument-hint: "1주차 수업 | 1주차 과제"
---

## Participant request

$ARGUMENTS

Read the participant request above before asking anything. Explicit consent to Camp recording and transmission in that request counts as consent for this start: do not repeat the recording-consent question. If they also say 계정 연결은 나중에 / 실습 먼저, skip the connection choice and proceed to the lesson after binding. A request not to save exercise files does not revoke separately explicit Camp recording consent; do not create exercise files, but honor that recording choice. If the participant declines recording itself or their choice is ambiguous, do not bind until clarified.

Respond in Korean unless the participant requests another language. Give one next action at a time. Never expose binding IDs, chunk counts, transcript paths, credentials, or implementation details in ordinary participant messages.

## Choose the activity

Current host session: `${CLAUDE_SESSION_ID}`. Resolve bundled helpers from this plugin's root, two directories above this skill. Run `node <resolved-root>/camp/cli.mjs participant-status SESSION` with separately safely quoted arguments in the current project directory. This reads only a sanitized, session-scoped summary. Never read `connection.json`, the spool database, or raw transcripts yourself.

Use an existing binding to offer continuing that same activity; do not silently switch it. Otherwise use a week (1–4) and 수업/class or 과제/homework explicitly provided in `$ARGUMENTS` or the participant's request. Ask only for missing information, for example “오늘 할 활동은 몇 주차 수업 또는 과제인가요?” Do not infer participation from a folder, time, another session, or saved Discovery progress.

Before the first binding, **only if the current participant request/conversation has not already explicitly consented to Camp recording and transmission**, explain once: “시작하면 이 대화와 보조 작업의 기록을 운영진 3명이 볼 수 있고, 캠프가 끝난 뒤에도 개선·분석에 보관해요. 계정 연결 전에는 이 컴퓨터에 보관돼요. [선택한 활동]을 시작할까요?” Wait for confirmation only in that unconfirmed case. If consent is already explicit, skip this question entirely and run start; briefly acknowledge the chosen activity. If declined, do not bind; explain the participant can ask the instructor how to proceed.

For the helper, map 수업 to the literal ASCII argument `class`, and 과제 to `homework`; WEEK is a number from 1 through 4. Run `node <resolved-root>/camp/cli.mjs start SESSION WEEK PHASE` only after the activity and collection consent are explicit. On success say the selected activity and the helper's truthful status in at most two short sentences. Local binding is not server receipt. Do not say all records are collected, delivered, or submitted. An existing session cannot change week or phase: save current progress first, then explain `/clear` and restarting. A failed start is not a successful recording session. If start fails, show its participant-safe failure message once BEFORE handing off to Discovery; never silently skip this failure. Pass `Camp start failed; recording unconfirmed` and the next recovery action to the receiving skill. If start succeeds, pass its actual state and whether connection was deferred. Do not let the handoff erase or upgrade recording status.

## Connect an account when needed

If `connection_saved` is false, explain once: “계정 연결이 아직 필요해요. 지금 연결하거나 실습을 먼저 시작할 수 있어요.” If they choose to connect, give the following steps one at a time:

1. Open [참가자 앱](https://leaderboard-production-eac2.up.railway.app), sign in, then open **내 계정·설정 → 캠프 대화 기록 연결**. Use an alternative origin only when the instructor explicitly supplies one. Do not send the participant to operator database or deployment documentation.
2. Show a safely shell-quoted command using the actual resolved installed path: `node <resolved-root>/camp/connect.mjs https://leaderboard-production-eac2.up.railway.app`. Replace the placeholder with the actual installed script path, safely quote that path for the participant’s shell, and ask the participant to run the resulting exact command in their own separate interactive terminal. It asks only for the connection code there. Do not ask the participant to find the plugin path or type an app address. Do not execute this interactive setup via the model's tools. Never request the code in chat, tool input, command arguments, screenshots, or files. Never open credential files. The participant enters the short-lived code only at that terminal prompt.
3. Once they report completion, rerun the sanitized `participant-status` helper. A saved connection alone does not prove current authentication or record receipt. Continue the activity, without waiting for a receipt or repeatedly nagging about connection.

For a pending/awaiting receipt status, use the helper's message. For capture attention or failure, say what needs checking and allow the exercise to continue; do not promise bytes were saved when status is unavailable. Expired connection cannot be diagnosed from local credential presence; suggest terminal reconnection if the instructor confirms an authentication issue.

## Continue the exercise

For week 1, use the host Skill tool to invoke `sparker-discovery:onboarding` for first-time setup, or `sparker-discovery:week1` when the participant says setup is complete or wants to resume. Let the Discovery skill check its saved progress; do not invent progress or read arbitrary other plugin directories. If setup status is unknown, onboarding checks readiness. Tell Discovery the confirmed week/phase and whether this is a resume request. Avoid asking the participant to understand two plugin names.

If the host cannot invoke that skill, offer the single concrete command `/sparker-discovery:onboarding` or `/sparker-discovery:week1` as appropriate. If unavailable because Discovery is not installed, give `/plugin install sparker-discovery@sparker` and ask them to reopen Claude Code. For weeks 2–4, continue the instructor's supplied activity; do not claim a week-specific lesson exists without seeing one.

During class, after at least three observed unsuccessful attempts at the same blockage, call `node <resolved-root>/camp/cli.mjs help SESSION ISSUE ATTEMPTS SEVERITY`. Use a stable short semantic ISSUE such as `github-login-permission`. During homework, only do this for a serious blockage preventing progress and use severity `serious`; otherwise use `normal`. Suggest operator help only if the helper returns `suggest: true`, using its message once. Never send alerts or messages to operators.
