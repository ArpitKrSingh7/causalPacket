<img src="frontend/public/brand/packet-mark.webp" width="48" height="48" alt="CausalPacket logo">

# CausalPacket · Fault or Foe?

> **The network is broken. Is it a fault, suspicious activity, or too early to tell?**

CausalPacket investigates packet captures and explains what happened, the possible
causes, the exact supporting packets, and what to check next. Built for the
**IIITDM Kancheepuram Cybersecurity Hackathon · Network Track · 2026**.

**[▶ Watch the 2:43 captioned demo](docs/demo.mp4)** ·
[Live app](https://causal-packet.vercel.app/) ·
[Voice-over script & new-UI recorder](docs/demo-script.md) ·
[Example investigation](docs/example-investigation.md) ·
[Evaluation](docs/evaluation.md)

The video combines a recorded UI walkthrough with labeled, measured synthetic
experiment results. The walkthrough shows the earlier interface layout.

## Run it

**Requirements:** Linux or WSL, Python **3.12+**, Node.js **20.9+**, and pnpm.
From the repository root:

```bash
./run.sh setup
./run.sh dev
```

Open **<http://localhost:3000>**. Choose a bundled synthetic capture or upload an
uncompressed `.pcap` / `.pcapng`. No API key, database, or capture privileges are
needed. Setup downloads dependencies; analysis runs locally. **Ctrl+C stops both services.**

[CLI, separate terminals and troubleshooting →](docs/running.md)

[Host the demo on Render + Vercel →](docs/deployment.md)

## Try the Alibi Test

Choose **Gateway identity investigation**. Two MAC addresses claim one IP, with
packet-linked DNS errors and TCP refusals. Then apply the sample inventory and
approve the second MAC as an authorized gateway device.

| Context supplied by the operator | Assessment |
| --- | --- |
| No gateway inventory | **Unresolved** |
| Known gateway; second claimant unapproved | **Suspected attack** |
| Both gateway MACs approved | **Unresolved** — service problems remain |

> **Same packets. Different interpretation.** The Alibi Test changes the trusted
> context while retaining observations, measurements and evidence. Approval does
> not authenticate a device or prove why the failures occurred.

**[Experimental evidence lab](docs/novelty.md):** rerun modified synthetic captures
to test missing replies, irrelevant traffic removal, and unsupported gateway
links. Thirty controlled variants exercise when conclusions should change. Open
the optional evidence lab in the interface and explicitly run an experiment.

## What it investigates

| Family | Observations and interpretation |
| --- | --- |
| **TCP** | Refused connections, possible SYN retries, unanswered attempts and handshake delays |
| **Scanning** | Many ports/hosts contacted within a window, interpreted alongside observed outcomes and scanner authorization |
| **ARP** | IP-to-MAC identity changes, with duplicate-address, failover and impersonation explanations |
| **UDP DNS** | Matched resolver errors, missing replies and response delays; ordinary NXDOMAIN is not attack evidence |

Findings include competing explanations, missing evidence, practical next steps,
frame references, a timeline, and Markdown/JSON exports. Independent faults stay
visible when related observations are grouped.

**Outside current coverage:** MTU diagnosis, rogue DHCP, DNS hijacking, encrypted
traffic analysis, general TCP data retransmissions, and full stream reconstruction.

## How it works

```mermaid
flowchart LR
    A[PCAP / PCAPNG] --> B[Bounded parser]
    B --> C[Original protocol trackers]
    C --> D[Observations and packet links]
    D --> E[Competing explanations]
    F[Alibi Test: operator context] --> E
    E --> G[Frames, timeline and next steps]
```

**Next.js → FastAPI → resource-limited Python worker.** Scapy decodes packets;
our code implements tracking, detection, grouping and diagnosis. No Wireshark/
tshark diagnosis output or external inference API is used. Packet links support
association; they do not prove causation.

## Reproducible checks

**156 backend tests passed · 9 synthetic demo scenarios passed · TypeScript and
Next.js production build passed.** These controls do not establish production
accuracy or a calibrated probability of attack.

```bash
./run.sh check
./run.sh verify-demo
```

| Included scenario | What to look for |
| --- | --- |
| Service failure | 12 connection refusals and an earlier successful exchange |
| Scan and independent fault | Two investigations; scanner approval preserves the service fault |
| Gateway identity investigation | Explicit inventory, Alibi transition and unchanged packet facts |
| Healthy and damaged captures | Honest empty findings or partial coverage, respectively |

All **[nine captures](samples/)** are generated offline using fictional addresses.
[Ground truth](samples/manifest.json) · [Measured evaluation](docs/evaluation.md) ·
[API contract](docs/api-contract.md)

## Security and limits

- **Bounded work:** 25 MiB uploads, 100,000 packet records, bounded tracking/report
  state, and a worker with a 15-second wall timeout plus CPU/memory limits.
- **Local metadata handling:** uploaded bytes are deleted after processing;
  reports omit raw application payloads but retain potentially sensitive IP/MAC
  headers. Metadata sessions are bounded and expire after 30 minutes.
- **Honest uncertainty:** unsupported or damaged input carries coverage notes.
  An empty finding list does not certify safety. Worker resource limits are not
  a complete OS security sandbox; the default configuration is for local use.

Use synthetic captures or traffic you are authorized to analyze. The application
performs no live sniffing, probing, or automatic network repair.

<details>
<summary><strong>Open-source libraries and versions</strong></summary>

| Layer | Libraries used |
| --- | --- |
| Backend | FastAPI, Starlette, Pydantic, pydantic-core, Uvicorn, Scapy, python-multipart, AnyIO |
| Supporting Python packages | annotated-doc, annotated-types, Click, h11, idna, opentelemetry-api, typing-extensions, typing-inspection |
| Test tooling | pytest, HTTPX, httpcore, certifi, iniconfig, packaging, pluggy, Pygments; optional React Test Renderer and Playwright verification |
| Visual assets | Original generated logo/illustration via OpenAI image generation; locally hosted Manrope and Space Grotesk fonts (SIL OFL). [Asset notes](frontend/public/brand/README.md) |
| Demo tooling | FFmpeg / ffprobe for captions, measured-result slides and video validation; not required to run the app |
| Frontend | Next.js, React, React DOM, TypeScript, Tailwind CSS, PostCSS, Autoprefixer, Lucide React, @types/node, @types/react, @types/react-dom |

Exact versions: [Python inventory](docs/dependencies.md),
[runtime pins](requirements.txt), [test pins](requirements-dev.txt),
[frontend declarations](frontend/package.json) and [lockfile](frontend/pnpm-lock.yaml).
Recorded advisory checks and their limitations: [dependency audit](docs/dependency-audit.md).

</details>

[Rules and readiness review](docs/hackathon-review.md) ·
[Submission status](docs/submission-status.md)
