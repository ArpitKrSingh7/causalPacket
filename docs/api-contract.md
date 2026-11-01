# CausalPacket API contract — v1.0

Canonical models: `backend/core/models.py`. Frontend mirror: `frontend/lib/types.ts`.
Report JSON Schema: `docs/report.schema.json` (generated). All response names use
snake_case. All declared model properties appear in serialized responses;
nullable properties use JSON `null`, collection properties use arrays.

## Current implementation status

The TCP, scan, ARP, and UDP DNS engine is implemented. Health reports
`engine_ready: true`. Nine real synthetic captures are available. Uploads,
sample analysis, gateway/scanner reinterpretation, packet-backed ARP association,
grouped investigations, evidence lookup, and session release/expiry work.
ARP grouping requires a retained client frame addressed to the changed claimant
MAC within the configured five-second interval and the same capture scope;
nearby times alone do not create an edge. The initial empty-policy gateway
sample is unresolved; explicitly applying its suggested baseline can make the
second claimant suspicious, and approving both weakens that explanation while
retaining the DNS/TCP problems. This is not authenticated ownership or proof of
causation. Resource/coverage limitations remain explicit in every report.

UI examples are in `frontend/fixtures/`:

- `gateway-before.json`: fictional gateway transition and three TCP refusals.
- `gateway-approved.json`: fictional context-change presentation. Same analysis
  ID, observation objects, edge objects, evidence objects, and comparison counts.
  The security hypothesis weakens; service failures remain unresolved.
- `healthy.json`: fictional empty finding state with a completed exchange.

These are hand-authored presentation fixtures, not outputs of a working packet
engine. Every example has `data_origin: "development_fixture"` and a warning.
Show a persistent **Development preview · fictional data** label when using them.

## Transport and routes

Base URL in development: `http://127.0.0.1:8000`.
Frontend uses `NEXT_PUBLIC_API_BASE_URL` with this default. Never hardcode a LAN
address. Development origins allowed: `http://localhost:3000` and
`http://127.0.0.1:3000`. No cookies or authentication are required locally.

| Method / path | Request | Final success response | Current status |
| --- | --- | --- | --- |
| `GET /api/health` | None | `HealthResponse` | Implemented; `engine_ready: true` |
| `GET /api/samples` | None | `SamplesResponse` | Implemented; nine synthetic captures |
| `POST /api/analyze` | Multipart `file` and optional `context` JSON string | `AnalysisReport` | Implemented |
| `POST /api/samples/{sample_id}/analyze` | JSON `NetworkContext`, default empty object | `AnalysisReport` | Implemented |
| `POST /api/analyses/{analysis_id}/reinterpret` | JSON `NetworkContext` directly, no wrapper | `AnalysisReport` | Implemented |
| `GET /api/analyses/{analysis_id}/evidence` | Query `frame_numbers=1,5,7`, `offset=0`, `limit=100` | `EvidencePage` | Implemented |
| `DELETE /api/analyses/{analysis_id}` | None | 204, no body | Implemented; idempotent session release |
| `GET /api/analyses/{analysis_id}/export` | Query `format=markdown` or `format=json` | Attachment bytes, not a download-URL envelope | Implemented |
| `POST /api/lab/evidence` | JSON `{ "seed": 42 }`, or `{}` | Separate `ExperimentReport` | Implemented; synthetic experiments only |

The lab is an additive endpoint with models in `backend/core/experiments.py`.
It does not alter `AnalysisReport` or normal sessions. Nested lab report IDs are
not session IDs for lookup/reinterpret/export. See [novelty.md](novelty.md) for
the exact scope, frame mapping, response structure and experiment limitations.

Do not set multipart `Content-Type` yourself; the browser must supply the boundary.
The frontend size check is a convenience. The backend counts the request body
before multipart parsing and enforces 25 MiB for the file plus bounded form overhead. The initial report includes
all retained supporting header evidence, so the UI can open a frame immediately
from `report.evidence`; the evidence route provides bounded filtered access.

Example health response:

```json
{"status":"ok","schema_version":"1.0","engine_ready":true}
```

Example context:

```json
{
  "gateway_ip": "192.0.2.1",
  "approved_gateway_macs": ["02:00:00:00:00:01"],
  "authorized_scanner_ips": []
}
```

Reset uses `gateway_ip: null` and both arrays empty, then calls reinterpretation.
It clears user-supplied policy, not packet observations. Gateway MAC approvals
require an explicit gateway IPv4 address. Up to 64 gateway MACs and 64 scanner
IPv4 addresses are permitted. MACs use colon-separated six-byte notation and
normalize to lowercase. Context is an operator assertion, not authenticated trust.

## Report semantics for UI implementation

- `coverage.status`: `complete`, `partial`, or `limited`. Complete describes the
  supported processing performed; it does not certify traffic is safe.
- `coverage` supplies actual counters, protocols, duration, visibility notes,
  unsupported checks, and limits reached. Display meaningful limitations.
- `observations` are packet facts. Use their `metrics` verbatim; no fabricated
  probabilities. `total_evidence_count` may exceed the retained frame list.
- `incidents[].assessment`: `likely_fault`, `suspected_attack`, or `unresolved`.
  Keep `severity` separate. Mixed incidents may have different assessments.
- `incidents[].hypotheses` contain support, challenges, missing evidence, and
  suggested checks. Display their evidence level as a qualitative label.
- `incidents[].comparisons` contain observed metrics, basis, and limitations.
  `status: unavailable` means there is no suitable observed comparator.
- All observation, edge, and comparison `evidence_frames` resolve to objects in
  the same report's `evidence` array. Frame numbering is 1-based original capture
  order. `time_offset_seconds` is time since capture start, never wall-clock time.
- `edges[].reason` explains an association. An arrow must not be captioned as
  proof of causation. A small timeline is enough; no graph library is needed.
- `interpretation_changes` describes the last context update: changed reason,
  retained evidence, and remaining problem. Empty on initial analysis.
- Empty `incidents` means **No significant findings in the supported checks**.
  Show coverage with it. Never say “network safe.”
- Only allowlisted header metadata is exposed. Render it as escaped text.
  Never invent a payload/hex inspector or use `dangerouslySetInnerHTML`.
- Every result list may be empty. Do not assume observations/incidents exist or
  assume every incident has an edge, comparison, or interpretation change.

## Errors

Every application error uses this envelope:

```json
{"error":{"code":"unsupported_capture","message":"Provide an uncompressed PCAP or PCAPNG capture."}}
```

Treat an unexpected response safely if a proxy/network error returns non-JSON.
Do not show raw tracebacks. Implemented failures include 413 `file_too_large`,
415 `unsupported_capture`, 422 `invalid_request`/`invalid_capture`, 429
`analysis_busy`, 410 `analysis_expired`, and 504 `analysis_timeout`. A worker stopped by its memory/CPU budget can return `analysis_failed`; hard wall
timeout returns `analysis_timeout`. Unsupported checks remain in coverage.

Do not automatically fall back from a failed live request to a preview report.
Preview mode must be explicit. In preview mode only, switching to the supplied
approved fixture demonstrates the before/after layout; it is not a local
implementation of diagnosis. Arbitrary context changes await the live engine.


## Live integration notes

- Restart an older setup server or use Uvicorn `--reload`; cached setup processes
  can still report `engine_ready: false` until restarted.
- Do not pass fixture context to a new live analysis. New captures start with
  empty policy unless the operator explicitly supplies context for that capture.
- Local POST origins are restricted to localhost/127.0.0.1 port 3000. Requests
  without an Origin header (CLI and local API clients) are supported.
- Sessions retain at most three reports under a 6 MiB total serialized budget.
  They expire after 30 minutes; the server reaps expired entries every 30 seconds
  and clears them on shutdown. Capture files are deleted after processing.
- `GET /api/analyses/{id}/evidence` supports up to 128 comma-separated frame IDs,
  offset 0–4000, and page size 1–200. Unknown/unavailable analysis IDs return 410.
- Current demonstration rules: 10-second attempt window, 12 distinct ports or
  hosts, at least 10 known outcomes, 80% explicitly rejected outcomes. Unanswered
  packets are not silently counted as failures. Many successful connections are
  a tested negative control.


## ARP and DNS interpretation

- ARP observations use `type: ARP_IDENTITY_CHANGE`, a `server` entity for the
  claimed IP and `mac` entities for observed sender MACs. No gateway is inferred
  from a .1 address. Gateway identity is provided through `NetworkContext`.
- `gateway-transition` includes a suggested synthetic baseline in its sample
  catalog entry. Show it before applying, require an explicit operator action,
  and never automatically attach it to a new upload/sample.
- `DNS_RESPONSE_ERROR` reports matched SERVFAIL/REFUSED counts separately.
  NXDOMAIN is a negative answer, not an attack finding. Missing requests near the
  capture boundary are incomplete; matched error replies are not DNS hijacking.
- DNS matching includes capture scope, endpoints/ports, transaction ID, normalized
  question fingerprint, type/class, and a time bound. Short-interval full-key
  reuse is treated as ambiguous to avoid confusing late duplicate replies.
- DNS question text is never retained. PacketEvidence headers show a short
  fingerprint, transaction ID, question type and ordinary response code.
- New sample IDs: `gateway-transition`, `dns-faults`, `arp-healthy`, `dns-healthy`.
- Grouped incidents keep their original observation IDs and comparisons. A single
  gateway investigation has three observations and two edges; its context-change
  result explicitly retains service problems. The default gateway sample has
  19 packets; resolver-error sample has 17 packets.


## Report downloads

`GET /api/analyses/{analysis_id}/export?format=markdown` returns UTF-8 Markdown.
`format=json` returns the current `AnalysisReport` as a JSON attachment. The
endpoint defaults to Markdown and rejects other formats with the standard 422
error envelope. An expired/evicted/deleted report returns 410. No new persistent
file or cloud link is created.

Success sets `Content-Disposition: attachment` with a safe analysis-ID filename,
`Cache-Control: no-store`, and `X-Content-Type-Options: nosniff`. CORS exposes
Content-Disposition to the local frontend. Exports have a bounded 4 MiB response
budget. The Markdown report escapes untrusted text and includes facts, hypotheses,
comparisons, context changes, associations and exact retained headers, including
MACs and capture scope. JSON retains the current canonical facts/interpretation.

The UI must download bytes as a Blob, parse structured errors on failure, disable
live export for fictional fixture IDs, and revoke temporary object URLs. Exports
can contain sensitive IP/MAC metadata even though raw application payloads and
DNS name text are excluded. Export does not authenticate context or certify safety.


## Scan investigations and recorded rule parameters

A single source can produce multiple overlapping SCAN_PATTERN observations
(vertical and horizontal probing) in a bounded recorded window. Those patterns
share an incident when source and capture scope agree and the full episode fits
that window; observations and exact frames are retained. Independent sources,
distant episodes and service faults remain separate. Do not sum overlapping
pattern counts as a count of distinct connections.

The scan metrics include window_seconds, diversity_threshold,
known_outcome_threshold and rejected_threshold. Context reinterpretation uses
the recorded rule requirements rather than silently substituting defaults.
The existing Metric/Incident shapes are unchanged; frontend rendering remains
generic over metrics and observation IDs.
