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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#161b22] border border-[#30363d] rounded-lg">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search module path (e.g. controllers, services)..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
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
      <div className="border border-[#30363d] rounded-lg overflow-hidden bg-[#161b22]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0d1117] border-b border-[#30363d] text-slate-400 uppercase font-mono text-[11px]">
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
            <tbody className="divide-y divide-[#30363d]/60 font-mono">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                    Loading module metrics...
                  </td>
                </tr>
              ) : modules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                    No modules found matching query.
                  </td>
                </tr>
              ) : (
                modules.map((m) => (
                  <tr
                    key={m.path}
                    onClick={() => handleRowClick(m.path)}
                    className="hover:bg-[#21262d]/70 transition-colors cursor-pointer group"
                  >
                    <td className="py-2 px-3 text-slate-200 group-hover:text-sky-300 truncate max-w-xs font-semibold">
                      {m.path}
                    </td>
                    <td className="py-2 px-3 text-slate-400 uppercase text-[10px]">
                      {m.language}
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-400 font-medium">
                      {m.afferent_coupling ?? 0}
                    </td>
                    <td className="py-2 px-3 text-right text-sky-400 font-medium">
                      {m.efferent_coupling ?? 0}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-300">
                      {typeof m.instability === "number" ? (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          m.instability > 0.8 ? "bg-amber-500/10 text-amber-400" : "bg-slate-800 text-slate-300"
                        }`}>
                          {m.instability.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-300">
                      {typeof m.abstractness === "number" ? m.abstractness.toFixed(2) : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-300">
                      {typeof m.main_sequence_distance === "number" ? (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          m.main_sequence_distance > 0.5 ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"
                        }`}>
                          {m.main_sequence_distance.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        className="p-1 text-slate-400 hover:text-sky-400 transition-colors"
                        title="View module dependency details"
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
        <div className="p-3 border-t border-[#30363d] flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing {modules.length} of {total.toLocaleString()} modules
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
