import React, { useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Search,
  X,
} from "lucide-react";
import { ModuleDetail, ModuleNode } from "../../types/architecture";
import { getModuleDetail } from "../../services/architectureService";
import { ModuleDetailModal } from "./ModuleDetailModal";
import { Button } from "../common/Button";

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-surface-card border border-border-default rounded-lg shadow-xs">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search module path (e.g. controllers, services)..."
            aria-label="Search module path"
            value={search}
            onChange={(e) => {
              onSearchChange(e.target.value);
              onPageChange(1);
            }}
            className="w-full h-8 pl-9 pr-8 py-1.5 bg-surface-base border border-border-default rounded-md text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
          />
          {search && (
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

        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Sort by:</span>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => {
                onSortChange(e.target.value);
                onPageChange(1);
              }}
              aria-label="Sort modules by metric"
              className="h-8 pl-2.5 pr-7 py-1 text-xs bg-surface-base border border-border-default rounded-md text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent appearance-none cursor-pointer transition-colors"
            >
              <option value="coupling">Total Coupling (Ca + Ce)</option>
              <option value="instability">Instability (I)</option>
              <option value="afferent">Afferent (Ca incoming)</option>
              <option value="efferent">Efferent (Ce outgoing)</option>
              <option value="name">Module Path A-Z</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {search && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onSearchChange("");
                onPageChange(1);
              }}
              className="h-8 px-2 text-text-muted hover:text-text-primary text-xs"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Modules Table */}
      <div className="border border-border-default rounded-lg overflow-hidden bg-surface-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-base border-b border-border-subtle text-text-muted uppercase font-mono text-[11px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Module Path</th>
                <th className="py-2.5 px-3">Lang</th>
                <th className="py-2.5 px-3 text-right" title="Afferent Coupling: number of other modules that depend on this module">Ca (In)</th>
                <th className="py-2.5 px-3 text-right" title="Efferent Coupling: number of other modules this module depends on">Ce (Out)</th>
                <th className="py-2.5 px-3 text-right" title="Instability: Ce / (Ca + Ce). 0 = maximally stable, 1 = unstable">Instability (I)</th>
                <th className="py-2.5 px-3 text-right" title="Abstractness: abstract classes / total classes">Abstractness (A)</th>
                <th className="py-2.5 px-3 text-right" title="Normalized distance from main sequence |A + I - 1|">Distance (D)</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle font-mono text-text-secondary">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-text-muted font-sans">
                    Loading module metrics...
                  </td>
                </tr>
              ) : modules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-text-muted font-sans space-y-2">
                    <p>No modules found matching query.</p>
                    {search && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          onSearchChange("");
                          onPageChange(1);
                        }}
                      >
                        Clear search filter
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                modules.map((m) => (
                  <tr
                    key={m.path}
                    onClick={() => handleRowClick(m.path)}
                    className="hover:bg-surface-elevated/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-2.5 px-3 text-text-primary group-hover:text-accent truncate max-w-xs font-semibold">
                      {m.path}
                    </td>
                    <td className="py-2.5 px-3 text-text-muted uppercase text-[10px]">
                      {m.language}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-medium">
                      {m.afferent_coupling ?? 0}
                    </td>
                    <td className="py-2.5 px-3 text-right text-accent font-medium">
                      {m.efferent_coupling ?? 0}
                    </td>
                    <td className="py-2.5 px-3 text-right text-text-secondary">
                      {typeof m.instability === "number" ? (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                            m.instability > 0.8
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-surface-base text-text-secondary border border-border-default"
                          }`}
                        >
                          {m.instability.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-text-muted">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right text-text-secondary">
                      {typeof m.abstractness === "number" ? (
                        m.abstractness.toFixed(2)
                      ) : (
                        <span className="text-text-muted">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right text-text-secondary">
                      {typeof m.main_sequence_distance === "number" ? (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                            m.main_sequence_distance > 0.5
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          {m.main_sequence_distance.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-text-muted">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
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
        <div className="p-3 border-t border-border-subtle bg-surface-base flex items-center justify-between text-xs text-text-muted">
          <div>
            Showing {modules.length} of {total.toLocaleString()} modules
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
