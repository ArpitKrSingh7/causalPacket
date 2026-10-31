# CausalPacket: 3 minute 45 second demonstration

Record the actual live application using the generated captures. Keep a rehearsal
recording before polishing. Final video must be 2–5 minutes and publicly
accessible from the README. The target here is about 3:45, leaving editing room.

## Before recording

1. Finish AGY-004's frontend dependency migration and regression pass.
2. Run `./run.sh doctor` and `./run.sh verify-demo`. Save the latter's output with
   `--output .artifacts/demo-verification.json` if useful. These do not start servers.
3. Use one server pair: `./run.sh dev`. Close unrelated tabs and extra project
   tasks. When finished recording, Ctrl+C shuts down this launcher's services.
4. Enter Live mode. Keep fixture previews visibly separate; do not record them as
   analyzed traffic. Browser zoom should make incident text and frame metadata readable.
5. Use the default generated samples without changing timing/thresholds mid-demo.
   New sample selections start with empty context; the gateway inventory is applied
   explicitly during the demonstration.
6. Keep the readable report download ready after AGY-005, or use the already
   working CLI Markdown export as an explicitly labeled fallback.

## Storyboard and narration

| Time | Screen action | Suggested narration |
| --- | --- | --- |
| 0:00–0:20 | Live workspace, briefly show sample choices | “When a lab or small office loses connectivity, a routine service failure and suspicious activity can look similar. CausalPacket compares explanations, shows the packets behind them, and recommends what to check next.” |
| 0:20–0:50 | Select Service failure; open its observed facts and earlier-success comparison | “Here, twelve connection attempts to one service were explicitly refused. An earlier connection completed. We explain the service or filtering problem and suggest checking the listener and policy. These retries alone do not establish an attack.” |
| 0:50–1:15 | Select Scan and independent fault | “This capture contains both a source probing twenty rejected ports and a separate failed service. Both investigations remain visible. We measure distinct destinations and observed outcomes instead of treating every missing response as malicious.” |
| 1:15–1:50 | Select Gateway identity investigation. Show one incident, three observations, two associations; open ARP frame #7 and TCP frame #14 | “Now two MAC addresses claim one IP, followed by DNS errors and TCP refusals. These client frames address the new claimant MAC, which gives us packet evidence for the association. The tool preserves failover, configuration conflict, and impersonation as competing explanations.” |
| 1:50–2:15 | Show the declared synthetic inventory; click Apply sample inventory | “With no trusted inventory supplied, this case is unresolved. I explicitly apply the sample's declared gateway inventory. The second claimant falls outside that policy, so impersonation becomes a suspected explanation. It is still not a proven attack.” |
| 2:15–2:45 | Explicitly approve MAC 02:00:00:00:00:02. Show interpretation changes and remaining DNS/TCP facts | “For this synthetic scenario, I mark the second device as an authorized backup router. The unauthorized-device explanation weakens. The packet facts, measured counts, and links stay fixed. The DNS and TCP problems remain, with service and failover logs as the next checks.” |
| 2:45–3:05 | Download/open the Markdown report; show evidence and next checks | “The investigation can be exported with its explanations, operator context, exact frame references, and limitations. Only retained header metadata is included; raw application payloads are excluded.” |
| 3:05–3:25 | Select Damaged capture; open coverage notes, then Healthy exchanges | “A truncated record produces partial analysis of the valid prefix. The limitation is visible, and a valid capture still works afterward. An empty finding list covers the supported checks; it does not certify the entire network is safe.” |
| 3:25–3:45 | Briefly show verify-demo/test output and repository setup | “The protocol trackers, grouping, and diagnosis rules are our own. Scapy supplies decoding and sample construction. Analysis runs locally with bounded input and worker resources. The repository includes reproducible captures, positive and negative controls, and a one-command launcher.” |

The default gateway sample has 19 packets, three observations and two links.
Frame #7 is the second ARP claimant; frame #14 is a subsequent client SYN addressed
to that MAC. If the generator is changed, recheck those numbers before recording.
Association expresses chronology and packet linkage, not a proved causal effect.

## Fallback if a demonstration step fails

- Preserve the last valid report with its correct provenance. Do not switch to an
  unlabeled fixture to make a live failure appear successful.
- A recording can show a working CLI report while accurately identifying it as
  the same backend engine. For example:

```bash
./run.sh cli samples/04_gateway_transition.pcap --context samples/gateway-baseline.json --markdown
```

- If UI export is still incomplete, show this working report rather than a dead
  download control. The API export also works independently of the UI.
- Keep the final result within 2–5 minutes; remove waiting and repetitive setup
  steps, while preserving the actual evidence/context transitions.

## After recording

Stop the server pair. Upload the final video to a publicly accessible destination,
open it without signing in, and add the real URL to the top of README.md. Never
leave a placeholder URL in the final submission. The team leader submits the
repository and video using the organizer's actual form before 21:00 IST;
the internal target is 19:00 IST.
