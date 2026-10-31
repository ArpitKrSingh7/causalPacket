import struct
from dataclasses import replace
import pytest

from backend.core.analyzer import analyze_capture
from backend.core.config import DEFAULT_CONFIG
from backend.core.errors import AnalysisError
from scripts.generate_samples import BASE_TIME, exchange, write_pcap


@pytest.mark.parametrize('endian', ['<', '>'])
@pytest.mark.parametrize('nano', [False, True])
def test_four_classic_formats(tmp_path, endian, nano):
    path = tmp_path/'valid.pcap'; write_pcap(path, exchange(0), endian=endian, nano=nano)
    report = analyze_capture(path)
    assert report.coverage.packets_decoded == 3 and not report.incidents
    assert report.coverage.duration_seconds == pytest.approx(.03, abs=1e-6)


@pytest.mark.parametrize('payload', [b'', b'not a capture', b'PK\x03\x04', b'\xd4\xc3\xb2\xa1'])
def test_invalid_formats_controlled(tmp_path, payload):
    path = tmp_path/'bad'; path.write_bytes(payload)
    with pytest.raises(AnalysisError):
        analyze_capture(path)


def test_truncated_preserves_prefix(captures):
    report = analyze_capture(captures/'07_truncated.pcap')
    assert report.coverage.status == 'partial'
    assert report.coverage.packets_decoded == 59 and report.coverage.packets_skipped == 1
    assert not report.incidents


def test_declared_size_rejected_before_read(tmp_path):
    path = tmp_path/'huge.pcap'; write_pcap(path, [])
    with path.open('ab') as stream:
        stream.write(struct.pack('<IIII', BASE_TIME, 0, 0xffffffff, 0xffffffff))
    report = analyze_capture(path)
    assert report.coverage.status == 'partial' and report.coverage.packets_skipped == 1


def test_file_size_limit_checked(tmp_path):
    path = tmp_path/'large'; path.write_bytes(b'x'*64)
    with pytest.raises(AnalysisError) as caught:
        analyze_capture(path, config=replace(DEFAULT_CONFIG, max_file_bytes=32))
    assert caught.value.status == 413


def test_unsupported_link_type_not_silent_healthy(tmp_path):
    path = tmp_path/'other.pcap'; write_pcap(path, exchange(0), linktype=101)
    report = analyze_capture(path)
    assert report.coverage.status == 'limited' and report.coverage.packets_skipped == 3
    assert any('Unsupported link' in n for n in report.coverage.visibility_notes)


def block(kind, body, endian='<'):
    length = 12 + len(body)
    return struct.pack(endian+'II', kind, length) + body + struct.pack(endian+'I', length)


def ng_capture(rows, endian='<', interfaces=1):
    result = block(0x0a0d0d0a, struct.pack(endian+'IHHq', 0x1a2b3c4d, 1, 0, -1), endian)
    for _ in range(interfaces):
        result += block(1, struct.pack(endian+'HHI', 1, 0, 262144), endian)
    for frame, (time, packet) in enumerate(rows):
        ticks = int(round((BASE_TIME + time)*1_000_000))
        body = struct.pack(endian+'IIIII', frame % interfaces, ticks >> 32, ticks & 0xffffffff, len(packet), len(packet))
        body += packet + b'\0'*((-len(packet))%4)
        result += block(6, body, endian)
    return result


@pytest.mark.parametrize('endian', ['<', '>'])
def test_pcapng_byte_orders_and_packet_numbering(tmp_path, endian):
    path = tmp_path/'valid.pcapng'; path.write_bytes(ng_capture(exchange(0), endian))
    report = analyze_capture(path)
    assert report.coverage.format == 'pcapng' and report.coverage.packets_decoded == 3
    assert report.coverage.status == 'complete' and not report.incidents


def test_interfaces_not_combined_into_false_handshake(tmp_path):
    rows = []
    for i in range(3):
        rows += exchange(i*.1, sport=50000+i, rejected=True)
    path = tmp_path/'multi.pcapng'; path.write_bytes(ng_capture(rows, interfaces=2))
    report = analyze_capture(path)
    # SYNs on interface 0 and RSTs on interface 1 cannot match.
    assert not report.incidents
    assert report.coverage.packets_decoded == 6


def test_malformed_frame_does_not_renumber_later_evidence(tmp_path):
    rows = [(0, b'bad')]
    for i in range(3):
        rows += exchange(1+i*.1, sport=50000+i, rejected=True)
    path = tmp_path/'skip.pcap'; write_pcap(path, rows)
    report = analyze_capture(path)
    assert report.coverage.packets_skipped == 1
    assert min(p.frame_number for p in report.evidence) == 2
    assert max(p.frame_number for p in report.evidence) == 7


def test_pcapng_excessive_length_stops_before_body_allocation(tmp_path):
    prefix = ng_capture(exchange(0))
    path = tmp_path/'oversize.pcapng'
    path.write_bytes(prefix + struct.pack('<II', 6, 0xfffffffc))
    report = analyze_capture(path)
    assert report.coverage.status == 'partial' and report.coverage.packets_decoded == 3


def test_regressing_clock_disables_scan_timing(tmp_path):
    rows=[]
    for i in range(20):
        rows += exchange(1+i*.1, sport=40000+i, dport=8000+i, rejected=True)
    path=tmp_path/'clock.pcap'; write_pcap(path, rows)
    data=bytearray(path.read_bytes())
    # Put the first SYN after all subsequent timestamps, retaining file order.
    struct.pack_into('<I', data, 24, BASE_TIME+100)
    path.write_bytes(data)
    report=analyze_capture(path)
    assert report.coverage.status == 'limited'
    assert all(o.type != 'SCAN_PATTERN' for o in report.observations)
    assert any('timestamps regress' in n for n in report.coverage.visibility_notes)
