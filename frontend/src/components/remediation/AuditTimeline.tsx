import React from "react";
import { History, User, Clock } from "lucide-react";
import { RemediationAuditItem } from "../../types/remediation";

interface AuditTimelineProps {
  audits: RemediationAuditItem[];
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ audits }) => {
  if (!audits || audits.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-slate-500 italic rounded-xl border border-[#30363d] bg-[#161b22]">
        No audit events recorded for this proposal.
      </div>
    );
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "PROPOSAL_CREATED":
        return "text-sky-400 bg-sky-950/60 border-sky-800";
      case "VALIDATED":
      case "REVALIDATED":
        return "text-indigo-400 bg-indigo-950/60 border-indigo-800";
      case "APPROVED":
        return "text-emerald-400 bg-emerald-950/60 border-emerald-800";
      case "APPLIED":
        return "text-teal-400 bg-teal-950/60 border-teal-800";
      case "REJECTED":
        return "text-rose-400 bg-rose-950/60 border-rose-800";
      case "STALE_ABORT":
        return "text-amber-400 bg-amber-950/60 border-amber-800";
      default:
        return "text-slate-400 bg-slate-800 border-slate-700";
    }
  };

  return (
    <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-4 space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-[#21262d]">
        <History className="w-4 h-4 text-slate-400" />
        <h4 className="text-xs font-bold text-slate-200">
          Proposal State & Audit Trail
        </h4>
      </div>

      <div className="space-y-2.5">
        {audits.map((a) => (
          <div
            key={a.id}
            className="flex items-start justify-between p-2.5 rounded-lg bg-[#0d1117] border border-[#21262d] text-xs gap-3"
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
                <span className="text-slate-400 text-[11px] flex items-center gap-1 font-mono">
                  <User className="w-3 h-3 text-slate-500" />
                  {a.actor}
                </span>
              </div>

              {a.details_json && Object.keys(a.details_json).length > 0 && (
                <div className="text-[11px] text-slate-300 font-mono">
                  {Object.entries(a.details_json).map(([k, v]) => (
                    <span key={k} className="mr-3 text-slate-400">
                      {k}: <span className="text-slate-200">{String(v)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3" />
              {new Date(a.created_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
