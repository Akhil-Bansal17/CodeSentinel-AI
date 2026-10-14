import React from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  RotateCw,
  ShieldAlert,
  X,
} from "lucide-react";
import { ModuleDetail } from "../../types/architecture";

interface ModuleDetailModalProps {
  detail: ModuleDetail | null;
  onClose: () => void;
}

export const ModuleDetailModal: React.FC<ModuleDetailModalProps> = ({ detail, onClose }) => {
  if (!detail) return null;

  const { node, incoming_dependencies, outgoing_dependencies, external_dependencies, unresolved_dependencies, cycles, violations } = detail;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]">
          <div className="flex items-center gap-2 overflow-hidden">
            <Boxes className="w-5 h-5 text-sky-400 shrink-0" />
            <h2 className="text-base font-semibold text-slate-100 font-mono truncate" title={node.path}>
              {node.path}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-[#30363d] rounded-lg transition-colors"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-6 text-sm">
          {/* Coupling Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 bg-[#0d1117] rounded-lg border border-[#30363d]">
            <div>
              <div className="text-[11px] text-slate-400">Afferent (Ca)</div>
              <div className="text-base font-bold text-slate-200 mt-0.5">{node.afferent_coupling}</div>
              <div className="text-[10px] text-slate-400">incoming modules</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Efferent (Ce)</div>
              <div className="text-base font-bold text-slate-200 mt-0.5">{node.efferent_coupling}</div>
              <div className="text-[10px] text-slate-400">outgoing modules</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Instability (I)</div>
              <div className="text-base font-bold text-slate-200 mt-0.5">
                {node.instability !== null ? node.instability.toFixed(2) : "N/A"}
              </div>
              <div className="text-[10px] text-slate-400">Ce / (Ca + Ce)</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Abstractness (A)</div>
              <div className="text-base font-bold text-slate-200 mt-0.5">
                {node.abstractness !== null ? node.abstractness.toFixed(2) : "N/A"}
              </div>
              <div className="text-[10px] text-slate-400">{node.abstract_classes_count}/{node.classes_count} classes</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Main Seq Distance</div>
              <div className="text-base font-bold text-slate-200 mt-0.5">
                {node.main_sequence_distance !== null ? node.main_sequence_distance.toFixed(2) : "N/A"}
              </div>
              <div className="text-[10px] text-slate-400">|A + I - 1|</div>
            </div>
          </div>

          {/* Violations if present */}
          {violations.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-rose-400 font-semibold text-xs uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4" />
                <span>Architectural Violations ({violations.length})</span>
              </div>
              <div className="space-y-2">
                {violations.map((v, i) => (
                  <div key={i} className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-bold text-rose-300">{String(v.rule_id || "")}</span>
                      <span className="text-slate-400 text-[10px]">Line {String(v.line_number || 1)}</span>
                    </div>
                    <div className="text-slate-300">{String(v.description || "")}</div>
                    {Boolean(v.remediation) && (
                      <div className="text-emerald-400 text-[11px] font-mono">
                        Remediation: {String(v.remediation)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cycles if present */}
          {cycles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs uppercase tracking-wider">
                <RotateCw className="w-4 h-4" />
                <span>Circular Dependency Cycles ({cycles.length})</span>
              </div>
              <div className="space-y-1.5">
                {cycles.map((c) => (
                  <div key={c.id} className="p-2.5 bg-amber-950/20 border border-amber-500/30 rounded-lg text-xs font-mono text-amber-300">
                    {c.modules.join(" -> ")}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Incoming Dependencies */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-xs uppercase tracking-wider">
              <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
              <span>Incoming Dependencies (Imported By: {incoming_dependencies.length})</span>
            </div>
            {incoming_dependencies.length === 0 ? (
              <div className="text-xs text-slate-400 italic">No internal modules import this module directly.</div>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1 rounded border border-[#30363d] p-2 bg-[#0d1117]">
                {incoming_dependencies.map((e, idx) => (
                  <div key={idx} className="flex items-center justify-between font-mono text-xs text-slate-300 py-0.5">
                    <span className="truncate">{e.source_path}</span>
                    <span className="text-slate-400 text-[11px] shrink-0 ml-2">Line {e.line_number}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing Internal Dependencies */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-xs uppercase tracking-wider">
              <ArrowUpRight className="w-4 h-4 text-sky-400" />
              <span>Outgoing Internal Dependencies (Imports: {outgoing_dependencies.length})</span>
            </div>
            {outgoing_dependencies.length === 0 ? (
              <div className="text-xs text-slate-400 italic">No internal module dependencies.</div>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1 rounded border border-[#30363d] p-2 bg-[#0d1117]">
                {outgoing_dependencies.map((e, idx) => (
                  <div key={idx} className="flex items-center justify-between font-mono text-xs text-slate-300 py-0.5">
                    <span className="truncate">{e.target_path}</span>
                    <span className="text-slate-400 text-[11px] shrink-0 ml-2">({e.specifier})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* External & Unresolved Packages */}
          {(external_dependencies.length > 0 || unresolved_dependencies.length > 0) && (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                External & Unresolved Packages
              </div>
              <div className="flex flex-wrap gap-1.5">
                {external_dependencies.map((e, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded text-xs font-mono bg-purple-950/30 text-purple-300 border border-purple-500/30">
                    {e.target_path}
                  </span>
                ))}
                {unresolved_dependencies.map((e, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded text-xs font-mono bg-amber-950/30 text-amber-300 border border-amber-500/30">
                    {e.target_path} (unresolved)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
