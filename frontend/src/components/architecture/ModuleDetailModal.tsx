import React, { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  Check,
  Copy,
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
  const [copiedPath, setCopiedPath] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!detail) return null;

  const { node, incoming_dependencies, outgoing_dependencies, external_dependencies, unresolved_dependencies, cycles, violations } = detail;

  const handleCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(node.path);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    } catch (err) {
      console.error("Failed to copy path:", err);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="module-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
    >
      <div className="bg-surface-card border border-border-default rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 border-b border-border-default flex items-center justify-between bg-surface-base">
          <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
            <Boxes className="w-5 h-5 text-accent shrink-0" />
            <h2 id="module-detail-title" className="text-base font-semibold text-text-primary font-mono truncate" title={node.path}>
              {node.path}
            </h2>
            <button
              type="button"
              onClick={handleCopyPath}
              className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-overlay transition-colors shrink-0 cursor-pointer"
              title="Copy module path"
              aria-label="Copy module path"
            >
              {copiedPath ? (
                <Check className="w-3.5 h-3.5 text-status-success" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-overlay rounded-lg transition-colors cursor-pointer"
            title="Close modal"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-6 text-sm">
          {/* Coupling Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 bg-surface-base rounded-lg border border-border-default">
            <div>
              <div className="text-[11px] text-text-muted">Afferent (Ca)</div>
              <div className="text-base font-bold text-text-primary mt-0.5">{node.afferent_coupling}</div>
              <div className="text-[10px] text-text-muted">incoming modules</div>
            </div>
            <div>
              <div className="text-[11px] text-text-muted">Efferent (Ce)</div>
              <div className="text-base font-bold text-text-primary mt-0.5">{node.efferent_coupling}</div>
              <div className="text-[10px] text-text-muted">outgoing modules</div>
            </div>
            <div>
              <div className="text-[11px] text-text-muted">Instability (I)</div>
              <div className="text-base font-bold text-text-primary mt-0.5">
                {node.instability !== null ? node.instability.toFixed(2) : "N/A"}
              </div>
              <div className="text-[10px] text-text-muted">Ce / (Ca + Ce)</div>
            </div>
            <div>
              <div className="text-[11px] text-text-muted">Abstractness (A)</div>
              <div className="text-base font-bold text-text-primary mt-0.5">
                {node.abstractness !== null ? node.abstractness.toFixed(2) : "N/A"}
              </div>
              <div className="text-[10px] text-text-muted">{node.abstract_classes_count}/{node.classes_count} classes</div>
            </div>
            <div>
              <div className="text-[11px] text-text-muted">Main Seq Distance</div>
              <div className="text-base font-bold text-text-primary mt-0.5">
                {node.main_sequence_distance !== null ? node.main_sequence_distance.toFixed(2) : "N/A"}
              </div>
              <div className="text-[10px] text-text-muted">|A + I - 1|</div>
            </div>
          </div>

          {/* Violations if present */}
          {violations.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-status-danger font-semibold text-xs uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4" />
                <span>Architectural Violations ({violations.length})</span>
              </div>
              <div className="space-y-2">
                {violations.map((v, i) => (
                  <div key={i} className="p-3 bg-status-danger/10 border border-status-danger/30 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-bold text-status-danger">{String(v.rule_id || "")}</span>
                      <span className="text-text-muted text-[10px]">Line {String(v.line_number || 1)}</span>
                    </div>
                    <div className="text-text-primary">{String(v.description || "")}</div>
                    {Boolean(v.remediation) && (
                      <div className="text-status-success text-[11px] font-mono">
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
                  <div key={c.id} className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs font-mono text-amber-400">
                    {c.modules.join(" -> ")}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Incoming Dependencies */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-text-secondary font-semibold text-xs uppercase tracking-wider">
              <ArrowDownLeft className="w-4 h-4 text-status-success" />
              <span>Incoming Dependencies (Imported By: {incoming_dependencies.length})</span>
            </div>
            {incoming_dependencies.length === 0 ? (
              <div className="text-xs text-text-muted italic">No internal modules import this module directly.</div>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1 rounded border border-border-default p-2 bg-surface-base">
                {incoming_dependencies.map((e, idx) => (
                  <div key={idx} className="flex items-center justify-between font-mono text-xs text-text-secondary py-0.5">
                    <span className="truncate">{e.source_path}</span>
                    <span className="text-text-muted text-[11px] shrink-0 ml-2">Line {e.line_number}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing Internal Dependencies */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-text-secondary font-semibold text-xs uppercase tracking-wider">
              <ArrowUpRight className="w-4 h-4 text-accent" />
              <span>Outgoing Internal Dependencies (Imports: {outgoing_dependencies.length})</span>
            </div>
            {outgoing_dependencies.length === 0 ? (
              <div className="text-xs text-text-muted italic">No internal module dependencies.</div>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1 rounded border border-border-default p-2 bg-surface-base">
                {outgoing_dependencies.map((e, idx) => (
                  <div key={idx} className="flex items-center justify-between font-mono text-xs text-text-secondary py-0.5">
                    <span className="truncate">{e.target_path}</span>
                    <span className="text-text-muted text-[11px] shrink-0 ml-2">({e.specifier})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* External & Unresolved Packages */}
          {(external_dependencies.length > 0 || unresolved_dependencies.length > 0) && (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wider font-semibold text-text-muted">
                External & Unresolved Packages
              </div>
              <div className="flex flex-wrap gap-1.5">
                {external_dependencies.map((e, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded text-xs font-mono bg-accent-subtle text-accent border border-accent-border">
                    {e.target_path}
                  </span>
                ))}
                {unresolved_dependencies.map((e, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded text-xs font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
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
