import React, { useEffect } from "react";
import {
  X,
  MapPin,
  Hash,
  ShieldAlert,
  Cpu,
  Calendar,
  AlertOctagon,
  CheckCircle2,
  HelpCircle,
  Shield,
} from "lucide-react";
import { AnalysisFinding, FindingSeverity, FindingConfidence } from "../../types/analysis";

interface FindingDetailModalProps {
  finding: AnalysisFinding | null;
  onClose: () => void;
}

const SEVERITY_COLORS: Record<FindingSeverity, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: "bg-rose-950/60", text: "text-rose-300", border: "border-rose-800" },
  HIGH: { bg: "bg-orange-950/60", text: "text-orange-300", border: "border-orange-800" },
  MEDIUM: { bg: "bg-amber-950/60", text: "text-amber-300", border: "border-amber-800" },
  LOW: { bg: "bg-sky-950/60", text: "text-sky-300", border: "border-sky-800" },
  INFO: { bg: "bg-slate-800", text: "text-slate-300", border: "border-slate-700" },
};

const CONFIDENCE_COLORS: Record<FindingConfidence, { bg: string; text: string; border: string }> = {
  HIGH: { bg: "bg-emerald-950/60", text: "text-emerald-300", border: "border-emerald-800" },
  MEDIUM: { bg: "bg-amber-950/60", text: "text-amber-300", border: "border-amber-800" },
  LOW: { bg: "bg-slate-800", text: "text-slate-400", border: "border-slate-700" },
};

export const FindingDetailModal: React.FC<FindingDetailModalProps> = ({ finding, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!finding) return null;

  const sevStyle = SEVERITY_COLORS[finding.severity] || SEVERITY_COLORS.INFO;
  const confidence = finding.confidence || (finding.metadata_json?.confidence as FindingConfidence) || "MEDIUM";
  const confStyle = CONFIDENCE_COLORS[confidence] || CONFIDENCE_COLORS.MEDIUM;

  const whyItMatters = (finding.metadata_json?.why_it_matters as string) || null;
  const remediation = (finding.metadata_json?.remediation as string) || null;
  const limitations = (finding.metadata_json?.limitations as string) || null;

  // Filter out structured sections from generic metadata key-values
  const excludedMetaKeys = new Set(["why_it_matters", "remediation", "limitations", "confidence"]);
  const diagnosticEntries = Object.entries(finding.metadata_json || {}).filter(
    ([k]) => !excludedMetaKeys.has(k)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-[#161b22] border border-[#30363d] shadow-2xl p-6 space-y-5 text-slate-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#21262d]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${sevStyle.bg} ${sevStyle.text} ${sevStyle.border}`}
              >
                {finding.severity}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${confStyle.bg} ${confStyle.text} ${confStyle.border}`}
              >
                {confidence} CONFIDENCE
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                  finding.category === "SECURITY"
                    ? "bg-rose-950/40 border-rose-800/60 text-rose-300"
                    : "bg-[#0d1117] border-[#30363d] text-slate-300"
                }`}
              >
                {finding.category}
              </span>
              <code className="text-xs font-mono px-2 py-0.5 rounded bg-sky-950/40 border border-sky-800/60 text-sky-300">
                {finding.rule_id} v{finding.rule_version}
              </code>
            </div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              {finding.category === "SECURITY" && (
                <Shield className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              {finding.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-[#21262d] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Assessment Note */}
        {finding.category === "SECURITY" && (
          <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/50 text-xs text-amber-200/90 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-amber-300">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Static Pattern Detection Notice</span>
            </div>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              This finding detects a security-sensitive code pattern via deterministic AST analysis.
              It is an indicator of risk rather than a confirmed exploit. Exploitability depends on
              whether untrusted input reaches this operation.
            </p>
          </div>
        )}

        {/* Location Coordinates */}
        <div className="p-3 rounded-lg bg-[#0d1117] border border-[#21262d] space-y-1 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium">
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            <span>Source Coordinates</span>
          </div>
          <div className="font-mono text-slate-200 text-xs break-all">
            {finding.file_path}
            <span className="text-sky-400">
              :{finding.start_line}
              {finding.start_column ? `:${finding.start_column}` : ""}
            </span>
            {finding.end_line && finding.end_line !== finding.start_line && (
              <span className="text-slate-400"> (to line {finding.end_line})</span>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1 text-xs">
          <div className="font-semibold text-slate-300">Rule Description & Rationale:</div>
          <p className="text-slate-400 leading-relaxed text-xs">{finding.description}</p>
        </div>

        {/* Evidence Summary */}
        <div className="space-y-1 text-xs">
          <div className="font-semibold text-slate-300 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Detection Evidence:</span>
          </div>
          <div className="p-3 rounded-md bg-[#0d1117] border border-[#21262d] font-mono text-xs text-amber-200/90 whitespace-pre-wrap break-all">
            {finding.evidence_summary}
          </div>
        </div>

        {/* Why It Matters */}
        {whyItMatters && (
          <div className="space-y-1 text-xs">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
              <span>Why It Matters:</span>
            </div>
            <p className="p-3 rounded-md bg-[#0d1117] border border-[#21262d] text-slate-300 text-xs leading-relaxed">
              {whyItMatters}
            </p>
          </div>
        )}

        {/* Recommended Remediation */}
        {remediation && (
          <div className="space-y-1 text-xs">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Recommended Remediation:</span>
            </div>
            <p className="p-3 rounded-md bg-[#0d1117] border border-[#21262d] text-slate-300 text-xs leading-relaxed">
              {remediation}
            </p>
          </div>
        )}

        {/* Detection Method & Limitations */}
        {limitations && (
          <div className="space-y-1 text-xs">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
              <span>Detection Method & Known Limitations:</span>
            </div>
            <p className="p-3 rounded-md bg-[#0d1117] border border-[#21262d] text-slate-400 text-xs leading-relaxed">
              {limitations}
            </p>
          </div>
        )}

        {/* Metadata Parameters */}
        {diagnosticEntries.length > 0 && (
          <div className="space-y-1 text-xs">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-teal-400" />
              <span>Diagnostic Metadata:</span>
            </div>
            <div className="p-2.5 rounded-md bg-[#0d1117] border border-[#21262d] font-mono text-[11px] text-slate-300 grid grid-cols-2 gap-2">
              {diagnosticEntries.map(([key, val]) => (
                <div key={key} className="flex items-center justify-between gap-2 border-b border-[#21262d] pb-1">
                  <span className="text-slate-400">{key}:</span>
                  <span className="text-slate-200 font-semibold">{String(val)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fingerprint & Timestamp Footer */}
        <div className="pt-3 border-t border-[#21262d] flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 font-mono">
            <Hash className="w-3 h-3 text-slate-500" />
            <span title={finding.fingerprint}>Fingerprint: {finding.fingerprint.substring(0, 16)}...</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-slate-500" />
            <span>{new Date(finding.created_at).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
