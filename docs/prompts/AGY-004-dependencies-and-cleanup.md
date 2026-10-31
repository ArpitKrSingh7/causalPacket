# AGY 004 — Patched frontend dependencies and server cleanup

```text
Continue in /home/arpit/cybersecHackathon. AGY-003 is accepted for integration.
The user explicitly requests closing servers/tasks when they are not required
to avoid wasting RAM. Codex owns backend/setup work; you own frontend changes.

FIRST: STOP THE OLD SERVERS
Stop the two servers YOU launched using your task controls / Ctrl+C:
- Old backend: .venv/bin/python -m uvicorn ... --reload
- Old Next.js production/dev server on port 3000
Do not start a second pair over the old pair. Do not kill unrelated projects.
Run builds with test servers stopped; start one pair only when browser checks
require it. Stop that pair at the end and report what remains running.

WHY A DEPENDENCY UPDATE IS REQUIRED
The public OSV advisory check matched known advisories against Next 14.2.35.
For example GHSA-2464-fhr4-w9xw / CVE-2026-96889 lists affected versions and
patched Next releases. We must ship a patched dependency set, not rely solely
on the absence of currently used vulnerable features.
Verified available and checked through the public OSV version endpoint:
  next 16.4.3
  react 19.3.1
  react-dom 19.3.1
The installed Node 25 satisfies Next's >=20.9.0 engine requirement.
The check found no known OSV matches for those exact three versions. That is
not a guarantee of security; recheck actual installed dependency versions.

YOUR FILE OWNERSHIP
frontend/** EXCEPT frontend/lib/types.ts and frontend/fixtures/**.
Preserve all existing API shapes, real gateway flow, provenance isolation,
explicit sample-inventory actions, context defaults, and accessibility.
Do not edit backend/**, scripts/**, tests/**, docs/**, root locks, or README.

UPGRADE
From frontend/:
pnpm add --save-exact next@16.4.3 react@19.3.1 react-dom@19.3.1
pnpm add -D @types/react@^19 @types/react-dom@^19
Adapt only actual compatibility issues from the upgrade. Preserve styles and
all working behavior. Keep pnpm-lock.yaml in sync. Remove the unsupported
`next lint` script if no lint configuration/tool exists; retain typecheck/build.
No graph library, new UI feature families, database, auth, or dependencies
unrelated to this update. If the new default bundler causes an actual build
problem, use `next build --webpack` and explain the concrete reason.

BACKEND HAS ALSO BEEN HARDENED
Codex installed a separate .venv-hardened using Python 3.12.16, FastAPI 0.162.0,
Starlette 1.10.0, python-multipart 0.0.33, and AnyIO 4.15.1. All 94 backend tests
pass. The old .venv is preserved for now; do not use it for final verification.
The API contract remains v1.0 and every existing frontend adapter still fits.

For browser verification, from root start:
./run.sh api
This watches ONLY backend/, not node_modules or Python/runtime artifacts.
Then start exactly one frontend server in your second task:
cd frontend && pnpm dev
Avoid any automatic port fallback: frontend port 3000 and API port 8000.
Use your own task Ctrl+C to stop both after checks.

VERIFY
- pnpm typecheck; pnpm build (with servers stopped during the build).
- A clean frontend install from the updated frozen lockfile works.
- Browser: healthy -> fault -> scan -> mixed capture; real header drawer.
- Gateway: empty context unresolved -> explicit sample inventory suspected ->
  approve second MAC unresolved with DNS/TCP problems retained -> reset.
- Association reasons and exact frame tags remain visible/clickable.
- New uploads still receive empty context; no preview data masquerades as live.
- Narrow viewport works; no browser console errors from the version migration.
- Report installed Next/React versions and any relevant pnpm audit findings.
- STOP your verification servers. Confirm no redundant project tasks remain.

HANDOFF
Changed frontend files; exact version/install/typecheck/build results; browser
checks actually run; any audit limitations; server cleanup status. If blocked
by a real compatibility/download issue, report it precisely and keep completed
fixes reviewable. Do not silently revert to the advisory-matched version.
```
