import type { Assessment } from "./types";

export const assessmentLabel: Record<Assessment, string> = {
  likely_fault: "Likely fault",
  suspected_attack: "Suspected attack",
  unresolved: "Unresolved",
};

export const assessmentStyle: Record<Assessment, string> = {
  likely_fault: "border-amber-500/40 bg-amber-500/10 text-amber-800",
  suspected_attack: "border-red-400/40 bg-red-500/10 text-red-700",
  unresolved: "border-slate-300 bg-slate-100 text-ink",
};
