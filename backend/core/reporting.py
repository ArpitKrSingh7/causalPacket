"""Human-readable, metadata-only reports from the same immutable API facts."""
import re
import unicodedata


def plain(value):
    text=' '.join(str(value).split())
    return ''.join(c for c in text if not unicodedata.category(c).startswith('C'))


def markdown(value):
    return re.sub(r'([\\`*_{}\[\]()#+.!|<>])', r'\\\1', plain(value))


def frame_list(frames):
    return ', '.join('#'+str(frame) for frame in frames)


def endpoint(packet, source=True):
    address=packet.source_ip if source else packet.destination_ip
    port=packet.source_port if source else packet.destination_port
    mac=packet.source_mac if source else packet.destination_mac
    if address is not None:
        return str(address)+(':'+str(port) if port is not None else '')+(' ['+mac+']' if mac else '')
    return mac or 'unknown'


def render_markdown(report):
    e=markdown
    coverage=report.coverage
    origin='Analyzed capture' if report.data_origin=='capture' else 'FICTIONAL DEVELOPMENT FIXTURE'
    lines=['# CausalPacket investigation','',f'**Source:** {e(report.source_name)}',
           f'**Origin:** {origin}',f'**Analysis ID:** {e(report.analysis_id)}',
           f'**Coverage:** {coverage.status}; {coverage.packets_seen} examined, {coverage.packets_decoded} decoded, {coverage.packets_skipped} skipped; {coverage.duration_seconds:.3f} seconds.',
           '', 'This report contains retained header metadata and operator-declared context. It does not establish authenticated device ownership or certify network safety.',
           '', '## Declared context','',f'- Gateway IP: {e(report.context.gateway_ip or "not supplied")}',
           f'- Approved gateway MACs: {e(", ".join(report.context.approved_gateway_macs) or "none supplied")}',
           f'- Authorized scanner IPs: {e(", ".join(map(str,report.context.authorized_scanner_ips)) or "none supplied")}',
           '', '## Findings','']
    by_id={o.id:o for o in report.observations}
    if not report.incidents:
        lines += ['No significant findings in the supported checks. Read the coverage limitations below.','']
    for number,incident in enumerate(report.incidents,1):
        lines += [f'### {number}. {e(incident.title)}','',f'**Assessment:** {incident.assessment} | **Severity:** {incident.severity}',
                  '', e(incident.summary),'','**Observed facts**','']
        for oid in sorted(incident.observation_ids,key=lambda oid:(by_id[oid].first_seen_seconds,oid)):
            obs=by_id[oid]
            lines += [f'- **{e(obs.title)}** ({obs.first_seen_seconds:.3f}–{obs.last_seen_seconds:.3f}s): {e(obs.description)}',
                      f'  - Retained frames: {frame_list(obs.evidence_frames)}; {obs.total_evidence_count} supporting packet observations counted.']
            for m in obs.metrics:
                lines.append(f'  - {e(m.label)}: {e(m.value)}'+(' '+e(m.unit) if m.unit else ''))
            for caveat in obs.caveats:
                lines.append('  - Limitation: '+e(caveat))
        relevant=[edge for edge in report.edges if edge.source_observation_id in incident.observation_ids and edge.target_observation_id in incident.observation_ids]
        if relevant:
            lines += ['', '**Why these findings were linked**','']
            for edge in sorted(relevant,key=lambda edge:(by_id[edge.target_observation_id].first_seen_seconds,edge.id)):
                lines += [f'- {e(by_id[edge.source_observation_id].title)} → {e(by_id[edge.target_observation_id].title)}: {e(edge.reason)}',
                          f'  - Frames: {frame_list(edge.evidence_frames)}. Rule: {e(edge.rule_id)}.']
        lines += ['', '**Competing explanations**','']
        for hypothesis in incident.hypotheses:
            lines += [f'- **{e(hypothesis.title)}** — {hypothesis.evidence_level}: {e(hypothesis.explanation)}']
            for label,values in [('Support',hypothesis.supporting_reasons),('Challenge',hypothesis.challenging_reasons),('Missing evidence',hypothesis.missing_evidence),('Check',hypothesis.suggested_checks)]:
                for value in values:
                    lines.append(f'  - {label}: {e(value)}')
        if incident.comparisons:
            lines += ['', '**Observed comparisons**','']
            for comparison in incident.comparisons:
                lines += [f'- {e(comparison.title)}: {comparison.status}. {e(comparison.basis)}']
                for label,metrics in [(comparison.baseline_label,comparison.baseline_metrics),(comparison.current_label,comparison.current_metrics)]:
                    if metrics:
                        lines.append('  - '+e(label)+': '+ '; '.join(e(m.label)+' = '+e(m.value) for m in metrics))
                if comparison.evidence_frames:
                    lines.append('  - Comparison frames: '+frame_list(comparison.evidence_frames))
                for limit in comparison.limitations:
                    lines.append('  - Limitation: '+e(limit))
        lines += ['', '**What to check next**','']+[f'- {e(step)}' for step in incident.next_steps]
        lines += ['', '**Incident limitations**','']+[f'- {e(limit)}' for limit in incident.limitations]+['']
    if report.interpretation_changes:
        lines += ['## Last context update','']
        for change in report.interpretation_changes:
            lines += [f'- {e(change.incident_id)}: {change.previous_assessment} → {change.current_assessment}',
                      '  - Reason changed: '+e(change.reason_changed),'  - Evidence retained: '+e(change.evidence_retained),
                      '  - Remaining problem: '+e(change.remaining_problem)]
        lines.append('')
    lines += ['## Capture coverage and limitations','',
              f'- Recognized protocols: {e(", ".join(coverage.protocols) or "none")}',
              f'- Link types: {e(", ".join(coverage.link_types) or "none")}',
              f'- Limits reached: {e(", ".join(coverage.limits_reached) or "none")}',
              *['- '+e(value) for value in (*coverage.visibility_notes,*coverage.unsupported_checks,*report.warnings)],
              '', '## Retained packet evidence','',
              '| Frame | Offset (s) | Capture scope | Protocol | Source / MAC | Destination / MAC | Header summary |',
              '| --- | --- | --- | --- | --- | --- | --- |']
    for packet in report.evidence:
        headers='; '.join(h.name+': '+h.value for h in packet.headers)
        lines.append(f'| #{packet.frame_number} | {packet.time_offset_seconds:.6f} | {e(packet.scope_id)} | {packet.protocol} | {e(endpoint(packet))} | {e(endpoint(packet,False))} | {e(packet.summary)}'+('; '+e(headers) if headers else '')+' |')
    if not report.evidence:
        lines += ['','No supporting packet metadata was retained for findings.']
    return '\n'.join(lines)+'\n'


def render_text(report):
    """Readable CLI report with next steps and evidence, without Markdown syntax."""
    coverage=report.coverage
    lines=[f'{plain(report.source_name)}: {coverage.packets_seen} packets, {coverage.duration_seconds:.3f}s, coverage {coverage.status}']
    if report.data_origin!='capture':
        lines.append('FICTIONAL DEVELOPMENT FIXTURE: no capture analysis is established by this example.')
    observations={o.id:o for o in report.observations}
    if not report.incidents:
        lines.append('No significant findings in the supported checks.')
    for incident in report.incidents:
        lines += ['',f'[{incident.assessment}] {plain(incident.title)}',plain(incident.summary)]
        for oid in sorted(incident.observation_ids,key=lambda oid:(observations[oid].first_seen_seconds,oid)):
            obs=observations[oid]
            lines += ['Observed: '+plain(obs.description),'  Frames: '+frame_list(obs.evidence_frames)]
            lines += ['  '+plain(m.label)+': '+plain(m.value)+(' '+plain(m.unit) if m.unit else '') for m in obs.metrics]
        for hypothesis in incident.hypotheses:
            lines += [f'Explanation ({hypothesis.evidence_level}): {plain(hypothesis.title)} — {plain(hypothesis.explanation)}']
            lines += ['  Support: '+plain(item) for item in hypothesis.supporting_reasons]
            lines += ['  Challenge: '+plain(item) for item in hypothesis.challenging_reasons]
            lines += ['  Missing: '+plain(item) for item in hypothesis.missing_evidence]
        lines += ['Next check: '+plain(step) for step in incident.next_steps]
        lines += ['Limitation: '+plain(item) for item in incident.limitations]
    for change in report.interpretation_changes:
        lines += ['',f'Context update: {change.previous_assessment} -> {change.current_assessment}',
                  'Reason changed: '+plain(change.reason_changed),'Evidence retained: '+plain(change.evidence_retained),
                  'Remaining problem: '+plain(change.remaining_problem)]
    lines += ['',*['Coverage: '+plain(item) for item in (*coverage.visibility_notes,*coverage.unsupported_checks)],
              *['Warning: '+plain(item) for item in report.warnings]]
    return '\n'.join(lines)+'\n'
