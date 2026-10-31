"""Additional hostile-input and process-lifecycle regression checks."""
import asyncio
from dataclasses import replace
import random
import struct
import subprocess
import sys
import time

import httpx
import pytest

from backend.core.analyzer import analyze_capture
from backend.core.config import DEFAULT_CONFIG
from backend.core.errors import AnalysisError
from backend.core.models import AnalysisReport
from scripts.generate_samples import write_pcap


def test_mutated_captures_are_controlled_and_reports_remain_valid(captures, tmp_path):
    original=(captures/'04_gateway_transition.pcap').read_bytes()
    rng=random.Random(20261101)
    for case in range(80):
        mutated=bytearray(original)
        for _ in range(1+case%4):
            at=rng.randrange(len(mutated))
            mutated[at]^=1 << rng.randrange(8)
        if case%5==0:
            mutated=mutated[:rng.randrange(len(mutated))]
        path=tmp_path/'mutated.pcap'; path.write_bytes(mutated)
        try:
            report=analyze_capture(path,config=replace(DEFAULT_CONFIG,max_packets=1000,max_attempts=1000))
        except AnalysisError as error:
            assert error.code in ('invalid_capture','unsupported_capture')
        else:
            AnalysisReport.model_validate_json(report.model_dump_json())
            assert report.coverage.packets_seen<=1000
            assert report.coverage.packets_seen==report.coverage.packets_decoded+report.coverage.packets_skipped


def test_non_packet_pcapng_blocks_cannot_bypass_work_budget(tmp_path):
    from test_parser import block
    header=block(0x0a0d0d0a,struct.pack('<IHHq',0x1a2b3c4d,1,0,-1))
    path=tmp_path/'metadata-heavy.pcapng'
    path.write_bytes(header+block(0x40000bad,b'')*200_001)
    report=analyze_capture(path)
    assert report.coverage.status=='limited'
    assert report.coverage.packets_seen==0
    assert 'container_block_count' in report.coverage.limits_reached


@pytest.mark.parametrize('variant',['missing_boundary','multiple_files','unexpected_field','invalid_context'])
def test_malformed_multipart_keeps_errors_safe_and_recovers(captures,variant):
    from backend.app import app
    async def check():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://test') as client:
            payload=(captures/'01_healthy.pcap').read_bytes()
            if variant=='missing_boundary':
                result=await client.post('/api/analyze',content=b'SYNTHETIC_PRIVATE_DATA',headers={'Content-Type':'multipart/form-data'})
            elif variant=='multiple_files':
                result=await client.post('/api/analyze',files=[('file',('a.pcap',payload)),('file',('b.pcap',payload))])
            elif variant=='unexpected_field':
                result=await client.post('/api/analyze',files={'file':('a.pcap',payload)},data={'SYNTHETIC_PRIVATE_DATA':'unexpected'})
            else:
                result=await client.post('/api/analyze',files={'file':('a.pcap',payload)},data={'context':'SYNTHETIC_PRIVATE_DATA'})
            assert result.status_code in (400,422)
            assert 'SYNTHETIC_PRIVATE_DATA' not in result.text
            assert 'Traceback' not in result.text
            assert result.json()['error']['code']=='invalid_request'
            healthy=await client.post('/api/samples/healthy/analyze',json={})
            assert healthy.status_code==200 and healthy.json()['data_origin']=='capture'
    asyncio.run(check())


def test_cancelled_analysis_reaps_worker_and_next_analysis_runs(monkeypatch,captures):
    import backend.core.supervisor as supervisor
    real_popen=supervisor.subprocess.Popen
    created=[]
    def delayed(*args,**kwargs):
        process=real_popen([sys.executable,'-c','import time; time.sleep(30)'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        created.append(process)
        return process
    monkeypatch.setattr(supervisor.subprocess,'Popen',delayed)
    async def check():
        task=asyncio.create_task(supervisor.run_analysis(captures/'01_healthy.pcap'))
        await asyncio.sleep(.03)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
        assert len(created)==1 and created[0].poll() is not None
        monkeypatch.setattr(supervisor.subprocess,'Popen',real_popen)
        assert not (await supervisor.run_analysis(captures/'01_healthy.pcap')).incidents
    asyncio.run(check())


def test_dev_launcher_stops_only_created_process_groups():
    from scripts.dev import stop_processes
    process=subprocess.Popen([sys.executable,'-c','import time; time.sleep(30)'],start_new_session=True)
    try:
        stop_processes([process])
        assert process.poll() is not None
    finally:
        if process.poll() is None:
            process.kill(); process.wait()
