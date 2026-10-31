"""A hard wall timeout and bounded output across the worker boundary."""
import asyncio
import json
import os
import subprocess
import sys
from dataclasses import asdict
from pathlib import Path
from tempfile import TemporaryDirectory
from time import monotonic

from backend.core.config import DEFAULT_CONFIG
from backend.core.errors import AnalysisError
from backend.core.models import AnalysisReport, NetworkContext

ROOT = Path(__file__).resolve().parents[2]


async def run_analysis(path, context=None, source_name=None, sample_id=None, config=DEFAULT_CONFIG):
    with TemporaryDirectory(prefix="causalpacket-worker-") as directory:
        root = Path(directory)
        root.chmod(0o700)
        settings, output = root / "request.json", root / "report.json"
        settings.write_text(json.dumps({"context": (context or NetworkContext()).model_dump(mode="json"),
            "source_name": source_name or Path(path).name, "sample_id": sample_id, "config": asdict(config)}))
        settings.chmod(0o600)
        process = subprocess.Popen([sys.executable, "-m", "backend.worker", str(Path(path).resolve()), str(settings), str(output)],
            cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"})
        try:
            deadline = monotonic() + config.worker_wall_seconds
            # Polling waitpid(WNOHANG) keeps the API event loop responsive and
            # also works in restricted runtimes without async child watchers.
            while process.poll() is None:
                if monotonic() >= deadline:
                    raise AnalysisError("analysis_timeout", "Analysis exceeded its time budget. Try a smaller capture.", 504)
                await asyncio.sleep(.02)
        finally:
            if process.poll() is None:
                process.kill()
                process.wait(timeout=2)
        if process.returncode != 0 or not output.exists():
            raise AnalysisError("analysis_failed", "The worker stopped safely without a valid report. Try a smaller or supported capture.")
        if output.stat().st_size > config.max_output_bytes:
            raise AnalysisError("analysis_limit", "The report exceeded its output budget.")
        try:
            data = json.loads(output.read_bytes())
            if "worker_error" in data:
                error = data["worker_error"]
                raise AnalysisError(error["code"], error["message"], error["status"])
            return AnalysisReport.model_validate(data)
        except (ValueError, KeyError, TypeError):
            raise AnalysisError("analysis_failed", "The worker could not produce a valid bounded report.") from None
