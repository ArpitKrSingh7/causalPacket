import { AlertTriangle, ArrowDown, ArrowRight, CheckCircle2, Search } from "lucide-react";
import type { AnalysisReport, Incident } from "@/lib/types";
import { assessmentLabel, assessmentStyle } from "@/lib/presentation";

interface Props {
  report: AnalysisReport;
  incident: Incident | null;
  onTestAlternative: () => void;
}

export function InvestigationSummary({ report, incident, onTestAlternative }: Props) {
  const change = report.interpretation_changes.find((item) => item.incident_id === incident?.id);
  const incomplete = report.coverage.status !== "complete";
  return (
    <section aria-label="Investigation summary" className="rounded-xl border border-slate-700/80 bg-navy-900 p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="uppercase tracking-widest text-teal-300 font-semibold">Investigation brief</span>
        <span className={incomplete ? "text-amber-200" : "text-slate-400"}>{report.coverage.packets_seen.toLocaleString()} packets · {report.coverage.duration_seconds.toFixed(2)}s · {report.coverage.status} coverage</span>
      </div>
      {incident ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${assessmentStyle[incident.assessment]}`}>{assessmentLabel[incident.assessment]}</span>
            <span className="text-xs text-slate-400">{incident.observation_ids.length} observation{incident.observation_ids.length === 1 ? "" : "s"} · {incident.hypotheses.length} possible explanations</span>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-100">{incident.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{incident.summary}</p>
          </div>
          {incident.next_steps[0] && <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 p-3 flex items-start gap-2">
            <Search className="w-4 h-4 text-teal-300 mt-0.5 shrink-0" />
            <div><p className="text-xs font-semibold text-teal-200">What to check first</p><p className="text-sm text-slate-300 mt-1 leading-relaxed">{incident.next_steps[0]}</p></div>
          </div>}
          <button type="button" onClick={onTestAlternative} className="inline-flex items-center gap-2 rounded-lg bg-teal-400 px-3 py-2 text-xs font-semibold text-navy-950 hover:bg-teal-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-300">
            Test another explanation <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <div className="flex items-start gap-3">
          {incomplete ? <AlertTriangle className="h-6 w-6 shrink-0 text-amber-200" /> : <CheckCircle2 className="h-6 w-6 shrink-0 text-teal-300" />}
          <div><h2 className="text-lg font-semibold">{incomplete ? "No significant findings in the analyzed portion" : "No significant findings in the supported checks"}</h2><p className="text-sm text-slate-400 mt-2">{incomplete ? "Some traffic or checks could not be analyzed. " : ""}Review capture coverage and retained evidence. An empty finding list does not certify network safety.</p></div>
        </div>
      )}
      {change && <div className="border-t border-slate-700/70 pt-4 space-y-3" aria-label="Interpretation change">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded border px-2 py-1 ${assessmentStyle[change.previous_assessment]}`}>{assessmentLabel[change.previous_assessment]}</span>
          <ArrowRight className="w-4 h-4 text-slate-500" aria-label="changed to" />
          <span className={`rounded border px-2 py-1 ${assessmentStyle[change.current_assessment]}`}>{assessmentLabel[change.current_assessment]}</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">{change.reason_changed}</p>
        <div className="grid sm:grid-cols-2 gap-3 text-xs leading-relaxed">
          <div><p className="font-semibold text-teal-300 mb-1">Evidence retained</p><p className="text-slate-400">{change.evidence_retained}</p></div>
          <div><p className="font-semibold text-amber-200 mb-1">Still needs investigation</p><p className="text-slate-300">{change.remaining_problem}</p></div>
        </div>
      </div>}
    </section>
  );
}
