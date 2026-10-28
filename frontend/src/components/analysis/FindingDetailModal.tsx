import React, { useEffect, useState, useCallback } from "react";
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
  Wrench,
  Sparkles,
  ExternalLink,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { AnalysisFinding, FindingSeverity, FindingConfidence } from "../../types/analysis";
import { RemediationAvailability, RemediationProposal } from "../../types/remediation";
import { remediationService } from "../../services/remediationService";

interface FindingDetailModalProps {
  finding: AnalysisFinding | null;
  onClose: () => void;
  onViewProposal?: (proposalId: string) => void;
}

const SEVERITY_COLORS: Record<FindingSeverity, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: "bg-danger-bg", text: "text-danger-text", border: "border-danger-border" },
  HIGH: { bg: "bg-warning-bg", text: "text-warning-text", border: "border-warning-border" },
  MEDIUM: { bg: "bg-amber-500/10", text: "text-amber-300", border: "border-amber-500/30" },
  LOW: { bg: "bg-info-bg", text: "text-info-text", border: "border-info-border" },
  INFO: { bg: "bg-surface-hover", text: "text-text-muted", border: "border-border-default" },
};

const CONFIDENCE_COLORS: Record<FindingConfidence, { bg: string; text: string; border: string }> = {
  HIGH: { bg: "bg-success-bg", text: "text-success-text", border: "border-success-border" },
  MEDIUM: { bg: "bg-warning-bg", text: "text-warning-text", border: "border-warning-border" },
  LOW: { bg: "bg-surface-hover", text: "text-text-muted", border: "border-border-default" },
};

export const FindingDetailModal: React.FC<FindingDetailModalProps> = ({ finding, onClose, onViewProposal }) => {
  const [availability, setAvailability] = useState<RemediationAvailability | null>(null);
  const [availLoading, setAvailLoading] = useState<boolean>(false);
  const [synthesisLoading, setSynthesisLoading] = useState<boolean>(false);
  const [generatedProposal, setGeneratedProposal] = useState<RemediationProposal | null>(null);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState<boolean>(false);
  const [copiedFingerprint, setCopiedFingerprint] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const findingId = finding?.id;
  useEffect(() => {
    if (!findingId) return;
    let isMounted = true;
    const fetchAvail = async () => {
      try {
        setAvailLoading(true);
        const res = await remediationService.checkAvailability(findingId);
        if (isMounted) setAvailability(res);
      } catch {
        if (isMounted) setAvailability(null);
      } finally {
        if (isMounted) setAvailLoading(false);
      }
    };
    fetchAvail();
    return () => {
      isMounted = false;
    };
  }, [findingId]);

  const handleSynthesize = async () => {
    if (!finding) return;
    try {
      setSynthesisLoading(true);
      setSynthesisError(null);
      const prop = await remediationService.createProposal({
        repository_id: finding.repository_id,
        finding_id: finding.id,
      });
      setGeneratedProposal(prop);
    } catch (err: unknown) {
      setSynthesisError(err instanceof Error ? err.message : "Patch synthesis failed.");
    } finally {
      setSynthesisLoading(false);
    }
  };

  const copyToClipboard = useCallback((text: string, type: "path" | "fingerprint") => {
    if (!navigator?.clipboard?.writeText) return;
    navigator.clipboard.writeText(text).then(() => {
      if (type === "path") {
        setCopiedPath(true);
        setTimeout(() => setCopiedPath(false), 2000);
      } else {
        setCopiedFingerprint(true);
        setTimeout(() => setCopiedFingerprint(false), 2000);
      }
    }).catch(() => {});
  }, []);

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

  const fullCoordinate = `${finding.file_path}:${finding.start_line}${finding.start_column ? `:${finding.start_column}` : ""}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="finding-detail-title"
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-surface-card border border-border-default shadow-modal p-6 space-y-5 text-text-secondary max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-border-default">
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
                    ? "bg-danger-bg border-danger-border text-danger-text"
                    : "bg-surface-base border-border-default text-text-secondary"
                }`}
              >
                {finding.category}
              </span>
              <code className="text-xs font-mono px-2 py-0.5 rounded bg-accent-subtle border border-accent-border text-accent">
                {finding.rule_id} v{finding.rule_version}
              </code>
            </div>
            <h2 id="finding-detail-title" className="text-base font-bold text-text-primary flex items-center gap-2">
              {finding.category === "SECURITY" && (
                <Shield className="w-4 h-4 text-warning shrink-0" />
              )}
              {finding.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Assessment Note */}
        {finding.category === "SECURITY" && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200/90 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-amber-300">
              <ShieldAlert className="w-4 h-4 text-warning shrink-0" />
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
        <div className="p-3 rounded-lg bg-surface-base border border-border-default space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-text-muted font-medium">
              <MapPin className="w-3.5 h-3.5 text-accent" />
              <span>Source Coordinates</span>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(fullCoordinate, "path")}
              className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              title="Copy location coordinates"
            >
              {copiedPath ? (
                <>
                  <Check className="w-3 h-3 text-success" />
                  <span className="text-success">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="font-mono text-text-primary text-xs break-all">
            {finding.file_path}
            <span className="text-accent font-semibold">
              :{finding.start_line}
              {finding.start_column ? `:${finding.start_column}` : ""}
            </span>
            {finding.end_line && finding.end_line !== finding.start_line && (
              <span className="text-text-muted"> (to line {finding.end_line})</span>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1 text-xs">
          <div className="font-semibold text-text-primary">Rule Description & Rationale:</div>
          <p className="text-text-secondary leading-relaxed text-xs">{finding.description}</p>
        </div>

        {/* Evidence Summary */}
        <div className="space-y-1 text-xs">
          <div className="font-semibold text-text-primary flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-warning" />
            <span>Detection Evidence:</span>
          </div>
          <div className="p-3 rounded-md bg-surface-base border border-border-default font-mono text-xs text-amber-300 whitespace-pre-wrap break-all shadow-inner">
            {finding.evidence_summary}
          </div>
        </div>

        {/* Why It Matters */}
        {whyItMatters && (
          <div className="space-y-1 text-xs">
            <div className="font-semibold text-text-primary flex items-center gap-1.5">
              <AlertOctagon className="w-3.5 h-3.5 text-danger" />
              <span>Why It Matters:</span>
            </div>
            <p className="p-3 rounded-md bg-surface-base border border-border-default text-text-secondary text-xs leading-relaxed">
              {whyItMatters}
            </p>
          </div>
        )}

        {/* Recommended Remediation */}
        {remediation && (
          <div className="space-y-1 text-xs">
            <div className="font-semibold text-text-primary flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              <span>Recommended Remediation:</span>
            </div>
            <p className="p-3 rounded-md bg-surface-base border border-border-default text-text-secondary text-xs leading-relaxed">
              {remediation}
            </p>
          </div>
        )}

        {/* Phase 7 Automated Remediation & Safe Patch Synthesis Card */}
        <div className="p-4 rounded-xl border border-success-border bg-success-bg space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-success shrink-0" />
              <span className="text-xs font-bold text-text-primary">
                Phase 7 Automated Remediation & Safe Patch
              </span>
            </div>

            {availLoading ? (
              <span className="text-[10px] text-text-muted flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Checking feasibility...
              </span>
            ) : availability?.is_supported ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-success-bg border border-success-border text-success-text">
                  {availability.confidence} CONFIDENCE
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-warning-bg border border-warning-border text-warning-text">
                  {availability.risk_level} RISK
                </span>
              </div>
            ) : (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-surface-hover border border-border-default text-text-muted">
                MANUAL ONLY
              </span>
            )}
          </div>

          {availLoading ? (
            <p className="text-[11px] text-text-muted">
              Assessing whether AST can be safely and deterministically rewritten...
            </p>
          ) : availability?.is_supported ? (
            <div className="space-y-2 text-xs">
              <div className="text-[11px] font-semibold text-success-text">
                Strategy: {availability.strategy_name} ({availability.remediation_rule_id})
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                {availability.rationale || availability.description}
              </p>

              {synthesisError && (
                <div className="p-2 rounded bg-danger-bg border border-danger-border text-danger-text text-[11px]">
                  {synthesisError}
                </div>
              )}

              {generatedProposal ? (
                <div className="p-3 rounded-lg bg-surface-base border border-success-border flex items-center justify-between gap-3 flex-wrap">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-success-text flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Patch Proposal Synthesized ({generatedProposal.status})
                    </div>
                    <div className="text-[11px] text-text-muted font-mono">
                      Target SHA-256: {generatedProposal.target_content_hash.substring(0, 16)}...
                    </div>
                  </div>
                  {onViewProposal && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onViewProposal(generatedProposal.id);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-accent hover:bg-accent-hover text-accent-foreground transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Review in Console
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSynthesize}
                  disabled={synthesisLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-accent hover:bg-accent-hover text-accent-foreground transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
                >
                  {synthesisLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Validating & Generating Patch...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Synthesize Safe Patch Proposal</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-text-muted leading-relaxed">
              {availability?.unsupported_reason ||
                "No automated remediation strategy currently exists for this finding rule. Automated patching is only permitted for proven safe deterministic transformations."}
            </p>
          )}
        </div>

        {/* Detection Method & Limitations */}
        {limitations && (
          <div className="space-y-1 text-xs">
            <div className="font-semibold text-text-primary flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-accent" />
              <span>Detection Method & Known Limitations:</span>
            </div>
            <p className="p-3 rounded-md bg-surface-base border border-border-default text-text-secondary text-xs leading-relaxed">
              {limitations}
            </p>
          </div>
        )}

        {/* Metadata Parameters */}
        {diagnosticEntries.length > 0 && (
          <div className="space-y-1 text-xs">
            <div className="font-semibold text-text-primary flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-accent" />
              <span>Diagnostic Metadata:</span>
            </div>
            <div className="p-2.5 rounded-md bg-surface-base border border-border-default font-mono text-[11px] text-text-secondary grid grid-cols-1 sm:grid-cols-2 gap-2">
              {diagnosticEntries.map(([key, val]) => (
                <div key={key} className="flex items-center justify-between gap-2 border-b border-border-subtle pb-1">
                  <span className="text-text-muted">{key}:</span>
                  <span className="text-text-primary font-semibold">{String(val)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fingerprint & Timestamp Footer */}
        <div className="pt-3 border-t border-border-default flex items-center justify-between text-[11px] text-text-muted flex-wrap gap-2">
          <div className="flex items-center gap-2 font-mono">
            <div className="flex items-center gap-1">
              <Hash className="w-3 h-3 text-text-disabled" />
              <span title={finding.fingerprint}>Fingerprint: {finding.fingerprint.substring(0, 16)}...</span>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(finding.fingerprint, "fingerprint")}
              className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              title="Copy full SHA-256 fingerprint"
            >
              {copiedFingerprint ? (
                <Check className="w-3 h-3 text-success" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-text-disabled" />
            <span>{new Date(finding.created_at).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
