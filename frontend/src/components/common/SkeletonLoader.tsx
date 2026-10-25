import React from "react";
import { cn } from "../../lib/utils";

export type SkeletonVariant = "text" | "circular" | "rectangular" | "card" | "table";

export interface SkeletonLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  lines?: number;
  rows?: number;
  columns?: number;
  width?: string | number;
  height?: string | number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = "rectangular",
  lines = 3,
  rows = 4,
  columns = 4,
  width,
  height,
  className,
  style,
  ...props
}) => {
  const baseAnimation = "animate-pulse bg-surface-elevated border border-border-subtle/50";

  if (variant === "text") {
    return (
      <div
        role="status"
        aria-label="Loading content..."
        className={cn("space-y-2.5 w-full", className)}
        {...props}
      >
        <span className="sr-only">Loading...</span>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-3.5 rounded-sm",
              baseAnimation,
              i === lines - 1 && lines > 1 ? "w-2/3" : "w-full"
            )}
            style={{ width: i === lines - 1 && lines > 1 ? undefined : width, height }}
          />
        ))}
      </div>
    );
  }

  if (variant === "circular") {
    return (
      <div
        role="status"
        aria-label="Loading..."
        className={cn("rounded-full shrink-0", baseAnimation, className)}
        style={{ width: width || "2.5rem", height: height || "2.5rem", ...style }}
        {...props}
      >
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        role="status"
        aria-label="Loading card..."
        className={cn(
          "rounded-lg border border-border-default bg-surface-card p-6 space-y-4",
          className
        )}
        {...props}
      >
        <span className="sr-only">Loading card...</span>
        <div className="flex items-center gap-3">
          <div className={cn("w-8 h-8 rounded-md", baseAnimation)} />
          <div className="space-y-1.5 flex-1">
            <div className={cn("h-4 w-1/3 rounded-xs", baseAnimation)} />
            <div className={cn("h-3 w-1/2 rounded-xs", baseAnimation)} />
          </div>
        </div>
        <div className="space-y-2 pt-2">
          <div className={cn("h-3 w-full rounded-xs", baseAnimation)} />
          <div className={cn("h-3 w-4/5 rounded-xs", baseAnimation)} />
        </div>
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div
        role="status"
        aria-label="Loading table..."
        className={cn(
          "rounded-lg border border-border-default bg-surface-card overflow-hidden",
          className
        )}
        {...props}
      >
        <span className="sr-only">Loading table...</span>
        <div className="bg-surface-elevated border-b border-border-default px-4 py-3 flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className={cn("h-3.5 rounded-xs flex-1", baseAnimation)} />
          ))}
        </div>
        <div className="divide-y divide-border-subtle p-4 space-y-3">
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="flex gap-4 pt-3 first:pt-0">
              {Array.from({ length: columns }).map((_, c) => (
                <div key={c} className={cn("h-3 rounded-xs flex-1", baseAnimation)} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Rectangular default
  return (
    <div
      role="status"
      aria-label="Loading..."
      className={cn("rounded-md", baseAnimation, className)}
      style={{ width, height, ...style }}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};
