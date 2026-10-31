import React from "react";
import { ShieldAlert, ShieldCheck, AlertTriangle, HelpCircle, ChevronRight, CheckCircle2 } from "lucide-react";
import type { Incident, Assessment, Severity } from "@/lib/types";

interface IncidentListProps {
  incidents: Incident[];
  selectedIncidentId: string | null;
  onSelectIncident: (id: string) => void;
}

export function IncidentList({
  incidents,
  selectedIncidentId,
  onSelectIncident,
}: IncidentListProps) {
  const getAssessmentBadge = (assessment: Assessment) => {
    switch (assessment) {
      case "suspected_attack":
        return {
          label: "Suspected Attack",
          color: "bg-red-500/15 border-red-500/40 text-red-300",
          icon: ShieldAlert,
        };
      case "likely_fault":
        return {
          label: "Likely Fault",
          color: "bg-amber-500/15 border-amber-500/40 text-amber-300",
          icon: AlertTriangle,
        };
      case "unresolved":
      default:
        return {
          label: "Unresolved",
          color: "bg-slate-700/50 border-slate-600/50 text-slate-300",
          icon: HelpCircle,
        };
    }
  };

  const getSeverityBadge = (severity: Severity) => {
    switch (severity) {
      case "high":
        return "text-red-400 bg-red-950/60 border-red-800/60";
      case "medium":
        return "text-amber-400 bg-amber-950/60 border-amber-800/60";
      case "low":
        return "text-sky-400 bg-sky-950/60 border-sky-800/60";
      case "info":
      default:
        return "text-slate-400 bg-slate-800/60 border-slate-700/60";
    }
  };

  if (incidents.length === 0) {
    return (
      <div className="bg-navy-900 border border-slate-800 rounded-xl p-5 shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-200">
          No significant findings in the supported checks
        </h3>
        <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
          The analyzed traffic completed without triggering supported fault or probe signatures.
          This describes the analyzed sample only, not a network safety certification.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1 mb-1">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Incidents ({incidents.length})
        </h3>
      </div>

      <div className="space-y-2">
        {incidents.map((incident) => {
          const isSelected = incident.id === selectedIncidentId;
          const assessment = getAssessmentBadge(incident.assessment);
          const AssessmentIcon = assessment.icon;

          return (
            <div
              key={incident.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectIncident(incident.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectIncident(incident.id);
                }
              }}
              className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer relative group focus:outline-none focus:ring-1 focus:ring-teal-400 ${
                isSelected
                  ? "bg-navy-850 border-teal-500/60 shadow-md ring-1 ring-teal-500/30"
                  : "bg-navy-900/90 hover:bg-navy-850/80 border-slate-800/90 hover:border-slate-700"
              }`}
            >
              {/* Badges */}
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${assessment.color}`}
                >
                  <AssessmentIcon className="w-3 h-3" />
                  {assessment.label}
                </span>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold border ${getSeverityBadge(
                    incident.severity
                  )}`}
                >
                  {incident.severity}
                </span>
              </div>

              {/* Title & Summary */}
              <h4 className="text-sm font-semibold text-slate-100 group-hover:text-teal-300 transition-colors">
                {incident.title}
              </h4>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {incident.summary}
              </p>

              {/* Counts footer */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-800/60">
                <span className="font-mono">
                  {incident.observation_ids.length} observations · {incident.hypotheses.length} hypotheses
                </span>
                <ChevronRight
                  className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                    isSelected ? "text-teal-400 transform translate-x-0.5" : ""
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
