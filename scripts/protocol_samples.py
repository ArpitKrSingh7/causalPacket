"""Deterministic ARP/DNS examples; craft bytes only, never transmit traffic."""
import random
import socket
import struct

from backend.core.offline_scapy import ARP, Ether, IP, UDP
from scripts.generate_samples import exchange

CLIENT_MAC = '02:00:00:00:00:10'
MAC_A, MAC_B = '02:00:00:00:00:01', '02:00:00:00:00:02'


def arp_claim(time, address='192.0.2.1', mac=MAC_A, target='192.0.2.10', operation=2):
    packet = Ether(src=mac, dst=CLIENT_MAC) / ARP(op=operation, hwsrc=mac, psrc=address, hwdst=CLIENT_MAC, pdst=target)
    return time, bytes(packet)


def dns_payload(txid=1, name='portal.test', rcode=0, response=False, qtype=1, qclass=1, truncated=False):
    question = b''.join(bytes([len(label)])+label.encode() for label in name.rstrip('.').split('.')) + b'\0' + struct.pack('!HH', qtype, qclass)
    flags = 0x0100 | (0x8080 if response else 0) | (0x200 if truncated else 0) | rcode
    answer = b''
    if response and rcode == 0 and qtype == 1 and qclass == 1:
        answer = b'\xc0\x0c' + struct.pack('!HHIH',1,1,60,4) + socket.inet_aton('198.51.100.20')
    return struct.pack('!HHHHHH',txid,flags,1,1 if answer else 0,0,0) + question + answer


def dns_exchange(time, client='192.0.2.10', resolver='198.51.100.53', sport=53000, txid=1,
                 name='portal.test', rcode=0, delay=.02, next_hop=MAC_A, qtype=1, qclass=1):
    query = Ether(src=CLIENT_MAC,dst=next_hop)/IP(src=client,dst=resolver)/UDP(sport=sport,dport=53)/dns_payload(txid,name,qtype=qtype,qclass=qclass)
    response = Ether(src=next_hop,dst=CLIENT_MAC)/IP(src=resolver,dst=client)/UDP(sport=53,dport=sport)/dns_payload(txid,name,rcode,True,qtype,qclass)
    return [(time,bytes(query)),(time+delay,bytes(response))]


def routed_exchange(time, client, next_hop, **kwargs):
    rows = []
    for when, raw in exchange(time, client=client, **kwargs):
        packet = Ether(raw)
        packet.src, packet.dst = (CLIENT_MAC,next_hop) if packet[IP].src == client else (next_hop,CLIENT_MAC)
        rows.append((when,bytes(packet)))
    return rows


def make_protocol_scenarios(seed=42):
    client = f'192.0.2.{random.Random(seed).randrange(10,100)}'
    gateway = [arp_claim(0,target=client)]
    gateway += dns_exchange(.1,client=client)
    gateway += routed_exchange(.4,client,MAC_A,sport=40000)
    gateway += [arp_claim(2,mac=MAC_B,target=client)]
    for i in range(3):
        gateway += dns_exchange(3+i*.3,client=client,sport=53001+i,txid=2+i,rcode=2,next_hop=MAC_B)
        gateway += routed_exchange(4+i*.3,client,MAC_B,sport=40001+i,sequence=1000+i*100,rejected=True)
    dns_faults = dns_exchange(0,client=client) + dns_exchange(.3,client=client,sport=53100,txid=100,name='missing.test',rcode=3)
    for i in range(6):
        dns_faults += dns_exchange(1+i*.4,client=client,sport=53001+i,txid=2+i,rcode=2 if i<3 else 5)
    # Last query has no response and insufficient subsequent observation time.
    dns_faults += dns_exchange(5,client=client,sport=53999,txid=999)[:1]
    arp_healthy = [arp_claim(0,address='0.0.0.0',target='192.0.2.99',operation=1),
                   arp_claim(.2,address='0.0.0.0',target='192.0.2.99',mac=MAC_B,operation=1),
                   arp_claim(.4,address='192.0.2.99',target='192.0.2.99',mac=MAC_B,operation=1)]
    dns_healthy = dns_exchange(0,client=client,txid=7,name='a.test')
    dns_healthy += dns_exchange(.01,client='192.0.2.201',txid=7,name='b.test')
    dns_healthy += dns_exchange(.2,client=client,sport=53100,txid=7,name='missing.test',rcode=3)
    scenarios = {'04_gateway_transition.pcap':gateway, '06_dns_faults.pcap':dns_faults,
                 '08_arp_healthy.pcap':arp_healthy, '09_dns_healthy.pcap':dns_healthy}
    truth = {
        '04_gateway_transition.pcap':{'expected':['ARP_IDENTITY_CHANGE','DNS_RESPONSE_ERROR','TCP_CONNECTION_REFUSED'], 'forbidden':['SCAN_PATTERN'],
            'incidents':1, 'association_edges':2, 'context_applied_automatically':False,
            'suggested_context':{'gateway_ip':'192.0.2.1','approved_gateway_macs':[MAC_A],'authorized_scanner_ips':[]},
            'alibi_context':{'gateway_ip':'192.0.2.1','approved_gateway_macs':[MAC_A,MAC_B],'authorized_scanner_ips':[]}},
        '06_dns_faults.pcap':{'expected':['DNS_RESPONSE_ERROR'],'forbidden':['DNS_UNANSWERED','SCAN_PATTERN'],'servfail':3,'refused':3},
        '08_arp_healthy.pcap':{'expected':[],'forbidden':['ARP_IDENTITY_CHANGE']},
        '09_dns_healthy.pcap':{'expected':[],'forbidden':['DNS_RESPONSE_ERROR','DNS_UNANSWERED']},
    }
    return scenarios, truth
