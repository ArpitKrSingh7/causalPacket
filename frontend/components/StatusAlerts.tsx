import React from "react";
import { AlertCircle, AlertTriangle, Info, X, WifiOff, Wrench } from "lucide-react";

interface StatusAlertsProps {
  apiError: { message: string; code?: string; status?: number } | null;
  onClearApiError: () => void;
  warnings?: string[];
  isEngineReady?: boolean;
  isLiveMode?: boolean;
}

export function StatusAlerts({
  apiError,
  onClearApiError,
  warnings = [],
  isEngineReady = false,
  isLiveMode = false,
}: StatusAlertsProps) {
  const is501 = apiError?.status === 501 || apiError?.code === "engine_not_ready";

  return (
    <div className="space-y-2.5">
      {/* Live Mode Engine Status Notice */}
      {isLiveMode && !isEngineReady && !apiError && (
        <div className="p-3 rounded-lg bg-navy-850 border border-slate-700/80 text-xs text-slate-300 flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-2.5">
            <Wrench className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-200">
                Backend Packet Engine Pending (HTTP 501)
              </div>
              <p className="text-slate-400 mt-0.5 text-[11px] leading-relaxed">
                The local FastAPI server is online, but capture analysis and reinterpretation routes currently return HTTP 501 (<code className="font-mono text-amber-300">engine_not_ready</code>) while Codex completes the packet detection slice. Switch to Preview Mode to explore author-validated scenario fixtures.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* API / Network Error Alert */}
      {apiError && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-start justify-between gap-3 shadow-sm ${
            is501
              ? "bg-amber-950/40 border-amber-500/40 text-amber-200"
              : "bg-red-950/40 border-red-500/40 text-red-200"
          }`}
          role="alert"
        >
          <div className="flex items-start gap-2.5">
            {is501 ? (
              <Wrench className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-semibold text-slate-100 flex items-center gap-2">
                <span>{is501 ? "Analysis Engine Pending" : "API Operation Failed"}</span>
                {apiError.code && (
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-current opacity-80">
                    {apiError.code}
                  </span>
                )}
              </div>
              <p className="mt-1 text-slate-300 leading-relaxed">
                {apiError.message}
              </p>
              <div className="text-[11px] text-slate-400 mt-1">
                Your existing investigation view has been preserved.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClearApiError}
            className="text-slate-400 hover:text-slate-200 p-1 rounded transition-colors"
            aria-label="Dismiss error notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Warnings from Analysis Report */}
      {warnings.length > 0 && (
        <div className="space-y-1.5">
          {warnings.map((warning, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-navy-950/80 border border-slate-800 text-xs text-slate-400 flex items-center gap-2"
            >
              <Info className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
