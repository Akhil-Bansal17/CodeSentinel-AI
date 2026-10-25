import React from "react";
import { FolderGit2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./Button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  size?: "sm" | "md";
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  size = "md",
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-lg border border-border-default bg-surface-card",
        size === "sm" ? "p-6 sm:p-8" : "p-8 sm:p-12",
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center text-text-muted mb-4 border border-border-default">
        {icon || <FolderGit2 className="w-6 h-6 text-text-secondary" aria-hidden="true" />}
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1 tracking-tight">{title}</h3>
      <p className="text-sm text-text-secondary max-w-md mb-6 leading-relaxed">{description}</p>
      
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actionLabel && onAction && (
            <Button
              variant="primary"
              size="md"
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              variant="secondary"
              size="md"
              onClick={onSecondaryAction}
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
