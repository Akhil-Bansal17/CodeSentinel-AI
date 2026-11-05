import React from "react";
import {
  CheckCircle2,
  Database,
  Package,
  ShieldAlert,
} from "lucide-react";
import { DependencyRun } from "../../types/dependency";

interface DependencySummaryCardsProps {
  run: DependencyRun;
}

export const DependencySummaryCards: React.FC<DependencySummaryCardsProps> = ({ run }) => {
  const summary = run.summary_json || {};
  const severityDist = summary.severity_distribution || {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFO: 0,
    UNKNOWN: 0,
  };

  const criticalCount = severityDist.CRITICAL || 0;
  const highCount = severityDist.HIGH || 0;
  const medCount = severityDist.MEDIUM || 0;
  const lowCount = severityDist.LOW || 0;

  const datasetStatus = summary.advisory_dataset_status || "UNKNOWN";
  const datasetVersion = summary.advisory_dataset_version || run.advisory_dataset_version || "Unavailable";

  const getDatasetBadge = () => {
    switch (datasetStatus) {
      case "POPULATED":
        return (
          <span className="text-[11px] px-2 py-0.5 rounded font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Active v{datasetVersion}
          </span>
        );
      case "EMPTY_VALID":
        return (
          <span className="text-[11px] px-2 py-0.5 rounded font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
            Empty Dataset
          </span>
        );
      default:
        return (
          <span className="text-[11px] px-2 py-0.5 rounded font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
            Unavailable
          </span>
        );
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Discovered */}
        <div className="p-3.5 rounded-lg bg-surface-card border border-border-default shadow-xs hover:border-border-strong transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 text-text-muted text-xs font-medium mb-1.5">
            <span>Discovered Packages</span>
            <div className="p-1 rounded bg-accent-subtle/50 text-accent">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-text-primary tracking-tight font-mono">
              {run.dependencies_discovered.toLocaleString()}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5 truncate">
              {summary.direct_count ?? 0} direct, {summary.transitive_count ?? 0} transitive
            </div>
          </div>
        </div>

        {/* Resolved Versions */}
        <div className="p-3.5 rounded-lg bg-surface-card border border-border-default shadow-xs hover:border-border-strong transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 text-text-muted text-xs font-medium mb-1.5">
            <span>Resolved Versions</span>
            <div className="p-1 rounded bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-text-primary tracking-tight font-mono">
              {run.dependencies_resolved.toLocaleString()}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">
              {run.dependencies_unresolved > 0 ? (
                <span className="text-amber-400 font-mono">{run.dependencies_unresolved} declared-only</span>
              ) : (
                <span className="text-emerald-400">100% lockfile-verified</span>
              )}
            </div>
          </div>
        </div>

        {/* Security Vulnerabilities */}
        <div className="p-3.5 rounded-lg bg-surface-card border border-border-default shadow-xs hover:border-border-strong transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 text-text-muted text-xs font-medium mb-1.5">
            <span>Vulnerabilities</span>
            <div className={`p-1 rounded ${run.vulnerabilities_count > 0 ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"}`}>
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className={`text-xl font-bold tracking-tight font-mono ${run.vulnerabilities_count > 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {run.vulnerabilities_count.toLocaleString()}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5 flex items-center gap-1.5 flex-wrap">
              {criticalCount > 0 && <span className="text-rose-400 font-semibold font-mono">{criticalCount} Critical</span>}
              {highCount > 0 && <span className="text-orange-400 font-semibold font-mono">{highCount} High</span>}
              {medCount > 0 && <span className="text-amber-400 font-mono">{medCount} Med</span>}
              {lowCount > 0 && <span className="text-sky-400 font-mono">{lowCount} Low</span>}
              {run.vulnerabilities_count === 0 && <span className="text-emerald-400">Zero matching advisories</span>}
            </div>
          </div>
        </div>

        {/* Advisory Dataset Provenance */}
        <div className="p-3.5 rounded-lg bg-surface-card border border-border-default shadow-xs hover:border-border-strong transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 text-text-muted text-xs font-medium mb-1.5">
            <span>Advisory Dataset</span>
            <div className="p-1 rounded bg-violet-500/10 text-violet-400">
              <Database className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="my-0.5">{getDatasetBadge()}</div>
            <div className="text-[11px] text-text-muted mt-1 truncate">
              {run.manifest_files_count} manifest{run.manifest_files_count !== 1 ? "s" : ""} scanned
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
