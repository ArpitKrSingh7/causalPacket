"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FileText, Fingerprint } from "lucide-react";
import { Welcome, InvestigationGuide } from "@/components/Welcome";
import { CaptureOverview } from "@/components/CaptureOverview";
import { Brand } from "@/components/Brand";
import { Header } from "@/components/Header";
import { PreviewBanner } from "@/components/PreviewBanner";
import { UploadArea } from "@/components/UploadArea";
import { CoverageSummary } from "@/components/CoverageSummary";
import { IncidentList } from "@/components/IncidentList";
import { IncidentDetail } from "@/components/IncidentDetail";
import { EvidenceTimeline } from "@/components/EvidenceTimeline";
import { FrameDrawer } from "@/components/FrameDrawer";
import { AlibiTest } from "@/components/AlibiTest";
import { ReportExport } from "@/components/ReportExport";
import { StatusAlerts } from "@/components/StatusAlerts";
import { InvestigationSummary } from "@/components/InvestigationSummary";
import { EvidenceMap } from "@/components/EvidenceMap";
import { EvidenceLab } from "@/components/EvidenceLab";
import { PREVIEW_FIXTURES, DEFAULT_PREVIEW_KEY } from "@/lib/fixtures";
import * as api from "@/lib/api";
import type {
  AnalysisReport,
  HealthResponse,
  SampleInfo,
  NetworkContext,
  PacketEvidence,
} from "@/lib/types";

const EMPTY_CONTEXT: NetworkContext = {
  gateway_ip: null,
  approved_gateway_macs: [],
  authorized_scanner_ips: [],
};

export default function InvestigationWorkspace() {
  // Mode & Preview State: Default to Live mode
  const [isLiveMode, setIsLiveMode] = useState<boolean>(true);
  const [previewKey, setPreviewKey] = useState<string>(DEFAULT_PREVIEW_KEY);

  // Active Report: Starts null in live mode (honest empty state)
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [ingestExpanded, setIngestExpanded] = useState(true);
  const [viewRevision, setViewRevision] = useState(0);
  const alibiRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    if (report) setIngestExpanded(false);
    if (alibiRef.current) alibiRef.current.open = false;
  }, [report?.analysis_id]);

  // Selected Incident & Active Filters
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<PacketEvidence | null>(null);
  const [filteredObservationId, setFilteredObservationId] = useState<string | null>(null);
  const [filteredFrames, setFilteredFrames] = useState<number[] | null>(null);

  // Backend Integration State
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [samples, setSamples] = useState<SampleInfo[]>([]);
  const [samplesLoading, setSamplesLoading] = useState<boolean>(false);

  // Async Activity State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isReinterpreting, setIsReinterpreting] = useState<boolean>(false);
  const [apiError, setApiError] = useState<{
    message: string;
    code?: string;
    status?: number;
  } | null>(null);

  // Cancellation and Generation Tracking
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<number>(0);

  const abortPendingRequests = useCallback(() => {
    requestIdRef.current += 1;
    setViewRevision((value) => value + 1);
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
    }
    setIsAnalyzing(false);
    setIsReinterpreting(false);
  }, []);

  // Poll or check health on initial mount
  const checkHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const data = await api.health();
      setHealthData(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Health check failed";
      setHealthError(msg);
      setHealthData(null);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  // Fetch sample catalog
  const loadSamples = useCallback(async () => {
    setSamplesLoading(true);
    try {
      const data = await api.listSamples();
      setSamples(data.samples || []);
    } catch {
      setSamples([]);
    } finally {
      setSamplesLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    loadSamples();

    return () => {
      requestIdRef.current += 1;
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
      }
    };
  }, [checkHealth, loadSamples]);

  // Handle switching preview fixtures
  const handleSelectFixture = (key: string) => {
    abortPendingRequests();
    const fixture = PREVIEW_FIXTURES[key];
    if (fixture) {
      setPreviewKey(key);
      setReport(fixture.report);
      setSelectedIncidentId(fixture.report.incidents[0]?.id || null);
      setFilteredObservationId(null);
      setFilteredFrames(null);
      setSelectedFrame(null);
      setApiError(null);
    }
  };

  // Handle Mode Toggle
  const handleToggleMode = (live: boolean) => {
    abortPendingRequests();
    setIsLiveMode(live);
    setApiError(null);

    if (!live) {
      // Switching to Preview: load current preview fixture
      handleSelectFixture(previewKey);
    } else {
      // Switching to Live: refresh health and sample catalog
      checkHealth();
      loadSamples();
      // Retain existing report if any, preserving true provenance
    }
  };

  // Return to preview from live capture view
  const handleReturnToPreview = () => {
    abortPendingRequests();
    setIsLiveMode(false);
    handleSelectFixture(previewKey);
  };

  // Handle Upload
  const handleUploadFile = async (file: File) => {
    abortPendingRequests();

    const controller = new AbortController();
    activeAbortControllerRef.current = controller;
    const currentRequestId = ++requestIdRef.current;

    setIsAnalyzing(true);
    setApiError(null);

    // Switch mode indicator to live for actual upload
    if (!isLiveMode) {
      setIsLiveMode(true);
    }

    try {
      // Always start a NEW capture with empty context, NEVER seeding preview approvals
      const result = await api.analyzeCapture(file, EMPTY_CONTEXT, controller.signal);

      if (currentRequestId === requestIdRef.current) {
        setReport(result);
        setSelectedIncidentId(result.incidents[0]?.id || null);
        setFilteredObservationId(null);
        setFilteredFrames(null);
        setSelectedFrame(null);
      }
    } catch (err: unknown) {
      if (err instanceof api.ApiError && err.code === "aborted") {
        return; // Request was aborted cleanly
      }
      if (currentRequestId === requestIdRef.current) {
        if (err instanceof api.ApiError) {
          setApiError({
            message: err.message,
            code: err.code,
            status: err.status,
          });
        } else {
          setApiError({
            message: err instanceof Error ? err.message : "Upload analysis failed.",
            code: "upload_failed",
          });
        }
        // Retain previous report without changing its provenance
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsAnalyzing(false);
      }
    }
  };

  // Handle Sample Selection
  const handleSelectSample = async (sampleId: string) => {
    abortPendingRequests();

    const controller = new AbortController();
    activeAbortControllerRef.current = controller;
    const currentRequestId = ++requestIdRef.current;

    setIsAnalyzing(true);
    setApiError(null);

    if (!isLiveMode) {
      setIsLiveMode(true);
    }

    try {
      // Always start a NEW sample with empty context
      const result = await api.analyzeSample(sampleId, EMPTY_CONTEXT, controller.signal);

      if (currentRequestId === requestIdRef.current) {
        setReport(result);
        setSelectedIncidentId(result.incidents[0]?.id || null);
        setFilteredObservationId(null);
        setFilteredFrames(null);
        setSelectedFrame(null);
      }
    } catch (err: unknown) {
      if (err instanceof api.ApiError && err.code === "aborted") {
        return;
      }
      if (currentRequestId === requestIdRef.current) {
        if (err instanceof api.ApiError) {
          setApiError({
            message: err.message,
            code: err.code,
            status: err.status,
          });
        } else {
          setApiError({
            message: err instanceof Error ? err.message : "Sample analysis failed.",
            code: "sample_failed",
          });
        }
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsAnalyzing(false);
      }
    }
  };

  // Handle Apply Context (Alibi Test)
  const handleApplyContext = async (newContext: NetworkContext) => {
    if (!report) return;

    if (report.data_origin === "development_fixture") {
      // Scripted Preview mode: only switch between the supplied before/after pair
      if (previewKey === "gateway-before") {
        handleSelectFixture("gateway-approved");
      } else {
        handleSelectFixture("gateway-approved");
      }
      return;
    }

    // Live mode with a real capture:
    abortPendingRequests();

    const controller = new AbortController();
    activeAbortControllerRef.current = controller;
    const currentRequestId = ++requestIdRef.current;

    setIsReinterpreting(true);
    setApiError(null);

    try {
      const result = await api.reinterpret(
        report.analysis_id,
        newContext,
        controller.signal
      );

      if (currentRequestId === requestIdRef.current) {
        setReport(result);
        setSelectedIncidentId(result.incidents[0]?.id || null);
      }
    } catch (err: unknown) {
      if (err instanceof api.ApiError && err.code === "aborted") {
        return;
      }
      if (currentRequestId === requestIdRef.current) {
        if (err instanceof api.ApiError) {
          setApiError({
            message: err.message,
            code: err.code,
            status: err.status,
          });
        } else {
          setApiError({
            message:
              err instanceof Error ? err.message : "Reinterpretation failed.",
            code: "reinterpretation_failed",
          });
        }
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsReinterpreting(false);
      }
    }
  };

  // Handle Reset Context (Alibi Test)
  const handleResetContext = async () => {
    if (!report) return;

    if (report.data_origin === "development_fixture") {
      // Reset back to unapproved gateway fixture
      handleSelectFixture("gateway-before");
      return;
    }

    // Live mode with a real capture:
    abortPendingRequests();

    const controller = new AbortController();
    activeAbortControllerRef.current = controller;
    const currentRequestId = ++requestIdRef.current;

    setIsReinterpreting(true);
    setApiError(null);

    try {
      const result = await api.reinterpret(
        report.analysis_id,
        EMPTY_CONTEXT,
        controller.signal
      );

      if (currentRequestId === requestIdRef.current) {
        setReport(result);
        setSelectedIncidentId(result.incidents[0]?.id || null);
      }
    } catch (err: unknown) {
      if (err instanceof api.ApiError && err.code === "aborted") {
        return;
      }
      if (currentRequestId === requestIdRef.current) {
        if (err instanceof api.ApiError) {
          setApiError({
            message: err.message,
            code: err.code,
            status: err.status,
          });
        } else {
          setApiError({
            message: err instanceof Error ? err.message : "Reset failed.",
            code: "reset_failed",
          });
        }
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsReinterpreting(false);
      }
    }
  };

  // Open Frame Drawer by 1-based frame_number
  const handleOpenFrame = (frameNumber: number) => {
    if (!report) return;
    const frame = report.evidence.find((f) => f.frame_number === frameNumber);
    if (frame) {
      setSelectedFrame(frame);
    }
  };

  // Filter Timeline to observation's frames
  const handleFilterObservationFrames = (
    observationId: string,
    frames: number[]
  ) => {
    if (filteredObservationId === observationId || frames.length === 0) {
      setFilteredObservationId(null);
      setFilteredFrames(null);
    } else {
      setFilteredObservationId(observationId);
      setFilteredFrames(frames);
    }
  };

  // Selected Incident Object
  const selectedIncident = report
    ? report.incidents.find((i) => i.id === selectedIncidentId) ||
      report.incidents[0] ||
      null
    : null;

  const openAlibi = () => {
    if (!alibiRef.current) return;
    alibiRef.current.open = true;
    alibiRef.current.querySelector("summary")?.focus();
    alibiRef.current.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      {/* 1. Header & Live/Preview Mode Switcher */}
      <Header
        isLiveMode={isLiveMode}
        onToggleMode={handleToggleMode}
        healthData={healthData}
        healthLoading={healthLoading}
        healthError={healthError}
        onRefreshHealth={() => { void checkHealth(); void loadSamples(); }}
      />

      {/* 2. Provenance-Based Banner */}
      {report && (
        <PreviewBanner
          currentKey={previewKey}
          onSelectFixture={handleSelectFixture}
          isLiveMode={isLiveMode}
          dataOrigin={report.data_origin}
          sourceName={report.source_name}
          onReturnToPreview={handleReturnToPreview}
        />
      )}

      {/* Main Workspace Body */}
      <main id="main-content" className="flex-1 max-w-[1440px] w-full mx-auto px-5 sm:px-8 lg:px-12 py-5 sm:py-7 space-y-7">
        {/* Status Alerts & Notifications */}
        <StatusAlerts
          apiError={apiError}
          onClearApiError={() => setApiError(null)}
          warnings={report?.warnings || []}
          isEngineReady={healthData?.engine_ready}
          isLiveMode={isLiveMode}
        />

        {!report && <Welcome />}
        {report && <CaptureOverview report={report} expanded={ingestExpanded} onChange={() => setIngestExpanded(!ingestExpanded)} />}
        {isAnalyzing && report && <p className="text-xs text-teal-700" role="status">Analyzing a new capture. The previous report remains visible until it completes.</p>}
        {(!report || ingestExpanded) && <div id="capture-ingestion">
        <UploadArea
          isLiveMode={isLiveMode}
          onUploadFile={handleUploadFile}
          onSelectSample={handleSelectSample}
          samples={samples}
          samplesLoading={samplesLoading}
          isAnalyzing={isAnalyzing}
          currentSourceName={report?.source_name}
          isEngineReady={healthData?.engine_ready}
          isHostedApi={api.API_IS_REMOTE}
        />
        </div>}

        {report ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-7 items-start page-enter">
              <aside className="lg:col-span-3 lg:sticky lg:top-28 min-w-0">
                <IncidentList
                  incidents={report.incidents}
                  selectedIncidentId={selectedIncidentId}
                  onSelectIncident={(id) => {
                    setSelectedIncidentId(id);
                    setSelectedFrame(null);
                    setFilteredObservationId(null);
                    setFilteredFrames(null);
                  }}
                />
              </aside>
              <div className="lg:col-span-9 space-y-5 min-w-0">
                <InvestigationSummary report={report} incident={selectedIncident} onTestAlternative={openAlibi} />
                {selectedIncident && <EvidenceMap
                  key={selectedIncident.id}
                  incident={selectedIncident}
                  observations={report.observations}
                  edges={report.edges}
                  onOpenFrame={handleOpenFrame}
                  onFilter={handleFilterObservationFrames}
                />}
                {selectedIncident && <details className="section-disclosure">
                  <summary><FileText className="h-4 w-4 text-slate-400" />Full observations, competing explanations and next checks</summary>
                  <IncidentDetail
                    incident={selectedIncident}
                    observations={report.observations}
                    edges={report.edges}
                    onOpenFrame={handleOpenFrame}
                    onFilterObservationFrames={handleFilterObservationFrames}
                    activeFilteredObservationId={filteredObservationId}
                  />
                </details>}
                <details ref={alibiRef} className="section-disclosure scroll-mt-28 !border-[#efc9b5]">
                  <summary className="!bg-[#fff8f3]"><Fingerprint className="h-4 w-4 text-accent" />The Alibi Test — could this be something else?</summary>
                  <AlibiTest
                    initialContext={report.context}
                    interpretationChanges={report.interpretation_changes}
                    isLiveMode={isLiveMode}
                    dataOrigin={report.data_origin}
                    previewKey={previewKey}
                    sampleId={report.sample_id}
                    suggestedContext={samples.find((sample) => sample.id === report.sample_id)?.suggested_context || null}
                    observations={report.observations}
                    onApplyContext={handleApplyContext}
                    onResetContext={handleResetContext}
                    isReinterpreting={isReinterpreting}
                  />
                </details>
              </div>
            </div>
            <details className="section-disclosure">
              <summary>Capture coverage: {report.coverage.status} · {report.coverage.packets_decoded} decoded packets · scope and visibility notes</summary>
              <CoverageSummary coverage={report.coverage} incidentsCount={report.incidents.length} />
            </details>
            <ReportExport
              key={viewRevision}
              report={report}
              isLiveMode={isLiveMode}
              isReinterpreting={isReinterpreting}
              onExportError={(error) => setApiError(error)}
            />
            <EvidenceLab viewRevision={viewRevision} isLiveMode={isLiveMode} isBusy={isAnalyzing || isReinterpreting} engineReady={healthData?.engine_ready === true} />
            <EvidenceTimeline
              evidence={report.evidence}
              onOpenFrame={handleOpenFrame}
              filteredFrameNumbers={filteredFrames}
              onClearFilter={() => { setFilteredObservationId(null); setFilteredFrames(null); }}
              activeFilterLabel={filteredObservationId ? `Filtered to ${filteredObservationId.startsWith("edge-") ? "association" : "observation"} frames (${filteredFrames?.length || 0})` : undefined}
            />
          </>
        ) : (
          <InvestigationGuide onPreview={() => handleToggleMode(false)} />
        )}
      </main>

      {/* Frame Sanitized Metadata Drawer */}
      <FrameDrawer
        frame={selectedFrame}
        onClose={() => setSelectedFrame(null)}
      />

      {/* Footer */}
      <footer className="border-t border-line py-6 mt-6">
        <div className="max-w-[1440px] px-5 sm:px-8 lg:px-12 mx-auto flex flex-wrap items-center justify-between gap-4">
          <Brand compact />
          <p className="text-[10px] text-slate-500">Evidence-first network investigation · IIITDM Cybersecurity Hackathon</p>
          <span className="eyebrow text-slate-400 !text-[8px]">A clearer view of your network.</span>
        </div>
      </footer>
    </div>
  );
}
