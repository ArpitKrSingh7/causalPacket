import React, { useState, useRef } from "react";
import { Upload, FileUp, AlertCircle, Loader2, ArrowUpRight, ChevronDown, ShieldCheck, Download } from "lucide-react";
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
  isHostedApi?: boolean;
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MiB

export function UploadArea({
  onUploadFile,
  onSelectSample,
  samples,
  samplesLoading,
  isAnalyzing,
  currentSourceName,
  isEngineReady = true,
  isHostedApi = false,
}: UploadAreaProps) {
  const [showAllSamples, setShowAllSamples] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndProcessFile = (file: File) => {
    if (isAnalyzing || !isEngineReady) return;
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
      if (!isAnalyzing && isEngineReady) {
        fileInputRef.current?.click();
      }
    }
  };

  const featuredIds = ["gateway-transition", "mixed-scan-and-fault", "service-failure", "healthy"];
  const featured = featuredIds.map((id) => samples.find((sample) => sample.id === id)).filter((sample): sample is SampleInfo => !!sample);
  const visibleSamples = showAllSamples || featured.length === 0 ? samples : featured;
  const sampleTags: Record<string, string> = {
    "gateway-transition": "ARP · DNS · TCP", "mixed-scan-and-fault": "TCP · Multiple incidents",
    "service-failure": "TCP · Earlier-success comparison", healthy: "TCP · DNS · Baseline",
    "possible-scan": "TCP · Destination diversity", "dns-faults": "DNS · Resolver errors",
    truncated: "Partial capture · Recovery", "arp-healthy": "ARP · Negative control", "dns-healthy": "DNS · Negative control",
  };

  return (
    <section aria-labelledby="capture-title" className="space-y-5 scroll-mt-28">
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div><p className="eyebrow text-accent mb-2">Your investigation starts here</p><h2 id="capture-title" className="font-display text-2xl sm:text-[28px] font-medium tracking-[-.04em]">Open a case.</h2></div>
        {currentSourceName && <span className="text-[10px] font-mono text-slate-500 break-all">Loaded: {currentSourceName}</span>}
        <p className="text-xs text-slate-500 max-w-sm leading-6">Bring your own capture, or explore a reproducible scenario. Every sample runs through the real analysis engine.</p>
      </div>
      <div className="grid lg:grid-cols-[.85fr_1.55fr] gap-5">
        <div className="bg-white border border-line rounded-2xl p-5 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4"><h3 className="text-xs font-semibold flex items-center gap-2"><FileUp className="w-4 h-4 text-accent" />Your packet capture</h3><span className="font-mono text-[9px] text-slate-500">UP TO 25 MiB</span></div>
          <div role="button" tabIndex={isAnalyzing || !isEngineReady ? -1 : 0}
            aria-label="Upload capture file: Click or press Enter to select a .pcap or .pcapng file"
            aria-disabled={isAnalyzing || !isEngineReady}
            onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
            onClick={() => { if (!isAnalyzing && isEngineReady) fileInputRef.current?.click(); }}
            onKeyDown={handleKeyDown}
            className={`group flex-1 min-h-[205px] flex flex-col items-center justify-center text-center border border-dashed rounded-xl p-6 transition-colors outline-offset-4 ${dragActive ? "border-accent bg-orange-50" : "border-slate-300 bg-[#f8f9fa] hover:border-accent"} ${isAnalyzing || !isEngineReady ? "opacity-60 cursor-wait" : "cursor-pointer"}`}>
            <input ref={fileInputRef} type="file" accept=".pcap,.pcapng" className="hidden" onChange={handleFileChange} disabled={isAnalyzing || !isEngineReady} />
            {isAnalyzing ? <div role="status" className="space-y-3"><Loader2 className="w-7 h-7 animate-spin text-accent mx-auto" /><p className="text-xs font-semibold">Analyzing packet capture...</p><p className="text-[10px] text-slate-500">Reading packets and comparing explanations</p></div> : <>
              <div className="w-12 h-14 rounded-lg bg-white border border-slate-200 shadow-[0_4px_0_0_#e8ebf0] flex items-center justify-center mb-5 rotate-[-5deg] group-hover:rotate-0 transition-transform"><Upload className="w-5 h-5 text-accent" /></div>
              <p className="text-sm font-semibold">Drop your capture here</p><p className="text-xs text-slate-500 mt-1.5">or <span className="text-cobalt underline underline-offset-4">Select capture file</span></p>
              <span className="text-[10px] font-mono text-slate-500 mt-5">.pcap / .pcapng</span>
            </>}
          </div>
          {validationError && <div role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-red-700 text-xs"><AlertCircle className="w-4 h-4 shrink-0" /><span>{validationError}</span></div>}
          <p className="text-[10px] leading-5 text-slate-500 mt-4 flex items-start gap-2"><ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" /><span>{isHostedApi ? "Hosted analysis uploads files to the API server. Use authorized captures or synthetic samples; keep sensitive captures local." : "Analyze authorized captures locally. Reports retain protocol headers and omit raw application payloads."}</span></p>
        </div>
        <div className="min-w-0">
          <div className="flex items-center justify-between mb-3 px-0.5"><h3 className="text-xs font-semibold">Sample Captures <span className="font-normal text-slate-500 ml-1">/ simulated scenarios</span></h3><span className="text-[10px] font-mono text-slate-500">{samples.length} available</span></div>
          {samplesLoading ? <div className="rounded-xl border border-line p-8 text-xs text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Loading sample catalog…</div> : samples.length === 0 ? <div className="rounded-xl border border-line bg-white p-7 text-xs leading-6 text-slate-500"><strong className="block text-ink">Sample catalog is unavailable</strong>Connect to the backend, then refresh its status to load the included synthetic captures.</div> : <>
            <div className="grid sm:grid-cols-2 gap-3">
              {visibleSamples.map((sample, index) => <button key={sample.id} data-sample-id={sample.id} type="button" onClick={() => onSelectSample(sample.id)} disabled={!sample.available || isAnalyzing || !isEngineReady} className="sample-card group">
                <span className="flex items-center justify-between w-full mb-2.5"><span className="font-mono text-[9px] text-slate-500">CASE {String(index + 1).padStart(2, "0")}</span><ArrowUpRight className="sample-arrow w-4 h-4 text-slate-400" /></span>
                <span className="text-xs font-semibold leading-5 text-ink">{sample.title}</span>
                <span className="text-[11px] text-slate-500 leading-5 mt-1 line-clamp-2">{sample.description}</span>
                {sampleTags[sample.id] && <span className="font-mono text-[9px] text-slate-500 mt-3 pt-2 border-t border-line/70 w-full">{sampleTags[sample.id]}</span>}
              </button>)}
            </div>
            {featured.length > 0 && samples.length > featured.length && <button type="button" onClick={() => setShowAllSamples(!showAllSamples)} aria-expanded={showAllSamples} className="flex items-center gap-2 mt-3 text-[11px] text-slate-500 hover:text-ink py-1">{showAllSamples ? "Show featured captures" : `Explore all ${samples.length} captures`}<ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllSamples ? "rotate-180" : ""}`} /></button>}
          </>}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 mt-3">
            <a href="/samples/causalpacket-test-captures.zip" download className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-cobalt hover:underline underline-offset-4"><Download className="w-3.5 h-3.5" />Download test captures (.zip)</a>
            <span className="text-[10px] text-slate-500">Extract, then upload one .pcap</span>
          </div>
        </div>
      </div>
    </section>
  );
}
