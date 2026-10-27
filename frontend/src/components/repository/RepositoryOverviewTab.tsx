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
} from "lucide-react";
import { Repository, RepositoryFile, RepositoryFileListResponse, RepositorySnapshot } from "../../types/api";
import { repositoryService } from "../../services/repositoryService";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { ErrorState } from "../common/ErrorState";
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
      <div className="p-8 rounded-lg bg-surface-card border border-border-default text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <h2 className="text-sm font-semibold text-text-primary">No Snapshot Available</h2>
        <p className="text-xs text-text-muted max-w-md mx-auto">
          This repository has not completed an ingestion run yet. Start or re-trigger an ingestion to analyze files and structure.
        </p>
      </div>
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
        <div className="p-4 rounded-lg bg-surface-card border border-border-default shadow-xs hover:border-border-strong transition-colors">
          <div className="flex items-center gap-2 text-text-muted text-xs font-medium mb-1.5">
            <FileCode className="w-4 h-4 text-accent" />
            <span>Total Files</span>
          </div>
          <div className="text-xl font-bold text-text-primary tracking-tight font-mono">
            {snapshot.file_count.toLocaleString()}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">
            {snapshot.source_file_count.toLocaleString()} source files
          </div>
        </div>

        <div className="p-4 rounded-lg bg-surface-card border border-border-default shadow-xs hover:border-border-strong transition-colors">
          <div className="flex items-center gap-2 text-text-muted text-xs font-medium mb-1.5">
            <Code2 className="w-4 h-4 text-emerald-400" />
            <span>Lines of Code</span>
          </div>
          <div className="text-xl font-bold text-text-primary tracking-tight font-mono">
            {snapshot.total_lines_of_code.toLocaleString()}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">Calculated LOC</div>
        </div>

        <div className="p-4 rounded-lg bg-surface-card border border-border-default shadow-xs hover:border-border-strong transition-colors">
          <div className="flex items-center gap-2 text-text-muted text-xs font-medium mb-1.5">
            <HardDrive className="w-4 h-4 text-amber-400" />
            <span>Processed Size</span>
          </div>
          <div className="text-xl font-bold text-text-primary tracking-tight font-mono">
            {formatBytes(snapshot.total_size_bytes)}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">Uncompressed disk</div>
        </div>

        <div className="p-4 rounded-lg bg-surface-card border border-border-default shadow-xs hover:border-border-strong transition-colors">
          <div className="flex items-center gap-2 text-text-muted text-xs font-medium mb-1.5">
            <FolderTree className="w-4 h-4 text-violet-400" />
            <span>Directories</span>
          </div>
          <div className="text-xl font-bold text-text-primary tracking-tight font-mono">
            {snapshot.directory_count.toLocaleString()}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">Discovered folders</div>
        </div>

        <div className="p-4 rounded-lg bg-surface-card border border-border-default shadow-xs hover:border-border-strong transition-colors col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 text-text-muted text-xs font-medium mb-1.5">
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
            <span>Snapshot Status</span>
          </div>
          <div className="text-xl font-bold text-text-primary tracking-tight capitalize">
            {snapshot.status}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">Deterministic metrics</div>
        </div>
      </div>

      {/* Language Breakdown Section */}
      {langEntries.length > 0 && (
        <div className="p-4 rounded-lg bg-surface-card border border-border-default space-y-3">
          <h2 className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-accent" />
            Language Distribution
          </h2>

          {/* Proportional visual bar */}
          <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-surface-base border border-border-subtle">
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
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-base border border-border-default text-xs"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
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
          <div className="p-4 rounded-lg bg-surface-card border border-border-default space-y-3">
            <h2 className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <FolderTree className="w-3.5 h-3.5 text-violet-400" />
              Top-Level Directories
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-subtle text-text-muted">
                    <th className="pb-2 font-medium">Directory</th>
                    <th className="pb-2 font-medium text-right">Files</th>
                    <th className="pb-2 font-medium text-right">Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {snapshot.metrics_json.top_level_directories.map((dir) => (
                    <tr key={dir.name} className="hover:bg-surface-hover/60 transition-colors">
                      <td className="py-2 font-mono text-text-primary">{dir.name}</td>
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
          <div className="p-4 rounded-lg bg-surface-card border border-border-default space-y-3">
            <h2 className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              Largest Files
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-subtle text-text-muted">
                    <th className="pb-2 font-medium">File Path</th>
                    <th className="pb-2 font-medium">Language</th>
                    <th className="pb-2 font-medium text-right">Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {snapshot.metrics_json.largest_files.map((lf) => (
                    <tr key={lf.relative_path} className="hover:bg-surface-hover/60 transition-colors">
                      <td className="py-2 font-mono text-text-primary truncate max-w-[200px]" title={lf.relative_path}>
                        {lf.relative_path}
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
      <div className="p-4 rounded-lg bg-surface-card border border-border-default space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <FileCode className="w-4 h-4 text-accent" />
              File Explorer
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Discovered file metadata in this snapshot ({totalFiles} files matching filter)
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search file path..."
                className="pl-8 pr-3 py-1.5 rounded-md bg-surface-base border border-border-default text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
            </div>

            <select
              value={selectedLanguage}
              onChange={(e) => {
                setSelectedLanguage(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-md bg-surface-base border border-border-default text-xs text-text-primary focus:outline-none focus:border-accent"
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
              className="px-2.5 py-1.5 rounded-md bg-surface-base border border-border-default text-xs text-text-primary focus:outline-none focus:border-accent"
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
          <div className="py-12 flex justify-center">
            <LoadingSpinner message="Loading files..." />
          </div>
        ) : fileError ? (
          <ErrorState title="Could not load files" message={fileError} onRetry={fetchFiles} />
        ) : files.length === 0 ? (
          <div className="py-8 text-center text-xs text-text-muted">
            No files match the selected search or filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-subtle text-text-muted">
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
                  <tr key={file.id} className="hover:bg-surface-hover/60 transition-colors">
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
