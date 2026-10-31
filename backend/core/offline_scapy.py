"""Configure Scapy strictly for file decoding, without interface discovery.

Scapy's interface reload normally opens a netlink socket on Linux. The analysis
process needs no interface inventory, routing table, sniffing, or live sockets.
This process-local configuration precedes all protocol-layer imports.
"""
from scapy.config import conf
import scapy.interfaces  # initializes conf.ifaces before architecture loading

conf.ifaces.reload = lambda: None
conf.route_autoload = False
conf.route6_autoload = False
conf.verb = 0

from scapy.layers.inet import IP, TCP, UDP, ICMP  # noqa: E402,F401
from scapy.layers.l2 import ARP, Dot1Q, Ether  # noqa: E402,F401
