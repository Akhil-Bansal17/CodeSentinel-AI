import { request } from "./api";
import {
  CodeChunkDetail,
  CodeIndexRun,
  CodeSearchResponse,
  QAResponse,
  SearchCapabilities,
} from "../types/api";

export interface CodeSearchPayload {
  query: string;
  mode?: "lexical" | "semantic" | "hybrid";
  language?: string;
  file_path?: string;
  symbol_type?: string;
  limit?: number;
}

export interface QAPayload {
  question: string;
  retrieval_mode?: "lexical" | "semantic" | "hybrid";
  prefer_llm?: boolean;
}

export const searchService = {
  async startIndexing(
    repositoryId: string,
    snapshotId: string,
    forceReindex: boolean = false,
    localPathOverride?: string
  ): Promise<CodeIndexRun> {
    return request<CodeIndexRun>(`/v1/repositories/${repositoryId}/snapshots/${snapshotId}/index`, {
      method: "POST",
      body: JSON.stringify({
        force_reindex: forceReindex,
        local_path_override: localPathOverride,
      }),
    });
  },

  async getIndexStatus(repositoryId: string, snapshotId: string): Promise<CodeIndexRun> {
    return request<CodeIndexRun>(`/v1/repositories/${repositoryId}/snapshots/${snapshotId}/index/status`);
  },

  async getCapabilities(repositoryId: string, snapshotId: string): Promise<SearchCapabilities> {
    return request<SearchCapabilities>(`/v1/repositories/${repositoryId}/snapshots/${snapshotId}/index/capabilities`);
  },

  async searchCode(
    repositoryId: string,
    snapshotId: string,
    payload: CodeSearchPayload
  ): Promise<CodeSearchResponse> {
    return request<CodeSearchResponse>(`/v1/repositories/${repositoryId}/snapshots/${snapshotId}/search`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getChunkDetail(
    repositoryId: string,
    snapshotId: string,
    chunkId: string
  ): Promise<CodeChunkDetail> {
    return request<CodeChunkDetail>(`/v1/repositories/${repositoryId}/snapshots/${snapshotId}/chunks/${chunkId}`);
  },

  async askQuestion(
    repositoryId: string,
    snapshotId: string,
    payload: QAPayload
  ): Promise<QAResponse> {
    return request<QAResponse>(`/v1/repositories/${repositoryId}/snapshots/${snapshotId}/qa`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
