import { Server, Wifi, WifiOff, Eye, RefreshCw } from "lucide-react";
import type { HealthResponse } from "@/lib/types";

interface HeaderProps {
  isLiveMode: boolean;
  onToggleMode: (live: boolean) => void;
  healthData: HealthResponse | null;
  healthLoading: boolean;
  healthError: string | null;
  onRefreshHealth: () => void;
}

export function Header({
  isLiveMode,
  onToggleMode,
  healthData,
  healthLoading,
  healthError,
  onRefreshHealth,
}: HeaderProps) {
  const isOnline = !!healthData && !healthError;
  const isEngineReady = healthData?.engine_ready === true;

  return (
    <header className="border-b border-slate-800 bg-navy-900/90 backdrop-blur sticky top-0 z-30 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 font-mono font-bold text-lg">
            CP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-slate-100 tracking-tight">
                CausalPacket
              </h1>
              <span className="text-xs px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/25 text-teal-300 font-mono">
                Fault or Foe?
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Evidence-first packet capture investigator
            </p>
          </div>
        </div>

        {/* Status Indicators & Mode Switcher */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* Backend Status Pill */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-navy-850 border border-slate-800 text-xs">
            {healthLoading ? (
              <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />
            ) : isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-teal-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="text-slate-300 font-mono">
              {isOnline ? "API Online" : "API Offline"}
            </span>
            <span className="text-slate-600">|</span>
            <span
              className={`font-mono ${
                isEngineReady
                  ? "text-teal-400"
                  : "text-amber-400/90"
              }`}
              title={
                healthLoading
                  ? "Checking backend availability"
                  : !isOnline
                  ? "Backend could not be reached; start it or check its connection"
                  : isEngineReady
                  ? "Engine ready for capture analysis"
                  : "Backend responded, but analysis is currently unavailable"
              }
            >
              {healthLoading ? "Checking Engine" : !isOnline ? "Engine Unavailable" : isEngineReady ? "Engine Ready" : "Analysis Unavailable"}
            </span>
            <button
              onClick={onRefreshHealth}
              title="Refresh API health status"
              className="ml-1 text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Refresh health"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center rounded-lg bg-navy-850 p-0.5 border border-slate-800">
            <button
              type="button"
              onClick={() => onToggleMode(false)}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                !isLiveMode
                  ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Preview Mode
            </button>
            <button
              type="button"
              onClick={() => onToggleMode(true)}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                isLiveMode
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              Live API
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
