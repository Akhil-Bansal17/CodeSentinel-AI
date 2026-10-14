import React from "react";
import {
  AlertTriangle,
  Boxes,
  GitFork,
  Network,
  RotateCw,
  ShieldCheck,
} from "lucide-react";
import { ArchitectureRun } from "../../types/architecture";

interface ArchitectureSummaryCardsProps {
  run: ArchitectureRun;
}

export const ArchitectureSummaryCards: React.FC<ArchitectureSummaryCardsProps> = ({ run }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* Modules Analyzed */}
      <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d]">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium mb-1">
          <Boxes className="w-3.5 h-3.5 text-sky-400" />
          <span>Modules</span>
        </div>
        <div className="text-xl font-bold text-slate-100">
          {run.modules_analyzed.toLocaleString()}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">Analyzed source files</div>
      </div>

      {/* Internal Edges */}
      <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d]">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium mb-1">
          <Network className="w-3.5 h-3.5 text-indigo-400" />
          <span>Internal Edges</span>
        </div>
        <div className="text-xl font-bold text-slate-100">
          {run.internal_edges_count.toLocaleString()}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">Static module imports</div>
      </div>

      {/* External Dependencies */}
      <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d]">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium mb-1">
          <GitFork className="w-3.5 h-3.5 text-purple-400" />
          <span>External Deps</span>
        </div>
        <div className="text-xl font-bold text-slate-100">
          {run.external_deps_count.toLocaleString()}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">Stdlib & 3rd-party pkgs</div>
      </div>

      {/* Unresolved Imports */}
      <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d]">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium mb-1">
          <AlertTriangle className={`w-3.5 h-3.5 ${run.unresolved_count > 0 ? "text-amber-400" : "text-slate-400"}`} />
          <span>Unresolved</span>
        </div>
        <div className={`text-xl font-bold ${run.unresolved_count > 0 ? "text-amber-300" : "text-slate-100"}`}>
          {run.unresolved_count.toLocaleString()}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">Broken/dynamic paths</div>
      </div>

      {/* Circular Cycles */}
      <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d]">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium mb-1">
          <RotateCw className={`w-3.5 h-3.5 ${run.cycles_count > 0 ? "text-rose-400" : "text-emerald-400"}`} />
          <span>Cycles</span>
        </div>
        <div className={`text-xl font-bold ${run.cycles_count > 0 ? "text-rose-400" : "text-emerald-400"}`}>
          {run.cycles_count.toLocaleString()}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">Circular components</div>
      </div>

      {/* Governance Violations */}
      <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d]">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium mb-1">
          <ShieldCheck className={`w-3.5 h-3.5 ${run.violations_count > 0 ? "text-rose-400" : "text-emerald-400"}`} />
          <span>Violations</span>
        </div>
        <div className={`text-xl font-bold ${run.violations_count > 0 ? "text-rose-400" : "text-emerald-400"}`}>
          {run.violations_count.toLocaleString()}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">
          {run.policy_configured ? "Policy Active" : "No Policy Configured"}
        </div>
      </div>
    </div>
  );
};
