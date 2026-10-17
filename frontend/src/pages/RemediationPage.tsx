import React, { useCallback, useEffect, useState } from "react";
import {
  Wrench,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Check,
  X,
  FileCode,
  Shield,
  ShieldCheck,
  ArrowLeft,
  Info,
} from "lucide-react";
import {
  RemediationApplyResponse,
  RemediationAuditItem,
  RemediationProposal,
} from "../types/remediation";
import { remediationService } from "../services/remediationService";
import { UnifiedDiffViewer } from "../components/remediation/UnifiedDiffViewer";
import { ValidationChecklist } from "../components/remediation/ValidationChecklist";
import { AuditTimeline } from "../components/remediation/AuditTimeline";

interface RemediationPageProps {
  initialProposalId?: string | null;
  onClearInitialProposal?: () => void;
}

export const RemediationPage: React.FC<RemediationPageProps> = ({
  initialProposalId,
  onClearInitialProposal,
}) => {
  const [proposals, setProposals] = useState<RemediationProposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<RemediationProposal | null>(null);
  const [audits, setAudits] = useState<RemediationAuditItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [applyResult, setApplyResult] = useState<RemediationApplyResponse | null>(null);

  const loadAudits = async (propId: string) => {
    try {
      const history = await remediationService.getProposalHistory(propId);
      setAudits(history);
    } catch {
      setAudits([]);
    }
  };

  const selectProposal = async (propId: string) => {
    try {
      setActionLoading(true);
      const prop = await remediationService.getProposal(propId);
      setSelectedProposal(prop);
      setApplyResult(null);
      await loadAudits(propId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch proposal details.");
    } finally {
      setActionLoading(false);
    }
  };

  // Load proposals list
  const loadProposals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = statusFilter !== "ALL" ? { status: statusFilter } : undefined;
      const resp = await remediationService.listProposals(params);
      setProposals(resp.items);

      if (initialProposalId) {
        const found = resp.items.find((p) => p.id === initialProposalId);
        if (found) {
          await selectProposal(found.id);
        } else {
          try {
            const single = await remediationService.getProposal(initialProposalId);
            setSelectedProposal(single);
            await loadAudits(single.id);
          } catch {
            // Handled
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load remediation proposals.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, initialProposalId]);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  const handleValidate = async () => {
    if (!selectedProposal) return;
    try {
      setActionLoading(true);
      setError(null);
      const updated = await remediationService.validateProposal(selectedProposal.id);
      setSelectedProposal(updated);
      await loadAudits(updated.id);
      // Refresh list
      loadProposals();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Validation failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedProposal) return;
    try {
      setActionLoading(true);
      setError(null);
      const updated = await remediationService.approveProposal(selectedProposal.id);
      setSelectedProposal(updated);
      await loadAudits(updated.id);
      loadProposals();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedProposal || !rejectReason.trim()) return;
    try {
      setActionLoading(true);
      setError(null);
      const updated = await remediationService.rejectProposal(selectedProposal.id, rejectReason);
      setSelectedProposal(updated);
      await loadAudits(updated.id);
      setIsRejectModalOpen(false);
      setRejectReason("");
      loadProposals();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Rejection failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApply = async () => {
    if (!selectedProposal) return;
    try {
      setActionLoading(true);
      setError(null);
      const res = await remediationService.applyProposal(selectedProposal.id);
      setApplyResult(res);
      setIsApplyModalOpen(false);
      // Reload proposal to reflect APPLIED / STALE status
      const updated = await remediationService.getProposal(selectedProposal.id);
      setSelectedProposal(updated);
      await loadAudits(updated.id);
      loadProposals();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Patch application failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "VALIDATED":
        return "bg-indigo-950/60 text-indigo-300 border-indigo-800";
      case "APPROVED":
        return "bg-emerald-950/60 text-emerald-300 border-emerald-800";
      case "APPLIED":
        return "bg-teal-950/60 text-teal-300 border-teal-800";
      case "VALIDATION_FAILED":
      case "FAILED":
        return "bg-rose-950/60 text-rose-300 border-rose-800";
      case "REJECTED":
        return "bg-slate-800 text-slate-400 border-slate-700";
      case "STALE":
        return "bg-amber-950/60 text-amber-300 border-amber-800";
      default:
        return "bg-sky-950/60 text-sky-300 border-sky-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-[#21262d]">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-950/70 border border-emerald-700/60 text-emerald-400">
              <Wrench className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-100">
              Automated Remediation & Safe Patch Synthesis
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic code patch proposals with in-memory AST validation, anti-drift protection,
            and explicit human approval before atomic application.
          </p>
        </div>

        {selectedProposal && (
          <button
            type="button"
            onClick={() => {
              setSelectedProposal(null);
              if (onClearInitialProposal) onClearInitialProposal();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#21262d] hover:bg-[#30363d] text-slate-200 border border-[#30363d] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Proposals
          </button>
        )}
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-rose-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Application Result Alert */}
      {applyResult && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-start justify-between gap-3 ${
            applyResult.status === "APPLIED"
              ? "bg-teal-950/40 border-teal-800 text-teal-200"
              : applyResult.status === "CANNOT_APPLY_READ_ONLY_ARCHIVE"
              ? "bg-amber-950/40 border-amber-800 text-amber-200"
              : "bg-rose-950/40 border-rose-800 text-rose-200"
          }`}
        >
          <div className="space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              {applyResult.status === "APPLIED" ? (
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
              ) : (
                <Info className="w-4 h-4 text-amber-400" />
              )}
              <span>Application Status: {applyResult.status}</span>
            </div>
            <p className="text-[11px] leading-relaxed">{applyResult.message}</p>
            {applyResult.new_file_hash && (
              <div className="font-mono text-[10px] text-slate-400">
                Verified File SHA-256: {applyResult.new_file_hash}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setApplyResult(null)}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* View Mode: Proposal Detail / Review Console */}
      {selectedProposal ? (
        <div className="space-y-6">
          {/* Proposal Summary Card */}
          <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-5 space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap pb-3 border-b border-[#21262d]">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusColor(
                      selectedProposal.status
                    )}`}
                  >
                    {selectedProposal.status}
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-sky-950/40 border border-sky-800/60 text-sky-300">
                    {selectedProposal.remediation_rule_id}
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/60 text-emerald-300">
                    {selectedProposal.confidence} CONFIDENCE
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-950/40 border border-amber-800/60 text-amber-300">
                    {selectedProposal.risk_level} RISK
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{selectedProposal.file_path}</span>
                  <span className="text-xs font-mono text-slate-400">
                    (Lines {selectedProposal.start_line}–{selectedProposal.end_line})
                  </span>
                </h2>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleValidate}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#21262d] hover:bg-[#30363d] text-slate-200 border border-[#30363d] transition-colors disabled:opacity-50"
                  title="Re-run in-memory validation checks"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Re-Validate
                </button>

                {selectedProposal.status === "VALIDATED" && (
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Approve Proposal
                  </button>
                )}

                {selectedProposal.status !== "REJECTED" && selectedProposal.status !== "APPLIED" && (
                  <button
                    type="button"
                    onClick={() => setIsRejectModalOpen(true)}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-950/40 hover:bg-rose-950/80 text-rose-300 border border-rose-800 transition-colors disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(true)}
                  disabled={selectedProposal.status !== "APPROVED" || actionLoading}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                  title={
                    selectedProposal.status !== "APPROVED"
                      ? "Requires explicit human approval before application"
                      : "Safely apply patch to workspace"
                  }
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Apply Patch
                </button>
              </div>
            </div>

            {/* Rationale and Strategy Information */}
            <div className="space-y-2 text-xs">
              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Remediation Rationale:</span>
              </div>
              <p className="p-3 rounded-lg bg-[#0d1117] border border-[#21262d] text-slate-300 leading-relaxed">
                {selectedProposal.rationale}
              </p>
            </div>

            {/* Source & Cryptographic Integrity Card */}
            <div className="p-3 rounded-lg bg-[#0d1117] border border-[#21262d] text-slate-400 font-mono text-[11px] grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500">Original Hash (SHA-256): </span>
                <span className="text-slate-300">{selectedProposal.original_content_hash}</span>
              </div>
              <div>
                <span className="text-slate-500">Target Hash (SHA-256): </span>
                <span className="text-slate-300">{selectedProposal.target_content_hash}</span>
              </div>
            </div>
          </div>

          {/* Validation Report Checklist */}
          <ValidationChecklist
            validations={selectedProposal.validations || []}
            overallStatus={selectedProposal.status}
          />

          {/* Diff Viewer (Unified & Split) */}
          <UnifiedDiffViewer
            diff={selectedProposal.unified_diff}
            filePath={selectedProposal.file_path}
            originalSnippet={selectedProposal.original_code_snippet}
            proposedSnippet={selectedProposal.proposed_code_snippet}
            startLine={selectedProposal.start_line}
          />

          {/* Audit Timeline */}
          <AuditTimeline audits={audits} />
        </div>
      ) : (
        /* View Mode: Proposal List */
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center justify-between flex-wrap gap-3 p-3 bg-[#161b22] rounded-xl border border-[#30363d]">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-400 mr-2">Filter Status:</span>
              {[
                "ALL",
                "PROPOSED",
                "VALIDATED",
                "APPROVED",
                "APPLIED",
                "REJECTED",
                "STALE",
              ].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                    statusFilter === st
                      ? "bg-emerald-600 text-white font-semibold"
                      : "bg-[#21262d] text-slate-300 hover:bg-[#30363d]"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="text-xs font-mono text-slate-400">
              Total Proposals: {proposals.length}
            </div>
          </div>

          {/* Proposal Table / Cards */}
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 font-mono">
              Loading remediation proposals...
            </div>
          ) : proposals.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-[#30363d] bg-[#161b22] space-y-2">
              <Wrench className="w-8 h-8 text-slate-600 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-300">
                No Remediation Proposals Found
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Select a code finding from the Static Analysis or Security view to synthesize a safe,
                reviewable patch proposal.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-[#30363d] bg-[#161b22] overflow-hidden">
              <div className="divide-y divide-[#21262d]">
                {proposals.map((prop) => (
                  <div
                    key={prop.id}
                    onClick={() => selectProposal(prop.id)}
                    className="p-4 hover:bg-[#1f242c] transition-colors cursor-pointer flex items-center justify-between gap-4 flex-wrap"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusColor(
                            prop.status
                          )}`}
                        >
                          {prop.status}
                        </span>
                        <code className="text-xs font-mono text-slate-300 font-bold">
                          {prop.file_path}
                        </code>
                        <span className="text-[11px] font-mono text-slate-500">
                          (L{prop.start_line}–{prop.end_line})
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">
                        {prop.rationale}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="text-slate-400 text-[11px]">
                        {new Date(prop.created_at).toLocaleDateString()}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectProposal(prop.id);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-slate-200 text-xs font-medium border border-[#30363d]"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Safe Patch Application */}
      {isApplyModalOpen && selectedProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-[#161b22] border border-[#30363d] shadow-2xl p-6 space-y-4 text-slate-200">
            <div className="flex items-center gap-2 pb-2 border-b border-[#21262d]">
              <Play className="w-5 h-5 text-teal-400 fill-current" />
              <h3 className="text-sm font-bold text-slate-100">
                Confirm Patch Application
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              You are about to apply the approved patch to:
            </p>
            <div className="p-2.5 rounded bg-[#0d1117] border border-[#21262d] font-mono text-xs text-emerald-300">
              {selectedProposal.file_path} (Lines {selectedProposal.start_line}–{selectedProposal.end_line})
            </div>

            <div className="space-y-1.5 text-[11px] text-slate-400 bg-teal-950/20 border border-teal-900/40 p-3 rounded-lg">
              <div className="font-semibold text-teal-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Automated Safety Guarantees:
              </div>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Pre-write hash verification aborts write if file drifted.</li>
                <li>Atomic temporary file replacement prevents partial writes.</li>
                <li>Post-write hash verification confirms file output.</li>
                <li>Original immutable snapshot is never modified.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#21262d]">
              <button
                type="button"
                onClick={() => setIsApplyModalOpen(false)}
                className="px-3 py-1.5 text-xs rounded-lg bg-[#21262d] hover:bg-[#30363d] text-slate-300 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={actionLoading}
                className="px-4 py-1.5 text-xs rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold disabled:opacity-50"
              >
                {actionLoading ? "Applying..." : "Confirm & Apply"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {isRejectModalOpen && selectedProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-[#161b22] border border-[#30363d] shadow-2xl p-6 space-y-4 text-slate-200">
            <div className="flex items-center gap-2 pb-2 border-b border-[#21262d]">
              <XCircle className="w-5 h-5 text-rose-400" />
              <h3 className="text-sm font-bold text-slate-100">
                Reject Remediation Proposal
              </h3>
            </div>

            <p className="text-xs text-slate-300">
              Please specify the reason for rejecting this patch proposal. The source files will remain unchanged.
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Code logic relies on dynamic execution here; manual refactoring planned."
              rows={3}
              className="w-full rounded-lg bg-[#0d1117] border border-[#30363d] p-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-rose-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#21262d]">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-3 py-1.5 text-xs rounded-lg bg-[#21262d] hover:bg-[#30363d] text-slate-300 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading}
                className="px-4 py-1.5 text-xs rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
