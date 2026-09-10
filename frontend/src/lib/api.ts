import axios, { AxiosError, AxiosRequestConfig } from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------
export const apiAxios = axios.create({
  baseURL: BASE_URL,
  timeout: 300_000, // 5 min — matches backend AI service timeout
});

// Attach JWT token to every request
apiAxios.interceptors.request.use((config) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Unified error handling: 401 → clear session & redirect to /login
apiAxios.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      !error.config?.url?.includes("/auth/login")
    ) {
      ["token", "role", "email", "name"].forEach((k) =>
        localStorage.removeItem(k)
      );
      window.location.href = "/login";
    }
    // Re-throw as ApiError so callers get a consistent type
    const status = error.response?.status ?? 0;
    const data = error.response?.data as Record<string, string> | undefined;
    const message =
      data?.detail ?? data?.message ?? data?.error ?? error.message;
    return Promise.reject(new ApiError(status, message));
  }
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type FindingStatus =
  | "DETECTED"
  | "NOT_DETECTED"
  | "UNABLE_TO_VERIFY"
  | "CONFIRMED_NON_COMPLIANT"
  | "NOT_APPLICABLE";

export interface DeclarationValue {
  value: string | number | Record<string, unknown> | null;
  raw_text?: string | null;
  confidence?: number | null;
  bounding_box?: BoundingBox | null;
  source_line?: string | null;
  is_deterministic?: boolean;
  source?: string | null;
  evidenceImageId?: string | null;
  originalValue?: any;
  reviewedValue?: any;
  manuallyVerified?: boolean;
  editedBy?: string;
  editedAt?: string;
}

export interface Finding {
  ruleId: string;
  ruleVersion?: string;
  field: string;
  observedValue?: string | null;
  expectedCondition?: string;
  status: FindingStatus;
  severity?: "HIGH" | "MEDIUM" | "LOW";
  explanation?: string;
  sourceReference?: string;
  evidenceImageId?: string | null;
  boundingBox?: BoundingBox | null;
  confidence?: number | null;
  requiresHumanReview?: boolean;
}

export interface ComplianceSummary {
  detected: number;
  notDetected: number;
  unableToVerify: number;
  confirmedNonCompliant: number;
  notApplicable: number;
  overall: "COMPLIANT" | "REVIEW_REQUIRED" | "NON_COMPLIANT";
}

export type HumanReviewDecision = "VERIFIED" | "REJECTED";
export type HumanReviewStatus = HumanReviewDecision | "PENDING";

export interface ReviewEntry {
  reviewStatus?: HumanReviewStatus;
  decision?: HumanReviewDecision;
  reviewComment?: string;
  comment?: string;
  reviewedBy?: string | { _id?: string; name?: string; email?: string } | null;
  reviewedByName?: string;
  reviewedAt?: string;
  previousStatus?: string;
  previousFinding?: Finding | null;
  resultingStatus?: string;
}

export interface ImageMetadata {
  width?: number;
  height?: number;
  format?: string;
  dpi?: number;
}

export interface AnalysisResponse {
  status: string;
  declarations: Record<string, DeclarationValue>;
  raw_ocr: string;
  ocr_lines_count: number;
  missing_fields: string[];
  llm_assisted: boolean;
  timing_ms: Record<string, number>;
  image_metadata?: ImageMetadata;
  _id?: string;
  inspectionId?: string;
  findings?: Finding[];
  category?: string;
  images?: string[];
  inspectorId?: { name?: string; email?: string } | string | null;
  productId?: { name?: string; brand?: string; category?: string } | string | null;
  createdAt?: string;
  summary?: ComplianceSummary;
}

export interface Inspection extends AnalysisResponse {
  notes?: string;
  reviewStatus?: string;
  reviewedFindings?: Record<string, ReviewEntry>;
  extractedDeclarations?: Record<string, DeclarationValue>;
}

export interface AuthSession {
  token: string;
  role?: string;
  email?: string;
  name?: string;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------
export const apiClient = {
  async analyzeImage(files: File[], category?: string): Promise<AnalysisResponse> {
    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));
    if (category) formData.append("category", category);

    const { data } = await apiAxios.post<AnalysisResponse>("/inspections", formData);
    return data;
  },

  async getInspections(): Promise<Inspection[]> {
    const { data } = await apiAxios.get<Inspection[]>("/inspections");
    return data;
  },

  async getInspection(id: string): Promise<Inspection> {
    const { data } = await apiAxios.get<Inspection>(`/inspections/${id}`);
    return data;
  },

  async updateInspectionReview(
    id: string,
    payload: { reviewedFindings?: Record<string, ReviewEntry>; notes?: string }
  ): Promise<Inspection> {
    const { data } = await apiAxios.patch<Inspection>(
      `/inspections/${id}/review`,
      payload
    );
    return data;
  },

  async updateDeclarations(
    id: string,
    extractedDeclarations: Record<string, any>,
    category?: string
  ): Promise<AnalysisResponse> {
    const { data } = await apiAxios.patch<AnalysisResponse>(
      `/inspections/${id}/declarations`,
      { extractedDeclarations, category }
    );
    return data;
  },

  async reviewFinding(
    id: string,
    findingId: string,
    decision: HumanReviewDecision,
    comment?: string
  ): Promise<AnalysisResponse> {
    const { data } = await apiAxios.post<AnalysisResponse>(
      `/inspections/${encodeURIComponent(id)}/findings/${encodeURIComponent(findingId)}/review`,
      { decision, comment }
    );
    return data;
  },

  async login(email: string, password: string): Promise<AuthSession> {
    const { data } = await apiAxios.post<AuthSession>("/auth/login", {
      email,
      password,
    });
    localStorage.setItem("token", data.token);
    if (data.role) localStorage.setItem("role", data.role);
    localStorage.setItem("email", data.email || "");
    if (data.name) localStorage.setItem("name", data.name);
    return data;
  },

  async register(
    email: string,
    password: string,
    role: string = "INSPECTOR"
  ): Promise<{ message: string }> {
    const { data } = await apiAxios.post<{ message: string }>("/auth/register", {
      email,
      password,
      role,
    });
    return data;
  },

  async finalizeInspection(id: string): Promise<AnalysisResponse> {
    const { data } = await apiAxios.post<AnalysisResponse>(
      `/inspections/${encodeURIComponent(id)}/finalize`
    );
    return data;
  },

  async downloadReport(id: string, format: "pdf" | "doc"): Promise<Blob> {
    const { data } = await apiAxios.get<Blob>(
      `/inspections/${encodeURIComponent(id)}/report`,
      { params: { format }, responseType: "blob" }
    );
    return data;
  },
};

// ---------------------------------------------------------------------------
// Kept for any legacy callers — wraps apiAxios so behaviour is identical
// ---------------------------------------------------------------------------
export async function fetchWithHandleError<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const method = (options?.method ?? "GET") as AxiosRequestConfig["method"];
  const body = options?.body;
  const headers = options?.headers as Record<string, string> | undefined;

  // Strip the base URL prefix if present so apiAxios baseURL works correctly
  const relativeUrl = url.startsWith(BASE_URL)
    ? url.slice(BASE_URL.length)
    : url;

  const { data } = await apiAxios.request<T>({
    method,
    url: relativeUrl,
    data: body instanceof FormData ? body : body ? JSON.parse(body as string) : undefined,
    headers,
  });
  return data;
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------
export const getStoredRole = (): string | null =>
  typeof window !== "undefined" ? localStorage.getItem("role") : null;

export const getStoredUser = (): { name?: string; email?: string; role?: string } => ({
  name: typeof window !== "undefined" ? localStorage.getItem("name") || undefined : undefined,
  email: typeof window !== "undefined" ? localStorage.getItem("email") || undefined : undefined,
  role: getStoredRole() || undefined,
});

export const clearStoredSession = () => {
  if (typeof window === "undefined") return;
  ["token", "role", "email", "name"].forEach((k) => localStorage.removeItem(k));
};