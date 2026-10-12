import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Package,
  Search,
} from "lucide-react";
import { RepositoryDependency } from "../../types/dependency";

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
        return <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Resolved</span>;
      case "unresolved":
        return <span className="px-1.5 py-0.5 text-[10px] rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">Declared Only</span>;
      case "unsupported":
      case "unsupported_editable":
        return <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-500/10 text-slate-400 border border-slate-500/30">Unsupported</span>;
      default:
        return <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-500/10 text-slate-400 border border-slate-500/30">{status}</span>;
    }
  };

  return (
    <div className="space-y-3">
      {/* Filters Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 rounded-lg bg-[#161b22] border border-[#30363d]">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search package name..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0d1117] border border-[#30363d] rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Direct / Transitive filter */}
          <select
            value={selectedDirect}
            onChange={(e) => onDirectChange(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-[#0d1117] border border-[#30363d] rounded-md text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Types (Direct & Transitive)</option>
            <option value="direct">Direct Only</option>
            <option value="transitive">Transitive Only</option>
          </select>

          {/* Ecosystem filter */}
          <select
            value={selectedEcosystem}
            onChange={(e) => onEcosystemChange(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-[#0d1117] border border-[#30363d] rounded-md text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Ecosystems</option>
            <option value="pypi">Python (PyPI)</option>
            <option value="npm">Node.js (npm)</option>
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-[#0d1117] border border-[#30363d] rounded-md text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Statuses</option>
            <option value="resolved">Resolved</option>
            <option value="unresolved">Declared Only</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[#30363d] bg-[#161b22] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0d1117] text-slate-400 uppercase font-semibold text-[11px] border-b border-[#30363d]">
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
            <tbody className="divide-y divide-[#30363d] text-slate-300">
              {dependencies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <Package className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                    No dependencies discovered matching current filters.
                  </td>
                </tr>
              ) : (
                dependencies.map((d) => (
                  <tr key={d.id} className="hover:bg-[#21262d] transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-200 font-mono">
                      {d.package_name}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-slate-800 text-slate-400 border border-slate-700">
                        {d.ecosystem}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {d.is_direct ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/30">
                          Direct
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-500/10 text-slate-400 border border-slate-500/30">
                          Transitive
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      {d.version_constraint || "—"}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-200">
                      {d.resolved_version || "—"}
                    </td>
                    <td className="py-2.5 px-3">{getStatusBadge(d.status)}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px] max-w-[130px] truncate" title={d.manifest_path}>
                      {d.manifest_path}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px] max-w-[130px] truncate" title={d.lockfile_path || "—"}>
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
          <div className="flex items-center justify-between p-3 border-t border-[#30363d] bg-[#0d1117] text-xs text-slate-400">
            <div>
              Showing {dependencies.length} of {total} packages
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="p-1 rounded bg-[#161b22] border border-[#30363d] text-slate-300 hover:bg-[#21262d] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                className="p-1 rounded bg-[#161b22] border border-[#30363d] text-slate-300 hover:bg-[#21262d] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
