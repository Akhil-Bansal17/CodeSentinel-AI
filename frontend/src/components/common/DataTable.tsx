import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (item: T, index: number) => React.ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  onRowClick?: (item: T, index: number) => void;
  selectedKey?: string | number;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyState?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  compact?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  selectedKey,
  isLoading = false,
  emptyMessage = "No records found.",
  emptyState,
  className,
  containerClassName,
  compact = false,
}: DataTableProps<T>) {
  const alignClasses = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  return (
    <div
      className={cn(
        "w-full overflow-x-auto rounded-lg border border-border-default bg-surface-card shadow-xs",
        containerClassName
      )}
    >
      <table className={cn("w-full text-left text-xs sm:text-sm border-collapse", className)}>
        <thead className="bg-surface-elevated border-b border-border-default">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={{ width: col.width }}
                className={cn(
                  "font-semibold text-text-secondary uppercase tracking-wider text-[11px]",
                  compact ? "px-3 py-2" : "px-4 py-3",
                  alignClasses[col.align || "left"],
                  col.headerClassName
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-text-muted">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-accent" aria-hidden="true" />
                  <span className="text-xs font-mono">Loading data...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-10 text-center text-text-muted">
                {emptyState || (
                  <p className="text-sm font-sans text-text-muted py-2">{emptyMessage}</p>
                )}
              </td>
            </tr>
          ) : (
            data.map((item, index) => {
              const rowKey = keyExtractor(item, index);
              const isSelected = selectedKey !== undefined && selectedKey === rowKey;
              const isClickable = Boolean(onRowClick);

              return (
                <tr
                  key={rowKey}
                  onClick={() => onRowClick?.(item, index)}
                  className={cn(
                    "transition-colors",
                    isClickable && "cursor-pointer hover:bg-surface-hover/70",
                    isSelected ? "bg-accent-subtle/40 border-l-2 border-l-accent" : "hover:bg-surface-hover/40"
                  )}
                >
                  {columns.map((col) => {
                    const content = col.render
                      ? col.render(item, index)
                      : (item as Record<string, unknown>)[col.key] !== undefined
                      ? String((item as Record<string, unknown>)[col.key])
                      : null;

                    return (
                      <td
                        key={`${rowKey}-${col.key}`}
                        className={cn(
                          "text-text-primary whitespace-nowrap",
                          compact ? "px-3 py-2" : "px-4 py-3",
                          alignClasses[col.align || "left"],
                          col.className
                        )}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
