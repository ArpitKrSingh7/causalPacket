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
    <section aria-label="Investigation summary" className="rounded-2xl border border-line bg-white p-5 sm:p-7 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="eyebrow text-slate-500">The investigation brief</span>
        {incomplete && <span className="text-amber-800 text-[10px]">Based on {report.coverage.status} coverage</span>}
      </div>
      {incident ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${assessmentStyle[incident.assessment]}`}>{assessmentLabel[incident.assessment]}</span>
            <span className="text-xs text-slate-500">{incident.observation_ids.length} observation{incident.observation_ids.length === 1 ? "" : "s"} · {incident.hypotheses.length} possible explanations</span>
          </div>
          <div>
            <h2 className="font-display text-[25px] sm:text-[30px] font-medium leading-tight tracking-[-.04em] text-ink">{incident.title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{incident.summary}</p>
          </div>
          {incident.next_steps[0] && <div className="rounded-xl border border-[#dce4f0] bg-[#f5f8fd] p-4 flex items-start gap-3">
            <Search className="w-4 h-4 text-cobalt mt-0.5 shrink-0" />
            <div><p className="text-[10px] font-semibold text-cobalt uppercase tracking-wider">What to check first</p><p className="text-xs text-slate-600 mt-2 leading-6">{incident.next_steps[0]}</p></div>
          </div>}
          <button type="button" onClick={onTestAlternative} className="button-primary">
            Test another explanation <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <div className="flex items-start gap-3">
          {incomplete ? <AlertTriangle className="h-6 w-6 shrink-0 text-amber-800" /> : <CheckCircle2 className="h-6 w-6 shrink-0 text-teal-700" />}
          <div><h2 className="text-lg font-semibold">{incomplete ? "No significant findings in the analyzed portion" : "No significant findings in the supported checks"}</h2><p className="text-sm text-slate-500 mt-2">{incomplete ? "Some traffic or checks could not be analyzed. " : ""}Review capture coverage and retained evidence. An empty finding list does not certify network safety.</p></div>
        </div>
      )}
      {change && <div className="border-t border-line/70 pt-4 space-y-3" aria-label="Interpretation change">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded border px-2 py-1 ${assessmentStyle[change.previous_assessment]}`}>{assessmentLabel[change.previous_assessment]}</span>
          <ArrowRight className="w-4 h-4 text-slate-500" aria-label="changed to" />
          <span className={`rounded border px-2 py-1 ${assessmentStyle[change.current_assessment]}`}>{assessmentLabel[change.current_assessment]}</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">{change.reason_changed}</p>
        <div className="grid sm:grid-cols-2 gap-3 text-xs leading-relaxed">
          <div><p className="font-semibold text-teal-700 mb-1">Evidence retained</p><p className="text-slate-500">{change.evidence_retained}</p></div>
          <div><p className="font-semibold text-amber-800 mb-1">Still needs investigation</p><p className="text-slate-600">{change.remaining_problem}</p></div>
        </div>
      </div>}
    </section>
  );
}
