import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Code2,
  Database,
  Download,
  Layers,
  Network,
  PackageCheck,
  Play,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { AuditRunListItem, AuditRunResponse } from "../../types/cicd";
import { Button } from "../common/Button";
import { Card } from "../common/Card";
import { StatusBadge } from "../common/StatusBadge";
import { formatDate } from "../../lib/utils";

interface AuditDashboardTabProps {
  auditRuns: AuditRunListItem[];
  selectedAuditRun: AuditRunResponse | null;
  isExecutingAudit: boolean;
  onExecuteAudit: () => void;
  onSelectAuditRun: (id: string) => void;
  onDownloadSarif: () => void;
  onDownloadMarkdown: () => void;
  severityFilter: string;
  setSeverityFilter: (sev: string) => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

export const AuditDashboardTab: React.FC<AuditDashboardTabProps> = ({
  auditRuns,
  selectedAuditRun,
  isExecutingAudit,
  onExecuteAudit,
  onSelectAuditRun,
  onDownloadSarif,
  onDownloadMarkdown,
  severityFilter,
  setSeverityFilter,
  getStatusBadge,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredFindings = (selectedAuditRun?.findings_preview || []).filter((f) => {
    const matchesSeverity = severityFilter === "ALL" || f.severity === severityFilter;
    if (!matchesSeverity) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const rule = (f.rule_id || "").toLowerCase();
    const file = (f.file_path || "").toLowerCase();
    const evidence = (f.evidence_summary || "").toLowerCase();
    return rule.includes(query) || file.includes(query) || evidence.includes(query);
  });

  const getPillarCategoryIcon = (category: string) => {
    switch (category?.toUpperCase()) {
      case "INGESTION":
        return <Database className="w-3.5 h-3.5 text-blue-400" />;
      case "STATIC_ANALYSIS":
        return <Code2 className="w-3.5 h-3.5 text-accent" />;
      case "DEPENDENCY_SCA":
        return <PackageCheck className="w-3.5 h-3.5 text-amber-400" />;
      case "APPSEC_INTELLIGENCE":
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
      case "ARCHITECTURE_GOVERNANCE":
        return <Network className="w-3.5 h-3.5 text-purple-400" />;
      case "REMEDIATION_VALIDATION":
        return <Sparkles className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Shield className="w-3.5 h-3.5 text-text-muted" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Audit Controls & Action Bar */}
      <Card padding="md" className="bg-surface-card border-border-default shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="primary"
              size="md"
              onClick={onExecuteAudit}
              disabled={isExecutingAudit}
              isLoading={isExecutingAudit}
              leftIcon={
                isExecutingAudit ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )
              }
              className="text-xs font-semibold shadow-xs"
            >
              {isExecutingAudit ? "Executing 6-Pillar Audit..." : "Run Codebase Audit"}
            </Button>

            {auditRuns.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted font-medium">History:</span>
                <select
                  value={selectedAuditRun?.id || ""}
                  onChange={(e) => onSelectAuditRun(e.target.value)}
                  className="bg-surface-elevated border border-border-default text-text-primary text-xs rounded-md px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-accent font-mono transition-colors"
                  aria-label="Select audit run history"
                >
                  {auditRuns.map((a) => (
                    <option key={a.id} value={a.id}>
                      {formatDate(a.started_at)} — {a.overall_status} ({a.total_findings} findings)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {selectedAuditRun && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="secondary"
                size="sm"
                onClick={onDownloadSarif}
                leftIcon={<Download className="w-3.5 h-3.5 text-accent" />}
                className="text-xs font-medium"
              >
                SARIF 2.1.0 Standard
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onDownloadMarkdown}
                leftIcon={<Download className="w-3.5 h-3.5 text-accent" />}
                className="text-xs font-medium"
              >
                Markdown Report
              </Button>
            </div>
          )}
        </div>
      </Card>

      {selectedAuditRun ? (
        <div className="space-y-6">
          {/* Executive Summary Telemetry Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card padding="md" className="bg-surface-card border-border-default shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted font-medium uppercase tracking-wider">Overall Audit Health</span>
                <ShieldCheck className="w-4 h-4 text-accent/70" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                {getStatusBadge(selectedAuditRun.overall_status)}
              </div>
              <div className="mt-2 text-[11px] font-mono text-text-muted">
                Run ID: {selectedAuditRun.id.slice(0, 8)}
              </div>
            </Card>

            <Card padding="md" className="bg-surface-card border-border-default shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted font-medium uppercase tracking-wider">Pillars Evaluated</span>
                <Layers className="w-4 h-4 text-accent/70" />
              </div>
              <div className="mt-2.5 text-2xl font-bold font-mono text-text-primary flex items-baseline gap-1.5">
                <span>
                  {selectedAuditRun.summary.passed_checks} / {selectedAuditRun.summary.total_checks}
                </span>
                <span className="text-xs font-normal text-text-muted">Passed</span>
              </div>
              <div className="mt-2 w-full bg-surface-base h-1.5 rounded-full overflow-hidden border border-border-default">
                <div
                  className="bg-accent h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      selectedAuditRun.summary.total_checks > 0
                        ? (selectedAuditRun.summary.passed_checks / selectedAuditRun.summary.total_checks) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </Card>

            <Card padding="md" className="bg-surface-card border-border-default shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted font-medium uppercase tracking-wider">Total Findings</span>
                <AlertTriangle className="w-4 h-4 text-amber-400/80" />
              </div>
              <div className="mt-2.5 text-2xl font-bold font-mono text-text-primary flex items-baseline gap-1.5">
                <span>{selectedAuditRun.summary.total_findings}</span>
                <span className="text-xs font-normal text-text-muted">identified</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30">
                  {selectedAuditRun.summary.findings_by_severity?.HIGH || 0} High
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  {selectedAuditRun.summary.findings_by_severity?.MEDIUM || 0} Med
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-base text-text-muted border border-border-default">
                  {selectedAuditRun.summary.findings_by_severity?.LOW || 0} Low
                </span>
              </div>
            </Card>

            <Card padding="md" className="bg-surface-card border-border-default shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted font-medium uppercase tracking-wider">Execution Duration</span>
                <Clock className="w-4 h-4 text-accent/70" />
              </div>
              <div className="mt-2.5 text-2xl font-bold font-mono text-text-primary flex items-center gap-2">
                <span>{selectedAuditRun.summary.total_duration_ms}</span>
                <span className="text-xs font-normal text-text-muted">ms</span>
              </div>
              <div className="mt-2 text-[11px] font-mono text-text-muted truncate">
                Finished {formatDate(selectedAuditRun.completed_at || selectedAuditRun.started_at)}
              </div>
            </Card>
          </div>

          {/* 6 Pillars Check Breakdown */}
          <Card padding="md" className="bg-surface-card border-border-default space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-accent-subtle border border-accent-border flex items-center justify-center text-accent">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                  6-Pillar Analysis Verification
                </h3>
              </div>
              <span className="text-[11px] font-mono text-text-muted">
                {selectedAuditRun.checks.length} pillar checkpoints
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedAuditRun.checks.map((c) => (
                <div
                  key={c.check_id}
                  className="p-3.5 rounded-lg bg-surface-elevated border border-border-default flex flex-col justify-between space-y-3 shadow-xs hover:border-border-strong transition-all duration-200"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-base text-text-muted border border-border-default">
                        {getPillarCategoryIcon(c.category)}
                        <span className="text-[10px] font-mono uppercase tracking-wider">
                          {c.category}
                        </span>
                      </div>
                      {getStatusBadge(c.status)}
                    </div>
                    <h4 className="text-xs font-semibold text-text-primary leading-snug">{c.name}</h4>
                    <p className="text-[11px] text-text-secondary mt-1.5 line-clamp-2 leading-relaxed">
                      {c.description}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-border-default flex items-center justify-between text-[11px] text-text-muted font-mono">
                    <span className="text-accent font-medium">{c.check_id}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-text-muted" />
                      {c.duration_ms} ms
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Discovered Findings Table */}
          <Card padding="md" className="bg-surface-card border-border-default space-y-4 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                  Discovered Findings & Evidence ({selectedAuditRun.findings_preview.length})
                </h3>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search findings..."
                    className="bg-surface-elevated border border-border-default text-text-primary text-xs rounded-md pl-8 pr-7 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-accent w-48 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                      aria-label="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Severity Dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-text-muted">Severity:</span>
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="bg-surface-elevated border border-border-default text-text-primary text-xs rounded-md px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-accent font-medium transition-colors"
                    aria-label="Filter findings by severity"
                  >
                    <option value="ALL">All Severities</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>
            </div>

            {selectedAuditRun.findings_preview.length > 0 ? (
              filteredFindings.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-border-default">
                  <table className="w-full text-left text-xs text-text-secondary">
                    <thead className="bg-surface-elevated text-text-muted font-medium border-b border-border-default uppercase font-mono text-[11px] tracking-wider">
                      <tr>
                        <th className="px-3.5 py-2.5">Rule ID</th>
                        <th className="px-3.5 py-2.5">Severity</th>
                        <th className="px-3.5 py-2.5">Category</th>
                        <th className="px-3.5 py-2.5">Target Location</th>
                        <th className="px-3.5 py-2.5">Evidence Summary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default bg-surface-base">
                      {filteredFindings.map((f, i) => (
                        <tr key={i} className="hover:bg-surface-hover/70 transition-colors">
                          <td className="px-3.5 py-2.5 font-mono text-accent font-medium whitespace-nowrap">
                            {f.rule_id}
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            <StatusBadge
                              label={f.severity}
                              variant={
                                f.severity === "CRITICAL" || f.severity === "HIGH"
                                  ? "danger"
                                  : f.severity === "MEDIUM"
                                  ? "warning"
                                  : "neutral"
                              }
                              isMono={true}
                            />
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-text-muted whitespace-nowrap">
                            {f.category}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-text-primary whitespace-nowrap">
                            {f.file_path}:{f.start_line}
                          </td>
                          <td className="px-3.5 py-2.5 text-text-secondary max-w-md truncate">
                            {f.evidence_summary}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-text-muted bg-surface-elevated rounded-lg text-xs space-y-1.5 border border-border-default">
                  <p className="font-semibold text-text-secondary">No findings match the current filter</p>
                  <p className="text-text-muted text-[11px]">
                    Try adjusting your severity filter or clearing the search query.
                  </p>
                </div>
              )
            ) : (
              <div className="p-8 text-center text-text-muted bg-surface-elevated rounded-lg text-xs flex items-center justify-center gap-2.5 border border-border-default">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="font-medium text-emerald-300">
                  Zero security or complexity findings identified in this snapshot!
                </span>
              </div>
            )}
          </Card>
        </div>
      ) : (
        <Card padding="lg" className="bg-surface-card border-border-default text-center text-text-muted shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-surface-elevated border border-border-default flex items-center justify-center text-text-muted opacity-60 mx-auto mb-3 shadow-xs">
            <ShieldCheck className="w-6 h-6 text-accent" />
          </div>
          <p className="text-sm font-semibold text-text-primary">
            No audit records found for this repository
          </p>
          <p className="text-xs text-text-secondary max-w-sm mx-auto mt-1.5 leading-relaxed">
            Click &quot;Run Codebase Audit&quot; above to launch a complete, non-destructive 6-pillar assessment across ingestion, static AST rules, SCA, AppSec, architecture, and remediation feasibility.
          </p>
        </Card>
      )}
    </div>
  );
};
