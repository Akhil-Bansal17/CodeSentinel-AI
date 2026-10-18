/**
 * Phase 8 CI/CD Automation, Security Audit, and PR Synthesis Type Definitions.
 */

export interface WorkflowGenerateRequest {
  repository_id: string;
  ecosystem?: "python" | "node" | "mixed" | "generic";
  include_lint?: boolean;
  include_test?: boolean;
  include_typecheck?: boolean;
  include_build?: boolean;
  include_security_audit?: boolean;
  include_artifact_upload?: boolean;
  python_version?: string;
  node_version?: string;
  workflow_name?: string;
  trigger_branches?: string[];
}

export interface WorkflowGenerateResponse {
  filename: string;
  yaml_content: string;
  ecosystem_detected: string;
  permissions_summary: Record<string, string>;
  security_warnings: string[];
}

export interface AuditCheckItem {
  check_id: string;
  category: "INGESTION" | "STATIC_ANALYSIS" | "DEPENDENCY_SCA" | "APPSEC_INTELLIGENCE" | "ARCHITECTURE_GOVERNANCE" | "REMEDIATION_VALIDATION";
  name: string;
  status: "PASSED" | "FAILED" | "WARNING" | "SKIPPED" | "UNSUPPORTED" | "ERROR";
  description: string;
  details: Record<string, any>;
  duration_ms: number;
}

export interface AuditRunSummary {
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  warning_checks: number;
  skipped_checks: number;
  unsupported_checks: number;
  error_checks: number;
  total_findings: number;
  findings_by_severity: Record<string, number>;
  total_duration_ms: number;
}

export interface AuditRunResponse {
  id: string;
  repository_id: string;
  snapshot_id: string;
  status: string;
  overall_status: "PASSED" | "FAILED" | "WARNING" | "SKIPPED" | "UNSUPPORTED" | "ERROR";
  started_at: string;
  completed_at?: string;
  summary: AuditRunSummary;
  checks: AuditCheckItem[];
  findings_preview: Array<Record<string, any>>;
  markdown_report: string;
  sarif_json: Record<string, any>;
}

export interface AuditRunListItem {
  id: string;
  repository_id: string;
  snapshot_id: string;
  status: string;
  overall_status: string;
  started_at: string;
  completed_at?: string;
  total_checks: number;
  failed_checks: number;
  warning_checks: number;
  total_findings: number;
}

export interface AuditRunListResponse {
  items: AuditRunListItem[];
  total: number;
}

export interface PrPrepareRequest {
  repository_id: string;
  snapshot_id?: string;
  proposal_ids: string[];
  custom_title?: string;
}

export interface PrPrepareResponse {
  id: string;
  repository_id: string;
  snapshot_id: string;
  title: string;
  description: string;
  status: string;
  proposal_count: number;
  proposal_ids: string[];
  combined_diff: string;
  patch_bundle: string;
  has_conflicts: boolean;
  conflict_details: Record<string, any>;
  risk_summary: string;
  created_at: string;
}

export interface CiIngestRequest {
  repository_id: string;
  snapshot_id?: string;
  ci_provider: string;
  commit_sha: string;
  branch: string;
  status: string;
  payload: Record<string, any>;
  idempotency_key: string;
  signature?: string;
}

export interface CiIngestResponse {
  id: string;
  repository_id: string;
  ci_provider: string;
  status: string;
  is_duplicate: boolean;
  created_at: string;
}
