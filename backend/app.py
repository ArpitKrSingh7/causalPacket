"""Local API for bounded, evidence-first packet investigation."""
import asyncio
import json
import re
from contextlib import asynccontextmanager, suppress
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Annotated, Literal

from fastapi import FastAPI, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import ValidationError
from starlette.datastructures import UploadFile
from starlette.exceptions import HTTPException

from backend.core.analyzer import reinterpret_report
from backend.core.config import DEFAULT_CONFIG
from backend.core.errors import AnalysisError
from backend.core.experiments import ExperimentReport, ExperimentRequest, run_experiment
from backend.core.ingestion import BoundedBodyMiddleware
from backend.core.models import AnalysisReport, ErrorDetail, ErrorResponse, EvidencePage, HealthResponse, NetworkContext, SamplesResponse
from backend.core.sessions import ReportStore
from backend.core.supervisor import run_analysis
from backend.core.reporting import render_markdown
from backend.samples import SAMPLE_ROOT, SAMPLES, sample_catalog

store = ReportStore()
analysis_gate = asyncio.Lock()


@asynccontextmanager
async def lifespan(_app):
    async def reap_expired():
        while True:
            await asyncio.sleep(30)
            store.expire()
    cleanup = asyncio.create_task(reap_expired())
    try:
        yield
    finally:
        cleanup.cancel()
        with suppress(asyncio.CancelledError):
            await cleanup
        store.entries.clear()


app = FastAPI(title="CausalPacket", version="0.4.0", lifespan=lifespan,
    description="Evidence-first TCP, scan, ARP and UDP DNS investigation with context re-evaluation.")
app.add_middleware(BoundedBodyMiddleware)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=False, allow_methods=["GET", "POST", "DELETE"], allow_headers=["Content-Type"],
    expose_headers=['Content-Disposition'])


def error_response(status, code, message):
    payload = ErrorResponse(error=ErrorDetail(code=code, message=message))
    return JSONResponse(status_code=status, content=payload.model_dump(mode="json"))


@app.exception_handler(AnalysisError)
async def analysis_error(_request: Request, exc: AnalysisError):
    return error_response(exc.status, exc.code, exc.message)


@app.exception_handler(HTTPException)
async def http_error(_request: Request, exc: HTTPException):
    return error_response(exc.status_code, "not_found" if exc.status_code == 404 else "invalid_request",
        "Resource not found." if exc.status_code == 404 else "The request could not be completed. Check its fields and format.")


@app.exception_handler(RequestValidationError)
async def invalid_request(_request: Request, _exc: RequestValidationError):
    return error_response(422, "invalid_request", "Check the request fields and try again.")


@app.exception_handler(Exception)
async def unexpected_error(_request: Request, _exc: Exception):
    return error_response(500, "internal_error", "The request could not be completed safely. Try again with a supported capture.")


def parse_context(value):
    try:
        return NetworkContext.model_validate(value)
    except (ValidationError, ValueError, TypeError):
        raise AnalysisError("invalid_request", "Provide a valid gateway IPv4 address, colon-separated MAC addresses, and scanner IPv4 addresses.") from None


async def json_context(request):
    data = await request.body()
    if not data:
        return NetworkContext()
    try:
        return parse_context(json.loads(data))
    except (ValueError, TypeError):
        raise AnalysisError("invalid_request", "Context must be a valid JSON object.") from None


async def process_capture(path, context, source_name, sample_id=None):
    if analysis_gate.locked():
        raise AnalysisError("analysis_busy", "An analysis is already running. Try again shortly.", 429)
    async with analysis_gate:
        report = await run_analysis(path, context, source_name, sample_id)
        store.put(report)
        return report


@app.get("/api/health", response_model=HealthResponse)
async def health():
    return HealthResponse(engine_ready=True)


@app.get("/api/samples", response_model=SamplesResponse)
async def samples():
    return SamplesResponse(samples=sample_catalog())


@app.post('/api/lab/evidence', response_model=ExperimentReport)
async def evidence_experiment(settings: ExperimentRequest):
    """Explicitly run synthetic controls; do not replace or retain user analyses."""
    if analysis_gate.locked():
        raise AnalysisError('analysis_busy', 'An analysis is already running. Try again shortly.', 429)
    async with analysis_gate:
        try:
            async with asyncio.timeout(20):
                result = await run_experiment(settings.seed)
        except TimeoutError:
            raise AnalysisError('analysis_timeout', 'The synthetic experiment exceeded its time budget.', 504) from None
        if len(result.model_dump_json().encode()) > DEFAULT_CONFIG.max_output_bytes:
            raise AnalysisError('analysis_limit', 'The experiment reached its output budget.')
        return result


@app.post("/api/analyze", response_model=AnalysisReport)
async def analyze(request: Request):
    if not request.headers.get("content-type", "").lower().startswith("multipart/form-data"):
        raise AnalysisError("invalid_request", "Send a multipart capture in the file field.")
    async with request.form(max_files=1, max_fields=1, max_part_size=8192) as form:
        if set(form.keys()) - {"file", "context"} or len(form.getlist("file")) != 1 or len(form.getlist("context")) > 1:
            raise AnalysisError("invalid_request", "Provide exactly one file and at most one context field.")
        upload = form.get("file")
        if not isinstance(upload, UploadFile):
            raise AnalysisError("invalid_request", "A capture file is required.")
        raw_context = form.get("context", "{}")
        if not isinstance(raw_context, str):
            raise AnalysisError("invalid_request", "Context must be a JSON text field.")
        try:
            context = parse_context(json.loads(raw_context))
        except ValueError:
            raise AnalysisError("invalid_request", "Context must be valid JSON.") from None
        source = Path((upload.filename or "capture.pcap").replace("\\", "/")).name
        source = re.sub(r"[^A-Za-z0-9_. -]", "_", source)[:200] or "capture.pcap"
        with TemporaryDirectory(prefix="causalpacket-upload-") as directory:
            path = Path(directory) / "capture.bin"
            length = 0
            with path.open("wb") as destination:
                path.chmod(0o600)
                while chunk := await upload.read(65536):
                    length += len(chunk)
                    if length > DEFAULT_CONFIG.max_file_bytes:
                        raise AnalysisError("file_too_large", "Capture exceeds the 25 MiB limit.", 413)
                    destination.write(chunk)
            return await process_capture(path, context, source)


@app.post("/api/samples/{sample_id}/analyze", response_model=AnalysisReport)
async def analyze_sample(sample_id: str, request: Request):
    if sample_id not in SAMPLES:
        raise AnalysisError("not_found", "Unknown sample capture.", 404)
    path = SAMPLE_ROOT / SAMPLES[sample_id][0]
    if not path.is_file():
        raise AnalysisError("sample_unavailable", "Generate the sample captures first.", 404)
    return await process_capture(path, await json_context(request), path.name, sample_id)


@app.post("/api/analyses/{analysis_id}/reinterpret", response_model=AnalysisReport)
async def reinterpret(analysis_id: str, request: Request):
    report = reinterpret_report(store.get(analysis_id), await json_context(request))
    store.put(report)
    return report


@app.get("/api/analyses/{analysis_id}/evidence", response_model=EvidencePage)
async def evidence(analysis_id: str, frame_numbers: Annotated[str | None, Query(max_length=2048)] = None,
                   offset: Annotated[int, Query(ge=0, le=4000)] = 0,
                   limit: Annotated[int, Query(ge=1, le=200)] = 100):
    report = store.get(analysis_id)
    frames = None
    if frame_numbers is not None:
        try:
            if len(frame_numbers.split(",")) > 128:
                raise ValueError()
            frames = {int(value) for value in frame_numbers.split(",")}
            if not frames or min(frames) < 1:
                raise ValueError()
        except ValueError:
            raise AnalysisError("invalid_request", "Provide up to 128 positive, comma-separated frame numbers.") from None
    selected = tuple(p for p in report.evidence if frames is None or p.frame_number in frames)
    return EvidencePage(analysis_id=analysis_id, evidence=selected[offset:offset + limit], total_matching=len(selected), offset=offset, limit=limit)


@app.delete("/api/analyses/{analysis_id}", status_code=204)
async def delete_analysis(analysis_id: str) -> None:
    store.delete(analysis_id)


@app.get('/api/analyses/{analysis_id}/export', response_class=Response)
async def export_report(analysis_id: str, format: Literal['json','markdown']='markdown'):
    report=store.get(analysis_id)
    payload=(report.model_dump_json(indent=2) if format=='json' else render_markdown(report)).encode('utf-8')
    if len(payload)>DEFAULT_CONFIG.max_output_bytes*2:
        raise AnalysisError('analysis_limit','Export exceeds the bounded report budget.')
    extension='json' if format=='json' else 'md'
    media='application/json' if format=='json' else 'text/markdown'
    return Response(content=payload,media_type=media,
        headers={'Content-Disposition':f'attachment; filename="causalpacket-{report.analysis_id}.{extension}"',
                 'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'})
