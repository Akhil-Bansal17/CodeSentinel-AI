export type FindingSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
export type FindingCategory = "SYNTAX" | "COMPLEXITY" | "MAINTAINABILITY" | "CODE_SMELL" | "SECURITY";

export type FindingConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface AnalysisSummary {
  total_findings?: number;
  severity_distribution?: Record<FindingSeverity, number>;
  category_distribution?: Record<string, number>;
  confidence_distribution?: Record<FindingConfidence, number>;
  language_diagnostics?: Record<string, number>;
  analyzed_files?: number;
  skipped_files?: number;
}

export interface AnalysisRun {
  id: string;
  repository_id: string;
  snapshot_id: string;
  status: "pending" | "running" | "completed" | "failed";
  started_at: string;
  completed_at?: string | null;
  rule_set_version: string;
  files_discovered: number;
  files_analyzed: number;
  files_skipped: number;
  findings_count: number;
  failure_code?: string | null;
  failure_reason?: string | null;
  summary_json: AnalysisSummary;
}

export interface AnalysisFinding {
  id: string;
  analysis_run_id: string;
  repository_id: string;
  snapshot_id: string;
  rule_id: string;
  rule_name: string;
  rule_version: string;
  title: string;
  description: string;
  severity: FindingSeverity;
  category: FindingCategory;
  confidence?: FindingConfidence;
  file_path: string;
  start_line: number;
  start_column?: number | null;
  end_line?: number | null;
  end_column?: number | null;
  evidence_summary: string;
  fingerprint: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface RuleMetadata {
  rule_id: string;
  name: string;
  category: FindingCategory;
  severity: FindingSeverity;
  default_confidence: FindingConfidence;
  language: string;
  description: string;
  why_it_matters?: string;
  remediation?: string;
  limitations?: string;
}

export interface RulesCatalogResponse {
  rules: RuleMetadata[];
  total: number;
}

export interface AnalysisRunListResponse {
  items: AnalysisRun[];
  total: number;
  page: number;
  page_size: number;
}

export interface AnalysisFindingListResponse {
  items: AnalysisFinding[];
  total: number;
  page: number;
  page_size: number;
}

export interface StartAnalysisPayload {
  snapshot_id?: string;
  config?: Record<string, unknown>;
}
