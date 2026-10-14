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
    if (score === null) return { text: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/30" };
    if (score >= 85) return { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" };
    if (score >= 70) return { text: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/30" };
    if (score >= 50) return { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" };
    return { text: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30" };
  };

  const getStatusBadge = (status: string, score: number | null) => {
    if (status === "unavailable") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          Unavailable
        </span>
      );
    }
    if (status === "partial") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/80">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          Partial Assessment
        </span>
      );
    }
    if (score !== null && score >= 85) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/80">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Excellent Health
        </span>
      );
    }
    if (score !== null && score >= 70) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-950/60 text-sky-300 border border-sky-800/80">
          <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
          Good Health
        </span>
      );
    }
    if (score !== null && score >= 50) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/80">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          Needs Improvement
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-950/60 text-rose-300 border border-rose-800/80">
        <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
        Critical Risk
      </span>
    );
  };

  const getDimensionStatusBadge = (status: string) => {
    switch (status) {
      case "HEALTHY":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">HEALTHY</span>;
      case "WARNING":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">WARNING</span>;
      case "CRITICAL":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">CRITICAL</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/15 text-slate-400 border border-slate-500/30">UNAVAILABLE</span>;
    }
  };

  const getRecommendationBadge = (priority: Recommendation["priority"]) => {
    switch (priority) {
      case "CRITICAL":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">CRITICAL</span>;
      case "HIGH":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">HIGH</span>;
      case "MEDIUM":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">MEDIUM</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">LOW</span>;
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center bg-[#161b22] border border-[#30363d] rounded-lg">
        <RefreshCw className="w-8 h-8 text-sky-400 animate-spin mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-200">Evaluating Codebase Health</h3>
        <p className="text-xs text-slate-400 mt-1">Aggregating static analysis, security, architecture, and dependency metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-[#161b22] border border-rose-800/60 rounded-lg text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
        <h3 className="text-sm font-semibold text-slate-200">Failed to Retrieve Codebase Health</h3>
        <p className="text-xs text-rose-300 max-w-md mx-auto">{error}</p>
        <button
          onClick={fetchHealth}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-xs font-medium text-slate-200 border border-[#30363d] cursor-pointer"
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
      <div className="p-5 bg-[#161b22] border border-[#30363d] rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Overall Score Dial */}
          <div className="flex items-center gap-5">
            <div
              className={`w-24 h-24 rounded-2xl flex flex-col items-center justify-center border-2 ${scoreTheme.bg} ${scoreTheme.border} transition-all`}
            >
              <span className={`text-3xl font-extrabold font-mono tracking-tight ${scoreTheme.text}`}>
                {health.overall_score !== null ? health.overall_score.toFixed(1) : "--"}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">
                / 100 PTS
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-sky-400" />
                  Codebase Health Index
                </h2>
                {getStatusBadge(health.status, health.overall_score)}
              </div>
              <p className="text-xs text-slate-400 max-w-xl">
                Deterministic synthesis of maintainability, security, architectural modularity, dependency hygiene, and coverage across all snapshot files.
              </p>
              <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-xs font-medium text-slate-200 border border-[#30363d] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Recalculate Health</span>
            </button>
          </div>
        </div>

        {/* Missing Inputs Notice if Partial or Unavailable */}
        {health.missing_inputs.length > 0 && (
          <div className="mt-4 p-3 bg-amber-950/30 border border-amber-800/40 rounded-md flex items-start gap-2.5 text-xs text-amber-300">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Missing analysis inputs: </span>
              <span>{health.missing_inputs.join(", ")}. </span>
              {health.status === "unavailable" ? (
                <span className="text-slate-300">
                  Overall health score is unavailable until at least Maintainability or Security analyses are executed.
                </span>
              ) : (
                <span className="text-slate-300">
                  Overall health is calculated with proportional dynamic weight renormalization.
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5 Dimension Breakdown Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-400" />
          Health Dimensions Breakdown (5 Core Pillars)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(health.dimensions).map(([key, dim]: [string, HealthDimension]) => {
            const dimScoreTheme = getScoreColor(dim.score);
            return (
              <div
                key={key}
                className="p-4 bg-[#161b22] border border-[#30363d] rounded-lg flex flex-col justify-between space-y-3 hover:border-slate-600 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                      {dim.name}
                    </span>
                    {getDimensionStatusBadge(dim.status)}
                  </div>

                  <div className="flex items-baseline justify-between mb-1">
                    <span className={`text-2xl font-extrabold font-mono ${dimScoreTheme.text}`}>
                      {dim.score !== null ? dim.score.toFixed(1) : "--"}
                    </span>
                    <span className="text-xs text-slate-400">
                      Weight: {(dim.weight * 100).toFixed(0)}%
                      {dim.contribution !== null && ` (${dim.contribution.toFixed(1)} pts)`}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-[#21262d] rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full transition-all duration-500 ${
                        dim.score === null
                          ? "w-0"
                          : dim.score >= 85
                          ? "bg-emerald-500"
                          : dim.score >= 70
                          ? "bg-sky-500"
                          : dim.score >= 50
                          ? "bg-amber-500"
                          : "bg-rose-500"
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
                          className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#0d1117] text-slate-300 border border-[#30363d]"
                        >
                          {mk}: <strong className="text-slate-100">{String(mv)}</strong>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Explanatory Reasons */}
                  <div className="space-y-1 border-t border-[#21262d] pt-2">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Assessment Rationale</span>
                    <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
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
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Prioritized Actionable Recommendations ({health.recommendations.length})
        </h3>

        {health.recommendations.length === 0 ? (
          <div className="p-6 bg-[#161b22] border border-[#30363d] rounded-lg text-center text-xs text-emerald-400">
            <ShieldCheck className="w-6 h-6 mx-auto mb-1.5" />
            No urgent health recommendations. The codebase maintains high standards across all measured dimensions.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {health.recommendations.map((rec, i) => (
              <div
                key={i}
                className="p-3.5 bg-[#161b22] border border-[#30363d] rounded-lg space-y-2 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getRecommendationBadge(rec.priority)}
                    <span className="text-xs font-semibold text-slate-200">{rec.title}</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#0d1117] text-slate-400 border border-[#21262d]">
                    {rec.dimension}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-1 border-l-2 border-slate-700">
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
