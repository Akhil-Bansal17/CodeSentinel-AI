import React from "react";
import { Plus, GitFork } from "lucide-react";
import { EmptyState } from "../components/common/EmptyState";
import { StatusBadge } from "../components/common/StatusBadge";

interface RepositoriesPageProps {
  onAnalyzeClick: () => void;
}

export const RepositoriesPage: React.FC<RepositoriesPageProps> = ({ onAnalyzeClick }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#21262d]">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            Repositories
            <StatusBadge label="Phase 0 Ready" variant="success" />
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage tracked codebases and branch snapshots
          </p>
        </div>

        <button
          type="button"
          onClick={onAnalyzeClick}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-medium transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Connect Repository</span>
        </button>
      </div>

      <EmptyState
        icon={<GitFork className="w-6 h-6 text-slate-400" />}
        title="No repositories connected yet."
        description="Connect your Git repository via HTTPS or local path to ingest file structures and schedule deterministic static analysis runs."
        actionLabel="Connect First Repository"
        onAction={onAnalyzeClick}
      />
    </div>
  );
};
