# Arpit’s demo script · about 3 minutes 45 seconds

Read the quoted paragraphs in your own voice. Pause between scenes. The recorder produces a separate silent recording, actual scene timings, and a subtitle track; it never simulates analysis responses. All captures shown are synthetic.

## Record the redesigned interface

Run from the source checkout you intend to publish. The optional recorder starts one local API/frontend pair when needed, records the actual redesigned app, and stops only servers it started. It refuses to overwrite a recording.

```bash
npm install --prefix .artifacts/recorder --no-audit --no-fund playwright@1.63.0
node .artifacts/recorder/node_modules/playwright/cli.js install chromium
./run.sh record-demo
```

Requires normal browser/process permissions, FFmpeg/ffprobe, and completed `./run.sh setup`. If another complete server pair is running, it is reused and left running. If Chromium is unavailable or blocked, the command reports that failure; no recording is fabricated. Optional existing Playwright installation: set `CAUSALPACKET_PLAYWRIGHT_MODULE` to its package path.

Outputs: `.artifacts/demo-new-ui/causalpacket-new-ui.mp4`, `voiceover.srt`, `scene-timings.json`, plus the raw browser recording. Use **actual** timings from that file if the machine or backend takes longer than the target pacing.

Import the MP4 into your video editor, record a voice-over using the script below, and align each paragraph to its scene. Review legibility, captions and total duration, then replace `docs/demo.mp4` with the reviewed final video. Update `docs/demo.srt` to the aligned final captions and update the duration/layout note in the README. The existing included video is the earlier interface and remains labeled as such.

## Narration and screen actions

### 0:00–0:14 · Meet CausalPacket

**Screen:** Fresh redesigned workspace, logo and artwork.

> Hi, I’m Arpit Kumar Singh, and this is CausalPacket, built for the IIITDM Kancheepuram Cybersecurity Hackathon. Our question is simple: when a network breaks, is it a fault, or something suspicious?

### 0:14–0:32 · Why this matters

**Screen:** Keep the opening workspace visible, then scroll to the sample captures.

> Small offices and student labs often have no network specialist. A packet capture contains the clues, but reading it takes expertise. And a service outage can look surprisingly similar to an attack. We turn that capture into an understandable investigation.

### 0:32–0:50 · Our approach

**Screen:** Show the three-step explanation below the capture picker.

> We built our own stateful TCP, DNS, ARP and scan detectors. Scapy decodes packets; our Python code tracks conversations, groups related observations, and compares explanations. The Next.js interface shows what was observed, what remains uncertain, and what to check next.

### 0:50–1:17 · A fault is not automatically an attack

**Screen:** Analyze Service failure. Show the brief, open a supporting frame, then show the earlier-success comparison in full observations.

> Let’s run a real analysis of an included synthetic capture. Here, twelve connection attempts were explicitly refused. An earlier completed exchange gives us a useful comparison. The report recommends checking the service and its access policy. Clicking a frame opens the actual retained protocol headers. Repeated failure alone is not treated as proof of an attack.

### 1:17–1:39 · Keep independent problems visible

**Screen:** Analyze Scan and independent fault. Keep both finding cards visible.

> This next capture contains two problems: possible scanning across many ports, and a separate unavailable service. CausalPacket keeps them as independent investigations. Authorizing a known scanner changes its interpretation, while the service failure remains. Grouping findings should never hide an unrelated problem.

### 1:39–2:04 · Follow packet-backed links

**Screen:** Analyze Gateway identity investigation. Show its unresolved brief and dark evidence board. Open a connecting frame.

> Now, two MAC addresses claim the same IP, alongside DNS errors and TCP refusals. The evidence board links observations only when the configured rules find the required packet relationships. Close timing by itself is not enough. With no gateway inventory supplied, the assessment stays unresolved. We do not claim that these links prove causation.

### 2:04–2:44 · Challenge the explanation

**Screen:** Open Alibi Test. Explicitly apply sample inventory; pause on suspected attack. Approve the second gateway MAC; pause on unresolved and Evidence retained.

> Here is our Alibi Test. First, I explicitly apply the synthetic sample’s declared gateway inventory. A second, unapproved device claiming the known gateway raises suspicion. Now suppose the operator verifies that this is an authorized backup router. I approve its MAC address. The assessment changes back to unresolved. The packet observations, frame references, and links remain unchanged, and the DNS and TCP failures still need investigation. Context changes the interpretation; it does not rewrite the evidence.

### 2:44–3:10 · Test the limits of the diagnosis

**Screen:** Run the real Evidence Lab. Show the scan reply variants, then select zero replies and its unresolved result.

> We also test how the diagnosis reacts when evidence disappears. This lab actually reanalyzes modified synthetic captures. Compare twenty observed replies with no replies: reduced visibility should weaken the conclusion, rather than produce a confident attack label. These are controlled sensitivity experiments, not a claim of production accuracy. The active investigation stays separate.

### 3:10–3:28 · Be honest about incomplete input

**Screen:** Analyze Damaged capture. Show partial coverage. Start a real Markdown report download.

> A damaged capture produces partial coverage and a clear warning. Reports include the supporting frames, possible causes, and next checks, while omitting raw application payloads. Parsing runs with bounded file, packet, time and memory limits. These limits are documented, along with unsupported checks.

### 3:28–3:43 · Try it and reproduce it

**Screen:** Show the clearly labeled closing card with deployment and repository URLs.

> The frontend is deployed on Vercel, with FastAPI on Render. Judges can also run everything locally and reproduce the included samples and tests. CausalPacket helps users move from unusual packets to evidence they can investigate. Thank you.

## Before submission

- After publishing the redesign, open the Vercel link and try the gateway flow once. Keep the connection to the real Render API.
- Keep the demo between **2 and 5 minutes**. A clear voice-over is preferable to background music.
- Check the public GitHub video in a signed-out window. The README can link to the included MP4; separate hosting is optional.
- Submit the public repository and video through the organizer form before **1 November 2026, 21:00 IST**.
