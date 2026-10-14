export type DimensionStatus = "HEALTHY" | "WARNING" | "CRITICAL" | "UNAVAILABLE";

export interface HealthDimension {
  name: string;
  score: number | null;
  status: DimensionStatus;
  weight: number;
  contribution: number | null;
  metrics: Record<string, unknown>;
  reasons: string[];
}

export interface Recommendation {
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  dimension: string;
  title: string;
  action: string;
}

export interface CodebaseHealth {
  id?: string | null;
  repository_id: string;
  snapshot_id: string;
  scoring_version: string;
  overall_score: number | null;
  status: "completed" | "partial" | "unavailable";
  dimensions: Record<string, HealthDimension>;
  contributing_runs: Record<string, string | null>;
  missing_inputs: string[];
  recommendations: Recommendation[];
  assessed_at: string;
}

export interface CodebaseHealthListResponse {
  items: CodebaseHealth[];
  total: number;
  page: number;
  page_size: number;
}
