import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  Wrench,
  CheckCircle2,
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
  FolderGit2,
  GitBranch,
  Search,
  Filter,
} from "lucide-react";
import {
  RemediationApplyResponse,
  RemediationAuditItem,
  RemediationProposal,
} from "../types/remediation";
import { Repository } from "../types/api";
import { remediationService } from "../services/remediationService";
import { repositoryService } from "../services/repositoryService";
import { RepositoryContext } from "../context/RepositoryContext";
import { UnifiedDiffViewer } from "../components/remediation/UnifiedDiffViewer";
import { ValidationChecklist } from "../components/remediation/ValidationChecklist";
import { AuditTimeline } from "../components/remediation/AuditTimeline";
import { RemediationSummaryCards } from "../components/remediation/RemediationSummaryCards";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { Modal } from "../components/common/Modal";
import { StatusBadge } from "../components/common/StatusBadge";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { cn } from "../lib/utils";

interface RemediationPageProps {
  initialProposalId?: string | null;
  onClearInitialProposal?: () => void;
}

export const RemediationPage: React.FC<RemediationPageProps> = ({
  initialProposalId,
  onClearInitialProposal,
}) => {
  const repoContext = useContext(RepositoryContext);

  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>(
    repoContext?.selectedRepoId || ""
  );

  const [proposals, setProposals] = useState<RemediationProposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<RemediationProposal | null>(null);
  const [audits, setAudits] = useState<RemediationAuditItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [applyResult, setApplyResult] = useState<RemediationApplyResponse | null>(null);

  // Sync with RepositoryContext
  useEffect(() => {
    if (repoContext?.selectedRepoId && repoContext.selectedRepoId !== selectedRepoId) {
      setSelectedRepoId(repoContext.selectedRepoId);
    }
  }, [repoContext?.selectedRepoId, selectedRepoId]);

  // Load repositories if not in context
  useEffect(() => {
    if (repoContext?.repositories && repoContext.repositories.length > 0) {
      setRepositories(repoContext.repositories);
      if (!selectedRepoId && repoContext.repositories[0]) {
        setSelectedRepoId(repoContext.repositories[0].id);
      }
    } else {
      repositoryService.listRepositories(1, 50).then((res) => {
        const items = res.items || [];
        setRepositories(items);
        if (!selectedRepoId && items.length > 0) {
          setSelectedRepoId(items[0].id);
        }
      }).catch(() => {});
    }
  }, [repoContext?.repositories, selectedRepoId]);

  const activeRepo = repositories.find((r) => r.id === selectedRepoId) || repoContext?.selectedRepo;

  const loadAudits = async (propId: string) => {
    try {
      const history = await remediationService.getProposalHistory(propId);
      setAudits(history);
    } catch {
      setAudits([]);
    }
  };

  const selectProposal = async (propId: string, clearResult = true) => {
    try {
      setActionLoading(true);
      const prop = await remediationService.getProposal(propId);
      setSelectedProposal(prop);
      if (clearResult) setApplyResult(null);
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
      const params: { status?: string; repositoryId?: string } = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (selectedRepoId) params.repositoryId = selectedRepoId;

      const resp = await remediationService.listProposals(params);
      setProposals(resp.items || []);

      if (initialProposalId) {
        const found = resp.items?.find((p) => p.id === initialProposalId);
        if (found) {
          await selectProposal(found.id, false);
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
  }, [statusFilter, selectedRepoId, initialProposalId]);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "VALIDATED":
        return <StatusBadge label={status} variant="info" isMono={true} />;
      case "APPROVED":
        return <StatusBadge label={status} variant="success" isMono={true} />;
      case "APPLIED":
        return <StatusBadge label={status} variant="success" isMono={true} />;
      case "VALIDATION_FAILED":
      case "FAILED":
        return <StatusBadge label={status} variant="danger" isMono={true} />;
      case "REJECTED":
        return <StatusBadge label={status} variant="neutral" isMono={true} />;
      case "STALE":
        return <StatusBadge label={status} variant="warning" isMono={true} />;
      default:
        return <StatusBadge label={status} variant="neutral" isMono={true} />;
    }
  };

  const filteredProposals = proposals.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.file_path.toLowerCase().includes(q) ||
      p.remediation_rule_id.toLowerCase().includes(q) ||
      p.rationale.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Repository Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-default">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-xs font-semibold bg-accent-subtle text-accent border border-accent-border rounded">
              Phase 7
            </span>
            <span className="text-xs text-text-muted">Automated Code Remediation</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-accent-subtle border border-accent-border text-accent">
              <Wrench className="w-4 h-4" />
            </div>
            Automated Remediation & Safe Patch Synthesis
          </h1>
          <p className="text-xs text-text-muted mt-1 max-w-2xl leading-relaxed">
            Deterministic code patch proposals with in-memory AST validation, anti-drift protection,
            and explicit human approval before atomic application.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {repositories.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="repo-selector" className="text-xs text-text-muted whitespace-nowrap flex items-center gap-1 font-medium">
                <FolderGit2 className="w-3.5 h-3.5" />
                Repository:
              </label>
              <select
                id="repo-selector"
                value={selectedRepoId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedRepoId(newId);
                  repoContext?.setSelectedRepoId(newId);
                }}
                className="bg-surface-elevated border border-border-default text-text-primary text-xs rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {repositories.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedProposal && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSelectedProposal(null);
                if (onClearInitialProposal) onClearInitialProposal();
              }}
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Back to Proposals
            </Button>
          )}
        </div>
      </div>

      {/* Active Repository Context Strip */}
      {activeRepo && (
        <div className="flex items-center gap-4 px-3.5 py-2 rounded-lg bg-surface-card border border-border-default text-xs text-text-secondary flex-wrap">
          <div className="flex items-center gap-1.5 text-text-primary font-medium">
            <FolderGit2 className="w-3.5 h-3.5 text-accent" />
            <span>{activeRepo.name}</span>
          </div>
          {activeRepo.default_branch && (
            <div className="flex items-center gap-1 text-text-muted">
              <GitBranch className="w-3.5 h-3.5" />
              <span className="font-mono">{activeRepo.default_branch}</span>
            </div>
          )}
          <div className="text-text-muted">
            Source: <span className="text-text-secondary capitalize">{activeRepo.source_type}</span>
          </div>
          {activeRepo.latest_snapshot && (
            <div className="text-text-muted font-mono">
              Files: {activeRepo.latest_snapshot.file_count ?? "—"} ({activeRepo.latest_snapshot.total_lines_of_code ?? "—"} LOC)
            </div>
          )}
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div className="p-3.5 rounded-lg bg-status-danger-bg border border-status-danger-border text-status-danger-text text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-status-danger shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-status-danger-text hover:opacity-80 transition-opacity"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Application Result Alert */}
      {applyResult && (
        <div
          className={cn(
            "p-4 rounded-lg border text-xs flex items-start justify-between gap-3",
            applyResult.status === "APPLIED"
              ? "bg-status-success-bg border-status-success-border text-status-success-text"
              : applyResult.status === "CANNOT_APPLY_READ_ONLY_ARCHIVE"
              ? "bg-status-warning-bg border-status-warning-border text-status-warning-text"
              : "bg-status-danger-bg border-status-danger-border text-status-danger-text"
          )}
        >
          <div className="space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              {applyResult.status === "APPLIED" ? (
                <CheckCircle2 className="w-4 h-4 text-status-success" />
              ) : (
                <Info className="w-4 h-4 text-status-warning" />
              )}
              <span>Application Status: {applyResult.status}</span>
            </div>
            <p className="text-[11px] leading-relaxed">{applyResult.message}</p>
            {applyResult.new_file_hash && (
              <div className="font-mono text-[10px] text-text-muted">
                Verified File SHA-256: {applyResult.new_file_hash}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setApplyResult(null)}
            className="text-text-muted hover:text-text-primary transition-colors"
            aria-label="Dismiss result"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* View Mode: Proposal Detail / Review Console */}
      {selectedProposal ? (
        <div className="space-y-6">
          {/* Proposal Summary Card */}
          <Card padding="md" className="bg-surface-card border-border-default space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap pb-3 border-b border-border-default">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(selectedProposal.status)}
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-elevated border border-border-default text-text-primary">
                    {selectedProposal.remediation_rule_id}
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-status-success-bg border border-status-success-border text-status-success-text">
                    {selectedProposal.confidence} CONFIDENCE
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-status-warning-bg border border-status-warning-border text-status-warning-text">
                    {selectedProposal.risk_level} RISK
                  </span>
                </div>
                <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-accent shrink-0" />
                  <span className="font-mono">{selectedProposal.file_path}</span>
                  <span className="text-xs font-mono text-text-muted">
                    (Lines {selectedProposal.start_line}–{selectedProposal.end_line})
                  </span>
                </h2>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleValidate}
                  disabled={actionLoading}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  title="Re-run in-memory validation checks"
                  className="text-xs"
                >
                  Re-Validate
                </Button>

                {selectedProposal.status === "VALIDATED" && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleApprove}
                    disabled={actionLoading}
                    leftIcon={<Check className="w-3.5 h-3.5" />}
                    className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    Approve Proposal
                  </Button>
                )}

                {selectedProposal.status !== "REJECTED" && selectedProposal.status !== "APPLIED" && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setIsRejectModalOpen(true)}
                    disabled={actionLoading}
                    leftIcon={<X className="w-3.5 h-3.5" />}
                    className="text-xs"
                  >
                    Reject
                  </Button>
                )}

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsApplyModalOpen(true)}
                  disabled={selectedProposal.status !== "APPROVED" || actionLoading}
                  leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
                  title={
                    selectedProposal.status !== "APPROVED"
                      ? "Requires explicit human approval before application"
                      : "Safely apply patch to workspace"
                  }
                  className="text-xs bg-teal-600 hover:bg-teal-500 text-white"
                >
                  Apply Patch
                </Button>
              </div>
            </div>

            {/* Rationale and Strategy Information */}
            <div className="space-y-1.5 text-xs">
              <div className="font-semibold text-text-primary flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-accent" />
                <span>Remediation Rationale:</span>
              </div>
              <p className="p-3 rounded-md bg-surface-elevated border border-border-default text-text-secondary leading-relaxed">
                {selectedProposal.rationale}
              </p>
            </div>

            {/* Source & Cryptographic Integrity Card */}
            <div className="p-3 rounded-md bg-surface-elevated border border-border-default text-text-muted font-mono text-[11px] grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <span className="text-text-muted">Original Hash (SHA-256): </span>
                <span className="text-text-primary">{selectedProposal.original_content_hash}</span>
              </div>
              <div>
                <span className="text-text-muted">Target Hash (SHA-256): </span>
                <span className="text-text-primary">{selectedProposal.target_content_hash}</span>
              </div>
            </div>
          </Card>

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
          {/* Remediation Overview Summary Cards */}
          <RemediationSummaryCards proposals={proposals} />

          {/* Filter Bar */}
          <Card padding="sm" className="bg-surface-card border-border-default">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-text-muted mr-1.5 flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  Filter Status:
                </span>
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
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-md font-medium transition-colors",
                      statusFilter === st
                        ? "bg-accent text-accent-foreground font-semibold shadow-xs"
                        : "bg-surface-elevated text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                    )}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Search Box & Total Count */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search path, rule, rationale..."
                    className="pl-8 pr-3 py-1 bg-surface-elevated border border-border-default rounded-md text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent w-48 sm:w-56"
                  />
                </div>
                <div className="text-xs font-mono text-text-muted whitespace-nowrap">
                  Total Proposals: {filteredProposals.length}
                </div>
              </div>
            </div>
          </Card>

          {/* Proposal Table / Cards */}
          {loading ? (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
              <LoadingSpinner size="md" />
              <div className="text-xs text-text-muted font-mono">
                Loading remediation proposals...
              </div>
            </div>
          ) : filteredProposals.length === 0 ? (
            <div className="p-12 text-center rounded-lg border border-dashed border-border-default bg-surface-card space-y-3">
              <div className="w-10 h-10 rounded-full bg-surface-elevated border border-border-default flex items-center justify-center mx-auto text-text-muted">
                <Wrench className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-text-primary">
                No Remediation Proposals Found
              </h3>
              <p className="text-xs text-text-secondary max-w-md mx-auto">
                Select a code finding from the Static Analysis or Security view to synthesize a safe,
                reviewable patch proposal.
              </p>
            </div>
          ) : (
            <Card padding="none" className="bg-surface-card border-border-default overflow-hidden">
              <div className="divide-y divide-border-default">
                {filteredProposals.map((prop) => (
                  <div
                    key={prop.id}
                    onClick={() => selectProposal(prop.id)}
                    className="p-4 hover:bg-surface-hover transition-colors cursor-pointer flex items-center justify-between gap-4 flex-wrap"
                  >
                    <div className="space-y-1.5 flex-1 min-w-[280px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(prop.status)}
                        <code className="text-xs font-mono text-text-primary font-bold">
                          {prop.file_path}
                        </code>
                        <span className="text-[11px] font-mono text-text-muted">
                          (L{prop.start_line}–{prop.end_line})
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-elevated text-text-muted border border-border-default">
                          {prop.remediation_rule_id}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary line-clamp-1">
                        {prop.rationale}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                      <span className="text-text-muted text-[11px]">
                        {new Date(prop.created_at).toLocaleDateString()}
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectProposal(prop.id);
                        }}
                        className="text-xs font-medium"
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Confirmation Modal for Safe Patch Application */}
      <Modal
        isOpen={isApplyModalOpen && !!selectedProposal}
        onClose={() => setIsApplyModalOpen(false)}
        title="Confirm Patch Application"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsApplyModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApply}
              disabled={actionLoading}
              isLoading={actionLoading}
              className="bg-teal-600 hover:bg-teal-500 text-white font-bold"
            >
              Confirm & Apply
            </Button>
          </div>
        }
      >
        {selectedProposal && (
          <div className="space-y-4 text-text-secondary text-xs">
            <p className="leading-relaxed">
              You are about to apply the approved patch to:
            </p>
            <div className="p-2.5 rounded-md bg-surface-elevated border border-border-default font-mono text-xs text-text-primary">
              {selectedProposal.file_path} (Lines {selectedProposal.start_line}–{selectedProposal.end_line})
            </div>

            <div className="space-y-1.5 text-[11px] text-text-secondary bg-surface-elevated border border-border-default p-3 rounded-md">
              <div className="font-semibold text-text-primary flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                Automated Safety Guarantees:
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-text-muted">
                <li>Pre-write hash verification aborts write if file drifted.</li>
                <li>Atomic temporary file replacement prevents partial writes.</li>
                <li>Post-write hash verification confirms file output.</li>
                <li>Original immutable snapshot is never modified.</li>
              </ul>
            </div>
          </div>
        )}
      </Modal>

      {/* Rejection Modal */}
      <Modal
        isOpen={isRejectModalOpen && !!selectedProposal}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject Remediation Proposal"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsRejectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleReject}
              disabled={!rejectReason.trim() || actionLoading}
              isLoading={actionLoading}
              className="font-bold"
            >
              Confirm Rejection
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <p className="text-text-secondary">
            Please specify the reason for rejecting this patch proposal. The source files will remain unchanged.
          </p>

          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g., Code logic relies on dynamic execution here; manual refactoring planned."
            rows={3}
            className="w-full rounded-md bg-surface-elevated border border-border-default p-2.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-status-danger"
          />
        </div>
      </Modal>
    </div>
  );
};
