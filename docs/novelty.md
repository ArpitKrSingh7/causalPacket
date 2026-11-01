# Differentiation and experimental evidence

CausalPacket's contribution is an original, compact implementation of a workflow:
inspect packet facts, compare fault/security explanations, supply explicit context,
and test whether conclusions still have support when relevant evidence changes.
It is not a claim to have invented network anomaly detection or causal inference.

## Related capabilities already exist

- [Suricata EVE](https://docs.suricata.io/en/latest/output/eve/eve-json-output.html)
  documents alerts, anomalies, protocol metadata and JSON event output.
- [Zeek logs](https://docs.zeek.org/en/v7.0.11/script-reference/log-files.html)
  cover connections, DNS and other protocol activity.
- [ExtraHop's investigation workflow](https://www.extrahop.com/use-cases/network-forensics-and-investigations)
  describes context-rich timelines, packet viewing and PCAP evidence.

These primary descriptions establish that alerts, packet evidence and timelines
are established capabilities. They are not an exhaustive comparison, and they
do not prove that another product lacks our workflow. The defendable pitch is
our implemented combination of explicit uncertainty, competing explanations,
interactive context and reproducible evidence-sensitivity controls for beginners.

## Experimental evidence lab

The lab deliberately changes **synthetic capture views**, then runs each through
the real isolated analysis worker. No uploaded or displayed user capture is
modified. This complements the Alibi Test: Alibi changes interpretation with fixed
facts; the lab changes available packet evidence and measures the resulting facts
and interpretations. It is not a simulator of physical network effects.

| Controlled change | Observed result |
| --- | --- |
| Keep all 20 port probes and 20, 15, or 10 reset replies | Suspected scan; minimum known-outcome requirement is met. |
| Keep the same 20 probes but only 5 or 0 reset replies | Diverse probing remains visible, but assessment becomes unresolved. |
| Contact 20 services successfully | No scan finding from port diversity alone. |
| Remove only the earlier successful handshake from mixed scan/fault traffic | Success comparator is unavailable; independent scan and refusal findings remain. |
| Preserve gateway-event timestamps and IP traffic, but address client frames to the old gateway MAC | ARP/DNS/TCP observations remain; association edges disappear and incidents stay separate. |

The scan boundary reflects the documented demonstration threshold of at least ten
known outcomes and an 80% rejection ratio. It is not a probability or universal
network rule. Reply removal is controlled visibility loss, not a statistical
packet-loss model. The gateway MAC edit tests the association requirement; it does
not prove causation or reconstruct how real routers would behave.

Thirty variants were actually run across seeds 42, 73 and 99, changing generated
client/scanner/server addresses. The measured summary is in
[evidence-experiments.json](evidence-experiments.json). Generated cases are not
independent production samples and do not establish real-world accuracy.

```bash
.venv-hardened/bin/python -m scripts.evidence_experiments --seeds 42 73 99
```

## API and frontend boundary

`POST /api/lab/evidence` accepts `{ "seed": 42 }`, or `{}` for that default.
Only an integer seed between zero and 1,000,000 is accepted; there is no capture,
path, URL, source-analysis ID or external-service parameter. It returns a separate
`ExperimentReport` with `data_origin: "synthetic_experiment"` and ten cases. The
core `AnalysisReport` schema is unchanged.

Each case includes:

- `id`, `family`, `description` and its original packet count.
- `removed_source_frames` / `edited_source_frames`: changes explicitly made.
- `source_frame_map`: derived frame n corresponds to array index n-1 in the
  original synthetic capture. Re-encoding does not preserve original numbering.
- `report`: the actual analysis of the derived synthetic capture, including
  measurements and retained evidence.

Nested report IDs are not registered as normal analysis sessions. Do not send
them to reinterpret/evidence/export session endpoints. Read their embedded evidence
directly and export lab results separately. Do not replace the main report with a
lab case or label these modified captures as original user evidence.

The route shares the analysis gate, runs one worker at a time, has a 20-second
default overall deadline (configurable up to 60 seconds for a slower host) and a
bounded output, and uses temporary files removed on exit.
It does not evict original metadata sessions. The existing local-origin and body
restrictions remain. The endpoint/CLI and dedicated interactive frontend are
implemented. Nine socket-free component interaction scenarios passed using actual
worker responses as test transport data, including lab/main-state separation,
frame mapping, API errors and navigation/context races. This does not establish a
live browser pass: the current tool environment blocks server binding and Chromium
launch. See [running.md](running.md) for the component and real-browser scripts.
