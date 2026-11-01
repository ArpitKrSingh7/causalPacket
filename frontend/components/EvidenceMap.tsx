import { useState } from "react";
import { ArrowRight, Clock3, Filter, Layers } from "lucide-react";
import type { EvidenceEdge, Incident, Observation } from "@/lib/types";

interface Props {
  incident: Incident;
  observations: Observation[];
  edges: EvidenceEdge[];
  onOpenFrame: (frame: number) => void;
  onFilter: (id: string, frames: number[]) => void;
}

export function EvidenceMap({ incident, observations, edges, onOpenFrame, onFilter }: Props) {
  const [expanded, setExpanded] = useState(false);
  const members = observations.filter((item) => incident.observation_ids.includes(item.id))
    .sort((a,b) => a.first_seen_seconds - b.first_seen_seconds || a.id.localeCompare(b.id));
  const ids = new Set(members.map((item) => item.id));
  const links = edges.filter((edge) => ids.has(edge.source_observation_id) && ids.has(edge.target_observation_id));
  const lookup = new Map(members.map((item) => [item.id,item]));
  const visible = expanded ? members : members.slice(0,6);
  const frameButton = (frame: number) => <button key={frame} type="button" onClick={() => onOpenFrame(frame)} className="rounded border border-slate-600/70 bg-slate-800 px-1.5 py-0.5 text-teal-200 hover:border-teal-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-300">#{frame}</button>;
  return (
    <section className="rounded-xl border border-slate-800 bg-navy-900 p-4 sm:p-5 space-y-4" aria-label="Evidence map">
      <div><h3 className="text-sm font-semibold flex items-center gap-2"><Layers className="h-4 w-4 text-teal-300" />How the evidence connects</h3><p className="mt-1 text-xs text-slate-400">Recorded observations in time order. Connections below use actual packet linkage.</p></div>
      <ol className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {visible.map((observation) => <li key={observation.id} className="rounded-lg border border-slate-700/70 bg-navy-950/70 p-3 space-y-2 min-w-0">
          <div className="text-[11px] text-teal-300 flex items-center gap-1.5"><Clock3 className="h-3 w-3" />+{observation.first_seen_seconds.toFixed(3)}s <span className="ml-auto text-slate-400">{observation.type.split("_")[0]}</span></div>
          <h4 className="text-sm font-medium text-slate-100">{observation.title}</h4>
          <div className="flex flex-wrap gap-1 text-[11px] font-mono" aria-label={`Frames for ${observation.title}`}>{observation.evidence_frames.slice(0,5).map(frameButton)}{observation.evidence_frames.length > 5 && <span className="text-slate-500 self-center">+{observation.evidence_frames.length-5} more</span>}</div>
          <button type="button" onClick={() => onFilter(observation.id, observation.evidence_frames)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-teal-200"><Filter className="w-3 h-3" />Inspect in timeline</button>
        </li>)}
      </ol>
      {members.length>6 && <button type="button" onClick={() => setExpanded(!expanded)} className="text-xs text-teal-300 underline underline-offset-4">{expanded ? "Show fewer observations" : `Show all ${members.length} observations`}</button>}
      {links.length ? <div className="space-y-2" aria-label="Packet-backed associations">
        {links.map((edge) => <div key={edge.id} className="rounded-lg border border-dashed border-teal-500/25 bg-teal-500/5 p-3 text-xs space-y-2">
          <div className="flex flex-wrap gap-2 items-center font-medium text-slate-200"><span>{lookup.get(edge.source_observation_id)?.title}</span><ArrowRight className="w-3.5 h-3.5 text-teal-400" /><span>{lookup.get(edge.target_observation_id)?.title}</span></div>
          <p className="text-slate-400 leading-relaxed">{edge.reason}</p>
          <div className="flex flex-wrap gap-1.5 font-mono">{edge.evidence_frames.map(frameButton)}<button type="button" className="ml-1 text-teal-300 underline underline-offset-4" onClick={() => onFilter(edge.id, edge.evidence_frames)}>Inspect connecting frames</button></div>
        </div>)}
        <p className="text-[11px] text-slate-500">Packet-backed associations; these links do not prove cause.</p>
      </div> : <p className="text-xs text-slate-500">No association edges are recorded for this finding.</p>}
    </section>
  );
}
