# AGY 002 — Verify live analysis and fix preview/live provenance

```text
Continue in /home/arpit/cybersecHackathon.
Codex has implemented the TCP/scan backend slice while you built the frontend.
The API contract and frontend/lib/types.ts shape remain unchanged.

BACKEND NOW AVAILABLE
- GET /api/health returns engine_ready=true.
- GET /api/samples lists five available synthetic captures.
- Upload and sample-analysis routes return real AnalysisReport objects.
- Scanner authorization / context reset work through reinterpretation.
- Evidence filtering, metadata-session deletion/expiry, and safe errors work.
- ARP/DNS diagnosis is the next backend chunk; coverage says so explicitly.

First restart the setup backend YOU previously launched so you are testing the
new code, not a stale process. Do not kill unrelated processes. From repo root:
.venv/bin/python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
Use GET /api/health to confirm engine_ready=true before browser testing.

OWNERSHIP
Edit frontend/** EXCEPT frontend/lib/types.ts and frontend/fixtures/**.
Read docs/api-contract.md and backend source if useful; do not edit backend/**,
scripts/**, tests/**, docs/**, PLAN.md, or root files. Codex owns those.

FIX THESE CONCRETE REVIEW FINDINGS
1. page.tsx currently hides the preview banner as soon as Live is selected,
   while the active report can still be a fictional fixture. Make provenance
   depend on report.data_origin. A fixture remains clearly labeled as fictional
   until a real capture report replaces it. A failed live request must never
   make the retained fixture appear to be live evidence. Entering Live may show
   a no-live-analysis state instead, if preview remains clearly separated.

2. handleUploadFile and handleSelectSample currently send report.context.
   This silently transfers fictional gateway approvals from the preview to a
   real capture. Start each NEW capture/sample with empty context by default.
   Apply/Reset context must target the current real analysis explicitly. If
   you provide reusable live policy, keep it separate and explicitly applied;
   preview context must never seed it. A prior unrelated capture's policy must
   not silently authorize a newly analyzed source.

3. Preview Apply currently always switches to gateway-approved, even for an
   arbitrary entered context or a healthy preview. Keep scripted preview
   actions explicit and restricted to the supplied before/after pair. Arbitrary
   context edits require a real report and real reinterpretation. Show a useful
   message or disable them in preview; do not imply local diagnosis happened.

4. Prevent stale asynchronous results after changing mode, selecting another
   preview, or starting another request. Use cancellation/generation guards,
   or disable conflicting controls while pending. The typed API already accepts
   AbortSignal. Errors and cancellation must retain honest report provenance.
   Never call live reinterpretation with a fixture analysis_id.

5. UploadArea's clickable dropzone is a div with no keyboard action. Make it
   keyboard accessible with an actual button/label or equivalent Enter/Space
   handling and visible focus. Reject multiple dropped files clearly. Reset the
   file input appropriately so the same capture can be selected again.

6. Keep product copy readable: “Analyze capture”, “Sample captures”, “Up to
   25 MiB”. Put protocol/resource details in coverage/help rather than repeating
   implementation language such as “bounded ingestion” across primary controls.

LIVE ACCEPTANCE WALKTHROUGH
- Healthy: 60 packets, no incidents, coverage visible.
- Service failure: 27 packets, 12 refused attempts, likely_fault, available
  earlier-success comparison, exact SYN/RST frame inspection.
- Possible scan: 40 packets, 20 rejected destination ports, suspected_attack.
- Mixed sample: 67 packets, two independent incidents (fault plus scan).
- Copy the scanner IP from the REAL scan observation into Authorized Scanner
  IPs and apply: scan becomes approved probing, independent fault remains.
  Reset restores suspected scan. Evidence/observation frames stay identical.
- Truncated: partial coverage warning; no crash; healthy still works afterward.
- Bad upload: readable error; retain the previous report with correct origin.
- Preview -> Live -> failed upload: never relabel preview as live findings.
- A NEW live upload/sample sends empty context, with no fixture approvals.
- Verify desktop and a narrow viewport; frame drawer works by keyboard.

Run pnpm typecheck and pnpm build. Use browser automation/available browser tools
for the live walkthrough if available. Report exactly what was exercised and
any checks you could not run. Return changed files and remaining issues. Stop
after this integration/fix chunk; do not add new frontend feature families.
```
