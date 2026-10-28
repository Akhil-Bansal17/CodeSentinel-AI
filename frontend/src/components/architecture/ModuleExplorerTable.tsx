import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Search,
} from "lucide-react";
import { ModuleDetail, ModuleNode } from "../../types/architecture";
import { getModuleDetail } from "../../services/architectureService";
import { ModuleDetailModal } from "./ModuleDetailModal";

interface ModuleExplorerTableProps {
  runId: string;
  modules: ModuleNode[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  sortBy: string;
  onPageChange: (newPage: number) => void;
  onSearchChange: (newSearch: string) => void;
  onSortChange: (newSort: string) => void;
  isLoading: boolean;
}

export const ModuleExplorerTable: React.FC<ModuleExplorerTableProps> = ({
  runId,
  modules,
  total,
  page,
  pageSize,
  search,
  sortBy,
  onPageChange,
  onSearchChange,
  onSortChange,
  isLoading,
}) => {
  const [selectedDetail, setSelectedDetail] = useState<ModuleDetail | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleRowClick = async (modulePath: string) => {
    try {
      const detail = await getModuleDetail(runId, modulePath);
      setSelectedDetail(detail);
    } catch (err) {
      console.error("Failed to load module details:", err);
    }
  };

  return (
    <div className="space-y-3">
      {/* Search and Sort Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-surface-card border border-border-default rounded-lg">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-text-muted" />
          <input
            type="text"
            placeholder="Search module path (e.g. controllers, services)..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-surface-base border border-border-default rounded text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="bg-surface-base border border-border-default rounded px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent cursor-pointer"
          >
            <option value="coupling">Total Coupling (Ca + Ce)</option>
            <option value="instability">Instability (I)</option>
            <option value="afferent">Afferent (Ca incoming)</option>
            <option value="efferent">Efferent (Ce outgoing)</option>
            <option value="name">Module Path A-Z</option>
          </select>
        </div>
      </div>

      {/* Modules Table */}
      <div className="border border-border-default rounded-lg overflow-hidden bg-surface-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-base border-b border-border-default text-text-muted uppercase font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Module Path</th>
                <th className="py-2.5 px-3">Lang</th>
                <th className="py-2.5 px-3 text-right">Ca (In)</th>
                <th className="py-2.5 px-3 text-right">Ce (Out)</th>
                <th className="py-2.5 px-3 text-right">Instability (I)</th>
                <th className="py-2.5 px-3 text-right">Abstractness (A)</th>
                <th className="py-2.5 px-3 text-right">Distance (D)</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default/60 font-mono">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-text-muted font-sans">
                    Loading module metrics...
                  </td>
                </tr>
              ) : modules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-text-muted font-sans">
                    No modules found matching query.
                  </td>
                </tr>
              ) : (
                modules.map((m) => (
                  <tr
                    key={m.path}
                    onClick={() => handleRowClick(m.path)}
                    className="hover:bg-surface-overlay/50 transition-colors cursor-pointer group"
                  >
                    <td className="py-2 px-3 text-text-primary group-hover:text-accent truncate max-w-xs font-semibold">
                      {m.path}
                    </td>
                    <td className="py-2 px-3 text-text-muted uppercase text-[10px]">
                      {m.language}
                    </td>
                    <td className="py-2 px-3 text-right text-status-success font-medium">
                      {m.afferent_coupling ?? 0}
                    </td>
                    <td className="py-2 px-3 text-right text-accent font-medium">
                      {m.efferent_coupling ?? 0}
                    </td>
                    <td className="py-2 px-3 text-right text-text-secondary">
                      {typeof m.instability === "number" ? (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          m.instability > 0.8 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-surface-subtle text-text-secondary border border-border-default"
                        }`}>
                          {m.instability.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-text-muted">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right text-text-secondary">
                      {typeof m.abstractness === "number" ? m.abstractness.toFixed(2) : <span className="text-text-muted">-</span>}
                    </td>
                    <td className="py-2 px-3 text-right text-text-secondary">
                      {typeof m.main_sequence_distance === "number" ? (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          m.main_sequence_distance > 0.5 ? "bg-status-danger/10 text-status-danger border border-status-danger/20" : "bg-status-success/10 text-status-success border border-status-success/20"
                        }`}>
                          {m.main_sequence_distance.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-text-muted">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        className="p-1 text-text-muted hover:text-accent transition-colors cursor-pointer"
                        title="View module dependency details"
                        aria-label="View module dependency details"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(m.path);
                        }}
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
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
            Showing {modules.length} of {total.toLocaleString()} modules
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

      {/* Modal Inspector */}
      {selectedDetail && (
        <ModuleDetailModal
          detail={selectedDetail}
          onClose={() => setSelectedDetail(null)}
        />
      )}
    </div>
  );
};
