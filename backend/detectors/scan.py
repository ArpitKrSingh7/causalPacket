"""Bounded sliding windows over distinct attempts, with observable outcomes."""
from collections import Counter, deque
from dataclasses import dataclass
from itertools import islice


@dataclass(frozen=True)
class ScanWindow:
    scope: str
    client: str
    target: str
    kind: str
    start: float
    end: float
    attempts: int
    diversity: int
    rejected: int
    responsive: int
    total_evidence: int
    examples: tuple


def scan_windows(attempts, config):
    """Keep the strongest window per source/target pattern, never per SYN retry."""
    groups = {}
    for attempt in attempts:
        for kind, target in (("ports", attempt.server), ("hosts", str(attempt.dport))):
            groups.setdefault((attempt.scope, attempt.client, target, kind), []).append(attempt)
    results = []
    for (scope, client, target, kind), entries in sorted(groups.items()):
        window, diversity = deque(), Counter()
        rejected = responsive = packet_count = 0
        best, best_score = None, None
        for entry in sorted(entries, key=lambda a: (a.start, a.evidence[0].frame_number)):
            value = entry.dport if kind == "ports" else entry.server
            window.append(entry)
            diversity[value] += 1
            rejected += entry.outcome == "rejected"
            responsive += entry.outcome in ("responsive", "completed")
            packet_count += entry.packet_count
            while window and entry.start - window[0].start > config.scan_window_seconds:
                old = window.popleft()
                old_value = old.dport if kind == "ports" else old.server
                diversity[old_value] -= 1
                if diversity[old_value] == 0:
                    del diversity[old_value]
                rejected -= old.outcome == "rejected"
                responsive -= old.outcome in ("responsive", "completed")
                packet_count -= old.packet_count
            if len(diversity) < config.scan_min_diversity:
                continue
            known = rejected + responsive
            suspicious = known > 0 and known >= config.scan_min_known_outcomes and rejected / known >= config.scan_rejected_ratio
            uncertain = known < config.scan_min_known_outcomes and len(window) > known
            if not suspicious and not uncertain:
                continue
            score = (suspicious, rejected, len(diversity), len(window))
            if best_score is None or score > best_score:
                best_score = score
                best = ScanWindow(scope, client, target, kind, window[0].start, entry.start,
                    len(window), len(diversity), rejected, responsive, packet_count, tuple(islice(window, 32)))
        if best:
            results.append(best)
    return results
