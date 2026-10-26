import React, { useState, useEffect } from "react";
import { ShieldAlert, Play, RotateCw, AlertTriangle, Layers } from "lucide-react";
import { Repository } from "../types/api";
import { AnalysisRun } from "../types/analysis";
import { repositoryService } from "../services/repositoryService";
import { analysisService } from "../services/analysisService";
import { StatusBadge } from "../components/common/StatusBadge";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorState } from "../components/common/ErrorState";
import { AnalysisSummaryCards } from "../components/analysis/AnalysisSummaryCards";
import { FindingsTable } from "../components/analysis/FindingsTable";

export interface AnalysisPageProps {
  initialRepoId?: string | null;
}

export const AnalysisPage: React.FC<AnalysisPageProps> = ({ initialRepoId }) => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>(initialRepoId || "");
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [repoError, setRepoError] = useState<string | null>(null);

  const [analyses, setAnalyses] = useState<AnalysisRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [loadingAnalyses, setLoadingAnalyses] = useState(false);
  const [isStartingAnalysis, setIsStartingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  // Sync with initialRepoId changes
  useEffect(() => {
    if (initialRepoId) {
      setSelectedRepoId(initialRepoId);
    }
  }, [initialRepoId]);

  // 1. Fetch repositories on mount or reload
  useEffect(() => {
    let isCancelled = false;
    async function loadRepos() {
      setLoadingRepos(true);
      setRepoError(null);
      try {
        const res = await repositoryService.listRepositories(1, 50);
        if (isCancelled) return;
        setRepositories(res.items);
        if (res.items.length > 0) {
          const target = initialRepoId && res.items.some((r) => r.id === initialRepoId)
            ? initialRepoId
            : res.items[0].id;
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
  }, [refreshKey, initialRepoId]);

  // 2. Fetch analyses when selected repository changes
  useEffect(() => {
    if (!selectedRepoId) return;
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

  const selectedRepo = repositories.find((r) => r.id === selectedRepoId);
  const activeRun = analyses.find((r) => r.id === selectedRunId) || analyses[0] || null;

  const handleStartAnalysis = async () => {
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
  };

  if (loadingRepos) {
    return <LoadingSpinner message="Loading analysis dashboard..." />;
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
        <div className="flex items-center justify-between pb-4 border-b border-[#21262d]">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Deterministic Static Analysis</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified static analysis, complexity metrics, function lengths, and duplicate imports
            </p>
          </div>
        </div>

        <div className="p-12 rounded-lg bg-[#161b22] border border-[#30363d] text-center space-y-3 max-w-md mx-auto">
          <Layers className="w-8 h-8 text-sky-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-200">No Repositories Connected</h3>
          <p className="text-xs text-slate-400">
            Please register and ingest a software repository first to run deterministic static analysis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#21262d]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-sky-400" />
              Static Analysis & Security Intelligence
            </h2>
            <StatusBadge label="Phase 2 & Phase 4 Operational" variant="success" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            AST parsing, McCabe complexity, and Application Security Intelligence (PYSEC / JSSEC deterministic rules)
          </p>
        </div>

        {/* Repository selector & Run button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={selectedRepoId}
            onChange={(e) => setSelectedRepoId(e.target.value)}
            className="px-3 py-1.5 rounded-md bg-[#161b22] border border-[#30363d] text-xs text-slate-200 font-medium focus:outline-none focus:border-sky-500"
          >
            {repositories.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.source_type})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleStartAnalysis}
            disabled={isStartingAnalysis || !selectedRepo?.latest_snapshot || selectedRepo.latest_snapshot.status !== "completed"}
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
                <span>Run Analysis</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Analysis Error Notification */}
      {analysisError && (
        <div className="p-3 rounded-md bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
          {analysisError}
        </div>
      )}

      {/* Main Content Area */}
      {isStartingAnalysis || loadingAnalyses ? (
        <div className="p-12 rounded-lg bg-[#161b22] border border-[#30363d]">
          <LoadingSpinner message="Analyzing codebase through deterministic static rules..." />
        </div>
      ) : activeRun && activeRun.status === "completed" ? (
        <div className="space-y-6">
          <AnalysisSummaryCards run={activeRun} />
          <FindingsTable analysisId={activeRun.id} />
        </div>
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
        <div className="p-12 rounded-lg bg-[#161b22] border border-[#30363d] text-center space-y-3 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-[#0d1117] border border-[#30363d] flex items-center justify-center mx-auto text-sky-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">No Static Analysis Executed</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Select a repository above and click <strong>Run Analysis</strong> to parse ASTs and execute
            deterministic rules with exact source evidence and line coordinates.
          </p>
          <button
            type="button"
            onClick={handleStartAnalysis}
            disabled={!selectedRepo?.latest_snapshot || selectedRepo.latest_snapshot.status !== "completed"}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run Static Analysis</span>
          </button>
        </div>
      )}
    </div>
  );
};
