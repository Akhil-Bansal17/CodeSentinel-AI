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

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Findings */}
        <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d]">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Total Findings</span>
          </div>
          <div className="text-xl font-bold text-slate-100">
            {run.findings_count.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Static analysis issues</div>
        </div>

        {/* Analyzed Files */}
        <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d]">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
            <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Analyzed Files</span>
          </div>
          <div className="text-xl font-bold text-slate-100">
            {run.files_analyzed.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Parsed via AST</div>
        </div>

        {/* Skipped Files */}
        <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d]">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
            <FileX className="w-3.5 h-3.5 text-slate-400" />
            <span>Skipped Files</span>
          </div>
          <div className="text-xl font-bold text-slate-100">
            {run.files_skipped.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Non-source / bounded limits</div>
        </div>

        {/* Rule-set Version */}
        <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d]">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
            <AlertCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>Engine Version</span>
          </div>
          <div className="text-xl font-bold text-slate-100 font-mono">
            v{run.rule_set_version}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Deterministic ruleset</div>
        </div>
      </div>

      {/* Severity Breakdown Strip */}
      <div className="p-3 rounded-lg bg-[#161b22] border border-[#30363d] flex items-center gap-3 flex-wrap text-xs">
        <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">
          Severity Breakdown:
        </span>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            CRITICAL: {severityDist["CRITICAL"] ?? 0}
          </span>

          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-orange-950/60 border border-orange-800/80 text-orange-300 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            HIGH: {severityDist["HIGH"] ?? 0}
          </span>

          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/80 text-amber-300 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            MEDIUM: {severityDist["MEDIUM"] ?? 0}
          </span>

          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-sky-950/60 border border-sky-800/80 text-sky-300 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            LOW: {severityDist["LOW"] ?? 0}
          </span>

          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            INFO: {severityDist["INFO"] ?? 0}
          </span>
        </div>
      </div>
    </div>
  );
};
