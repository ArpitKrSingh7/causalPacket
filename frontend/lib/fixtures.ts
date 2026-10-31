import type { AnalysisReport } from "./types";
import gatewayBeforeRaw from "../fixtures/gateway-before.json";
import gatewayApprovedRaw from "../fixtures/gateway-approved.json";
import healthyRaw from "../fixtures/healthy.json";

export interface PreviewOption {
  id: "gateway-before" | "gateway-approved" | "healthy";
  label: string;
  tagline: string;
  report: AnalysisReport;
}

export const PREVIEW_FIXTURES: Record<string, PreviewOption> = {
  "gateway-before": {
    id: "gateway-before",
    label: "Gateway Transition — Suspected Attack",
    tagline: "Unapproved MAC claimed gateway IP; 3 TCP connection refusals observed",
    report: gatewayBeforeRaw as AnalysisReport,
  },
  "gateway-approved": {
    id: "gateway-approved",
    label: "Gateway Transition — Approved Operator Context",
    tagline: "MAC B marked approved; hypothesis shifts to unresolved fault while connection refusals persist",
    report: gatewayApprovedRaw as AnalysisReport,
  },
  "healthy": {
    id: "healthy",
    label: "Healthy Exchange — No Findings",
    tagline: "Standard ARP and completed TCP exchange; zero detected anomalies",
    report: healthyRaw as AnalysisReport,
  },
};

export const DEFAULT_PREVIEW_KEY = "gateway-before";
