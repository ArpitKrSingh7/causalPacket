"""Bounded capture-container framing, followed by header-only normalization.

Container sizes are checked before reading bodies. Scapy handles Ethernet/IP/TCP
dissection only after a bounded record is obtained. Raw packet objects and bytes
are discarded after each event; no application payload reaches report models.
"""
from __future__ import annotations

import math
import struct
from dataclasses import dataclass
from pathlib import Path

from backend.core.config import AnalysisConfig, DEFAULT_CONFIG
from backend.core.errors import AnalysisError
from backend.core.dns_wire import DNSMessage, parse_dns
from backend.core.models import HeaderField, PacketEvidence
from backend.core.offline_scapy import Ether, IP, TCP, UDP, ARP

MAGICS = {
    b"\xd4\xc3\xb2\xa1": ("<", 1_000_000),
    b"\xa1\xb2\xc3\xd4": (">", 1_000_000),
    b"\x4d\x3c\xb2\xa1": ("<", 1_000_000_000),
    b"\xa1\xb2\x3c\x4d": (">", 1_000_000_000),
}
NG_MAGIC = b"\x0a\x0d\x0d\x0a"


@dataclass(frozen=True)
class RawRecord:
    frame: int
    timestamp: float
    scope: str
    linktype: int
    data: bytes


@dataclass(frozen=True)
class PacketEvent:
    evidence: PacketEvidence
    tcp_flags: int = 0
    seq: int = 0
    ack: int = 0
    payload_length: int = 0
    arp_claim_mac: str | None = None
    arp_operation: int = 0
    dns: DNSMessage | None = None


class CaptureReader:
    def __init__(self, path: Path, config: AnalysisConfig = DEFAULT_CONFIG):
        self.path, self.config = Path(path), config
        self.size = self.path.stat().st_size
        if self.size > config.max_file_bytes:
            raise AnalysisError("file_too_large", "Capture exceeds the 25 MiB processing limit.", 413)
        with self.path.open("rb") as stream:
            self.magic = stream.read(4)
        if self.magic not in MAGICS and self.magic != NG_MAGIC:
            raise AnalysisError("unsupported_capture", "Provide an uncompressed PCAP or PCAPNG capture.", 415)
        self.format = "pcapng" if self.magic == NG_MAGIC else "pcap"
        self.seen = self.decoded = self.skipped = 0
        self.start_time = None
        self.end_time = 0.0
        self.previous_time = None
        self.timing_reliable = True
        self.partial = False
        self.coverage_limited = False
        self.notes = []
        self.limits = []
        self.protocols = set()
        self.linktypes = set()

    def note(self, message: str):
        if message not in self.notes and len(self.notes) < 16:
            self.notes.append(message)

    def limit(self, name: str):
        if name not in self.limits:
            self.limits.append(name)

    def broken(self, message: str):
        self.partial = True
        self.note(message)

    def records(self):
        with self.path.open("rb") as stream:
            if self.format == "pcap":
                yield from self._classic(stream)
            else:
                yield from self._ng(stream)

    def _classic(self, stream):
        endian, scale = MAGICS[self.magic]
        header = stream.read(24)
        if len(header) != 24:
            raise AnalysisError("invalid_capture", "The PCAP file header is incomplete.")
        major, minor, _, _, snaplen, linktype = struct.unpack(endian + "HHIIII", header[4:])
        if (major, minor) != (2, 4) or snaplen == 0:
            raise AnalysisError("invalid_capture", "Unsupported or invalid PCAP header.")
        linktype &= 0xffff
        self.linktypes.add("Ethernet" if linktype == 1 else f"LINKTYPE_{linktype}")
        while stream.tell() < self.size:
            if self.seen >= self.config.max_packets:
                self.limit("packet_count")
                break
            self.seen += 1
            record = stream.read(16)
            if len(record) != 16:
                self.skipped += 1
                self.broken("Incomplete packet-record header; analysis stopped at the valid prefix.")
                break
            seconds, fraction, caplen, wirelen = struct.unpack(endian + "IIII", record)
            if caplen > self.config.max_record_bytes or caplen > snaplen or caplen > wirelen:
                self.skipped += 1
                self.broken("Invalid or excessive declared packet length; no record body was decoded.")
                break
            if caplen > self.size - stream.tell():
                self.skipped += 1
                self.broken("Truncated packet body; analysis stopped at the valid prefix.")
                break
            data = stream.read(caplen)
            if fraction >= scale:
                self.skipped += 1
                self.note("A packet with an invalid timestamp fraction was skipped.")
                continue
            if caplen < wirelen:
                self.note("Some packets were captured with truncated payloads; only complete supported headers are analyzed.")
            yield RawRecord(self.seen, seconds + fraction / scale, "section:0/interface:0", linktype, data)

    def _options(self, data, endian):
        offset = 0
        while offset < len(data):
            if len(data) - offset < 4:
                raise ValueError("Incomplete PCAPNG option")
            code, length = struct.unpack_from(endian + "HH", data, offset)
            offset += 4
            if code == 0:
                if length != 0:
                    raise ValueError("Invalid end option")
                return
            padded = (length + 3) & ~3
            if padded > len(data) - offset:
                raise ValueError("Excessive option length")
            yield code, data[offset:offset + length]
            offset += padded

    def _ng(self, stream):
        endian, interfaces, section = None, [], -1
        block_count = 0
        while stream.tell() < self.size:
            if self.seen >= self.config.max_packets:
                self.limit("packet_count")
                break
            block_count += 1
            if block_count > 200_000:
                self.limit("container_block_count")
                break
            prefix = stream.read(8)
            if len(prefix) != 8:
                self.broken("Incomplete PCAPNG block header; valid-prefix analysis only.")
                break
            is_section = prefix[:4] == NG_MAGIC
            if is_section:
                bom = stream.read(4)
                if bom not in (b"\x4d\x3c\x2b\x1a", b"\x1a\x2b\x3c\x4d"):
                    raise AnalysisError("invalid_capture", "Invalid PCAPNG byte-order marker.")
                endian = "<" if bom[0] == 0x4d else ">"
            elif endian is None:
                raise AnalysisError("invalid_capture", "A PCAPNG section header is required.")
            kind, length = struct.unpack(endian + "II", prefix)
            consumed = 12 if is_section else 8
            if length < (28 if is_section else 12) or length % 4 or length > self.config.max_block_bytes:
                self.broken("Invalid or excessive PCAPNG block length; parsing stopped before allocation.")
                break
            if length - consumed > self.size - stream.tell():
                self.broken("Truncated PCAPNG block; valid-prefix analysis only.")
                break
            remainder = stream.read(length - consumed)
            if struct.unpack(endian + "I", remainder[-4:])[0] != length:
                self.broken("PCAPNG block lengths disagree; parsing stopped.")
                break
            body = (bom if is_section else b"") + remainder[:-4]
            try:
                if is_section:
                    major, minor = struct.unpack_from(endian + "HH", body, 4)
                    if major != 1 or minor != 0:
                        raise ValueError("Unsupported PCAPNG version")
                    section += 1
                    interfaces = []
                    if section >= 64:
                        self.limit("section_count")
                        break
                elif kind == 1:
                    if len(body) < 8 or len(interfaces) >= 16:
                        raise ValueError("Invalid interface description or interface limit")
                    linktype, _, snaplen = struct.unpack_from(endian + "HHI", body)
                    scale, offset = 1_000_000, 0
                    for code, value in self._options(body[8:], endian):
                        if code == 9:
                            if len(value) != 1 or (value[0] & 127) > 63:
                                raise ValueError("Invalid timestamp resolution")
                            scale = (2 if value[0] & 128 else 10) ** (value[0] & 127)
                        elif code == 14:
                            if len(value) != 8:
                                raise ValueError("Invalid timestamp offset")
                            offset = struct.unpack(endian + "q", value)[0]
                    interfaces.append((linktype, snaplen, scale, offset))
                    self.linktypes.add("Ethernet" if linktype == 1 else f"LINKTYPE_{linktype}")
                elif kind == 6:
                    self.seen += 1
                    if len(body) < 20:
                        raise ValueError("Incomplete enhanced packet block")
                    index, high, low, caplen, wirelen = struct.unpack_from(endian + "IIIII", body)
                    if index >= len(interfaces):
                        raise ValueError("Unknown interface")
                    linktype, snaplen, scale, offset = interfaces[index]
                    if caplen > self.config.max_record_bytes or caplen > wirelen or (snaplen and caplen > snaplen) or ((caplen + 3) & ~3) > len(body) - 20:
                        raise ValueError("Invalid packet length")
                    if caplen < wirelen:
                        self.note("Some packets have truncated payloads; only complete supported headers are analyzed.")
                    timestamp = ((high << 32) | low) / scale + offset
                    yield RawRecord(self.seen, timestamp, f"section:{section}/interface:{index}", linktype, body[20:20 + caplen])
                elif kind in (2, 3):
                    self.seen += 1
                    self.skipped += 1
                    self.note("Simple/obsolete PCAPNG packet blocks are outside timestamped diagnostic coverage.")
            except (ValueError, struct.error):
                if kind == 6:
                    self.skipped += 1
                self.broken("Malformed PCAPNG structure; analysis stopped without attempting resynchronization.")
                break
        if section < 0:
            raise AnalysisError("invalid_capture", "No valid PCAPNG section could be read.")

    def events(self):
        for record in self.records():
            if not math.isfinite(record.timestamp):
                self.skipped += 1
                self.note("Invalid packet timestamp skipped.")
                continue
            if self.start_time is None:
                self.start_time = record.timestamp
            if self.previous_time is not None and record.timestamp < self.previous_time:
                self.timing_reliable = False
                self.note("Packet timestamps regress; scan-window and delay conclusions are disabled.")
            self.previous_time = record.timestamp
            time = max(0.0, record.timestamp - self.start_time)
            self.end_time = max(self.end_time, time)
            try:
                event = self._decode(record, time)
            except (ValueError, IndexError, struct.error, TypeError, OverflowError):
                self.skipped += 1
                self.note("Malformed or incomplete protocol headers were skipped.")
                continue
            if event is None:
                self.skipped += 1
                continue
            self.decoded += 1
            self.protocols.add(event.evidence.protocol)
            yield event

    def _decode(self, record, time):
        if record.linktype != 1:
            self.note("Unsupported link-layer records were counted but not decoded; Ethernet is supported.")
            return None
        data = record.data
        if len(data) < 14:
            raise ValueError("Short Ethernet header")
        kind, offset, vlans = struct.unpack_from("!H", data, 12)[0], 14, []
        while kind in (0x8100, 0x88a8):
            if len(data) < offset + 4 or len(vlans) >= 2:
                raise ValueError("Invalid VLAN header")
            tag, kind = struct.unpack_from("!HH", data, offset)
            vlans.append(str(tag & 0xfff))
            offset += 4
        scope = record.scope + "/vlan:" + (".".join(vlans) if vlans else "untagged")
        # Explicit header validation prevents malformed fields being mistaken for
        # a transport conversation by best-effort library dissection.
        fragmented = False
        if kind == 0x800:
            if len(data) < offset + 20:
                raise ValueError("Short IPv4 header")
            ihl = (data[offset] & 15) * 4
            total = struct.unpack_from("!H", data, offset + 2)[0]
            if data[offset] >> 4 != 4 or ihl < 20 or total < ihl or len(data) < offset + ihl:
                raise ValueError("Invalid IPv4 header")
            fragmented = bool(struct.unpack_from("!H", data, offset + 6)[0] & 0x3fff)
            proto, transport = data[offset + 9], offset + ihl
            available = min(total - ihl, len(data) - transport)
            if not fragmented and proto == 6:
                if available < 20:
                    raise ValueError("Short TCP header")
                tcp_header = (data[transport + 12] >> 4) * 4
                if tcp_header < 20 or tcp_header > available:
                    raise ValueError("Invalid TCP data offset")
            elif not fragmented and proto == 17 and available < 8:
                raise ValueError("Short UDP header")
        packet = Ether(data)
        fields = dict(frame_number=record.frame, time_offset_seconds=time, scope_id=scope,
                      source_mac=str(packet.src), destination_mac=str(packet.dst), captured_length=len(data))
        if kind == 0x806 and ARP in packet:
            arp = packet[ARP]
            if int(arp.hwlen) != 6 or int(arp.plen) != 4 or int(arp.ptype) != 0x800:
                raise ValueError("Unsupported ARP address format")
            if len(data) < offset + 28 or int(arp.hwtype) != 1:
                raise ValueError("Incomplete or non-Ethernet ARP")
            return PacketEvent(PacketEvidence(**fields, protocol="ARP", source_ip=arp.psrc, destination_ip=arp.pdst,
                summary="ARP address claim or request", headers=(HeaderField(name="ARP operation", value=str(arp.op)), HeaderField(name="Sender MAC", value=str(arp.hwsrc)))),
                arp_claim_mac=str(arp.hwsrc).lower(), arp_operation=int(arp.op))
        if kind == 0x800 and IP in packet:
            ip = packet[IP]
            fields.update(source_ip=ip.src, destination_ip=ip.dst)
            if fragmented:
                self.note("IP fragments are outside transport diagnostic coverage; no reassembly is performed.")
                return PacketEvent(PacketEvidence(**fields, protocol="IPv4", summary="Fragmented IPv4 packet"))
            if isinstance(ip.payload, TCP):
                tcp = ip.payload
                flags = int(tcp.flags)
                fields.update(source_port=int(tcp.sport), destination_port=int(tcp.dport))
                evidence = PacketEvidence(**fields, protocol="TCP", summary=f"TCP {str(tcp.flags)} {tcp.sport} → {tcp.dport}",
                    headers=(HeaderField(name="TCP flags", value=str(tcp.flags)), HeaderField(name="Sequence", value=str(tcp.seq)), HeaderField(name="Acknowledgment", value=str(tcp.ack))))
                payload_length = max(0, total - ihl - int(tcp.dataofs) * 4)
                return PacketEvent(evidence, flags, int(tcp.seq), int(tcp.ack), payload_length)
            if isinstance(ip.payload, UDP):
                udp = ip.payload
                fields.update(source_port=int(udp.sport), destination_port=int(udp.dport))
                if int(udp.len) < 8:
                    raise ValueError("Invalid UDP length")
                if 53 in (int(udp.sport), int(udp.dport)):
                    try:
                        if int(udp.len) > available:
                            raise ValueError("Truncated DNS datagram")
                        dns = parse_dns(data[transport + 8:transport + int(udp.len)])
                        if dns.truncated:
                            raise ValueError("Truncated DNS response requires TCP fallback")
                        return PacketEvent(PacketEvidence(**fields, protocol="DNS", summary="DNS response" if dns.is_response else "DNS query",
                            headers=(HeaderField(name="Transaction ID", value=str(dns.transaction_id)), HeaderField(name="Question fingerprint", value=dns.question_hash[:16]),
                                     HeaderField(name="Question type", value=str(dns.question_type)), HeaderField(name="Response code", value=str(dns.rcode)))), dns=dns)
                    except ValueError:
                        self.coverage_limited = True
                        self.note("A truncated, malformed, or unsupported DNS question was excluded from transaction matching; TCP DNS fallback is outside coverage.")
                return PacketEvent(PacketEvidence(**fields, protocol="UDP", summary=f"UDP {udp.sport} → {udp.dport}"))
            return PacketEvent(PacketEvidence(**fields, protocol="IPv4", summary="IPv4 packet outside TCP/UDP checks"))
        return PacketEvent(PacketEvidence(**fields, protocol="OTHER", summary="Ethernet frame outside supported protocol checks"))
