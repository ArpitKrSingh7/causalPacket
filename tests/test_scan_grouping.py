from dataclasses import replace

from backend.core.analyzer import analyze_capture,reinterpret_report
from backend.core.config import DEFAULT_CONFIG
from backend.core.models import NetworkContext
from scripts.generate_samples import exchange,write_pcap


def scan_rows(start=0,client='192.0.2.115',hosts=16,ports=16):
    rows=[]
    for host in range(hosts):
        for port in range(ports):
            number=host*ports+port
            rows+=exchange(start+number*.01,client=client,server=f'198.51.100.{100+host}',sport=20000+number,
                dport=1000+port,sequence=10000+number*100,rejected=True,delay=.001)
    return rows


def test_cross_product_scan_groups_patterns_without_dropping_facts(tmp_path):
    path=tmp_path/'scan.pcap';write_pcap(path,scan_rows())
    report=analyze_capture(path)
    assert len(report.observations)==32
    assert len(report.incidents)==1 and report.incidents[0].assessment=='suspected_attack'
    assert set(report.incidents[0].observation_ids)=={o.id for o in report.observations}
    assert len(report.evidence)==512
    assert any('do not sum' in s for s in report.incidents[0].limitations)


def test_custom_rule_thresholds_survive_context_reinterpretation(tmp_path):
    config=replace(DEFAULT_CONFIG,scan_min_diversity=4,scan_min_known_outcomes=3,scan_rejected_ratio=.5)
    rows=[]
    for i in range(4):
        attempt=exchange(i*.1,sport=40000+i,dport=8000+i,rejected=i<2)
        rows+=attempt if i<3 else attempt[:1]
    path=tmp_path/'custom.pcap';write_pcap(path,rows)
    report=analyze_capture(path,config=config)
    assert report.incidents[0].assessment=='suspected_attack'
    repeated=reinterpret_report(report,NetworkContext())
    assert repeated.incidents==report.incidents and not repeated.interpretation_changes
    scanner=next(e.value for e in report.observations[0].entities if e.kind=='client')
    approved=reinterpret_report(report,NetworkContext(authorized_scanner_ips=(scanner,)))
    assert approved.incidents[0].assessment=='unresolved'
    assert reinterpret_report(approved,NetworkContext()).incidents[0].assessment=='suspected_attack'


def test_scan_episode_alibi_preserves_group_and_independent_fault(tmp_path):
    rows=scan_rows()
    for i in range(3):
        rows+=exchange(i*.1,client='192.0.2.201',sport=40000+i,dport=5432,rejected=True)
    path=tmp_path/'mixed.pcap';write_pcap(path,rows)
    report=analyze_capture(path)
    assert len(report.incidents)==2
    approved=reinterpret_report(report,NetworkContext(authorized_scanner_ips=('192.0.2.115',)))
    assert {i.assessment for i in approved.incidents}=={'likely_fault','unresolved'}
    assert approved.observations==report.observations and approved.evidence==report.evidence
    assert {i.id for i in approved.incidents}=={i.id for i in report.incidents}
    assert len(approved.interpretation_changes)==1


def test_unrelated_sources_are_not_grouped(tmp_path):
    path=tmp_path/'sources.pcap';write_pcap(path,scan_rows(hosts=2)+scan_rows(client='192.0.2.116',hosts=2))
    report=analyze_capture(path)
    assert len(report.incidents)==2
    assert all(len(i.observation_ids)==2 for i in report.incidents)


def test_distant_patterns_do_not_chain_into_unbounded_episode(tmp_path):
    # Distinct hosts preserve separate strongest windows in the same source.
    rows=scan_rows(hosts=1)
    later=[]
    for i in range(16):
        later+=exchange(30+i*.01,client='192.0.2.115',server='198.51.100.200',sport=30000+i,dport=2000+i,sequence=20000+i*100,rejected=True,delay=.001)
    path=tmp_path/'separate.pcap';write_pcap(path,rows+later)
    report=analyze_capture(path)
    assert len(report.incidents)==2 and all(len(i.observation_ids)==1 for i in report.incidents)


def test_recorded_custom_window_keeps_episode_identity_on_reinterpretation(tmp_path):
    config=replace(DEFAULT_CONFIG,scan_window_seconds=20)
    rows=scan_rows(hosts=1)
    for i in range(16):
        rows+=exchange(15+i*.01,client='192.0.2.115',server='198.51.100.200',sport=30000+i,dport=2000+i,sequence=20000+i*100,rejected=True,delay=.001)
    path=tmp_path/'custom-window.pcap';write_pcap(path,rows)
    report=analyze_capture(path,config=config)
    assert len(report.incidents)==1 and len(report.incidents[0].observation_ids)==2
    repeated=reinterpret_report(report,NetworkContext())
    assert repeated.incidents==report.incidents and not repeated.interpretation_changes
