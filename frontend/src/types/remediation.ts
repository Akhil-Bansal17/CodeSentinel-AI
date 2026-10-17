/**
 * TypeScript definitions for Phase 7 Automated Remediation & Safe Code Patch Synthesis.
 */

export type RemediationRiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type RemediationConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export type ProposalStatus =
  | "PROPOSED"
  | "VALIDATING"
  | "VALIDATED"
  | "VALIDATION_FAILED"
  | "APPROVED"
  | "APPLIED"
  | "REJECTED"
  | "STALE"
  | "FAILED";

export interface RemediationRule {
  remediation_rule_id: string;
  target_rule_ids: string[];
  name: string;
  description: string;
  transformation_strategy: string;
  risk_level: RemediationRiskLevel;
  default_confidence: RemediationConfidenceLevel;
  applicable_languages: string[];
  preconditions: string[];
  unsupported_cases: string[];
  rationale: string;
}

export interface RemediationAvailability {
  finding_id: string;
  is_supported: boolean;
  remediation_rule_id?: string | null;
  strategy_name?: string | null;
  description?: string | null;
  rationale?: string | null;
  confidence?: RemediationConfidenceLevel | null;
  risk_level?: RemediationRiskLevel | null;
  unsupported_reason?: string | null;
  requires_human_review: boolean;
  suggested_action: string;
}

export interface RemediationProposalCreateRequest {
  repository_id: string;
  finding_id: string;
  snapshot_id?: string;
  override_strategy_id?: string;
  notes?: string;
}

export interface RemediationValidationItem {
  id?: string;
  check_id: string;
  check_name: string;
  status: "PASSED" | "FAILED" | "SKIPPED" | "UNAVAILABLE";
  explanation: string;
  diagnostic_message?: string | null;
}

export interface RemediationProposal {
  id: string;
  repository_id: string;
  snapshot_id: string;
  finding_id?: string | null;
  finding_type: string;
  remediation_rule_id: string;
  status: ProposalStatus;
  file_path: string;
  original_content_hash: string;
  target_content_hash: string;
  start_line: number;
  end_line: number;
  start_column?: number | null;
  end_column?: number | null;
  original_code_snippet: string;
  proposed_code_snippet: string;
  unified_diff: string;
  rationale: string;
  confidence: RemediationConfidenceLevel;
  risk_level: RemediationRiskLevel;
  is_llm_assisted: boolean;
  failure_reason?: string | null;
  applied_at?: string | null;
  applied_by?: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  validations: RemediationValidationItem[];
}

export interface RemediationProposalListResponse {
  items: RemediationProposal[];
  total: number;
}

export interface RemediationApplyResponse {
  status: "APPLIED" | "CANNOT_APPLY_READ_ONLY_ARCHIVE" | "STALE" | "FAILED";
  proposal_id: string;
  file_path: string;
  message: string;
  can_export_diff: boolean;
  unified_diff?: string | null;
  new_file_hash?: string | null;
}

export interface RemediationAuditItem {
  id: string;
  proposal_id: string;
  repository_id: string;
  action: string;
  actor: string;
  details_json: Record<string, unknown>;
  created_at: string;
}
