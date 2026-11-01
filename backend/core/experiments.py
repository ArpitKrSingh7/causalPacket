"""Bounded synthetic evidence experiments; never modify an uploaded capture."""
from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Annotated, Literal

from pydantic import Field

from backend.core.models import AnalysisReport, ContractModel, NetworkContext
from backend.core.offline_scapy import Ether, IP, TCP
from backend.core.supervisor import run_analysis
from scripts.generate_samples import make_scenarios, write_pcap
from scripts.protocol_samples import MAC_A, MAC_B, make_protocol_scenarios


class ExperimentRequest(ContractModel):
    seed: Annotated[int, Field(strict=True, ge=0, le=1_000_000)] = 42


class ExperimentCase(ContractModel):
    id: str
    family: Literal['scan_visibility', 'healthy_control', 'irrelevant_control', 'gateway_link']
    description: str
    source_packets: int
    removed_source_frames: tuple[int, ...]
    edited_source_frames: tuple[int, ...]
    # Entry n maps derived frame n+1 to its source capture's original frame.
    source_frame_map: tuple[int, ...]
    report: AnalysisReport


class ExperimentReport(ContractModel):
    schema_version: Literal['1.0'] = '1.0'
    data_origin: Literal['synthetic_experiment'] = 'synthetic_experiment'
    seed: int
    explanation: str = ('These are separate, deliberately modified synthetic captures, '
        'reanalyzed by the real worker. They test dependence on evidence, not '
        'the physical effect of removing network traffic. Original user analyses are untouched.')
    limitations: tuple[str, ...] = (
        'A generated demonstration is not a production accuracy or false-positive estimate.',
        'Response removal is controlled visibility loss, not a statistical packet-loss model.',
        'Frame numbers belong to each derived capture; source_frame_map preserves their original references.',
        'An unresolved result or absent finding never certifies safety.',
    )
    cases: tuple[ExperimentCase, ...]


def variants(seed):
    scenarios, _ = make_scenarios(seed)
    scan = sorted(scenarios['03_possible_scan.pcap'], key=lambda row: row[0])
    resets = [i for i, (_, raw) in enumerate(scan, 1) if Ether(raw)[TCP].flags & 4]
    for retained in (20, 15, 10, 5, 0):
        removed = set(resets[retained:])
        yield ('scan-'+str(retained), 'scan_visibility',
            f'Retain all 20 probes and {retained} of 20 reset replies. '
            'The detector must distinguish known rejected outcomes from missing evidence.',
            scan, removed, {})
    healthy = sorted(scenarios['01_healthy.pcap'], key=lambda row: row[0])
    yield ('healthy-diversity', 'healthy_control',
        'Twenty successfully contacted ports: destination diversity alone must not establish a scan.',
        healthy, set(), {})
    mixed = sorted(scenarios['05_mixed_scan_and_fault.pcap'], key=lambda row: row[0])
    yield ('mixed-original', 'irrelevant_control',
        'Scan and independent service fault with the earlier successful handshake retained.',
        mixed, set(), {})
    background = {i for i, (time, _) in enumerate(mixed, 1) if time < 1}
    yield ('mixed-no-baseline', 'irrelevant_control',
        'Remove only the three earlier healthy-handshake packets. '
        'The success comparator disappears, but scan and service-refusal findings must survive.',
        mixed, background, {})
    protocol, _ = make_protocol_scenarios(seed)
    gateway = sorted(protocol['04_gateway_transition.pcap'], key=lambda row: row[0])
    yield ('gateway-linked', 'gateway_link',
        'ARP change and later client symptoms have actual next-hop MAC linkage.',
        gateway, set(), {})
    edits = {}
    for i, (time, raw) in enumerate(gateway, 1):
        packet = Ether(raw)
        if time >= 2 and IP in packet and packet.dst == MAC_B:
            packet.dst = MAC_A
            edits[i] = bytes(packet)
    yield ('gateway-unlinked', 'gateway_link',
        'Keep the same timestamps, IP traffic and ARP claims, but address later '
        'client IP frames to the old gateway MAC. Timing alone must not create association edges.',
        gateway, set(), edits)


async def run_experiment(seed=42):
    seed = ExperimentRequest(seed=seed).seed
    cases = []
    with TemporaryDirectory(prefix='causalpacket-lab-') as directory:
        for case_id, family, description, original, removed, edits in variants(seed):
            mapping = tuple(i for i in range(1, len(original)+1) if i not in removed)
            rows = [(time, edits.get(i, raw)) for i, (time, raw) in enumerate(original, 1) if i not in removed]
            path = Path(directory)/(case_id+'.pcap')
            write_pcap(path, rows)
            context = NetworkContext(gateway_ip='192.0.2.1', approved_gateway_macs=(MAC_A,)) if family == 'gateway_link' else NetworkContext()
            report = await run_analysis(path, context, source_name='SYNTHETIC LAB: '+case_id+'.pcap')
            cases.append(ExperimentCase(id=case_id, family=family, description=description,
                source_packets=len(original), removed_source_frames=tuple(sorted(removed)),
                edited_source_frames=tuple(sorted(edits)), source_frame_map=mapping, report=report))
    return ExperimentReport(seed=seed, cases=tuple(cases))
