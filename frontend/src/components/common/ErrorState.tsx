import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "../../lib/utils";

interface ErrorStateProps {
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
      className={cn(
        "p-6 rounded-lg border border-rose-900/40 bg-rose-950/20 text-slate-200",
        className
      )}
    >
      <div className="flex items-start gap-4">
        <div className="p-2 rounded bg-rose-950/60 border border-rose-800 text-rose-400 shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-rose-300">{title}</h4>
            {code && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-400">
                {code}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mb-4">{message}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] text-slate-200 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Request
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
