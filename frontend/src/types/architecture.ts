export type ArchitectureSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export interface ModuleNode {
  path: string;
  language: string;
  total_lines: number;
  classes_count: number;
  abstract_classes_count: number;
  afferent_coupling: number;
  efferent_coupling: number;
  instability: number | null;
  abstractness: number | null;
  main_sequence_distance: number | null;
}

export interface DependencyEdge {
  source_path: string;
  target_path: string;
  specifier: string;
  line_number: number;
  is_external: boolean;
  is_unresolved: boolean;
}

export interface CycleInfo {
  id: string;
  modules: string[];
  length: number;
}

export interface ArchitectureGraph {
  modules: ModuleNode[];
  internal_edges: DependencyEdge[];
  external_edges: DependencyEdge[];
  unresolved_edges: DependencyEdge[];
  cycles: CycleInfo[];
  summary: Record<string, unknown>;
  is_partial: boolean;
}

export interface ArchitectureViolation {
  id: string;
  architecture_run_id: string;
  repository_id: string;
  snapshot_id: string;
  rule_id: string;
  policy_id: string;
  source_module: string;
  target_module: string;
  edge_specifier: string;
  line_number: number;
  violated_boundary: string;
  description: string;
  remediation: string;
  severity: ArchitectureSeverity;
  confidence: string;
  fingerprint: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface ArchitectureRun {
  id: string;
  repository_id: string;
  snapshot_id: string;
  status: "pending" | "running" | "completed" | "failed";
  started_at: string;
  completed_at?: string | null;
  modules_analyzed: number;
  internal_edges_count: number;
  external_deps_count: number;
  unresolved_count: number;
  cycles_count: number;
  violations_count: number;
  policy_configured: boolean;
  policy_path?: string | null;
  failure_code?: string | null;
  failure_reason?: string | null;
  summary_json: Record<string, unknown>;
}

export interface ModuleDetail {
  node: ModuleNode;
  incoming_dependencies: DependencyEdge[];
  outgoing_dependencies: DependencyEdge[];
  external_dependencies: DependencyEdge[];
  unresolved_dependencies: DependencyEdge[];
  cycles: CycleInfo[];
  violations_count: number;
  violations: Array<Record<string, unknown>>;
}

export interface StartArchitecturePayload {
  snapshot_id?: string;
  policy_json?: string;
}

export interface ArchitectureRunListResponse {
  items: ArchitectureRun[];
  total: number;
  page: number;
  page_size: number;
}

export interface ArchitectureViolationListResponse {
  items: ArchitectureViolation[];
  total: number;
  page: number;
  page_size: number;
}

export interface ModuleListResponse {
  items: ModuleNode[];
  total: number;
  page: number;
  page_size: number;
}

export interface ArchitecturePolicyResponse {
  policy_configured: boolean;
  policy_path?: string | null;
  policy?: {
    version: string;
    description: string;
    layers: Array<{ name: string; patterns: string[] }>;
    rules: Array<{
      id: string;
      description: string;
      from_layer: string;
      forbidden_to_layer?: string | null;
      allowed_to_layers?: string[] | null;
      severity: string;
      remediation: string;
    }>;
    forbidden_dependencies: Array<{
      rule_id: string;
      from_pattern: string;
      to_pattern: string;
      description: string;
      severity: string;
    }>;
  } | null;
  error?: string | null;
}
