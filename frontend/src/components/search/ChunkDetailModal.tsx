import React from "react";
import { X, Copy, Check, FileCode, Hash, MapPin, Layers } from "lucide-react";
import { CodeChunkDetail } from "../../types/api";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262d] bg-[#0d1117]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-purple-950/40 border border-purple-800/40 text-purple-400 shrink-0">
              <FileCode className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-100 truncate">
                  {chunk.file_name}
                </h3>
                {chunk.symbol_name && (
                  <span className="px-2 py-0.5 text-xs font-mono rounded bg-[#21262d] text-purple-300 border border-[#30363d]">
                    {chunk.symbol_type || "symbol"}: {chunk.symbol_name}
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-slate-400 truncate mt-0.5">
                {chunk.relative_path}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyCitation}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#21262d] hover:bg-[#30363d] text-slate-300 border border-[#30363d] flex items-center gap-1.5 transition-colors"
              title="Copy Citation"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy Citation"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#21262d] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="flex flex-wrap items-center gap-4 px-6 py-2.5 bg-[#0d1117]/60 border-b border-[#21262d] text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
            <span>Lines {chunk.start_line} – {chunk.end_line}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Type: {chunk.chunk_type}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Language: {chunk.language}</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
            <Hash className="w-3 h-3" />
            <span>SHA: {chunk.content_hash.slice(0, 12)}...</span>
          </div>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto p-4 bg-[#090d13] font-mono text-xs text-slate-200 leading-relaxed">
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, idx) => {
                const lineNum = chunk.start_line + idx;
                return (
                  <tr key={idx} className="hover:bg-[#161b22]/70">
                    <td className="w-12 pr-4 text-right select-none text-slate-600 font-mono text-[11px] align-top">
                      {lineNum}
                    </td>
                    <td className="whitespace-pre overflow-x-auto text-slate-300">
                      {line || " "}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[#21262d] bg-[#0d1117] text-xs text-slate-400">
          <span>
            Citation: <code className="text-purple-300 bg-[#161b22] px-1.5 py-0.5 rounded border border-[#21262d]">{chunk.citation}</code>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-[#21262d] hover:bg-[#30363d] text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
