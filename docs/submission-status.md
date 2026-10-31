# Submission readiness

This records actual completion and remaining work. It is not a claim that the
project has been submitted. Official deadline: **1 November 2026, 21:00 IST**.
Internal target: **19:00 IST**. Only the team leader submits the organizer's form.

## Completed and verified

- Four original detector families: TCP, scanning, ARP and UDP DNS.
- Competing explanations, exact header evidence, observed comparisons, and
  packet-backed gateway grouping with context re-evaluation.
- Nine reproducible synthetic captures, including harmless controls and damage.
- Next.js live workflow starting in Live mode with an honest no-report workspace
  and prominent sample catalog / upload choices.
- Fictional scenario previews retained as an explicit secondary option with
  strict provenance labels and export safeguards.
- In-flight export cancellation and revision guards preventing stale downloads
  across sample switching, gateway context reinterpretation/reset (same analysis ID),
  and Live/Preview mode toggling.
- Markdown and JSON report download controls wired to the live API with
  sanitized filename validation and structured HTTP 410 error recovery.
- Hardened Python environment, complete pinned dependency inventory, known-advisory
  check artifacts, bounded worker/input budgets, and lifecycle cleanup tests.
- One-command setup/run/check helpers and serverless demo verification script.
- A 3:45 demo storyboard with exact expected actions, facts, and timings.
- Demonstration video artifacts generated and verified:
  - `.artifacts/demo-rehearsal/causalpacket-demo-rehearsal.webm` (126.96s, raw capture)
  - `.artifacts/demo-rehearsal/causalpacket-demo-presentation.mp4` (126.96s, H.264 with burned-in captions)
  - `.artifacts/demo-rehearsal/causalpacket-demo-subtitles.srt` (standalone subtitles)
- Latest verification results:
  - `./run.sh check`: 111 backend tests passed; contract checks passed; TypeScript passed; Next.js 16.4.3 production build (Turbopack and direct Webpack) passed.
  - `./run.sh verify-demo`: All 9 sample scenarios, immutable gateway transitions, exports, and malformed input recovery passed.
  - Playwright browser suite: All 10 verification categories (A–J) passed with zero console errors, including fresh load, healthy baseline, service failure, mixed scan/fault, gateway alibi flow, truncated capture, preview safeguards, session expiry (410), export race conditions, and 375×667 mobile layout.
  - Dedicated export race suite passed: delayed export with gateway approval/reset (identical analysis ID) and delayed export with Live/Preview switching.
  - All test servers cleanly stopped; ports 8000 and 3000 confirmed free.

## Remaining before submission

1. **Upload & publish video**:
   - Upload `.artifacts/demo-rehearsal/causalpacket-demo-presentation.mp4` (or host `.webm` with `.srt`) to a publicly accessible platform (e.g., YouTube/Vimeo/Drive with public permissions).
   - Test anonymous playback without signing in.
   - Paste the verified URL near the top of README.md.
2. **Push Git repository**:
   - Create remote repository on GitHub (user-approved destination).
   - Push `.artifacts/submission-checkout` to the remote `main` branch.
   - Verify clone, setup, and checks from a clean directory.
   - Add repository URL to README.md.
3. **Organizer form submission**:
   - Confirm official submission URL from organizer announcement.
   - Team leader submits team details, GitHub URL, and video URL before **1 November 2026, 21:00 IST**.
   - Preserve submission receipt/confirmation.

The video URL, repository URL, team details, and form submission remain real
external-state inputs/actions. No dummy links or fabricated submission status
should be added.
