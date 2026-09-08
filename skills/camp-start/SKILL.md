---
name: camp-start
description: Start the user's requested Camp week class or homework in the current Claude Code session.
argument-hint: "1 class | 1 homework"
---

Respond in Korean unless the participant explicitly asks for another language.

Connect this session to the requested Camp week and class/homework. Current session: `${CLAUDE_SESSION_ID}`.

Interpret `$ARGUMENTS` as a week from 1–4 and `class` or `homework`. If the user already named the week and activity, use those. Ask only for a missing week or activity. Never infer Camp participation merely from the folder or another session.

Run the bundled `camp/cli.mjs start` with the current session ID, week and phase as separate, safely quoted arguments, using the current project working directory. Resolve the helper from this plugin's root, two directories above this skill. Do not place setup codes or device tokens in command arguments, conversation output, or source files.

A successful local binding means the session is queued for collection; it does not prove server receipt. Briefly state the chosen week and activity, then continue the requested Camp work. If connection is missing or fails, preserve the local queue and continue the work; tell the user once that operators can check the connection.

During class, suggest asking an operator directly after repeated unsuccessful attempts at the same issue, once for that issue. During homework, suggest contacting an operator only for a serious blockage that prevents continuing. Do not interrupt normal trial and error or repeat the same suggestion.

When repeated failures actually prevent progress, choose a short stable semantic issue key such as `github-login-permission`; minor wording changes in the same error are the same issue. Reuse that key throughout this session. Call the bundled helper as `help SESSION ISSUE ATTEMPTS SEVERITY`, where ATTEMPTS is the observed failed attempt count and SEVERITY is `serious` only when homework cannot continue. Suggest help only if the helper returns `suggest: true`, using its message once. A false response or helper failure means continue without repeating an operator-help prompt. Do not send alerts or messages to operators.

Changing week or switching class/homework requires a fresh Claude session. If the helper reports an already-bound session, explain that briefly and have the participant use `/clear` and start the chosen week/activity there. An ordinary resumed session keeps its existing binding and help history.
