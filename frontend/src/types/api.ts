export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  database?: string;
  environment?: string;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: Record<string, unknown> | Array<unknown>;
}

export interface ApiErrorResponse {
  error: ApiErrorDetail;
}

export interface RepositorySummary {
  id: string;
  name: string;
  remote_url?: string;
  default_branch: string;
  status: "registered" | "analyzing" | "completed" | "error";
  description?: string;
  created_at: string;
}
