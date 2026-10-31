"""Convert ARP/DNS tracker state into context-independent packet observations."""
from collections import defaultdict

from backend.core.models import Comparison, Entity, Metric


def metric(key, label, value):
    return Metric(key=key, label=label, value=value)


def append_protocol_findings(arp, dns, reader, add, evidence, config):
    comparisons = {}
    for (scope, address), history in sorted(arp.histories.items()):
        if len(history.claims) < 2 or not history.transitions:
            continue
        change = history.transitions[0][2]
        entities = (Entity(kind='server', value=address),) + tuple(Entity(kind='mac', value=mac) for mac in sorted(history.claims))
        add('ARP_IDENTITY_CHANGE', 'Address identity changed',
            f'{len(history.claims)} different sender MAC addresses claimed IPv4 address {address}. This does not establish simultaneous ownership or malicious intent.',
            scope, change.time_offset_seconds, history.last, entities, [history],
            (metric('mac_count', 'Observed sender MAC addresses', len(history.claims)), metric('change_frame', 'First identity-change frame', change.frame_number),
             metric('claims_observed', 'ARP claims observed', history.packet_count)),
            ('Legitimate failover, hardware replacement, duplicate address configuration, and impersonation can produce changed claims.',
             'Gateway identity and device authorization require explicit operator context; sender MAC addresses are not authenticated.'))

    groups = defaultdict(list)
    for query in dns.queries:
        groups[(query.scope, query.client, query.resolver)].append(query)
    for (scope, client, resolver), queries in sorted(groups.items()):
        failed = [q for q in queries if q.rcode in (2, 5)]
        unanswered = [q for q in queries if not q.ambiguous and q.response_time is None and reader.end_time - q.start >= config.dns_timeout_seconds]
        delayed = [q for q in queries if q.response_time is not None and q.response_time - q.start >= config.delay_threshold_seconds]
        cases = (
            ('DNS_RESPONSE_ERROR', failed, len(failed) >= config.minimum_fault_attempts,
             f'{len(failed)} DNS requests returned resolver errors', 'Matched DNS responses explicitly returned SERVFAIL or REFUSED; resolver failure and policy rejection are distinct from an attack verdict.'),
            ('DNS_UNANSWERED', unanswered, len(unanswered) >= config.minimum_fault_attempts and reader.timing_reliable,
             f'{len(unanswered)} DNS requests without observed responses', f'No matching response was observed with at least {config.dns_timeout_seconds:g} seconds of subsequent capture time. Missing visibility remains an alternative.'),
            ('DNS_DELAY', delayed, len(delayed) >= config.minimum_fault_attempts and reader.timing_reliable,
             'Slow observed DNS responses', f'At least {config.minimum_fault_attempts} matched responses exceeded the configurable {config.delay_threshold_seconds:g}-second demonstration threshold.'),
        )
        for kind, selected, enabled, title, description in cases:
            if not enabled:
                continue
            obs = add(kind, title, description, scope, min(q.start for q in selected), max(q.last for q in selected),
                (Entity(kind='client', value=client), Entity(kind='resolver', value=resolver)), selected,
                (metric('queries', 'Distinct affected requests', len(selected)), metric('servfail', 'SERVFAIL responses', sum(q.rcode == 2 for q in selected)),
                 metric('refused', 'REFUSED responses', sum(q.rcode == 5 for q in selected))),
                ('DNS responses identify observed resolver behavior, not the ultimate cause or intent.',
                 'Question names are represented by fingerprints; encrypted DNS and DNS over TCP are outside these checks.',
                 'Response latency is measured from the first observed request; retries do not establish server processing time.'))
            if obs is None:
                continue
            fingerprints = {q.question_hash for q in selected}
            successes = [q for q in queries if q.rcode == 0 and q.question_hash in fingerprints and q.start < obs.first_seen_seconds and obs.first_seen_seconds - q.start <= 30]
            packets = {p.frame_number: p for q in successes[:2] for p in q.evidence}
            available = bool(packets) and len(set(evidence) | set(packets)) <= config.max_evidence
            if available:
                evidence.update(packets)
            comparisons[obs.id] = (Comparison(id='comparison-'+obs.id[4:], title='Same client, resolver, and question before the finding',
                status='available' if available else 'unavailable', basis='Matched question fingerprints from the same client/resolver in the preceding 30 seconds; no inferred network-wide baseline.',
                baseline_label='Earlier successful DNS responses' if available else 'No suitable comparator', current_label='Affected requests',
                baseline_metrics=(metric('successful', 'Successful responses', len(successes)),) if available else (),
                current_metrics=(metric('affected', 'Affected requests', len(selected)),), evidence_frames=tuple(sorted(packets)) if available else (),
                limitations=('An earlier answer is not proof that the resolver or the whole network was healthy.',)),)
    nxdomain = sum(q.rcode == 3 for q in dns.queries)
    if nxdomain:
        reader.note(f'{nxdomain} matched NXDOMAIN response(s) were counted as negative DNS answers, not attack evidence.')
    pending = sum(q.response_time is None and reader.end_time - q.start < config.dns_timeout_seconds for q in dns.queries)
    if pending:
        reader.note(f'{pending} DNS request(s) at the capture boundary were treated as incomplete, not failed.')
    if dns.unmatched_responses:
        reader.note(f'{dns.unmatched_responses} DNS response(s) lacked a full matching request and were excluded from error/latency diagnosis.')
    if dns.ambiguous_reuses:
        reader.coverage_limited = True
        reader.note(f'{dns.ambiguous_reuses} recently completed DNS transaction key(s) were reused within the retry window; ambiguous later replies were excluded from error/latency diagnosis.')
    return comparisons
