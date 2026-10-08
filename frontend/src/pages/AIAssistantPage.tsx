import React from "react";
import { Bot, ShieldCheck } from "lucide-react";
import { StatusBadge } from "../components/common/StatusBadge";

export const AIAssistantPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-[#21262d]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-100">AI Codebase Assistant &amp; Agency</h2>
            <StatusBadge label="Coming in Phase 3" variant="neutral" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Grounded reasoning, prioritized engineering recommendations, and safe agentic proposals
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-8 text-center max-w-2xl mx-auto space-y-4">
        <div className="w-12 h-12 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center mx-auto text-emerald-400">
          <Bot className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-200">
          Evidence-Grounded AI Scheduled for Phase 3
        </h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          The AI layer will never operate blindly on hallucinated code. It is designed to consume
          the verified deterministic findings, metrics, and AST symbols produced by earlier phases.
        </p>

        <div className="p-4 rounded-lg bg-[#0d1117] border border-[#21262d] text-left text-xs space-y-2">
          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Safety Constraints in Phase 3:</span>
          </div>
          <ul className="text-slate-400 space-y-1 list-disc list-inside">
            <li>Zero automatic remote code modifications without user verification</li>
            <li>All recommendations cite exact AST line numbers and finding IDs</li>
            <li>Proposed diffs must pass deterministic validation checks before merge</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
