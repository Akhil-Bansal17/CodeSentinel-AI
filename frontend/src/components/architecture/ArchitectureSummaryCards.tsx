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
      <div className="p-3.5 rounded-lg bg-surface-card border border-border-default shadow-xs">
        <div className="flex items-center gap-1.5 text-text-muted text-xs font-medium mb-1">
          <Boxes className="w-3.5 h-3.5 text-accent" />
          <span>Modules</span>
        </div>
        <div className="text-xl font-bold text-text-primary">
          {run.modules_analyzed.toLocaleString()}
        </div>
        <div className="text-[11px] text-text-muted mt-0.5">Analyzed source files</div>
      </div>

      {/* Internal Edges */}
      <div className="p-3.5 rounded-lg bg-surface-card border border-border-default shadow-xs">
        <div className="flex items-center gap-1.5 text-text-muted text-xs font-medium mb-1">
          <Network className="w-3.5 h-3.5 text-accent" />
          <span>Internal Edges</span>
        </div>
        <div className="text-xl font-bold text-text-primary">
          {run.internal_edges_count.toLocaleString()}
        </div>
        <div className="text-[11px] text-text-muted mt-0.5">Static module imports</div>
      </div>

      {/* External Dependencies */}
      <div className="p-3.5 rounded-lg bg-surface-card border border-border-default shadow-xs">
        <div className="flex items-center gap-1.5 text-text-muted text-xs font-medium mb-1">
          <GitFork className="w-3.5 h-3.5 text-purple-400" />
          <span>External Deps</span>
        </div>
        <div className="text-xl font-bold text-text-primary">
          {run.external_deps_count.toLocaleString()}
        </div>
        <div className="text-[11px] text-text-muted mt-0.5">Stdlib & 3rd-party pkgs</div>
      </div>

      {/* Unresolved Imports */}
      <div className="p-3.5 rounded-lg bg-surface-card border border-border-default shadow-xs">
        <div className="flex items-center gap-1.5 text-text-muted text-xs font-medium mb-1">
          <AlertTriangle className={`w-3.5 h-3.5 ${run.unresolved_count > 0 ? "text-warning" : "text-text-disabled"}`} />
          <span>Unresolved</span>
        </div>
        <div className={`text-xl font-bold ${run.unresolved_count > 0 ? "text-warning-text" : "text-text-primary"}`}>
          {run.unresolved_count.toLocaleString()}
        </div>
        <div className="text-[11px] text-text-muted mt-0.5">Broken/dynamic paths</div>
      </div>

      {/* Circular Cycles */}
      <div className="p-3.5 rounded-lg bg-surface-card border border-border-default shadow-xs">
        <div className="flex items-center gap-1.5 text-text-muted text-xs font-medium mb-1">
          <RotateCw className={`w-3.5 h-3.5 ${run.cycles_count > 0 ? "text-danger" : "text-success"}`} />
          <span>Cycles</span>
        </div>
        <div className={`text-xl font-bold ${run.cycles_count > 0 ? "text-danger-text" : "text-success-text"}`}>
          {run.cycles_count.toLocaleString()}
        </div>
        <div className="text-[11px] text-text-muted mt-0.5">Circular components</div>
      </div>

      {/* Governance Violations */}
      <div className="p-3.5 rounded-lg bg-surface-card border border-border-default shadow-xs">
        <div className="flex items-center gap-1.5 text-text-muted text-xs font-medium mb-1">
          <ShieldCheck className={`w-3.5 h-3.5 ${run.violations_count > 0 ? "text-danger" : "text-success"}`} />
          <span>Violations</span>
        </div>
        <div className={`text-xl font-bold ${run.violations_count > 0 ? "text-danger-text" : "text-success-text"}`}>
          {run.violations_count.toLocaleString()}
        </div>
        <div className="text-[11px] text-text-muted mt-0.5">
          {run.policy_configured ? "Policy Active" : "No Policy Configured"}
        </div>
      </div>
    </div>
  );
};

