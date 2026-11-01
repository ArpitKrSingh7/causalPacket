# Demonstration guide

The included `docs/demo.mp4` combines an actual recorded interface walkthrough
with clearly labeled slides derived from recorded synthetic experiment results.
The walkthrough shows the earlier interface; the compact brief/map/lab interface
is newer. Do not describe the slides as a live browser recording or claim a new
browser verification that did not occur.

## Optional fresh recording: about three minutes

Run `./run.sh doctor` and `./run.sh verify-demo`, then start one server pair with
`./run.sh dev`. Use synthetic samples in Live mode and readable browser zoom.

| Time | Action | Explanation |
| --- | --- | --- |
| 0:00–0:15 | Show empty live workspace and sample choices | Small networks need to distinguish faults from suspicious activity and understand the evidence. |
| 0:15–0:40 | Service failure; brief, frame drawer and detailed hypotheses | Twelve refusals and an earlier completed exchange support checking the service/policy. Retries alone do not prove an attack. |
| 0:40–1:00 | Scan and independent fault | Separate investigations remain visible; source authorization changes the scan interpretation while the service fault survives. |
| 1:00–1:30 | Gateway investigation; clickable observations and packet links | Show the three observations, two actual associations, and frames #7/#14. Explain that association does not prove cause. |
| 1:30–1:55 | Open Alibi; apply sample inventory, then approve second MAC | Unresolved becomes suspected, then unresolved. The packet facts stay fixed and DNS/TCP problems remain. |
| 1:55–2:30 | Open evidence lab; explicitly run, select 20 versus 0 replies | The real worker analyzes modified synthetic views. Missing evidence weakens the interpretation; the active capture remains unchanged. |
| 2:30–2:45 | Show background and gateway-link controls | Removing the earlier healthy comparison preserves independent findings; close timing without required MAC linkage creates no association. |
| 2:45–3:00 | Damaged capture and report download | Show partial coverage, metadata-only export and reproducible local setup. |

Default gateway data: 19 packets, three observations, two links. Gateway address
`192.0.2.1`; approved baseline MAC `02:00:00:00:00:01`; second claimant
`02:00:00:00:00:02`. Verify these if the generator changes.

## Rebuilding the measured-results video

`scripts/build_demo.py` accepts original **raw** walkthrough footage and measured
experiment JSON. It refuses an existing output path, validates the expected
controls, renders labeled result slides and checks the final 2–5 minute duration
and complete decode. FFmpeg/ffprobe and the original recording are editing tools;
they are not required to run the application.

```bash
.venv-hardened/bin/python -m scripts.build_demo --walkthrough /path/to/original-raw-recording.webm
```

Review the output before replacing the included demo. Keep explanatory captions
synchronized with the displayed scenes. The measured slides describe evidence
sensitivity, not production accuracy or physical causal effects.

Stop the server pair after recording. The video may be included directly in the
public repository; separate video hosting is optional. The team leader submits
the actual public repository/video location through the official organizer form
strictly before 1 November 2026, 21:00 IST and retains the confirmation.
