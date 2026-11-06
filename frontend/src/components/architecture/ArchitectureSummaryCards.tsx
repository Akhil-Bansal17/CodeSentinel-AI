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
      <div className="p-3.5 rounded-lg bg-surface-card border border-border-default shadow-xs hover:border-border-strong transition-colors flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1.5 text-text-muted text-xs font-medium mb-1.5">
          <span>Modules</span>
          <div className="p-1 rounded bg-accent-subtle/50 text-accent">
            <Boxes className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <div className="text-xl font-bold text-text-primary tracking-tight font-mono">
            {run.modules_analyzed.toLocaleString()}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5 truncate">Analyzed source files</div>
        </div>
      </div>

      {/* Internal Edges */}
      <div className="p-3.5 rounded-lg bg-surface-card border border-border-default shadow-xs hover:border-border-strong transition-colors flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1.5 text-text-muted text-xs font-medium mb-1.5">
          <span>Internal Edges</span>
          <div className="p-1 rounded bg-accent-subtle/50 text-accent">
            <Network className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <div className="text-xl font-bold text-text-primary tracking-tight font-mono">
            {run.internal_edges_count.toLocaleString()}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5 truncate">Static module imports</div>
        </div>
      </div>

      {/* External Dependencies */}
      <div className="p-3.5 rounded-lg bg-surface-card border border-border-default shadow-xs hover:border-border-strong transition-colors flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1.5 text-text-muted text-xs font-medium mb-1.5">
          <span>External Deps</span>
          <div className="p-1 rounded bg-violet-500/10 text-violet-400">
            <GitFork className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <div className="text-xl font-bold text-text-primary tracking-tight font-mono">
            {run.external_deps_count.toLocaleString()}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5 truncate">Stdlib & 3rd-party pkgs</div>
        </div>
      </div>

      {/* Unresolved Imports */}
      <div className="p-3.5 rounded-lg bg-surface-card border border-border-default shadow-xs hover:border-border-strong transition-colors flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1.5 text-text-muted text-xs font-medium mb-1.5">
          <span>Unresolved</span>
          <div className={`p-1 rounded ${run.unresolved_count > 0 ? "bg-amber-500/10 text-amber-400" : "bg-surface-elevated text-text-muted"}`}>
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <div className={`text-xl font-bold tracking-tight font-mono ${run.unresolved_count > 0 ? "text-amber-400" : "text-text-primary"}`}>
            {run.unresolved_count.toLocaleString()}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5 truncate">Broken/dynamic paths</div>
        </div>
      </div>

      {/* Circular Cycles */}
      <div className="p-3.5 rounded-lg bg-surface-card border border-border-default shadow-xs hover:border-border-strong transition-colors flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1.5 text-text-muted text-xs font-medium mb-1.5">
          <span>Cycles</span>
          <div className={`p-1 rounded ${run.cycles_count > 0 ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"}`}>
            <RotateCw className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <div className={`text-xl font-bold tracking-tight font-mono ${run.cycles_count > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {run.cycles_count.toLocaleString()}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5 truncate">Circular components</div>
        </div>
      </div>

      {/* Governance Violations */}
      <div className="p-3.5 rounded-lg bg-surface-card border border-border-default shadow-xs hover:border-border-strong transition-colors flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1.5 text-text-muted text-xs font-medium mb-1.5">
          <span>Violations</span>
          <div className={`p-1 rounded ${run.violations_count > 0 ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"}`}>
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <div className={`text-xl font-bold tracking-tight font-mono ${run.violations_count > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {run.violations_count.toLocaleString()}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5 truncate">
            {run.policy_configured ? "Policy Active" : "No Policy Configured"}
          </div>
        </div>
      </div>
    </div>
  );
};
