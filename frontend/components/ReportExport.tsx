import React, { useState, useRef, useEffect, useCallback } from "react";
import { Download, FileText, Code2, Loader2, Check } from "lucide-react";
import type { AnalysisReport } from "@/lib/types";
import * as api from "@/lib/api";

interface ReportExportProps {
  report: AnalysisReport;
  isLiveMode?: boolean;
  isReinterpreting?: boolean;
  onExportError: (error: { message: string; code?: string; status?: number }) => void;
}

/** Maximum filename length after sanitisation. */
const MAX_FILENAME_LEN = 128;

/** Remove path separators, control characters, and enforce expected extension. */
function sanitizeFilename(raw: string, format: "markdown" | "json"): string {
  // Basename only
  let name = raw.replace(/.*[/\\]/, "");
  // Strip control characters
  name = name.replace(/[\x00-\x1f\x7f]/g, "");
  // Strip remaining unsafe characters
  name = name.replace(/[<>:"|?*]/g, "");
  // Truncate
  if (name.length > MAX_FILENAME_LEN) {
    name = name.slice(0, MAX_FILENAME_LEN);
  }
  // Enforce expected extension
  const expectedExt = format === "json" ? ".json" : ".md";
  if (!name.endsWith(expectedExt)) {
    return "";  // Reject — caller will use fallback
  }
  return name || "";
}

export function ReportExport({
  report,
  isLiveMode,
  isReinterpreting = false,
  onExportError,
}: ReportExportProps) {
  const [downloadingFormat, setDownloadingFormat] = useState<"markdown" | "json" | null>(null);
  const [lastDownloaded, setLastDownloaded] = useState<string | null>(null);

  // Lifecycle: abort controller + revision guard
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestRevisionRef = useRef(0);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFixture = report.data_origin === "development_fixture";

  // Cancellation helper: abort pending export and invalidate its revision
  const cancelPendingExport = useCallback(() => {
    requestRevisionRef.current += 1;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setDownloadingFormat(null);
    setLastDownloaded(null);
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  }, []);

  // Cancel pending export when report identity, context, live mode, or reinterpretation changes.
  // Uses contextSignature to catch context replay with the same analysis_id.
  const contextSignature = JSON.stringify(report.context);
  useEffect(() => {
    cancelPendingExport();
  }, [
    report.analysis_id,
    report.data_origin,
    contextSignature,
    isLiveMode,
    isReinterpreting,
    cancelPendingExport,
  ]);

  // Cancel pending export on unmount
  useEffect(() => {
    return () => {
      requestRevisionRef.current += 1;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  const handleDownload = async (format: "markdown" | "json") => {
    if (isFixture) return;

    // Cancel any previous in-flight export
    cancelPendingExport();

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const thisRevision = ++requestRevisionRef.current;

    setDownloadingFormat(format);
    setLastDownloaded(null);

    let objectUrl: string | null = null;

    try {
      const result = await api.exportReport(
        report.analysis_id,
        format,
        controller.signal
      );

      // Stale-request guard: if report/context changed while waiting, discard
      if (thisRevision !== requestRevisionRef.current) {
        return;
      }

      // Validate filename from Content-Disposition
      let filename = sanitizeFilename(result.filename, format);
      if (!filename) {
        const ext = format === "json" ? "json" : "md";
        filename = `causalpacket-${report.analysis_id.replace(/[^a-zA-Z0-9_-]/g, "_")}.${ext}`;
      }

      // Create temporary object URL and trigger browser download
      objectUrl = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Release object URL after small timeout
      const urlToRevoke = objectUrl;
      objectUrl = null; // Prevent double-revoke in finally
      setTimeout(() => URL.revokeObjectURL(urlToRevoke), 1000);

      // Only update feedback if still the current request
      if (thisRevision === requestRevisionRef.current) {
        setLastDownloaded(filename);
        feedbackTimerRef.current = setTimeout(() => {
          if (thisRevision === requestRevisionRef.current) {
            setLastDownloaded(null);
          }
          feedbackTimerRef.current = null;
        }, 4000);
      }
    } catch (err: unknown) {
      if (err instanceof api.ApiError && err.code === "aborted") {
        return;
      }
      // Only surface errors for the current revision
      if (thisRevision === requestRevisionRef.current) {
        if (err instanceof api.ApiError) {
          onExportError({
            message: err.message,
            code: err.code,
            status: err.status,
          });
        } else {
          onExportError({
            message: err instanceof Error ? err.message : "Report export failed.",
            code: "export_failed",
          });
        }
      }
    } finally {
      // Revoke object URL on error paths
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      // Only clear loading state for the current revision
      if (thisRevision === requestRevisionRef.current) {
        setDownloadingFormat(null);
      }
    }
  };

  return (
    <div className="bg-navy-900 border border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
      {/* Scope and Context Note */}
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5 text-teal-400" />
            Investigation Report Export
          </span>
          {isFixture ? (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300">
              Preview (Export Unavailable)
            </span>
          ) : (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/15 border border-teal-500/30 text-teal-300">
              Live Capture Session
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-400">
          Exports include sanitized IP/MAC header metadata, hypotheses, measurements, and remaining problems. Application payloads are omitted.
        </p>
      </div>

      {/* Action Buttons & Feedback */}
      <div className="flex items-center flex-wrap gap-2 w-full md:w-auto justify-end">
        {lastDownloaded && (
          <span className="text-[11px] font-mono text-teal-300 flex items-center gap-1 mr-1 animate-fadeIn">
            <Check className="w-3 h-3 text-teal-400" />
            Download started: {lastDownloaded}
          </span>
        )}

        {/* Markdown Export Button */}
        <button
          type="button"
          onClick={() => handleDownload("markdown")}
          disabled={isFixture || downloadingFormat !== null}
          title={
            isFixture
              ? "Report export is unavailable for fictional preview fixtures. Analyze a live capture to export reports."
              : "Download human-readable Markdown investigation report"
          }
          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-teal-400 ${
            isFixture
              ? "bg-slate-800/40 border-slate-800 text-slate-500 cursor-not-allowed"
              : "bg-navy-850 hover:bg-slate-800 border-slate-700/80 hover:border-teal-500/50 text-slate-200 hover:text-teal-300 shadow-sm"
          } ${downloadingFormat === "markdown" ? "opacity-75" : ""}`}
        >
          {downloadingFormat === "markdown" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
          ) : (
            <FileText className="w-3.5 h-3.5 text-teal-400" />
          )}
          <span>Download report (.md)</span>
        </button>

        {/* JSON Export Button */}
        <button
          type="button"
          onClick={() => handleDownload("json")}
          disabled={isFixture || downloadingFormat !== null}
          title={
            isFixture
              ? "Data export is unavailable for fictional preview fixtures. Analyze a live capture to export reports."
              : "Download canonical AnalysisReport JSON data"
          }
          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-teal-400 ${
            isFixture
              ? "bg-slate-800/40 border-slate-800 text-slate-500 cursor-not-allowed"
              : "bg-navy-850 hover:bg-slate-800 border-slate-700/80 hover:border-teal-500/50 text-slate-200 hover:text-teal-300 shadow-sm"
          } ${downloadingFormat === "json" ? "opacity-75" : ""}`}
        >
          {downloadingFormat === "json" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
          ) : (
            <Code2 className="w-3.5 h-3.5 text-teal-400" />
          )}
          <span>Download data (.json)</span>
        </button>
      </div>
    </div>
  );
}
