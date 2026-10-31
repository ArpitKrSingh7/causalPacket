"""Verify the complete synthetic demo via ASGI, without starting web servers."""
import argparse
import asyncio
from datetime import datetime,timezone
import json
from pathlib import Path
import sys
from time import perf_counter

import httpx

from backend.app import app
from backend.core.models import AnalysisReport
from backend.samples import SAMPLES

ROOT=Path(__file__).resolve().parents[1]


async def verify():
    manifest=json.loads((ROOT/'samples/manifest.json').read_text())
    cases=[]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://demo') as client:
        health=await client.get('/api/health')
        assert health.status_code==200 and health.json()['engine_ready']
        catalog=(await client.get('/api/samples')).json()['samples']
        assert len(catalog)==len(SAMPLES) and all(item['available'] for item in catalog)
        for item in catalog:
            filename=SAMPLES[item['id']][0]
            expected=manifest['scenarios'][filename]
            started=perf_counter()
            response=await client.post('/api/samples/'+item['id']+'/analyze',json={})
            assert response.status_code==200,(item['id'],response.text)
            raw=response.json(); report=AnalysisReport.model_validate(raw)
            assert report.data_origin=='capture'
            actual={o.type for o in report.observations}
            assert set(expected.get('expected',[]))<=actual,(filename,actual)
            assert not(set(expected.get('forbidden',[]))&actual),(filename,actual)
            if 'coverage' in expected:
                assert report.coverage.status==expected['coverage']
            if 'incidents' in expected:
                assert len(report.incidents)==expected['incidents']
            if 'independent_incidents' in expected:
                assert len(report.incidents)==expected['independent_incidents']
            extra={}
            if item['id']=='gateway-transition':
                url='/api/analyses/'+report.analysis_id+'/reinterpret'
                baseline=await client.post(url,json=expected['suggested_context'])
                approved=await client.post(url,json=expected['alibi_context'])
                reset=await client.post(url,json={})
                assert all(r.status_code==200 for r in (baseline,approved,reset))
                stages=[r.json() for r in (baseline,approved,reset)]
                assert [r['incidents'][0]['assessment'] for r in stages]==['suspected_attack','unresolved','unresolved']
                for stage in stages:
                    for field in ('observations','evidence','edges','coverage'):
                        assert stage[field]==raw[field],('Alibi changed facts',field)
                assert stages[1]['interpretation_changes'][0]['remaining_problem']
                extra={'alibi_assessments':['unresolved','suspected_attack','unresolved','unresolved'],'evidence_preserved':True}
            exported=await client.get('/api/analyses/'+report.analysis_id+'/export',params={'format':'markdown'})
            assert exported.status_code==200 and '# CausalPacket investigation' in exported.text
            cases.append({'sample_id':item['id'],'capture':filename,'packets':report.coverage.packets_seen,
                'coverage':report.coverage.status,'findings':sorted(actual),'incidents':len(report.incidents),
                'association_edges':len(report.edges),'api_and_worker_ms':round((perf_counter()-started)*1000,2),**extra})
            await client.delete('/api/analyses/'+report.analysis_id)
        bad=await client.post('/api/analyze',files={'file':('bad.pcap',b'invalid capture')})
        recovered=await client.post('/api/samples/healthy/analyze',json={})
        assert bad.status_code==415 and recovered.status_code==200 and not recovered.json()['incidents']
    return {'checked_at_utc':datetime.now(timezone.utc).isoformat(),'python':sys.version.split()[0],
        'transport':'ASGI with real isolated workers; no browser or HTTP socket test implied',
        'synthetic_only':True,'scenarios':cases,'malformed_upload_and_recovery':True}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,help='Optional generated verification JSON (use .artifacts/ for local output)')
    args=parser.parse_args()
    result=asyncio.run(verify())
    for case in result['scenarios']:
        print(f"PASS {case['sample_id']}: {case['packets']} packets, {case['coverage']}, {case['incidents']} incident(s)")
    print('PASS gateway Alibi facts remain fixed; report exports work; malformed input recovers.')
    if args.output:
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(json.dumps(result,indent=2)+'\n')
        print('Wrote verification artifact:',args.output)


if __name__=='__main__':
    main()
