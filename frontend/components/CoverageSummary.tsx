import { useState } from "react";
import { Activity, Clock, ShieldAlert, CheckCircle, AlertTriangle, AlertOctagon, ChevronDown, ChevronUp, Layers, Info } from "lucide-react";
import type { CaptureCoverage } from "@/lib/types";

interface CoverageSummaryProps {
  coverage: CaptureCoverage;
  incidentsCount: number;
}

export function CoverageSummary({ coverage, incidentsCount }: CoverageSummaryProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const statusColor = {
    complete: "text-teal-400 bg-teal-500/10 border-teal-500/30",
    partial: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    limited: "text-red-400 bg-red-500/10 border-red-500/30",
  }[coverage.status] || "text-slate-400 bg-slate-800 border-slate-700";

  const StatusIcon = {
    complete: CheckCircle,
    partial: AlertTriangle,
    limited: AlertOctagon,
  }[coverage.status] || CheckCircle;

  return (
    <div className="bg-navy-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
      {/* 4 Compact Count Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Packets */}
        <div className="bg-navy-850/80 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium">Packets</span>
            <Activity className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-100">
            {coverage.packets_seen.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
            {coverage.packets_skipped > 0
              ? `${coverage.packets_decoded} decoded · ${coverage.packets_skipped} skipped`
              : `${coverage.packets_decoded} decoded (100%)`}
          </div>
        </div>

        {/* Duration */}
        <div className="bg-navy-850/80 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium">Capture Duration</span>
            <Clock className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-100">
            {coverage.duration_seconds.toFixed(2)}s
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
            Format: {coverage.format.toUpperCase()}
          </div>
        </div>

        {/* Incidents Count */}
        <div className="bg-navy-850/80 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium">Correlated Incidents</span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-100">
            {incidentsCount}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
            {incidentsCount === 1 ? "1 primary investigation" : `${incidentsCount} investigations`}
          </div>
        </div>

        {/* Coverage Status */}
        <div className="bg-navy-850/80 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium">Capture Coverage</span>
            <StatusIcon className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium border ${statusColor}`}
            >
              {coverage.status.toUpperCase()}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {coverage.status === "complete"
              ? "All supported checks executed"
              : "Partial capture visibility"}
          </div>
        </div>
      </div>

      {/* Protocols & Quick Details Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs">
        <div className="flex items-center flex-wrap gap-2 text-slate-400">
          <span className="text-slate-500 flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-400" /> Protocols:
          </span>
          {coverage.protocols.length > 0 ? (
            coverage.protocols.map((proto) => (
              <span
                key={proto}
                className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300 font-mono text-[11px]"
              >
                {proto}
              </span>
            ))
          ) : (
            <span className="text-slate-500 italic">None recorded</span>
          )}
          {coverage.link_types && coverage.link_types.length > 0 && (
            <span className="text-slate-500 ml-1">
              ({coverage.link_types.join(", ")})
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setDetailsOpen(!detailsOpen)}
          className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors font-medium self-end sm:self-auto"
        >
          <Info className="w-3.5 h-3.5" />
          <span>{detailsOpen ? "Hide Coverage Notes" : "View Scope & Visibility Notes"}</span>
          {detailsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expandable Visibility Notes and Limitations */}
      {detailsOpen && (
        <div className="bg-navy-950/70 border border-slate-800 rounded-lg p-3.5 text-xs space-y-3 mt-2 animate-fadeIn">
          {coverage.visibility_notes && coverage.visibility_notes.length > 0 && (
            <div>
              <span className="font-semibold text-slate-300 block mb-1">
                Visibility Notes:
              </span>
              <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                {coverage.visibility_notes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          {coverage.unsupported_checks && coverage.unsupported_checks.length > 0 && (
            <div>
              <span className="font-semibold text-slate-300 block mb-1">
                Unsupported Checks (by design):
              </span>
              <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                {coverage.unsupported_checks.map((check, idx) => (
                  <li key={idx}>{check}</li>
                ))}
              </ul>
            </div>
          )}

          {coverage.limits_reached && coverage.limits_reached.length > 0 && (
            <div className="p-2.5 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300">
              <span className="font-semibold block mb-0.5">Limits Reached:</span>
              <ul className="list-disc list-inside space-y-0.5">
                {coverage.limits_reached.map((limit, idx) => (
                  <li key={idx}>{limit}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
