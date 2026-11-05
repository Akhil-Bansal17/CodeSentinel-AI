import React from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Package,
  Search,
  X,
} from "lucide-react";
import { RepositoryDependency } from "../../types/dependency";
import { Button } from "../common/Button";

interface DependencyInventoryTableProps {
  dependencies: RepositoryDependency[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  selectedEcosystem: string;
  onEcosystemChange: (eco: string) => void;
  selectedDirect: string;
  onDirectChange: (dir: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const DependencyInventoryTable: React.FC<DependencyInventoryTableProps> = ({
  dependencies,
  total,
  page,
  pageSize,
  onPageChange,
  selectedEcosystem,
  onEcosystemChange,
  selectedDirect,
  onDirectChange,
  selectedStatus,
  onStatusChange,
  searchQuery,
  onSearchChange,
}) => {
  const totalPages = Math.ceil(total / pageSize) || 1;

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "resolved":
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Resolved
          </span>
        );
      case "unresolved":
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
            Declared Only
          </span>
        );
      case "unsupported":
      case "unsupported_editable":
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-surface-elevated text-text-muted border border-border-default">
            Unsupported
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-surface-elevated text-text-muted border border-border-default">
            {status}
          </span>
        );
    }
  };

  const hasActiveFilters = Boolean(
    searchQuery || selectedDirect || selectedEcosystem || selectedStatus
  );

  const handleResetFilters = () => {
    onSearchChange("");
    onDirectChange("");
    onEcosystemChange("");
    onStatusChange("");
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
              placeholder="Search package name..."
              aria-label="Search package name"
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
          {/* Direct / Transitive filter */}
          <div className="relative">
            <select
              value={selectedDirect}
              onChange={(e) => {
                onDirectChange(e.target.value);
                onPageChange(1);
              }}
              aria-label="Filter by dependency classification"
              className={`h-8 pl-2.5 pr-7 py-1 text-xs rounded-md bg-surface-base border text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent appearance-none cursor-pointer transition-colors ${
                selectedDirect
                  ? "border-accent-border bg-accent-subtle/20 font-medium text-accent"
                  : "border-border-default"
              }`}
            >
              <option value="">All Types (Direct & Transitive)</option>
              <option value="direct">Direct Only</option>
              <option value="transitive">Transitive Only</option>
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

          {/* Status filter */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => {
                onStatusChange(e.target.value);
                onPageChange(1);
              }}
              aria-label="Filter by status"
              className={`h-8 pl-2.5 pr-7 py-1 text-xs rounded-md bg-surface-base border text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent appearance-none cursor-pointer transition-colors ${
                selectedStatus
                  ? "border-accent-border bg-accent-subtle/20 font-medium text-accent"
                  : "border-border-default"
              }`}
            >
              <option value="">All Statuses</option>
              <option value="resolved">Resolved</option>
              <option value="unresolved">Declared Only</option>
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
                <th className="py-2.5 px-3">Package</th>
                <th className="py-2.5 px-3">Ecosystem</th>
                <th className="py-2.5 px-3">Classification</th>
                <th className="py-2.5 px-3">Declared Constraint</th>
                <th className="py-2.5 px-3">Resolved Version</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Manifest</th>
                <th className="py-2.5 px-3">Lockfile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-text-secondary">
              {dependencies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-text-muted space-y-2">
                    <Package className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
                    <p>No dependencies discovered matching current filters.</p>
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
                dependencies.map((d) => (
                  <tr key={d.id} className="hover:bg-surface-elevated/40 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-text-primary font-mono">
                      {d.package_name}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-surface-base text-text-muted border border-border-default">
                        {d.ecosystem}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {d.is_direct ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent-subtle text-accent border border-accent-border">
                          Direct
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-elevated text-text-muted border border-border-default">
                          Transitive
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-text-muted">
                      {d.version_constraint || "—"}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-text-primary">
                      {d.resolved_version || "—"}
                    </td>
                    <td className="py-2.5 px-3">{getStatusBadge(d.status)}</td>
                    <td className="py-2.5 px-3 font-mono text-text-muted text-[11px] max-w-[130px] truncate" title={d.manifest_path}>
                      {d.manifest_path}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-text-muted text-[11px] max-w-[130px] truncate" title={d.lockfile_path || "—"}>
                      {d.lockfile_path || "—"}
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
              Showing {dependencies.length} of {total} packages
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
