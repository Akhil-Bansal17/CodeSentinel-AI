import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Folder,
  RotateCw,
  Trash2,
  FileCode,
  FolderTree,
  HardDrive,
  Code2,
  FileText,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
} from "lucide-react";
import { GithubIcon } from "../common/GithubIcon";

import { Repository, RepositoryFile, RepositoryFileListResponse } from "../../types/api";
import { repositoryService } from "../../services/repositoryService";
import { StatusBadge } from "../common/StatusBadge";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { ErrorState } from "../common/ErrorState";

interface RepositoryDetailViewProps {
  repository: Repository;
  onBack: () => void;
  onRepositoryUpdated: (updated: Repository) => void;
  onRepositoryDeleted: (deletedId: string) => void;
}

// Language color mapping for visual distribution bar
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f7df1e",
  Python: "#3572A5",
  Rust: "#dea584",
  Go: "#00ADD8",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Ruby: "#701516",
  PHP: "#4F5D95",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
  JSON: "#cbcb41",
  YAML: "#cb171e",
  Markdown: "#083fa1",
  Shell: "#89e051",
  PowerShell: "#012456",
  SQL: "#e38c00",
  Dockerfile: "#384d54",
  Unknown: "#6e7681",
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const RepositoryDetailView: React.FC<RepositoryDetailViewProps> = ({
  repository,
  onBack,
  onRepositoryUpdated,
  onRepositoryDeleted,
}) => {
  const snapshot = repository.latest_snapshot;

  // File explorer state
  const [files, setFiles] = useState<RepositoryFile[]>([]);
  const [totalFiles, setTotalFiles] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [search, setSearch] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const [loadingFiles, setLoadingFiles] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Actions state
  const [isReingesting, setIsReingesting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    if (!snapshot) return;
    setLoadingFiles(true);
    setFileError(null);
    try {
      const res: RepositoryFileListResponse = await repositoryService.listSnapshotFiles(repository.id, {
        page,
        pageSize,
        snapshotId: snapshot.id,
        search: search.trim() || undefined,
        language: selectedLanguage || undefined,
        category: selectedCategory || undefined,
      });
      setFiles(res.items);
      setTotalFiles(res.total);
    } catch (err: unknown) {
      setFileError(err instanceof Error ? err.message : "Failed to load repository files.");
    } finally {
      setLoadingFiles(false);
    }
  }, [repository.id, snapshot, page, pageSize, search, selectedLanguage, selectedCategory]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleReingest = async () => {
    if (repository.source_type === "local") {
      setActionError("To re-ingest a local repository, please connect it again with its directory path.");
      return;
    }
    setIsReingesting(true);
    setActionError(null);
    try {
      const updated = await repositoryService.reingestRepository(repository.id);
      onRepositoryUpdated(updated);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to re-ingest repository.");
    } finally {
      setIsReingesting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to remove '${repository.name}' from CodeSentinel AI?`)) {
      return;
    }
    setIsDeleting(true);
    setActionError(null);
    try {
      await repositoryService.deleteRepository(repository.id);
      onRepositoryDeleted(repository.id);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to delete repository.");
      setIsDeleting(false);
    }
  };

  const totalPages = Math.ceil(totalFiles / pageSize) || 1;

  // Language distribution entries
  const langEntries = snapshot?.language_distribution
    ? Object.entries(snapshot.language_distribution).sort(
        (a, b) => b[1].file_count - a[1].file_count
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col gap-4 pb-4 border-b border-[#21262d]">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Repositories</span>
          </button>

          <div className="flex items-center gap-2">
            {repository.source_type === "github" && (
              <button
                type="button"
                onClick={handleReingest}
                disabled={isReingesting || repository.status === "processing"}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-slate-200 text-xs font-medium border border-[#30363d] transition-colors cursor-pointer disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isReingesting ? "animate-spin" : ""}`} />
                <span>{isReingesting ? "Re-ingesting..." : "Re-ingest"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-medium border border-rose-800/60 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? "Deleting..." : "Delete"}</span>
            </button>
          </div>
        </div>

        {actionError && (
          <div className="p-3 rounded-md bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
            {actionError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-slate-100">{repository.name}</h1>
              {repository.source_type === "github" ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#161b22] text-slate-300 border border-[#30363d]">
                  <GithubIcon className="w-3 h-3" />
                  GitHub
                </span>
              ) : (

                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#161b22] text-slate-300 border border-[#30363d]">
                  <Folder className="w-3 h-3" />
                  Local Directory
                </span>
              )}

              <StatusBadge
                label={repository.status}
                variant={
                  repository.status === "completed"
                    ? "success"
                    : repository.status === "failed"
                    ? "danger"
                    : "warning"
                }
              />

            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
              {repository.source_url && (
                <a
                  href={repository.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-sky-400 transition-colors underline underline-offset-2"
                >
                  {repository.source_url}
                </a>
              )}
              {repository.default_branch && (
                <span className="flex items-center gap-1">
                  <Code2 className="w-3.5 h-3.5 text-slate-500" />
                  Branch: <code className="text-slate-300 font-mono">{repository.default_branch}</code>
                </span>
              )}
              {repository.last_ingested_at && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Last ingested: {new Date(repository.last_ingested_at).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Snapshot Metrics Overview */}
      {snapshot ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d]">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
                <FileCode className="w-3.5 h-3.5 text-sky-400" />
                <span>Total Files</span>
              </div>
              <div className="text-lg font-bold text-slate-100">
                {snapshot.file_count.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {snapshot.source_file_count.toLocaleString()} source files
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d]">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
                <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Lines of Code</span>
              </div>
              <div className="text-lg font-bold text-slate-100">
                {snapshot.total_lines_of_code.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Calculated LOC</div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d]">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                <span>Processed Size</span>
              </div>
              <div className="text-lg font-bold text-slate-100">
                {formatBytes(snapshot.total_size_bytes)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Uncompressed disk</div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d]">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
                <FolderTree className="w-3.5 h-3.5 text-violet-400" />
                <span>Directories</span>
              </div>
              <div className="text-lg font-bold text-slate-100">
                {snapshot.directory_count.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Discovered folders</div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d] col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Snapshot Status</span>
              </div>
              <div className="text-lg font-bold text-slate-100 capitalize">
                {snapshot.status}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Deterministic metrics</div>
            </div>
          </div>

          {/* Language Breakdown Section */}
          {langEntries.length > 0 && (
            <div className="p-4 rounded-lg bg-[#161b22] border border-[#30363d] space-y-3">
              <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                Language Distribution
              </h2>

              {/* Proportional visual bar */}
              <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-[#0d1117] border border-[#30363d]">
                {langEntries.map(([lang, stat]) => (
                  <div
                    key={lang}
                    title={`${lang}: ${stat.percentage}% (${stat.file_count} files)`}
                    style={{
                      width: `${stat.percentage}%`,
                      backgroundColor: LANGUAGE_COLORS[lang] || "#6e7681",
                    }}
                    className="h-full transition-all duration-300"
                  />
                ))}
              </div>

              {/* Language detail chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {langEntries.map(([lang, stat]) => (
                  <div
                    key={lang}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0d1117] border border-[#30363d] text-xs"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: LANGUAGE_COLORS[lang] || "#6e7681" }}
                    />
                    <span className="font-medium text-slate-200">{lang}</span>
                    <span className="text-slate-400 text-[11px]">{stat.percentage}%</span>
                    <span className="text-slate-400 text-[10px]">({stat.file_count} files)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Level Directories & Largest Files */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Level Directories */}
            {snapshot.metrics_json?.top_level_directories && (
              <div className="p-4 rounded-lg bg-[#161b22] border border-[#30363d] space-y-3">
                <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <FolderTree className="w-3.5 h-3.5 text-violet-400" />
                  Top-Level Directories
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#21262d] text-slate-400">
                        <th className="pb-2 font-medium">Directory</th>
                        <th className="pb-2 font-medium text-right">Files</th>
                        <th className="pb-2 font-medium text-right">Size</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#21262d]">
                      {snapshot.metrics_json.top_level_directories.map((dir) => (
                        <tr key={dir.name} className="hover:bg-[#1f242c]">
                          <td className="py-1.5 font-mono text-slate-200">{dir.name}</td>
                          <td className="py-1.5 text-right text-slate-400">{dir.file_count}</td>
                          <td className="py-1.5 text-right text-slate-400">
                            {formatBytes(dir.total_size_bytes)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Largest Files */}
            {snapshot.metrics_json?.largest_files && (
              <div className="p-4 rounded-lg bg-[#161b22] border border-[#30363d] space-y-3">
                <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  Largest Files
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#21262d] text-slate-400">
                        <th className="pb-2 font-medium">File Path</th>
                        <th className="pb-2 font-medium">Language</th>
                        <th className="pb-2 font-medium text-right">Size</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#21262d]">
                      {snapshot.metrics_json.largest_files.map((lf) => (
                        <tr key={lf.relative_path} className="hover:bg-[#1f242c]">
                          <td className="py-1.5 font-mono text-slate-200 truncate max-w-[200px]" title={lf.relative_path}>
                            {lf.relative_path}
                          </td>
                          <td className="py-1.5 text-slate-400">{lf.language}</td>
                          <td className="py-1.5 text-right text-slate-400">
                            {formatBytes(lf.size_bytes)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Safe File Explorer */}
          <div className="p-4 rounded-lg bg-[#161b22] border border-[#30363d] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-sky-400" />
                  File Explorer
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Discovered file metadata in this snapshot ({totalFiles} files matching filter)
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search file path..."
                    className="pl-8 pr-3 py-1.5 rounded-md bg-[#0d1117] border border-[#30363d] text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <select
                  value={selectedLanguage}
                  onChange={(e) => {
                    setSelectedLanguage(e.target.value);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-md bg-[#0d1117] border border-[#30363d] text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="">All Languages</option>
                  {langEntries.map(([lang]) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-md bg-[#0d1117] border border-[#30363d] text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="">All Categories</option>
                  <option value="source">Source</option>
                  <option value="configuration">Configuration</option>
                  <option value="documentation">Documentation</option>
                  <option value="data">Data</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Files Table */}
            {loadingFiles ? (
              <LoadingSpinner message="Loading files..." />
            ) : fileError ? (
              <ErrorState title="Could not load files" message={fileError} onRetry={fetchFiles} />
            ) : files.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No files match the selected search or filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#21262d] text-slate-400">
                      <th className="pb-2.5 font-medium">Relative Path</th>
                      <th className="pb-2.5 font-medium">Language</th>
                      <th className="pb-2.5 font-medium">Category</th>
                      <th className="pb-2.5 font-medium text-right">Size</th>
                      <th className="pb-2.5 font-medium text-right">Lines</th>
                      <th className="pb-2.5 font-medium text-right">SHA-256</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#21262d]">
                    {files.map((file) => (
                      <tr key={file.id} className="hover:bg-[#1f242c] transition-colors">
                        <td className="py-2 font-mono text-slate-200 flex items-center gap-1.5">
                          {file.is_source_file ? (
                            <FileCode className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          )}
                          <span className="truncate max-w-[320px]" title={file.relative_path}>
                            {file.relative_path}
                          </span>
                        </td>
                        <td className="py-2 text-slate-300">
                          <span className="inline-flex items-center gap-1">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: LANGUAGE_COLORS[file.language] || "#6e7681" }}
                            />
                            {file.language}
                          </span>
                        </td>
                        <td className="py-2 capitalize text-slate-400">{file.category}</td>
                        <td className="py-2 text-right text-slate-400">{formatBytes(file.size_bytes)}</td>
                        <td className="py-2 text-right text-slate-400">
                          {file.line_count !== null && file.line_count !== undefined
                            ? file.line_count.toLocaleString()
                            : "—"}
                        </td>
                        <td className="py-2 text-right font-mono text-slate-400 text-[11px]">
                          {file.sha256 ? file.sha256.substring(0, 8) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-[#21262d] text-xs text-slate-400">
                <div>
                  Showing {Math.min((page - 1) * pageSize + 1, totalFiles)} to{" "}
                  {Math.min(page * pageSize, totalFiles)} of {totalFiles} files
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loadingFiles}
                    className="px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-slate-200 border border-[#30363d] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-slate-300 font-mono">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || loadingFiles}
                    className="px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-slate-200 border border-[#30363d] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="p-6 rounded-lg bg-[#161b22] border border-[#30363d] text-center space-y-2">
          <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto" />
          <h2 className="text-sm font-semibold text-slate-200">No Snapshot Available</h2>
          <p className="text-xs text-slate-400">
            This repository has not completed an ingestion run yet.
          </p>
        </div>
      )}
    </div>
  );
};
