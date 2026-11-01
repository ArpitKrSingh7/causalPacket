import { ArrowLeftRight, Clock3, Files, Layers, ScanLine } from "lucide-react";
import type { AnalysisReport } from "@/lib/types";

export function CaptureOverview({ report, expanded, onChange }: { report: AnalysisReport; expanded: boolean; onChange: () => void }) {
  const stats = [
    { label: "Packets decoded", value: report.coverage.packets_decoded.toLocaleString(), icon: Files },
    { label: "Capture duration", value: `${report.coverage.duration_seconds.toFixed(2)}s`, icon: Clock3 },
    { label: "Investigations", value: String(report.incidents.length).padStart(2, "0"), icon: Layers },
    { label: "Capture coverage", value: report.coverage.status, icon: ScanLine },
  ];
  return (
    <section aria-label="Capture overview" className="pt-3 page-enter">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div className="min-w-0"><p className="eyebrow text-slate-500 mb-2">Workspace / Current investigation</p><h1 className="font-display text-xl sm:text-[28px] font-medium tracking-[-.04em] break-all">{report.source_name}</h1></div>
        <button type="button" aria-expanded={expanded} aria-controls={expanded ? "capture-ingestion" : undefined} onClick={onChange} className="button-secondary"><ArrowLeftRight className="h-3.5 w-3.5" />{expanded ? "Hide capture choices" : "Change capture"}</button>
      </div>
      <dl className="grid grid-cols-2 lg:grid-cols-4 rounded-2xl border border-line bg-white overflow-hidden">
        {stats.map(({ label, value, icon: Icon }, index) => <div key={label} className={`p-4 sm:px-6 sm:py-5 ${index ? "border-l border-line" : ""} ${index === 2 ? "border-l-0 lg:border-l border-t lg:border-t-0" : index === 3 ? "border-t lg:border-t-0" : ""}`}><dt className="flex items-center gap-2 text-[10px] text-slate-500"><Icon className="w-3.5 h-3.5" />{label}</dt><dd className={`font-display text-2xl sm:text-[29px] tracking-[-.04em] mt-2 ${label === "Capture coverage" ? "capitalize text-xl sm:text-2xl " + (value === "complete" ? "text-ink" : "text-amber-800") : "text-ink"}`}>{value}</dd></div>)}
      </dl>
    </section>
  );
}
