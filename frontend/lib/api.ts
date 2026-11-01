import type {
  AnalysisReport,
  ErrorResponse,
  EvidencePage,
  HealthResponse,
  NetworkContext,
  SamplesResponse,
} from "./types";
import type { ExperimentReport } from "./lab";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export const API_IS_REMOTE = (() => {
  try {
    return !["localhost", "127.0.0.1", "::1", "[::1]"].includes(new URL(API_BASE_URL).hostname);
  } catch {
    return true;
  }
})();

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string = "unknown_error", status: number = 0) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) {
    return undefined as unknown as T;
  }

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!res.ok) {
    let errorCode = `http_${res.status}`;
    let errorMessage = `Request failed with status ${res.status}`;

    if (isJson) {
      try {
        const errorData = (await res.json()) as ErrorResponse;
        if (errorData?.error) {
          errorCode = errorData.error.code || errorCode;
          errorMessage = errorData.error.message || errorMessage;
        }
      } catch {
        // Fall back to default error message if parsing fails
      }
    } else {
      try {
        const text = await res.text();
        if (text && text.length < 200) {
          errorMessage = text;
        }
      } catch {
        // Ignore read errors
      }
    }

    throw new ApiError(errorMessage, errorCode, res.status);
  }

  if (!isJson) {
    throw new ApiError(
      "Expected JSON response from server but received unexpected content type.",
      "invalid_response_format",
      res.status
    );
  }

  return (await res.json()) as T;
}

function catchNetworkError(err: unknown): never {
  if (err instanceof ApiError) {
    throw err;
  }
  if (err instanceof DOMException && err.name === "AbortError") {
    throw new ApiError("Request was aborted.", "aborted", 0);
  }
  const message =
    err instanceof Error
      ? err.message
      : "Failed to communicate with backend service.";
  throw new ApiError(
    `Network error: ${message}. Ensure the backend service is running at ${API_BASE_URL}.`,
    "network_error",
    0
  );
}

/**
 * Check backend health and engine availability.
 * GET /api/health
 */
export async function health(signal?: AbortSignal): Promise<HealthResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      method: "GET",
      signal,
      headers: {
        Accept: "application/json",
      },
    });
    return await handleResponse<HealthResponse>(res);
  } catch (err) {
    catchNetworkError(err);
  }
}

/**
 * List available synthetic sample captures.
 * GET /api/samples
 */
export async function listSamples(signal?: AbortSignal): Promise<SamplesResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/samples`, {
      method: "GET",
      signal,
      headers: {
        Accept: "application/json",
      },
    });
    return await handleResponse<SamplesResponse>(res);
  } catch (err) {
    catchNetworkError(err);
  }
}

/**
 * Upload and analyze a PCAP/PCAPNG capture file.
 * POST /api/analyze
 */
export async function analyzeCapture(
  file: File,
  context?: NetworkContext | null,
  signal?: AbortSignal
): Promise<AnalysisReport> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    if (context) {
      formData.append("context", JSON.stringify(context));
    }

    // Notice: Do NOT set Content-Type header manually for FormData; browser sets boundary.
    const res = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: "POST",
      body: formData,
      signal,
      headers: {
        Accept: "application/json",
      },
    });
    return await handleResponse<AnalysisReport>(res);
  } catch (err) {
    catchNetworkError(err);
  }
}

/**
 * Analyze an existing server-side sample capture.
 * POST /api/samples/{sample_id}/analyze
 */
export async function analyzeSample(
  sampleId: string,
  context?: NetworkContext | null,
  signal?: AbortSignal
): Promise<AnalysisReport> {
  try {
    const payload = context ?? {};
    const res = await fetch(`${API_BASE_URL}/api/samples/${encodeURIComponent(sampleId)}/analyze`, {
      method: "POST",
      body: JSON.stringify(payload),
      signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    return await handleResponse<AnalysisReport>(res);
  } catch (err) {
    catchNetworkError(err);
  }
}

/**
 * Reinterpret an existing analysis report with updated operator network context.
 * POST /api/analyses/{analysis_id}/reinterpret
 */
export async function reinterpret(
  analysisId: string,
  context: NetworkContext,
  signal?: AbortSignal
): Promise<AnalysisReport> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/analyses/${encodeURIComponent(analysisId)}/reinterpret`, {
      method: "POST",
      body: JSON.stringify(context),
      signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    return await handleResponse<AnalysisReport>(res);
  } catch (err) {
    catchNetworkError(err);
  }
}

/**
 * Fetch bounded evidence frames for an analysis report.
 * GET /api/analyses/{analysis_id}/evidence
 */
export async function getEvidence(
  analysisId: string,
  options?: {
    frameNumbers?: number[];
    offset?: number;
    limit?: number;
  },
  signal?: AbortSignal
): Promise<EvidencePage> {
  try {
    const params = new URLSearchParams();
    if (options?.frameNumbers && options.frameNumbers.length > 0) {
      params.set("frame_numbers", options.frameNumbers.join(","));
    }
    if (options?.offset !== undefined) {
      params.set("offset", String(options.offset));
    }
    if (options?.limit !== undefined) {
      params.set("limit", String(options.limit));
    }

    const qs = params.toString();
    const url = `${API_BASE_URL}/api/analyses/${encodeURIComponent(analysisId)}/evidence${qs ? `?${qs}` : ""}`;

    const res = await fetch(url, {
      method: "GET",
      signal,
      headers: {
        Accept: "application/json",
      },
    });
    return await handleResponse<EvidencePage>(res);
  } catch (err) {
    catchNetworkError(err);
  }
}

/**
 * Release / delete an active analysis session.
 * DELETE /api/analyses/{analysis_id}
 */
export async function releaseAnalysis(
  analysisId: string,
  signal?: AbortSignal
): Promise<void> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/analyses/${encodeURIComponent(analysisId)}`, {
      method: "DELETE",
      signal,
    });
    return await handleResponse<void>(res);
  } catch (err) {
    catchNetworkError(err);
  }
}

export interface ExportResult {
  blob: Blob;
  filename: string;
}

/**
 * Export an analysis report as Markdown or JSON.
 * GET /api/analyses/{analysis_id}/export?format={markdown|json}
 */
export async function exportReport(
  analysisId: string,
  format: "markdown" | "json" = "markdown",
  signal?: AbortSignal
): Promise<ExportResult> {
  try {
    const url = `${API_BASE_URL}/api/analyses/${encodeURIComponent(analysisId)}/export?format=${encodeURIComponent(format)}`;
    const res = await fetch(url, {
      method: "GET",
      signal,
    });

    if (!res.ok) {
      let errorCode = `http_${res.status}`;
      let errorMessage = `Export request failed with status ${res.status}`;
      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        try {
          const errorData = (await res.json()) as ErrorResponse;
          if (errorData?.error) {
            errorCode = errorData.error.code || errorCode;
            errorMessage = errorData.error.message || errorMessage;
          }
        } catch {
          // Ignore parse failure
        }
      } else {
        try {
          const text = await res.text();
          if (text && text.length < 200) {
            errorMessage = text;
          }
        } catch {
          // Ignore read error
        }
      }
      throw new ApiError(errorMessage, errorCode, res.status);
    }

    // Parse Content-Disposition header for filename
    const disposition = res.headers.get("content-disposition") || "";
    let filename = "";
    const filenameMatch = disposition.match(/filename=["']?([^"';]+)["']?/i);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1].trim();
    }
    if (!filename) {
      const ext = format === "json" ? "json" : "md";
      filename = `causalpacket-${analysisId}.${ext}`;
    }

    const blob = await res.blob();
    return { blob, filename };
  } catch (err) {
    catchNetworkError(err);
  }
}

/** Separate synthetic experiment; never a normal capture/session replacement. */
export async function runEvidenceExperiment(seed: number, signal?: AbortSignal): Promise<ExperimentReport> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/lab/evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seed }),
      signal,
    });
    const result = await handleResponse<ExperimentReport>(response);
    if (result.data_origin !== "synthetic_experiment" || result.schema_version !== "1.0" ||
        !Array.isArray(result.cases) || result.cases.length > 32 || !Number.isInteger(result.seed)) {
      throw new ApiError("The experiment returned an unsupported response.", "invalid_response_format");
    }
    return result;
  } catch (error) {
    catchNetworkError(error);
  }
}
