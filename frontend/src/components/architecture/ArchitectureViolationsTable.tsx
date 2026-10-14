import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  ShieldAlert,
} from "lucide-react";
import { ArchitectureSeverity, ArchitectureViolation } from "../../types/architecture";

interface ArchitectureViolationsTableProps {
  violations: ArchitectureViolation[];
  total: number;
  page: number;
  pageSize: number;
  severityFilter?: string;
  onPageChange: (newPage: number) => void;
  onSeverityFilterChange: (severity?: string) => void;
  isLoading: boolean;
}

export const ArchitectureViolationsTable: React.FC<ArchitectureViolationsTableProps> = ({
  violations,
  total,
  page,
  pageSize,
  severityFilter,
  onPageChange,
  onSeverityFilterChange,
  isLoading,
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const getSeverityBadge = (sev: ArchitectureSeverity) => {
    switch (sev) {
      case "CRITICAL":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30">CRITICAL</span>;
      case "HIGH":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-orange-500/20 text-orange-400 border border-orange-500/30">HIGH</span>;
      case "MEDIUM":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30">MEDIUM</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-sky-500/20 text-sky-400 border border-sky-500/30">{sev}</span>;
    }
  };

  return (
    <div className="space-y-3">
      {/* Filter Toolbar */}
      <div className="flex items-center justify-between p-3 bg-[#161b22] border border-[#30363d] rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-300 font-medium">Filter Severity:</span>
          <div className="flex items-center gap-1">
            {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((s) => {
              const active = (!severityFilter && s === "ALL") || severityFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => onSeverityFilterChange(s === "ALL" ? undefined : s)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    active
                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold"
                      : "bg-[#0d1117] text-slate-400 hover:text-slate-200 border border-[#30363d]"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-xs text-slate-400">
          Total Violations: <span className="font-bold text-slate-200">{total}</span>
        </div>
      </div>

      {/* Violations Table */}
      <div className="border border-[#30363d] rounded-lg overflow-hidden bg-[#161b22]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0d1117] border-b border-[#30363d] text-slate-400 uppercase font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Rule ID</th>
                <th className="py-2.5 px-3">Boundary</th>
                <th className="py-2.5 px-3">Source Module</th>
                <th className="py-2.5 px-3">Target Module</th>
                <th className="py-2.5 px-3">Description & Remediation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d]/60 font-mono">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                    Loading architecture violations...
                  </td>
                </tr>
              ) : violations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShieldAlert className="w-6 h-6 text-emerald-400" />
                      <span className="text-slate-300 font-medium">Zero architectural violations detected.</span>
                      <span className="text-[11px] text-slate-400">All module dependencies conform to active boundary rules.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                violations.map((v) => (
                  <tr key={v.id} className="hover:bg-[#21262d]/50 transition-colors">
                    <td className="py-3 px-3 shrink-0">{getSeverityBadge(v.severity)}</td>
                    <td className="py-3 px-3 font-bold text-slate-200 whitespace-nowrap">{v.rule_id}</td>
                    <td className="py-3 px-3 text-amber-300 font-semibold whitespace-nowrap">
                      {v.violated_boundary}
                    </td>
                    <td className="py-3 px-3 text-slate-300 max-w-xs truncate" title={v.source_module}>
                      {v.source_module} <span className="text-slate-400 text-[10px]">:L{v.line_number}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 max-w-xs truncate" title={v.target_module}>
                      {v.target_module}
                    </td>
                    <td className="py-3 px-3 font-sans text-xs space-y-1">
                      <div className="text-slate-200">{v.description}</div>
                      {v.remediation && (
                        <div className="text-emerald-400 text-[11px] font-mono bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-500/20">
                          {v.remediation}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 border-t border-[#30363d] flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing {violations.length} of {total.toLocaleString()} violations
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1 rounded bg-[#0d1117] border border-[#30363d] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#30363d]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1 rounded bg-[#0d1117] border border-[#30363d] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#30363d]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
