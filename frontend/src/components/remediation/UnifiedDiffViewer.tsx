import React, { useState } from "react";
import { Copy, Check, Columns, AlignLeft } from "lucide-react";
import { Button } from "../common/Button";

interface UnifiedDiffViewerProps {
  diff: string;
  filePath: string;
  originalSnippet?: string;
  proposedSnippet?: string;
  startLine?: number;
}

export const UnifiedDiffViewer: React.FC<UnifiedDiffViewerProps> = ({
  diff,
  filePath,
  originalSnippet,
  proposedSnippet,
  startLine = 1,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"unified" | "split">("unified");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(diff);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = diff;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderDiffLines = () => {
    if (!diff) {
      return (
        <div className="p-8 text-center text-xs text-text-muted italic">
          No diff content available.
        </div>
      );
    }

    const lines = diff.split("\n");
    return lines.map((line, idx) => {
      let bgClass = "bg-transparent text-text-secondary";
      let borderClass = "border-transparent";

      if (line.startsWith("+++") || line.startsWith("---")) {
        bgClass = "bg-surface-subtle text-text-muted font-semibold";
      } else if (line.startsWith("@@")) {
        bgClass = "bg-sky-950/40 text-sky-300 font-semibold";
        borderClass = "border-sky-500";
      } else if (line.startsWith("+")) {
        bgClass = "bg-status-success-bg/70 text-emerald-300";
        borderClass = "border-emerald-500";
      } else if (line.startsWith("-")) {
        bgClass = "bg-status-danger-bg/70 text-rose-300";
        borderClass = "border-rose-500";
      }

      return (
        <div
          key={idx}
          className={`flex items-start px-3 py-0.5 font-mono text-xs leading-5 border-l-2 ${borderClass} ${bgClass}`}
        >
          <span className="w-8 select-none text-text-muted text-right pr-3 shrink-0">
            {idx + 1}
          </span>
          <span className="whitespace-pre overflow-x-auto flex-1">{line}</span>
        </div>
      );
    });
  };

  const renderSplitView = () => {
    const origLines = (originalSnippet || "").split("\n");
    const propLines = (proposedSnippet || "").split("\n");

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border-default bg-surface-base text-xs font-mono">
        {/* Original (Before) */}
        <div className="p-3">
          <div className="text-[11px] font-semibold uppercase text-status-danger mb-2 flex items-center justify-between">
            <span>Original Source (Lines {startLine}+)</span>
            <span className="px-1.5 py-0.5 rounded bg-status-danger-bg border border-status-danger-border text-status-danger-text text-[10px] font-bold">
              BEFORE
            </span>
          </div>
          <div className="bg-surface-elevated rounded p-2.5 border border-border-default overflow-x-auto">
            {origLines.map((line, idx) => (
              <div key={idx} className="flex leading-5 text-rose-200/90">
                <span className="w-6 select-none text-text-muted pr-2 shrink-0">
                  {startLine + idx}
                </span>
                <span className="whitespace-pre">{line}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Proposed (After) */}
        <div className="p-3">
          <div className="text-[11px] font-semibold uppercase text-status-success mb-2 flex items-center justify-between">
            <span>Proposed Remediation</span>
            <span className="px-1.5 py-0.5 rounded bg-status-success-bg border border-status-success-border text-status-success-text text-[10px] font-bold">
              AFTER
            </span>
          </div>
          <div className="bg-surface-elevated rounded p-2.5 border border-border-default overflow-x-auto">
            {propLines.map((line, idx) => (
              <div key={idx} className="flex leading-5 text-emerald-200/90">
                <span className="w-6 select-none text-text-muted pr-2 shrink-0">
                  {startLine + idx}
                </span>
                <span className="whitespace-pre">{line}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-border-default bg-surface-base overflow-hidden shadow-xs">
      {/* Diff Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-card border-b border-border-default flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-text-primary font-semibold">
            {filePath}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-subtle border border-border-default text-text-secondary">
            unified diff
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          {originalSnippet && proposedSnippet && (
            <div className="flex items-center rounded-md bg-surface-elevated p-0.5 border border-border-default">
              <button
                type="button"
                onClick={() => setViewMode("unified")}
                className={`px-2 py-1 text-[11px] font-medium rounded flex items-center gap-1 transition-colors ${
                  viewMode === "unified"
                    ? "bg-surface-card text-text-primary shadow-xs"
                    : "text-text-muted hover:text-text-primary"
                }`}
                title="Unified Diff View"
              >
                <AlignLeft className="w-3 h-3" />
                Unified
              </button>
              <button
                type="button"
                onClick={() => setViewMode("split")}
                className={`px-2 py-1 text-[11px] font-medium rounded flex items-center gap-1 transition-colors ${
                  viewMode === "split"
                    ? "bg-surface-card text-text-primary shadow-xs"
                    : "text-text-muted hover:text-text-primary"
                }`}
                title="Split Before / After View"
              >
                <Columns className="w-3 h-3" />
                Split
              </button>
            </div>
          )}

          {/* Copy diff button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            className="text-xs font-medium"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-status-success" />
                <span className="text-status-success">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-text-muted" />
                <span>Copy Diff</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Diff Body */}
      {viewMode === "split" && originalSnippet && proposedSnippet ? (
        renderSplitView()
      ) : (
        <div className="divide-y divide-border-subtle overflow-x-auto py-1 bg-surface-base">
          {renderDiffLines()}
        </div>
      )}
    </div>
  );
};
