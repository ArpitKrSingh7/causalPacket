import {
  FileSearch,
  AlertCircle,
  ArrowRight,
  Filter,
  ExternalLink,
  Sparkles,
  Compass,
  Link2,
} from "lucide-react";
import type {
  Incident,
  Observation,
  Hypothesis,
  EvidenceEdge,
} from "@/lib/types";

interface IncidentDetailProps {
  incident: Incident;
  observations: Observation[];
  edges?: EvidenceEdge[];
  onOpenFrame: (frameNumber: number) => void;
  onFilterObservationFrames: (observationId: string, frames: number[]) => void;
  activeFilteredObservationId: string | null;
}

export function IncidentDetail({
  incident,
  observations,
  edges = [],
  onOpenFrame,
  onFilterObservationFrames,
  activeFilteredObservationId,
}: IncidentDetailProps) {
  // Map observations by id for direct lookup
  const observationMap = new Map(observations.map((obs) => [obs.id, obs]));
  const incidentObservations = incident.observation_ids
    .map((id) => observationMap.get(id))
    .filter((obs): obs is Observation => !!obs);

  // Filter edges relevant to this incident's observations
  const incidentEdges = edges.filter(
    (edge) =>
      incident.observation_ids.includes(edge.source_observation_id) ||
      incident.observation_ids.includes(edge.target_observation_id)
  );

  const getEvidenceLevelBadge = (level: Hypothesis["evidence_level"]) => {
    switch (level) {
      case "supported":
        return {
          label: "Supported",
          color: "bg-teal-500/20 text-teal-700 border-teal-500/40",
        };
      case "plausible":
        return {
          label: "Plausible",
          color: "bg-amber-500/20 text-amber-800 border-amber-500/40",
        };
      case "insufficient":
      default:
        return {
          label: "Insufficient",
          color: "bg-slate-200/60 text-slate-600 border-slate-300/60",
        };
    }
  };

  const formatRelationLabel = (relation: EvidenceEdge["relation"]) => {
    switch (relation) {
      case "precedes_on_shared_client":
        return "Precedes on shared client";
      case "shares_affected_client":
        return "Shares affected client";
      case "same_probe_pattern":
        return "Same probe pattern";
      default:
        return String(relation).replace(/_/g, " ");
    }
  };

  return (
    <div className="bg-white p-5 shadow-sm space-y-6">
      {/* Incident Header */}
      <div className="border-b border-line pb-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 border border-line text-slate-600">
            {incident.id}
          </span>
          <span
            className={`text-xs font-mono uppercase px-2 py-0.5 rounded border ${
              incident.assessment === "suspected_attack"
                ? "bg-red-500/20 text-red-700 border-red-500/40"
                : incident.assessment === "likely_fault"
                ? "bg-amber-500/20 text-amber-800 border-amber-500/40"
                : "bg-slate-200/50 text-slate-600 border-slate-300/50"
            }`}
          >
            {incident.assessment.replace("_", " ")}
          </span>
          <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-slate-100 border border-line text-slate-500">
            Severity: {incident.severity}
          </span>
        </div>
        <h2 className="text-lg font-bold text-ink">{incident.title}</h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
          {incident.summary}
        </p>
      </div>

      {/* SECTION 1: What happened (Recorded Observations & Facts) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
            <FileSearch className="w-4 h-4" />
            1. What happened — Observed Facts
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">
            {incidentObservations.length} observation(s)
          </span>
        </div>

        <div className="space-y-3">
          {incidentObservations.map((obs) => {
            const isFilterActive = activeFilteredObservationId === obs.id;

            return (
              <div
                key={obs.id}
                className={`p-3.5 rounded-lg border transition-colors ${
                  isFilterActive
                    ? "bg-slate-50 border-teal-500/50 ring-1 ring-teal-500/30"
                    : "bg-slate-50/70 border-line"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-ink">
                      {obs.title}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-teal-700 border border-line">
                      {obs.type}
                    </span>
                  </div>

                  {/* Filter timeline toggle */}
                  <button
                    type="button"
                    onClick={() =>
                      onFilterObservationFrames(
                        obs.id,
                        isFilterActive ? [] : obs.evidence_frames
                      )
                    }
                    className={`text-[11px] px-2 py-1 rounded flex items-center gap-1 transition-colors self-start sm:self-auto ${
                      isFilterActive
                        ? "bg-teal-500/20 text-teal-700 border border-teal-500/40"
                        : "text-slate-500 hover:text-ink bg-slate-100/80 hover:bg-slate-100 border border-line/60"
                    }`}
                  >
                    <Filter className="w-3 h-3" />
                    <span>
                      {isFilterActive ? "Clear Filter" : `Filter Timeline (${obs.evidence_frames.length})`}
                    </span>
                  </button>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {obs.description}
                </p>

                {/* Scope & Entities */}
                <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-line/60 text-[11px]">
                  <span className="text-slate-500 font-mono">Scope: {obs.scope_id}</span>
                  {obs.entities.map((entity, eIdx) => (
                    <span
                      key={eIdx}
                      className="px-2 py-0.5 rounded bg-slate-100/90 text-slate-600 border border-line/70 font-mono"
                    >
                      <span className="text-slate-500">{entity.kind}:</span> {entity.value}
                    </span>
                  ))}
                </div>

                {/* Exact Metrics */}
                {obs.metrics.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
                    {obs.metrics.map((metric, mIdx) => (
                      <div
                        key={mIdx}
                        className="px-2 py-1 rounded bg-white border border-line text-slate-600 flex items-center gap-1.5"
                      >
                        <span className="text-slate-500">{metric.label}:</span>
                        <span className="font-mono font-semibold text-teal-700">
                          {String(metric.value)}
                          {metric.unit ? ` ${metric.unit}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Supporting Frames */}
                <div className="mt-2.5 flex items-center flex-wrap gap-1.5">
                  <span className="text-[11px] text-slate-500">Supporting frames:</span>
                  {obs.evidence_frames.map((frameNum) => (
                    <button
                      key={frameNum}
                      type="button"
                      onClick={() => onOpenFrame(frameNum)}
                      className="text-xs font-mono px-2 py-0.5 rounded bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-700 transition-colors flex items-center gap-1"
                      title={`Inspect frame #${frameNum} headers`}
                    >
                      <span>#{frameNum}</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </button>
                  ))}
                  {obs.total_evidence_count > obs.evidence_frames.length && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      (+{obs.total_evidence_count - obs.evidence_frames.length} additional occurrences)
                    </span>
                  )}
                </div>

                {/* Caveats */}
                {obs.caveats.length > 0 && (
                  <div className="mt-2 text-[11px] text-amber-800/90 bg-amber-50/30 border border-amber-500/20 rounded p-2">
                    <span className="font-semibold">Caveat:</span> {obs.caveats.join("; ")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 1.5: Why these findings are linked (Render report.edges) */}
      {incidentEdges.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
              <Link2 className="w-4 h-4" />
              Why these findings are linked — Grouping Associations
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-50 text-slate-500 border border-line">
              Association · Chronology
            </span>
          </div>

          <div className="space-y-2.5">
            {incidentEdges.map((edge) => {
              const srcObs = observationMap.get(edge.source_observation_id);
              const tgtObs = observationMap.get(edge.target_observation_id);

              return (
                <div
                  key={edge.id}
                  className="bg-slate-50/80 border border-line/90 rounded-lg p-3.5 space-y-2.5"
                >
                  {/* Source -> Target relationship header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line/60 pb-2">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-semibold text-ink">
                        {srcObs?.title || edge.source_observation_id}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-teal-700 flex-shrink-0" />
                      <span className="font-semibold text-ink">
                        {tgtObs?.title || edge.target_observation_id}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 self-start sm:self-auto">
                      <span className="px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/25 text-teal-700">
                        {formatRelationLabel(edge.relation)}
                      </span>
                      <span className="text-slate-400">|</span>
                      <span className="text-slate-500">{edge.rule_id}</span>
                    </div>
                  </div>

                  {/* Association reason (non-causal framing) */}
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {edge.reason}
                  </p>

                  {/* Clickable frame tags resolving to report.evidence */}
                  {edge.evidence_frames && edge.evidence_frames.length > 0 && (
                    <div className="flex items-center flex-wrap gap-1.5 pt-1 text-[11px]">
                      <span className="text-slate-500">Connecting frames:</span>
                      {edge.evidence_frames.map((frameNum) => (
                        <button
                          key={frameNum}
                          type="button"
                          onClick={() => onOpenFrame(frameNum)}
                          className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-teal-700 border border-line transition-colors flex items-center gap-1"
                          title={`Inspect frame #${frameNum} headers`}
                        >
                          <span>#{frameNum}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() =>
                          onFilterObservationFrames(
                            edge.id,
                            activeFilteredObservationId === edge.id
                              ? []
                              : edge.evidence_frames
                          )
                        }
                        className="ml-auto text-[11px] text-slate-500 hover:text-teal-700 underline underline-offset-2 transition-colors"
                      >
                        {activeFilteredObservationId === edge.id
                          ? "Clear edge filter"
                          : `Filter timeline to edge frames (${edge.evidence_frames.length})`}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-[11px] text-slate-500 italic px-1">
            Note: Associations reflect observed temporal sequences on a shared client; they do not claim mathematical proof of causality.
          </div>
        </div>
      )}

      {/* SECTION 2: Why this explanation (Competing Hypotheses) */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" />
          2. Why this explanation — Competing Hypotheses
        </h3>

        <div className="space-y-3">
          {incident.hypotheses.map((hypothesis) => {
            const levelBadge = getEvidenceLevelBadge(hypothesis.evidence_level);

            return (
              <div
                key={hypothesis.id}
                className="bg-slate-50/70 border border-line rounded-lg p-3.5 space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <h4 className="text-sm font-semibold text-ink">
                    {hypothesis.title}
                  </h4>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium border self-start sm:self-auto ${levelBadge.color}`}
                  >
                    Evidence: {levelBadge.label}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {hypothesis.explanation}
                </p>

                {/* Supporting Reasons */}
                {hypothesis.supporting_reasons.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-slate-500 block">
                      Supporting Reasons:
                    </span>
                    <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5 pl-1">
                      {hypothesis.supporting_reasons.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: What challenges it */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4" />
          3. What challenges it &amp; Missing Context
        </h3>

        <div className="space-y-3">
          {incident.hypotheses.map((hypothesis) => {
            const hasChallenges = hypothesis.challenging_reasons.length > 0;
            const hasMissing = hypothesis.missing_evidence.length > 0;

            if (!hasChallenges && !hasMissing) return null;

            return (
              <div
                key={hypothesis.id}
                className="bg-slate-50/70 border border-line rounded-lg p-3.5 space-y-2.5"
              >
                <div className="text-xs font-medium text-slate-600">
                  Regarding: <span className="text-ink font-semibold">{hypothesis.title}</span>
                </div>

                {hasChallenges && (
                  <div>
                    <span className="text-[11px] font-medium text-amber-800/90 block mb-1">
                      Challenging Factors:
                    </span>
                    <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5 pl-1">
                      {hypothesis.challenging_reasons.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {hasMissing && (
                  <div>
                    <span className="text-[11px] font-medium text-slate-500 block mb-1">
                      Missing Evidence (unestablished in capture):
                    </span>
                    <ul className="list-disc list-inside text-xs text-slate-500 space-y-0.5 pl-1">
                      {hypothesis.missing_evidence.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 4: What to check next & Comparisons */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
          <Compass className="w-4 h-4" />
          4. What to check next &amp; Observed Comparisons
        </h3>

        {/* Action Steps */}
        <div className="bg-slate-50/70 border border-line rounded-lg p-3.5 space-y-2">
          <span className="text-xs font-medium text-slate-600 block">
            Suggested Verification &amp; Troubleshooting:
          </span>
          <div className="space-y-1.5">
            {incident.next_steps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                <ArrowRight className="w-3.5 h-3.5 text-teal-700 flex-shrink-0 mt-0.5" />
                <span>{step}</span>
              </div>
            ))}
          </div>

          {incident.limitations.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-line/60">
              <span className="text-[11px] font-medium text-slate-500 block mb-1">
                Investigation Limitations:
              </span>
              <ul className="list-disc list-inside text-xs text-slate-500 space-y-0.5 pl-1">
                {incident.limitations.map((limit, idx) => (
                  <li key={idx}>{limit}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Comparisons (if present) */}
        {incident.comparisons.length > 0 && (
          <div className="space-y-2 mt-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Observed Comparisons ({incident.comparisons.length})
            </span>

            {incident.comparisons.map((comp) => (
              <div
                key={comp.id}
                className="bg-slate-50/70 border border-line rounded-lg p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink">
                    {comp.title}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      comp.status === "available"
                        ? "bg-teal-500/20 text-teal-700 border-teal-500/40"
                        : "bg-slate-100 text-slate-500 border-line"
                    }`}
                  >
                    {comp.status === "available" ? "Comparator Available" : "No Comparator Observed"}
                  </span>
                </div>

                <p className="text-xs text-slate-500">{comp.basis}</p>

                {comp.status === "available" && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {/* Baseline */}
                    <div className="bg-white border border-line rounded p-2.5">
                      <span className="text-[11px] font-medium text-slate-500 block mb-1">
                        {comp.baseline_label}
                      </span>
                      <div className="space-y-1">
                        {comp.baseline_metrics.map((m, idx) => (
                          <div key={idx} className="text-xs flex justify-between font-mono">
                            <span className="text-slate-500">{m.label}</span>
                            <span className="text-ink font-semibold">
                              {String(m.value)} {m.unit || ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Current */}
                    <div className="bg-white border border-line rounded p-2.5">
                      <span className="text-[11px] font-medium text-teal-700 block mb-1">
                        {comp.current_label}
                      </span>
                      <div className="space-y-1">
                        {comp.current_metrics.map((m, idx) => (
                          <div key={idx} className="text-xs flex justify-between font-mono">
                            <span className="text-slate-500">{m.label}</span>
                            <span className="text-teal-700 font-semibold">
                              {String(m.value)} {m.unit || ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Evidence Frames */}
                {comp.evidence_frames && comp.evidence_frames.length > 0 && (
                  <div className="flex items-center gap-1.5 pt-1 text-[11px]">
                    <span className="text-slate-500">Comparator frames:</span>
                    {comp.evidence_frames.map((frameNum) => (
                      <button
                        key={frameNum}
                        type="button"
                        onClick={() => onOpenFrame(frameNum)}
                        className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-teal-700 border border-line transition-colors flex items-center gap-1"
                        title={`Inspect frame #${frameNum} headers`}
                      >
                        <span>#{frameNum}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </button>
                    ))}
                  </div>
                )}

                {comp.limitations.length > 0 && (
                  <div className="text-[11px] text-slate-500 pt-1">
                    <span className="font-medium text-slate-500">Comparison limit:</span>{" "}
                    {comp.limitations.join("; ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
