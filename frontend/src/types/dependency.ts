export type VulnerabilitySeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO" | "UNKNOWN";

export interface DependencySummary {
  total_dependencies?: number;
  resolved_dependencies?: number;
  unresolved_dependencies?: number;
  direct_count?: number;
  transitive_count?: number;
  vulnerabilities_count?: number;
  severity_distribution?: Record<VulnerabilitySeverity, number>;
  ecosystem_distribution?: Record<string, number>;
  advisory_dataset_status?: string;
  advisory_dataset_version?: string;
  manifest_files?: string[];
  skipped_manifests?: string[];
}

export interface DependencyRun {
  id: string;
  repository_id: string;
  snapshot_id: string;
  status: "pending" | "running" | "completed" | "completed_with_limitations" | "failed";
  started_at: string;
  completed_at?: string | null;
  advisory_dataset_version?: string | null;
  parser_version: string;
  matching_engine_version: string;
  dependencies_discovered: number;
  dependencies_resolved: number;
  dependencies_unresolved: number;
  vulnerabilities_count: number;
  manifest_files_count: number;
  failure_code?: string | null;
  failure_reason?: string | null;
  summary_json: DependencySummary;
  created_at: string;
  updated_at: string;
}

export interface RepositoryDependency {
  id: string;
  dependency_run_id: string;
  repository_id: string;
  snapshot_id: string;
  manifest_path: string;
  lockfile_path?: string | null;
  ecosystem: string;
  package_name: string;
  original_package_name: string;
  version_constraint?: string | null;
  resolved_version?: string | null;
  dependency_type: string;
  is_direct?: boolean | null;
  scope?: string | null;
  parser_name: string;
  parser_version: string;
  status: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface DependencyVulnerability {
  id: string;
  dependency_run_id: string;
  dependency_id?: string | null;
  repository_id: string;
  snapshot_id: string;
  advisory_id: string;
  ecosystem: string;
  package_name: string;
  resolved_version?: string | null;
  affected_range: string;
  severity: VulnerabilitySeverity;
  severity_source: string;
  cvss_score?: number | null;
  remediation_version?: string | null;
  manifest_path: string;
  line_number?: number | null;
  evidence_summary: string;
  fingerprint: string;
  cve_ids: string[];
  advisory_dataset_version?: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface AdvisoryStatus {
  status: "POPULATED" | "EMPTY_VALID" | "UNAVAILABLE" | "INVALID";
  dataset_version?: string | null;
  source_name?: string | null;
  records_count: number;
  checksum?: string | null;
  updated_at?: string | null;
  message: string;
}

export interface DependencyRunListResponse {
  items: DependencyRun[];
  total: number;
  page: number;
  page_size: number;
}

export interface RepositoryDependencyListResponse {
  items: RepositoryDependency[];
  total: number;
  page: number;
  page_size: number;
}

export interface DependencyVulnerabilityListResponse {
  items: DependencyVulnerability[];
  total: number;
  page: number;
  page_size: number;
}
