import asyncio

import httpx
import pytest

from backend.core.analyzer import analyze_capture,reinterpret_report
from backend.core.models import NetworkContext
from backend.core.reporting import render_markdown,render_text
from backend.core.offline_scapy import Ether,IP,TCP
from scripts.generate_samples import exchange,write_pcap


def test_markdown_includes_facts_alternatives_actions_and_retained_frames(captures):
    report=analyze_capture(captures/'02_service_failure.pcap')
    content=render_markdown(report)
    assert 'likely_fault' in content and '12 connection attempts refused' in content
    assert 'Competing explanations' in content and 'Missing evidence' in content
    assert 'What to check next' in content and 'service is stopped' in content
    assert 'Same client and service' in content and 'Capture coverage' in content
    assert all('#'+str(p.frame_number) in content for p in report.evidence)
    assert 'network safety' in content


def test_gateway_export_has_association_and_residual_problems(captures):
    context=NetworkContext(gateway_ip='192.0.2.1',approved_gateway_macs=('02:00:00:00:00:01',))
    before=analyze_capture(captures/'04_gateway_transition.pcap',context=context)
    after=reinterpret_report(before,NetworkContext(gateway_ip='192.0.2.1',approved_gateway_macs=('02:00:00:00:00:01','02:00:00:00:00:02')))
    content=render_markdown(after)
    assert 'Last context update' in content and 'Reason changed' in content
    assert 'Remaining problem' in content and 'DNS' in content and 'refused' in content
    assert 'Why these findings were linked' in content and 'not proof' in content
    assert before.observations==after.observations and before.evidence==after.evidence
    assert 'unresolved' in render_text(after) and 'Remaining problem' in render_text(after)


def test_filename_markdown_and_terminal_controls_are_escaped(captures):
    report=analyze_capture(captures/'02_service_failure.pcap').model_copy(update={'source_name':'[fake](javascript:alert(1)) | <script>\x1b[31m\u202e'})
    content=render_markdown(report)
    assert '[fake](javascript:' not in content and '<script>' not in content
    assert '\x1b' not in content and '\u202e' not in content
    assert '\\[fake\\]' in content and '\\|' in content
    assert '\x1b' not in render_text(report) and '\u202e' not in render_text(report)


def test_healthy_report_keeps_honest_empty_state(captures):
    report=analyze_capture(captures/'01_healthy.pcap')
    assert 'No significant findings in the supported checks' in render_markdown(report)
    assert 'unsupported' not in report.coverage.status
    assert 'Coverage:' in render_text(report)


def test_credentials_excluded_from_all_human_report_formats(tmp_path):
    rows=[]
    for i in range(3):
        pair=exchange(i*.1,sport=40000+i,rejected=True)
        response=Ether(pair[1][1])/b'Authorization: Bearer PRIVATE_EXAMPLE_SECRET'
        del response[IP].len; del response[IP].chksum; del response[TCP].chksum
        rows += [pair[0],(pair[1][0],bytes(response))]
    path=tmp_path/'secret.pcap'; write_pcap(path,rows)
    report=analyze_capture(path)
    assert report.incidents
    assert 'PRIVATE_EXAMPLE_SECRET' not in render_markdown(report)
    assert 'PRIVATE_EXAMPLE_SECRET' not in render_text(report)


def test_export_endpoint_preserves_report_and_sets_safe_download_headers():
    from backend.app import app
    async def check():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://test') as client:
            result=await client.post('/api/samples/service-failure/analyze',json={})
            report=result.json(); analysis_id=report['analysis_id']
            exported=await client.get(f'/api/analyses/{analysis_id}/export',params={'format':'json'},headers={'Origin':'http://localhost:3000'})
            assert exported.status_code==200 and exported.json()==report
            assert exported.headers['cache-control']=='no-store'
            assert exported.headers['x-content-type-options']=='nosniff'
            assert exported.headers['content-disposition'].endswith('.json"')
            assert 'Content-Disposition' in exported.headers['access-control-expose-headers']
            markdown=await client.get(f'/api/analyses/{analysis_id}/export',params={'format':'markdown'})
            assert markdown.status_code==200 and 'text/markdown' in markdown.headers['content-type']
            assert markdown.headers['content-disposition'].endswith('.md"')
            assert 'What to check next' in markdown.text
            invalid=await client.get(f'/api/analyses/{analysis_id}/export',params={'format':'html'})
            assert invalid.status_code==422
            await client.delete(f'/api/analyses/{analysis_id}')
            assert (await client.get(f'/api/analyses/{analysis_id}/export')).status_code==410
    asyncio.run(check())
