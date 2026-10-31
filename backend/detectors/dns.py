"""Full-question UDP DNS matching with bounded state and retry deduplication."""
from dataclasses import dataclass, field


@dataclass
class DNSQuery:
    scope: str
    client: str
    resolver: str
    question_hash: str
    start: float
    last: float
    evidence: list = field(default_factory=list)
    packet_count: int = 1
    response_time: float | None = None
    rcode: int | None = None
    ambiguous: bool = False


class DNSTracker:
    def __init__(self, config):
        self.config = config
        self.queries = []
        self.active = {}
        self.limit_reached = False
        self.unmatched_responses = 0
        self.ambiguous_reuses = 0

    def consume(self, event):
        message, p = event.dns, event.evidence
        if message is None:
            return
        if message.is_response:
            if p.source_port != 53:
                self.unmatched_responses += 1
                return
            endpoints = (str(p.destination_ip), str(p.source_ip), p.destination_port, p.source_port)
        else:
            if p.destination_port != 53:
                return
            endpoints = (str(p.source_ip), str(p.destination_ip), p.source_port, p.destination_port)
        key = (p.scope_id, *endpoints, message.transaction_id, message.question_hash, message.question_type, message.question_class)
        old = self.active.get(key)
        if message.is_response:
            if old and not old.ambiguous and old.response_time is None and 0 <= p.time_offset_seconds - old.start <= self.config.attempt_lifetime_seconds:
                old.response_time = p.time_offset_seconds
                old.rcode = message.rcode
                old.last = max(old.last, p.time_offset_seconds)
                old.packet_count += 1
                old.evidence.append(p)
            elif old is None:
                self.unmatched_responses += 1
            return
        if old and old.response_time is None and 0 <= p.time_offset_seconds - old.start <= self.config.dns_retry_window_seconds:
            old.packet_count += 1
            old.last = max(old.last, p.time_offset_seconds)
            if len(old.evidence) < 3:
                old.evidence.append(p)
            return
        if len(self.queries) >= self.config.max_dns_queries:
            self.limit_reached = True
            return
        query = DNSQuery(p.scope_id, endpoints[0], endpoints[1], message.question_hash,
                         p.time_offset_seconds, p.time_offset_seconds, evidence=[p])
        if old and old.response_time is not None and 0 <= p.time_offset_seconds - old.response_time <= self.config.dns_retry_window_seconds:
            query.ambiguous = True
            self.ambiguous_reuses += 1
        self.queries.append(query)
        self.active[key] = query
