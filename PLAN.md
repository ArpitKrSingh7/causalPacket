# CausalPacket release plan

Local-first network investigation for the IIITDM Kancheepuram cybersecurity
hackathon. Official submission deadline: **1 November 2026, 21:00 IST**.

## Implemented

- Next.js interface and FastAPI API with bounded, resource-limited workers.
- Original TCP, scan, ARP and UDP DNS trackers and competing explanations.
- Exact frame evidence, observed comparisons and packet-backed associations.
- Gateway/scanner Alibi context changes with retained evidence and residual faults.
- Compact investigation brief, clickable evidence map, timeline and report export.
- Interactive synthetic evidence lab, with explicit source/derived frame mapping.
- Nine reproducible sample captures, 156 backend tests, and nine frontend
  component interaction scenarios. Thirty controlled experimental variants.
- Captioned demonstration and a concise README with setup/dependency disclosure.
- Render/Vercel hosting configuration with a shared explicit frontend-origin
  allowlist, a bounded slower-host lab budget, and remote-upload disclosure.

## Final verification

1. Run backend tests, contract validation, synthetic demo checks and strict
   frontend typechecking/production build.
2. Run the component interaction checks in [docs/running.md](docs/running.md).
3. Use `scripts/verify_browser.cjs` if the execution environment permits local
   HTTP sockets and Chromium. Record limitations honestly when it does not;
   component checks do not certify browser layout or downloads.
4. Verify the video duration, captions, factual labels and package contents.
5. Rebuild `./run.sh package` and refresh the prepared Git checkout without
   overwriting user changes or existing commit history.
6. Publish the public repository with its included video. The team leader submits
   the real organizer form and preserves the confirmation.

## Scope and ownership

The assistant now handles remaining engineering and verification directly. No
external coding-agent handoff is required. Historical work orders and the original
long-form plan are preserved locally under `.artifacts/development-history/`;
they are not part of the submission archive.

Keep the current detector scope. No ML training, additional signatures, live
capture, automatic repair, or cloud architecture expansion before submission.
Association is not causation; synthetic evaluation is not production accuracy.
See [readiness](docs/submission-status.md), [evaluation](docs/evaluation.md), and
[the novelty statement](docs/novelty.md) for verified details.
