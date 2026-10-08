import React from "react";
import { Search, Binary } from "lucide-react";
import { StatusBadge } from "../components/common/StatusBadge";

export const CodeSearchPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-[#21262d]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-100">Code Search & Indexing</h2>
            <StatusBadge label="Coming in Phase 2" variant="neutral" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Deterministic AST symbol search and semantic vector code retrieval
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-8 text-center max-w-2xl mx-auto space-y-4">
        <div className="w-12 h-12 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center mx-auto text-purple-400">
          <Search className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-200">
          AST & Vector Indexing Scheduled for Phase 2
        </h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          In Phase 2, code syntax chunking and embedding pipelines will index your repository
          to power hybrid search (exact AST symbol matching + vector semantic retrieval).
        </p>

        <div className="pt-2">
          <span className="text-xs font-mono text-slate-400 bg-[#0d1117] border border-[#21262d] px-3 py-1.5 rounded-full inline-flex items-center gap-2">
            <Binary className="w-3.5 h-3.5 text-purple-400" />
            <span>Target: Multi-language AST Chunking &amp; pgvector Integration</span>
          </span>
        </div>
      </div>
    </div>
  );
};
