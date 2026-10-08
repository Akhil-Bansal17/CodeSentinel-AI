import React from "react";
import { Clock, ShieldAlert, Cpu } from "lucide-react";
import { StatusBadge } from "../components/common/StatusBadge";

export const AnalysisPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-[#21262d]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-100">Deterministic Analysis Engine</h2>
            <StatusBadge label="Coming in Phase 1" variant="neutral" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Verified static analysis, SAST, dependency intelligence, and test metrics
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-8 text-center max-w-2xl mx-auto space-y-4">
        <div className="w-12 h-12 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center mx-auto text-sky-400">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-200">
          Analysis Pipeline is Being Built in Phase 1
        </h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          CodeSentinel AI adheres strictly to truthfulness: no fake scores (such as "Code Quality: 92")
          will appear here until the deterministic AST parsing, rule evaluation, and static analyzers
          are implemented in Phase 1.
        </p>

        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <div className="p-3 rounded bg-[#0d1117] border border-[#21262d] text-xs space-y-1">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span>Static Engine</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              AST parsing, complexity metrics, dead code detection
            </p>
          </div>

          <div className="p-3 rounded bg-[#0d1117] border border-[#21262d] text-xs space-y-1">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Security Engine</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              SAST scanning, secrets detection, CVE correlation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
