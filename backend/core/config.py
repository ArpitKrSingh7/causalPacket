"""Explicit analysis budgets and documented demonstration heuristics."""
from dataclasses import dataclass


@dataclass(frozen=True)
class AnalysisConfig:
    max_file_bytes: int = 25 * 1024 * 1024
    max_packets: int = 100_000
    max_record_bytes: int = 262_144
    max_block_bytes: int = 1024 * 1024
    max_attempts: int = 20_000
    max_dns_queries: int = 20_000
    max_arp_addresses: int = 4096
    max_observations: int = 500
    max_evidence: int = 4000
    max_output_bytes: int = 2 * 1024 * 1024
    worker_wall_seconds: float = 15
    worker_cpu_seconds: int = 10
    worker_memory_bytes: int = 512 * 1024 * 1024
    attempt_lifetime_seconds: float = 60
    unanswered_after_seconds: float = 3
    delay_threshold_seconds: float = .5
    minimum_fault_attempts: int = 3
    dns_timeout_seconds: float = 2
    dns_retry_window_seconds: float = 5
    correlation_window_seconds: float = 5
    scan_window_seconds: float = 10
    scan_min_diversity: int = 12
    scan_min_known_outcomes: int = 10
    scan_rejected_ratio: float = .8


DEFAULT_CONFIG = AnalysisConfig()
