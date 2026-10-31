"""Behavioral controls over real synthetic packet bytes, not mocked alerts."""
from dataclasses import replace
from pathlib import Path

import pytest

from backend.core.analyzer import analyze_capture, reinterpret_report
from backend.core.config import DEFAULT_CONFIG
from backend.core.models import NetworkContext
from backend.core.offline_scapy import Ether, IP, TCP
from scripts.generate_samples import exchange, generate, write_pcap


def types(report):
    return {o.type for o in report.observations}


def test_healthy_diverse_successes_not_scan(captures):
    report = analyze_capture(captures / '01_healthy.pcap')
    assert not report.incidents
    assert report.coverage.packets_seen == report.coverage.packets_decoded == 60
    assert report.coverage.status == 'complete'


def test_service_fault_has_matching_reset_evidence_and_comparator(captures):
    report = analyze_capture(captures / '02_service_failure.pcap')
    assert types(report) == {'TCP_CONNECTION_REFUSED'}
    assert report.incidents[0].assessment == 'likely_fault'
    assert report.incidents[0].comparisons[0].status == 'available'
    assert any(h.value == 'RA' for p in report.evidence for h in p.headers if h.name == 'TCP flags')
    assert next(m.value for m in report.observations[0].metrics if m.key == 'attempts') == 12


def test_scan_exact_counts_and_no_per_port_fault_flood(captures):
    report = analyze_capture(captures / '03_possible_scan.pcap')
    assert types(report) == {'SCAN_PATTERN'}
    assert len(report.incidents) == 1 and report.incidents[0].assessment == 'suspected_attack'
    values = {m.key: m.value for m in report.observations[0].metrics}
    assert values['attempts'] == values['diversity'] == values['rejected'] == 20
    assert values['responsive'] == values['unknown'] == 0


def test_independent_fault_and_scan_both_survive(captures):
    report = analyze_capture(captures / '05_mixed_scan_and_fault.pcap')
    assert types(report) == {'TCP_CONNECTION_REFUSED', 'SCAN_PATTERN'}
    assert {i.assessment for i in report.incidents} == {'likely_fault', 'suspected_attack'}
    assert len(report.incidents) == 2


def test_scanner_context_preserves_all_facts_and_fault(captures):
    report = analyze_capture(captures / '05_mixed_scan_and_fault.pcap')
    scanner = next(e.value for o in report.observations if o.type == 'SCAN_PATTERN' for e in o.entities if e.kind == 'client')
    updated = reinterpret_report(report, NetworkContext(authorized_scanner_ips=(scanner,)))
    for name in ('observations', 'evidence', 'edges', 'coverage', 'analysis_id'):
        assert getattr(updated, name) == getattr(report, name)
    assert len(updated.interpretation_changes) == 1
    assert any(i.assessment == 'likely_fault' for i in updated.incidents)
    assert any(i.title == 'Approved probing activity' for i in updated.incidents)
    assert {i.assessment for i in reinterpret_report(updated, NetworkContext()).incidents} == {'likely_fault', 'suspected_attack'}


@pytest.mark.parametrize('seed', [7, 111, 902])
def test_diagnosis_independent_of_demo_addresses_and_filenames(tmp_path, seed):
    generate(tmp_path, seed=seed)
    path = tmp_path / '05_mixed_scan_and_fault.pcap'
    renamed = tmp_path / 'innocent-name.data'
    renamed.write_bytes(path.read_bytes())
    report = analyze_capture(renamed)
    assert types(report) == {'TCP_CONNECTION_REFUSED', 'SCAN_PATTERN'}
    assert len(report.incidents) == 2


def test_unmatched_reset_not_connection_refusal(tmp_path):
    rows = []
    for i in range(3):
        pair = exchange(i * .1, sport=40000+i, rejected=True)
        reset = Ether(pair[1][1]); reset[TCP].ack = 999999
        del reset[IP].chksum; del reset[TCP].chksum
        rows += [pair[0], (pair[1][0], bytes(reset))]
    path = tmp_path / 'wrong-ack.pcap'; write_pcap(path, rows)
    report = analyze_capture(path)
    assert 'TCP_CONNECTION_REFUSED' not in types(report)
    assert not report.incidents  # capture-tail pending attempts are not failures
    assert any('incomplete' in note for note in report.coverage.visibility_notes)


def test_syn_retries_deduplicated_and_reset_frame_retained(tmp_path):
    pair = exchange(0, rejected=True, delay=2)
    rows = [(i * .1, pair[0][1]) for i in range(10)] + [pair[1]]
    path = tmp_path / 'retry.pcap'; write_pcap(path, rows)
    report = analyze_capture(path)
    assert types(report) == {'TCP_SYN_RETRY'}
    assert next(m.value for m in report.observations[0].metrics if m.key == 'attempts') == 1
    assert any(p.frame_number == 11 for p in report.evidence)
    assert all(i.assessment != 'suspected_attack' for i in report.incidents)


def test_responsive_services_without_final_ack_are_not_failures(tmp_path):
    rows = []
    for i in range(20):
        rows += exchange(i*.1, sport=40000+i, dport=8000+i)[:2]
    path = tmp_path / 'half-open.pcap'; write_pcap(path, rows)
    assert not analyze_capture(path).incidents


def test_scan_window_expires_for_slow_separate_connections(tmp_path):
    rows = []
    for i in range(20):
        rows += exchange(i*2, sport=40000+i, dport=8000+i, rejected=True)
    path = tmp_path / 'slow.pcap'; write_pcap(path, rows)
    assert 'SCAN_PATTERN' not in types(analyze_capture(path))


def test_horizontal_host_diversity_detected(tmp_path):
    rows = []
    for i in range(15):
        rows += exchange(i*.1, server=f'198.51.100.{i+1}', sport=40000+i, dport=443, rejected=True)
    path = tmp_path / 'horizontal.pcap'; write_pcap(path, rows)
    report = analyze_capture(path)
    assert types(report) == {'SCAN_PATTERN'}
    assert next(m.value for m in report.observations[0].metrics if m.key == 'diversity') == 15


def test_payload_credentials_never_reach_report(tmp_path):
    rows = []
    for i in range(3):
        pair = exchange(i*.1, sport=40000+i, rejected=True)
        reset = Ether(pair[1][1]) / b'Authorization: Bearer SYNTHETIC_SECRET Cookie: SESSION_SECRET'
        del reset[IP].len; del reset[IP].chksum; del reset[TCP].chksum
        rows.extend([pair[0], (pair[1][0], bytes(reset))])
    path = tmp_path / 'secret.pcap'; write_pcap(path, rows)
    report = analyze_capture(path)
    assert types(report) == {'TCP_CONNECTION_REFUSED'}
    assert 'SYNTHETIC_SECRET' not in report.model_dump_json()
    assert 'SESSION_SECRET' not in report.model_dump_json()


def test_packet_and_state_limits_explicit(captures):
    report = analyze_capture(captures / '01_healthy.pcap', config=replace(DEFAULT_CONFIG, max_packets=5))
    assert report.coverage.status == 'limited' and report.coverage.packets_seen == 5
    assert 'packet_count' in report.coverage.limits_reached
    report = analyze_capture(captures / '03_possible_scan.pcap', config=replace(DEFAULT_CONFIG, max_attempts=2))
    assert 'tcp_attempt_state' in report.coverage.limits_reached


def test_report_budget_does_not_leave_dangling_references(captures):
    report = analyze_capture(captures / '05_mixed_scan_and_fault.pcap', config=replace(DEFAULT_CONFIG, max_evidence=8))
    assert len(report.evidence) <= 8
    assert 'report_evidence_budget' in report.coverage.limits_reached
    assert not report.incidents
