import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  message: string;
  code?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "An Error Occurred",
  message,
  code,
  onRetry,
  className,
}) => {
  return (
    <div
      role="alert"
      className={cn(
        "p-6 rounded-lg border border-status-danger-border bg-status-danger-bg text-text-primary",
        className
      )}
    >
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-md bg-status-danger-bg border border-status-danger-border text-status-danger-text shrink-0">
          <AlertTriangle className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-status-danger-text tracking-tight">{title}</h4>
            {code && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-elevated border border-status-danger-border text-status-danger-text">
                {code}
              </span>
            )}
          </div>
          <p className="text-sm text-text-secondary mb-4 leading-relaxed">{message}</p>
          {onRetry && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onRetry}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Retry Request
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
