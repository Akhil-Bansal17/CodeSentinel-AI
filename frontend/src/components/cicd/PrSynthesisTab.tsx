import React, { useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileCheck2,
  GitPullRequest,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { PrPrepareResponse } from "../../types/cicd";
import { RemediationProposal } from "../../types/remediation";
import { Button } from "../common/Button";
import { Card } from "../common/Card";
import { StatusBadge } from "../common/StatusBadge";
import { cn } from "../../lib/utils";

interface PrSynthesisTabProps {
  proposals: RemediationProposal[];
  selectedProposalIds: string[];
  toggleProposalSelection: (id: string) => void;
  customPrTitle: string;
  setCustomPrTitle: (v: string) => void;
  isPreparingPr: boolean;
  onPreparePr: () => void;
  preparedPr: PrPrepareResponse | null;
  onCopyPrDescription: () => void;
  onDownloadPatch: () => void;
}

export const PrSynthesisTab: React.FC<PrSynthesisTabProps> = ({
  proposals,
  selectedProposalIds,
  toggleProposalSelection,
  customPrTitle,
  setCustomPrTitle,
  isPreparingPr,
  onPreparePr,
  preparedPr,
  onCopyPrDescription,
  onDownloadPatch,
}) => {
  const [proposalSearch, setProposalSearch] = useState<string>("");
  const [copiedPrBody, setCopiedPrBody] = useState(false);
  const [copiedDiff, setCopiedDiff] = useState(false);

  const eligibleProposals = proposals.filter((p) =>
    ["VALIDATED", "APPROVED"].includes(p.status)
  );

  const filteredProposals = proposals.filter((p) => {
    if (!proposalSearch.trim()) return true;
    const q = proposalSearch.toLowerCase();
    return (
      (p.remediation_rule_id || "").toLowerCase().includes(q) ||
      (p.file_path || "").toLowerCase().includes(q) ||
      (p.rationale || "").toLowerCase().includes(q)
    );
  });

  const selectAllEligible = () => {
    const eligibleIds = eligibleProposals.map((p) => p.id);
    eligibleIds.forEach((id) => {
      if (!selectedProposalIds.includes(id)) {
        toggleProposalSelection(id);
      }
    });
  };

  const clearSelection = () => {
    selectedProposalIds.forEach((id) => {
      toggleProposalSelection(id);
    });
  };

  const handleCopyBody = () => {
    onCopyPrDescription();
    setCopiedPrBody(true);
    setTimeout(() => setCopiedPrBody(false), 2000);
  };

  const handleCopyDiff = () => {
    if (preparedPr?.combined_diff) {
      navigator.clipboard.writeText(preparedPr.combined_diff);
      setCopiedDiff(true);
      setTimeout(() => setCopiedDiff(false), 2000);
    }
  };

  const renderDiffLine = (line: string, index: number) => {
    let lineClass = "text-text-secondary";
    if (line.startsWith("+") && !line.startsWith("+++")) {
      lineClass = "text-emerald-400 bg-emerald-500/10 font-medium";
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      lineClass = "text-rose-400 bg-rose-500/10 font-medium";
    } else if (line.startsWith("@@")) {
      lineClass = "text-accent bg-accent-subtle/40 font-semibold";
    } else if (line.startsWith("diff --git") || line.startsWith("index ")) {
      lineClass = "text-text-primary font-bold";
    }

    return (
      <div key={index} className={cn("px-2 py-0.5 font-mono text-[11px] leading-relaxed", lineClass)}>
        {line || " "}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Proposal Selection Card */}
      <Card padding="md" className="bg-surface-card border-border-default space-y-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-subtle border border-accent-border flex items-center justify-center text-accent shrink-0 mt-0.5">
            <GitPullRequest className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-primary flex items-center gap-2">
              Select Validated Proposals for PR Change Set
            </h2>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed max-w-2xl">
              Choose approved or validated remediation patches. CodeSentinel AI verifies source hashes, validates line overlaps using AST boundary checks, and composes a unified, conflict-free git diff bundle.
            </p>
          </div>
        </div>

        {/* Custom PR Title */}
        <div className="space-y-1.5 pt-1">
          <label className="block text-xs font-medium text-text-muted">
            Custom PR Title (Optional)
          </label>
          <input
            type="text"
            value={customPrTitle}
            onChange={(e) => setCustomPrTitle(e.target.value)}
            placeholder="e.g. fix(security): remediate dynamic eval & restore TLS"
            className="w-full bg-surface-elevated border border-border-default text-text-primary text-xs rounded-md px-3 py-2 focus:ring-1 focus:ring-accent focus:border-accent focus:outline-hidden placeholder:text-text-muted font-medium transition-colors"
          />
        </div>

        {/* Proposals Selection Table */}
        {proposals.length > 0 ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllEligible}
                  className="text-[11px] py-1 px-2.5"
                >
                  Select All Eligible ({eligibleProposals.length})
                </Button>
                {selectedProposalIds.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="text-[11px] py-1 px-2 text-text-muted hover:text-text-primary"
                  >
                    Clear Selection
                  </Button>
                )}
                <span className="text-[11px] font-mono text-text-muted pl-1">
                  {selectedProposalIds.length} of {eligibleProposals.length} eligible selected
                </span>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={proposalSearch}
                  onChange={(e) => setProposalSearch(e.target.value)}
                  placeholder="Search proposals..."
                  className="bg-surface-elevated border border-border-default text-text-primary text-xs rounded-md pl-8 pr-7 py-1 focus:outline-hidden focus:ring-1 focus:ring-accent w-48 transition-colors"
                />
                {proposalSearch && (
                  <button
                    type="button"
                    onClick={() => setProposalSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    aria-label="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border-default">
              <table className="w-full text-left text-xs text-text-secondary">
                <thead className="bg-surface-elevated text-text-muted font-medium border-b border-border-default uppercase font-mono text-[11px] tracking-wider">
                  <tr>
                    <th className="px-3.5 py-2.5 w-12 text-center">Include</th>
                    <th className="px-3.5 py-2.5">Rule ID</th>
                    <th className="px-3.5 py-2.5">Status</th>
                    <th className="px-3.5 py-2.5">Target File</th>
                    <th className="px-3.5 py-2.5">Line Span</th>
                    <th className="px-3.5 py-2.5">Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default bg-surface-base">
                  {filteredProposals.map((p) => {
                    const isSelected = selectedProposalIds.includes(p.id);
                    const isEligible = ["VALIDATED", "APPROVED"].includes(p.status);
                    return (
                      <tr
                        key={p.id}
                        className={cn(
                          "hover:bg-surface-hover/70 transition-colors",
                          isSelected && "bg-accent-subtle/30"
                        )}
                      >
                        <td className="px-3.5 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!isEligible}
                            onChange={() => toggleProposalSelection(p.id)}
                            className="rounded border-border-strong bg-surface-base text-accent focus:ring-accent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title={
                              isEligible
                                ? "Select proposal for PR change set"
                                : "Only VALIDATED or APPROVED proposals can be synthesized"
                            }
                            aria-label={`Select proposal ${p.remediation_rule_id}`}
                          />
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-accent font-medium whitespace-nowrap">
                          {p.remediation_rule_id}
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <StatusBadge
                            label={p.status}
                            variant={
                              p.status === "APPROVED"
                                ? "success"
                                : p.status === "VALIDATED"
                                ? "info"
                                : "neutral"
                            }
                            isMono={true}
                          />
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-text-primary whitespace-nowrap">
                          {p.file_path}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-text-muted whitespace-nowrap">
                          L{p.start_line}-L{p.end_line}
                        </td>
                        <td className="px-3.5 py-2.5 text-text-secondary max-w-sm truncate">
                          {p.rationale}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-text-muted bg-surface-elevated rounded-lg text-xs space-y-1 border border-border-default">
            <p className="font-semibold text-text-secondary">No remediation proposals found</p>
            <p className="text-text-muted">
              Run analysis or generate proposals in the Remediation tab first.
            </p>
          </div>
        )}

        {/* Synthesize Button Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border-default">
          <span className="text-xs text-text-muted font-mono">
            {selectedProposalIds.length} proposal(s) selected for change set composition
          </span>

          <Button
            variant="primary"
            size="md"
            onClick={onPreparePr}
            disabled={isPreparingPr || selectedProposalIds.length === 0}
            isLoading={isPreparingPr}
            leftIcon={
              isPreparingPr ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <GitPullRequest className="w-4 h-4" />
              )
            }
            className="text-xs font-semibold justify-center shadow-xs"
          >
            {isPreparingPr
              ? "Checking Conflicts & Synthesizing..."
              : "Synthesize Pull Request Change Set"}
          </Button>
        </div>
      </Card>

      {/* Prepared Change Set Review Panel */}
      {preparedPr && (
        <div className="space-y-6">
          {/* Conflict Warning Banner or Clean Verification */}
          {preparedPr.has_conflicts ? (
            <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-2 shadow-xs">
              <div className="flex items-center gap-2 font-semibold text-sm text-rose-400">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                Overlapping Patch Conflicts Detected — Safe Refusal Enforced
              </div>
              <p className="text-xs text-rose-200 leading-relaxed font-mono">
                {preparedPr.conflict_details?.message ||
                  "Selected proposals edit overlapping line spans in the same file."}
              </p>
              <p className="text-xs text-rose-300/90 leading-relaxed">
                CodeSentinel AI refuses to silently choose a winner. Please deselect conflicting proposals or stage them sequentially.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between flex-wrap gap-3 shadow-xs">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                Change Set Verified Clean — Zero Line Overlaps or Drift
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyBody}
                  leftIcon={copiedPrBody ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  className="text-xs font-medium"
                >
                  {copiedPrBody ? "Copied Body" : "Copy PR Body"}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onDownloadPatch}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  className="text-xs font-medium"
                >
                  Download .patch Bundle
                </Button>
              </div>
            </div>
          )}

          {/* Title & Grounded Description Preview */}
          <Card padding="md" className="bg-surface-card border-border-default space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-border-default pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Synthesized PR Title
              </span>
              <span className="text-xs font-mono text-accent font-semibold px-2 py-0.5 rounded bg-accent-subtle border border-accent-border">
                {preparedPr.status}
              </span>
            </div>
            <div className="p-3 bg-surface-base rounded-md text-sm font-semibold text-text-primary font-mono border border-border-default shadow-xs flex items-center justify-between">
              <span>{preparedPr.title}</span>
              <Sparkles className="w-4 h-4 text-accent shrink-0 ml-2" />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Evidence-Grounded Markdown Description
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyBody}
                leftIcon={copiedPrBody ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                className="text-[11px] h-6 px-2 text-text-muted hover:text-text-primary"
              >
                {copiedPrBody ? "Copied" : "Copy"}
              </Button>
            </div>
            <pre className="p-4 rounded-lg bg-surface-base border border-border-default text-xs font-mono text-text-secondary overflow-x-auto whitespace-pre-wrap leading-relaxed select-all max-h-[300px]">
              {preparedPr.description}
            </pre>
          </Card>

          {/* Unified Diff Review */}
          <Card padding="md" className="bg-surface-card border-border-default space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-border-default pb-2">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-accent" />
                <span className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                  Combined Unified Diff Review
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted font-mono px-2 py-0.5 rounded bg-surface-elevated border border-border-default">
                  {preparedPr.proposal_count} Patches Applied
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyDiff}
                  leftIcon={copiedDiff ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  className="text-[11px] h-6 px-2 text-text-muted hover:text-text-primary"
                >
                  {copiedDiff ? "Copied Diff" : "Copy Diff"}
                </Button>
              </div>
            </div>

            <div className="rounded-lg bg-surface-base border border-border-default overflow-x-auto max-h-[420px] divide-y divide-border-default/40">
              {preparedPr.combined_diff.split("\n").map((line, idx) =>
                renderDiffLine(line, idx)
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
