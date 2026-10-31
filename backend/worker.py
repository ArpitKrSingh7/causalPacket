"""Single-use, resource-limited analysis process invoked by the supervisor."""
import json
import sys
from pathlib import Path

from backend.core.config import AnalysisConfig


def main():
    capture, settings, output = map(Path, sys.argv[1:4])
    request = json.loads(settings.read_text())
    config = AnalysisConfig(**request.get("config", {}))
    import resource
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    resource.setrlimit(resource.RLIMIT_CPU, (config.worker_cpu_seconds, config.worker_cpu_seconds))
    resource.setrlimit(resource.RLIMIT_AS, (config.worker_memory_bytes, config.worker_memory_bytes))
    resource.setrlimit(resource.RLIMIT_FSIZE, (config.max_output_bytes, config.max_output_bytes))
    try:
        from backend.core.analyzer import analyze_capture
        from backend.core.errors import AnalysisError
        from backend.core.models import NetworkContext
        result = analyze_capture(capture, NetworkContext.model_validate(request["context"]),
            source_name=request["source_name"], sample_id=request.get("sample_id"), config=config)
        payload = result.model_dump_json().encode()
        if len(payload) > config.max_output_bytes:
            raise AnalysisError("analysis_limit", "The report reached its output budget. Analyze a smaller capture.")
        output.write_bytes(payload)
    except Exception as exc:
        if hasattr(exc, "code") and hasattr(exc, "message"):
            error = {"code": exc.code, "message": exc.message, "status": exc.status}
        else:
            error = {"code": "analysis_failed", "message": "Analysis stopped safely. The capture may be malformed or exceed available resources.", "status": 422}
        output.write_text(json.dumps({"worker_error": error}))


if __name__ == "__main__":
    main()
