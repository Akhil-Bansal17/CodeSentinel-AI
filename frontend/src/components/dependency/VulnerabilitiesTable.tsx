import React from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  ShieldAlert,
  Wrench,
  X,
} from "lucide-react";
import { DependencyVulnerability } from "../../types/dependency";
import { Button } from "../common/Button";

interface VulnerabilitiesTableProps {
  vulnerabilities: DependencyVulnerability[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  selectedSeverity: string;
  onSeverityChange: (sev: string) => void;
  selectedEcosystem: string;
  onEcosystemChange: (eco: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectVulnerability: (vuln: DependencyVulnerability) => void;
}

export const VulnerabilitiesTable: React.FC<VulnerabilitiesTableProps> = ({
  vulnerabilities,
  total,
  page,
  pageSize,
  onPageChange,
  selectedSeverity,
  onSeverityChange,
  selectedEcosystem,
  onEcosystemChange,
  searchQuery,
  onSearchChange,
  onSelectVulnerability,
}) => {
  const totalPages = Math.ceil(total / pageSize) || 1;

  const getSeverityBadge = (sev: string) => {
    switch (sev.toUpperCase()) {
      case "CRITICAL":
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold font-mono rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
            CRITICAL
          </span>
        );
      case "HIGH":
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold font-mono rounded bg-orange-500/15 text-orange-300 border border-orange-500/30">
            HIGH
          </span>
        );
      case "MEDIUM":
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold font-mono rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
            MEDIUM
          </span>
        );
      case "LOW":
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold font-mono rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
            LOW
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold font-mono rounded bg-surface-elevated text-text-muted border border-border-default">
            UNKNOWN
          </span>
        );
    }
  };

  const hasActiveFilters = Boolean(searchQuery || selectedSeverity || selectedEcosystem);

  const handleResetFilters = () => {
    onSearchChange("");
    onSeverityChange("");
    onEcosystemChange("");
    onPageChange(1);
  };

  return (
    <div className="space-y-3">
      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 rounded-lg bg-surface-card border border-border-default shadow-xs">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 sm:max-w-xs md:max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search package or advisory ID..."
              aria-label="Search package or advisory ID"
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                onPageChange(1);
              }}
              className="w-full h-8 pl-9 pr-8 py-1.5 text-xs font-mono bg-surface-base border border-border-default rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  onSearchChange("");
                  onPageChange(1);
                }}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 rounded cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Severity filter */}
          <div className="relative">
            <select
              value={selectedSeverity}
              onChange={(e) => {
                onSeverityChange(e.target.value);
                onPageChange(1);
              }}
              aria-label="Filter by severity"
              className={`h-8 pl-2.5 pr-7 py-1 text-xs rounded-md bg-surface-base border text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent appearance-none cursor-pointer transition-colors ${
                selectedSeverity
                  ? "border-accent-border bg-accent-subtle/20 font-medium text-accent"
                  : "border-border-default"
              }`}
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Ecosystem filter */}
          <div className="relative">
            <select
              value={selectedEcosystem}
              onChange={(e) => {
                onEcosystemChange(e.target.value);
                onPageChange(1);
              }}
              aria-label="Filter by ecosystem"
              className={`h-8 pl-2.5 pr-7 py-1 text-xs rounded-md bg-surface-base border text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent appearance-none cursor-pointer transition-colors ${
                selectedEcosystem
                  ? "border-accent-border bg-accent-subtle/20 font-medium text-accent"
                  : "border-border-default"
              }`}
            >
              <option value="">All Ecosystems</option>
              <option value="pypi">Python (PyPI)</option>
              <option value="npm">Node.js (npm)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-8 px-2 text-text-muted hover:text-text-primary text-xs"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border-default bg-surface-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-base text-text-muted uppercase font-semibold text-[11px] tracking-wider border-b border-border-subtle">
              <tr>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Advisory ID</th>
                <th className="py-2.5 px-3">Package</th>
                <th className="py-2.5 px-3">Ecosystem</th>
                <th className="py-2.5 px-3">Affected Range</th>
                <th className="py-2.5 px-3">Resolved</th>
                <th className="py-2.5 px-3">Remediation</th>
                <th className="py-2.5 px-3">Manifest</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-text-secondary">
              {vulnerabilities.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-text-muted space-y-2">
                    <ShieldAlert className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
                    <p>No vulnerability findings matching current filters.</p>
                    {hasActiveFilters && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleResetFilters}
                      >
                        Clear all filters
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                vulnerabilities.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => onSelectVulnerability(v)}
                    className="hover:bg-surface-elevated/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-2.5 px-3">{getSeverityBadge(v.severity)}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-semibold text-text-primary group-hover:text-accent transition-colors">
                        {v.advisory_id}
                      </div>
                      {v.cve_ids && v.cve_ids.length > 0 && (
                        <div className="text-[10px] text-text-muted font-mono mt-0.5">
                          {v.cve_ids[0]}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-text-primary font-mono">{v.package_name}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-surface-base text-text-muted border border-border-default">
                        {v.ecosystem}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-rose-300 font-medium">
                      {v.affected_range}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-text-secondary">
                      {v.resolved_version || "—"}
                    </td>
                    <td className="py-2.5 px-3">
                      {v.remediation_version ? (
                        <span className="inline-flex items-center gap-1 font-mono text-emerald-400 text-[11px]">
                          <Wrench className="w-3 h-3 text-emerald-400 shrink-0" />
                          Fix: {v.remediation_version}
                        </span>
                      ) : (
                        <span className="text-text-muted text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-text-muted text-[11px] max-w-[140px] truncate" title={v.manifest_path}>
                      {v.manifest_path}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {total > pageSize && (
          <div className="flex items-center justify-between p-3 border-t border-border-subtle bg-surface-base text-xs text-text-muted">
            <div>
              Showing {vulnerabilities.length} of {total} findings
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
              >
                Previous
              </Button>
              <span className="font-mono text-text-primary px-1">
                Page {page} of {totalPages}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
