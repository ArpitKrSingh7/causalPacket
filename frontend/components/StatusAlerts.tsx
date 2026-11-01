import { AlertCircle, Info, X, Wrench } from "lucide-react";

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
        <div className="p-3 rounded-lg bg-slate-50 border border-line/80 text-xs text-slate-600 flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-2.5">
            <Wrench className="w-4 h-4 text-amber-800 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-ink">
                Backend connection required
              </div>
              <p className="text-slate-500 mt-0.5 text-[11px] leading-relaxed">
                Checking analysis availability. If the backend is unavailable, start the API or check its connection. Preview Mode contains clearly labeled fictional examples.
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
              ? "bg-amber-50/40 border-amber-500/40 text-amber-800"
              : "bg-red-50/40 border-red-500/40 text-red-700"
          }`}
          role="alert"
        >
          <div className="flex items-start gap-2.5">
            {is501 ? (
              <Wrench className="w-4 h-4 text-amber-800 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-700 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-semibold text-ink flex items-center gap-2">
                <span>{is501 ? "Analysis Engine Pending" : "API Operation Failed"}</span>
                {apiError.code && (
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-current opacity-80">
                    {apiError.code}
                  </span>
                )}
              </div>
              <p className="mt-1 text-slate-600 leading-relaxed">
                {apiError.message}
              </p>
              <div className="text-[11px] text-slate-500 mt-1">
                Your existing investigation view has been preserved.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClearApiError}
            className="text-slate-500 hover:text-ink p-1 rounded transition-colors"
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
              className="p-2.5 rounded-lg bg-slate-50/80 border border-line text-xs text-slate-500 flex items-center gap-2"
            >
              <Info className="w-3.5 h-3.5 text-teal-700 flex-shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
