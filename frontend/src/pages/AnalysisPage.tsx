import React, { useState, useEffect, useContext, useCallback, useRef } from "react";
import { ShieldAlert, Play, RotateCw, AlertTriangle, Layers, GitBranch, FolderGit2 } from "lucide-react";
import { Repository } from "../types/api";
import { AnalysisRun } from "../types/analysis";
import { repositoryService } from "../services/repositoryService";
import { analysisService } from "../services/analysisService";
import { StatusBadge } from "../components/common/StatusBadge";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorState } from "../components/common/ErrorState";
import { Button } from "../components/common/Button";
import { AnalysisSummaryCards } from "../components/analysis/AnalysisSummaryCards";
import { FindingsTable } from "../components/analysis/FindingsTable";
import { RepositoryContext } from "../context/RepositoryContext";

export interface AnalysisPageProps {
  initialRepoId?: string | null;
}

export const AnalysisPage: React.FC<AnalysisPageProps> = ({ initialRepoId }) => {
  const repoContext = useContext(RepositoryContext);

  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>(
    initialRepoId || repoContext?.selectedRepoId || ""
  );
  const [loadingRepos, setLoadingRepos] = useState<boolean>(true);
  const [repoError, setRepoError] = useState<string | null>(null);

  const [analyses, setAnalyses] = useState<AnalysisRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [loadingAnalyses, setLoadingAnalyses] = useState<boolean>(false);
  const [isStartingAnalysis, setIsStartingAnalysis] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Sync with initialRepoId changes
  useEffect(() => {
    if (initialRepoId) {
      setSelectedRepoId(initialRepoId);
    }
  }, [initialRepoId]);

  // Sync with external RepositoryContext changes
  const lastContextRepoId = useRef(repoContext?.selectedRepoId);
  useEffect(() => {
    if (repoContext?.selectedRepoId && repoContext.selectedRepoId !== lastContextRepoId.current) {
      lastContextRepoId.current = repoContext.selectedRepoId;
      setSelectedRepoId(repoContext.selectedRepoId);
    }
  }, [repoContext?.selectedRepoId]);

  // 1. Fetch repositories on mount or reload
  useEffect(() => {
    let isCancelled = false;
    async function loadRepos() {
      // If context already has repositories loaded, use them
      if (repoContext?.repositories && repoContext.repositories.length > 0) {
        setRepositories(repoContext.repositories);
        setLoadingRepos(false);
        if (!selectedRepoId) {
          const target = initialRepoId || repoContext.selectedRepoId || repoContext.repositories[0].id;
          setSelectedRepoId(target);
        }
        return;
      }

      setLoadingRepos(true);
      setRepoError(null);
      try {
        const res = await repositoryService.listRepositories(1, 50);
        if (isCancelled) return;
        const items = res.items || [];
        setRepositories(items);
        if (items.length > 0) {
          const target = initialRepoId && items.some((r) => r.id === initialRepoId)
            ? initialRepoId
            : items[0].id;
          setSelectedRepoId((curr) => curr || target);
        }
      } catch (err: unknown) {
        if (isCancelled) return;
        setRepoError(err instanceof Error ? err.message : "Failed to load repositories.");
      } finally {
        if (!isCancelled) setLoadingRepos(false);
      }
    }

    loadRepos();
    return () => {
      isCancelled = true;
    };
  }, [refreshKey, initialRepoId, repoContext?.repositories, repoContext?.selectedRepoId, selectedRepoId]);

  // 2. Fetch analyses when selected repository changes
  useEffect(() => {
    if (!selectedRepoId) {
      setAnalyses([]);
      setSelectedRunId(null);
      return;
    }

    let isCancelled = false;
    async function loadAnalyses() {
      setLoadingAnalyses(true);
      setAnalysisError(null);
      try {
        const res = await analysisService.listRepositoryAnalyses(selectedRepoId, 1, 20);
        if (isCancelled) return;
        setAnalyses(res.items);
        setSelectedRunId(res.items.length > 0 ? res.items[0].id : null);
      } catch (err: unknown) {
        if (isCancelled) return;
        setAnalysisError(err instanceof Error ? err.message : "Failed to load analyses.");
      } finally {
        if (!isCancelled) setLoadingAnalyses(false);
      }
    }

    loadAnalyses();
    return () => {
      isCancelled = true;
    };
  }, [selectedRepoId]);

  const selectedRepo = repositories.find((r) => r.id === selectedRepoId) || null;
  const activeRun = analyses.find((r) => r.id === selectedRunId) || analyses[0] || null;

  const handleSelectRepository = (newRepoId: string) => {
    setSelectedRepoId(newRepoId);
    if (repoContext?.setSelectedRepoId) {
      repoContext.setSelectedRepoId(newRepoId);
    }
  };

  const handleStartAnalysis = useCallback(async () => {
    if (!selectedRepo) return;
    setIsStartingAnalysis(true);
    setAnalysisError(null);
    try {
      const run = await analysisService.startAnalysis(selectedRepo.id, {
        snapshot_id: selectedRepo.latest_snapshot?.id,
      });
      setAnalyses((prev) => [run, ...prev.filter((r) => r.id !== run.id)]);
      setSelectedRunId(run.id);
    } catch (err: unknown) {
      setAnalysisError(err instanceof Error ? err.message : "Failed to start static analysis.");
    } finally {
      setIsStartingAnalysis(false);
    }
  }, [selectedRepo]);

  if (loadingRepos) {
    return (
      <div className="p-12 text-center bg-surface-card border border-border-default rounded-lg">
        <LoadingSpinner message="Loading analysis dashboard..." />
      </div>
    );
  }

  if (repoError) {
    return (
      <ErrorState
        title="Error Loading Repositories"
        message={repoError}
        onRetry={() => setRefreshKey((k) => k + 1)}
      />
    );
  }

  if (repositories.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-border-default">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Deterministic Static Analysis</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Verified static analysis, complexity metrics, function lengths, and duplicate imports
            </p>
          </div>
        </div>

        <div className="p-12 rounded-lg bg-surface-card border border-border-default text-center space-y-3 max-w-md mx-auto shadow-xs">
          <Layers className="w-8 h-8 text-accent mx-auto" />
          <h3 className="text-sm font-semibold text-text-primary">No Repositories Connected</h3>
          <p className="text-xs text-text-muted leading-relaxed">
            Please register and ingest a software repository first to run deterministic static analysis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Console */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-default">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-accent" />
              Static Analysis & Security Intelligence
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
          <p className="text-xs text-text-muted mt-0.5">
            AST parsing, McCabe complexity, and Application Security Intelligence (PYSEC / JSSEC deterministic rules)
          </p>
        </div>

        {/* Repository selector & Run Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={selectedRepoId}
            onChange={(e) => handleSelectRepository(e.target.value)}
            className="px-3 py-1.5 rounded-md bg-surface-base border border-border-default text-xs text-text-primary font-medium focus:outline-none focus:border-accent transition-colors shadow-xs"
            aria-label="Select Repository"
          >
            {repositories.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.source_type})
              </option>
            ))}
          </select>

          {/* Historical Run Selector if multiple runs exist */}
          {analyses.length > 1 && (
            <select
              value={selectedRunId || ""}
              onChange={(e) => setSelectedRunId(e.target.value)}
              className="px-2.5 py-1.5 rounded-md bg-surface-base border border-border-default text-xs font-mono text-text-primary focus:outline-none focus:border-accent transition-colors shadow-xs"
              aria-label="Select Analysis Run"
            >
              {analyses.map((run, idx) => (
                <option key={run.id} value={run.id}>
                  Run #{analyses.length - idx} ({new Date(run.started_at).toLocaleTimeString()}) - {run.findings_count} findings
                </option>
              ))}
            </select>
          )}

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleStartAnalysis}
            disabled={
              isStartingAnalysis ||
              !selectedRepo?.latest_snapshot ||
              selectedRepo.latest_snapshot.status !== "completed"
            }
            leftIcon={
              isStartingAnalysis ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )
            }
          >
            {isStartingAnalysis ? "Analyzing..." : activeRun ? "Run Analysis" : "Run Analysis"}
          </Button>
        </div>
      </div>

      {/* Selected Repository Context Strip */}
      {selectedRepo && (
        <div className="p-3 rounded-lg bg-surface-card border border-border-default flex items-center justify-between text-xs text-text-muted flex-wrap gap-2 shadow-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-text-primary font-medium">
              <FolderGit2 className="w-3.5 h-3.5 text-accent" />
              {selectedRepo.name}
            </span>
            <span className="text-border-default">|</span>
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <GitBranch className="w-3 h-3 text-text-disabled" />
              {selectedRepo.default_branch || "main"}
            </span>
            <span className="text-border-default">|</span>
            <span className="capitalize text-[11px]">
              Source: <strong className="text-text-secondary">{selectedRepo.source_type}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            {selectedRepo.latest_snapshot && (
              <span>
                Snapshot Files: <strong className="text-text-primary font-mono">{selectedRepo.latest_snapshot.file_count}</strong> ({selectedRepo.latest_snapshot.total_lines_of_code?.toLocaleString() ?? 0} LOC)
              </span>
            )}
            {activeRun?.completed_at && (
              <span className="hidden sm:inline">
                Last Analysis: <strong className="text-text-secondary">{new Date(activeRun.completed_at).toLocaleString()}</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Analysis Error Notification */}
      {analysisError && (
        <div className="p-3 rounded-md bg-danger-bg border border-danger-border text-xs text-danger-text">
          {analysisError}
        </div>
      )}

      {/* Main Content Area */}
      {isStartingAnalysis || loadingAnalyses ? (
        <div className="p-12 rounded-lg bg-surface-card border border-border-default flex justify-center shadow-xs">
          <LoadingSpinner message="Analyzing codebase through deterministic static rules..." />
        </div>
      ) : activeRun && activeRun.status === "completed" ? (
        <div className="space-y-6">
          <AnalysisSummaryCards run={activeRun} />
          <FindingsTable analysisId={activeRun.id} />
        </div>
      ) : activeRun && activeRun.status === "failed" ? (
        <div className="p-8 rounded-lg bg-surface-card border border-danger-border/60 text-center space-y-3 shadow-xs">
          <AlertTriangle className="w-8 h-8 text-danger mx-auto" />
          <h3 className="text-sm font-semibold text-text-primary">Analysis Run Failed</h3>
          <p className="text-xs text-text-muted max-w-md mx-auto">
            {activeRun.failure_reason || "Static analysis failed to complete."}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleStartAnalysis}
          >
            Retry Analysis
          </Button>
        </div>
      ) : (
        <div className="p-12 rounded-lg bg-surface-card border border-border-default text-center space-y-3 max-w-lg mx-auto shadow-xs">
          <div className="w-12 h-12 rounded-full bg-accent-subtle border border-accent-border flex items-center justify-center mx-auto text-accent">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-text-primary">No Static Analysis Executed</h3>
          <p className="text-xs text-text-muted leading-relaxed">
            Select a repository above and click <strong>Run Analysis</strong> to parse ASTs and execute
            deterministic rules with exact source evidence and line coordinates.
          </p>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleStartAnalysis}
            disabled={!selectedRepo?.latest_snapshot || selectedRepo.latest_snapshot.status !== "completed"}
            leftIcon={<Play className="w-3.5 h-3.5" />}
          >
            Run Static Analysis
          </Button>
        </div>
      )}
    </div>
  );
};

