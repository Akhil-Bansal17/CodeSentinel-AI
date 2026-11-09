import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileCode,
  Gauge,
  HelpCircle,
  History,
  Info,
  Layers,
  Network,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Repository } from "../../types/api";
import { CodebaseHealth, HealthDimension, Recommendation } from "../../types/health";
import { getRepositoryHealth, listHealthHistory } from "../../services/healthService";
import { Button } from "../common/Button";

interface CodebaseHealthDashboardProps {
  repository: Repository;
}

export const CodebaseHealthDashboard: React.FC<CodebaseHealthDashboardProps> = ({ repository }) => {
  const [health, setHealth] = useState<CodebaseHealth | null>(null);
  const [history, setHistory] = useState<CodebaseHealth[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Recommendations filter state
  const [recommendationPriority, setRecommendationPriority] = useState<string>("ALL");
  const [recommendationSearch, setRecommendationSearch] = useState<string>("");

  const snapshotId = repository.latest_snapshot?.id;

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRepositoryHealth(repository.id, snapshotId);
      setHealth(data);

      // Safely load history if available without breaking unit test mocks
      try {
        const hist = await listHealthHistory(repository.id, 1, 10);
        if (hist && hist.items) {
          setHistory(hist.items);
        }
      } catch {
        // Gracefully ignore history errors or unmocked service function
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load codebase health assessment.");
    } finally {
      setLoading(false);
    }
  }, [repository.id, snapshotId]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const getScoreColor = (
    score: number | null
  ): { text: string; bg: string; border: string; hoverBorder: string; hoverBg: string } => {
    if (score === null)
      return {
        text: "text-text-muted",
        bg: "bg-surface-elevated/80",
        border: "border-border-default",
        hoverBorder: "hover:border-border-strong",
        hoverBg: "hover:bg-surface-elevated",
      };
    if (score >= 85)
      return {
        text: "text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        hoverBorder: "hover:border-emerald-500/60",
        hoverBg: "hover:bg-emerald-500/15",
      };
    if (score >= 70)
      return {
        text: "text-accent",
        bg: "bg-accent-subtle",
        border: "border-accent-border",
        hoverBorder: "hover:border-accent",
        hoverBg: "hover:bg-accent/15",
      };
    if (score >= 50)
      return {
        text: "text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        hoverBorder: "hover:border-amber-500/60",
        hoverBg: "hover:bg-amber-500/15",
      };
    return {
      text: "text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/30",
      hoverBorder: "hover:border-rose-500/60",
      hoverBg: "hover:bg-rose-500/15",
    };
  };

  const getStatusBadge = (status: string, score: number | null) => {
    if (status === "unavailable") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-elevated text-text-muted border border-border-default font-mono">
          <HelpCircle className="w-3.5 h-3.5 text-text-muted" />
          Unavailable
        </span>
      );
    }
    if (status === "partial") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          Partial Assessment
        </span>
      );
    }
    if (score !== null && score >= 85) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Excellent Health
        </span>
      );
    }
    if (score !== null && score >= 70) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-accent-subtle text-accent border border-accent-border shadow-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
          Good Health
        </span>
      );
    }
    if (score !== null && score >= 50) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-xs">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          Needs Improvement
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/40 shadow-xs">
        <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
        Critical Risk
      </span>
    );
  };

  const getDimensionStatusBadge = (status: string) => {
    switch (status) {
      case "HEALTHY":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">HEALTHY</span>;
      case "WARNING":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">WARNING</span>;
      case "CRITICAL":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-500/10 text-rose-400 border border-rose-500/30">CRITICAL</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-surface-elevated text-text-muted border border-border-default">UNAVAILABLE</span>;
    }
  };

  const getRecommendationBadge = (priority: Recommendation["priority"]) => {
    switch (priority) {
      case "CRITICAL":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-500/10 text-rose-400 border border-rose-500/30">CRITICAL</span>;
      case "HIGH":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-orange-500/10 text-orange-400 border border-orange-500/30">HIGH</span>;
      case "MEDIUM":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">MEDIUM</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-accent-subtle text-accent border border-accent-border">LOW</span>;
    }
  };

  const getDimensionIcon = (key: string) => {
    switch (key) {
      case "maintainability":
        return <FileCode className="w-3.5 h-3.5 text-accent" />;
      case "app_security":
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
      case "architecture":
        return <Network className="w-3.5 h-3.5 text-violet-400" />;
      case "dependency_risk":
        return <Package className="w-3.5 h-3.5 text-amber-400" />;
      case "coverage":
      default:
        return <Layers className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  // Filtered recommendations
  const filteredRecommendations = useMemo(() => {
    if (!health?.recommendations) return [];
    return health.recommendations.filter((rec) => {
      const matchesPriority =
        recommendationPriority === "ALL" || rec.priority === recommendationPriority;
      const q = recommendationSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        rec.title.toLowerCase().includes(q) ||
        rec.action.toLowerCase().includes(q) ||
        rec.dimension.toLowerCase().includes(q);
      return matchesPriority && matchesSearch;
    });
  }, [health?.recommendations, recommendationPriority, recommendationSearch]);

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
      <div className="p-8 bg-surface-card border border-rose-500/40 rounded-lg text-center space-y-3 shadow-xs">
        <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
        <h3 className="text-sm font-semibold text-text-primary">Failed to Retrieve Codebase Health</h3>
        <p className="text-xs text-rose-400 max-w-md mx-auto">{error}</p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={fetchHealth}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          <span>Retry</span>
        </Button>
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
              className={`w-24 h-24 rounded-2xl flex flex-col items-center justify-center border-2 ${scoreTheme.bg} ${scoreTheme.border} ${scoreTheme.hoverBg} ${scoreTheme.hoverBorder} transition-all duration-300 ease-out shadow-xs hover:shadow-sm shrink-0 select-none cursor-default group`}
            >
              <span
                className={`text-3xl font-extrabold font-mono tracking-tight ${scoreTheme.text} transition-colors duration-200`}
              >
                {health.overall_score !== null ? health.overall_score.toFixed(1) : "--"}
              </span>
              <span className="text-[10px] uppercase font-semibold text-text-secondary tracking-widest mt-0.5 transition-colors duration-200">
                / 100 PTS
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent-subtle border border-accent-border text-accent shrink-0">
                  <Gauge className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-text-primary tracking-tight">
                  Codebase Health Index
                </h2>
                {getStatusBadge(health.status, health.overall_score)}
              </div>
              <p className="text-xs text-text-muted max-w-xl leading-relaxed">
                Deterministic synthesis of maintainability, security, architectural modularity, dependency hygiene, and coverage across all snapshot files.
              </p>
              <div className="flex items-center gap-3 text-[11px] text-text-muted pt-1 flex-wrap">
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-text-muted" />
                  Evaluated: {new Date(health.assessed_at).toLocaleString()}
                </span>
                <span>•</span>
                <span className="font-mono">Engine: v{health.scoring_version}</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={fetchHealth}
              disabled={loading}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
            >
              Recalculate Health
            </Button>
          </div>
        </div>

        {/* Missing Inputs Notice if Partial or Unavailable */}
        {health.missing_inputs.length > 0 && (
          <div className="mt-4 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2.5 text-xs text-amber-400 shadow-xs">
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

        {/* Contributing Runs Provenance Strip */}
        {health.contributing_runs && Object.keys(health.contributing_runs).length > 0 && (
          <div className="mt-4 pt-4 border-t border-border-subtle flex items-center justify-between gap-3 text-xs flex-wrap">
            <span className="text-text-muted font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-accent" />
              <span>Contributing Pipeline Runs:</span>
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {Object.entries(health.contributing_runs).map(([pipelineKey, runId]) => (
                <span
                  key={pipelineKey}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                    runId
                      ? "bg-surface-base text-text-secondary border-border-default"
                      : "bg-surface-elevated text-text-muted border-border-subtle"
                  }`}
                >
                  <span className="capitalize">{pipelineKey.replace(/_/g, " ")}: </span>
                  <strong className={runId ? "text-text-primary" : "text-text-muted"}>
                    {runId ? runId.substring(0, 12) : "none"}
                  </strong>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5 Dimension Breakdown Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent" />
            Health Dimensions Breakdown (5 Core Pillars)
          </h3>
          <span className="text-xs text-text-muted">
            Independent 100-point scales with normalized weight contributions
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(health.dimensions).map(([key, dim]: [string, HealthDimension]) => {
            const dimScoreTheme = getScoreColor(dim.score);
            return (
              <div
                key={key}
                className="p-4 bg-surface-card border border-border-default rounded-lg flex flex-col justify-between space-y-3 shadow-xs hover:border-border-strong transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <div className="p-1 rounded bg-surface-base border border-border-subtle">
                        {getDimensionIcon(key)}
                      </div>
                      <span className="text-xs font-bold text-text-primary uppercase tracking-wide">
                        {dim.name}
                      </span>
                    </div>
                    {getDimensionStatusBadge(dim.status)}
                  </div>

                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className={`text-2xl font-extrabold font-mono tracking-tight ${dimScoreTheme.text}`}>
                      {dim.score !== null ? dim.score.toFixed(1) : "--"}
                    </span>
                    <span className="text-xs text-text-muted font-mono">
                      Weight: {(dim.weight * 100).toFixed(0)}%
                      {dim.contribution !== null && ` (${dim.contribution.toFixed(1)} pts)`}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-surface-base border border-border-subtle rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full transition-all duration-500 ${
                        dim.score === null
                          ? "w-0"
                          : dim.score >= 85
                          ? "bg-emerald-400"
                          : dim.score >= 70
                          ? "bg-accent"
                          : dim.score >= 50
                          ? "bg-amber-400"
                          : "bg-rose-400"
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
                          {mk.replace(/_/g, " ")}: <strong className="text-text-primary">{String(mv)}</strong>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Explanatory Reasons */}
                  <div className="space-y-1.5 border-t border-border-subtle pt-2.5">
                    <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider block">
                      Assessment Rationale
                    </span>
                    <ul className="text-xs text-text-secondary space-y-1">
                      {dim.reasons.map((r, i) => (
                        <li key={i} className="leading-relaxed flex items-start gap-1.5">
                          <span className="text-accent shrink-0 mt-0.5">•</span>
                          <span>{r}</span>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Prioritized Actionable Recommendations ({health.recommendations.length})
          </h3>

          {/* Filter Toolbar when recommendations exist */}
          {health.recommendations.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter recommendations..."
                  aria-label="Filter recommendations"
                  value={recommendationSearch}
                  onChange={(e) => setRecommendationSearch(e.target.value)}
                  className="h-8 pl-8 pr-7 py-1 text-xs font-mono bg-surface-card border border-border-default rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors w-44 sm:w-52"
                />
                {recommendationSearch && (
                  <button
                    type="button"
                    onClick={() => setRecommendationSearch("")}
                    aria-label="Clear filter"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 bg-surface-card border border-border-default rounded-md p-0.5">
                {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((p) => {
                  const active = recommendationPriority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setRecommendationPriority(p)}
                      className={`px-2 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                        active
                          ? "bg-accent-subtle text-accent border border-accent-border font-semibold shadow-xs"
                          : "text-text-muted hover:text-text-primary"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {health.recommendations.length === 0 ? (
          <div className="p-8 bg-surface-card border border-border-default rounded-lg text-center text-xs text-emerald-400 shadow-xs">
            <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
            <div className="text-text-primary font-medium text-xs mb-0.5">All Health Checks Passing</div>
            <div className="text-text-muted text-[11px]">
              No urgent health recommendations. The codebase maintains high standards across all measured dimensions.
            </div>
          </div>
        ) : filteredRecommendations.length === 0 ? (
          <div className="p-6 bg-surface-card border border-border-default rounded-lg text-center text-xs text-text-muted space-y-2">
            <p>No recommendations match the active priority or search filters.</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setRecommendationPriority("ALL");
                setRecommendationSearch("");
              }}
            >
              Reset recommendation filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredRecommendations.map((rec, i) => (
              <div
                key={i}
                className="p-3.5 bg-surface-card border border-border-default rounded-lg space-y-2.5 shadow-xs hover:border-border-strong transition-colors"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {getRecommendationBadge(rec.priority)}
                    <span className="text-xs font-semibold text-text-primary">{rec.title}</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-base text-text-muted border border-border-default">
                    {rec.dimension}
                  </span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed pl-2 border-l-2 border-accent/40 font-mono">
                  {rec.action}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historical Health Assessments (Audit Trail) */}
      {history.length > 1 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <History className="w-4 h-4 text-accent" />
              Historical Health Assessment Log ({history.length} records)
            </h3>
            <span className="text-xs text-text-muted">Chronological audit trail of health evaluations</span>
          </div>

          <div className="border border-border-default rounded-lg overflow-hidden bg-surface-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-base border-b border-border-subtle text-text-muted uppercase font-mono text-[11px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Evaluated At</th>
                    <th className="py-2.5 px-3">Score</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Engine</th>
                    <th className="py-2.5 px-3">Maintainability</th>
                    <th className="py-2.5 px-3">Security</th>
                    <th className="py-2.5 px-3">Architecture</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle font-mono text-text-secondary">
                  {history.map((h, idx) => (
                    <tr key={h.id || idx} className="hover:bg-surface-elevated/40 transition-colors">
                      <td className="py-2.5 px-3 text-text-primary whitespace-nowrap">
                        {new Date(h.assessed_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-text-primary">
                        {h.overall_score !== null ? h.overall_score.toFixed(1) : "--"}
                      </td>
                      <td className="py-2.5 px-3">{getStatusBadge(h.status, h.overall_score)}</td>
                      <td className="py-2.5 px-3 text-text-muted">v{h.scoring_version}</td>
                      <td className="py-2.5 px-3">
                        {h.dimensions?.maintainability?.score !== null && h.dimensions?.maintainability?.score !== undefined
                          ? h.dimensions.maintainability.score.toFixed(1)
                          : "--"}
                      </td>
                      <td className="py-2.5 px-3">
                        {h.dimensions?.app_security?.score !== null && h.dimensions?.app_security?.score !== undefined
                          ? h.dimensions.app_security.score.toFixed(1)
                          : "--"}
                      </td>
                      <td className="py-2.5 px-3">
                        {h.dimensions?.architecture?.score !== null && h.dimensions?.architecture?.score !== undefined
                          ? h.dimensions.architecture.score.toFixed(1)
                          : "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
