"""Original observations and report assembly, independent of the web framework."""
from __future__ import annotations

from collections import defaultdict
from hashlib import sha256
from pathlib import Path
from uuid import uuid4

from backend.core.config import DEFAULT_CONFIG
from backend.core.models import (
    AnalysisReport, CaptureCoverage, Comparison, Entity, Hypothesis,
    Incident, InterpretationChange, Metric, NetworkContext, Observation,
)
from backend.core.parser import CaptureReader
from backend.core.correlation import correlate, group_incidents
from backend.core.scan_grouping import group_scan_incidents
from backend.core.protocol_diagnosis import protocol_diagnosis
from backend.core.protocol_findings import append_protocol_findings
from backend.detectors.arp import ARPTracker
from backend.detectors.dns import DNSTracker
from backend.detectors.scan import scan_windows
from backend.detectors.tcp import TCPTracker


def metric(key, label, value, unit=None):
    return Metric(key=key, label=label, value=value, unit=unit)


def stable_id(prefix, *parts):
    value = sha256(repr(parts).encode()).hexdigest()[:16]
    return f"{prefix}-{value}"


def representative(attempts, maximum=128):
    packets = {}
    for attempt in attempts:
        for packet in attempt.evidence:
            if len(packets) >= maximum:
                break
            packets[packet.frame_number] = packet
    return tuple(packets[key] for key in sorted(packets))


def diagnose(observations, comparisons, context, config=DEFAULT_CONFIG, edges=()):
    """Interpret immutable facts using explicit, user-supplied context."""
    incidents = []
    authorized = {str(ip) for ip in context.authorized_scanner_ips}
    for obs in observations:
        values = {m.key: m.value for m in obs.metrics}
        protocol = protocol_diagnosis(obs, context)
        approved = False
        if protocol is not None:
            assessment, title, hypotheses, next_steps = protocol
        elif obs.type == "SCAN_PATTERN":
            source = next(e.value for e in obs.entities if e.kind == "client")
            known = values["rejected"] + values["responsive"]
            minimum_known=values.get('known_outcome_threshold',config.scan_min_known_outcomes)
            rejected_threshold=values.get('rejected_threshold',config.scan_rejected_ratio)
            supported = known > 0 and known >= minimum_known and values["rejected"] / known >= rejected_threshold
            approved = source in authorized
            assessment = "suspected_attack" if supported and not approved else "unresolved"
            title = "Approved probing activity" if approved else "Possible network scan" if supported else "Diverse probing; outcomes incomplete"
            reason = "Source is declared an authorized scanner by the operator." if approved else "Destination diversity and explicitly rejected outcomes meet the documented demonstration rule." if supported else "Too few observable outcomes are available to prefer a hostile explanation."
            hypotheses = (
                Hypothesis(id="reconnaissance", title="Possible reconnaissance", evidence_level="plausible" if supported and not approved else "insufficient",
                    explanation="One source attempted many destinations within a short interval. Intent and device ownership cannot be authenticated from packets.",
                    supporting_observation_ids=(obs.id,), supporting_reasons=(reason,),
                    challenging_reasons=("A legitimate administrator or inventory tool can produce the same pattern.",),
                    missing_evidence=("Authorization and purpose of the source device.",),
                    suggested_checks=("Identify the source owner and verify whether a scan was scheduled.",)),
                Hypothesis(id="administrative-probe", title="Administrative scan or service discovery", evidence_level="supported" if approved else "plausible",
                    explanation="Inventory and maintenance tools may intentionally probe closed services.",
                    supporting_observation_ids=(obs.id,), supporting_reasons=(reason,) if approved else (),
                    missing_evidence=() if approved else ("An approved scanner inventory or maintenance record.",),
                    suggested_checks=("Compare the device with the approved scanner inventory.",)),
            )
            next_steps = ("Verify the source device and its authorization; if the scan is unauthorized, follow your network's incident-response procedure.",)
        else:
            refused = obs.type == "TCP_CONNECTION_REFUSED"
            assessment = "likely_fault" if refused else "unresolved"
            title = obs.title
            explanation = "Matching reset replies show connection rejection by the endpoint or an intermediate filtering device." if refused else "The capture shows repeated or delayed attempts, but cannot establish the cause or complete capture visibility."
            hypotheses = (
                Hypothesis(id="service-or-path", title="Service or network configuration issue", evidence_level="supported" if refused else "plausible",
                    explanation=explanation, supporting_observation_ids=(obs.id,),
                    supporting_reasons=(obs.description,),
                    missing_evidence=("Service listener state, endpoint logs, and filtering policy.",),
                    suggested_checks=("Check the expected service listener and compare with another authorized client.",)),
                Hypothesis(id="filtering-or-visibility", title="Filtering, policy, or capture visibility", evidence_level="plausible",
                    explanation="An intentional access policy may reject traffic; absent responses may also be outside capture visibility.",
                    supporting_observation_ids=(obs.id,),
                    challenging_reasons=("These packets do not establish malicious intent.",),
                    missing_evidence=("Capture location/directions and network policy.",),
                    suggested_checks=("Verify where the capture was taken and review the applicable filtering rules.",)),
            )
            next_steps = ("Verify the intended destination and port. If the expected service is stopped, restore it using its normal service procedure; review intentional access policy before changing filtering.",) if refused else ("Confirm bidirectional capture visibility and compare the same service from another authorized client before changing network settings.",)
        incidents.append(Incident(
            id=stable_id("incident", obs.id), title=title, summary=obs.description,
            assessment=assessment, severity="info" if obs.type == "SCAN_PATTERN" and approved else "medium",
            observation_ids=(obs.id,), hypotheses=hypotheses,
            comparisons=comparisons.get(obs.id, ()), next_steps=next_steps,
            limitations=obs.caveats,
        ))
    grouped=group_incidents(tuple(incidents), observations, edges)
    return group_scan_incidents(grouped,observations,config.scan_window_seconds)


def analyze_capture(path: Path, context=None, source_name=None, sample_id=None, config=DEFAULT_CONFIG):
    context = context or NetworkContext()
    reader = CaptureReader(path, config)
    tcp = TCPTracker(config)
    arp, dns = ARPTracker(config), DNSTracker(config)
    for event in reader.events():
        tcp.consume(event)
        arp.consume(event)
        dns.consume(event)
        if tcp.limit_reached or arp.limit_reached or dns.limit_reached:
            reader.limit("tcp_attempt_state" if tcp.limit_reached else "arp_address_state" if arp.limit_reached else "dns_query_state")
            break
    observations, comparisons, evidence = [], {}, {}

    def add(kind, title, description, scope, start, end, entities, attempts, metrics, caveats, total=None):
        packets = representative(attempts)
        new_frames = {p.frame_number for p in packets} - set(evidence)
        if len(observations) >= min(config.max_observations, 200) or len(evidence) + len(new_frames) > config.max_evidence:
            reader.limit("report_evidence_budget")
            return None
        if not packets:
            return None
        obs = Observation(id=stable_id("obs", kind, scope, tuple(p.frame_number for p in packets)),
            type=kind, title=title, description=description, scope_id=scope,
            first_seen_seconds=max(0, start), last_seen_seconds=max(start, end, 0), entities=entities,
            evidence_frames=tuple(p.frame_number for p in packets),
            total_evidence_count=max(len(packets), total if total is not None else sum(a.packet_count for a in attempts)),
            metrics=metrics, caveats=caveats)
        observations.append(obs)
        evidence.update((p.frame_number, p) for p in packets)
        return obs

    grouped = defaultdict(list)
    for attempt in tcp.attempts:
        grouped[(attempt.scope, attempt.client, attempt.server, attempt.dport)].append(attempt)
    for (scope, client, server, port), attempts in sorted(grouped.items()):
        entities = (Entity(kind="client", value=client), Entity(kind="server", value=server), Entity(kind="service", value=f"{server}:{port}"))
        rejected = [a for a in attempts if a.outcome == "rejected"]
        missing = [a for a in attempts if a.outcome == "unanswered" and reader.end_time - a.start >= config.unanswered_after_seconds]
        retry = [a for a in attempts if a.syn_count >= 3]
        delayed = [a for a in attempts if a.response_time is not None and a.outcome in ("responsive", "completed") and a.response_time - a.start >= config.delay_threshold_seconds]
        cases = [
            ("TCP_CONNECTION_REFUSED", rejected, len(rejected) >= config.minimum_fault_attempts, f"{len(rejected)} connection attempts refused", "Matching RST-ACK replies explicitly rejected these connection attempts."),
            ("TCP_UNANSWERED", missing, len(missing) >= config.minimum_fault_attempts and reader.timing_reliable, f"{len(missing)} attempts without observed responses", "No matching response was observed despite at least three seconds of subsequent capture time; this is not proof of packet loss or an attack."),
            ("TCP_SYN_RETRY", retry, bool(retry), "Repeated SYN packets", "The same connection identity and initial sequence appeared repeatedly; these are possible SYN retransmissions or duplicate capture records."),
            ("TCP_HANDSHAKE_DELAY", delayed, len(delayed) >= config.minimum_fault_attempts and reader.timing_reliable, "Slow observed TCP responses", f"At least {config.minimum_fault_attempts} SYN responses exceeded the configurable {config.delay_threshold_seconds:g}-second demonstration threshold."),
        ]
        for kind, selected, enabled, title, description in cases:
            if not enabled:
                continue
            obs = add(kind, title, description, scope, min(a.start for a in selected), max(a.last for a in selected), entities, selected,
                (metric("attempts", "Distinct affected attempts", len(selected)), metric("destination_ports", "Distinct destination ports", 1), metric("syn_packets", "SYN packets observed", sum(a.syn_count for a in selected))),
                ("Packets establish observed behavior; endpoint policy and malicious intent require additional context.", "The capture may omit traffic from other directions or intervals."))
            if obs:
                successes = [a for a in attempts if a.outcome == "completed" and a.start <= obs.first_seen_seconds and obs.first_seen_seconds - a.start <= 30]
                comparison_packets = representative(successes[:2], maximum=6)
                if comparison_packets and len(set(evidence) | {p.frame_number for p in comparison_packets}) <= config.max_evidence:
                    evidence.update((p.frame_number, p) for p in comparison_packets)
                    comparisons[obs.id] = (Comparison(id=stable_id("comparison", obs.id), title="Same client and service before the finding", status="available",
                        basis=f"Same client {client}, destination {server}:{port}; completed handshakes in the preceding 30 seconds.", baseline_label="Earlier completed exchanges", current_label="Affected attempts",
                        baseline_metrics=(metric("completed", "Completed handshakes", len(successes)),), current_metrics=(metric("affected", "Affected attempts", len(selected)),),
                        evidence_frames=tuple(p.frame_number for p in comparison_packets), limitations=("A small number of successful exchanges is not a network-wide health baseline.",)),)
                else:
                    comparisons[obs.id] = (Comparison(id=stable_id("comparison", obs.id), title="Comparable successful exchanges", status="unavailable", basis="No retained completed handshake from the same client/service in the preceding 30 seconds.", baseline_label="No suitable comparator", current_label="Affected attempts"),)

    if reader.timing_reliable:
        for window in scan_windows(tcp.attempts, config):
            known = window.rejected + window.responsive
            description = f"{window.attempts} distinct attempts contacted {window.diversity} destination {window.kind} in {window.end - window.start:.3f} seconds; {window.rejected} explicitly rejected, {window.responsive} responsive, {window.attempts - known} without a known outcome."
            add("SCAN_PATTERN", "Diverse connection probing", description, window.scope, window.start, window.end,
                (Entity(kind="client", value=window.client), Entity(kind="server" if window.kind == "ports" else "service", value=window.target)), window.examples,
                (metric("attempts", "Distinct attempts", window.attempts), metric("diversity", f"Distinct destination {window.kind}", window.diversity), metric("rejected", "Explicitly rejected", window.rejected), metric("responsive", "Responsive services", window.responsive), metric("unknown", "Outcome unknown", window.attempts - known), metric("window_seconds", "Configured window", config.scan_window_seconds, "seconds"), metric("diversity_threshold", "Diversity threshold", config.scan_min_diversity), metric('known_outcome_threshold','Minimum known outcomes',config.scan_min_known_outcomes), metric("rejected_threshold", "Rejected-outcome threshold", config.scan_rejected_ratio)),
                ("Thresholds are configurable demonstration heuristics, not a calibrated attack probability.", "Scanning intent and source ownership cannot be authenticated from packets."), total=window.total_evidence)
    comparisons.update(append_protocol_findings(arp, dns, reader, add, evidence, config))
    edges = correlate(observations, tuple(evidence.values()), config.correlation_window_seconds, reader.timing_reliable)
    pending = sum(a.outcome == "unanswered" and reader.end_time - a.start < config.unanswered_after_seconds for a in tcp.attempts)
    if pending:
        reader.note(f"{pending} pending TCP attempt(s) near the capture boundary were treated as incomplete, not failed.")
    if tcp.attempts and not any(a.outcome in ("completed", "responsive", "rejected") for a in tcp.attempts):
        reader.note("No matched TCP responses were observed; capture visibility may be one-sided.")
    if reader.seen == 0:
        reader.note("No packet records were available for diagnosis.")
    coverage = CaptureCoverage(status="partial" if reader.partial else "limited" if reader.limits or reader.skipped or reader.coverage_limited or not reader.timing_reliable else "complete",
        format=reader.format, packets_seen=reader.seen, packets_decoded=reader.decoded, packets_skipped=reader.skipped,
        duration_seconds=reader.end_time, protocols=tuple(sorted(reader.protocols)), link_types=tuple(sorted(reader.linktypes)),
        limits_reached=tuple(reader.limits), visibility_notes=tuple(reader.notes),
        unsupported_checks=("No data-stream reconstruction, general data retransmission analysis, fragment reassembly, encrypted traffic, DHCP, DNS manipulation, or MTU diagnosis.",
                            "DNS diagnostics cover complete standard single-question IPv4 UDP exchanges on port 53; TCP DNS and truncated-response fallback are outside coverage.",
                            "Cross-layer grouping uses retained ARP identity changes and client frames addressed to the claimant MAC; chronology is not proof of causation."))
    return AnalysisReport(analysis_id=str(uuid4()), data_origin="capture", source_name=(source_name or Path(path).name)[:256], sample_id=sample_id,
        coverage=coverage, context=context, observations=tuple(observations), edges=edges,
        incidents=diagnose(observations, comparisons, context, config, edges), evidence=tuple(evidence[k] for k in sorted(evidence)),
        warnings=("Analysis covers the supported checks and observed interval; absence of findings does not certify network safety.",))


def reinterpret_report(report, context):
    comparisons = {obs_id: tuple(c for c in incident.comparisons if c.id in (stable_id('comparison', obs_id), 'comparison-'+obs_id[4:]))
                   for incident in report.incidents for obs_id in incident.observation_ids}
    incidents = diagnose(report.observations, comparisons, context, edges=report.edges)
    previous = {i.id: i for i in report.incidents}
    changes = []
    for incident in incidents:
        old = previous[incident.id]
        if old.assessment != incident.assessment or old.hypotheses != incident.hypotheses:
            arp_incident = any(o.type == 'ARP_IDENTITY_CHANGE' and o.id in incident.observation_ids for o in report.observations)
            service_problems = [o.title for o in report.observations if o.id in incident.observation_ids and (o.type.startswith('TCP_') or o.type.startswith('DNS_'))]
            changes.append(InterpretationChange(incident_id=incident.id, previous_assessment=old.assessment, current_assessment=incident.assessment,
                reason_changed=('The explicit gateway identity/approved MAC policy changed the unauthorized-claimant explanation. Approval is an operator assertion and does not prove the cause of failures.' if arp_incident else
                    "The user-declared scanner authorization changed the explanation. Packet evidence and device identity are not independently authenticated."),
                evidence_retained="Original observations, measurements, coverage, edges and frame evidence are retained.",
                remaining_problem=('Observed service problems remain: '+ '; '.join(service_problems[:4])+'. Verify service/resolver and failover logs; the cause remains unverified.' if service_problems else
                    'Verify device ownership and transition history; policy approval does not establish that the network is safe.' if arp_incident else
                    "Review any continuing service failures separately; an approved scanner does not establish that the network is safe.")))
    # Frozen nested models and tuples are reused, never mutated by interpretation.
    return report.model_copy(update={"context": context, "incidents": incidents, "interpretation_changes": tuple(changes)})
