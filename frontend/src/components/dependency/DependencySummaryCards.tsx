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
        return <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Active v{datasetVersion}</span>;
      case "EMPTY_VALID":
        return <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">Empty Dataset</span>;
      default:
        return <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-rose-500/10 text-rose-400 border border-rose-500/30">Unavailable</span>;
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Discovered */}
        <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d]">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
            <Package className="w-3.5 h-3.5 text-sky-400" />
            <span>Discovered Packages</span>
          </div>
          <div className="text-xl font-bold text-slate-100">
            {run.dependencies_discovered.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {summary.direct_count ?? 0} direct, {summary.transitive_count ?? 0} transitive
          </div>
        </div>

        {/* Resolved Versions */}
        <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d]">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Resolved Versions</span>
          </div>
          <div className="text-xl font-bold text-slate-100">
            {run.dependencies_resolved.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {run.dependencies_unresolved > 0 ? (
              <span className="text-amber-400">{run.dependencies_unresolved} declared-only</span>
            ) : (
              <span className="text-emerald-400">100% lockfile-verified</span>
            )}
          </div>
        </div>

        {/* Security Vulnerabilities */}
        <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d]">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Vulnerabilities</span>
          </div>
          <div className={`text-xl font-bold ${run.vulnerabilities_count > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {run.vulnerabilities_count.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
            {criticalCount > 0 && <span className="text-rose-400 font-semibold">{criticalCount} Critical</span>}
            {highCount > 0 && <span className="text-orange-400 font-semibold">{highCount} High</span>}
            {medCount > 0 && <span className="text-amber-400">{medCount} Med</span>}
            {lowCount > 0 && <span className="text-sky-400">{lowCount} Low</span>}
            {run.vulnerabilities_count === 0 && <span className="text-emerald-400">Zero matching advisories</span>}
          </div>
        </div>

        {/* Advisory Dataset Provenance */}
        <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d]">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>Advisory Dataset</span>
            </div>
          </div>
          <div className="my-1">{getDatasetBadge()}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
            {run.manifest_files_count} manifest{run.manifest_files_count !== 1 ? "s" : ""} scanned
          </div>
        </div>
      </div>
    </div>
  );
};
