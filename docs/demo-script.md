# Demo narration reference

**The final voiced video is already in `docs/demo.mp4`: 3 minutes 25.57 seconds, with audio.** Both workspace and prepared Git-checkout copies match. You do not need to record the application actions again.

The narration and scene boundaries below describe the original **3:48 silent source recording**. The voiced export has a different duration, so the original `demo.srt` and `demo-timings.json` are reference material, not verified synchronized captions for the edited export. Do not attach that subtitle track unchanged to the final video.

The walkthrough uses the real local API and synthetic captures. Its end card identifies the separately deployed Vercel frontend and Render API.

## Ready-to-read narration

### 0:01–0:15 · Meet CausalPacket

**Already on screen:** Fresh redesigned workspace, logo and artwork.

> Hi, I’m Arpit Kumar Singh, and this is CausalPacket, built for the IIITDM Kancheepuram Cybersecurity Hackathon. Our question is simple: when a network breaks, is it a fault, or something suspicious?

### 0:15–0:33 · Why this matters

**Already on screen:** Keep the opening workspace visible, then scroll to the sample captures.

> Small offices and student labs often have no network specialist. A packet capture contains the clues, but reading it takes expertise. And a service outage can look surprisingly similar to an attack. We turn that capture into an understandable investigation.

### 0:33–0:51 · Our approach

**Already on screen:** Show the three-step explanation below the capture picker.

> We built our own stateful TCP, DNS, ARP and scan detectors. Scapy decodes packets; our Python code tracks conversations, groups related observations, and compares explanations. The Next.js interface shows what was observed, what remains uncertain, and what to check next.

### 0:51–1:18 · A fault is not automatically an attack

**Already on screen:** Analyze Service failure. Show the brief, open a supporting frame, then show the earlier-success comparison in full observations.

> This synthetic capture contains twelve refused connection attempts. The report suggests checking the service and its access policy. Opening a supporting frame shows the actual protocol headers behind the finding. The detailed explanation compares these failures with an earlier completed exchange. This supports investigating a service fault; repeated failure alone does not prove an attack.

### 1:18–1:40 · Keep independent problems visible

**Already on screen:** Analyze Scan and independent fault. Keep both finding cards visible.

> This next capture contains two problems: possible scanning across many ports, and a separate unavailable service. CausalPacket keeps them as independent investigations. Authorizing a known scanner changes its interpretation, while the service failure remains. Grouping findings should never hide an unrelated problem.

### 1:40–2:05 · Follow packet-backed links

**Already on screen:** Analyze Gateway identity investigation. Show its unresolved brief and dark evidence board. Open a connecting frame.

> Now, two MAC addresses claim the same IP, alongside DNS errors and TCP refusals. The evidence board links observations only when the configured rules find the required packet relationships. Close timing by itself is not enough. With no gateway inventory supplied, the assessment stays unresolved. We do not claim that these links prove causation.

### 2:05–2:45 · Challenge the explanation

**Already on screen:** Open Alibi Test. Explicitly apply sample inventory; pause on suspected attack. Approve the second gateway MAC; pause on unresolved and Evidence retained.

> Here’s the Alibi Test. Applying the sample’s declared gateway inventory raises suspicion about the second MAC. After verifying it as an approved backup router, I approve it. The assessment returns to unresolved. The original observations, frame references and links remain unchanged. The DNS and TCP failures still need investigation. Trusted context changes the interpretation, while the packet facts stay fixed.

### 2:45–3:11 · Test the limits of the diagnosis

**Already on screen:** Run the real Evidence Lab. Show the scan reply variants, then select zero replies and its unresolved result.

> We also test how the diagnosis reacts when evidence disappears. This lab actually reanalyzes modified synthetic captures. Compare twenty observed replies with no replies: reduced visibility should weaken the conclusion, rather than produce a confident attack label. These are controlled sensitivity experiments, not a claim of production accuracy. The active investigation stays separate.

### 3:11–3:29 · Be honest about incomplete input

**Already on screen:** Analyze Damaged capture. Show partial coverage. Start a real Markdown report download.

> A damaged capture produces partial coverage and a clear warning. Reports include the supporting frames, possible causes, and next checks, while omitting raw application payloads. Parsing runs with bounded file, packet, time and memory limits. These limits are documented, along with unsupported checks.

### 3:29–3:48 · Try it and reproduce it

**Already on screen:** Show the clearly labeled closing card with deployment and repository URLs.

> The frontend is deployed on Vercel, with FastAPI on Render. Judges can also run everything locally and reproduce the included samples and tests. CausalPacket helps users move from unusual packets to evidence they can investigate. Thank you.

## Export and submit

1. Voice-over is complete. Review the narrated `docs/demo.mp4` once; its current 3:25.57 duration satisfies the **2–5 minute** requirement.
2. Export H.264 MP4 with audio; keep the file below **100 MB**. Review the Alibi scene and the last deployment card once.
3. Replace the public repository checkout’s `docs/demo.mp4` with your voiced export. In this workstation the Git checkout is `.artifacts/submission-checkout`; update its demo file, commit and push. The included captions describe this recording; adjust their timing only if you trim or rearrange it.
4. Check public playback and submit the organizer form before **1 November 2026, 21:00 IST**.

## Optional: record again later

The completed recording is already available. To record again, first move the previous `.artifacts/demo-new-ui/` output aside. With setup and the optional Playwright/Chromium/FFmpeg tools available, run `node scripts/record_demo.cjs` from a normal terminal. It uses the real interface/API and stops only servers it starts.
