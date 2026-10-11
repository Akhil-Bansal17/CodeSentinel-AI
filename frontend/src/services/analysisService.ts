import { request } from "./api";
import {
  AnalysisFindingListResponse,
  AnalysisRun,
  AnalysisRunListResponse,
  StartAnalysisPayload,
} from "../types/analysis";

export interface ListFindingsParams {
  severity?: string;
  category?: string;
  ruleId?: string;
  filePath?: string;
  page?: number;
  pageSize?: number;
}

export const analysisService = {
  /**
   * Start deterministic static analysis on a repository snapshot.
   */
  async startAnalysis(repositoryId: string, payload: StartAnalysisPayload = {}): Promise<AnalysisRun> {
    return request<AnalysisRun>(`/v1/repositories/${repositoryId}/analyses`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * List historical analysis runs for a repository.
   */
  async listRepositoryAnalyses(repositoryId: string, page = 1, pageSize = 20): Promise<AnalysisRunListResponse> {
    return request<AnalysisRunListResponse>(
      `/v1/repositories/${repositoryId}/analyses?page=${page}&page_size=${pageSize}`
    );
  },

  /**
   * Fetch a specific analysis run's status and summary.
   */
  async getAnalysis(analysisId: string): Promise<AnalysisRun> {
    return request<AnalysisRun>(`/v1/analyses/${analysisId}`);
  },

  /**
   * Fetch paginated, evidence-backed findings for an analysis run.
   */
  async listFindings(analysisId: string, params: ListFindingsParams = {}): Promise<AnalysisFindingListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.pageSize) query.set("page_size", String(params.pageSize));
    if (params.severity) query.set("severity", params.severity);
    if (params.category) query.set("category", params.category);
    if (params.ruleId) query.set("rule_id", params.ruleId);
    if (params.filePath) query.set("file_path", params.filePath);

    const qs = query.toString();
    return request<AnalysisFindingListResponse>(`/v1/analyses/${analysisId}/findings${qs ? `?${qs}` : ""}`);
  },
};
