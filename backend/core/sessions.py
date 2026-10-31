"""Bounded metadata-only local sessions; captures are never cached."""
from collections import OrderedDict
from time import monotonic

from backend.core.errors import AnalysisError


class ReportStore:
    def __init__(self, max_sessions=3, ttl_seconds=1800, max_bytes=6 * 1024 * 1024):
        self.max_sessions, self.ttl_seconds, self.max_bytes = max_sessions, ttl_seconds, max_bytes
        self.entries = OrderedDict()

    def expire(self):
        for key, (expiry, _, _) in list(self.entries.items()):
            if expiry <= monotonic():
                self.entries.pop(key, None)

    def put(self, report):
        self.expire()
        size = len(report.model_dump_json().encode())
        if size > self.max_bytes:
            raise AnalysisError("analysis_limit", "Report exceeds the metadata-session budget.")
        self.entries.pop(report.analysis_id, None)
        while self.entries and (len(self.entries) >= self.max_sessions or sum(v[2] for v in self.entries.values()) + size > self.max_bytes):
            self.entries.popitem(last=False)
        self.entries[report.analysis_id] = (monotonic() + self.ttl_seconds, report, size)

    def get(self, analysis_id):
        self.expire()
        if analysis_id not in self.entries:
            raise AnalysisError("analysis_expired", "This analysis is unavailable or expired. Analyze the capture again.", 410)
        return self.entries[analysis_id][1]

    def delete(self, analysis_id):
        self.entries.pop(analysis_id, None)
