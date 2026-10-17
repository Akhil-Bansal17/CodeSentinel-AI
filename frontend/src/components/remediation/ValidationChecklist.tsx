import React from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MinusCircle,
  ShieldCheck,
} from "lucide-react";
import { RemediationValidationItem } from "../../types/remediation";

interface ValidationChecklistProps {
  validations: RemediationValidationItem[];
  overallStatus: string;
}

export const ValidationChecklist: React.FC<ValidationChecklistProps> = ({
  validations,
  overallStatus,
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PASSED":
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case "FAILED":
        return <XCircle className="w-4 h-4 text-rose-400 shrink-0" />;
      case "SKIPPED":
        return <MinusCircle className="w-4 h-4 text-slate-400 shrink-0" />;
      case "UNAVAILABLE":
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      default:
        return <MinusCircle className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PASSED":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300">
            PASSED
          </span>
        );
      case "FAILED":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800 text-rose-300">
            FAILED
          </span>
        );
      case "SKIPPED":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
            SKIPPED
          </span>
        );
      case "UNAVAILABLE":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800 text-amber-300">
            UNAVAILABLE
          </span>
        );
      default:
        return null;
    }
  };

  const passedCount = validations.filter((v) => v.status === "PASSED").length;
  const totalCount = validations.length;
  const hasFailures = validations.some((v) => v.status === "FAILED");

  return (
    <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-4 space-y-4">
      {/* Header Summary */}
      <div className="flex items-center justify-between pb-3 border-b border-[#21262d] flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              In-Memory Patch Validation Pipeline
            </h3>
            <p className="text-[11px] text-slate-400">
              Isolated verification running static AST analysis and integrity tests (zero runtime execution).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-300">
            {passedCount}/{totalCount} Checks Passed
          </span>
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
              overallStatus === "VALIDATED" || overallStatus === "APPROVED" || overallStatus === "APPLIED"
                ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                : hasFailures
                ? "bg-rose-950/60 border-rose-800 text-rose-300"
                : "bg-amber-950/60 border-amber-800 text-amber-300"
            }`}
          >
            {overallStatus}
          </span>
        </div>
      </div>

      {/* Checks List */}
      <div className="space-y-2.5">
        {validations.map((val) => (
          <div
            key={val.check_id}
            className={`p-3 rounded-lg border text-xs transition-colors ${
              val.status === "FAILED"
                ? "bg-rose-950/20 border-rose-900/60 text-rose-200"
                : val.status === "PASSED"
                ? "bg-[#0d1117] border-[#21262d] text-slate-200"
                : "bg-[#0d1117] border-[#21262d] text-slate-400"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                {getStatusIcon(val.status)}
                <span className="font-semibold text-slate-100">
                  {val.check_name}
                </span>
                <code className="text-[10px] font-mono px-1 py-0.2 rounded bg-[#21262d] text-slate-400">
                  {val.check_id}
                </code>
              </div>
              {getStatusBadge(val.status)}
            </div>

            <p className="text-slate-300 text-[11px] leading-relaxed pl-6">
              {val.explanation}
            </p>

            {val.diagnostic_message && (
              <div className="mt-2 ml-6 p-2 rounded bg-black/40 border border-[#30363d] font-mono text-[10px] text-slate-400 overflow-x-auto whitespace-pre">
                {val.diagnostic_message}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
