/** API contract v1.0. Codex-owned; mirrors backend/core/models.py. */
export type Assessment = "likely_fault" | "suspected_attack" | "unresolved";
export type Severity = "info" | "low" | "medium" | "high";
export type ObservationType =
  | "TCP_CONNECTION_REFUSED" | "TCP_SYN_RETRY" | "TCP_UNANSWERED"
  | "TCP_HANDSHAKE_DELAY" | "SCAN_PATTERN" | "ARP_IDENTITY_CHANGE"
  | "DNS_RESPONSE_ERROR" | "DNS_UNANSWERED" | "DNS_DELAY";

export interface NetworkContext {
  gateway_ip: string | null;
  approved_gateway_macs: string[];
  authorized_scanner_ips: string[];
}
export interface Metric {
  key: string;
  label: string;
  value: number | boolean | string;
  unit: string | null;
}
export interface HeaderField { name: string; value: string }
export interface PacketEvidence {
  frame_number: number;
  time_offset_seconds: number;
  scope_id: string;
  protocol: "ARP" | "TCP" | "UDP" | "DNS" | "ICMP" | "IPv4" | "OTHER";
  source_ip: string | null;
  destination_ip: string | null;
  source_mac: string | null;
  destination_mac: string | null;
  source_port: number | null;
  destination_port: number | null;
  captured_length: number;
  summary: string;
  headers: HeaderField[];
}
export interface Entity {
  kind: "client" | "server" | "resolver" | "gateway" | "mac" | "service";
  value: string;
}
export interface Observation {
  id: string;
  type: ObservationType;
  title: string;
  description: string;
  scope_id: string;
  first_seen_seconds: number;
  last_seen_seconds: number;
  entities: Entity[];
  evidence_frames: number[];
  total_evidence_count: number;
  metrics: Metric[];
  caveats: string[];
}
export interface EvidenceEdge {
  id: string;
  source_observation_id: string;
  target_observation_id: string;
  relation: "precedes_on_shared_client" | "shares_affected_client" | "same_probe_pattern";
  rule_id: string;
  reason: string;
  evidence_frames: number[];
}
export interface Hypothesis {
  id: string;
  title: string;
  explanation: string;
  evidence_level: "supported" | "plausible" | "insufficient";
  supporting_observation_ids: string[];
  challenging_observation_ids: string[];
  supporting_reasons: string[];
  challenging_reasons: string[];
  missing_evidence: string[];
  suggested_checks: string[];
}
export interface Comparison {
  id: string;
  title: string;
  status: "available" | "unavailable";
  basis: string;
  baseline_label: string;
  current_label: string;
  baseline_metrics: Metric[];
  current_metrics: Metric[];
  evidence_frames: number[];
  limitations: string[];
}
export interface Incident {
  id: string;
  title: string;
  summary: string;
  assessment: Assessment;
  severity: Severity;
  observation_ids: string[];
  hypotheses: Hypothesis[];
  comparisons: Comparison[];
  next_steps: string[];
  limitations: string[];
}
export interface CaptureCoverage {
  status: "complete" | "partial" | "limited";
  format: "pcap" | "pcapng";
  packets_seen: number;
  packets_decoded: number;
  packets_skipped: number;
  duration_seconds: number;
  protocols: string[];
  link_types: string[];
  limits_reached: string[];
  visibility_notes: string[];
  unsupported_checks: string[];
}
export interface InterpretationChange {
  incident_id: string;
  previous_assessment: Assessment;
  current_assessment: Assessment;
  reason_changed: string;
  evidence_retained: string;
  remaining_problem: string;
}
export interface AnalysisReport {
  schema_version: "1.0";
  analysis_id: string;
  data_origin: "capture" | "development_fixture";
  source_name: string;
  sample_id: string | null;
  coverage: CaptureCoverage;
  context: NetworkContext;
  observations: Observation[];
  edges: EvidenceEdge[];
  incidents: Incident[];
  evidence: PacketEvidence[];
  interpretation_changes: InterpretationChange[];
  warnings: string[];
}
export interface SampleInfo {
  id: string;
  title: string;
  description: string;
  synthetic: true;
  available: boolean;
  suggested_context: NetworkContext;
}
export interface SamplesResponse { samples: SampleInfo[] }
export interface HealthResponse { status: "ok"; schema_version: "1.0"; engine_ready: boolean }
export interface EvidencePage {
  analysis_id: string;
  evidence: PacketEvidence[];
  total_matching: number;
  offset: number;
  limit: number;
}
export interface ErrorResponse { error: { code: string; message: string } }
