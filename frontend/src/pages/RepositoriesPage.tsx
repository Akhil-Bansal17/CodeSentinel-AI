import React, { useState, useEffect, useCallback } from "react";
import { Plus, GitFork, Folder, ChevronRight, FileCode, Clock } from "lucide-react";
import { GithubIcon } from "../components/common/GithubIcon";

import { EmptyState } from "../components/common/EmptyState";
import { StatusBadge } from "../components/common/StatusBadge";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorState } from "../components/common/ErrorState";
import { BackendUnavailableState } from "../components/common/BackendUnavailableState";
import { RepositoryDetailView } from "../components/repository/RepositoryDetailView";
import { repositoryService } from "../services/repositoryService";
import { Repository } from "../types/api";

interface RepositoriesPageProps {
  onAnalyzeClick: () => void;
  selectedRepoId?: string | null;
  onClearSelectedRepo?: () => void;
}

export const RepositoriesPage: React.FC<RepositoriesPageProps> = ({
  onAnalyzeClick,
  selectedRepoId,
  onClearSelectedRepo,
}) => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isBackendUnavailable, setIsBackendUnavailable] = useState<boolean>(false);

  const fetchRepositories = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsBackendUnavailable(false);

    try {
      const response = await repositoryService.listRepositories(1, 50);
      const items = Array.isArray(response?.items) ? response.items : [];
      setRepositories(items);

      // If selectedRepoId is passed, select it
      if (selectedRepoId) {
        const found = items.find((r) => r.id === selectedRepoId);
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
  }, [selectedRepoId]);

  useEffect(() => {
    fetchRepositories();
  }, [fetchRepositories]);

  const handleRepositoryUpdated = (updated: Repository) => {
    setSelectedRepo(updated);
    setRepositories((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleRepositoryDeleted = (deletedId: string) => {
    setSelectedRepo(null);
    if (onClearSelectedRepo) onClearSelectedRepo();
    setRepositories((prev) => prev.filter((r) => r.id !== deletedId));
  };

  const handleBack = () => {
    setSelectedRepo(null);
    if (onClearSelectedRepo) onClearSelectedRepo();
  };

  if (isBackendUnavailable) {
    return <BackendUnavailableState onRetry={fetchRepositories} />;
  }


  if (error) {
    return <ErrorState title="Error Loading Repositories" message={error} onRetry={fetchRepositories} />;
  }

  if (loading && repositories.length === 0) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingSpinner message="Loading repositories..." />
      </div>
    );
  }

  // If a repository is selected, show detail view
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#21262d]">
        <div>
          <h1 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            Repositories
            <StatusBadge label="Phase 1 Active" variant="success" />
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage tracked codebases, snapshots, and file discovery metrics
          </p>
        </div>

        <button
          type="button"
          onClick={onAnalyzeClick}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-medium transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Connect Repository</span>
        </button>
      </div>

      {/* Repositories List or Empty State */}
      {repositories.length === 0 ? (
        <EmptyState
          icon={<GitFork className="w-6 h-6 text-slate-400" />}
          title="No repositories connected yet."
          description="Connect a public GitHub repository or approved local directory to ingest files, detect languages, and generate deterministic snapshots."
          actionLabel="Connect First Repository"
          onAction={onAnalyzeClick}
        />
      ) : (
        <div className="space-y-3">
          {repositories.map((repo) => {
            const snap = repo.latest_snapshot;
            const topLangs = snap?.language_distribution
              ? Object.entries(snap.language_distribution)
                  .sort((a, b) => b[1].file_count - a[1].file_count)
                  .slice(0, 3)
              : [];

            return (
              <div
                key={repo.id}
                onClick={() => setSelectedRepo(repo)}
                className="p-4 rounded-lg bg-[#161b22] border border-[#30363d] hover:border-slate-500/50 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {repo.source_type === "github" ? (
                      <GithubIcon className="w-4 h-4 text-slate-300" />
                    ) : (
                      <Folder className="w-4 h-4 text-amber-400" />
                    )}

                    <span className="font-semibold text-sm text-slate-100 group-hover:text-sky-400 transition-colors">
                      {repo.name}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 bg-[#0d1117] px-2 py-0.5 rounded border border-[#21262d]">
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

                  <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                    {snap && (
                      <span className="flex items-center gap-1">
                        <FileCode className="w-3.5 h-3.5 text-slate-500" />
                        {snap.file_count.toLocaleString()} files ({snap.source_file_count} source)
                      </span>
                    )}
                    {repo.last_ingested_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(repo.last_ingested_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Top languages pills */}
                  {topLangs.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-1">
                      {topLangs.map(([lang, stat]) => (
                        <span
                          key={lang}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#0d1117] text-slate-300 border border-[#21262d]"
                        >
                          {lang} <span className="text-slate-400">({stat.percentage}%)</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-slate-400 group-hover:text-slate-200 self-end sm:self-center">
                  <span>View Details</span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
