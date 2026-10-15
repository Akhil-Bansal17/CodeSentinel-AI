import React, { useEffect, useState } from "react";
import {
  Bot,
  ShieldCheck,
  Send,
  HelpCircle,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  Cpu,
} from "lucide-react";
import {
  CodeChunkDetail,
  EvidenceItem,
  QAResponse,
  Repository,
  RepositorySnapshot,
} from "../types/api";
import { repositoryService } from "../services/repositoryService";
import { searchService } from "../services/searchService";
import { ChunkDetailModal } from "../components/search/ChunkDetailModal";
import { StatusBadge } from "../components/common/StatusBadge";

interface AIAssistantPageProps {
  initialRepoId?: string | null;
}

const SAMPLE_QUESTIONS = [
  "Where is user authentication implemented?",
  "How does repository ingestion work?",
  "Which function creates an analysis run?",
  "Where are security findings stored?",
  "How does the application calculate codebase health?",
  "Which modules depend on a particular service?",
];

export const AIAssistantPage: React.FC<AIAssistantPageProps> = ({ initialRepoId }) => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>("");
  const [currentSnapshot, setCurrentSnapshot] = useState<RepositorySnapshot | null>(null);

  const [question, setQuestion] = useState<string>("");
  const [retrievalMode, setRetrievalMode] = useState<"hybrid" | "lexical" | "semantic">("hybrid");
  const [preferLLM, setPreferLLM] = useState<boolean>(false);

  const [isAsking, setIsAsking] = useState<boolean>(false);
  const [qaResponse, setQaResponse] = useState<QAResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isEvidenceExpanded, setIsEvidenceExpanded] = useState<boolean>(true);
  const [inspectingChunk, setInspectingChunk] = useState<CodeChunkDetail | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>("");

  // Load repositories on mount
  useEffect(() => {
    let mounted = true;
    repositoryService
      .listRepositories(1, 50)
      .then((res) => {
        if (!mounted) return;
        const repos = res.items;
        setRepositories(repos);
        if (repos.length > 0) {
          const target = initialRepoId && repos.some((r) => r.id === initialRepoId)
            ? initialRepoId
            : repos[0].id;
          setSelectedRepoId(target);
          const found = repos.find((r) => r.id === target);
          if (found?.latest_snapshot) {
            setCurrentSnapshot(found.latest_snapshot);
          }
        }
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setErrorMessage("Failed to load repositories: " + (err instanceof Error ? err.message : String(err)));
      });
    return () => {
      mounted = false;
    };
  }, [initialRepoId]);

  // Load repository details to get latest snapshot
  useEffect(() => {
    if (!selectedRepoId) return;
    let mounted = true;
    repositoryService
      .getRepository(selectedRepoId)
      .then((repo) => {
        if (!mounted) return;
        if (repo.latest_snapshot) {
          setCurrentSnapshot(repo.latest_snapshot);
        } else {
          setCurrentSnapshot(null);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setCurrentSnapshot(null);
      });
    return () => {
      mounted = false;
    };
  }, [selectedRepoId]);

  // Handle Question Submit
  const handleAsk = async (e?: React.FormEvent, customQuestion?: string) => {
    if (e) e.preventDefault();
    const q = (customQuestion || question).trim();
    if (!selectedRepoId || !currentSnapshot?.id || !q) return;

    setIsAsking(true);
    setErrorMessage(null);
    setLoadingStep("Retrieving candidate AST chunks from snapshot...");

    try {
      setLoadingStep("Validating evidence and citations...");
      const res = await searchService.askQuestion(selectedRepoId, currentSnapshot.id, {
        question: q,
        retrieval_mode: retrievalMode,
        prefer_llm: preferLLM,
      });
      setQaResponse(res);
    } catch (err: unknown) {
      setErrorMessage("Q&A query failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsAsking(false);
      setLoadingStep("");
    }
  };

  // Inspect Chunk Detail from Evidence
  const handleInspectEvidence = async (ev: EvidenceItem) => {
    try {
      const detail = await searchService.getChunkDetail(ev.repository_id, ev.snapshot_id, ev.chunk_id);
      setInspectingChunk(detail);
    } catch {
      setInspectingChunk({
        id: ev.chunk_id,
        index_run_id: "",
        repository_id: ev.repository_id,
        snapshot_id: ev.snapshot_id,
        relative_path: ev.relative_path,
        file_name: ev.relative_path.split("/").pop() || "source",
        language: "Code",
        chunk_index: 0,
        chunk_type: ev.symbol_type || "code_block",
        symbol_name: ev.symbol_name,
        symbol_type: ev.symbol_type,
        start_line: ev.start_line,
        end_line: ev.end_line,
        content: ev.excerpt,
        content_hash: ev.content_hash,
        chunk_fingerprint: "",
        has_embedding: false,
        metadata_json: {},
        citation: ev.citation,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#21262d]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-400" />
              <span>Evidence-Backed Repository Q&amp;A</span>
            </h2>
            <StatusBadge label="Grounded in AST Evidence" variant="success" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Traceable architectural explanations anchored strictly to verified source coordinates
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-[#161b22] border border-[#30363d] px-3 py-1.5 rounded-lg">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Zero Code Execution &bull; Strict Snapshot Isolation</span>
        </div>
      </div>

      {/* Repository & Context Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-[#161b22] border border-[#30363d]">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Repository</label>
          <select
            value={selectedRepoId}
            onChange={(e) => setSelectedRepoId(e.target.value)}
            className="w-full text-xs rounded-lg bg-[#0d1117] border border-[#30363d] text-slate-200 px-3 py-2 focus:outline-none focus:border-emerald-500"
          >
            {repositories.map((repo) => (
              <option key={repo.id} value={repo.id}>
                {repo.name} ({repo.source_type})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Target Snapshot</label>
          <div className="w-full text-xs rounded-lg bg-[#0d1117] border border-[#30363d] text-slate-200 px-3 py-2 flex items-center justify-between">
            <span>
              {currentSnapshot
                ? `${currentSnapshot.id.slice(0, 8)}... (${currentSnapshot.branch || "main"}) — ${currentSnapshot.file_count} files`
                : "No completed snapshot available"}
            </span>
            {currentSnapshot && (
              <span className="text-[11px] font-mono text-emerald-400">
                {currentSnapshot.commit_sha ? currentSnapshot.commit_sha.slice(0, 7) : "HEAD"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Suggested Questions Bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
          <span>Suggested Architecture Questions:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_QUESTIONS.map((sq, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuestion(sq);
                handleAsk(undefined, sq);
              }}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-[#161b22] hover:bg-[#21262d] text-slate-300 border border-[#30363d] hover:border-purple-600/40 text-left transition-all"
            >
              {sq}
            </button>
          ))}
        </div>
      </div>

      {/* Question Form */}
      <form onSubmit={(e) => handleAsk(e)} className="space-y-4">
        <div className="relative">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            placeholder="Ask anything about the codebase (e.g. 'Where is user authentication implemented?', 'Which function creates an analysis run?')..."
            className="w-full p-3.5 pr-24 rounded-lg bg-[#161b22] border border-[#30363d] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 shadow-inner resize-none"
          />
          <button
            type="submit"
            disabled={isAsking || !question.trim() || !currentSnapshot?.id}
            className="absolute right-3 bottom-3 px-4 py-2 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow"
          >
            {isAsking ? (
              <>
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>Answering...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Ask Q&amp;A</span>
              </>
            )}
          </button>
        </div>

        {/* Mode & Provider Options */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Retrieval Mode:</span>
            <div className="inline-flex rounded-md bg-[#161b22] border border-[#30363d] p-0.5">
              {(["hybrid", "lexical", "semantic"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setRetrievalMode(m)}
                  className={`px-2.5 py-1 rounded text-xs capitalize transition-colors ${
                    retrievalMode === m
                      ? "bg-emerald-600/30 text-emerald-300 font-medium border border-emerald-500/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={preferLLM}
                onChange={(e) => setPreferLLM(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-[#0d1117] border border-[#30363d] text-emerald-600 focus:ring-0"
              />
              <span className="text-slate-300 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                <span>Enable Optional LLM (if configured)</span>
              </span>
            </label>
          </div>
        </div>
      </form>

      {/* Loading Progression State */}
      {isAsking && (
        <div className="p-4 rounded-lg bg-[#161b22] border border-[#30363d] flex items-center gap-3 text-xs text-slate-300 animate-pulse">
          <Clock className="w-4 h-4 text-emerald-400 animate-spin" />
          <span>{loadingStep || "Analyzing repository snapshot evidence..."}</span>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-red-950/30 border border-red-800/40 flex items-center gap-2 text-xs text-red-300">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Q&A Answer Display */}
      {qaResponse && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="rounded-xl bg-[#161b22] border border-[#30363d] overflow-hidden shadow-lg">
            {/* Answer Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 bg-[#0d1117] border-b border-[#21262d]">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="p-1.5 rounded-lg bg-emerald-950/50 border border-emerald-800/40 text-emerald-400">
                  <Bot className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-200">
                  {qaResponse.llm_used
                    ? `LLM Synthesis (${qaResponse.llm_provider})`
                    : "Deterministic Grounded Synthesis (No-LLM)"}
                </span>

                <span
                  className={`text-xs px-2 py-0.5 rounded border font-mono ${
                    qaResponse.evidence_sufficiency === "SUFFICIENT"
                      ? "bg-emerald-950/50 text-emerald-300 border-emerald-800/40"
                      : qaResponse.evidence_sufficiency === "PARTIAL"
                      ? "bg-amber-950/50 text-amber-300 border-amber-800/40"
                      : "bg-red-950/50 text-red-300 border-red-800/40"
                  }`}
                >
                  Sufficiency: {qaResponse.evidence_sufficiency}
                </span>

                <span className="text-xs px-2 py-0.5 rounded bg-[#21262d] text-slate-300 border border-[#30363d] font-mono">
                  Confidence: {qaResponse.confidence}
                </span>
              </div>

              <div className="text-xs font-mono text-slate-500">
                Mode: {qaResponse.retrieval_mode}
              </div>
            </div>

            {/* Answer Body */}
            <div className="p-6 space-y-4">
              <div className="prose prose-invert prose-sm max-w-none text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                {qaResponse.answer}
              </div>

              {/* Citations Tag Strip */}
              {qaResponse.citations.length > 0 && (
                <div className="pt-3 border-t border-[#21262d] flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-slate-400 font-medium">Verified Citations:</span>
                  {qaResponse.citations.map((cit, cIdx) => (
                    <span
                      key={cIdx}
                      className="px-2 py-0.5 rounded bg-purple-950/40 border border-purple-800/40 text-purple-300 font-mono text-[11px]"
                    >
                      [{cit}]
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Collapsible Evidence Section */}
            {qaResponse.evidence.length > 0 && (
              <div className="border-t border-[#21262d] bg-[#0d1117]/50">
                <button
                  type="button"
                  onClick={() => setIsEvidenceExpanded(!isEvidenceExpanded)}
                  className="w-full flex items-center justify-between px-6 py-3 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span>Retrieved Evidence Items ({qaResponse.evidence.length})</span>
                  </div>
                  {isEvidenceExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {isEvidenceExpanded && (
                  <div className="p-4 pt-0 space-y-2.5">
                    {qaResponse.evidence.map((ev, eIdx) => (
                      <div
                        key={eIdx}
                        className="p-3 rounded-lg bg-[#161b22] border border-[#30363d] hover:border-purple-600/40 transition-all space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            {ev.symbol_name ? (
                              <span className="font-semibold text-purple-300">
                                {ev.symbol_type}: {ev.symbol_name}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-medium">Code Excerpt</span>
                            )}
                            <span className="font-mono text-slate-400 text-[11px]">
                              {ev.relative_path}:L{ev.start_line}-L{ev.end_line}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-[#21262d] text-slate-400 font-mono text-[10px]">
                              Score: {ev.score}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleInspectEvidence(ev)}
                              className="px-2 py-0.5 rounded bg-[#21262d] hover:bg-[#30363d] text-purple-300 border border-[#30363d] flex items-center gap-1 transition-colors"
                            >
                              <span>Inspect</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div className="p-2.5 rounded bg-[#090d13] border border-[#21262d] font-mono text-[11px] text-slate-300 overflow-x-auto max-h-32">
                          <pre className="whitespace-pre">{ev.excerpt}</pre>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inspect Chunk Modal */}
      {inspectingChunk && (
        <ChunkDetailModal
          chunk={inspectingChunk}
          onClose={() => setInspectingChunk(null)}
        />
      )}
    </div>
  );
};
