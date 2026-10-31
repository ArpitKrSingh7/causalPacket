"""Directional TCP attempt tracking shared by fault and scan detectors."""
from __future__ import annotations

from dataclasses import dataclass, field

from backend.core.config import AnalysisConfig
from backend.core.parser import PacketEvent


@dataclass
class Attempt:
    scope: str
    client: str
    server: str
    sport: int
    dport: int
    sequence: int
    expected_ack: int
    start: float
    last: float
    evidence: list = field(default_factory=list)
    packet_count: int = 1
    syn_count: int = 1
    outcome: str = "unanswered"
    server_sequence: int | None = None
    response_time: float | None = None

    def retain(self, packet):
        self.packet_count += 1
        self.last = max(self.last, packet.time_offset_seconds)
        if len(self.evidence) < 6:
            self.evidence.append(packet)


class TCPTracker:
    def __init__(self, config: AnalysisConfig):
        self.config = config
        self.attempts = []
        self.active = {}
        self.limit_reached = False

    def consume(self, event: PacketEvent):
        p = event.evidence
        if p.protocol != "TCP":
            return
        key = (p.scope_id, str(p.source_ip), str(p.destination_ip), p.source_port, p.destination_port)
        reverse = (p.scope_id, str(p.destination_ip), str(p.source_ip), p.destination_port, p.source_port)
        flags = event.tcp_flags
        if flags & 2 and not flags & (16 | 4):
            old = self.active.get(key)
            if old and old.sequence == event.seq and 0 <= p.time_offset_seconds - old.start <= self.config.attempt_lifetime_seconds:
                # Closed-attempt duplicate SYNs may be capture duplication. Do
                # not turn them into new failed attempts or scan diversity.
                if old.outcome == "unanswered":
                    old.syn_count += 1
                    old.packet_count += 1
                    old.last = max(old.last, p.time_offset_seconds)
                    # Reserve room for positive outcome packets after retries.
                    if len(old.evidence) < 3:
                        old.evidence.append(p)
                return
            if len(self.attempts) >= self.config.max_attempts:
                self.limit_reached = True
                return
            attempt = Attempt(p.scope_id, str(p.source_ip), str(p.destination_ip), p.source_port,
                              p.destination_port, event.seq, (event.seq + 1 + event.payload_length) & 0xffffffff,
                              p.time_offset_seconds, p.time_offset_seconds, evidence=[p])
            self.active[key] = attempt
            self.attempts.append(attempt)
            return
        inbound = self.active.get(reverse)
        if inbound and 0 <= p.time_offset_seconds - inbound.start <= self.config.attempt_lifetime_seconds:
            if flags & 16 and event.ack == inbound.expected_ack and inbound.outcome == "unanswered":
                if flags & 4:
                    inbound.outcome = "rejected"
                    inbound.retain(p)
                    inbound.response_time = p.time_offset_seconds
                    return
                if flags & 2:
                    inbound.outcome = "responsive"
                    inbound.server_sequence = event.seq
                    inbound.response_time = p.time_offset_seconds
                    inbound.retain(p)
                    return
        outbound = self.active.get(key)
        if outbound and outbound.outcome == "responsive" and flags & 16 and not flags & (2 | 4) and 0 <= p.time_offset_seconds - outbound.start <= self.config.attempt_lifetime_seconds:
            if event.ack == (outbound.server_sequence + 1) & 0xffffffff and event.seq == outbound.expected_ack:
                outbound.outcome = "completed"
                outbound.retain(p)
