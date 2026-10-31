# AGY 003 — Show the real gateway investigation and evidence links

```text
Continue in /home/arpit/cybersecHackathon.
AGY-002 is complete. Codex has now implemented ARP identity changes, UDP DNS
tracking, gateway-context reinterpretation, and packet-backed incident grouping.
The canonical TypeScript/API shapes are unchanged. 86 backend tests pass.

OWNERSHIP
Edit frontend/** EXCEPT frontend/lib/types.ts and frontend/fixtures/**.
Do not edit backend/**, scripts/**, tests/**, docs/**, PLAN.md, or root files.
Codex owns those. Keep all AGY-002 provenance, empty-new-context, cancellation,
keyboard, and error-handling fixes intact.

CURRENT LIVE BACKEND
Restart only your own stale backend if necessary, or use its --reload process:
.venv/bin/python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload

GET /api/samples now provides NINE real synthetic captures.
The important new sample_id is gateway-transition:
- 19 examined/decoded packets, coverage complete within supported checks.
- Three observations: ARP_IDENTITY_CHANGE, DNS_RESPONSE_ERROR,
  TCP_CONNECTION_REFUSED.
- Two EvidenceEdge objects and ONE grouped incident.
- Two observed earlier-success comparisons (DNS and TCP).
- With empty context its assessment is unresolved, because authorization and
  gateway identity are not established from the capture alone.

BUILD THESE THREE ADDITIONS
1. Render report.edges for the selected incident. Right now the frontend does
   not consume edges, so judges cannot see WHY three facts were grouped.
   Add a small “Why these findings are linked” panel or relationship strip.
   Show source/target observation titles, the edge.reason, and clickable
   supporting frame tags. Resolve every frame through report.evidence.
   Sort displayed events by capture time. Label arrows as associations or
   chronology, never proof of cause. Keep the layout readable on mobile.
   Use simple HTML/SVG; do not add a graph library or graph-editor controls.
   With no relevant edges, avoid implying a connection between independent
   incidents. Edges must be supplied by the backend, never invented in the UI.

2. Add an EXPLICIT way to apply a synthetic sample's declared baseline.
   SampleInfo.suggested_context exists already. For the active real sample
   only (report.sample_id matches a catalog item and data_origin=capture), show
   its nonempty suggested_context and a button “Apply sample inventory”.
   Display the actual gateway IP / approved MAC before the operator clicks.
   The button calls reinterpret(report.analysis_id, suggested_context).
   It MUST NOT apply automatically on sample selection, upload, or mode toggle.
   The gateway-transition metadata contains:
     gateway_ip: 192.0.2.1
     approved_gateway_macs: [02:00:00:00:00:01]
     authorized_scanner_ips: []
   Applying that declared baseline makes the other claimant policy-unapproved,
   so the returned assessment is suspected_attack (not confirmed spoofing).
   Arbitrary user uploads have no sample inventory button; manual context remains.

3. Make the real gateway Alibi easy to demonstrate. Show the observed MACs
   from the live ARP observation's entities (kind=mac), associated with its
   claimed IP (kind=server). Keep manual editing available. An explicit
   “Add to approved gateway devices” action may append an observed MAC ONLY
   after gateway_ip is explicitly configured to that claimed IP. It calls the
   real reinterpret endpoint and displays the returned assessment and changes.
   Do not infer the gateway from an address ending in .1 or clear findings
   locally. Do not authenticate a device just because a MAC matches.

DEMO FLOW TO VERIFY IN THE BROWSER
- Analyze gateway-transition with empty context: one unresolved investigation,
  three observations, two associations, two comparisons, 19 packets.
- Inspect both association reasons and open their referenced frames.
- Explicitly click Apply sample inventory: returned assessment suspected_attack.
- Approve observed MAC 02:00:00:00:00:02 as well, keeping MAC ...:01 approved:
  returned assessment unresolved; unauthorized-device explanation weakens;
  DNS errors and TCP refusals remain visible. Render reason_changed,
  evidence_retained, and remaining_problem from interpretation_changes.
- The observations, edges, coverage, measured counts, and frame references
  remain identical through all context changes. Approval does not prove failover
  caused the outage. Reset clears policy, keeping facts and grouping.
- Analyze dns-faults: 17 packets, one likely_fault incident, three SERVFAIL and
  three REFUSED responses. NXDOMAIN is a normal negative answer and the last
  unanswered query is capture-tail incomplete; these appear in coverage notes.
- Analyze arp-healthy and dns-healthy: no findings, with honest coverage.
- Regression: mixed-scan-and-fault still has two independent incidents; scanner
  authorization still preserves its independent service fault.
- New uploads/samples still start with empty context and retain correct origin.
- Preview views remain clearly fictional and never supply policy to live reports.

Run pnpm typecheck and pnpm build. Verify live browser behavior at desktop
and a narrow viewport. Report changed files, exact checks/results, screenshots
if available, and any incomplete checks. Stop after this chunk.
```
