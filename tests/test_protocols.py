"""Independent ARP/DNS controls and auditable gateway reinterpretation checks."""
import asyncio
import json
import struct
from dataclasses import replace

import httpx
import pytest

from backend.core.analyzer import analyze_capture, reinterpret_report
from backend.core.config import DEFAULT_CONFIG
from backend.core.dns_wire import parse_dns
from backend.core.models import NetworkContext
from backend.core.offline_scapy import ARP, Dot1Q, Ether, IP, TCP, UDP, ICMP
from backend.core.supervisor import run_analysis
from scripts.generate_samples import generate, write_pcap
from scripts.protocol_samples import CLIENT_MAC, MAC_A, MAC_B, arp_claim, dns_exchange, dns_payload, routed_exchange


def finding_types(report):
    return {o.type for o in report.observations}


def write_analyze(tmp_path, rows, config=DEFAULT_CONFIG):
    path = tmp_path/'protocol.pcap'
    write_pcap(path, rows)
    return analyze_capture(path, config=config)


def baseline():
    return NetworkContext(gateway_ip='192.0.2.1', approved_gateway_macs=(MAC_A,))


def approved():
    return NetworkContext(gateway_ip='192.0.2.1', approved_gateway_macs=(MAC_A,MAC_B))


def test_gateway_real_observations_group_only_when_packet_link_exists(captures):
    report = analyze_capture(captures/'04_gateway_transition.pcap', context=baseline())
    assert finding_types(report) == {'ARP_IDENTITY_CHANGE','DNS_RESPONSE_ERROR','TCP_CONNECTION_REFUSED'}
    assert len(report.edges) == 2 and len(report.incidents) == 1
    incident = report.incidents[0]
    assert incident.assessment == 'suspected_attack' and len(incident.observation_ids) == 3
    assert len(incident.comparisons) == 2 and all(c.status=='available' for c in incident.comparisons)
    retained = {p.frame_number:p for p in report.evidence}
    for edge in report.edges:
        assert any(retained[f].destination_mac==MAC_B and retained[f].protocol in ('TCP','DNS') for f in edge.evidence_frames)
        assert 'not proof' in edge.reason


def test_gateway_alibi_keeps_evidence_comparisons_and_residuals(captures):
    before = analyze_capture(captures/'04_gateway_transition.pcap', context=baseline())
    after = reinterpret_report(before, approved())
    for field in ('analysis_id','observations','edges','evidence','coverage'):
        assert getattr(before,field) == getattr(after,field)
    assert before.incidents[0].comparisons == after.incidents[0].comparisons
    assert after.incidents[0].assessment == 'unresolved'
    assert len(after.incidents[0].observation_ids) == 3
    assert after.interpretation_changes and 'DNS' in after.interpretation_changes[0].remaining_problem
    assert 'refused' in after.interpretation_changes[0].remaining_problem
    assert reinterpret_report(after, baseline()).incidents[0].assessment == 'suspected_attack'
    reset = reinterpret_report(after, NetworkContext())
    assert reset.incidents[0].assessment == 'unresolved'


def test_same_context_is_idempotent_for_grouped_report(captures):
    report=analyze_capture(captures/'04_gateway_transition.pcap', context=baseline())
    repeated=reinterpret_report(report, baseline())
    assert repeated.incidents == report.incidents
    assert not repeated.interpretation_changes


def test_no_gateway_inferred_from_dot_one_address(tmp_path):
    report=write_analyze(tmp_path,[arp_claim(0),arp_claim(1,mac=MAC_B)])
    assert finding_types(report)=={'ARP_IDENTITY_CHANGE'}
    assert report.incidents[0].assessment=='unresolved'
    assert 'Gateway' not in report.incidents[0].title


def test_policy_for_another_gateway_does_not_authorize_claimed_address(tmp_path):
    report=write_analyze(tmp_path,[arp_claim(0),arp_claim(1,mac=MAC_B)])
    report=reinterpret_report(report,NetworkContext(gateway_ip='192.0.2.254',approved_gateway_macs=(MAC_A,)))
    assert report.incidents[0].assessment=='unresolved'


def test_normal_probes_and_single_announcement_have_no_findings(captures):
    assert not analyze_capture(captures/'08_arp_healthy.pcap').incidents


def test_vlan_domains_do_not_create_false_arp_conflict(tmp_path):
    rows=[]
    for t,mac,vlan in [(0,MAC_A,10),(1,MAC_B,20)]:
        rows.append((t,bytes(Ether(src=mac,dst=CLIENT_MAC)/Dot1Q(vlan=vlan)/ARP(op=2,psrc='192.0.2.1',hwsrc=mac,pdst='192.0.2.10',hwdst=CLIENT_MAC))))
    assert not write_analyze(tmp_path,rows).incidents


def test_pcapng_interfaces_do_not_create_false_arp_conflict(tmp_path):
    from test_parser import ng_capture
    path=tmp_path/'interfaces.pcapng'
    path.write_bytes(ng_capture([arp_claim(0),arp_claim(1,mac=MAC_B)],interfaces=2))
    assert not analyze_capture(path).incidents


@pytest.mark.parametrize('mac', ['01:00:00:00:00:01','ff:ff:ff:ff:ff:ff','00:00:00:00:00:00'])
def test_invalid_claimant_mac_not_an_ownership_conflict(tmp_path,mac):
    assert not write_analyze(tmp_path,[arp_claim(0),arp_claim(1,mac=mac)]).incidents


def test_timestamp_proximity_without_next_hop_evidence_not_grouped(tmp_path):
    rows=[arp_claim(0),arp_claim(1,mac=MAC_B)]
    for i in range(3):
        rows+=routed_exchange(2+i*.2,'192.0.2.10',MAC_A,sport=40000+i,rejected=True)
    report=write_analyze(tmp_path,rows)
    assert finding_types(report)=={'ARP_IDENTITY_CHANGE','TCP_CONNECTION_REFUSED'}
    assert not report.edges and len(report.incidents)==2


def test_association_window_does_not_chain_whole_capture(tmp_path):
    rows=[arp_claim(0),arp_claim(1,mac=MAC_B)]
    for i in range(3):
        rows+=routed_exchange(20+i*.2,'192.0.2.10',MAC_B,sport=40000+i,rejected=True)
    report=write_analyze(tmp_path,rows)
    assert not report.edges and len(report.incidents)==2


def test_independent_fault_survives_gateway_investigation(captures,tmp_path):
    from scripts.protocol_samples import make_protocol_scenarios
    scenarios,_=make_protocol_scenarios()
    rows=list(scenarios['04_gateway_transition.pcap'])
    for i in range(3):
        rows+=routed_exchange(4+i*.2,'192.0.2.222',MAC_A,sport=48000+i,dport=5432,rejected=True)
    report=write_analyze(tmp_path,rows)
    assert len(report.incidents)==2 and len(report.edges)==2
    assert any(len(i.observation_ids)==1 and i.assessment=='likely_fault' for i in report.incidents)
    assert len(reinterpret_report(report,approved()).incidents)==2


def test_dns_resolver_errors_are_counts_not_hijacking(captures):
    report=analyze_capture(captures/'06_dns_faults.pcap')
    assert finding_types(report)=={'DNS_RESPONSE_ERROR'}
    values={m.key:m.value for m in report.observations[0].metrics}
    assert values['servfail']==values['refused']==3 and values['queries']==6
    assert report.incidents[0].assessment=='likely_fault'
    assert report.incidents[0].comparisons[0].status=='available'
    assert any('capture boundary' in n for n in report.coverage.visibility_notes)
    assert any('NXDOMAIN' in n for n in report.coverage.visibility_notes)


def test_dns_nxdomain_and_shared_ids_are_not_attacks(captures):
    report=analyze_capture(captures/'09_dns_healthy.pcap')
    assert report.coverage.packets_decoded==6 and not report.incidents
    assert report.coverage.protocols==('DNS',)


@pytest.mark.parametrize('mismatch', ['client','resolver','port','name','type','class','txid'])
def test_full_dns_key_required_before_accepting_response(tmp_path,mismatch):
    rows=[]
    for i in range(3):
        query,response=dns_exchange(i*.2,sport=53000+i,txid=10+i,rcode=2)
        packet=Ether(response[1])
        if mismatch=='client': packet[IP].dst='192.0.2.200'
        if mismatch=='resolver': packet[IP].src='198.51.100.54'
        if mismatch=='port': packet[UDP].dport+=100
        if mismatch in ('name','type','class','txid'):
            payload=dns_payload(txid=999 if mismatch=='txid' else 10+i,name='other.test' if mismatch=='name' else 'portal.test',
                qtype=28 if mismatch=='type' else 1,qclass=3 if mismatch=='class' else 1,rcode=2,response=True)
            packet[UDP].remove_payload(); packet=packet/payload
        del packet[IP].len; del packet[IP].chksum; del packet[UDP].len; del packet[UDP].chksum
        rows += [query,(response[0],bytes(packet))]
    report=write_analyze(tmp_path,rows)
    assert 'DNS_RESPONSE_ERROR' not in finding_types(report)
    assert not report.incidents
    assert any('full matching request' in n for n in report.coverage.visibility_notes)


def test_dns_question_matching_is_case_insensitive():
    assert parse_dns(dns_payload(name='Portal.TEST')).question_hash == parse_dns(dns_payload(name='portal.test')).question_hash


def test_dns_retries_do_not_inflate_failures(tmp_path):
    query,response=dns_exchange(0,rcode=2,delay=1)
    rows=[(i*.1,query[1]) for i in range(6)]+[response]
    assert not write_analyze(tmp_path,rows).incidents


def test_dns_reused_full_key_does_not_confuse_late_duplicate_responses(tmp_path):
    rows=dns_exchange(0)
    rows+=dns_exchange(.1,rcode=2)
    rows+=dns_exchange(.2,rcode=2)
    rows+=[arp_claim(5)]
    report=write_analyze(tmp_path,rows)
    assert not report.incidents
    assert report.coverage.status=='limited'
    assert any('transaction key' in n for n in report.coverage.visibility_notes)


def test_dns_missing_mature_requests_remain_uncertain(tmp_path):
    rows=[]
    for i in range(3):
        rows+=dns_exchange(i*.1,sport=53000+i,txid=1+i)[:1]
    rows+=[arp_claim(5)]
    report=write_analyze(tmp_path,rows)
    assert finding_types(report)=={'DNS_UNANSWERED'}
    assert report.incidents[0].assessment=='unresolved'


def test_dns_latency_requires_real_matching_responses(tmp_path):
    rows=[]
    for i in range(3):
        rows+=dns_exchange(i,sport=53000+i,txid=1+i,delay=.75)
    report=write_analyze(tmp_path,rows)
    assert finding_types(report)=={'DNS_DELAY'}
    assert report.incidents[0].assessment=='unresolved'


@pytest.mark.parametrize('payload', [b'\x00', struct.pack('!HHHHHH',1,0,1,0,0,0)+b'\xc0\x0c\x00\x01\x00\x01', dns_payload(response=True,truncated=True)])
def test_bad_or_truncated_dns_not_decoded_as_an_attack(tmp_path,payload):
    raw=bytes(Ether(src=CLIENT_MAC,dst=MAC_A)/IP(src='192.0.2.10',dst='198.51.100.53')/UDP(sport=53000,dport=53)/payload)
    report=write_analyze(tmp_path,[(0,raw)])
    assert not report.incidents and report.coverage.status=='limited'
    assert any('DNS' in n for n in report.coverage.visibility_notes)


def test_domain_text_never_enters_reports(tmp_path):
    rows=[]
    for i in range(3):
        rows+=dns_exchange(i*.1,sport=53000+i,txid=i,name='private-project.secret.test',rcode=2)
    report=write_analyze(tmp_path,rows)
    assert finding_types(report)=={'DNS_RESPONSE_ERROR'}
    assert 'private-project' not in report.model_dump_json()
    assert any(h.name=='Question fingerprint' for p in report.evidence for h in p.headers)


def test_arp_and_dns_state_budgets_explicit(tmp_path):
    rows=[arp_claim(0,address='192.0.2.1'),arp_claim(1,address='192.0.2.2')]
    report=write_analyze(tmp_path,rows,replace(DEFAULT_CONFIG,max_arp_addresses=1))
    assert 'arp_address_state' in report.coverage.limits_reached
    rows=dns_exchange(0)+dns_exchange(1,txid=2,sport=53001)
    report=write_analyze(tmp_path,rows,replace(DEFAULT_CONFIG,max_dns_queries=1))
    assert 'dns_query_state' in report.coverage.limits_reached


@pytest.mark.parametrize('seed',[6,77,190])
def test_gateway_not_hardcoded_to_demo_client(tmp_path,seed):
    generate(tmp_path,seed)
    report=analyze_capture(tmp_path/'04_gateway_transition.pcap')
    assert len(report.incidents)==1 and len(report.edges)==2 and len(report.observations)==3


def test_quoted_tcp_in_icmp_not_treated_as_direct_tcp(tmp_path):
    raw=bytes(Ether(src=MAC_A,dst=CLIENT_MAC)/IP(src='192.0.2.1',dst='192.0.2.10')/ICMP(type=3,code=4)/IP(src='192.0.2.10',dst='198.51.100.20')/TCP(flags='S',sport=53000,dport=443))
    report=write_analyze(tmp_path,[(0,raw)])
    assert not report.incidents and report.coverage.protocols==('IPv4',)


def test_gateway_api_worker_and_alibi_are_real(captures):
    from backend.app import app
    async def check():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://test') as client:
            result=await client.post('/api/samples/gateway-transition/analyze',json=baseline().model_dump(mode='json'))
            assert result.status_code==200,result.text
            before=result.json()
            assert before['data_origin']=='capture' and len(before['edges'])==2
            result=await client.post('/api/analyses/'+before['analysis_id']+'/reinterpret',json=approved().model_dump(mode='json'))
            assert result.status_code==200,result.text
            after=result.json()
            assert after['incidents'][0]['assessment']=='unresolved'
            for key in ('observations','edges','evidence','coverage'):
                assert before[key]==after[key]
            assert 'DNS' in after['interpretation_changes'][0]['remaining_problem']
    asyncio.run(check())
