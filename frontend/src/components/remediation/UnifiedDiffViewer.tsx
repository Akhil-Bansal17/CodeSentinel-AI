import React, { useState } from "react";
import { Copy, Check, Columns, AlignLeft } from "lucide-react";

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

  const handleCopy = () => {
    navigator.clipboard.writeText(diff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderDiffLines = () => {
    if (!diff) {
      return (
        <div className="p-4 text-center text-xs text-slate-500 italic">
          No diff content available.
        </div>
      );
    }

    const lines = diff.split("\n");
    return lines.map((line, idx) => {
      let bgClass = "bg-transparent text-slate-300";
      if (line.startsWith("+++") || line.startsWith("---")) {
        bgClass = "bg-[#1f242c] text-slate-400 font-semibold";
      } else if (line.startsWith("@@")) {
        bgClass = "bg-sky-950/40 text-sky-300 font-semibold";
      } else if (line.startsWith("+")) {
        bgClass = "bg-emerald-950/40 text-emerald-300";
      } else if (line.startsWith("-")) {
        bgClass = "bg-rose-950/40 text-rose-300";
      }

      return (
        <div
          key={idx}
          className={`flex items-start px-3 py-0.5 font-mono text-xs leading-5 border-l-2 ${
            line.startsWith("+")
              ? "border-emerald-500"
              : line.startsWith("-")
              ? "border-rose-500"
              : "border-transparent"
          } ${bgClass}`}
        >
          <span className="w-8 select-none text-slate-600 text-right pr-3 shrink-0">
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
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#30363d] bg-[#0d1117] text-xs font-mono">
        {/* Original */}
        <div className="p-3">
          <div className="text-[11px] font-semibold uppercase text-rose-400 mb-2 flex items-center justify-between">
            <span>Original Source (Lines {startLine}+)</span>
            <span className="px-1.5 py-0.2 rounded bg-rose-950/60 border border-rose-800 text-[10px]">
              BEFORE
            </span>
          </div>
          <div className="bg-[#161b22] rounded p-2.5 border border-[#21262d] overflow-x-auto">
            {origLines.map((line, idx) => (
              <div key={idx} className="flex leading-5 text-rose-200/90">
                <span className="w-6 select-none text-slate-600 pr-2 shrink-0">
                  {startLine + idx}
                </span>
                <span className="whitespace-pre">{line}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Proposed */}
        <div className="p-3">
          <div className="text-[11px] font-semibold uppercase text-emerald-400 mb-2 flex items-center justify-between">
            <span>Proposed Remediation</span>
            <span className="px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-800 text-[10px]">
              AFTER
            </span>
          </div>
          <div className="bg-[#161b22] rounded p-2.5 border border-[#21262d] overflow-x-auto">
            {propLines.map((line, idx) => (
              <div key={idx} className="flex leading-5 text-emerald-200/90">
                <span className="w-6 select-none text-slate-600 pr-2 shrink-0">
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
    <div className="rounded-xl border border-[#30363d] bg-[#0d1117] overflow-hidden shadow-md">
      {/* Diff Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-300 font-semibold">
            {filePath}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#21262d] border border-[#30363d] text-slate-400">
            unified diff
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* View mode toggle */}
          {originalSnippet && proposedSnippet && (
            <div className="flex items-center rounded-lg bg-[#0d1117] p-0.5 border border-[#30363d] mr-2">
              <button
                type="button"
                onClick={() => setViewMode("unified")}
                className={`px-2 py-1 text-[11px] font-medium rounded flex items-center gap-1 transition-colors ${
                  viewMode === "unified"
                    ? "bg-[#21262d] text-slate-100 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
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
                    ? "bg-[#21262d] text-slate-100 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Split Before / After View"
              >
                <Columns className="w-3 h-3" />
                Split
              </button>
            </div>
          )}

          {/* Copy diff button */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-[#21262d] hover:bg-[#30363d] text-slate-200 border border-[#30363d] transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Diff</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Diff Body */}
      {viewMode === "split" && originalSnippet && proposedSnippet
        ? renderSplitView()
        : <div className="divide-y divide-[#1e232b] overflow-x-auto py-1">{renderDiffLines()}</div>}
    </div>
  );
};
