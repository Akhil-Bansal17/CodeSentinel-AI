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
  ShieldAlert,
  Play,
  Package,
  Network,
  Activity,
} from "lucide-react";
import { GithubIcon } from "../common/GithubIcon";

import { Repository, RepositoryFile, RepositoryFileListResponse } from "../../types/api";
import { AnalysisRun } from "../../types/analysis";
import { repositoryService } from "../../services/repositoryService";
import { analysisService } from "../../services/analysisService";
import { StatusBadge } from "../common/StatusBadge";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { ErrorState } from "../common/ErrorState";
import { AnalysisSummaryCards } from "../analysis/AnalysisSummaryCards";
import { FindingsTable } from "../analysis/FindingsTable";
import { DependencyView } from "../dependency/DependencyView";
import { ArchitectureView } from "../architecture/ArchitectureView";
import { CodebaseHealthDashboard } from "../architecture/CodebaseHealthDashboard";

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

  // Tab state
  const [activeTab, setActiveTab] = useState<"overview" | "analysis" | "dependencies" | "architecture" | "health">("overview");

  // Analysis state
  const [analyses, setAnalyses] = useState<AnalysisRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [isStartingAnalysis, setIsStartingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadAnalyses() {
      try {
        const res = await analysisService.listRepositoryAnalyses(repository.id, 1, 20);
        if (isCancelled) return;
        setAnalyses(res.items);
        if (res.items.length > 0) {
          setSelectedRunId((curr) => curr || res.items[0].id);
        }
      } catch (err: unknown) {
        if (isCancelled) return;
        setAnalysisError(err instanceof Error ? err.message : "Failed to load static analyses.");
      }
    }

    loadAnalyses();

    return () => {
      isCancelled = true;
    };
  }, [repository.id]);

  const handleStartAnalysis = async () => {
    if (!snapshot) return;
    setIsStartingAnalysis(true);
    setAnalysisError(null);
    try {
      const run = await analysisService.startAnalysis(repository.id, {
        snapshot_id: snapshot.id,
      });
      setAnalyses((prev) => [run, ...prev.filter((r) => r.id !== run.id)]);
      setSelectedRunId(run.id);
      setActiveTab("analysis");
    } catch (err: unknown) {
      setAnalysisError(err instanceof Error ? err.message : "Failed to start static analysis.");
    } finally {
      setIsStartingAnalysis(false);
    }
  };

  const activeRun = analyses.find((r) => r.id === selectedRunId) || analyses[0] || null;

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
    if (!snapshot) return;
    let isCancelled = false;

    async function loadFiles() {
      try {
        const res: RepositoryFileListResponse = await repositoryService.listSnapshotFiles(repository.id, {
          page,
          pageSize,
          snapshotId: snapshot?.id,
          search: search.trim() || undefined,
          language: selectedLanguage || undefined,
          category: selectedCategory || undefined,
        });
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

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#21262d] -mb-4 pt-1">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "overview"
                ? "border-sky-500 text-sky-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Files & Structure</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("analysis")}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "analysis"
                ? "border-sky-500 text-sky-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Static Analysis</span>
            {activeRun && activeRun.findings_count > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-950 border border-amber-800 text-amber-300">
                {activeRun.findings_count}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("dependencies")}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "dependencies"
                ? "border-sky-500 text-sky-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Dependencies & SCA</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("architecture")}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "architecture"
                ? "border-sky-500 text-sky-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Architecture & Coupling</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("health")}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "health"
                ? "border-sky-500 text-sky-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Codebase Health</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Files & Structure */}
      {activeTab === "overview" && (
        <>
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
    </>
  )}

  {/* Tab 2: Static Analysis */}
  {activeTab === "analysis" && (
    <div className="space-y-6">
      {/* Analysis Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-[#161b22] border border-[#30363d]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-sky-400" />
              Deterministic Static Analysis
            </h2>
            {activeRun && (
              <StatusBadge
                label={activeRun.status}
                variant={
                  activeRun.status === "completed"
                    ? "success"
                    : activeRun.status === "failed"
                    ? "danger"
                    : "warning"
                }
              />
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            AST parsing, cyclomatic complexity, function lengths, and duplicate imports
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {analyses.length > 1 && (
            <select
              value={selectedRunId || ""}
              onChange={(e) => setSelectedRunId(e.target.value)}
              className="px-2.5 py-1.5 rounded-md bg-[#0d1117] border border-[#30363d] text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              {analyses.map((run, idx) => (
                <option key={run.id} value={run.id}>
                  Run #{analyses.length - idx} ({new Date(run.started_at).toLocaleTimeString()}) - {run.findings_count} findings
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleStartAnalysis}
            disabled={isStartingAnalysis || !snapshot || snapshot.status !== "completed"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {isStartingAnalysis ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>{activeRun ? "Re-run Analysis" : "Run Static Analysis"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {analysisError && (
        <div className="p-3 rounded-md bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
          {analysisError}
        </div>
      )}

      {isStartingAnalysis ? (
        <div className="p-12 rounded-lg bg-[#161b22] border border-[#30363d]">
          <LoadingSpinner message="Executing deterministic static analysis pipeline..." />
        </div>
      ) : activeRun && activeRun.status === "completed" ? (
        <>
          <AnalysisSummaryCards run={activeRun} />
          <FindingsTable analysisId={activeRun.id} />
        </>
      ) : activeRun && activeRun.status === "failed" ? (
        <div className="p-8 rounded-lg bg-[#161b22] border border-rose-800/50 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-200">Analysis Run Failed</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {activeRun.failure_reason || "Static analysis failed to complete."}
          </p>
          <button
            type="button"
            onClick={handleStartAnalysis}
            className="px-3 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-xs font-medium text-slate-200 border border-[#30363d] cursor-pointer"
          >
            Retry Analysis
          </button>
        </div>
      ) : (
        <div className="p-12 rounded-lg bg-[#161b22] border border-[#30363d] text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#0d1117] border border-[#30363d] flex items-center justify-center mx-auto text-sky-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">No Static Analysis Executed</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Run deterministic static analysis on this snapshot to detect syntax errors,
            excessive complexity, oversized functions, and redundant imports with exact source evidence.
          </p>
          <button
            type="button"
            onClick={handleStartAnalysis}
            disabled={!snapshot || snapshot.status !== "completed"}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run Static Analysis</span>
          </button>
        </div>
      )}
    </div>
  )}

      {/* Tab 3: Dependencies & SCA */}
      {activeTab === "dependencies" && (
        <DependencyView repository={repository} />
      )}

      {/* Tab 4: Architecture & Coupling */}
      {activeTab === "architecture" && (
        <ArchitectureView repository={repository} />
      )}

      {/* Tab 5: Codebase Health */}
      {activeTab === "health" && (
        <CodebaseHealthDashboard repository={repository} />
      )}
    </div>
  );
};
