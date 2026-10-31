"""Group source-local probe patterns without deleting packet observations."""
from collections import defaultdict
from hashlib import sha256

from backend.core.models import Incident


def group_scan_incidents(incidents, observations, window_seconds):
    by_id={o.id:o for o in observations}
    patterns=defaultdict(list)
    result=[]
    for incident in incidents:
        if len(incident.observation_ids)!=1 or by_id[incident.observation_ids[0]].type!='SCAN_PATTERN':
            result.append(incident)
            continue
        obs=by_id[incident.observation_ids[0]]
        source=next(e.value for e in obs.entities if e.kind=='client')
        patterns[(obs.scope_id,source)].append(incident)

    def append_cluster(members,source):
        if len(members)==1:
            result.append(members[0])
            return
        ids=tuple(sorted((i.observation_ids[0] for i in members),key=lambda oid:(by_id[oid].first_seen_seconds,oid)))
        lead=next((i for i in members if i.assessment=='suspected_attack'),members[0])
        hypotheses=tuple(h.model_copy(update={'supporting_observation_ids':ids if h.supporting_observation_ids else (),
            'challenging_observation_ids':ids if h.challenging_observation_ids else ()}) for h in lead.hypotheses)
        first=min(by_id[oid].first_seen_seconds for oid in ids)
        last=max(by_id[oid].last_seen_seconds for oid in ids)
        approved=all(i.severity=='info' for i in members)
        title='Approved probing activity' if approved else 'Possible scanning activity' if lead.assessment=='suspected_attack' else 'Diverse probing; outcomes incomplete'
        digest=sha256(repr(tuple(sorted(ids))).encode()).hexdigest()[:16]
        result.append(Incident(id='incident-'+digest,title=title+f' across {len(ids)} patterns',
            summary=f'Source {source} produced {len(ids)} destination-diversity findings within {last-first:.3f} seconds in the same capture scope. These findings share one investigation; all original observations and frame references remain available.',
            assessment=lead.assessment,severity='info' if approved else 'medium',observation_ids=ids,hypotheses=hypotheses,
            comparisons=tuple(c for i in members for c in i.comparisons)[:8],
            next_steps=tuple(dict.fromkeys(s for i in members for s in i.next_steps))[:16],
            limitations=tuple(dict.fromkeys(('Pattern windows can overlap: do not sum their attempt counts as distinct connections.',
                *(c for i in members for c in i.limitations))))[:16]))

    for (_,source),members in sorted(patterns.items()):
        cluster=[]
        start=end=window_limit=None
        for member in sorted(members,key=lambda i:(by_id[i.observation_ids[0]].first_seen_seconds,i.id)):
            obs=by_id[member.observation_ids[0]]
            configured=next((m.value for m in obs.metrics if m.key=='window_seconds'),window_seconds)
            allowed=min(window_limit,configured) if window_limit is not None else configured
            new_end=max(end if end is not None else obs.last_seen_seconds,obs.last_seen_seconds)
            if cluster and (len(cluster)>=128 or new_end-start>allowed+1e-9):
                append_cluster(cluster,source)
                cluster=[]; start=end=window_limit=None
            if not cluster:
                start=obs.first_seen_seconds
            end=max(end if end is not None else obs.last_seen_seconds,obs.last_seen_seconds)
            window_limit=min(window_limit,configured) if window_limit is not None else configured
            cluster.append(member)
        if cluster:
            append_cluster(cluster,source)
    return tuple(result)
