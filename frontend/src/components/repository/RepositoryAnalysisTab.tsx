import React, { useState, useEffect } from "react";
import { ShieldAlert, Play, RotateCw, AlertTriangle } from "lucide-react";
import { Repository, RepositorySnapshot } from "../../types/api";
import { AnalysisRun } from "../../types/analysis";
import { analysisService } from "../../services/analysisService";
import { StatusBadge } from "../common/StatusBadge";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { Button } from "../common/Button";
import { AnalysisSummaryCards } from "../analysis/AnalysisSummaryCards";
import { FindingsTable } from "../analysis/FindingsTable";

interface RepositoryAnalysisTabProps {
  repository: Repository;
  snapshot?: RepositorySnapshot | null;
}

export const RepositoryAnalysisTab: React.FC<RepositoryAnalysisTabProps> = ({
  repository,
  snapshot,
}) => {
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
    } catch (err: unknown) {
      setAnalysisError(err instanceof Error ? err.message : "Failed to start static analysis.");
    } finally {
      setIsStartingAnalysis(false);
    }
  };

  const activeRun = analyses.find((r) => r.id === selectedRunId) || analyses[0] || null;

  return (
    <div className="space-y-6">
      {/* Analysis Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-surface-card border border-border-default shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-accent" />
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
          <p className="text-xs text-text-muted mt-0.5">
            AST parsing, cyclomatic complexity, function lengths, and duplicate imports
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {analyses.length > 1 && (
            <select
              value={selectedRunId || ""}
              onChange={(e) => setSelectedRunId(e.target.value)}
              className="px-2.5 py-1.5 rounded-md bg-surface-base border border-border-default text-xs font-mono text-text-primary focus:outline-none focus:border-accent"
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
            disabled={isStartingAnalysis || !snapshot || snapshot.status !== "completed"}
            leftIcon={
              isStartingAnalysis ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )
            }
          >
            {isStartingAnalysis ? "Analyzing..." : activeRun ? "Re-run Analysis" : "Run Static Analysis"}
          </Button>
        </div>
      </div>

      {analysisError && (
        <div className="p-3 rounded-md bg-danger-bg border border-danger-border text-xs text-danger-text">
          {analysisError}
        </div>
      )}

      {isStartingAnalysis ? (
        <div className="p-12 rounded-lg bg-surface-card border border-border-default flex justify-center">
          <LoadingSpinner message="Executing deterministic static analysis pipeline..." />
        </div>
      ) : activeRun && activeRun.status === "completed" ? (
        <>
          <AnalysisSummaryCards run={activeRun} />
          <FindingsTable analysisId={activeRun.id} />
        </>
      ) : activeRun && activeRun.status === "failed" ? (
        <div className="p-8 rounded-lg bg-surface-card border border-danger-border/60 text-center space-y-3">
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
        <div className="p-12 rounded-lg bg-surface-card border border-border-default text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-accent-subtle border border-accent-border flex items-center justify-center mx-auto text-accent">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-text-primary">No Static Analysis Executed</h3>
          <p className="text-xs text-text-muted max-w-md mx-auto">
            Run deterministic static analysis on this snapshot to detect syntax errors,
            excessive complexity, oversized functions, and redundant imports with exact source evidence.
          </p>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleStartAnalysis}
            disabled={!snapshot || snapshot.status !== "completed"}
            leftIcon={<Play className="w-3.5 h-3.5" />}
          >
            Run Static Analysis
          </Button>
        </div>
      )}
    </div>
  );
};
