# Dependency review and hardened environment

This is a known-advisory version check, not a penetration test or a claim that
every advisory is reachable in this application. Exact queries/results and the
check timestamp are in [dependency-audit.json](dependency-audit.json).

## Backend remediation completed

The initial environment used existing workstation libraries to unblock UI work.
Review found published matches for python-multipart 0.0.20, Starlette 0.47.3,
AnyIO 3.7.1, and the originally pinned development pytest version. The new
`.venv-hardened` uses a fresh Python 3.12.16 environment without system packages.

Patched framework pins include FastAPI 0.162.0, Starlette 1.10.0,
python-multipart 0.0.33, and AnyIO 4.15.1. Pytest is 9.2.0. All **24 installed
runtime/development package versions** were checked through OSV's batch endpoint;
the response returned **no matching advisories** for that set. Report this with
the source/date qualification, not as a guarantee of safety.

- [Multipart parameter-smuggling advisory](https://github.com/advisories/GHSA-vffw-93wf-4j4q)
  identifies a parser behavior affecting form field/filename interpretation.
- [Starlette release history](https://github.com/Kludex/starlette/releases)
  documents the maintained framework versions used for the update.

The existing `.venv` is preserved to avoid changing packages under AGY's running
server. It is the earlier environment and is not the final run target. Stop the
old server and use `./run.sh api`, which selects `.venv-hardened`.

## Frontend remediation completed in AGY-004

The earlier Next.js 14.2.35 matched known advisories. Next.js 16.4.3 and
React/React DOM 19.3.1 are now installed; their package metadata was checked
locally. Those exact versions returned no OSV matches in the recorded query.
AGY-004 reports frozen-lock installation, typecheck/build, `pnpm audit` with no
known findings, and the live browser regression passed. Both verification
servers were stopped. These results remain a known-advisory check rather than
an assurance that the software is free from vulnerabilities.

An example version match is
[CVE-2026-96889](https://nvd.nist.gov/vuln/detail/CVE-2026-96889), published for
Next.js image optimization behavior. A version match does not establish that
this project's current routes expose that feature; using a patched maintained
dependency set avoids relying on that assumption.

## Verification evidence and limits

- Clean installation from SHA256-verified PyPI wheels into an isolated Python
  3.12.16 virtual environment succeeded.
- The initial 86 backend tests passed there; the expanded hardened project suite
  now has **105 passing tests**, including 80 deterministic mutated captures,
  malformed multipart recovery, request cancellation/reaping, and launcher
  process-group cleanup.
- `./run.sh doctor`, contract checks, and the gateway CLI passed.
- The tool's restricted network namespace denies ordinary Python socket creation.
  The attempted real HTTP launcher probe stopped before starting a server. API
  integration is verified through ASGI tests; AGY performs the browser/HTTP pass
  outside that restriction. Do not claim that probe succeeded.

Audit data can become stale; repeat the package-version check before submission
if dependencies change. No capture payload, device inventory, API key, or other
private traffic data was sent to the advisory service—only public package names
and versions.
