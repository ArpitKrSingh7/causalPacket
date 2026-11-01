import { Info, CheckCircle } from "lucide-react";
import { PREVIEW_FIXTURES } from "@/lib/fixtures";

interface PreviewBannerProps {
  currentKey: string;
  onSelectFixture: (key: string) => void;
  isLiveMode: boolean;
  dataOrigin: "capture" | "development_fixture";
  sourceName: string;
  onSwitchToLive?: () => void;
  onReturnToPreview?: () => void;
}

export function PreviewBanner({
  currentKey,
  onSelectFixture,
  isLiveMode,
  dataOrigin,
  sourceName,
  onReturnToPreview,
}: PreviewBannerProps) {
  const isFixture = dataOrigin === "development_fixture";

  if (!isFixture) {
    // Report is genuine live analyzed traffic
    return (
      <div className="bg-teal-50/40 border-b border-teal-500/30 px-4 py-2 text-xs text-teal-700">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-teal-500/20 text-teal-700 font-mono font-medium tracking-wide border border-teal-500/40">
              <CheckCircle className="w-3.5 h-3.5" />
              Live Capture Analysis
            </span>
            <span className="text-slate-600">
              Active Source: <strong className="text-teal-700 font-mono">{sourceName}</strong>
            </span>
          </div>

          {onReturnToPreview && (
            <button
              type="button"
              onClick={onReturnToPreview}
              className="text-xs text-slate-500 hover:text-teal-700 underline underline-offset-2 transition-colors self-end sm:self-auto"
            >
              View Scripted Scenario Previews
            </button>
          )}
        </div>
      </div>
    );
  }

  // Report is a fictional fixture (even if Live mode is selected)
  return (
    <div className="bg-amber-50/40 border-b border-amber-500/30 px-4 py-2.5 text-xs text-amber-800">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Banner Title & Fictional Data Notice */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 font-mono font-medium tracking-wide border border-amber-500/40">
            <Info className="w-3.5 h-3.5" />
            Development preview · fictional data
          </span>
          <span className="text-amber-800/80">
            {isLiveMode
              ? "Active report is a fictional scenario template. Upload a capture or select a sample below to run live analysis."
              : "Fictional scenario fixtures for UI layout validation. No capture was analyzed."}
          </span>
        </div>

        {/* Fixture Selector */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <label
            htmlFor="preview-scenario-select"
            className="text-amber-800/90 font-medium whitespace-nowrap text-xs"
          >
            Scenario:
          </label>
          <select
            id="preview-scenario-select"
            value={currentKey}
            onChange={(e) => onSelectFixture(e.target.value)}
            className="bg-white border border-amber-500/40 text-amber-800 rounded px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 w-full md:w-auto font-sans"
          >
            {Object.values(PREVIEW_FIXTURES).map((fixture) => (
              <option key={fixture.id} value={fixture.id}>
                {fixture.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
