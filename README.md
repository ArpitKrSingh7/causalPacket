# CausalPacket

**Fault or Foe?** Explainable investigation of network faults and suspicious
activity from authorized packet captures. Built for the IIITDM Kancheepuram
cybersecurity hackathon, 31 October–1 November 2026.

## Implemented now

- Next.js investigation frontend supplied by AGY, with explicitly labeled preview
  fixtures, typed live API adapter, association explanations, and explicit gateway
  inventory/Alibi controls. AGY reports the live gateway browser flow passed.
- Real local capture upload and nine reproducible synthetic sample captures.
- Original TCP handshake/reset matching, SYN retry tracking, capture-boundary
  handling, and observed response-delay checks.
- Original vertical/horizontal scan heuristics using sliding windows, destination
  diversity, and explicitly observed outcomes. Related patterns from one source
  share an investigation while raw facts and independent faults remain visible.
- Fault and scan explanations, meaningful alternatives, exact header evidence,
  earlier-success comparisons where observed, and concrete verification steps.
- ARP sender-identity history with explicit gateway policy, competing duplicate-
  address/failover/impersonation explanations, and the gateway Alibi Test.
- Full-question UDP DNS transaction matching, resolver error counts, response
  latency, and capture-boundary handling; normal NXDOMAIN is not attack evidence.
- Packet-backed ARP-to-client symptom associations, grouped investigations,
  and observed DNS/TCP before/after comparisons.
- Gateway/scanner-context reinterpretation and reset: packet facts stay fixed,
  residual service problems and independent faults remain visible.
- Metadata-only JSON/Markdown report exports and readable CLI investigations.
- Bounded PCAP/PCAPNG framing, isolated worker resource limits, safe errors,
  private temporary-file cleanup, and expiring metadata-only report sessions.

**Supported diagnostic families:** TCP, scanning, ARP and UDP DNS. Cross-layer
links require retained client frames addressed to the changed claimant MAC in
the same capture scope and a bounded time interval. Association does not prove
causation. General data retransmissions, DHCP, DNS manipulation, MTU diagnosis,
and full stream reconstruction remain outside the current supported checks.
The fictional gateway previews are presentation examples; use the real
`gateway-transition` sample to exercise the implemented engine.

## Run locally

Use Linux or WSL with **Python 3.12+**, **Node.js 20.9+**, and pnpm. The worker
uses Unix resource controls; native Windows is not a verified runtime. No API
key, database, capture privileges, or network access is required for analysis.

From the repository root:

```bash
./run.sh setup
./run.sh dev
```

`setup` installs the pinned Python dependencies in `.venv-hardened`, regenerates
samples, and installs the frontend from its frozen lockfile. `dev` starts exactly
one backend/frontend pair and stops its own process groups on Ctrl+C. It refuses
occupied ports rather than killing an unrelated server or changing ports.

If Python 3.12 is not on PATH, install it (for example `uv python install 3.12`)
and retry, or set `CAUSALPACKET_PYTHON` to the executable. On this workstation,
a verified standalone interpreter is in ignored `.artifacts/python/`, and the
launcher discovers it. The old `.venv` is preserved as a historical development
environment; use `.venv-hardened` or the launcher for final verification.

For separate terminals, run `./run.sh api`, then `cd frontend` and `pnpm dev`.
Backend reload watches only `backend/` to avoid watching runtime artifacts and
frontend dependencies. Stop prior AGY servers before starting this pair. Stop
test servers when finished to release memory.

Open <http://localhost:3000>, select Live, and choose a sample or upload an
uncompressed `.pcap`/`.pcapng`. Health is <http://127.0.0.1:8000/api/health>;
API docs are <http://127.0.0.1:8000/docs>. Only frontend origins on
localhost/127.0.0.1 port 3000 are allowed.

A fresh backend install was verified without system packages using the exact
pinned wheels and Python 3.12.16. The environment blocks ordinary package DNS,
so release wheels were fetched via the available HTTPS path and SHA256-checked.
An optional `CAUSALPACKET_WHEELHOUSE` path supports offline Python setup;
`./run.sh setup --backend-only` preserves an independently managed frontend.
The frontend was updated to Next 16.4.3 and React 19.3.1; AGY-004 reports the
frozen-install, typecheck/build, package audit and live browser pass succeeded.
The verification servers were then stopped.

### CLI

The CLI uses the same supervised worker and engine as the API:

```bash
./run.sh cli samples/05_mixed_scan_and_fault.pcap
./run.sh cli samples/03_possible_scan.pcap --json
./run.sh cli samples/04_gateway_transition.pcap --context samples/gateway-baseline.json --markdown
```

Optional `--context path/to/context.json` accepts the `NetworkContext` schema in
[the API contract](docs/api-contract.md).

## Synthetic samples

All sample traffic is fictional and written offline; generation never transmits
packets. The committed captures regenerate deterministically with:

```bash
./run.sh samples
```

| Capture | Expected result |
| --- | --- |
| `01_healthy.pcap` | 60 packets; many successful services; no findings |
| `02_service_failure.pcap` | 27 packets; 12 explicitly refused attempts to one service; likely fault |
| `03_possible_scan.pcap` | 40 packets; 20 distinct rejected ports; possible scan |
| `05_mixed_scan_and_fault.pcap` | 67 packets; independent fault and scan incidents |
| `07_truncated.pcap` | Valid-prefix analysis with a partial-coverage warning |
| `04_gateway_transition.pcap` | 19 packets; three protocol observations, two evidence links, one investigation |
| `06_dns_faults.pcap` | 17 packets; three SERVFAIL and three REFUSED responses; normal negative/tail controls |
| `08_arp_healthy.pcap` | Normal probes and a single address announcement; no conflict finding |
| `09_dns_healthy.pcap` | Healthy exchanges with shared IDs/different questions and normal NXDOMAIN |

[samples/manifest.json](samples/manifest.json) records expected behavior, forbidden
conclusions, generator version/seed, and optional context. Context is never
silently applied from filenames or manifests. Documentation IP ranges and locally
administered MACs are used; no real user traffic is included.

## Verification

```bash
./run.sh doctor
./run.sh check
```

Current backend result: **111 tests passed**. These cover controls, changed
addresses/filenames, request/response matching, incomplete capture behavior,
PCAP variants, PCAPNG scope, malformed input, state/packet/output budgets, hard
worker timeout, API responsiveness, upload limits, context preservation, session
expiry, ARP/VLAN/interface isolation, full DNS-key matching, malformed DNS compression,
normal negative answers, gateway-context invariants, residual-fault retention,
worker cancellation/reaping, 80 deterministic mutated capture cases, malformed
multipart recovery, launcher cleanup, and payload credential exclusion. AGY reported frontend typecheck and
production-build success; live browser integration and provenance corrections
were completed by AGY in [AGY-002](docs/prompts/AGY-002-live-integration.md). The
real gateway browser flow and visible association explanations were completed
by AGY in [AGY-003](docs/prompts/AGY-003-gateway-investigation.md). The patched frontend dependency/browser pass was completed in AGY-004. Report
download controls, live start state, export lifecycle race guards, and full
browser walkthroughs were completed and verified in AGY-005 and AGY-006.

Measurements and limits are documented in [evaluation.md](docs/evaluation.md).
Synthetic outcomes do not establish production accuracy or calibrated attack
probabilities.

## Demo and report artifacts

Verify the complete synthetic demonstration without starting servers:

```bash
./run.sh verify-demo --output .artifacts/demo-verification.json
```

The script uses the real API handlers and isolated workers via ASGI. It checks
all nine samples, gateway baseline/approval/reset with invariant packet facts,
Markdown exports, and malformed-input recovery. This does not imply a browser
or HTTP-socket test. Browser passes are reported separately by AGY.

See the [real synthetic investigation report](docs/example-investigation.md),
[demo storyboard](docs/demo-script.md), [recorded verification results](docs/demo-verification.json),
and [submission status](docs/submission-status.md).
The API supports `GET /api/analyses/{id}/export?format=markdown` or `format=json`.
Exports retain header metadata and declared context, not raw application payloads.
The frontend export controls provide direct Markdown and JSON downloads with in-flight
cancellation guards and provenance safeguards.

Create a review snapshot after final changes:

```bash
./run.sh package
```

The archive is written to ignored `.artifacts/causalpacket-submission.tar.gz`
with a per-file SHA256 manifest. Environments, node_modules, caches, Git metadata,
private env files, and undeclared captures are excluded. Included PCAPs must match
deterministic synthetic regeneration. Known credential patterns and symlinks
are rejected. This is a scoped packaging check, not proof of absence of secrets.
Extract into an empty writable directory when preparing a real repository;
the snapshot itself is not a published GitHub submission.

## Larger generated controls

The independent workload runner was checked with 3,000–15,536 generated packets:

```bash
.venv-hardened/bin/python -m scripts.evaluate_workloads --connections 1000 5000
```

The 15,536-packet mixed case completed in 1.77 seconds in this measured run.
It retained 33 observations in two investigations (one scan and one independent
service fault); the healthy 15,000-packet case produced no findings. Child peak
RSS reached about 111 MiB across these runs. These are finite synthetic controls,
not production accuracy or a guarantee for every capture. Full measurements and
method: [workload-evaluation.json](docs/workload-evaluation.json).

## Security and privacy behavior

- Recognize standard PCAP byte-order/precision variants and timestamped Ethernet
  PCAPNG enhanced-packet blocks; count unsupported records and explain limits.
- Check container sizes before body allocation, preserve original frame numbers,
  and stop on unrecoverable framing corruption with a valid-prefix warning.
- Enforce a 25 MiB file budget, 100,000 examined packet records, bounded attempt
  and evidence state, and bounded report size. Each worker has a 15-second wall
  timeout, 10 CPU-second budget, and 512 MiB address-space cap on Linux.
- Allow one active worker. Resource-limited subprocesses are not advertised as a
  complete OS security sandbox. Do not host untrusted public uploads using this
  local development configuration.
- DNS question names are never stored in reports: matching uses normalized
  question fingerprints. Fingerprinting is not a guarantee of anonymity.
- Reports contain allowlisted header metadata and escaped text; raw application
  payloads, HTTP credentials/cookies, and packet hex dumps are not retained.
  Addresses and other metadata may still be sensitive. No inference API is used.
- Delete uploaded bytes after processing. Retain at most three metadata reports
  under a 6 MiB total budget, expiring after 30 minutes with periodic cleanup.
- Trust settings are operator assertions; MAC/IP identity is not authenticated.
  No finding or empty result certifies that a network is safe.

Use only generated/lab captures or traffic you are authorized to analyze. The
project performs no live sniffing, probing, or network remediation.

## Original work and dependencies

Detection and diagnosis logic is implemented in `backend/detectors/` and
`backend/core/analyzer.py`; no Wireshark/tshark alerts or external threat engine
are wrapped. Container bounds, evidence assembly, supervision, privacy handling,
and context interpretation are project code. Scapy supplies protocol decoding
and fixture construction.

| Library | Role |
| --- | --- |
| FastAPI / Starlette | Local HTTP API, CORS, multipart request handling |
| Pydantic | Canonical models, validation, reference checks, JSON Schema |
| Uvicorn | ASGI server |
| Scapy | Offline packet dissection and synthetic packet construction |
| python-multipart | Multipart syntax parsing after request-size bounding |
| HTTPX / pytest | Development integration and correctness checks |
| Next.js / React / React DOM | Web investigation interface |
| TypeScript / React & Node types | Frontend type checking |
| Tailwind CSS / PostCSS / Autoprefixer | Interface styling |
| Lucide React | Interface icons |

All Python runtime/development versions are pinned in `requirements*.txt`; the frontend declares its
actual dependencies in `frontend/package.json` and its package lockfile. Scapy's
process-local offline configuration suppresses interface/route discovery; the
engine does not require raw sockets. The complete Python dependency inventory
and reviewed versions are in [dependencies.md](docs/dependencies.md), with
[audit evidence and limitations](docs/dependency-audit.md).

## Architecture and development

`Next.js → bounded local API → resource-limited worker → original trackers →
observations → packet-backed associations → competing explanations and evidence`.

### Real gateway Alibi walkthrough

1. Analyze `gateway-transition`. Empty policy gives an unresolved investigation.
2. Explicitly supply the synthetic baseline: gateway `192.0.2.1`, approved MAC
   `02:00:00:00:00:01`. The second claimant becomes policy-unapproved and the
   explanation becomes suspected impersonation, with legitimate alternatives.
3. Add `02:00:00:00:00:02` to the approved set as well. The unauthorized-claimant
   explanation weakens, and the assessment becomes unresolved. DNS/TCP problems
   remain. This does not prove failover caused the failures.
4. Reset context. All observations, measurements, associations, and packet frames
   remain fixed. Baseline policy is never silently applied to an uploaded capture.

The API and Next.js UI support this entire flow; AGY-003 supplied convenience
controls and visible association reasons, with reported browser verification.

See [PLAN.md](PLAN.md), [API contract](docs/api-contract.md), and
[report JSON Schema](docs/report.schema.json). Codex owns backend/engine/tests;
AGY owns the frontend. Preview fixtures are always development data.

## Submission status

Local engineering, synthetic evaluation, and demonstration rehearsals are complete.
All 111 backend tests, contract invariants, TypeScript compilation, Next.js production
builds, and end-to-end browser walkthroughs have passed. Final external submission steps
(publishing the recorded video, pushing to the public GitHub repository, and submitting
the organizer form) are documented in [docs/submission-status.md](docs/submission-status.md).
Official deadline: **1 November 2026, 21:00 IST**; internal target: **19:00 IST**.
