import { HealthResponse } from "../types/api";
import { CodebaseHealth, CodebaseHealthListResponse } from "../types/health";
import { request } from "./api";

/**
 * Fetches the backend health status from GET /api/health.
 */
export async function getHealthStatus(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}

/**
 * Computes or retrieves deterministic codebase health assessment for a repository.
 */
export async function getRepositoryHealth(
  repositoryId: string,
  snapshotId?: string
): Promise<CodebaseHealth> {
  let url = `/repositories/${repositoryId}/health`;
  if (snapshotId) url += `?snapshot_id=${encodeURIComponent(snapshotId)}`;
  return request<CodebaseHealth>(url);
}

/**
 * Retrieves historical codebase health assessments for a repository.
 */
export async function listHealthHistory(
  repositoryId: string,
  page = 1,
  pageSize = 20
): Promise<CodebaseHealthListResponse> {
  return request<CodebaseHealthListResponse>(
    `/repositories/${repositoryId}/health/history?page=${page}&page_size=${pageSize}`
  );
}

/**
 * Retrieves a specific health assessment by primary key ID.
 */
export async function getHealthAssessment(assessmentId: string): Promise<CodebaseHealth> {
  return request<CodebaseHealth>(`/health-assessments/${assessmentId}`);
}
