"""Bounded RFC 1035 question parsing; domain text never enters stored metadata."""
from dataclasses import dataclass
from hashlib import sha256
import struct


@dataclass(frozen=True)
class DNSMessage:
    transaction_id: int
    is_response: bool
    question_hash: str
    question_type: int
    question_class: int
    rcode: int
    truncated: bool


def read_name(data: bytes, start: int):
    labels, cursor, consumed, visited = [], start, None, set()
    size = 1
    for _ in range(128):
        if cursor >= len(data) or cursor in visited:
            raise ValueError("Invalid DNS name offset or loop")
        visited.add(cursor)
        length = data[cursor]
        if length & 0xc0 == 0xc0:
            if cursor + 1 >= len(data) or len(visited) > 64:
                raise ValueError("Invalid compression pointer")
            if consumed is None:
                consumed = cursor + 2
            cursor = ((length & 63) << 8) | data[cursor + 1]
            continue
        if length & 0xc0:
            raise ValueError("Unsupported DNS label encoding")
        cursor += 1
        if length == 0:
            return b"".join(bytes((len(label),)) + label.lower() for label in labels) + b"\0", consumed or cursor
        if cursor + length > len(data):
            raise ValueError("Truncated DNS label")
        size += length + 1
        if size > 255:
            raise ValueError("DNS name exceeds protocol limit")
        labels.append(data[cursor:cursor + length])
        cursor += length
    raise ValueError("DNS name traversal limit reached")


def parse_dns(data: bytes) -> DNSMessage:
    if len(data) < 12:
        raise ValueError("Incomplete DNS header")
    txid, flags, questions, _, _, _ = struct.unpack_from("!HHHHHH", data)
    if questions != 1 or (flags >> 11) & 15:
        raise ValueError("Only single-question standard DNS messages are supported")
    name, end = read_name(data, 12)
    if end + 4 > len(data):
        raise ValueError("Incomplete DNS question")
    qtype, qclass = struct.unpack_from("!HH", data, end)
    return DNSMessage(txid, bool(flags & 0x8000), sha256(name).hexdigest(), qtype, qclass, flags & 15, bool(flags & 0x200))
