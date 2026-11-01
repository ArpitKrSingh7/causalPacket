import { Eye, RefreshCw, Radio, ArrowUpRight } from "lucide-react";
import type { HealthResponse } from "@/lib/types";
import { Brand } from "./Brand";

interface HeaderProps {
  isLiveMode: boolean;
  onToggleMode: (live: boolean) => void;
  healthData: HealthResponse | null;
  healthLoading: boolean;
  healthError: string | null;
  onRefreshHealth: () => void;
}

export function Header({ isLiveMode, onToggleMode, healthData, healthLoading, healthError, onRefreshHealth }: HeaderProps) {
  const online = !!healthData && !healthError;
  const ready = online && healthData?.engine_ready === true;
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur-xl">
      <a className="skip-link" href="#main-content">Skip to investigation</a>
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12 min-h-[82px] flex flex-wrap items-center justify-between gap-x-5 gap-y-3 py-4">
        <div className="flex items-center gap-8">
          <Brand />
          <span className="hidden xl:flex border-l border-line pl-7 items-center gap-2 text-xs text-slate-500"><span className="h-1.5 w-1.5 bg-accent rounded-full" />Network investigation studio</span>
        </div>
        <div className="flex items-center flex-wrap gap-3 sm:gap-5">
          <div className="flex items-center gap-2 text-[11px] text-slate-500" title={healthError || (ready ? "Backend connected and analysis engine ready" : "The backend may need a moment to start")}>
            <span className={`h-1.5 w-1.5 rounded-full ${healthLoading ? "bg-slate-400" : ready ? "bg-emerald-600" : "bg-amber-600"}`} />
            <span>{healthLoading ? "Connecting…" : ready ? "Engine online" : online ? "Engine unavailable" : "API offline"}</span>
            <button type="button" onClick={onRefreshHealth} aria-label="Refresh health" className="p-1 hover:text-ink"><RefreshCw className={`h-3 w-3 ${healthLoading ? "animate-spin" : ""}`} /></button>
          </div>
          <div className="flex items-center rounded-lg border border-line p-1 bg-white" aria-label="Workspace mode">
            <button type="button" onClick={() => onToggleMode(true)} aria-pressed={isLiveMode} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors ${isLiveMode ? "bg-ink text-white" : "text-slate-500 hover:bg-muted"}`}><Radio className="h-3 w-3" />Live API</button>
            <button type="button" onClick={() => onToggleMode(false)} aria-pressed={!isLiveMode} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors ${!isLiveMode ? "bg-ink text-white" : "text-slate-500 hover:bg-muted"}`}><Eye className="h-3 w-3" />Preview Mode</button>
          </div>
          <a href="https://github.com/ArpitKrSingh7/causalPacket" target="_blank" rel="noreferrer" className="hidden md:flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-ink">Source <ArrowUpRight className="h-3 w-3" /></a>
        </div>
      </div>
    </header>
  );
}
