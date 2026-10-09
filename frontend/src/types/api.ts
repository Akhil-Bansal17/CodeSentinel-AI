export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  database?: string;
  environment?: string;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: Record<string, unknown> | Array<unknown>;
}

export interface ApiErrorResponse {
  error: ApiErrorDetail;
}

export type RepositorySourceType = "github" | "local";
export type RepositoryStatus = "registered" | "pending" | "processing" | "completed" | "failed";

export interface RepositoryFile {
  id: string;
  snapshot_id: string;
  relative_path: string;
  file_name: string;
  extension: string;
  language: string;
  category: string;
  size_bytes: number;
  is_source_file: boolean;
  is_binary: boolean;

  line_count?: number | null;
  sha256?: string | null;
}

export interface LanguageStat {
  file_count: number;
  size_bytes: number;
  lines_of_code: number;
  percentage: number;
}

export interface CategoryStat {
  file_count: number;
  size_bytes: number;
  lines_of_code: number;
}

export interface LargestFileStat {
  relative_path: string;
  file_name: string;
  size_bytes: number;
  language: string;
  line_count?: number | null;
}

export interface TopLevelDirStat {
  name: string;
  file_count: number;
  total_size_bytes: number;
}

export interface SnapshotMetrics {
  summary: {
    total_files: number;
    source_files: number;
    ignored_files: number;
    total_size_bytes: number;
    directory_count: number;
    total_lines_of_code: number;
  };
  language_distribution: Record<string, LanguageStat>;
  category_distribution: Record<string, CategoryStat>;
  largest_files: LargestFileStat[];
  top_level_directories: TopLevelDirStat[];
}

export interface RepositorySnapshot {
  id: string;
  repository_id: string;
  status: string;
  commit_sha?: string | null;
  branch?: string | null;
  started_at: string;
  completed_at?: string | null;
  file_count: number;
  source_file_count: number;
  ignored_file_count: number;
  total_size_bytes: number;
  directory_count: number;
  total_lines_of_code: number;
  language_distribution: Record<string, LanguageStat>;
  metrics_json: SnapshotMetrics;
  failure_code?: string | null;
  failure_reason?: string | null;
}

export interface Repository {
  id: string;
  name: string;
  source_type: RepositorySourceType;
  source_url?: string | null;
  source_identifier: string;
  default_branch?: string | null;
  status: RepositoryStatus;
  description?: string | null;
  created_at: string;
  updated_at: string;
  last_ingested_at?: string | null;
  error_code?: string | null;
  latest_snapshot?: RepositorySnapshot | null;
}

export interface RepositoryListResponse {
  items: Repository[];
  total: number;
  page: number;
  page_size: number;
}

export interface RepositoryFileListResponse {
  items: RepositoryFile[];
  total: number;
  page: number;
  page_size: number;
  snapshot_id: string;
}

export interface RepositoryCreatePayload {
  source_type: RepositorySourceType;
  source_url?: string;
  local_path?: string;
  name?: string;
  default_branch?: string;
}
