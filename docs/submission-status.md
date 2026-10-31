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
- **Demonstration video included in repository**:
  - `docs/demo.mp4`: Captioned H.264 presentation (6.35 MB, 126.96s, SHA256 `7095b722bb147cfe697e3d7a9d75a354fcb541f10d0585ae7c54855faac00f99`), linked directly from README.md.
  - Demonstrates real synthetic captures, evidence inspection, gateway Alibi transition, remaining problems, and export.
- Latest verification results:
  - `./run.sh check`: 111 backend tests passed; contract checks passed; TypeScript passed; Next.js 16.4.3 production build (Turbopack and direct Webpack) passed.
  - `./run.sh verify-demo`: All 9 sample scenarios, immutable gateway transitions, exports, and malformed input recovery passed.
  - Playwright browser suite: All 10 verification categories (A–J) passed with zero console errors.
  - Dedicated export race suite passed: delayed export with gateway approval/reset (identical analysis ID) and delayed export with Live/Preview switching.
  - All test servers cleanly stopped; ports 8000 and 3000 confirmed free.

## Remaining before submission

1. **Push Git repository**:
   - Provide or confirm the public GitHub repository destination.
   - Push `.artifacts/submission-checkout` (including `docs/demo.mp4`) to the remote `main` branch.
   - Verify clone, setup, and checks from a clean directory.
2. **Organizer form submission**:
   - Confirm official submission URL from organizer announcement.
   - Team leader submits team details and public GitHub URL before **1 November 2026, 21:00 IST**.
   - Preserve submission receipt/confirmation.

The repository URL, team details, and form submission remain real external-state
inputs/actions. No dummy links or fabricated submission status should be added.
