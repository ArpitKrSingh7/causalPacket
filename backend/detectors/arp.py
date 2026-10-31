"""Observe address identity changes without deciding device authorization."""
from dataclasses import dataclass, field
from ipaddress import IPv4Address


@dataclass
class ClaimHistory:
    scope: str
    address: str
    claims: dict = field(default_factory=dict)
    transitions: list = field(default_factory=list)
    previous_mac: str | None = None
    packet_count: int = 0
    last: float = 0

    @property
    def evidence(self):
        packets = {p.frame_number: p for p in self.claims.values()}
        packets.update((p.frame_number, p) for _, _, p in self.transitions)
        return [packets[k] for k in sorted(packets)]


class ARPTracker:
    def __init__(self, config):
        self.config = config
        self.histories = {}
        self.limit_reached = False

    def consume(self, event):
        p, mac = event.evidence, event.arp_claim_mac
        if p.protocol != 'ARP' or event.arp_operation not in (1, 2) or not mac:
            return
        address = IPv4Address(p.source_ip)
        # Address probes deliberately use 0.0.0.0 and are not ownership claims.
        if address.is_unspecified or address.is_multicast or str(address) == '255.255.255.255':
            return
        if int(mac.split(':')[0], 16) & 1 or mac == '00:00:00:00:00:00':
            return
        key = (p.scope_id, str(address))
        if key not in self.histories:
            if len(self.histories) >= self.config.max_arp_addresses:
                self.limit_reached = True
                return
            self.histories[key] = ClaimHistory(*key)
        history = self.histories[key]
        if mac not in history.claims:
            if len(history.claims) >= 8:
                self.limit_reached = True
                return
            history.claims[mac] = p
        if history.previous_mac and history.previous_mac != mac and len(history.transitions) < 16:
            history.transitions.append((history.previous_mac, mac, p))
        history.previous_mac = mac
        history.packet_count += 1
        history.last = max(history.last, p.time_offset_seconds)
