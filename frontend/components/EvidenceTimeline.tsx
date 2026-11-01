import { useState, useMemo } from "react";
import { Clock, Filter, Layers, X, Search, ArrowRight, ExternalLink } from "lucide-react";
import type { PacketEvidence } from "@/lib/types";

interface EvidenceTimelineProps {
  evidence: PacketEvidence[];
  onOpenFrame: (frameNumber: number) => void;
  filteredFrameNumbers: number[] | null;
  onClearFilter: () => void;
  activeFilterLabel?: string;
}

export function EvidenceTimeline({
  evidence,
  onOpenFrame,
  filteredFrameNumbers,
  onClearFilter,
  activeFilterLabel,
}: EvidenceTimelineProps) {
  const [selectedProtocol, setSelectedProtocol] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Get unique protocols in current evidence
  const protocols = useMemo(() => {
    const set = new Set(evidence.map((e) => e.protocol));
    return ["ALL", ...Array.from(set)];
  }, [evidence]);

  // Filtered evidence frames
  const visibleFrames = useMemo(() => {
    return evidence.filter((frame) => {
      // If observation filter is active
      if (
        filteredFrameNumbers !== null &&
        !filteredFrameNumbers.includes(frame.frame_number)
      ) {
        return false;
      }

      // Protocol filter
      if (selectedProtocol !== "ALL" && frame.protocol !== selectedProtocol) {
        return false;
      }

      // Search query (matches summary, IP, MAC, ports)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSummary = frame.summary.toLowerCase().includes(q);
        const matchesSource =
          (frame.source_ip && frame.source_ip.toLowerCase().includes(q)) ||
          (frame.source_mac && frame.source_mac.toLowerCase().includes(q));
        const matchesDest =
          (frame.destination_ip && frame.destination_ip.toLowerCase().includes(q)) ||
          (frame.destination_mac && frame.destination_mac.toLowerCase().includes(q));
        const matchesFrameNum = String(frame.frame_number) === q;
        if (!matchesSummary && !matchesSource && !matchesDest && !matchesFrameNum) {
          return false;
        }
      }

      return true;
    });
  }, [evidence, filteredFrameNumbers, selectedProtocol, searchQuery]);

  const getProtocolBadge = (proto: PacketEvidence["protocol"]) => {
    switch (proto) {
      case "ARP":
        return "bg-sky-500/20 text-sky-300 border-sky-500/40";
      case "TCP":
        return "bg-teal-500/20 text-teal-300 border-teal-500/40";
      case "DNS":
        return "bg-purple-500/20 text-purple-300 border-purple-500/40";
      case "UDP":
        return "bg-indigo-500/20 text-indigo-300 border-indigo-500/40";
      case "ICMP":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      default:
        return "bg-slate-700/50 text-slate-300 border-slate-600/50";
    }
  };

  const formatEndpoint = (
    ip: string | null,
    mac: string | null,
    port: number | null
  ) => {
    if (ip) return port ? `${ip}:${port}` : ip;
    if (mac) return mac;
    return "—";
  };

  return (
    <div className="bg-navy-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-400" />
            Chronological Evidence Timeline
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Original capture frame order with exact offsets and sanitized header metadata
          </p>
        </div>

        {/* Counts & Active Filter Pill */}
        <div className="flex items-center gap-2">
          {filteredFrameNumbers !== null && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-mono">
              <Filter className="w-3 h-3" />
              <span>{activeFilterLabel || "Observation filter active"}</span>
              <button
                type="button"
                onClick={onClearFilter}
                className="hover:text-teal-100 ml-1"
                title="Clear observation filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <span className="text-xs font-mono text-slate-500">
            Showing {visibleFrames.length} of {evidence.length} frames
          </span>
        </div>
      </div>

      {/* Protocol filter & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center flex-wrap gap-1.5">
          <span className="text-xs text-slate-500 mr-1 flex items-center gap-1">
            <Layers className="w-3 h-3" /> Protocol:
          </span>
          {protocols.map((proto) => (
            <button
              key={proto}
              type="button"
              onClick={() => setSelectedProtocol(proto)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                selectedProtocol === proto
                  ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 font-semibold"
                  : "bg-navy-950 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700"
              }`}
            >
              {proto}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search frame, IP, summary..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-48 bg-navy-950 border border-slate-800 rounded-md pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-400"
          />
        </div>
      </div>

      {/* Timeline Frames List */}
      {visibleFrames.length === 0 ? (
        <div className="p-8 text-center bg-navy-950/50 border border-slate-800/80 rounded-lg text-slate-400 text-xs">
          No frames match the active filters or search criteria.
          {filteredFrameNumbers !== null && (
            <button
              type="button"
              onClick={onClearFilter}
              className="block mx-auto mt-2 text-teal-400 hover:underline"
            >
              Clear observation filter
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
          {visibleFrames.map((frame) => {
            const protoBadge = getProtocolBadge(frame.protocol);

            return (
              <div
                key={frame.frame_number}
                role="button"
                tabIndex={0}
                onClick={() => onOpenFrame(frame.frame_number)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenFrame(frame.frame_number);
                  }
                }}
                className="p-3 rounded-lg bg-navy-950/70 hover:bg-navy-850/80 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400"
              >
                {/* Left: Frame #, Protocol, Offset */}
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <span className="font-mono font-bold text-teal-300 px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/25">
                    #{frame.frame_number}
                  </span>
                  <span
                    className={`font-mono px-2 py-0.5 rounded text-[11px] font-medium border ${protoBadge}`}
                  >
                    {frame.protocol}
                  </span>
                  <span className="font-mono text-slate-500 text-[11px]">
                    +{frame.time_offset_seconds.toFixed(3)}s
                  </span>
                </div>

                {/* Center: Endpoints & Summary */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px] truncate">
                    <span className="truncate">
                      {formatEndpoint(frame.source_ip, frame.source_mac, frame.source_port)}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
                    <span className="truncate">
                      {formatEndpoint(frame.destination_ip, frame.destination_mac, frame.destination_port)}
                    </span>
                  </div>
                  <div className="text-slate-400 group-hover:text-slate-200 transition-colors text-xs truncate mt-0.5">
                    {frame.summary}
                  </div>
                </div>

                {/* Right: Action badge */}
                <div className="flex items-center gap-1 text-slate-500 group-hover:text-teal-300 font-mono text-[11px] flex-shrink-0 self-end sm:self-center">
                  <span>Inspect</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
