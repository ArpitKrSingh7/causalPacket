# AGY 006 — Final live start state and rehearsal

```text
Run this AFTER AGY-005 is complete in /home/arpit/cybersecHackathon.
This is a final usability/regression pass, not a new feature family.

Read frontend/AGENTS.md and the relevant installed Next.js documentation before
editing, then read the current app state/handlers. Preserve the patched versions,
API contract, report exports, context isolation, cancellation and accessibility.

OWNERSHIP
frontend/** except frontend/lib/types.ts and frontend/fixtures/**.
Do not edit backend, scripts, tests, docs, root files or source snapshots.

1. REAL ANALYSIS SHOULD BE THE DEFAULT
The current page starts with isLiveMode=false and a fictional gateway report.
That was useful while the backend was under construction. The finished app must
open in Live mode with NO analyzed report yet, an honest empty workspace, and
prominent upload/sample choices. Do not fabricate a zero-packet AnalysisReport
or auto-run a preview fixture and label it live. Keep development previews as
an explicit secondary option, clearly fictional whenever displayed.

Use a nullable current report or another explicit no-report state. Guard every
report-dependent component/handler. Until a real report exists:
- Show “Choose a sample or upload a capture to begin” (or similar plain copy).
- Do not show incident/packet numbers as if analysis happened.
- Hide/disable export, frame actions and Alibi Apply/Reset appropriately.
- Keep live sample catalog, API status and useful offline error guidance.
- Selecting a sample or uploading still starts with EMPTY_CONTEXT.

Switching preview/live must retain the provenance safeguards. On failure, keep
the previous report with its correct origin; a fixture never becomes a real
report by toggling modes. Do not call reinterpret/export with a fixture ID.
Preserve AbortController/request-generation guards and keyboard behavior.

2. VERIFY THE FINISHED FLOW, WITHOUT REDESIGN
Run typecheck/build with servers off. Start only one server pair when needed.
Verify: fresh load -> honest empty live state -> healthy -> service fault ->
mixed scan/fault -> gateway baseline/approval/reset -> Markdown/JSON exports ->
truncated capture. Return to preview explicitly; its label stays visible.
Check mobile, errors, keyboard and browser console. Fix concrete regressions
only; no new graph libraries, dashboards, animations, or detector settings UI.

3. PREPARE THE RECORDING
Read docs/demo-script.md. Rehearse its actual clicks in the working live UI.
If your tools support screenshots/recording, save representative desktop/mobile
screenshots or a rehearsal recording under frontend/.artifacts/ and report paths.
Do not claim a 2–5 minute demo exists unless the file actually exists and plays.
Never show fictional previews as analyzed traffic. Keep default sample timings
and explicit inventory application. Source/report IDs and actual counts must
match the live results.

SERVER CLEANUP
Stop both verification servers after the checks. Report exact checks/results,
any rehearsal artifacts and remaining issues. This closes frontend development
unless a real bug appears; preserve time for the final video/public submission.
```
