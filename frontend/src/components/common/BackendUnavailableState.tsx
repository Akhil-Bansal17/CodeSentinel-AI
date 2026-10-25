import React from "react";
import { ServerOff, RefreshCw, Terminal } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./Button";
import { Badge } from "./Badge";

export interface BackendUnavailableStateProps {
  apiEndpoint?: string;
  onRetry: () => void;
  className?: string;
}

export const BackendUnavailableState: React.FC<BackendUnavailableStateProps> = ({
  apiEndpoint = "http://127.0.0.1:8000/api/health",
  onRetry,
  className,
}) => {
  return (
    <div
      role="alert"
      className={cn(
        "p-6 sm:p-8 rounded-lg border border-status-warning-border bg-surface-card text-text-primary shadow-xs",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
        <div className="p-3 rounded-lg bg-status-warning-bg border border-status-warning-border text-status-warning-text shrink-0">
          <ServerOff className="w-6 h-6" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-text-primary flex items-center gap-2 tracking-tight">
            Backend API Disconnected
            <Badge label="Offline" variant="warning" dot size="sm" />
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            The frontend is running, but cannot reach the FastAPI backend service at{" "}
            <code className="text-xs font-mono text-text-primary bg-surface-elevated px-1.5 py-0.5 rounded border border-border-default">
              {apiEndpoint}
            </code>
            .
          </p>
        </div>
      </div>

      <div className="rounded-md border border-border-default bg-[#0b0b0e] p-3 text-xs font-mono text-text-secondary mb-5">
        <div className="flex items-center gap-1.5 text-text-muted mb-2 font-sans font-medium">
          <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
          <span>To start the backend server locally:</span>
        </div>
        <div className="text-emerald-400 bg-surface-elevated p-2 rounded border border-border-subtle select-all">
          uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="md"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Reconnect to Backend
        </Button>
      </div>
    </div>
  );
};
