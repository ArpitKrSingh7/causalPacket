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
  const frameButton = (frame: number) => <button key={frame} type="button" onClick={() => onOpenFrame(frame)} className="frame-chip">#{frame}</button>;
  return (
    <section className="evidence-board space-y-5" aria-label="Evidence map">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="eyebrow text-[#ffb68c] mb-2">Trace the signal</p><h3 className="font-display text-xl tracking-[-.03em] flex items-center gap-2"><Layers className="h-4 w-4 text-[#ffb68c]" />How the evidence connects</h3><p className="mt-2 text-[11px] leading-5 text-[#b4c2d5]">Recorded observations in time order. Connections use actual packet linkage.</p></div>
        <span className="text-[9px] font-mono px-2 py-1 border border-[#40516a] rounded text-[#b4c2d5]">{members.length} OBSERVATIONS / {links.length} ASSOCIATIONS</span>
      </div>
      <ol className={`grid gap-3 ${members.length > 1 ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"}`}>
        {visible.map((observation, index) => <li key={observation.id} className="evidence-node space-y-3">
          <div className="text-[10px] text-[#ffb68c] flex items-center gap-1.5 font-mono"><Clock3 className="h-3 w-3" />+{observation.first_seen_seconds.toFixed(3)}s<span className="ml-auto text-[#9aabc2]">{String(index + 1).padStart(2, "0")}</span></div>
          <div><span className="text-[9px] uppercase tracking-widest text-[#9aabc2]">{observation.type.split("_")[0]}</span><h4 className="mt-1.5 text-sm font-semibold leading-6 text-[#f2f5fb]">{observation.title}</h4></div>
          <div className="flex flex-wrap gap-1.5" aria-label={`Frames for ${observation.title}`}>{observation.evidence_frames.slice(0,5).map(frameButton)}{observation.evidence_frames.length > 5 && <span className="text-[10px] text-[#9aabc2] self-center">+{observation.evidence_frames.length-5} more</span>}</div>
          <button type="button" onClick={() => onFilter(observation.id, observation.evidence_frames)} className="flex items-center gap-1.5 text-[10px] text-[#b4c2d5] hover:text-[#ffb68c] pt-1"><Filter className="w-3 h-3" />Inspect in timeline</button>
        </li>)}
      </ol>
      {members.length>6 && <button type="button" onClick={() => setExpanded(!expanded)} className="text-xs text-[#ffb68c] underline underline-offset-4">{expanded ? "Show fewer observations" : `Show all ${members.length} observations`}</button>}
      {links.length ? <div className="space-y-3" aria-label="Packet-backed associations">
        {links.map((edge) => <div key={edge.id} className="evidence-link text-xs space-y-3">
          <div className="flex flex-wrap gap-2 items-center font-medium text-[#e6edf7]"><span>{lookup.get(edge.source_observation_id)?.title}</span><ArrowRight className="w-3.5 h-3.5 text-[#ffb68c]" /><span>{lookup.get(edge.target_observation_id)?.title}</span></div>
          <p className="text-[#b4c2d5] text-[11px] leading-6">{edge.reason}</p>
          <div className="flex flex-wrap gap-1.5">{edge.evidence_frames.map(frameButton)}<button type="button" className="ml-1 text-[#ffb68c] text-[10px] underline underline-offset-4" onClick={() => onFilter(edge.id, edge.evidence_frames)}>Inspect connecting frames</button></div>
        </div>)}
        <p className="text-[10px] text-[#9aabc2] flex items-center gap-2"><span className="w-4 border-t border-dashed border-[#b87b5c]" />Packet-backed associations; these links do not prove cause.</p>
      </div> : <p className="text-[11px] text-[#9aabc2]">No association edges are recorded for this finding.</p>}
    </section>
  );
}
