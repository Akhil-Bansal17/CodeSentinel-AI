import React from "react";
import { FolderGit2 } from "lucide-react";
import { cn } from "../../lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-lg border border-[#21262d] bg-[#161b22]/50",
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-[#21262d] flex items-center justify-center text-slate-400 mb-4 border border-[#30363d]">
        {icon || <FolderGit2 className="w-6 h-6 text-slate-400" />}
      </div>
      <h3 className="text-base font-semibold text-slate-200 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-medium rounded-md transition-colors shadow-sm cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
