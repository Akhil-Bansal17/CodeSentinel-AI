import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  ShieldAlert,
} from "lucide-react";
import { ArchitectureSeverity, ArchitectureViolation } from "../../types/architecture";
import { Button } from "../common/Button";

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
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-500/10 text-rose-400 border border-rose-500/30">
            CRITICAL
          </span>
        );
      case "HIGH":
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-orange-500/10 text-orange-400 border border-orange-500/30">
            HIGH
          </span>
        );
      case "MEDIUM":
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-accent-subtle text-accent border border-accent-border">
            {sev}
          </span>
        );
    }
  };

  return (
    <div className="space-y-3">
      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-surface-card border border-border-default rounded-lg shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-text-muted" />
          <span className="text-xs text-text-muted font-medium">Filter Severity:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((s) => {
              const active = (!severityFilter && s === "ALL") || severityFilter === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSeverityFilterChange(s === "ALL" ? undefined : s)}
                  className={`px-2 py-0.5 rounded text-xs font-mono transition-colors cursor-pointer ${
                    active
                      ? "bg-accent-subtle text-accent border border-accent-border font-semibold shadow-xs"
                      : "bg-surface-base text-text-muted hover:text-text-primary border border-border-default"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-xs text-text-muted flex items-center gap-1.5">
          <span>Total Violations:</span>
          <span className="font-mono font-bold text-text-primary">{total.toLocaleString()}</span>
        </div>
      </div>

      {/* Violations Table */}
      <div className="border border-border-default rounded-lg overflow-hidden bg-surface-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-base border-b border-border-subtle text-text-muted uppercase font-mono text-[11px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Rule ID</th>
                <th className="py-2.5 px-3">Boundary</th>
                <th className="py-2.5 px-3">Source Module</th>
                <th className="py-2.5 px-3">Target Module</th>
                <th className="py-2.5 px-3">Description & Remediation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle font-mono text-text-secondary">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-text-muted font-sans">
                    Loading architecture violations...
                  </td>
                </tr>
              ) : violations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-text-muted font-sans space-y-2">
                    <ShieldAlert className="w-8 h-8 text-emerald-400 mx-auto opacity-75" />
                    <div className="text-text-primary font-medium text-xs">Zero architectural violations detected.</div>
                    <div className="text-[11px] text-text-muted">All module dependencies conform to active boundary rules.</div>
                  </td>
                </tr>
              ) : (
                violations.map((v) => (
                  <tr key={v.id} className="hover:bg-surface-elevated/40 transition-colors">
                    <td className="py-3 px-3 shrink-0">{getSeverityBadge(v.severity)}</td>
                    <td className="py-3 px-3 font-bold text-text-primary whitespace-nowrap">{v.rule_id}</td>
                    <td className="py-3 px-3 text-amber-400 font-semibold whitespace-nowrap">
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
                        <div className="text-emerald-400 text-[11px] font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
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
        <div className="p-3 border-t border-border-subtle bg-surface-base flex items-center justify-between text-xs text-text-muted">
          <div>
            Showing {violations.length} of {total.toLocaleString()} violations
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || isLoading}
              aria-label="Previous page"
              leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
            >
              Previous
            </Button>
            <span className="px-2 font-mono text-text-primary">
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
              aria-label="Next page"
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
