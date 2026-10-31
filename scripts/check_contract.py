"""Validate checked-in UI fixtures and the contract handoff without a running UI."""

import json
from pathlib import Path

from pydantic import ValidationError

from backend.core.models import AnalysisReport, NetworkContext

ROOT = Path(__file__).resolve().parents[1]


def main():
    reports = {}
    for path in sorted((ROOT / "frontend" / "fixtures").glob("*.json")):
        report = AnalysisReport.model_validate_json(path.read_text())
        if report.data_origin != "development_fixture":
            raise AssertionError(f"{path.name}: preview must identify itself as fictional")
        reports[path.name] = report.model_dump(mode="json")
    before = reports["gateway-before.json"]
    approved = reports["gateway-approved.json"]
    for field in ("analysis_id", "observations", "edges", "evidence", "coverage"):
        if before[field] != approved[field]:
            raise AssertionError(f"Preview pair changed immutable field: {field}")
    if not approved["interpretation_changes"][0]["remaining_problem"]:
        raise AssertionError("Context-change preview must retain the service problem")
    schema = json.loads((ROOT / "docs" / "report.schema.json").read_text())
    if schema != AnalysisReport.model_json_schema():
        raise AssertionError("JSON Schema drifted; regenerate it with the fixture script")
    for context in ({"gateway_ip": "not-an-ip"}, {"approved_gateway_macs": ["02:00:00:00:00:01"]}):
        try:
            NetworkContext.model_validate(context)
        except ValidationError:
            pass
        else:
            raise AssertionError("Invalid policy context was accepted")
    print(f"PASS: {len(reports)} fixtures, all evidence references, before/after invariants, schema and context checks.")


if __name__ == "__main__":
    main()
