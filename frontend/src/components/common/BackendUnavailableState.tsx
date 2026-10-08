import React from "react";
import { ServerOff, RefreshCw, Terminal } from "lucide-react";
import { cn } from "../../lib/utils";

interface BackendUnavailableStateProps {
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
      className={cn(
        "p-6 sm:p-8 rounded-lg border border-amber-900/50 bg-[#161b22] text-slate-200",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
        <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/80 text-amber-400 shrink-0">
          <ServerOff className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            Backend API Disconnected
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800 text-amber-400">
              Offline
            </span>
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            The frontend is running, but cannot reach the FastAPI backend service at{" "}
            <code className="text-xs font-mono text-slate-300 bg-[#21262d] px-1.5 py-0.5 rounded border border-[#30363d]">
              {apiEndpoint}
            </code>
            .
          </p>
        </div>
      </div>

      <div className="rounded border border-[#30363d] bg-[#0d1117] p-3 text-xs font-mono text-slate-300 mb-5">
        <div className="flex items-center gap-1.5 text-slate-400 mb-2 font-sans font-medium">
          <Terminal className="w-3.5 h-3.5" />
          <span>To start the backend server locally:</span>
        </div>
        <div className="text-emerald-400 bg-[#161b22] p-2 rounded border border-[#21262d] select-all">
          uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-slate-200 text-sm font-medium rounded border border-[#30363d] transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Reconnect to Backend
        </button>
      </div>
    </div>
  );
};
