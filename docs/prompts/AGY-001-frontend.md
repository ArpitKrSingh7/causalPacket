# AGY 001 — Build the investigation frontend

Paste the following work order into AGY. It assumes the same workspace; if using
a separate checkout, include the listed contract files and fixtures first.

```text
We are building CausalPacket (“Fault or Foe?”) for the IIITDM cybersecurity
hackathon. We have a 20-hour budget. Codex owns backend logic; you own the UI.

WORKSPACE
/home/arpit/cybersecHackathon

READ FIRST
- PLAN.md (scope and product rules)
- docs/api-contract.md (actual transport and implementation status)
- frontend/lib/types.ts (canonical TypeScript contract; read-only for you)
- frontend/fixtures/gateway-before.json
- frontend/fixtures/gateway-approved.json
- frontend/fixtures/healthy.json

OWNERSHIP
You may create/edit frontend/** EXCEPT frontend/lib/types.ts and
frontend/fixtures/**. Do not edit backend/**, scripts/**, tests/**, root
configuration, PLAN.md, README.md, or docs/**. Codex is working there.
Keep all package files, lockfiles, and local config inside frontend/.
Preserve the existing types and fixtures while scaffolding: frontend is
already nonempty. If create-next-app refuses it, scaffold into a temporary
directory and copy only the missing scaffold files. Never replace frontend/.

STACK AND DELIVERABLE
Build a working Next.js App Router + TypeScript + Tailwind frontend. Use
pnpm (Node and pnpm are available); Lucide icons are optional. No database,
authentication, paid APIs, or graph library. Use system fonts so the build
does not require fetching fonts. No backend routes or invented diagnosis logic.

VISUAL DIRECTION
One polished investigation workspace: dark navy background, clear readable
cards, subtle borders, teal for useful evidence, amber/red for concerns.
Use restrained typography and spacing, crisp status labels, and real readable
content. Avoid decorative cybersecurity imagery, giant empty charts, fake
confidence gauges, and excessive animation. Give evidence and explanations
more space than aggregate counters. Support desktop plus a usable narrow view.

BUILD THESE IN THIS ORDER
1. Scaffold, scripts, typed data adapter, and explicit Preview/Live mode.
2. Persistent “Development preview · fictional data” banner for fixtures.
   Preview choices: gateway investigation, approved-context presentation,
   and healthy empty state. No fixture may be presented as analyzed traffic.
3. Upload/sample area. Upload accepts one .pcap/.pcapng with client-side
   25 MiB check. Use the contract adapter for live requests. Display the empty
   actual sample catalog honestly until captures are published. The health
   endpoint currently reports engine_ready=false; show availability clearly.
4. Compact counts: packets, duration, incidents, capture coverage. No “false
   alarms suppressed” or invented overall network safety score.
5. Incident list + selected incident panel with four sections:
   What happened / Why this explanation / What challenges it / What to check
   next. Include competing hypotheses, qualitative evidence levels, missing
   evidence, and the actual comparison metrics/basis/limitations.
6. Small chronological evidence timeline. Clicking a frame opens a drawer
   with that frame’s sanitized header metadata. Clicking an observation
   filters its supporting frames. Resolve evidence by frame_number, not index.
7. Alibi Test (“Could this be something else?”): explicit gateway IP,
   approved gateway MACs, authorized scanner IPs, Apply, Reset.
   Show reason_changed, evidence_retained, and remaining_problem from returned
   interpretation_changes. In preview mode, use only the supplied before/after
   fixture pair to demonstrate layout and clearly label it a scripted preview.
   Do not compute arbitrary diagnoses or claim approval proves a fault.
8. Loading, no findings, no samples, partial/limited coverage, invalid input,
   offline API, analysis pending, and expired-session states. Preserve the last
   report on failed requests; never silently replace a live failure with mocks.

API ADAPTER
Create frontend/lib/api.ts, using frontend/lib/types.ts.
NEXT_PUBLIC_API_BASE_URL defaults to http://127.0.0.1:8000.
Provide typed health, listSamples, analyzeCapture, analyzeSample, reinterpret,
and releaseAnalysis functions. Follow docs/api-contract.md exactly.
Include AbortSignal support and readable errors from the error envelope.
The backend currently returns 501 engine_not_ready for analysis routes.
Keep preview fixture imports isolated from this live transport adapter.

QUALITY
No any types where an existing contract type fits. Keep schema strings and
null/array behavior intact. Treat capture strings as escaped text; do not use
dangerouslySetInnerHTML. Do not persist captures/reports in browser storage.
Keyboard-accessible controls, labeled inputs, visible focus, drawer dismissal.
Only show functions that work; unfinished features get a clear unavailable state.
Define pnpm dev (port 3000), pnpm build, and pnpm typecheck scripts.
Use frontend/.env.local.example for the optional API base URL.
If dependencies cannot download, report the exact blocker and files completed;
never claim a build passed when it did not run. Do not change backend to make
the frontend appear functional.

HANDOFF
Run pnpm typecheck and pnpm build. Verify the preview layouts, incident/frame
selection, approved fixture state, healthy empty state, and live API errors.
Return changed files, exact run commands/results, any browser verification,
and remaining integration issues. Stop after this frontend chunk.
```
