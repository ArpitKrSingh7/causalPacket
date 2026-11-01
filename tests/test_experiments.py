import asyncio

import httpx
import pytest
from pydantic import ValidationError

from backend.core.experiments import ExperimentReport, ExperimentRequest, run_experiment, variants
from backend.core.models import AnalysisReport


@pytest.fixture(scope='module',params=[42,73,99])
def experiment(request):
    return asyncio.run(run_experiment(request.param))


def test_missing_responses_reduce_supported_scan_to_uncertainty(experiment):
    cases={case.id:case for case in experiment.cases}
    for retained in (20,15,10,5,0):
        case=cases['scan-'+str(retained)]
        obs=next(o for o in case.report.observations if o.type=='SCAN_PATTERN')
        metrics={m.key:m.value for m in obs.metrics}
        assert metrics['attempts']==metrics['diversity']==20
        assert metrics['rejected']==retained and metrics['unknown']==20-retained
        assert len(case.report.incidents)==1
        assert case.report.incidents[0].assessment==('suspected_attack' if retained>=10 else 'unresolved')
        assert len(case.removed_source_frames)==20-retained
    assert any('one-sided' in note for note in cases['scan-0'].report.coverage.visibility_notes)


def test_successful_port_diversity_is_a_negative_control(experiment):
    case=next(c for c in experiment.cases if c.id=='healthy-diversity')
    assert case.report.coverage.packets_seen==60
    assert not case.report.observations and not case.report.incidents


def test_removing_baseline_preserves_independent_problems(experiment):
    cases={case.id:case for case in experiment.cases}
    before,after=(cases[name].report for name in ('mixed-original','mixed-no-baseline'))
    assert sorted(i.assessment for i in before.incidents)==sorted(i.assessment for i in after.incidents)==['likely_fault','suspected_attack']
    assert {o.type for o in before.observations}=={o.type for o in after.observations}=={'SCAN_PATTERN','TCP_CONNECTION_REFUSED'}
    assert any(c.status=='available' for i in before.incidents for c in i.comparisons)
    assert all(c.status=='unavailable' for i in after.incidents for c in i.comparisons)
    assert len(cases['mixed-no-baseline'].removed_source_frames)==3


def test_temporal_coincidence_without_next_hop_does_not_link(experiment):
    cases={case.id:case for case in experiment.cases}
    before,after=(cases[name].report for name in ('gateway-linked','gateway-unlinked'))
    assert len(before.edges)==2 and not after.edges
    assert len(before.incidents)==1 and len(after.incidents)==3
    assert {o.type for o in before.observations}=={o.type for o in after.observations}
    assert [o.first_seen_seconds for o in before.observations]==[o.first_seen_seconds for o in after.observations]
    assert before.coverage.packets_seen==after.coverage.packets_seen==19
    assert len(cases['gateway-unlinked'].edited_source_frames)==6


def test_derived_frames_map_to_sources_and_contracts_validate(experiment):
    assert experiment.data_origin=='synthetic_experiment'
    ExperimentReport.model_validate_json(experiment.model_dump_json())
    for case in experiment.cases:
        AnalysisReport.model_validate_json(case.report.model_dump_json())
        assert len(case.source_frame_map)==case.report.coverage.packets_seen
        assert set(case.source_frame_map)==set(range(1,case.source_packets+1))-set(case.removed_source_frames)
        assert all(1<=case.source_frame_map[p.frame_number-1]<=case.source_packets for p in case.report.evidence)


def test_variants_keep_raw_source_packets_and_change_only_declared_fields():
    for _id,_family,_description,source,removed,edits in variants(73):
        assert not set(edits)&removed
        for frame,changed in edits.items():
            original=source[frame-1][1]
            assert original[6:]==changed[6:]  # Only Ethernet destination changes.


@pytest.mark.parametrize('seed',[-1,1_000_001,True,'42'])
def test_seed_is_bounded_and_strict(seed):
    with pytest.raises(ValidationError):
        ExperimentRequest(seed=seed)


def test_lab_api_reanalyzes_without_evicting_original_session():
    from backend.app import app
    async def check():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://test') as client:
            original=await client.post('/api/samples/healthy/analyze',json={})
            assert original.status_code==200
            task=asyncio.create_task(client.post('/api/lab/evidence',json={'seed':73}))
            await asyncio.sleep(.05)
            health=await asyncio.wait_for(client.get('/api/health'),1)
            assert health.status_code==200
            busy=await client.post('/api/samples/healthy/analyze',json={})
            assert busy.status_code==429
            response=await task
            assert response.status_code==200
            lab=ExperimentReport.model_validate(response.json())
            assert lab.seed==73 and len(lab.cases)==10
            assert lab.data_origin=='synthetic_experiment'
            retained=await client.get('/api/analyses/'+original.json()['analysis_id']+'/export?format=json')
            assert retained.status_code==200 and retained.json()==original.json()
            await client.delete('/api/analyses/'+original.json()['analysis_id'])
    asyncio.run(check())


@pytest.mark.parametrize('payload',[{'seed':-1},{'seed':'42'},{'path':'SYNTHETIC_PRIVATE_INPUT'}])
def test_lab_api_validates_settings_and_does_not_accept_capture_paths(payload):
    from backend.app import app
    async def check():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://test') as client:
            response=await client.post('/api/lab/evidence',json=payload)
            assert response.status_code==422
            assert 'SYNTHETIC_PRIVATE_INPUT' not in response.text
    asyncio.run(check())


def test_lab_deadline_cancels_work_and_releases_gate(monkeypatch):
    import importlib
    module=importlib.import_module('backend.app')
    timeout=asyncio.timeout
    cancelled=[]
    async def slow(_seed):
        try:
            await asyncio.sleep(2)
        finally:
            cancelled.append(True)
    monkeypatch.setattr(module,'run_experiment',slow)
    monkeypatch.setattr(module.asyncio,'timeout',lambda _seconds:timeout(.01))
    async def check():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=module.app),base_url='http://test') as client:
            response=await client.post('/api/lab/evidence',json={})
            assert response.status_code==504
            assert response.json()['error']['code']=='analysis_timeout'
            assert cancelled and not module.analysis_gate.locked()
    asyncio.run(check())
