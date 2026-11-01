# Hackathon readiness review

Reviewed 1 November 2026 against the rules pasted by the team. This is a source,
test, artifact and presentation review; it is not an organizer acceptance or a
prediction of the final ranking.

## Verification performed in this review

- Python 3.12.16: **156 backend tests passed** including evidence-lab and hosting controls.
- All three fictional fixture/schema/reference checks passed.
- All nine real synthetic-capture scenarios passed through ASGI and isolated
  workers, including context invariants, exports and malformed-input recovery.
- `./run.sh doctor` passed the pinned environment, lock and sample checks.
- Direct Node/Webpack production build passed compilation, TypeScript and static
  generation. No web server was started for these checks.
- Inspected the existing desktop/mobile screenshots, source handlers, original
  browser recording and captioned video. This review does not claim a new live
  Playwright run; the earlier browser/race checks are AGY's reported results.
- The included H.264 video is 205.571 seconds (about 3:26), with an audio stream
  in the team voiced export. It is the actual redesigned interface recorded against the real local
  API using synthetic captures. The deployment end card is clearly labeled.
  Measured scene timings and revised voice-over captions accompany the recording;
  representative frames and server responses were reviewed. Narration is present; original source-timing subtitles require realignment before use with this shorter edit.

## Requirements and actual coverage

| Requirement | Finding | Evidence / qualification |
| --- | --- | --- |
| Capture input | Implemented | Uncompressed classic PCAP variants and timestamped Ethernet PCAPNG enhanced blocks; explicit unsupported-record limitations. |
| Large/broken/malicious input | Implemented with bounded scope | File, record, packet, state and output limits; worker timeout/resource limits; malformed-prefix handling and mutation controls. A subprocess with resource limits is not complete OS isolation. |
| Network faults | Implemented subset | TCP refusals, possible SYN retries, missing/delayed handshakes, DNS errors/delay/unanswered queries, and ARP identity conflicts. General TCP data retransmissions and MTU diagnosis are outside coverage. |
| Suspicious activity | Implemented subset | Vertical/horizontal scan patterns and policy-unapproved gateway claimants as suspected impersonation. No confirmed MITM, DNS hijacking or rogue DHCP detector is claimed. |
| Fault versus attack | Implemented | Independent outage and scan remain separate; context changes interpretation; missing evidence can remain unresolved. No production false-positive rate has been established. |
| Plain-language explanations | Implemented | Observations, competing hypotheses, challenges and missing evidence. Some visible protocol/metric labels remain technical. |
| Likely cause and suggested fix | Implemented | Cause alternatives and conditional practical verification/restoration steps; no automatic repair or unsupported diagnosis. |
| Packet evidence | Implemented | Original frame references, retained headers, chronological view, observed successful comparisons and packet-backed associations. |
| Included samples | Verified | Nine deterministic synthetic files plus truth manifest; generation writes files offline. |
| Original detection logic | Source supports claim | Own trackers, diagnosis, correlation and framing; Scapy decodes/builds packets. No tshark/Wireshark diagnosis wrapper found. This does not establish universal novelty against all prior products. |
| Libraries/APIs disclosed | Present | README lists directly used libraries; dependency inventory, exact requirements and frontend lock provide version details. No external inference API is used. |
| Input validation and secrets | Scoped checks pass | Typed models, bounded bodies, safe errors, metadata allowlist and packaging credential-pattern checks. This is not proof that every vulnerability or secret is absent. |
| Safe testing | Inspected repository uses synthetic controls | No live capture/probing path found in the engine or sample generator. External team conduct cannot be verified from source alone. |
| README/setup | Present and exercised | Linux/WSL, Python 3.12+, Node and pnpm prerequisites; launch/check instructions; earlier clean extracted-source tests reported by AGY. |
| Public GitHub repository | Exists; latest source publication remains with the team | https://github.com/ArpitKrSingh7/causalPacket. The prepared checkout has the configured remote; the team pushes the latest release. |
| Video 2–5 minutes | Voiced 3:26 walkthrough passes duration | Real local API/sample flows and deployment end card; captions and measured timings supplied. Voice-over is present; verify the latest public video push. |
| Built during event | Local commit dates within supplied window | Both inspected release commits are dated early 1 November IST. That alone cannot prove the entire development history or team eligibility. |
| Team size / membership | Requires team confirmation | Source cannot verify the 1–3 member rule or membership in only one team. |
| Deadline and form | Pending team-leader action | Submit strictly before 1 November 2026, 21:00 IST; only the team leader submits. Preserve real confirmation. |

The challenge's examples are broader than the implemented detector set. The
pasted rules do not explicitly say every listed example must be implemented,
but broader verified coverage may affect scoring. Do not imply full coverage in
the pitch. The working subset answers the central problem with evidence and
explicit uncertainty.

## Rubric assessment and highest-value improvement

| Criterion | Existing strength | Highest-value remaining action |
| --- | --- | --- |
| Novelty, 20% | Interactive competing interpretations with fixed evidence | Make the evidence map and Alibi before/after change immediately visible. |
| Technical implementation, 30% | Stateful matching, original correlation, bounded worker, reproducible controls | Present one real investigation clearly; avoid adding unverified detector families. |
| Security, 20% | Bounded local ingestion, metadata handling, cleanup and no external inference service | Preserve the local privacy story. Public hosting requires explicit origin configuration and additional deployment review. |
| Feasibility, 10% | Documented local launcher, pinned packages, included samples | Finish public repository verification. Live hosting is optional in the supplied rules. |
| Video, 20% | Completed narrated redesigned-interface recording | Review the final voiced export and public playback before submission. |

The final interface addresses the earlier hierarchy problem: ingestion collapses
after loading, the investigation brief and first next check appear prominently,
and the dark evidence board renders actual observation/frame associations. The
Alibi Test and synthetic evidence lab remain interactive and explicit about their
limits. Nine component interaction checks and the production build pass. A fresh
live-browser layout pass is not claimed because Chromium startup is blocked in
this execution environment. The new recording shows the redesigned interface; its matching narration
and measured timings are in [demo-script.md](demo-script.md).

The strongest remaining presentation task is a clear narrated demonstration of
fixed packet facts, changed trusted context and a residual fault that survives.
A strong implementation cannot guarantee a ranking against unknown submissions.

## Hosting boundary

The default backend accepts localhost origins in both CORS and body middleware;
`CAUSALPACKET_ALLOWED_ORIGINS` can configure exact deployed frontend origins in both.
It also uses one process-local report store. A Vercel frontend alone is not the
full application. Preserve local setup and video as the submission baseline;
do not expose this local-development upload configuration unchanged as a public
multi-user capture service. Render/Vercel setup is documented in
[deployment.md](deployment.md). The public frontend/backend URLs are recorded in [submission-status.md](submission-status.md).
The exact Vercel-origin CORS preflight returned HTTP 200; this is not a fresh
browser verification of the redesigned interface or an organizer submission receipt.
