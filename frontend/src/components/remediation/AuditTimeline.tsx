import React from "react";
import { History, User, Clock } from "lucide-react";
import { RemediationAuditItem } from "../../types/remediation";
import { Card } from "../common/Card";

interface AuditTimelineProps {
  audits: RemediationAuditItem[];
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ audits }) => {
  if (!audits || audits.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-text-muted italic rounded-lg border border-border-default bg-surface-card">
        No audit events recorded for this proposal.
      </div>
    );
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "PROPOSAL_CREATED":
        return "text-accent bg-accent-subtle border-accent-border";
      case "VALIDATED":
      case "REVALIDATED":
        return "text-indigo-400 bg-indigo-950/60 border-indigo-800";
      case "APPROVED":
        return "text-status-success-text bg-status-success-bg border-status-success-border";
      case "APPLIED":
        return "text-teal-400 bg-teal-950/60 border-teal-800";
      case "REJECTED":
        return "text-status-danger-text bg-status-danger-bg border-status-danger-border";
      case "STALE_ABORT":
        return "text-status-warning-text bg-status-warning-bg border-status-warning-border";
      default:
        return "text-text-muted bg-surface-elevated border-border-default";
    }
  };

  return (
    <Card padding="md" className="bg-surface-card border-border-default space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-border-default">
        <History className="w-4 h-4 text-text-muted" />
        <h4 className="text-xs font-bold text-text-primary">
          Proposal State & Audit Trail
        </h4>
      </div>

      <div className="space-y-2.5">
        {audits.map((a) => (
          <div
            key={a.id}
            className="flex items-start justify-between p-2.5 rounded-lg bg-surface-elevated border border-border-default text-xs gap-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getActionColor(
                    a.action
                  )}`}
                >
                  {a.action}
                </span>
                <span className="text-text-muted text-[11px] flex items-center gap-1 font-mono">
                  <User className="w-3 h-3 text-text-muted" />
                  {a.actor}
                </span>
              </div>

              {a.details_json && Object.keys(a.details_json).length > 0 && (
                <div className="text-[11px] text-text-secondary font-mono">
                  {Object.entries(a.details_json).map(([k, v]) => (
                    <span key={k} className="mr-3 text-text-muted">
                      {k}: <span className="text-text-primary">{String(v)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="text-[10px] font-mono text-text-muted flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3" />
              {new Date(a.created_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
