import React from "react";
import { X, Copy, Check, FileCode, Hash, MapPin, Layers } from "lucide-react";
import { CodeChunkDetail } from "../../types/api";
import { Button } from "../common/Button";

interface ChunkDetailModalProps {
  chunk: CodeChunkDetail | null;
  onClose: () => void;
}

export const ChunkDetailModal: React.FC<ChunkDetailModalProps> = ({ chunk, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!chunk) return null;

  const handleCopyCitation = () => {
    navigator.clipboard.writeText(chunk.citation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = chunk.content.split("\n");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Code Chunk Inspector"
        className="relative w-full max-w-4xl max-h-[90vh] bg-surface-card border border-border-default rounded-xl shadow-modal flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default bg-surface-elevated">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-accent-subtle border border-accent-border text-accent shrink-0 shadow-2xs">
              <FileCode className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-text-primary truncate">
                  {chunk.file_name}
                </h3>
                {chunk.symbol_name && (
                  <span className="px-2 py-0.5 text-xs font-mono rounded bg-surface-base text-accent border border-border-default">
                    {chunk.symbol_type || "symbol"}: {chunk.symbol_name}
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-text-muted truncate mt-0.5">
                {chunk.relative_path}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyCitation}
              leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              className="text-xs font-medium"
              title="Copy Citation"
            >
              <span>{copied ? "Copied" : "Copy Citation"}</span>
            </Button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="flex flex-wrap items-center gap-4 px-6 py-2.5 bg-surface-base/80 border-b border-border-default text-xs text-text-muted">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-accent" />
            <span className="font-mono text-text-secondary">Lines {chunk.start_line} – {chunk.end_line}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-text-muted" />
            <span>Type: <span className="font-mono text-text-secondary">{chunk.chunk_type}</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Language: <span className="text-text-primary font-medium">{chunk.language}</span></span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-text-muted ml-auto">
            <Hash className="w-3 h-3" />
            <span>SHA: {chunk.content_hash.slice(0, 12)}...</span>
          </div>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto p-4 bg-surface-base font-mono text-xs text-text-secondary leading-relaxed">
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, idx) => {
                const lineNum = chunk.start_line + idx;
                return (
                  <tr key={idx} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="w-12 pr-4 text-right select-none text-text-muted/60 font-mono text-[11px] align-top">
                      {lineNum}
                    </td>
                    <td className="whitespace-pre overflow-x-auto text-text-primary">
                      {line || " "}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border-default bg-surface-elevated text-xs text-text-muted">
          <span className="font-mono text-[11px] truncate max-w-md">
            Citation: <code className="text-accent bg-surface-base px-1.5 py-0.5 rounded border border-border-default select-all">{chunk.citation}</code>
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
