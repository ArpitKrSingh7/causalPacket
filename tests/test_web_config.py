import asyncio

import httpx
import pytest
from fastapi import FastAPI, Request

from backend.core.ingestion import install_web_middleware
from backend.core.web_config import LOCAL_ORIGINS, allowed_origins, lab_timeout_seconds


def test_local_defaults(monkeypatch):
    monkeypatch.delenv('CAUSALPACKET_ALLOWED_ORIGINS',raising=False)
    monkeypatch.delenv('CAUSALPACKET_LAB_TIMEOUT_SECONDS',raising=False)
    assert allowed_origins()==LOCAL_ORIGINS
    assert lab_timeout_seconds()==20


def test_configured_origins_are_normalized_and_deduplicated(monkeypatch):
    monkeypatch.setenv('CAUSALPACKET_ALLOWED_ORIGINS','https://DEMO.vercel.app:443/, https://demo.vercel.app, http://localhost:3000')
    assert allowed_origins()==('https://demo.vercel.app','http://localhost:3000')


@pytest.mark.parametrize('value',['*','null','https://*.vercel.app','https://user:password@example.com',
    'https://demo.vercel.app/api','https://demo.vercel.app?token=PRIVATE','https://demo.vercel.app#section',
    'ftp://demo.vercel.app','https://bad host.vercel.app','https://demo.vercel.app:99999','https://demo.vercel.app,'])
def test_invalid_origin_config_fails_without_echoing_values(monkeypatch,value):
    monkeypatch.setenv('CAUSALPACKET_ALLOWED_ORIGINS',value)
    with pytest.raises(ValueError) as error:
        allowed_origins()
    assert 'PRIVATE' not in str(error.value) and 'password' not in str(error.value)


def test_origin_count_is_bounded(monkeypatch):
    monkeypatch.setenv('CAUSALPACKET_ALLOWED_ORIGINS',','.join(f'https://site-{i}.example' for i in range(33)))
    with pytest.raises(ValueError,match='32'):
        allowed_origins()


@pytest.mark.parametrize('value',['0','61','1.5','unlimited'])
def test_lab_timeout_remains_bounded(monkeypatch,value):
    monkeypatch.setenv('CAUSALPACKET_LAB_TIMEOUT_SECONDS',value)
    with pytest.raises(ValueError):
        lab_timeout_seconds()


def test_slow_host_lab_budget_can_be_set_to_sixty_seconds(monkeypatch):
    monkeypatch.setenv('CAUSALPACKET_LAB_TIMEOUT_SECONDS','60')
    assert lab_timeout_seconds()==60


def test_cors_and_body_gate_share_the_configured_origin(monkeypatch):
    monkeypatch.setenv('CAUSALPACKET_ALLOWED_ORIGINS','https://demo.vercel.app')
    app=FastAPI()
    install_web_middleware(app,allowed_origins())
    @app.post('/context')
    async def context(request: Request):
        return await request.json()
    async def check():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://test') as client:
            headers={'Origin':'https://demo.vercel.app'}
            options=await client.options('/context',headers={**headers,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'})
            assert options.status_code==200
            assert options.headers['access-control-allow-origin']==headers['Origin']
            accepted=await client.post('/context',json={'ok':True},headers=headers)
            assert accepted.status_code==200 and accepted.json()=={'ok':True}
            assert accepted.headers['access-control-allow-origin']==headers['Origin']
            assert 'Content-Disposition' in accepted.headers['access-control-expose-headers']
            denied=await client.post('/context',json={},headers={'Origin':'https://other.vercel.app'})
            assert denied.status_code==403 and denied.json()['error']['code']=='origin_not_allowed'
            assert 'access-control-allow-origin' not in denied.headers
            # CLI/server callers without Origin continue to work; CORS is not authentication.
            assert (await client.post('/context',json={})).status_code==200
    asyncio.run(check())
