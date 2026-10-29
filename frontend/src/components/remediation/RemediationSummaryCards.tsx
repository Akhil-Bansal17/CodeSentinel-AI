import React from "react";
import { Wrench, Clock, CheckCircle2, AlertOctagon } from "lucide-react";
import { RemediationProposal } from "../../types/remediation";
import { Card } from "../common/Card";

interface RemediationSummaryCardsProps {
  proposals: RemediationProposal[];
}

export const RemediationSummaryCards: React.FC<RemediationSummaryCardsProps> = ({ proposals }) => {
  const totalCandidates = proposals.length;
  const awaitingReview = proposals.filter((p) =>
    ["PROPOSED", "VALIDATING", "VALIDATED"].includes(p.status)
  ).length;
  const approvedOrApplied = proposals.filter((p) =>
    ["APPROVED", "APPLIED"].includes(p.status)
  ).length;
  const blockedOrFailed = proposals.filter((p) =>
    ["VALIDATION_FAILED", "FAILED", "STALE", "REJECTED"].includes(p.status)
  ).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Total Remediation Candidates */}
      <Card padding="sm" className="bg-surface-card border-border-default">
        <div className="flex items-center justify-between text-text-muted mb-1.5">
          <span className="text-xs font-medium">Remediation Candidates</span>
          <Wrench className="w-4 h-4 text-accent" />
        </div>
        <div className="text-2xl font-bold font-mono text-text-primary">
          {totalCandidates}
        </div>
        <div className="text-[11px] text-text-muted mt-0.5">
          Synthesized patch proposals
        </div>
      </Card>

      {/* 2. Awaiting Review */}
      <Card padding="sm" className="bg-surface-card border-border-default">
        <div className="flex items-center justify-between text-text-muted mb-1.5">
          <span className="text-xs font-medium">Awaiting Review</span>
          <Clock className="w-4 h-4 text-status-warning" />
        </div>
        <div className="text-2xl font-bold font-mono text-text-primary">
          {awaitingReview}
        </div>
        <div className="text-[11px] text-text-muted mt-0.5">
          Proposed or in validation
        </div>
      </Card>

      {/* 3. Approved or Applied */}
      <Card padding="sm" className="bg-surface-card border-border-default">
        <div className="flex items-center justify-between text-text-muted mb-1.5">
          <span className="text-xs font-medium">Approved / Applied</span>
          <CheckCircle2 className="w-4 h-4 text-status-success" />
        </div>
        <div className="text-2xl font-bold font-mono text-text-primary">
          {approvedOrApplied}
        </div>
        <div className="text-[11px] text-text-muted mt-0.5">
          Passed safety verification
        </div>
      </Card>

      {/* 4. Blocked / Rejected / Failed */}
      <Card padding="sm" className="bg-surface-card border-border-default">
        <div className="flex items-center justify-between text-text-muted mb-1.5">
          <span className="text-xs font-medium">Blocked / Failed</span>
          <AlertOctagon className="w-4 h-4 text-status-danger" />
        </div>
        <div className="text-2xl font-bold font-mono text-text-primary">
          {blockedOrFailed}
        </div>
        <div className="text-[11px] text-text-muted mt-0.5">
          Failed checks, stale, or rejected
        </div>
      </Card>
    </div>
  );
};

