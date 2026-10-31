"""Conservative packet-backed association; chronology does not prove causation."""
from hashlib import sha256

from backend.core.models import EvidenceEdge, Incident


def correlate(observations, evidence, window_seconds=5, timing_reliable=True):
    if not timing_reliable:
        return ()
    packets = {p.frame_number: p for p in evidence}
    edges = []
    for identity in observations:
        if identity.type != 'ARP_IDENTITY_CHANGE':
            continue
        change_frame = next(m.value for m in identity.metrics if m.key == 'change_frame')
        change = packets[change_frame]
        mac = next((h.value for h in change.headers if h.name == 'Sender MAC'), None)
        for symptom in observations:
            if not (symptom.type.startswith('DNS_') or symptom.type.startswith('TCP_')) or symptom.scope_id != identity.scope_id:
                continue
            if not 0 <= symptom.first_seen_seconds - change.time_offset_seconds <= window_seconds:
                continue
            clients = {e.value for e in symptom.entities if e.kind == 'client'}
            link = next((packets[f] for f in symptom.evidence_frames if str(packets[f].source_ip) in clients and
                         packets[f].destination_mac == mac and 0 <= packets[f].time_offset_seconds-change.time_offset_seconds <= window_seconds), None)
            if link is None:
                continue
            # Include both ARP claimants and the actual client-to-MAC frame.
            frames = tuple(dict.fromkeys((*identity.evidence_frames[:2], change_frame, link.frame_number)))
            digest = sha256((identity.id+symptom.id).encode()).hexdigest()[:16]
            edges.append(EvidenceEdge(id='edge-'+digest, source_observation_id=identity.id, target_observation_id=symptom.id,
                relation='precedes_on_shared_client', rule_id='arp-client-next-hop-v1',
                reason='The changed ARP sender claim precedes a client symptom whose own frames address the new MAC in the same capture scope. This supports association, not proof of causation.',
                evidence_frames=frames))
    return tuple(edges[:2000])


def group_incidents(incidents, observations, edges):
    """Only direct, unambiguous ARP associations group; independent facts survive."""
    incoming = {}
    for edge in edges:
        incoming.setdefault(edge.target_observation_id, set()).add(edge.source_observation_id)
    by_obs = {i.observation_ids[0]: i for i in incidents}
    groups = {}
    for target, roots in incoming.items():
        if len(roots) == 1:
            root = next(iter(roots))
            groups.setdefault(root, []).append(target)
    consumed, result = set(), []
    for root, children in sorted(groups.items()):
        members = [by_obs[root]] + [by_obs[c] for c in sorted(children)[:31]]
        original = members[0]
        obs_ids = tuple(i.observation_ids[0] for i in members)
        child_hypotheses = []
        for member in members[1:]:
            for hypothesis in member.hypotheses[:1]:
                child_hypotheses.append(hypothesis.model_copy(update={'id': hypothesis.id+'-'+member.observation_ids[0][4:]}))
        hypotheses = tuple((*original.hypotheses, *child_hypotheses)[:8])
        comparisons = tuple(c for i in members for c in i.comparisons)[:8]
        next_steps = tuple(dict.fromkeys(step for i in members for step in i.next_steps))[:16]
        limitations = tuple(dict.fromkeys((*original.limitations, 'Temporal association does not prove that the identity change caused the failures.', *(v for i in members[1:] for v in i.limitations))))[:16]
        result.append(Incident(id=original.id, title=original.title+' with service symptoms',
            summary=f'An address identity change is associated with {len(members)-1} service finding(s). Client frames address the new claimant MAC; the underlying cause remains unverified.',
            assessment=original.assessment, severity='medium', observation_ids=obs_ids,
            hypotheses=hypotheses, comparisons=comparisons, next_steps=next_steps, limitations=limitations))
        consumed.update(obs_ids)
    result.extend(i for i in incidents if not set(i.observation_ids) & consumed)
    return tuple(result)
