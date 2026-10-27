import React, { useState, useEffect, useCallback, useContext, useMemo } from "react";
import {
  Plus,
  GitFork,
  Folder,
  ChevronRight,
  FileCode,
  Clock,
  Search,
  Code2,
  X,
} from "lucide-react";
import { GithubIcon } from "../components/common/GithubIcon";
import { EmptyState } from "../components/common/EmptyState";
import { StatusBadge } from "../components/common/StatusBadge";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorState } from "../components/common/ErrorState";
import { BackendUnavailableState } from "../components/common/BackendUnavailableState";
import { Button } from "../components/common/Button";
import { Badge } from "../components/common/Badge";
import { RepositoryDetailView } from "../components/repository/RepositoryDetailView";
import { RepositoryContext } from "../context/RepositoryContext";
import { repositoryService } from "../services/repositoryService";
import { Repository } from "../types/api";

export interface RepositoriesPageProps {
  onAnalyzeClick: () => void;
  selectedRepoId?: string | null;
  onClearSelectedRepo?: () => void;
}

export const RepositoriesPage: React.FC<RepositoriesPageProps> = ({
  onAnalyzeClick,
  selectedRepoId,
  onClearSelectedRepo,
}) => {
  const repoContext = useContext(RepositoryContext);

  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isBackendUnavailable, setIsBackendUnavailable] = useState<boolean>(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const effectiveSelectedRepoId = selectedRepoId ?? repoContext?.selectedRepoId ?? null;

  const fetchRepositories = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsBackendUnavailable(false);

    try {
      const response = await repositoryService.listRepositories(1, 50);
      const items = Array.isArray(response?.items) ? response.items : [];
      setRepositories(items);

      if (effectiveSelectedRepoId) {
        const found = items.find((r) => r.id === effectiveSelectedRepoId);
        if (found) setSelectedRepo(found);
      }
    } catch (err: unknown) {
      if (err instanceof Error && "code" in err && (err as { code: string }).code === "NETWORK_ERROR") {
        setIsBackendUnavailable(true);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load repositories.");
      }
    } finally {
      setLoading(false);
    }
  }, [effectiveSelectedRepoId]);

  useEffect(() => {
    let isCancelled = false;

    async function loadInitial() {
      try {
        const response = await repositoryService.listRepositories(1, 50);
        if (isCancelled) return;
        const items = Array.isArray(response?.items) ? response.items : [];
        setRepositories(items);

        if (effectiveSelectedRepoId) {
          const found = items.find((r) => r.id === effectiveSelectedRepoId);
          if (found) setSelectedRepo(found);
        }
      } catch (err: unknown) {
        if (isCancelled) return;
        if (err instanceof Error && "code" in err && (err as { code: string }).code === "NETWORK_ERROR") {
          setIsBackendUnavailable(true);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load repositories.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadInitial();

    return () => {
      isCancelled = true;
    };
  }, [effectiveSelectedRepoId]);

  // Synchronize when selectedRepoId prop or context changes
  useEffect(() => {
    if (selectedRepoId) {
      const found = repositories.find((r) => r.id === selectedRepoId);
      if (found) {
        setSelectedRepo(found);
      }
    } else if (selectedRepoId === null) {
      setSelectedRepo((prev) => (prev !== null ? null : prev));
    }
  }, [selectedRepoId, repositories]);

  const handleSelectRepository = (repo: Repository) => {
    setSelectedRepo(repo);
    if (repoContext?.setSelectedRepoId) {
      repoContext.setSelectedRepoId(repo.id);
    }
  };

  const handleRepositoryUpdated = (updated: Repository) => {
    setSelectedRepo(updated);
    setRepositories((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    if (repoContext?.refetchRepositories) {
      repoContext.refetchRepositories();
    }
  };

  const handleRepositoryDeleted = (deletedId: string) => {
    setSelectedRepo(null);
    if (onClearSelectedRepo) onClearSelectedRepo();
    if (repoContext?.setSelectedRepoId) {
      repoContext.setSelectedRepoId(null);
    }
    setRepositories((prev) => prev.filter((r) => r.id !== deletedId));
    if (repoContext?.refetchRepositories) {
      repoContext.refetchRepositories();
    }
  };

  const handleBack = () => {
    setSelectedRepo(null);
    if (onClearSelectedRepo) onClearSelectedRepo();
    if (repoContext?.setSelectedRepoId) {
      repoContext.setSelectedRepoId(null);
    }
  };

  // Filtered repositories computation
  const filteredRepositories = useMemo(() => {
    return repositories.filter((repo) => {
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = repo.name.toLowerCase().includes(query);
        const matchesBranch = (repo.default_branch || "").toLowerCase().includes(query);
        const matchesIdentifier = (repo.source_identifier || "").toLowerCase().includes(query);
        if (!matchesName && !matchesBranch && !matchesIdentifier) {
          return false;
        }
      }

      // Source type filter
      if (sourceFilter !== "all" && repo.source_type !== sourceFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && repo.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [repositories, searchQuery, sourceFilter, statusFilter]);

  const isFiltered = searchQuery.trim() !== "" || sourceFilter !== "all" || statusFilter !== "all";

  const resetFilters = () => {
    setSearchQuery("");
    setSourceFilter("all");
    setStatusFilter("all");
  };

  if (isBackendUnavailable) {
    return <BackendUnavailableState onRetry={fetchRepositories} />;
  }

  if (error) {
    return (
      <ErrorState
        title="Error Loading Repositories"
        message={error}
        onRetry={fetchRepositories}
      />
    );
  }

  if (loading && repositories.length === 0) {
    return (
      <div className="py-24 flex justify-center">
        <LoadingSpinner message="Loading repositories..." />
      </div>
    );
  }

  // If a repository is selected, render the detail console
  if (selectedRepo) {
    return (
      <RepositoryDetailView
        repository={selectedRepo}
        onBack={handleBack}
        onRepositoryUpdated={handleRepositoryUpdated}
        onRepositoryDeleted={handleRepositoryDeleted}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-default">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-text-primary tracking-tight">
              Repositories
            </h1>
            <Badge variant="neutral" className="font-mono text-[11px]">
              {repositories.length} {repositories.length === 1 ? "repository" : "repositories"}
            </Badge>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Manage tracked codebases, ingestion snapshots, and structural discovery metrics
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onAnalyzeClick}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          className="self-start sm:self-auto"
        >
          <span>Connect Repository</span>
        </Button>
      </div>

      {/* Repositories Content */}
      {repositories.length === 0 ? (
        <EmptyState
          icon={<GitFork className="w-6 h-6 text-text-muted" />}
          title="No repositories connected yet."
          description="Connect a public GitHub repository or approved local directory to ingest files, detect languages, and generate deterministic snapshots."
          actionLabel="Connect First Repository"
          onAction={onAnalyzeClick}
        />
      ) : (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-surface-card border border-border-default">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search repositories by name, branch, or identifier..."
                className="w-full pl-9 pr-8 py-1.5 rounded-md bg-surface-base border border-border-default text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-text-muted hover:text-text-primary"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-md bg-surface-base border border-border-default text-xs text-text-primary focus:outline-none focus:border-accent cursor-pointer"
              >
                <option value="all">All Sources</option>
                <option value="github">GitHub</option>
                <option value="local">Local Directory</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-md bg-surface-base border border-border-default text-xs text-text-primary focus:outline-none focus:border-accent cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>

              {isFiltered && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="text-xs text-text-muted hover:text-text-primary"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          </div>

          {/* Filter Empty State */}
          {filteredRepositories.length === 0 ? (
            <div className="p-12 rounded-lg bg-surface-card border border-border-default text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-surface-elevated border border-border-default flex items-center justify-center mx-auto text-text-muted">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-text-primary">No Matching Repositories</h3>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                No repositories match your active search and filter criteria.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={resetFilters}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            /* Repository Cards Grid/List */
            <div className="space-y-3">
              {filteredRepositories.map((repo) => {
                const snap = repo.latest_snapshot;
                const topLangs = snap?.language_distribution
                  ? Object.entries(snap.language_distribution)
                      .sort((a, b) => b[1].file_count - a[1].file_count)
                      .slice(0, 3)
                  : [];

                return (
                  <div
                    key={repo.id}
                    onClick={() => handleSelectRepository(repo)}
                    className="p-4 rounded-lg bg-surface-card border border-border-default hover:border-border-strong hover:bg-surface-card-hover transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {repo.source_type === "github" ? (
                          <GithubIcon className="w-4 h-4 text-text-secondary" />
                        ) : (
                          <Folder className="w-4 h-4 text-amber-400" />
                        )}

                        <span className="font-semibold text-sm text-text-primary group-hover:text-accent transition-colors">
                          {repo.name}
                        </span>

                        <span className="text-[11px] font-mono text-text-secondary bg-surface-base px-2 py-0.5 rounded border border-border-default">
                          {repo.default_branch || "main"}
                        </span>

                        <StatusBadge
                          label={repo.status}
                          variant={
                            repo.status === "completed"
                              ? "success"
                              : repo.status === "failed"
                              ? "danger"
                              : "warning"
                          }
                        />
                      </div>

                      <div className="flex items-center gap-x-5 gap-y-1 text-xs text-text-muted flex-wrap">
                        {snap && (
                          <span className="flex items-center gap-1.5">
                            <FileCode className="w-3.5 h-3.5 text-text-muted" />
                            <span>
                              {snap.file_count.toLocaleString()} files ({snap.source_file_count} source)
                            </span>
                          </span>
                        )}
                        {snap && snap.total_lines_of_code > 0 && (
                          <span className="flex items-center gap-1.5">
                            <Code2 className="w-3.5 h-3.5 text-text-muted" />
                            <span>{snap.total_lines_of_code.toLocaleString()} LOC</span>
                          </span>
                        )}
                        {repo.last_ingested_at && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-text-muted" />
                            <span>{new Date(repo.last_ingested_at).toLocaleDateString()}</span>
                          </span>
                        )}
                      </div>

                      {/* Top languages pills */}
                      {topLangs.length > 0 && (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          {topLangs.map(([lang, stat]) => (
                            <span
                              key={lang}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-surface-base text-text-secondary border border-border-default"
                            >
                              {lang} <span className="text-text-muted">({stat.percentage}%)</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-medium text-text-muted group-hover:text-text-primary self-end sm:self-center transition-colors">
                      <span>View Details</span>
                      <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
