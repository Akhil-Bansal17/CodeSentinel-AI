import { request } from "./api";
import {
  AdvisoryStatus,
  DependencyRun,
  DependencyRunListResponse,
  DependencyVulnerabilityListResponse,
  RepositoryDependencyListResponse,
} from "../types/dependency";

export interface StartDependencyAnalysisPayload {
  snapshot_id?: string;
  config?: Record<string, unknown>;
}

export interface ListDependenciesParams {
  ecosystem?: string;
  package?: string;
  dependency_type?: string;
  is_direct?: boolean;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface ListVulnerabilitiesParams {
  severity?: string;
  ecosystem?: string;
  package?: string;
  advisory_id?: string;
  page?: number;
  pageSize?: number;
}

export const dependencyService = {
  /**
   * Start deterministic dependency discovery and SCA on a repository snapshot.
   */
  async startDependencyAnalysis(
    repositoryId: string,
    payload: StartDependencyAnalysisPayload = {}
  ): Promise<DependencyRun> {
    return request<DependencyRun>(`/v1/repositories/${repositoryId}/dependency-analyses`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * List historical dependency runs for a repository.
   */
  async listRepositoryDependencyRuns(
    repositoryId: string,
    page = 1,
    pageSize = 20
  ): Promise<DependencyRunListResponse> {
    return request<DependencyRunListResponse>(
      `/v1/repositories/${repositoryId}/dependency-analyses?page=${page}&page_size=${pageSize}`
    );
  },

  /**
   * Fetch a specific dependency run's status and summary.
   */
  async getDependencyRun(runId: string): Promise<DependencyRun> {
    return request<DependencyRun>(`/v1/dependency-analyses/${runId}`);
  },

  /**
   * Fetch paginated discovered dependencies inventory.
   */
  async listDependencies(
    runId: string,
    params: ListDependenciesParams = {}
  ): Promise<RepositoryDependencyListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.pageSize) query.set("page_size", String(params.pageSize));
    if (params.ecosystem) query.set("ecosystem", params.ecosystem);
    if (params.package) query.set("package", params.package);
    if (params.dependency_type) query.set("dependency_type", params.dependency_type);
    if (params.is_direct !== undefined) query.set("is_direct", String(params.is_direct));
    if (params.status) query.set("status", params.status);

    const qs = query.toString();
    return request<RepositoryDependencyListResponse>(
      `/v1/dependency-analyses/${runId}/dependencies${qs ? `?${qs}` : ""}`
    );
  },

  /**
   * Fetch paginated vulnerability findings matching advisory records.
   */
  async listVulnerabilities(
    runId: string,
    params: ListVulnerabilitiesParams = {}
  ): Promise<DependencyVulnerabilityListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.pageSize) query.set("page_size", String(params.pageSize));
    if (params.severity) query.set("severity", params.severity);
    if (params.ecosystem) query.set("ecosystem", params.ecosystem);
    if (params.package) query.set("package", params.package);
    if (params.advisory_id) query.set("advisory_id", params.advisory_id);

    const qs = query.toString();
    return request<DependencyVulnerabilityListResponse>(
      `/v1/dependency-analyses/${runId}/vulnerabilities${qs ? `?${qs}` : ""}`
    );
  },

  /**
   * Fetch authoritative status and provenance of the advisory catalog.
   */
  async getAdvisoryStatus(): Promise<AdvisoryStatus> {
    return request<AdvisoryStatus>("/v1/advisories/status");
  },
};
