"""Create deterministic synthetic captures. This script never sends traffic."""
import json
import random
import struct
from pathlib import Path

from backend.core.offline_scapy import Ether, IP, TCP

ROOT = Path(__file__).resolve().parents[1]
BASE_TIME = 1_800_000_000


def exchange(start, client="192.0.2.10", server="198.51.100.20", sport=50000, dport=443,
             sequence=100, rejected=False, delay=.02):
    def segment(source, dest, sp, dp, seq, ack, flags):
        return bytes(Ether(src="02:00:00:00:00:10", dst="02:00:00:00:00:20") /
            IP(src=source, dst=dest) / TCP(sport=sp, dport=dp, seq=seq, ack=ack, flags=flags))
    rows = [(start, segment(client, server, sport, dport, sequence, 0, "S")),
            (start + delay, segment(server, client, dport, sport, 9000, (sequence + 1) & 0xffffffff, "RA" if rejected else "SA"))]
    if not rejected:
        rows.append((start + delay + .01, segment(client, server, sport, dport, (sequence + 1) & 0xffffffff, 9001, "A")))
    return rows


def write_pcap(path, rows, endian="<", nano=False, linktype=1):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    scale = 1_000_000_000 if nano else 1_000_000
    magic = 0xa1b23c4d if nano else 0xa1b2c3d4
    with path.open("wb") as stream:
        stream.write(struct.pack(endian + "IHHIIII", magic, 2, 4, 0, 0, 262144, linktype))
        for time, payload in sorted(rows, key=lambda row: row[0]):
            ticks = int(round(time * scale))
            seconds, fraction = divmod(ticks, scale)
            stream.write(struct.pack(endian + "IIII", BASE_TIME + seconds, fraction, len(payload), len(payload)))
            stream.write(payload)


def make_scenarios(seed=42):
    rng = random.Random(seed)
    client = f"192.0.2.{rng.randrange(10, 100)}"
    scanner = f"192.0.2.{rng.randrange(101, 200)}"
    server = f"198.51.100.{rng.randrange(10, 200)}"
    healthy, failure, scan = [], [], []
    # Many successful destination ports are a deliberate negative control.
    for i in range(20):
        healthy += exchange(i * .2, client, server, sport=40000 + i, dport=8000 + i, sequence=1000 + i * 100)
    failure += exchange(0, client, server, sport=45000, dport=5432, sequence=900)
    for i in range(12):
        failure += exchange(1 + i * .2, client, server, sport=45001 + i, dport=5432, sequence=2000 + i * 100, rejected=True)
    for i in range(20):
        scan += exchange(1 + i * .1, scanner, server, sport=46000 + i, dport=1000 + i, sequence=5000 + i * 100, rejected=True)
    return {"01_healthy.pcap": healthy, "02_service_failure.pcap": failure,
            "03_possible_scan.pcap": scan, "05_mixed_scan_and_fault.pcap": failure + scan}, scanner


def generate(directory=None, seed=42):
    directory = Path(directory) if directory else ROOT / "samples"
    scenarios, scanner = make_scenarios(seed)
    from scripts.protocol_samples import make_protocol_scenarios
    protocol_scenarios, protocol_truth = make_protocol_scenarios(seed)
    scenarios.update(protocol_scenarios)
    for name, rows in scenarios.items():
        write_pcap(directory / name, rows)
    # Damage the final record while preserving the preceding valid exchanges.
    healthy = (directory / "01_healthy.pcap").read_bytes()
    (directory / "07_truncated.pcap").write_bytes(healthy[:-7])
    manifest = {
        "synthetic": True, "generator_version": "2", "seed": seed,
        "description": "Fictional lab captures written offline. No packets were sent.",
        "scenarios": {
            "01_healthy.pcap": {"expected": [], "forbidden": ["SCAN_PATTERN", "TCP_CONNECTION_REFUSED"]},
            "02_service_failure.pcap": {"expected": ["TCP_CONNECTION_REFUSED"], "forbidden": ["SCAN_PATTERN"], "refused_attempts": 12},
            "03_possible_scan.pcap": {"expected": ["SCAN_PATTERN"], "forbidden": ["TCP_CONNECTION_REFUSED"], "ports": 20,
                                      "suggested_context": {"authorized_scanner_ips": [scanner]}, "context_applied_automatically": False},
            "05_mixed_scan_and_fault.pcap": {"expected": ["SCAN_PATTERN", "TCP_CONNECTION_REFUSED"], "independent_incidents": 2},
            "07_truncated.pcap": {"coverage": "partial", "expected": [], "forbidden": ["SCAN_PATTERN"]},
        },
    }
    manifest['scenarios'].update(protocol_truth)
    gateway_truth = protocol_truth['04_gateway_transition.pcap']
    (directory / 'gateway-baseline.json').write_text(json.dumps(gateway_truth['suggested_context'], indent=2)+'\n')
    (directory / 'gateway-approved.json').write_text(json.dumps(gateway_truth['alibi_context'], indent=2)+'\n')
    (directory / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    return manifest


if __name__ == "__main__":
    result = generate()
    print(f"Generated {len(result['scenarios'])} synthetic captures and manifest under samples/.")
