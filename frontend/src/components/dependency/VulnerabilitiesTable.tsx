import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { DependencyVulnerability } from "../../types/dependency";

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
        return <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">CRITICAL</span>;
      case "HIGH":
        return <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-orange-500/15 text-orange-300 border border-orange-500/30">HIGH</span>;
      case "MEDIUM":
        return <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">MEDIUM</span>;
      case "LOW":
        return <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">LOW</span>;
      default:
        return <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-slate-500/15 text-slate-300 border border-slate-500/30">UNKNOWN</span>;
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
              placeholder="Search package or advisory ID..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0d1117] border border-[#30363d] rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Severity filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => onSeverityChange(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-[#0d1117] border border-[#30363d] rounded-md text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
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
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[#30363d] bg-[#161b22] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0d1117] text-slate-400 uppercase font-semibold text-[11px] border-b border-[#30363d]">
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
            <tbody className="divide-y divide-[#30363d] text-slate-300">
              {vulnerabilities.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <ShieldAlert className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                    No vulnerability findings matching current filters.
                  </td>
                </tr>
              ) : (
                vulnerabilities.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => onSelectVulnerability(v)}
                    className="hover:bg-[#21262d] transition-colors cursor-pointer group"
                  >
                    <td className="py-2.5 px-3">{getSeverityBadge(v.severity)}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-semibold text-slate-200 group-hover:text-sky-400 transition-colors">
                        {v.advisory_id}
                      </div>
                      {v.cve_ids && v.cve_ids.length > 0 && (
                        <div className="text-[10px] text-slate-500 font-mono">
                          {v.cve_ids[0]}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-200 font-mono">{v.package_name}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-slate-800 text-slate-400 border border-slate-700">
                        {v.ecosystem}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-rose-300 font-medium">
                      {v.affected_range}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      {v.resolved_version || "—"}
                    </td>
                    <td className="py-2.5 px-3">
                      {v.remediation_version ? (
                        <span className="inline-flex items-center gap-1 font-mono text-emerald-400 text-[11px]">
                          <Wrench className="w-3 h-3 text-emerald-400 shrink-0" />
                          Fix: {v.remediation_version}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px] max-w-[140px] truncate" title={v.manifest_path}>
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
          <div className="flex items-center justify-between p-3 border-t border-[#30363d] bg-[#0d1117] text-xs text-slate-400">
            <div>
              Showing {vulnerabilities.length} of {total} findings
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
