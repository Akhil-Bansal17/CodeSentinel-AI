import React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  FileCheck2,
  GitPullRequest,
  RefreshCw,
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
  return (
    <div className="space-y-6">
      <Card padding="md" className="bg-surface-card border-border-default space-y-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-primary flex items-center gap-2">
            <GitPullRequest className="w-4 h-4 text-accent" />
            Select Validated Proposals for PR Change Set
          </h2>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">
            Choose approved or validated remediation patches. CodeSentinel AI will verify source hashes, detect overlapping line conflicts, and compose a unified diff.
          </p>
        </div>

        {/* Custom PR Title */}
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">
            Custom PR Title (Optional)
          </label>
          <input
            type="text"
            value={customPrTitle}
            onChange={(e) => setCustomPrTitle(e.target.value)}
            placeholder="e.g. fix(security): remediate dynamic eval & restore TLS"
            className="w-full bg-surface-elevated border border-border-default text-text-primary text-xs rounded-md px-3 py-2 focus:ring-1 focus:ring-accent focus:outline-none placeholder:text-text-muted"
          />
        </div>

        {/* Proposals Selection Table */}
        {proposals.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-border-default">
            <table className="w-full text-left text-xs text-text-secondary">
              <thead className="bg-surface-elevated text-text-muted font-medium border-b border-border-default">
                <tr>
                  <th className="px-3 py-2.5 w-10 text-center">Include</th>
                  <th className="px-3 py-2.5">Rule ID</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Target File</th>
                  <th className="px-3 py-2.5">Line Span</th>
                  <th className="px-3 py-2.5">Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default bg-surface-base">
                {proposals.map((p) => {
                  const isSelected = selectedProposalIds.includes(p.id);
                  const isEligible = ["VALIDATED", "APPROVED"].includes(p.status);
                  return (
                    <tr
                      key={p.id}
                      className={cn(
                        "hover:bg-surface-hover transition-colors",
                        isSelected && "bg-accent-subtle/40"
                      )}
                    >
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!isEligible}
                          onChange={() => toggleProposalSelection(p.id)}
                          className="rounded border-border-strong bg-surface-base text-accent focus:ring-accent cursor-pointer disabled:opacity-40"
                        />
                      </td>
                      <td className="px-3 py-2 font-mono text-accent font-medium">
                        {p.remediation_rule_id}
                      </td>
                      <td className="px-3 py-2">
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
                      <td className="px-3 py-2 font-mono text-text-primary">{p.file_path}</td>
                      <td className="px-3 py-2 font-mono text-text-muted">
                        L{p.start_line}-L{p.end_line}
                      </td>
                      <td className="px-3 py-2 text-text-secondary max-w-sm truncate">
                        {p.rationale}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-text-muted bg-surface-elevated rounded-lg text-xs">
            No remediation proposals found for this repository. Run analysis or generate proposals in the Remediation tab first.
          </div>
        )}

        {/* Synthesize Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
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
            className="text-xs font-semibold justify-center"
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
            <div className="p-4 rounded-lg bg-status-danger-bg border border-status-danger-border text-status-danger-text space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <AlertCircle className="w-5 h-5 text-status-danger" />
                Overlapping Patch Conflicts Detected — Safe Refusal Enforced
              </div>
              <p className="text-xs text-rose-200">
                {preparedPr.conflict_details?.message ||
                  "Selected proposals edit overlapping line spans in the same file."}
              </p>
              <p className="text-xs text-rose-300">
                CodeSentinel AI refuses to silently choose a winner. Please deselect conflicting proposals or stage them sequentially.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-status-success-bg border border-status-success-border text-status-success-text flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="w-5 h-5 text-status-success" />
                Change Set Verified Clean — Zero Line Overlaps or Drift
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onCopyPrDescription}
                  leftIcon={<Copy className="w-3.5 h-3.5" />}
                  className="text-xs font-medium"
                >
                  Copy PR Body
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
          <Card padding="md" className="bg-surface-card border-border-default space-y-3">
            <div className="flex items-center justify-between border-b border-border-default pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Synthesized PR Title
              </span>
              <span className="text-xs font-mono text-accent font-semibold">{preparedPr.status}</span>
            </div>
            <div className="p-3 bg-surface-base rounded-md text-sm font-semibold text-text-primary font-mono border border-border-default">
              {preparedPr.title}
            </div>

            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted block pt-2">
              Evidence-Grounded Markdown Description
            </span>
            <pre className="p-4 rounded-lg bg-surface-base border border-border-default text-xs font-mono text-text-secondary overflow-x-auto whitespace-pre-wrap leading-relaxed select-all max-h-[300px]">
              {preparedPr.description}
            </pre>
          </Card>

          {/* Unified Diff Review */}
          <Card padding="md" className="bg-surface-card border-border-default space-y-3">
            <div className="flex items-center justify-between border-b border-border-default pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-primary flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-accent" />
                Combined Unified Diff Review
              </span>
              <span className="text-xs text-text-muted font-mono">
                {preparedPr.proposal_count} Patches Applied
              </span>
            </div>

            <pre className="p-4 rounded-lg bg-surface-base border border-border-default text-xs font-mono text-text-secondary overflow-x-auto whitespace-pre leading-relaxed select-all max-h-[400px]">
              {preparedPr.combined_diff}
            </pre>
          </Card>
        </div>
      )}
    </div>
  );
};

