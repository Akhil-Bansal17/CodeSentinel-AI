import React, { useState, useEffect, useCallback } from "react";
import {
  FileCode,
  FolderTree,
  HardDrive,
  Code2,
  FileText,
  Search,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronDown,
  X,
  Folder,
} from "lucide-react";
import { Repository, RepositoryFile, RepositoryFileListResponse, RepositorySnapshot } from "../../types/api";
import { repositoryService } from "../../services/repositoryService";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { ErrorState } from "../common/ErrorState";
import { EmptyState } from "../common/EmptyState";
import { Button } from "../common/Button";

interface RepositoryOverviewTabProps {
  repository: Repository;
  snapshot?: RepositorySnapshot | null;
}

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
  Unknown: "#71717a",
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const RepositoryOverviewTab: React.FC<RepositoryOverviewTabProps> = ({
  repository,
  snapshot,
}) => {
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

  const fetchFiles = useCallback(async () => {
    if (!snapshot) return;
    setLoadingFiles(true);
    setFileError(null);
    try {
      const res: RepositoryFileListResponse = await repositoryService.listSnapshotFiles(
        repository.id,
        {
          page,
          pageSize,
          snapshotId: snapshot.id,
          search: search.trim() || undefined,
          language: selectedLanguage || undefined,
          category: selectedCategory || undefined,
        }
      );
      setFiles(res.items);
      setTotalFiles(res.total);
    } catch (err: unknown) {
      setFileError(err instanceof Error ? err.message : "Failed to load repository files.");
    } finally {
      setLoadingFiles(false);
    }
  }, [repository.id, snapshot, page, pageSize, search, selectedLanguage, selectedCategory]);

  useEffect(() => {
    if (!snapshot) return;
    let isCancelled = false;

    async function loadFiles() {
      try {
        const res: RepositoryFileListResponse = await repositoryService.listSnapshotFiles(
          repository.id,
          {
            page,
            pageSize,
            snapshotId: snapshot?.id,
            search: search.trim() || undefined,
            language: selectedLanguage || undefined,
            category: selectedCategory || undefined,
          }
        );
        if (isCancelled) return;
        setFiles(res.items);
        setTotalFiles(res.total);
      } catch (err: unknown) {
        if (isCancelled) return;
        setFileError(err instanceof Error ? err.message : "Failed to load repository files.");
      } finally {
        if (!isCancelled) {
          setLoadingFiles(false);
        }
      }
    }

    loadFiles();

    return () => {
      isCancelled = true;
    };
  }, [repository.id, snapshot, page, pageSize, search, selectedLanguage, selectedCategory]);

  if (!snapshot) {
    return (
      <EmptyState
        icon={<AlertTriangle className="w-6 h-6 text-amber-400" />}
        title="No Snapshot Available"
        description="This repository has not completed an ingestion run yet. Start or re-trigger an ingestion to analyze files and structure."
      />
    );
  }

  const totalPages = Math.ceil(totalFiles / pageSize) || 1;

  // Language distribution entries sorted descending by file count
  const langEntries = snapshot.language_distribution
    ? Object.entries(snapshot.language_distribution).sort(
        (a, b) => b[1].file_count - a[1].file_count
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-lg bg-surface-card border border-border-default shadow-xs hover:border-border-strong transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 text-text-muted text-xs font-medium mb-1.5">
            <span>Total Files</span>
            <div className="p-1 rounded bg-accent-subtle/50 text-accent">
              <FileCode className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-text-primary tracking-tight font-mono">
              {snapshot.file_count.toLocaleString()}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5 truncate">
              {snapshot.source_file_count.toLocaleString()} source files
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-surface-card border border-border-default shadow-xs hover:border-border-strong transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 text-text-muted text-xs font-medium mb-1.5">
            <span>Lines of Code</span>
            <div className="p-1 rounded bg-emerald-500/10 text-emerald-400">
              <Code2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-text-primary tracking-tight font-mono">
              {snapshot.total_lines_of_code.toLocaleString()}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">Calculated LOC</div>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-surface-card border border-border-default shadow-xs hover:border-border-strong transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 text-text-muted text-xs font-medium mb-1.5">
            <span>Processed Size</span>
            <div className="p-1 rounded bg-amber-500/10 text-amber-400">
              <HardDrive className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-text-primary tracking-tight font-mono">
              {formatBytes(snapshot.total_size_bytes)}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">Uncompressed disk</div>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-surface-card border border-border-default shadow-xs hover:border-border-strong transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 text-text-muted text-xs font-medium mb-1.5">
            <span>Directories</span>
            <div className="p-1 rounded bg-violet-500/10 text-violet-400">
              <FolderTree className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-text-primary tracking-tight font-mono">
              {snapshot.directory_count.toLocaleString()}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">Discovered folders</div>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-surface-card border border-border-default shadow-xs hover:border-border-strong transition-colors col-span-2 sm:col-span-1 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 text-text-muted text-xs font-medium mb-1.5">
            <span>Snapshot Status</span>
            <div className="p-1 rounded bg-teal-500/10 text-teal-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-text-primary tracking-tight capitalize flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  snapshot.status === "completed"
                    ? "bg-emerald-400"
                    : snapshot.status === "failed"
                    ? "bg-rose-400"
                    : "bg-amber-400"
                }`}
              />
              <span>{snapshot.status}</span>
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">Deterministic metrics</div>
          </div>
        </div>
      </div>

      {/* Language Breakdown Section */}
      {langEntries.length > 0 && (
        <div className="p-4 rounded-lg bg-surface-card border border-border-default space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-0.5">
            <h2 className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-accent" />
              Language Distribution
            </h2>
            <span className="text-[11px] font-mono text-text-muted">
              {langEntries.length} {langEntries.length === 1 ? "language" : "languages"} detected
            </span>
          </div>

          {/* Proportional visual bar */}
          <div className="h-2 w-full rounded-full overflow-hidden flex bg-surface-base border border-border-subtle shadow-inner">
            {langEntries.map(([lang, stat]) => (
              <div
                key={lang}
                title={`${lang}: ${stat.percentage}% (${stat.file_count} files)`}
                style={{
                  width: `${stat.percentage}%`,
                  backgroundColor: LANGUAGE_COLORS[lang] || "#71717a",
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
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-base border border-border-default text-xs hover:border-border-strong transition-colors"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: LANGUAGE_COLORS[lang] || "#71717a" }}
                />
                <span className="font-medium text-text-primary">{lang}</span>
                <span className="text-text-muted text-[11px] font-mono">{stat.percentage}%</span>
                <span className="text-text-muted text-[10px]">({stat.file_count} files)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Level Directories & Largest Files */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Level Directories */}
        {snapshot.metrics_json?.top_level_directories && (
          <div className="p-4 rounded-lg bg-surface-card border border-border-default space-y-3 shadow-xs">
            <div className="flex items-center justify-between pb-0.5">
              <h2 className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <FolderTree className="w-3.5 h-3.5 text-violet-400" />
                Top-Level Directories
              </h2>
              <span className="text-[11px] font-mono text-text-muted">
                {snapshot.metrics_json.top_level_directories.length} total
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-subtle text-text-muted text-[11px] uppercase tracking-wider">
                    <th className="pb-2 font-medium">Directory</th>
                    <th className="pb-2 font-medium text-right">Files</th>
                    <th className="pb-2 font-medium text-right">Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {snapshot.metrics_json.top_level_directories.map((dir) => (
                    <tr key={dir.name} className="hover:bg-surface-elevated/40 transition-colors">
                      <td className="py-2 font-mono text-text-primary flex items-center gap-1.5">
                        <Folder className="w-3.5 h-3.5 text-violet-400/80 shrink-0" />
                        <span>{dir.name}</span>
                      </td>
                      <td className="py-2 text-right text-text-secondary font-mono">{dir.file_count}</td>
                      <td className="py-2 text-right text-text-secondary font-mono">
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
          <div className="p-4 rounded-lg bg-surface-card border border-border-default space-y-3 shadow-xs">
            <div className="flex items-center justify-between pb-0.5">
              <h2 className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                Largest Files
              </h2>
              <span className="text-[11px] font-mono text-text-muted">
                {snapshot.metrics_json.largest_files.length} tracked
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-subtle text-text-muted text-[11px] uppercase tracking-wider">
                    <th className="pb-2 font-medium">File Path</th>
                    <th className="pb-2 font-medium">Language</th>
                    <th className="pb-2 font-medium text-right">Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {snapshot.metrics_json.largest_files.map((lf) => (
                    <tr key={lf.relative_path} className="hover:bg-surface-elevated/40 transition-colors">
                      <td className="py-2 font-mono text-text-primary truncate max-w-[200px]" title={lf.relative_path}>
                        <FileText className="w-3.5 h-3.5 text-text-muted shrink-0 inline mr-1.5" />
                        <span>{lf.relative_path}</span>
                      </td>
                      <td className="py-2 text-text-secondary">{lf.language}</td>
                      <td className="py-2 text-right text-text-secondary font-mono">
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
      <div className="p-4 rounded-lg bg-surface-card border border-border-default space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <FileCode className="w-4 h-4 text-accent" />
                File Explorer
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-elevated text-text-muted border border-border-default">
                {totalFiles} {totalFiles === 1 ? "file" : "files"}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Discovered file metadata and checksums in snapshot
            </p>
          </div>

          {/* Filters Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search file path..."
                aria-label="Search files by path"
                className="h-8 pl-8 pr-7 py-1 rounded-md bg-surface-base border border-border-default text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors w-44 sm:w-52"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="relative">
              <select
                value={selectedLanguage}
                onChange={(e) => {
                  setSelectedLanguage(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by language"
                className={`h-8 pl-2.5 pr-7 py-1 rounded-md bg-surface-base border text-xs text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent appearance-none cursor-pointer transition-colors ${
                  selectedLanguage
                    ? "border-accent-border bg-accent-subtle/20 font-medium text-accent"
                    : "border-border-default"
                }`}
              >
                <option value="">All Languages</option>
                {langEntries.map(([lang]) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by category"
                className={`h-8 pl-2.5 pr-7 py-1 rounded-md bg-surface-base border text-xs text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent appearance-none cursor-pointer transition-colors ${
                  selectedCategory
                    ? "border-accent-border bg-accent-subtle/20 font-medium text-accent"
                    : "border-border-default"
                }`}
              >
                <option value="">All Categories</option>
                <option value="source">Source</option>
                <option value="configuration">Configuration</option>
                <option value="documentation">Documentation</option>
                <option value="data">Data</option>
                <option value="other">Other</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {(search || selectedLanguage || selectedCategory) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setSelectedLanguage("");
                  setSelectedCategory("");
                  setPage(1);
                }}
                className="h-8 px-2 text-text-muted hover:text-text-primary text-xs"
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Files Table */}
        {loadingFiles ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner message="Loading files..." />
          </div>
        ) : fileError ? (
          <ErrorState title="Could not load files" message={fileError} onRetry={fetchFiles} />
        ) : files.length === 0 ? (
          <div className="py-10 text-center text-xs text-text-muted space-y-2">
            <p>No files match the selected search or filters.</p>
            {(search || selectedLanguage || selectedCategory) && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setSelectedLanguage("");
                  setSelectedCategory("");
                  setPage(1);
                }}
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-subtle text-text-muted text-[11px] uppercase tracking-wider">
                  <th className="pb-2.5 font-medium">Relative Path</th>
                  <th className="pb-2.5 font-medium">Language</th>
                  <th className="pb-2.5 font-medium">Category</th>
                  <th className="pb-2.5 font-medium text-right">Size</th>
                  <th className="pb-2.5 font-medium text-right">Lines</th>
                  <th className="pb-2.5 font-medium text-right">SHA-256</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-surface-elevated/40 transition-colors">
                    <td className="py-2.5 font-mono text-text-primary flex items-center gap-2">
                      {file.is_source_file ? (
                        <FileCode className="w-3.5 h-3.5 text-accent shrink-0" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      )}
                      <span className="truncate max-w-[320px]" title={file.relative_path}>
                        {file.relative_path}
                      </span>
                    </td>
                    <td className="py-2.5 text-text-secondary">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: LANGUAGE_COLORS[file.language] || "#71717a" }}
                        />
                        {file.language}
                      </span>
                    </td>
                    <td className="py-2.5 capitalize text-text-muted">{file.category}</td>
                    <td className="py-2.5 text-right text-text-secondary font-mono">
                      {formatBytes(file.size_bytes)}
                    </td>
                    <td className="py-2.5 text-right text-text-secondary font-mono">
                      {file.line_count !== null && file.line_count !== undefined
                        ? file.line_count.toLocaleString()
                        : "—"}
                    </td>
                    <td className="py-2.5 text-right font-mono text-text-muted text-[11px]">
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
          <div className="flex items-center justify-between pt-3 border-t border-border-subtle text-xs text-text-muted">
            <div>
              Showing {Math.min((page - 1) * pageSize + 1, totalFiles)} to{" "}
              {Math.min(page * pageSize, totalFiles)} of {totalFiles} files
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loadingFiles}
              >
                Previous
              </Button>
              <span className="text-text-primary font-mono px-1">
                {page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loadingFiles}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
