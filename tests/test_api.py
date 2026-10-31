import asyncio
from dataclasses import replace
from pathlib import Path

import httpx
import pytest

from backend.app import app, store
from backend.core.config import DEFAULT_CONFIG
from backend.core.errors import AnalysisError
from backend.core.supervisor import run_analysis


def run(coro):
    return asyncio.run(coro)


async def client_case(callback):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test') as client:
        return await callback(client)


def test_real_upload_and_evidence(captures):
    async def case(client):
        response = await client.post('/api/analyze', files={'file': ('../../user.pcap', (captures/'02_service_failure.pcap').read_bytes(), 'application/octet-stream')}, data={'context':'{}'})
        assert response.status_code == 200, response.text
        report = response.json()
        assert report['source_name'] == 'user.pcap' and report['data_origin'] == 'capture'
        assert report['incidents'][0]['assessment'] == 'likely_fault'
        analysis_id = report['analysis_id']
        frame = report['evidence'][0]['frame_number']
        evidence = await client.get(f'/api/analyses/{analysis_id}/evidence', params={'frame_numbers':str(frame)})
        assert evidence.status_code == 200 and evidence.json()['total_matching'] == 1
        assert (await client.delete(f'/api/analyses/{analysis_id}')).status_code == 204
        assert (await client.get(f'/api/analyses/{analysis_id}/evidence')).status_code == 410
    run(client_case(case))


def test_sample_reinterpretation_and_context_reset():
    async def case(client):
        catalog = (await client.get('/api/samples')).json()
        assert all(s['available'] and s['synthetic'] for s in catalog['samples'])
        response = await client.post('/api/samples/mixed-scan-and-fault/analyze', json={})
        assert response.status_code == 200
        before = response.json()
        scanner = next(e['value'] for o in before['observations'] if o['type']=='SCAN_PATTERN' for e in o['entities'] if e['kind']=='client')
        url = f"/api/analyses/{before['analysis_id']}/reinterpret"
        updated = (await client.post(url, json={'authorized_scanner_ips':[scanner]})).json()
        assert updated['observations'] == before['observations'] and updated['evidence'] == before['evidence']
        assert len(updated['interpretation_changes']) == 1
        assert any(i['assessment']=='likely_fault' for i in updated['incidents'])
        reset = await client.post(url, json={})
        assert reset.status_code == 200 and any(i['assessment']=='suspected_attack' for i in reset.json()['incidents'])
    run(client_case(case))


@pytest.mark.parametrize('context', [{'gateway_ip':'invalid'}, {'approved_gateway_macs':['aa:bb:cc:dd:ee:ff']}, {'unexpected':'secret'}])
def test_invalid_context_is_safe(context):
    async def case(client):
        response = await client.post('/api/samples/healthy/analyze', json=context)
        assert response.status_code == 422 and response.json()['error']['code'] == 'invalid_request'
        assert 'secret' not in response.text and 'Traceback' not in response.text
    run(client_case(case))


def test_malformed_upload_followed_by_healthy(captures):
    async def case(client):
        bad = await client.post('/api/analyze', files={'file':('bad.pcap',b'not a capture')})
        assert bad.status_code == 415
        good = await client.post('/api/samples/healthy/analyze', json={})
        assert good.status_code == 200 and not good.json()['incidents']
    run(client_case(case))


def test_declared_oversized_upload_rejected_before_body():
    async def case(client):
        response = await client.post('/api/analyze', content=b'', headers={'Content-Length':str(30*1024*1024)})
        assert response.status_code == 413
        assert (await client.get('/api/health')).status_code == 200
    run(client_case(case))


def test_unknown_sample_and_invalid_evidence_filter():
    async def case(client):
        assert (await client.post('/api/samples/not-allowed/analyze',json={})).status_code == 404
        response = await client.post('/api/samples/possible-scan/analyze',json={})
        report = response.json()
        bad = await client.get(f"/api/analyses/{report['analysis_id']}/evidence",params={'frame_numbers':'-1,abc'})
        assert bad.status_code == 422
    run(client_case(case))


def test_worker_timeout_is_hard_and_next_call_works(captures):
    async def case():
        with pytest.raises(AnalysisError) as caught:
            await run_analysis(captures/'01_healthy.pcap', config=replace(DEFAULT_CONFIG, worker_wall_seconds=0))
        assert caught.value.code == 'analysis_timeout'
        assert not (await run_analysis(captures/'01_healthy.pcap')).incidents
    run(case())


def test_output_budget_is_enforced(captures):
    async def case():
        with pytest.raises(AnalysisError) as caught:
            await run_analysis(captures/'02_service_failure.pcap', config=replace(DEFAULT_CONFIG, max_output_bytes=512))
        assert caught.value.code in ('analysis_limit', 'analysis_failed')
    run(case())


def test_chunked_body_limit_does_not_trust_content_length(monkeypatch):
    import backend.core.ingestion as ingestion
    monkeypatch.setattr(ingestion, 'DEFAULT_CONFIG', replace(DEFAULT_CONFIG, max_file_bytes=64))
    async def case(client):
        async def body():
            for _ in range(20):
                yield b'x'*1024
        response = await client.post('/api/analyze',content=body(),headers={'Content-Length':'1','Content-Type':'multipart/form-data; boundary=x'})
        assert response.status_code == 413
    run(client_case(case))


def test_health_remains_responsive_and_second_analysis_rejected(monkeypatch, captures):
    import importlib
    api = importlib.import_module('backend.app')
    from backend.core.analyzer import analyze_capture
    report = analyze_capture(captures/'01_healthy.pcap')
    async def slow(*args, **kwargs):
        await asyncio.sleep(.1)
        return report
    monkeypatch.setattr(api, 'run_analysis', slow)
    async def case(client):
        first = asyncio.create_task(client.post('/api/samples/healthy/analyze',json={}))
        await asyncio.sleep(.02)
        assert (await client.get('/api/health')).status_code == 200
        assert (await client.post('/api/samples/healthy/analyze',json={})).status_code == 429
        assert (await first).status_code == 200
    run(client_case(case))


def test_untrusted_origin_cannot_start_analysis():
    async def case(client):
        response=await client.post('/api/samples/healthy/analyze',json={},headers={'Origin':'https://untrusted.example'})
        assert response.status_code == 403
    run(client_case(case))


def test_session_count_expiry_and_budget(captures):
    from backend.core.sessions import ReportStore
    from backend.core.analyzer import analyze_capture
    report = analyze_capture(captures/'01_healthy.pcap')
    cache = ReportStore(max_sessions=1)
    cache.put(report)
    other = report.model_copy(update={'analysis_id':'another-id'})
    cache.put(other)
    with pytest.raises(AnalysisError):
        cache.get(report.analysis_id)
    expired = ReportStore(ttl_seconds=0)
    expired.put(report)
    with pytest.raises(AnalysisError):
        expired.get(report.analysis_id)
    with pytest.raises(AnalysisError):
        ReportStore(max_bytes=1).put(report)
