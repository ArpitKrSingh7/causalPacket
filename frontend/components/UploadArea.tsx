import React, { useState, useRef } from "react";
import { Upload, FileUp, AlertCircle, FileText, CheckCircle2, Loader2, Database, Shield } from "lucide-react";
import type { SampleInfo } from "@/lib/types";

interface UploadAreaProps {
  isLiveMode: boolean;
  onUploadFile: (file: File) => Promise<void>;
  onSelectSample: (sampleId: string) => Promise<void>;
  samples: SampleInfo[];
  samplesLoading: boolean;
  isAnalyzing: boolean;
  currentSourceName?: string;
  isEngineReady?: boolean;
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MiB

export function UploadArea({
  isLiveMode,
  onUploadFile,
  onSelectSample,
  samples,
  samplesLoading,
  isAnalyzing,
  currentSourceName,
  isEngineReady = true,
}: UploadAreaProps) {
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndProcessFile = (file: File) => {
    setValidationError(null);

    const validExtensions = [".pcap", ".pcapng"];
    const lowerName = file.name.toLowerCase();
    const hasValidExt = validExtensions.some((ext) => lowerName.endsWith(ext));

    if (!hasValidExt) {
      setValidationError("Invalid file format. Please upload an uncompressed .pcap or .pcapng capture.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMiB = (file.size / (1024 * 1024)).toFixed(2);
      setValidationError(
        `File size (${sizeMiB} MiB) exceeds the 25 MiB limit. Please provide a capture up to 25 MiB.`
      );
      return;
    }

    onUploadFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files) {
      if (e.dataTransfer.files.length > 1) {
        setValidationError("Multiple files dropped. Please upload one .pcap or .pcapng capture at a time.");
        return;
      }
      if (e.dataTransfer.files[0]) {
        validateAndProcessFile(e.dataTransfer.files[0]);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Reset input value so the same file can be selected again
      e.target.value = "";
      validateAndProcessFile(file);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!isAnalyzing) {
        fileInputRef.current?.click();
      }
    }
  };

  return (
    <div className="bg-navy-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <FileUp className="w-4 h-4 text-teal-400" />
            Analyze Capture or Select Sample
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Upload your own .pcap / .pcapng file (up to 25 MiB), or analyze a synthetic scenario capture.
          </p>
        </div>

        {currentSourceName && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-navy-850 border border-slate-800 text-xs text-slate-300">
            <span className="text-slate-500">Loaded:</span>
            <span className="font-mono text-teal-300 truncate max-w-xs">{currentSourceName}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Upload Dropzone (Takes 2 cols on md) */}
        <div className="md:col-span-2">
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload capture file: Click or press Enter to select a .pcap or .pcapng file"
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => {
              if (!isAnalyzing) fileInputRef.current?.click();
            }}
            onKeyDown={handleKeyDown}
            className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all relative flex flex-col items-center justify-center min-h-[140px] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
              dragActive
                ? "border-teal-400 bg-teal-500/10 scale-[0.99]"
                : "border-slate-700/80 hover:border-slate-500 bg-navy-950/50 hover:bg-navy-950/80"
            } ${isAnalyzing ? "pointer-events-none opacity-70" : ""}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pcap,.pcapng"
              className="hidden"
              onChange={handleFileChange}
              disabled={isAnalyzing}
            />

            {isAnalyzing ? (
              <div className="flex flex-col items-center gap-2 text-teal-300">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-xs font-mono font-medium">Analyzing packet capture...</span>
                <span className="text-[11px] text-slate-500 font-mono">Running protocol detectors and correlation</span>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-300 mb-2 group-hover:bg-teal-500/10">
                  <Upload className="w-5 h-5 text-teal-400" />
                </div>
                <div className="text-xs font-medium text-slate-200">
                  <span className="text-teal-400 hover:underline">Select capture file</span> or drag and drop here
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-mono">
                  Supports .pcap, .pcapng · Up to 25 MiB
                </div>
              </>
            )}
          </div>

          {validationError && (
            <div className="mt-2 flex items-center gap-2 p-2.5 rounded-md bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}
        </div>

        {/* Server Samples Section (1 col) */}
        <div className="bg-navy-950/60 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <Database className="w-3.5 h-3.5 text-teal-400" />
                Sample Captures
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {samples.length} available
              </span>
            </div>

            {samplesLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-3">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Loading catalog...</span>
              </div>
            ) : samples.length === 0 ? (
              <div className="text-xs text-slate-400 bg-navy-900/60 border border-slate-800/80 rounded p-2.5">
                <p className="text-slate-300 font-medium">Catalog currently empty</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Synthetic test captures will be listed here once the backend exposes them.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {samples.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => onSelectSample(sample.id)}
                    disabled={!sample.available || isAnalyzing}
                    className="w-full text-left p-2 rounded bg-navy-850 hover:bg-slate-800 border border-slate-800/80 hover:border-teal-500/40 text-xs transition-all flex items-center justify-between group disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-teal-400"
                  >
                    <div className="min-w-0 pr-1">
                      <div className="font-medium text-slate-200 group-hover:text-teal-300 truncate">
                        {sample.title}
                      </div>
                      <div className="text-[10px] text-slate-500 line-clamp-1">
                        {sample.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800/60 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Synthetic reproducible captures</span>
            {isEngineReady && <span className="text-teal-400 font-mono">Live Engine</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
