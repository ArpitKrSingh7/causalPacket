import type { AnalysisReport } from "./types";

export interface ExperimentCase {
  id: string;
  family: "scan_visibility" | "healthy_control" | "irrelevant_control" | "gateway_link";
  description: string;
  source_packets: number;
  removed_source_frames: number[];
  edited_source_frames: number[];
  source_frame_map: number[];
  report: AnalysisReport;
}

export interface ExperimentReport {
  schema_version: "1.0";
  data_origin: "synthetic_experiment";
  seed: number;
  explanation: string;
  limitations: string[];
  cases: ExperimentCase[];
}
