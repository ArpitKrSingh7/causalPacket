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

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style?.overflow;
    if (document.body.style) document.body.style.overflow = "hidden";
    // Focus the drawer container for immediate keyboard interaction
    drawerRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const controls = drawerRef.current?.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!controls?.length) { e.preventDefault(); return; }
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === drawerRef.current)) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (document.body.style) document.body.style.overflow = previousOverflow || "";
      if (previousFocus?.isConnected) previousFocus.focus();
    };
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
        className="w-full max-w-lg bg-white border-l border-line h-full overflow-y-auto shadow-2xl p-5 flex flex-col justify-between animate-in slide-in-from-right duration-200 focus:outline-none"
      >
        <div className="space-y-5">
          {/* Drawer Header */}
          <div className="flex items-start justify-between border-b border-line pb-3">
            <div>
              {contextLabel && <p className="text-xs text-indigo-700 mb-2">{contextLabel} · derived frame #{frame.frame_number}{sourceFrameNumber !== undefined ? ` · source #${sourceFrameNumber}` : ""}</p>}
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-700 border border-teal-500/40">
                  Frame #{frame.frame_number}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-line">
                  {frame.protocol}
                </span>
                <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  +{frame.time_offset_seconds.toFixed(3)}s
                </span>
              </div>
              <h3 id="frame-drawer-title" className="text-base font-semibold text-ink mt-2">
                {frame.summary}
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-500 hover:text-ink p-1 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus:ring-1 focus:ring-teal-400"
              aria-label="Close frame details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Endpoints & Scope info */}
          <div className="bg-slate-50/70 border border-line rounded-lg p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between font-mono">
              <span className="text-slate-500">Source:</span>
              <span className="text-ink font-semibold truncate max-w-[280px]">
                {formatEndpoint(frame.source_ip, frame.source_mac, frame.source_port)}
              </span>
            </div>

            <div className="flex items-center justify-between font-mono">
              <span className="text-slate-500">Destination:</span>
              <span className="text-ink font-semibold truncate max-w-[280px]">
                {formatEndpoint(frame.destination_ip, frame.destination_mac, frame.destination_port)}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line/60 text-slate-500 font-mono text-[11px]">
              <span>Captured length: {frame.captured_length} bytes</span>
              <span className="break-all">Scope: {frame.scope_id}</span>
            </div>
          </div>

          {/* Sanitized Headers Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                Sanitized Header Metadata
              </h4>
              <span className="text-[11px] text-slate-500 font-mono">
                {frame.headers.length} field(s)
              </span>
            </div>

            {frame.headers.length === 0 ? (
              <div className="p-3 bg-slate-50/50 border border-line/80 rounded-lg text-xs text-slate-500 italic">
                No specific protocol header fields were extracted for this frame.
              </div>
            ) : (
              <div className="border border-line rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-50 text-slate-500 border-b border-line">
                    <tr>
                      <th className="py-2 px-3 font-semibold text-[11px] w-2/5">Field Name</th>
                      <th className="py-2 px-3 font-semibold text-[11px]">Decoded Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60 bg-white/60">
                    {frame.headers.map((header, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2 px-3 text-slate-500 font-medium">
                          {header.name}
                        </td>
                        <td className="py-2 px-3 text-teal-700 font-semibold break-all">
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
        <div className="pt-4 border-t border-line flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-ink transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
