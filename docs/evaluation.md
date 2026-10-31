# Four-family engine evaluation

Status: development evaluation of a synthetic test suite, not production accuracy.

## Verification actually run

- Hardened clean environment: Python 3.12.16, Linux x86_64, pytest 9.2.0.
- `.venv-hardened/bin/python -m pytest -q`: **111 passed in 5.48 seconds** on the latest recheck.
- `.venv-hardened/bin/python -m scripts.check_contract`: all three fictional UI fixtures,
  cross-reference integrity, before/after invariants, schema and context checks pass.
- CLI and HTTPX ASGI upload/sample flows use real generated capture bytes and the
  resource-limited worker. No UI fixture is served as an analysis result.
- AGY reports frontend typecheck/build and the TCP/scan browser walkthrough
  passed, including corrected preview/live provenance. AGY also reports the real ARP/DNS gateway
  walkthrough and edge presentation passed in AGY-003. The patched frontend
  dependency/browser pass was completed by AGY in AGY-004, with test servers
  stopped afterward. JSON/Markdown exports are implemented; the download UI
  hookup is assigned in AGY-005.
- The latest local `./run.sh check` passed Python tests, contract checks and
  frontend typechecking, then Turbopack was blocked by the tool sandbox's
  prohibition on binding its internal CSS-worker socket (`Operation not
  permitted`). That invocation is not a passing production build; AGY's
  previously reported build/browser pass is recorded separately above.
- The direct alternate command `node node_modules/next/dist/bin/next build
  --webpack` subsequently passed compilation, TypeScript and static generation
  on the current source. The package-manager invocation of the same alternate
  build had failed to parse a TypeScript child-process result; the direct Node
  invocation succeeded. No typechecking was disabled and no server was started.

## Sample observations

The table below was measured in the earlier Python 3.10 process, before the
dependency hardening. It is retained as historical development measurement,
not a performance measurement of the new stack. It excludes worker startup, HTTP transport,
and frontend rendering. These tiny files do not demonstrate large-capture speed.

| Sample | Records | Coverage | Observations | Incidents | Engine time |
| --- | --- | --- | --- | --- | --- |
| Healthy | 60 | complete | none | 0 | 7.78 ms |
| Service failure | 27 | complete | TCP connection refusals | 1 | 3.42 ms |
| Possible scan | 40 | complete | scan pattern | 1 | 4.86 ms |
| Mixed scan/fault | 67 | complete | refusal + scan | 2 | 8.56 ms |
| Truncated | 60 examined, 59 decoded | partial | none | 0 | 7.09 ms |
| Gateway transition | 19 | complete | ARP change + DNS error + TCP refusal, two links | 1 | 3.11 ms |
| DNS faults | 17 | complete | three SERVFAIL, three REFUSED | 1 | 2.23 ms |
| ARP healthy | 3 | complete | none | 0 | 0.51 ms |
| DNS healthy | 6 | complete | none | 0 | 0.86 ms |

Peak RSS of that warmed evaluation process: 63,944 KiB. This is neither a
per-capture memory cost nor the worker's address-space cap. Resource-control
targets should be rechecked on the final judging environment.

## Controls and edge cases

- Successful connections across many ports do not trigger the rejected-port rule.
- Twelve refusals to one service produce a fault finding and an earlier-success
  comparison. Twenty rejected distinct ports produce a possible-scan finding.
- A mixed capture retains both independent incidents. Authorizing its scanner
  changes that interpretation without changing measurements/evidence or removing
  the independent fault. Reset restores the original security interpretation.
- Three varied generation seeds and changed filenames exercise independence from
  the default demo addresses and sample filenames.
- Incorrect reset acknowledgment, missing final handshake ACK, SYN retries,
  horizontal probing, and attempts outside the window have separate controls.
- Capture-tail pending attempts are incomplete rather than counted as failures.
- Four classic-PCAP precision/byte-order formats, both PCAPNG byte orders, and
  separate PCAPNG interface scopes are exercised.
- Truncated records, excessive declared lengths, unsupported link types, malformed
  frames, and regressing timestamps report limitations. Original frame numbers
  remain intact when malformed records are skipped.
- Explicit packet/state/evidence/output budgets, worker timeout/recovery, metadata
  count/expiry/size budgets, oversized chunked body with a false Content-Length,
  local-origin restrictions, and concurrent-analysis rejection are exercised.
- A deliberate synthetic Authorization/Cookie payload never appears in report
  JSON. Reports contain only allowlisted headers; this is not full anonymization.

## Documented detector settings

Defaults live in `backend/core/config.py`. The scan demonstration rule uses a
10-second window, 12 distinct destination ports/hosts, at least 10 observed known
outcomes, and at least 80% explicitly rejected known outcomes. Missing responses
are displayed separately. Diverse unanswered probes can be unresolved activity,
while many responsive services are a negative control. These thresholds are
heuristics, not calibrated probabilities or universal network standards.

TCP repeated refusals require three attempts. The unanswered-attempt observation
requires three attempts with at least three seconds of subsequent capture time;
it remains uncertain about visibility. The response-delay threshold is 0.5 seconds
with three observed delayed responses and does not establish a universal normal RTT.

## Limits of this evaluation

The four diagnostic families and packet-backed ARP association are implemented.
The gateway UI fixtures remain fictional presentation examples; the generated
PCAP and API exercise real detection. The association rule is intentionally
limited to retained first-transition ARP evidence and client frames addressed to
the new sender MAC within five seconds, in the same scope. Nearby timestamps
alone do not link incidents. Independent faults and scans remain visible.

No labeled production dataset, broad compatibility assessment, large-capture
benchmark, calibrated accuracy claim, or full penetration audit is claimed.
A clean Python 3.12 backend install passed all tests, and AGY reports the gateway
browser flow passed. Patched frontend-version verification was completed in AGY-004; report-download
UI verification remains in AGY-005. PCAPNG simple/obsolete packet blocks, non-Ethernet link types,
full reconstruction, general data retransmissions, fragments, encrypted traffic,
TCP DNS, truncated-response fallback, DHCP, DNS manipulation, and MTU checks are
outside current coverage. Domain fingerprints are not guaranteed anonymization.

## ARP/DNS and correlation controls

- Probes from 0.0.0.0, single announcements, invalid claimant MACs, and claims
  in separate VLAN/interface scopes do not create ownership conflicts.
- A .1 address is never assumed to be a gateway. Approval of an unrelated
  gateway address does not authorize the observed claimant.
- Full DNS matching tests vary client, resolver, client port, transaction ID,
  name, question type, and question class individually. All mismatches are
  excluded from resolver-error findings. ASCII question case is normalized.
- Retry requests are deduplicated. Short-interval reuse of the entire completed
  transaction key marks later replies ambiguous rather than accepting a late
  duplicate as a new failure. DNS compression loops and truncated TC responses
  produce limited coverage, not an attack finding.
- Normal NXDOMAIN and capture-tail pending DNS are controls. Missing mature
  queries and measured response delays remain unresolved about ultimate cause.
- Gateway association requires actual next-hop MAC evidence. Close timing with
  the old MAC or an event outside the window remains separate. An independent
  client's fault survives the grouped investigation.
- The gateway scenario is regenerated with three changed client-address seeds.
- The API worker is exercised through baseline and both-approved contexts.
  Observation objects, measured counts, edges, evidence, and comparisons remain
  fixed; reset is supported; repeated identical context is idempotent.
- ICMP-quoted TCP is excluded from direct TCP conversation tracking.

## Protocol references

[RFC 1035](https://www.rfc-editor.org/rfc/rfc1035.html) informs standard DNS
question/compression parsing; [RFC 5227](https://www.rfc-editor.org/rfc/rfc5227)
informs ARP probe/announcement interpretation. These references describe protocol
behavior; they do not validate the accuracy of our diagnostic heuristics.


## Additional hardening checks

The hardened suite includes 80 seeded mutations of actual generated capture
bytes (including container/header bit changes and truncation), with controlled
errors or fully valid report references/accounting. A PCAPNG file with more than
200,000 metadata blocks hits the explicit work budget. Multipart shape errors
recover without exposing supplied private strings. Cancelled analysis reaps its
worker, and launcher cleanup signals only the process groups it created.

The 24-package pinned backend/development set returned no matching known
advisories in the recorded OSV version check. See [dependency-audit.md](dependency-audit.md)
for exact versions, sources, date, pending frontend work, and limitations.


## Report and submission-artifact checks

JSON/Markdown downloads preserve the current analysis; structured errors apply
to expired sessions and unsupported formats. Markdown includes exact frame/scope/
MAC evidence and remaining DNS/TCP problems after gateway approval. Untrusted
filename formatting/terminal controls are escaped or removed, payload credentials
remain excluded, and CORS exposes the safe download filename to the local UI.

The serverless demo verifier passes all nine sample scenarios, immutable gateway
baseline/approval/reset transitions, exports and malformed-upload recovery.
Packaging tests exclude private environment files, caches, dependency trees,
undeclared captures, source symlinks, known credential patterns and accidental
source-file overwrite. The packager additionally verifies that included captures
match deterministic regeneration before archiving. These checks do not prove
production detection accuracy or a universal absence of secrets.


## Larger independent synthetic workloads

Command: `.venv-hardened/bin/python -m scripts.evaluate_workloads --connections 1000 5000`.
The runner generates captures in a temporary directory, uses real isolated workers,
and removes the files afterward. No HTTP server/browser process is started.
Generation time is excluded from the worker timings below.

| Control | Packets | Coverage | Raw observations | Investigations | Worker wall time |
| --- | --- | --- | --- | --- | --- |
| 1,000 healthy connections | 3,000 | complete | 0 | 0 | 466.18 ms |
| Healthy background + scan/fault | 3,536 | complete | 33 | 2 | 511.87 ms |
| 5,000 healthy connections | 15,000 | complete | 0 | 0 | 1,674.93 ms |
| Larger background + scan/fault | 15,536 | complete | 33 | 2 | 1,765.01 ms |

The mixed case includes 16 hosts × 16 probed ports (256 rejected attempts) and
12 independent refusals to one service. The vertical/horizontal patterns overlap,
so their attempt counts must not be summed as distinct connections. The 32 scan
observations retain 512 packet references in one source-local investigation;
the service fault remains separate. All raw observations stay available.

The peak child RSS observed so far reached 113,156 KiB (about 111 MiB). This is
a cumulative maximum, not an allocation attributed exclusively to the last case.
Raw timestamps, CPU/wall times and generation costs are in
[workload-evaluation.json](workload-evaluation.json). Synthetic controls do not
establish production false-positive rates, accuracy, or universal throughput.

These checks exposed and fixed two issues: an overly fragmented incident list
for multi-target scans, and default thresholds being reapplied during context
reinterpretation. Scan reports now record their minimum known-outcome count,
ratio and time-window settings; those recorded settings govern interpretation
and grouping. Tests cover empty-context idempotence, source authorization/reset,
custom windows, distant episodes and independent sources/faults.
