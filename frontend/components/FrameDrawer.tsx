import { useEffect, useRef } from "react";
import { X, Clock, Terminal } from "lucide-react";
import type { PacketEvidence } from "@/lib/types";

interface FrameDrawerProps {
  frame: PacketEvidence | null;
  onClose: () => void;
  contextLabel?: string;
  sourceFrameNumber?: number;
}

export function FrameDrawer({ frame, onClose, contextLabel, sourceFrameNumber }: FrameDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key & focus drawer on open
  useEffect(() => {
    if (!frame) return;

    // Focus the drawer container for immediate keyboard interaction
    drawerRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [frame, onClose]);

  if (!frame) return null;

  const formatEndpoint = (
    ip: string | null,
    mac: string | null,
    port: number | null
  ) => {
    if (ip) {
      return port ? `${ip}:${port}` : ip;
    }
    if (mac) {
      return mac;
    }
    return "unrecorded";
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="frame-drawer-title"
    >
      <div
        ref={drawerRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-navy-900 border-l border-slate-800 h-full overflow-y-auto shadow-2xl p-5 flex flex-col justify-between animate-in slide-in-from-right duration-200 focus:outline-none"
      >
        <div className="space-y-5">
          {/* Drawer Header */}
          <div className="flex items-start justify-between border-b border-slate-800 pb-3">
            <div>
              {contextLabel && <p className="text-xs text-indigo-200 mb-2">{contextLabel} · derived frame #{frame.frame_number}{sourceFrameNumber !== undefined ? ` · source #${sourceFrameNumber}` : ""}</p>}
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40">
                  Frame #{frame.frame_number}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {frame.protocol}
                </span>
                <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  +{frame.time_offset_seconds.toFixed(3)}s
                </span>
              </div>
              <h3 id="frame-drawer-title" className="text-base font-semibold text-slate-100 mt-2">
                {frame.summary}
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-slate-800 transition-colors focus:outline-none focus:ring-1 focus:ring-teal-400"
              aria-label="Close frame details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Endpoints & Scope info */}
          <div className="bg-navy-950/70 border border-slate-800 rounded-lg p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between font-mono">
              <span className="text-slate-400">Source:</span>
              <span className="text-slate-200 font-semibold truncate max-w-[280px]">
                {formatEndpoint(frame.source_ip, frame.source_mac, frame.source_port)}
              </span>
            </div>

            <div className="flex items-center justify-between font-mono">
              <span className="text-slate-400">Destination:</span>
              <span className="text-slate-200 font-semibold truncate max-w-[280px]">
                {formatEndpoint(frame.destination_ip, frame.destination_mac, frame.destination_port)}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-slate-500 font-mono text-[11px]">
              <span>Captured length: {frame.captured_length} bytes</span>
              <span className="break-all">Scope: {frame.scope_id}</span>
            </div>
          </div>

          {/* Sanitized Headers Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                Sanitized Header Metadata
              </h4>
              <span className="text-[11px] text-slate-500 font-mono">
                {frame.headers.length} field(s)
              </span>
            </div>

            {frame.headers.length === 0 ? (
              <div className="p-3 bg-navy-950/50 border border-slate-800/80 rounded-lg text-xs text-slate-400 italic">
                No specific protocol header fields were extracted for this frame.
              </div>
            ) : (
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-navy-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3 font-semibold text-[11px] w-2/5">Field Name</th>
                      <th className="py-2 px-3 font-semibold text-[11px]">Decoded Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-navy-900/60">
                    {frame.headers.map((header, idx) => (
                      <tr key={idx} className="hover:bg-navy-850/50 transition-colors">
                        <td className="py-2 px-3 text-slate-400 font-medium">
                          {header.name}
                        </td>
                        <td className="py-2 px-3 text-teal-300 font-semibold break-all">
                          {header.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="text-[11px] text-slate-500 mt-2">
              Note: Payloads and encrypted content are omitted by design. Only allowlisted protocol headers are presented.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
