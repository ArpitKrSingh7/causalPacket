"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Download, FlaskConical, Loader2 } from "lucide-react";
import { ApiError, runEvidenceExperiment } from "@/lib/api";
import type { ExperimentCase, ExperimentReport } from "@/lib/lab";
import type { PacketEvidence } from "@/lib/types";
import { assessmentLabel, assessmentStyle } from "@/lib/presentation";
import { FrameDrawer } from "./FrameDrawer";

interface Props {
  viewRevision: number;
  isLiveMode: boolean;
  isBusy: boolean;
  engineReady: boolean;
}

function scanMetric(item: ExperimentCase, key: string): number {
  const value = item.report.observations.find((o) => o.type === "SCAN_PATTERN")?.metrics.find((m) => m.key === key)?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function Assessments({ item }: { item: ExperimentCase }) {
  return <div className="flex flex-wrap gap-1.5">
    {item.report.incidents.length ? item.report.incidents.map((incident) =>
      <span key={incident.id} className={`text-[11px] rounded border px-2 py-0.5 ${assessmentStyle[incident.assessment]}`}>{assessmentLabel[incident.assessment]}</span>
    ) : <span className="text-xs text-slate-600">No findings in supported checks</span>}
  </div>;
}

export function EvidenceLab({ viewRevision, isLiveMode, isBusy, engineReady }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [seed, setSeed] = useState(42);
  const [result, setResult] = useState<ExperimentReport | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("scan-20");
  const [frame, setFrame] = useState<PacketEvidence | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const urlsRef = useRef(new Set<string>());

  useEffect(() => {
    generationRef.current += 1;
    controllerRef.current?.abort();
    setRunning(false);
    setResult(null);
    setError(null);
    setFrame(null);
    for (const url of urlsRef.current) URL.revokeObjectURL(url);
    urlsRef.current.clear();
    return () => {
      generationRef.current += 1;
      controllerRef.current?.abort();
      for (const url of urlsRef.current) URL.revokeObjectURL(url);
      urlsRef.current.clear();
    };
  }, [viewRevision, isLiveMode, seed, expanded]);

  const run = async () => {
    if (!isLiveMode || !engineReady || isBusy || running) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const generation = ++generationRef.current;
    setRunning(true);
    setError(null);
    setResult(null);
    setFrame(null);
    try {
      const response = await runEvidenceExperiment(seed, controller.signal);
      if (controller.signal.aborted || generation !== generationRef.current) return;
      setResult(response);
      setSelectedId(response.cases.find((item) => item.family === "scan_visibility")?.id || response.cases[0]?.id || "");
    } catch (caught) {
      if (controller.signal.aborted || generation !== generationRef.current) return;
      setError(caught instanceof ApiError ? caught.message : "The experiment could not be completed. Try again.");
    } finally {
      if (generation === generationRef.current) setRunning(false);
    }
  };

  const download = () => {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }));
    urlsRef.current.add(url);
    const anchor = document.createElement("a");
    try {
      anchor.href = url;
      anchor.download = `causalpacket-evidence-lab-seed-${result.seed}.json`;
      document.body.appendChild(anchor);
      anchor.click();
    } finally {
      anchor.remove();
      setTimeout(() => { URL.revokeObjectURL(url); urlsRef.current.delete(url); }, 1000);
    }
  };

  const select = (id: string) => { setSelectedId(id); setFrame(null); };
  const selected = result?.cases.find((item) => item.id === selectedId);
  const scans = result?.cases.filter((item) => item.family === "scan_visibility") || [];

  const controlCard = (item: ExperimentCase) => <button key={item.id} type="button" onClick={() => select(item.id)} aria-pressed={item.id === selectedId}
    className={`text-left rounded-lg border p-3 space-y-2 min-w-0 hover:border-teal-500/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-300 ${item.id === selectedId ? "border-teal-400 bg-teal-500/5" : "border-line bg-slate-50/60"}`}>
    <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
    <Assessments item={item} />
    <p className="text-[11px] text-slate-500">{item.report.coverage.packets_seen} packets · {item.report.incidents.length} investigations · {item.report.edges.length} associations</p>
    {item.family === "irrelevant_control" && <p className="text-[11px] text-teal-700">{item.report.incidents.flatMap((i) => i.comparisons).filter((comparison) => comparison.status === "available").length} available earlier-success comparisons</p>}
  </button>;

  return (
    <section className="rounded-2xl border border-line bg-white" aria-label="Experimental evidence lab">
      <button type="button" aria-expanded={expanded} aria-controls="evidence-lab-body" onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 sm:p-5 flex items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-300 rounded-xl">
        <FlaskConical className="w-5 h-5 text-cobalt shrink-0" />
        <span className="min-w-0 flex-1"><span className="block font-semibold text-sm">Can the diagnosis survive missing evidence?</span><span className="block mt-1 text-xs text-slate-500">Evidence lab · controlled synthetic captures · optional experiment</span></span>
        {expanded ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
      </button>
      {expanded && <div id="evidence-lab-body" className="border-t border-line p-4 sm:p-5 space-y-5">
        <div className="rounded-lg border border-indigo-400/25 bg-indigo-500/5 p-3 text-xs text-slate-600 leading-relaxed">
          <p className="font-semibold text-indigo-700">Controlled synthetic experiment — modified capture views</p>
          <p className="mt-1">Ten generated views run through the real analysis worker. We hide replies, remove background traffic, or change a gateway link to test which conclusions still have support. Your current capture, context and evidence remain unchanged.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-500">Generated address set
            <select value={seed} onChange={(event) => setSeed(Number(event.target.value))} className="block mt-1 rounded border border-slate-300 bg-slate-50 px-3 py-2 text-ink" aria-label="Experiment address seed">
              {[42,73,99].map((value) => <option key={value} value={value}>Seed {value}</option>)}
            </select>
          </label>
          <button type="button" onClick={run} disabled={running || isBusy || !isLiveMode || !engineReady}
            className="rounded-lg bg-cobalt px-4 py-2 text-xs font-semibold text-white hover:bg-cobalt disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300">
            {running ? <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> : <FlaskConical className="w-4 h-4" />}{running ? "Running controlled cases…" : "Run evidence experiment"}
          </button>
          {result && <button type="button" onClick={download} className="text-xs text-indigo-700 rounded border border-indigo-400/30 px-3 py-2 flex items-center gap-1.5"><Download className="w-3.5 h-3.5" />Download experiment JSON</button>}
        </div>
        {(!isLiveMode || !engineReady) && <p className="text-xs text-slate-500">Connect to the live backend and select Live API to run this experiment. Fictional previews are never used as lab results.</p>}
        {running && <p className="text-xs text-slate-500" role="status">Generating and analyzing ten bounded synthetic capture views. This may take a few seconds.</p>}
        {error && <p role="alert" className="rounded-lg border border-amber-500/30 p-3 text-xs text-amber-800">{error}</p>}
        {result && <div className="space-y-6" aria-label="Actual experiment results">
          <div>
            <h3 className="text-sm font-semibold">1. What if scan replies are missing?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-3">Each view retains the same probes. Bars show observed rejected outcomes, not confidence. Select a view to inspect its actual evidence.</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {scans.map((item) => {
                const attempts=scanMetric(item,"attempts"), rejected=scanMetric(item,"rejected"), unknown=scanMetric(item,"unknown");
                return <button key={item.id} type="button" onClick={() => select(item.id)} aria-pressed={selectedId===item.id}
                  className={`rounded-lg border p-3 text-left space-y-3 min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-300 ${selectedId===item.id ? "border-indigo-300 bg-indigo-500/10" : "border-line bg-slate-50/60 hover:border-indigo-400/60"}`}>
                  <span className="block text-lg font-semibold text-ink">{rejected}<span className="text-xs font-normal text-slate-500"> / {attempts} replies</span></span>
                  <span className="block h-2 rounded-full bg-slate-200 overflow-hidden" aria-hidden="true"><span className="block h-full bg-cobalt" style={{width:`${attempts ? Math.min(100,rejected/attempts*100) : 0}%`}} /></span>
                  <Assessments item={item} /><span className="block text-[11px] text-slate-500">{unknown} unknown outcomes</span>
                </button>;
              })}
            </div>
            {scans[0] && <p className="text-[11px] text-slate-500 mt-2">Configured rule: at least {scanMetric(scans[0],"known_outcome_threshold")} known outcomes and {scanMetric(scans[0],"rejected_threshold")} rejected-outcome ratio. These are demonstration thresholds.</p>}
          </div>
          <div><h3 className="text-sm font-semibold mb-3">2. Does removing background traffic change the finding?</h3><div className="grid sm:grid-cols-2 gap-3">{result.cases.filter((item) => item.family === "irrelevant_control").map(controlCard)}</div><div className="mt-3 grid sm:grid-cols-2 gap-3">{result.cases.filter((item) => item.family === "healthy_control").map(controlCard)}</div></div>
          <div><h3 className="text-sm font-semibold mb-3">3. Does timing alone create a link?</h3><div className="grid sm:grid-cols-2 gap-3">{result.cases.filter((item) => item.family === "gateway_link").map(controlCard)}</div></div>
          {selected && <div className="rounded-lg border border-line bg-slate-50/60 p-4 space-y-3" aria-label="Selected lab capture evidence">
            <div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold">Inspect derived capture</h4><span className="text-[11px] text-indigo-700 font-mono">{selected.id}</span></div>
            <p className="text-xs text-slate-600 leading-relaxed">{selected.description}</p>
            <p className="text-xs text-slate-500">{selected.source_packets} original packets · {selected.removed_source_frames.length} removed · {selected.edited_source_frames.length} edited</p>
            <Assessments item={selected} />
            {selected.report.incidents.map((incident) => <p key={incident.id} className="text-xs text-slate-600">{incident.summary}</p>)}
            <p className="text-[11px] text-slate-500">Frame numbers below belong to this derived capture. Source references map back to its generated original, not your active capture.</p>
            <div className="flex flex-wrap gap-2">{selected.report.evidence.slice(0,12).map((item) => <button type="button" key={item.frame_number} onClick={() => setFrame(item)} className="rounded border border-slate-300 px-2 py-1 text-xs font-mono text-indigo-700 hover:border-indigo-300">Derived #{item.frame_number} · source #{selected.source_frame_map[item.frame_number-1]}</button>)}</div>
            {selected.report.evidence.length>12 && <p className="text-[11px] text-slate-500">Showing 12 of {selected.report.evidence.length} retained frames. Download the experiment JSON for the complete retained evidence.</p>}
          </div>}
          <details className="text-xs text-slate-500"><summary className="cursor-pointer text-indigo-700">Experiment method and limitations</summary><p className="mt-3 leading-relaxed">{result.explanation}</p><ul className="mt-2 space-y-1 list-disc pl-4">{result.limitations.map((limit) => <li key={limit}>{limit}</li>)}</ul></details>
        </div>}
      </div>}
      <FrameDrawer frame={frame} onClose={() => setFrame(null)} contextLabel={selected ? `Synthetic lab · ${selected.id}` : undefined} sourceFrameNumber={frame && selected ? selected.source_frame_map[frame.frame_number-1] : undefined} />
    </section>
  );
}
