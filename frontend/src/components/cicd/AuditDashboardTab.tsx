import React from "react";
import {
  AlertTriangle,
  Clock,
  Download,
  Layers,
  Play,
  RefreshCw,
  ShieldCheck,
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
  return (
    <div className="space-y-6">
      {/* Audit Controls & Action Bar */}
      <Card padding="md" className="bg-surface-card border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            className="text-xs font-semibold"
          >
            {isExecutingAudit ? "Executing 6-Pillar Audit..." : "Run Codebase Audit"}
          </Button>

          {auditRuns.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted font-medium">History:</span>
              <select
                value={selectedAuditRun?.id || ""}
                onChange={(e) => onSelectAuditRun(e.target.value)}
                className="bg-surface-elevated border border-border-default text-text-primary text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
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
      </Card>

      {selectedAuditRun ? (
        <div className="space-y-6">
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Card padding="sm" className="bg-surface-card border-border-default">
              <span className="text-xs text-text-muted font-medium">Overall Audit Health</span>
              <div className="mt-2 flex items-center gap-2">
                {getStatusBadge(selectedAuditRun.overall_status)}
              </div>
            </Card>

            <Card padding="sm" className="bg-surface-card border-border-default">
              <span className="text-xs text-text-muted font-medium">Pillar Checks Evaluated</span>
              <div className="mt-2 text-2xl font-bold font-mono text-text-primary">
                {selectedAuditRun.summary.passed_checks} / {selectedAuditRun.summary.total_checks}
                <span className="text-xs font-normal text-text-muted ml-2">Passed</span>
              </div>
            </Card>

            <Card padding="sm" className="bg-surface-card border-border-default">
              <span className="text-xs text-text-muted font-medium">Total Discovered Findings</span>
              <div className="mt-2 text-2xl font-bold font-mono text-text-primary">
                {selectedAuditRun.summary.total_findings}
                <span className="text-xs font-normal text-text-muted ml-2">
                  ({selectedAuditRun.summary.findings_by_severity?.HIGH || 0} High, {selectedAuditRun.summary.findings_by_severity?.MEDIUM || 0} Med)
                </span>
              </div>
            </Card>

            <Card padding="sm" className="bg-surface-card border-border-default">
              <span className="text-xs text-text-muted font-medium">Audit Execution Duration</span>
              <div className="mt-2 text-2xl font-bold font-mono text-text-primary flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-accent" />
                {selectedAuditRun.summary.total_duration_ms} ms
              </div>
            </Card>
          </div>

          {/* 6 Pillars Check Breakdown */}
          <Card padding="md" className="bg-surface-card border-border-default space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent" />
              6-Pillar Analysis Verification
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedAuditRun.checks.map((c) => (
                <div
                  key={c.check_id}
                  className="p-3.5 rounded-lg bg-surface-elevated border border-border-default flex flex-col justify-between space-y-2"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] font-mono text-text-muted">{c.category}</span>
                      {getStatusBadge(c.status)}
                    </div>
                    <h4 className="text-xs font-semibold text-text-primary">{c.name}</h4>
                    <p className="text-[11px] text-text-secondary mt-1 line-clamp-2">{c.description}</p>
                  </div>

                  <div className="pt-2 border-t border-border-default flex items-center justify-between text-[11px] text-text-muted font-mono">
                    <span>{c.check_id}</span>
                    <span>{c.duration_ms} ms</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Discovered Findings Table */}
          <Card padding="md" className="bg-surface-card border-border-default space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-status-warning" />
                Discovered Findings & Evidence ({selectedAuditRun.findings_preview.length})
              </h3>

              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">Severity:</span>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="bg-surface-elevated border border-border-default text-text-primary text-xs rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            </div>

            {selectedAuditRun.findings_preview.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-border-default">
                <table className="w-full text-left text-xs text-text-secondary">
                  <thead className="bg-surface-elevated text-text-muted font-medium border-b border-border-default">
                    <tr>
                      <th className="px-3 py-2.5">Rule ID</th>
                      <th className="px-3 py-2.5">Severity</th>
                      <th className="px-3 py-2.5">Category</th>
                      <th className="px-3 py-2.5">Target Location</th>
                      <th className="px-3 py-2.5">Evidence Summary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default bg-surface-base">
                    {selectedAuditRun.findings_preview
                      .filter((f) => severityFilter === "ALL" || f.severity === severityFilter)
                      .map((f, i) => (
                        <tr key={i} className="hover:bg-surface-hover transition-colors">
                          <td className="px-3 py-2 font-mono text-accent font-medium">{f.rule_id}</td>
                          <td className="px-3 py-2">
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
                          <td className="px-3 py-2 font-mono text-text-muted">{f.category}</td>
                          <td className="px-3 py-2 font-mono text-text-primary">
                            {f.file_path}:{f.start_line}
                          </td>
                          <td className="px-3 py-2 text-text-secondary max-w-md truncate">{f.evidence_summary}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-text-muted bg-surface-elevated rounded-lg text-xs">
                Zero security or complexity findings identified in this snapshot!
              </div>
            )}
          </Card>
        </div>
      ) : (
        <Card padding="lg" className="bg-surface-card border-border-default text-center text-text-muted">
          <ShieldCheck className="w-12 h-12 text-text-muted opacity-40 mx-auto mb-3" />
          <p className="text-sm font-medium text-text-primary">
            No audit records found for this repository
          </p>
          <p className="text-xs text-text-secondary max-w-sm mx-auto mt-1 leading-relaxed">
            Click &quot;Run Codebase Audit&quot; above to launch a complete, non-destructive 6-pillar assessment across ingestion, static AST rules, SCA, AppSec, architecture, and remediation feasibility.
          </p>
        </Card>
      )}
    </div>
  );
};

