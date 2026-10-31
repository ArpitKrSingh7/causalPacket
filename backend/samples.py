"""Allowlisted generated captures; URL inputs never become filesystem paths."""
from pathlib import Path
from backend.core.models import NetworkContext, SampleInfo

SAMPLE_ROOT = Path(__file__).resolve().parents[1] / "samples"
SAMPLES = {
    "healthy": ("01_healthy.pcap", "Healthy exchanges", "Completed TCP exchanges with no significant fault or scan findings."),
    "service-failure": ("02_service_failure.pcap", "Service failure", "Explicit refusals to one service, including an earlier successful exchange."),
    "possible-scan": ("03_possible_scan.pcap", "Possible scan", "Many distinct rejected ports within the configured window."),
    "gateway-transition": ("04_gateway_transition.pcap", "Gateway identity investigation", "An address identity change with packet-linked DNS errors and TCP refusals. Apply verified gateway context to compare explanations."),
    "mixed-scan-and-fault": ("05_mixed_scan_and_fault.pcap", "Scan and independent fault", "A probing source and an unrelated unavailable service."),
    "truncated": ("07_truncated.pcap", "Damaged capture", "A truncated record after valid traffic; demonstrates partial analysis."),
    "dns-faults": ("06_dns_faults.pcap", "DNS resolver errors", "Matched SERVFAIL/REFUSED responses; normal NXDOMAIN and an incomplete capture-tail request are controls."),
    "arp-healthy": ("08_arp_healthy.pcap", "Normal ARP probes", "Address probes and one address announcement; no conflicting ownership claim."),
    "dns-healthy": ("09_dns_healthy.pcap", "Healthy DNS and negative answers", "Matching across shared transaction IDs; normal NXDOMAIN is not an attack."),
}


def sample_catalog():
    return tuple(SampleInfo(id=key, title=value[1], description=value[2], available=(SAMPLE_ROOT / value[0]).is_file(),
        suggested_context=NetworkContext(gateway_ip='192.0.2.1', approved_gateway_macs=('02:00:00:00:00:01',)) if key=='gateway-transition' else NetworkContext()) for key,value in SAMPLES.items())
