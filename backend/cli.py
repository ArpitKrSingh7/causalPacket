"""Run the same supervised analysis as the API, without a web server."""
import argparse
import asyncio
import json
from pathlib import Path
from backend.core.errors import AnalysisError
from backend.core.models import NetworkContext
from backend.core.supervisor import run_analysis
from backend.core.reporting import render_markdown, render_text


def main():
    parser = argparse.ArgumentParser(description="CausalPacket offline investigation")
    parser.add_argument("capture", type=Path)
    formats=parser.add_mutually_exclusive_group()
    formats.add_argument("--json", action="store_true", help="Print header-only report JSON")
    formats.add_argument("--markdown", action="store_true", help="Print a shareable Markdown investigation report")
    parser.add_argument("--context", type=Path, help="Optional NetworkContext JSON file")
    args = parser.parse_args()
    try:
        context = NetworkContext.model_validate_json(args.context.read_bytes()) if args.context else NetworkContext()
        report = asyncio.run(run_analysis(args.capture, context))
    except (AnalysisError, OSError, ValueError) as error:
        print(json.dumps({"error": {"code": getattr(error, "code", "invalid_request"), "message": getattr(error, "message", "Check the capture path and context file.")}}))
        raise SystemExit(1)
    if args.json:
        print(json.dumps(report.model_dump(mode='json'),indent=2,ensure_ascii=True))
    elif args.markdown:
        print(render_markdown(report),end='')
    else:
        print(render_text(report),end='')


if __name__ == "__main__":
    main()
