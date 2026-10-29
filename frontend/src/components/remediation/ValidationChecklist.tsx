import React from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MinusCircle,
  ShieldCheck,
} from "lucide-react";
import { RemediationValidationItem } from "../../types/remediation";
import { Card } from "../common/Card";

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
        return <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />;
      case "FAILED":
        return <XCircle className="w-4 h-4 text-status-danger shrink-0" />;
      case "SKIPPED":
        return <MinusCircle className="w-4 h-4 text-text-muted shrink-0" />;
      case "UNAVAILABLE":
        return <AlertTriangle className="w-4 h-4 text-status-warning shrink-0" />;
      default:
        return <MinusCircle className="w-4 h-4 text-text-muted shrink-0" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PASSED":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-status-success-bg border border-status-success-border text-status-success-text">
            PASSED
          </span>
        );
      case "FAILED":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-status-danger-bg border border-status-danger-border text-status-danger-text">
            FAILED
          </span>
        );
      case "SKIPPED":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-elevated border border-border-default text-text-muted">
            SKIPPED
          </span>
        );
      case "UNAVAILABLE":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-status-warning-bg border border-status-warning-border text-status-warning-text">
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
    <Card padding="md" className="bg-surface-card border-border-default space-y-4">
      {/* Header Summary */}
      <div className="flex items-center justify-between pb-3 border-b border-border-default flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-accent-subtle flex items-center justify-center text-accent shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">
              In-Memory Patch Validation Pipeline
            </h3>
            <p className="text-[11px] text-text-muted">
              Isolated verification running static AST analysis and integrity tests (zero runtime execution).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-text-secondary">
            {passedCount}/{totalCount} Checks Passed
          </span>
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
              overallStatus === "VALIDATED" || overallStatus === "APPROVED" || overallStatus === "APPLIED"
                ? "bg-status-success-bg border-status-success-border text-status-success-text"
                : hasFailures
                ? "bg-status-danger-bg border-status-danger-border text-status-danger-text"
                : "bg-status-warning-bg border-status-warning-border text-status-warning-text"
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
                ? "bg-status-danger-bg/40 border-status-danger-border/80 text-rose-200"
                : val.status === "PASSED"
                ? "bg-surface-elevated border-border-default text-text-primary"
                : "bg-surface-base border-border-default text-text-secondary"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                {getStatusIcon(val.status)}
                <span className="font-semibold text-text-primary">
                  {val.check_name}
                </span>
                <code className="text-[10px] font-mono px-1 py-0.5 rounded bg-surface-subtle border border-border-default text-text-muted">
                  {val.check_id}
                </code>
              </div>
              {getStatusBadge(val.status)}
            </div>

            <p className="text-text-secondary text-[11px] leading-relaxed pl-6">
              {val.explanation}
            </p>

            {val.diagnostic_message && (
              <div className="mt-2 ml-6 p-2 rounded bg-surface-base border border-border-default font-mono text-[10px] text-text-muted overflow-x-auto whitespace-pre">
                {val.diagnostic_message}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};
