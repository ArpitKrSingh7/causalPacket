import { ArrowUpRight, CheckCircle2, Circle, ShieldAlert, TriangleAlert } from "lucide-react";
import type { Incident } from "@/lib/types";
import { assessmentLabel, assessmentStyle } from "@/lib/presentation";

interface IncidentListProps {
  incidents: Incident[];
  selectedIncidentId: string | null;
  onSelectIncident: (id: string) => void;
}

export function IncidentList({ incidents, selectedIncidentId, onSelectIncident }: IncidentListProps) {
  return (
    <nav aria-label="Investigations" className="space-y-3">
      <div className="flex items-center justify-between px-1 pb-1"><h2 className="eyebrow text-slate-500">Findings</h2><span className="text-[10px] font-mono text-slate-500">{String(incidents.length).padStart(2, "0")}</span></div>
      {incidents.length === 0 ? <div className="rounded-2xl border border-line bg-white p-5"><CheckCircle2 className="w-6 h-6 text-teal-700 mb-4" /><h3 className="text-xs font-semibold leading-6">No significant findings in the supported checks</h3><p className="text-[11px] text-slate-500 leading-6 mt-2">Review the capture scope and retained evidence. This is not a network safety certification.</p></div> : incidents.map((incident, index) => {
        const selected = incident.id === selectedIncidentId;
        const Icon = incident.assessment === "suspected_attack" ? ShieldAlert : incident.assessment === "likely_fault" ? TriangleAlert : Circle;
        return <button key={incident.id} type="button" aria-pressed={selected} onClick={() => onSelectIncident(incident.id)} className={`relative w-full text-left rounded-xl border p-4 transition-colors ${selected ? "border-[#ddbaaa] bg-white shadow-[0_4px_20px_#18233605]" : "border-line/70 bg-white/50 hover:bg-white hover:border-slate-300"}`}>
          {selected && <span className="absolute -left-px top-6 bottom-6 w-[3px] bg-accent rounded-r" />}
          <div className="flex items-center justify-between gap-2 mb-3"><span className="text-[9px] font-mono text-slate-500">FINDING {String(index + 1).padStart(2, "0")}</span><Icon className={`w-3.5 h-3.5 ${selected ? "text-accent" : "text-slate-400"}`} /></div>
          <h3 className="font-display text-sm font-medium leading-6 tracking-tight">{incident.title}</h3>
          <span className={`inline-flex mt-3 text-[9px] px-2 py-1 rounded border ${assessmentStyle[incident.assessment]}`}>{assessmentLabel[incident.assessment]}</span>
          <p className="text-[11px] text-slate-500 leading-5 mt-3 line-clamp-2">{incident.summary}</p>
          <div className="flex items-center justify-between border-t border-line mt-4 pt-3 text-[9px] text-slate-500"><span>{incident.observation_ids.length} observations · {incident.severity} priority</span><ArrowUpRight className={`w-3 h-3 ${selected ? "text-accent" : "text-slate-400"}`} /></div>
        </button>;
      })}
    </nav>
  );
}
