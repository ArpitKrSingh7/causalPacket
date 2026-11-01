"""Prepare actual worker/API output for socket-free component interaction tests."""
import asyncio
import json
from pathlib import Path

import httpx

from backend.app import app


async def prepare():
    data = {'method': 'Actual ASGI/API and isolated-worker responses; used as component-test transport stubs, not a live browser demo.'}
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test') as client:
        data['health'] = (await client.get('/api/health')).json()
        data['catalog'] = (await client.get('/api/samples')).json()
        data['reports'] = {}
        for name in ('healthy','service-failure','mixed-scan-and-fault','gateway-transition','truncated'):
            response = await client.post('/api/samples/'+name+'/analyze',json={})
            response.raise_for_status()
            data['reports'][name] = response.json()
        gateway = data['reports']['gateway-transition']
        url = '/api/analyses/'+gateway['analysis_id']+'/reinterpret'
        data['gateway_baseline'] = (await client.post(url,json={'gateway_ip':'192.0.2.1','approved_gateway_macs':['02:00:00:00:00:01']})).json()
        data['gateway_approved'] = (await client.post(url,json={'gateway_ip':'192.0.2.1','approved_gateway_macs':['02:00:00:00:00:01','02:00:00:00:00:02']})).json()
        response = await client.post('/api/lab/evidence',json={})
        response.raise_for_status()
        data['lab'] = response.json()
    return data


if __name__ == '__main__':
    target = Path('.artifacts/ui-checks/data.json')
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(asyncio.run(prepare()))+'\n')
    print('Prepared actual API/worker output:',target)
