import React from "react";
import { AlertCircle, FileCheck, FileX, ShieldAlert } from "lucide-react";
import { AnalysisRun } from "../../types/analysis";

interface AnalysisSummaryCardsProps {
  run: AnalysisRun;
}

export const AnalysisSummaryCards: React.FC<AnalysisSummaryCardsProps> = ({ run }) => {
  const summary = run.summary_json || {};
  const severityDist: Record<string, number> =
    (summary.severity_distribution as Record<string, number>) || {};
  const confDist: Record<string, number> =
    (summary.confidence_distribution as Record<string, number>) || {};
  const categoryDist: Record<string, number> =
    (summary.category_distribution as Record<string, number>) || {};

  return (
    <div className="space-y-3">
      {/* 4 Core Telemetry Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Findings */}
        <div className="p-3.5 rounded-lg bg-surface-card border border-border-default shadow-xs">
          <div className="flex items-center gap-2 text-text-muted text-xs font-medium mb-1">
            <ShieldAlert className="w-3.5 h-3.5 text-warning" />
            <span>Total Findings</span>
          </div>
          <div className="text-xl font-bold text-text-primary">
            {run.findings_count.toLocaleString()}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">Static analysis issues</div>
        </div>

        {/* Analyzed Files */}
        <div className="p-3.5 rounded-lg bg-surface-card border border-border-default shadow-xs">
          <div className="flex items-center gap-2 text-text-muted text-xs font-medium mb-1">
            <FileCheck className="w-3.5 h-3.5 text-success" />
            <span>Analyzed Files</span>
          </div>
          <div className="text-xl font-bold text-text-primary">
            {run.files_analyzed.toLocaleString()}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">Parsed via AST</div>
        </div>

        {/* Skipped Files */}
        <div className="p-3.5 rounded-lg bg-surface-card border border-border-default shadow-xs">
          <div className="flex items-center gap-2 text-text-muted text-xs font-medium mb-1">
            <FileX className="w-3.5 h-3.5 text-text-muted" />
            <span>Skipped Files</span>
          </div>
          <div className="text-xl font-bold text-text-primary">
            {run.files_skipped.toLocaleString()}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">Non-source / bounded limits</div>
        </div>

        {/* Rule-set Version */}
        <div className="p-3.5 rounded-lg bg-surface-card border border-border-default shadow-xs">
          <div className="flex items-center gap-2 text-text-muted text-xs font-medium mb-1">
            <AlertCircle className="w-3.5 h-3.5 text-accent" />
            <span>Engine Version</span>
          </div>
          <div className="text-xl font-bold text-text-primary font-mono">
            v{run.rule_set_version}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">Deterministic ruleset</div>
        </div>
      </div>

      {/* Severity & Confidence Breakdown Strip */}
      <div className="space-y-2">
        <div className="p-3 rounded-lg bg-surface-card border border-border-default flex items-center justify-between gap-3 flex-wrap text-xs shadow-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-text-muted font-medium text-[11px] uppercase tracking-wider">
              Severity Breakdown:
            </span>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-danger-bg border border-danger-border text-danger-text text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-danger" />
                CRITICAL: {severityDist["CRITICAL"] ?? 0}
              </span>

              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-warning-bg border border-warning-border text-warning-text text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                HIGH: {severityDist["HIGH"] ?? 0}
              </span>

              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                MEDIUM: {severityDist["MEDIUM"] ?? 0}
              </span>

              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-info-bg border border-info-border text-info-text text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-info" />
                LOW: {severityDist["LOW"] ?? 0}
              </span>

              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-hover border border-border-default text-text-secondary text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
                INFO: {severityDist["INFO"] ?? 0}
              </span>
            </div>
          </div>

          {categoryDist["SECURITY"] !== undefined && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-danger-bg border border-danger-border text-danger-text text-xs font-medium">
              <ShieldAlert className="w-3.5 h-3.5 text-danger" />
              <span>Security Findings: {categoryDist["SECURITY"]}</span>
            </div>
          )}
        </div>

        {summary.confidence_distribution && (
          <div className="p-2.5 rounded-lg bg-surface-elevated border border-border-default flex items-center gap-3 flex-wrap text-xs shadow-xs">
            <span className="text-text-muted font-medium text-[11px] uppercase tracking-wider">
              Confidence Breakdown:
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-success-bg border border-success-border text-success-text text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                HIGH: {confDist["HIGH"] ?? 0}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-warning-bg border border-warning-border text-warning-text text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                MEDIUM: {confDist["MEDIUM"] ?? 0}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-hover border border-border-default text-text-muted text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-text-disabled" />
                LOW: {confDist["LOW"] ?? 0}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
