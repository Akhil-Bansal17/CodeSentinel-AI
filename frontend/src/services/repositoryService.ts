import { request } from "./api";
import {
  Repository,
  RepositoryCreatePayload,
  RepositoryFileListResponse,
  RepositoryListResponse,
  RepositorySnapshot,
} from "../types/api";

export interface ListFilesParams {
  page?: number;
  pageSize?: number;
  snapshotId?: string;
  language?: string;
  category?: string;
  search?: string;
  isSourceFile?: boolean;
}

export const repositoryService = {
  /**
   * List all tracked repositories with pagination.
   */
  async listRepositories(page = 1, pageSize = 20): Promise<RepositoryListResponse> {
    return request<RepositoryListResponse>(`/v1/repositories?page=${page}&page_size=${pageSize}`);
  },

  /**
   * Fetch complete repository details and latest snapshot.
   */
  async getRepository(repositoryId: string): Promise<Repository> {
    return request<Repository>(`/v1/repositories/${repositoryId}`);
  },

  /**
   * Register and ingest a new repository (GitHub or local path).
   */
  async createAndIngestRepository(payload: RepositoryCreatePayload): Promise<Repository> {
    return request<Repository>("/v1/repositories", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Fetch specific snapshot details and metrics.
   */
  async getSnapshot(repositoryId: string, snapshotId: string): Promise<RepositorySnapshot> {
    return request<RepositorySnapshot>(`/v1/repositories/${repositoryId}/snapshots/${snapshotId}`);
  },

  /**
   * Fetch paginated file metadata for a repository snapshot.
   */
  async listSnapshotFiles(repositoryId: string, params: ListFilesParams = {}): Promise<RepositoryFileListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.pageSize) query.set("page_size", String(params.pageSize));
    if (params.snapshotId) query.set("snapshot_id", params.snapshotId);
    if (params.language) query.set("language", params.language);
    if (params.category) query.set("category", params.category);
    if (params.search) query.set("search", params.search);
    if (params.isSourceFile !== undefined) query.set("is_source_file", String(params.isSourceFile));

    const qs = query.toString();
    return request<RepositoryFileListResponse>(`/v1/repositories/${repositoryId}/files${qs ? `?${qs}` : ""}`);
  },

  /**
   * Re-ingest an existing repository.
   */
  async reingestRepository(repositoryId: string): Promise<Repository> {
    return request<Repository>(`/v1/repositories/${repositoryId}/reingest`, {
      method: "POST",
    });
  },

  /**
   * Delete a repository from the database.
   */
  async deleteRepository(repositoryId: string): Promise<void> {
    return request<void>(`/v1/repositories/${repositoryId}`, {
      method: "DELETE",
    });
  },
};
