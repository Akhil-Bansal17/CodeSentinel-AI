import {
  ArchitectureGraph,
  ArchitecturePolicyResponse,
  ArchitectureRun,
  ArchitectureRunListResponse,
  ArchitectureViolationListResponse,
  ModuleDetail,
  ModuleListResponse,
  StartArchitecturePayload,
} from "../types/architecture";
import { request } from "./api";

/**
 * Trigger an architecture dependency and governance analysis run.
 */
export async function startArchitectureRun(
  repositoryId: string,
  payload?: StartArchitecturePayload
): Promise<ArchitectureRun> {
  return request<ArchitectureRun>(`/repositories/${repositoryId}/architecture`, {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
}

/**
 * List historical architecture runs for a repository.
 */
export async function listArchitectureRuns(
  repositoryId: string,
  page = 1,
  pageSize = 20
): Promise<ArchitectureRunListResponse> {
  return request<ArchitectureRunListResponse>(
    `/repositories/${repositoryId}/architecture?page=${page}&page_size=${pageSize}`
  );
}

/**
 * Get details and metrics for a specific architecture run.
 */
export async function getArchitectureRun(runId: string): Promise<ArchitectureRun> {
  return request<ArchitectureRun>(`/architecture/${runId}`);
}

/**
 * Get the full module dependency graph payload for a run.
 */
export async function getArchitectureGraph(runId: string): Promise<ArchitectureGraph> {
  return request<ArchitectureGraph>(`/architecture/${runId}/graph`);
}

/**
 * Get paginated list of module coupling metrics for a run.
 */
export async function listModules(
  runId: string,
  page = 1,
  pageSize = 50,
  search?: string,
  sortBy = "coupling"
): Promise<ModuleListResponse> {
  let url = `/architecture/${runId}/modules?page=${page}&page_size=${pageSize}&sort_by=${sortBy}`;
  if (search && search.trim()) {
    url += `&search=${encodeURIComponent(search.trim())}`;
  }
  return request<ModuleListResponse>(url);
}

/**
 * Get detailed incoming/outgoing dependencies, cycles, and violations for a specific module.
 */
export async function getModuleDetail(
  runId: string,
  modulePath: string
): Promise<ModuleDetail> {
  return request<ModuleDetail>(`/architecture/${runId}/modules/${encodeURIComponent(modulePath)}`);
}

/**
 * List paginated architecture governance policy violations for a run.
 */
export async function listViolations(
  runId: string,
  severity?: string,
  ruleId?: string,
  sourceModule?: string,
  page = 1,
  pageSize = 50
): Promise<ArchitectureViolationListResponse> {
  let url = `/architecture/${runId}/violations?page=${page}&page_size=${pageSize}`;
  if (severity) url += `&severity=${encodeURIComponent(severity)}`;
  if (ruleId) url += `&rule_id=${encodeURIComponent(ruleId)}`;
  if (sourceModule) url += `&source_module=${encodeURIComponent(sourceModule)}`;
  return request<ArchitectureViolationListResponse>(url);
}

/**
 * Check active architectural governance policy status for a repository.
 */
export async function getActivePolicy(
  repositoryId: string,
  snapshotId?: string
): Promise<ArchitecturePolicyResponse> {
  let url = `/repositories/${repositoryId}/architecture/policy`;
  if (snapshotId) url += `?snapshot_id=${encodeURIComponent(snapshotId)}`;
  return request<ArchitecturePolicyResponse>(url);
}
