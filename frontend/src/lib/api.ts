const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

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

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export const apiClient = {
  async analyzeImage(files: File[], category?: string): Promise<AnalysisResponse> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("images", file);
    });
    if (category) {
      formData.append("category", category);
    }
    return fetchWithHandleError(`${BASE_URL}/inspections`, {
      method: "POST",
      body: formData,
    });
  },

  async getInspections(): Promise<Inspection[]> {
    return fetchWithHandleError(`${BASE_URL}/inspections`, {
      method: "GET",
    });
  },

  async getInspection(id: string): Promise<Inspection> {
    return fetchWithHandleError(`${BASE_URL}/inspections/${id}`, {
      method: "GET",
    });
  },

  async updateInspectionReview(
    id: string,
    payload: { reviewedFindings?: Record<string, ReviewEntry>; notes?: string }
  ): Promise<Inspection> {
    return fetchWithHandleError(`${BASE_URL}/inspections/${id}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  async updateDeclarations(
    id: string,
    extractedDeclarations: Record<string, any>,
    category?: string
  ): Promise<AnalysisResponse> {
    return fetchWithHandleError(`${BASE_URL}/inspections/${id}/declarations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extractedDeclarations, category }),
    });
  },

  async reviewFinding(
    id: string,
    findingId: string,
    decision: HumanReviewDecision,
    comment?: string
  ): Promise<AnalysisResponse> {
    return fetchWithHandleError(
      `${BASE_URL}/inspections/${encodeURIComponent(id)}/findings/${encodeURIComponent(findingId)}/review`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, comment }),
      }
    );
  },

  async login(email: string, password: string): Promise<AuthSession> {
    const session = await fetchWithHandleError<AuthSession>(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("token", session.token);
    if (session.role) localStorage.setItem("role", session.role);
    localStorage.setItem("email", session.email || "");
    if (session.name) localStorage.setItem("name", session.name);
    return session;
  },

  async register(email: string, password: string, role: string = "INSPECTOR"): Promise<{ message: string }> {
    return fetchWithHandleError(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role }),
    });
  },

  async finalizeInspection(id: string): Promise<AnalysisResponse> {
    return fetchWithHandleError(`${BASE_URL}/inspections/${encodeURIComponent(id)}/finalize`, {
      method: "POST",
    });
  },

  async downloadReport(id: string, format: "pdf" | "doc"): Promise<Blob> {
    const url = `${BASE_URL}/inspections/${encodeURIComponent(id)}/report?format=${format}`;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const response = await fetch(url, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('email');
        localStorage.removeItem('name');
        window.location.href = '/login';
      }
    }
      let message = "Report download failed";
      try {
        const data = await response.json();
        message = data.error || data.detail || message;
      } catch {
        /* ignore */
      }
      throw new ApiError(response.status, message);
    }
    return response.blob();
  },
};

export async function fetchWithHandleError<T = unknown>(url: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? (localStorage.getItem("token") as string | null) : null;
  const clientHeaders = options?.headers as Record<string, string> | undefined;
  const finalOptions: RequestInit = {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...clientHeaders,
    },
  };

  let response: Response;
  try {
    response = await fetch(url, finalOptions);
  } catch (error) {
    throw new Error(
      `Network error: Could not connect to the API. Is the server running? (${error instanceof Error ? error.message : String(error)})`
    );
  }

  if (!response.ok) {
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('email');
        localStorage.removeItem('name');
        window.location.href = '/login';
      }
    }
    let message = "An error occurred";
    try {
      const errorData = await response.json();
      message = errorData.detail || errorData.message || errorData.error || message;
    } catch {
      message = response.statusText;
    }
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<T>;
}

export interface AuthSession {
  token: string;
  role?: string;
  email?: string;
  name?: string;
}

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