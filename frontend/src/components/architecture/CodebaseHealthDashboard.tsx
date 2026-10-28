import React, { useState, useEffect, useCallback } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  HelpCircle,
  Info,
  Layers,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Repository } from "../../types/api";
import { CodebaseHealth, HealthDimension, Recommendation } from "../../types/health";
import { getRepositoryHealth } from "../../services/healthService";

interface CodebaseHealthDashboardProps {
  repository: Repository;
}

export const CodebaseHealthDashboard: React.FC<CodebaseHealthDashboardProps> = ({ repository }) => {
  const [health, setHealth] = useState<CodebaseHealth | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRepositoryHealth(repository.id, repository.latest_snapshot?.id);
      setHealth(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load codebase health assessment.");
    } finally {
      setLoading(false);
    }
  }, [repository.id, repository.latest_snapshot?.id]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const getScoreColor = (score: number | null): { text: string; bg: string; border: string } => {
    if (score === null) return { text: "text-text-muted", bg: "bg-surface-subtle", border: "border-border-default" };
    if (score >= 85) return { text: "text-status-success", bg: "bg-status-success/10", border: "border-status-success/30" };
    if (score >= 70) return { text: "text-accent", bg: "bg-accent-subtle", border: "border-accent-border" };
    if (score >= 50) return { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" };
    return { text: "text-status-danger", bg: "bg-status-danger/10", border: "border-status-danger/30" };
  };

  const getStatusBadge = (status: string, score: number | null) => {
    if (status === "unavailable") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-subtle text-text-muted border border-border-default">
          <HelpCircle className="w-3.5 h-3.5 text-text-muted" />
          Unavailable
        </span>
      );
    }
    if (status === "partial") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          Partial Assessment
        </span>
      );
    }
    if (score !== null && score >= 85) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-status-success/10 text-status-success border border-status-success/30">
          <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
          Excellent Health
        </span>
      );
    }
    if (score !== null && score >= 70) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-accent-subtle text-accent border border-accent-border">
          <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
          Good Health
        </span>
      );
    }
    if (score !== null && score >= 50) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          Needs Improvement
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-status-danger/10 text-status-danger border border-status-danger/30">
        <AlertOctagon className="w-3.5 h-3.5 text-status-danger" />
        Critical Risk
      </span>
    );
  };

  const getDimensionStatusBadge = (status: string) => {
    switch (status) {
      case "HEALTHY":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-status-success/10 text-status-success border border-status-success/30">HEALTHY</span>;
      case "WARNING":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">WARNING</span>;
      case "CRITICAL":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-status-danger/10 text-status-danger border border-status-danger/30">CRITICAL</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-subtle text-text-muted border border-border-default">UNAVAILABLE</span>;
    }
  };

  const getRecommendationBadge = (priority: Recommendation["priority"]) => {
    switch (priority) {
      case "CRITICAL":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-status-danger/10 text-status-danger border border-status-danger/30">CRITICAL</span>;
      case "HIGH":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-status-warning/10 text-status-warning border border-status-warning/30">HIGH</span>;
      case "MEDIUM":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">MEDIUM</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-accent-subtle text-accent border border-accent-border">LOW</span>;
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center bg-surface-card border border-border-default rounded-lg">
        <RefreshCw className="w-8 h-8 text-accent animate-spin mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-text-primary">Evaluating Codebase Health</h3>
        <p className="text-xs text-text-muted mt-1">Aggregating static analysis, security, architecture, and dependency metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-surface-card border border-status-danger/40 rounded-lg text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-status-danger mx-auto" />
        <h3 className="text-sm font-semibold text-text-primary">Failed to Retrieve Codebase Health</h3>
        <p className="text-xs text-status-danger max-w-md mx-auto">{error}</p>
        <button
          onClick={fetchHealth}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-subtle hover:bg-surface-overlay text-xs font-medium text-text-primary border border-border-default cursor-pointer transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  if (!health) {
    return null;
  }

  const scoreTheme = getScoreColor(health.overall_score);

  return (
    <div className="space-y-6">
      {/* Top Banner & Overall Score Card */}
      <div className="p-5 bg-surface-card border border-border-default rounded-lg shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Overall Score Dial */}
          <div className="flex items-center gap-5">
            <div
              className={`w-24 h-24 rounded-2xl flex flex-col items-center justify-center border-2 ${scoreTheme.bg} ${scoreTheme.border} transition-all`}
            >
              <span className={`text-3xl font-extrabold font-mono tracking-tight ${scoreTheme.text}`}>
                {health.overall_score !== null ? health.overall_score.toFixed(1) : "--"}
              </span>
              <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider mt-0.5">
                / 100 PTS
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-accent" />
                  Codebase Health Index
                </h2>
                {getStatusBadge(health.status, health.overall_score)}
              </div>
              <p className="text-xs text-text-muted max-w-xl">
                Deterministic synthesis of maintainability, security, architectural modularity, dependency hygiene, and coverage across all snapshot files.
              </p>
              <div className="flex items-center gap-4 text-[11px] text-text-muted pt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Evaluated: {new Date(health.assessed_at).toLocaleString()}
                </span>
                <span>•</span>
                <span>Engine: v{health.scoring_version}</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-subtle hover:bg-surface-overlay text-xs font-medium text-text-primary border border-border-default transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Recalculate Health</span>
            </button>
          </div>
        </div>

        {/* Missing Inputs Notice if Partial or Unavailable */}
        {health.missing_inputs.length > 0 && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md flex items-start gap-2.5 text-xs text-amber-400">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Missing analysis inputs: </span>
              <span>{health.missing_inputs.join(", ")}. </span>
              {health.status === "unavailable" ? (
                <span className="text-text-secondary">
                  Overall health score is unavailable until at least Maintainability or Security analyses are executed.
                </span>
              ) : (
                <span className="text-text-secondary">
                  Overall health is calculated with proportional dynamic weight renormalization.
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5 Dimension Breakdown Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Layers className="w-4 h-4 text-accent" />
          Health Dimensions Breakdown (5 Core Pillars)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(health.dimensions).map(([key, dim]: [string, HealthDimension]) => {
            const dimScoreTheme = getScoreColor(dim.score);
            return (
              <div
                key={key}
                className="p-4 bg-surface-card border border-border-default rounded-lg flex flex-col justify-between space-y-3 hover:border-border-hover transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-text-primary uppercase tracking-wide">
                      {dim.name}
                    </span>
                    {getDimensionStatusBadge(dim.status)}
                  </div>

                  <div className="flex items-baseline justify-between mb-1">
                    <span className={`text-2xl font-extrabold font-mono ${dimScoreTheme.text}`}>
                      {dim.score !== null ? dim.score.toFixed(1) : "--"}
                    </span>
                    <span className="text-xs text-text-muted">
                      Weight: {(dim.weight * 100).toFixed(0)}%
                      {dim.contribution !== null && ` (${dim.contribution.toFixed(1)} pts)`}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-surface-subtle rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full transition-all duration-500 ${
                        dim.score === null
                          ? "w-0"
                          : dim.score >= 85
                          ? "bg-status-success"
                          : dim.score >= 70
                          ? "bg-accent"
                          : dim.score >= 50
                          ? "bg-amber-500"
                          : "bg-status-danger"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, dim.score ?? 0))}%` }}
                    />
                  </div>

                  {/* Key Metrics Chips */}
                  {Object.keys(dim.metrics).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {Object.entries(dim.metrics).map(([mk, mv]) => (
                        <span
                          key={mk}
                          className="px-2 py-0.5 rounded text-[11px] font-mono bg-surface-base text-text-secondary border border-border-default"
                        >
                          {mk}: <strong className="text-text-primary">{String(mv)}</strong>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Explanatory Reasons */}
                  <div className="space-y-1 border-t border-border-default pt-2">
                    <span className="text-[11px] font-semibold text-text-muted uppercase">Assessment Rationale</span>
                    <ul className="text-xs text-text-secondary space-y-1 list-disc list-inside">
                      {dim.reasons.map((r, i) => (
                        <li key={i} className="leading-relaxed">
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actionable Prioritized Recommendations */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Prioritized Actionable Recommendations ({health.recommendations.length})
        </h3>

        {health.recommendations.length === 0 ? (
          <div className="p-6 bg-surface-card border border-border-default rounded-lg text-center text-xs text-status-success">
            <ShieldCheck className="w-6 h-6 mx-auto mb-1.5" />
            No urgent health recommendations. The codebase maintains high standards across all measured dimensions.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {health.recommendations.map((rec, i) => (
              <div
                key={i}
                className="p-3.5 bg-surface-card border border-border-default rounded-lg space-y-2 hover:border-border-hover transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getRecommendationBadge(rec.priority)}
                    <span className="text-xs font-semibold text-text-primary">{rec.title}</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-base text-text-muted border border-border-default">
                    {rec.dimension}
                  </span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed pl-1 border-l-2 border-border-default">
                  {rec.action}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
