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
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-status-danger/10 text-status-danger border border-status-danger/30">CRITICAL</span>;
      case "HIGH":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-status-warning/10 text-status-warning border border-status-warning/30">HIGH</span>;
      case "MEDIUM":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">MEDIUM</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-accent-subtle text-accent border border-accent-border">{sev}</span>;
    }
  };

  return (
    <div className="space-y-3">
      {/* Filter Toolbar */}
      <div className="flex items-center justify-between p-3 bg-surface-card border border-border-default rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted" />
          <span className="text-xs text-text-secondary font-medium">Filter Severity:</span>
          <div className="flex items-center gap-1">
            {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((s) => {
              const active = (!severityFilter && s === "ALL") || severityFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => onSeverityFilterChange(s === "ALL" ? undefined : s)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                    active
                      ? "bg-accent-subtle text-accent border border-accent-border font-semibold"
                      : "bg-surface-base text-text-muted hover:text-text-primary border border-border-default"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-xs text-text-muted">
          Total Violations: <span className="font-bold text-text-primary">{total}</span>
        </div>
      </div>

      {/* Violations Table */}
      <div className="border border-border-default rounded-lg overflow-hidden bg-surface-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-base border-b border-border-default text-text-muted uppercase font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Rule ID</th>
                <th className="py-2.5 px-3">Boundary</th>
                <th className="py-2.5 px-3">Source Module</th>
                <th className="py-2.5 px-3">Target Module</th>
                <th className="py-2.5 px-3">Description & Remediation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default/60 font-mono">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-muted font-sans">
                    Loading architecture violations...
                  </td>
                </tr>
              ) : violations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-muted font-sans">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShieldAlert className="w-6 h-6 text-status-success" />
                      <span className="text-text-primary font-medium">Zero architectural violations detected.</span>
                      <span className="text-[11px] text-text-muted">All module dependencies conform to active boundary rules.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                violations.map((v) => (
                  <tr key={v.id} className="hover:bg-surface-overlay/50 transition-colors">
                    <td className="py-3 px-3 shrink-0">{getSeverityBadge(v.severity)}</td>
                    <td className="py-3 px-3 font-bold text-text-primary whitespace-nowrap">{v.rule_id}</td>
                    <td className="py-3 px-3 text-status-warning font-semibold whitespace-nowrap">
                      {v.violated_boundary}
                    </td>
                    <td className="py-3 px-3 text-text-secondary max-w-xs truncate" title={v.source_module}>
                      {v.source_module} <span className="text-text-muted text-[10px]">:L{v.line_number}</span>
                    </td>
                    <td className="py-3 px-3 text-text-secondary max-w-xs truncate" title={v.target_module}>
                      {v.target_module}
                    </td>
                    <td className="py-3 px-3 font-sans text-xs space-y-1">
                      <div className="text-text-primary">{v.description}</div>
                      {v.remediation && (
                        <div className="text-status-success text-[11px] font-mono bg-status-success/10 px-2 py-0.5 rounded border border-status-success/20">
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
        <div className="p-3 border-t border-border-default flex items-center justify-between text-xs text-text-muted">
          <div>
            Showing {violations.length} of {total.toLocaleString()} violations
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
              className="p-1 rounded bg-surface-base border border-border-default text-text-secondary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-overlay cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              aria-label="Next page"
              className="p-1 rounded bg-surface-base border border-border-default text-text-secondary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-overlay cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
