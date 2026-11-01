# Submission readiness

Official deadline: **1 November 2026, 21:00 IST**. Only the team leader submits
the organizer form. This file records actual state; it is not a submission receipt.

## Local release

- Four original detector families: TCP, scanning, ARP and UDP DNS.
- Competing explanations, exact frame evidence, comparisons and packet links.
- Gateway/scanner Alibi reinterpretation preserving facts and residual faults.
- Redesigned Next.js workspace: generated logo/favicon and original artwork, local fonts, investigation brief, dark evidence board, timeline, coverage and export.
- Interactive synthetic evidence lab with separate state and source-frame mapping.
- Nine deterministic sample captures and thirty controlled experimental variants.
- Bounded input/worker/state budgets, metadata handling and cleanup.
- Concise README, dependency disclosure, local launcher and verification scripts.
- **Included demo:** `docs/demo.mp4`, 162.96 seconds (2:43), H.264, 5,648,435
  bytes. SHA256: `ebb8325272bd8cbf0313113f24438a2aa6019b0c153aaf624260911f10e05629`.
  Genuine recorded UI footage is followed by clearly labeled slides from measured
  synthetic worker results. The footage shows the earlier interface layout;
  the added slides are not represented as a fresh browser recording. Captions
  are supplied in `docs/demo.srt`. Full decode and representative frames checked.
- New-interface voice-over script (about 3:45) and optional `./run.sh record-demo` recorder are prepared. Fresh recording is blocked here by Chromium permissions; no new video artifact is claimed.
- Old work orders/planning notes are archived under ignored local artifacts.
  The assistant handles the remaining work directly; no external-agent handoff.

## Verification

- **156 backend tests pass**, including original-capture preservation, lab bounds,
  worker cancellation, visibility controls and malformed-input behavior.
- Three fixture/reference/schema checks and all nine real synthetic demo flows pass.
- Strict TypeScript, including unused import/parameter checks, passes.
- Direct Node/Webpack production build passes.
- Nine React Test Renderer interaction scenarios pass using actual API/worker
  outputs as HTTP stubs. These cover provenance, lab/main separation, mapped
  frames, errors, stale source/context/mode responses and stale export cancellation.
- Earlier live-browser checks cover the previous layout. A new live-browser pass
  is **not claimed**: Chromium startup is denied with `Operation not permitted`.
  Component interactions and production HTML were checked separately. No alternate connected browser session is available.
- No test/development server is intentionally left running.
- Render/Vercel configuration is prepared. Exact configured origins are shared
  by CORS and body validation; wildcard/path/credential-bearing origins are
  rejected. The lab's overall timeout remains bounded at 60 seconds maximum.
  Public URLs: https://causal-packet.vercel.app and https://causalpacket.onrender.com.
  The Render CORS preflight for the exact Vercel origin returned HTTP 200 with
  the matching allow-origin header. A fresh browser walkthrough of the redesign
  remains pending after the team publishes the updated source.
- A clean extraction of the release archive also passed all 136 backend tests,
  contracts, nine demo scenarios, production build and nine component interaction
  scenarios, reusing the existing pinned dependencies. See
  [release-verification.json](release-verification.json).

## External completion

1. **Public repository:** https://github.com/ArpitKrSingh7/causalPacket exists.
   The prepared Git checkout is `.artifacts/submission-checkout`; the team handles
   pushing the latest redesign commit and reviewing the automatic redeployments.
2. **Organizer form:** the supplied rules did not contain the actual form URL.
   The team leader submits the public repository/video location and team details
   before the deadline and preserves the confirmation.

Live hosting is optional in the supplied rules. The local application, included
video and reproducible samples remain the baseline deliverables. Keep the
remaining detector/feature scope fixed.
