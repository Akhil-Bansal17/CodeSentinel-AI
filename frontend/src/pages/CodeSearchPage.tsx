import React, { useCallback, useEffect, useState } from "react";
import {
  Search,
  Binary,
  FileCode,
  Filter,
  RefreshCw,
  Sparkles,
  AlertCircle,
  ChevronRight,
  Database,
  X,
  Code2,
} from "lucide-react";
import {
  CodeChunkDetail,
  CodeIndexRun,
  CodeSearchResponse,
  Repository,
  RepositorySnapshot,
  SearchCapabilities,
  SearchResultItem,
} from "../types/api";
import { repositoryService } from "../services/repositoryService";
import { searchService } from "../services/searchService";
import { ChunkDetailModal } from "../components/search/ChunkDetailModal";
import { StatusBadge } from "../components/common/StatusBadge";

interface CodeSearchPageProps {
  initialRepoId?: string | null;
}

export const CodeSearchPage: React.FC<CodeSearchPageProps> = ({ initialRepoId }) => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>("");
  const [currentSnapshot, setCurrentSnapshot] = useState<RepositorySnapshot | null>(null);

  const [query, setQuery] = useState<string>("");
  const [searchMode, setSearchMode] = useState<"lexical" | "semantic" | "hybrid">("hybrid");
  const [languageFilter, setLanguageFilter] = useState<string>("");
  const [symbolTypeFilter, setSymbolTypeFilter] = useState<string>("");
  const [filePathFilter, setFilePathFilter] = useState<string>("");

  const [indexStatus, setIndexStatus] = useState<CodeIndexRun | null>(null);
  const [capabilities, setCapabilities] = useState<SearchCapabilities | null>(null);
  const [isIndexing, setIsIndexing] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResponse, setSearchResponse] = useState<CodeSearchResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [inspectingChunk, setInspectingChunk] = useState<CodeChunkDetail | null>(null);
  const [isLoadingChunk, setIsLoadingChunk] = useState<boolean>(false);

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

  // Load repository details to get latest snapshot if not present
  useEffect(() => {
    if (!selectedRepoId) return;
    let mounted = true;
    repositoryService
      .getRepository(selectedRepoId)
      .then((repo) => {
        if (!mounted) return;
        if (repo.latest_snapshot) {
          setCurrentSnapshot(repo.latest_snapshot);
        }
      })
      .catch(() => {
        // preserve currentSnapshot if already set
      });
    return () => {
      mounted = false;
    };
  }, [selectedRepoId]);

  // Load index status and capabilities when snapshot is available
  const fetchIndexData = useCallback(() => {
    if (!selectedRepoId || !currentSnapshot?.id) return;
    searchService
      .getIndexStatus(selectedRepoId, currentSnapshot.id)
      .then((status) => setIndexStatus(status))
      .catch(() => setIndexStatus(null));

    searchService
      .getCapabilities(selectedRepoId, currentSnapshot.id)
      .then((caps) => setCapabilities(caps))
      .catch(() => setCapabilities(null));
  }, [selectedRepoId, currentSnapshot?.id]);

  useEffect(() => {
    fetchIndexData();
  }, [fetchIndexData]);

  // Handle Trigger Indexing
  const handleTriggerIndex = async (force: boolean = false) => {
    if (!selectedRepoId || !currentSnapshot?.id) return;
    setIsIndexing(true);
    setErrorMessage(null);
    try {
      const run = await searchService.startIndexing(selectedRepoId, currentSnapshot.id, force);
      setIndexStatus(run);
      fetchIndexData();
    } catch (err: unknown) {
      setErrorMessage("Indexing failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsIndexing(false);
    }
  };

  // Handle Search Submission
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedRepoId || !currentSnapshot?.id || !query.trim()) return;

    setIsSearching(true);
    setErrorMessage(null);
    try {
      const res = await searchService.searchCode(selectedRepoId, currentSnapshot.id, {
        query: query.trim(),
        mode: searchMode,
        language: languageFilter || undefined,
        symbol_type: symbolTypeFilter || undefined,
        file_path: filePathFilter || undefined,
        limit: 25,
      });
      setSearchResponse(res);
      if (res.capabilities) {
        setCapabilities(res.capabilities);
      }
    } catch (err: unknown) {
      setErrorMessage("Search failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSearching(false);
    }
  };

  // Inspect Chunk Detail
  const handleInspectChunk = async (item: SearchResultItem) => {
    setIsLoadingChunk(true);
    try {
      const detail = await searchService.getChunkDetail(
        item.repository_id,
        item.snapshot_id,
        item.chunk_id
      );
      setInspectingChunk(detail);
    } catch {
      setInspectingChunk({
        id: item.chunk_id,
        index_run_id: "",
        repository_id: item.repository_id,
        snapshot_id: item.snapshot_id,
        relative_path: item.relative_path,
        file_name: item.file_name,
        language: item.language,
        chunk_index: 0,
        chunk_type: item.chunk_type,
        symbol_name: item.symbol_name,
        symbol_type: item.symbol_type,
        start_line: item.start_line,
        end_line: item.end_line,
        start_column: item.start_column,
        end_column: item.end_column,
        content: item.excerpt,
        content_hash: item.content_hash,
        chunk_fingerprint: "",
        has_embedding: false,
        metadata_json: {},
        citation: item.citation,
      });
    } finally {
      setIsLoadingChunk(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#21262d]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <Search className="w-5 h-5 text-purple-400" />
              <span>Semantic Code Search &amp; AST Retrieval</span>
            </h2>
            <StatusBadge label="Phase 6 Complete" variant="success" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Deterministic AST symbol search, BM25 ranking, and multi-modal vector retrieval
          </p>
        </div>

        {/* Index Status & Action */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#161b22] border border-[#30363d] text-xs">
            <Database className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-slate-400">Index:</span>
            <span className="font-semibold text-slate-200">
              {indexStatus?.status === "completed"
                ? `${indexStatus.chunk_count} chunks`
                : indexStatus?.status || "Unindexed"}
            </span>
          </div>

          <button
            onClick={() => handleTriggerIndex(true)}
            disabled={isIndexing || !currentSnapshot?.id}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#21262d] hover:bg-[#30363d] text-purple-300 border border-purple-800/40 hover:border-purple-600/50 flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isIndexing ? "animate-spin" : ""}`} />
            <span>{isIndexing ? "Indexing..." : "Reindex Snapshot"}</span>
          </button>
        </div>
      </div>

      {/* Repository & Snapshot Selection Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-[#161b22] border border-[#30363d]">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Repository</label>
          <select
            value={selectedRepoId}
            onChange={(e) => setSelectedRepoId(e.target.value)}
            className="w-full text-xs rounded-lg bg-[#0d1117] border border-[#30363d] text-slate-200 px-3 py-2 focus:outline-none focus:border-purple-500"
          >
            {repositories.map((repo) => (
              <option key={repo.id} value={repo.id}>
                {repo.name} ({repo.source_type})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Active Snapshot</label>
          <div className="w-full text-xs rounded-lg bg-[#0d1117] border border-[#30363d] text-slate-200 px-3 py-2 flex items-center justify-between">
            <span>
              {currentSnapshot
                ? `${currentSnapshot.id.slice(0, 8)}... (${currentSnapshot.branch || "main"}) — ${currentSnapshot.file_count} files`
                : "No completed snapshot"}
            </span>
            {currentSnapshot && (
              <span className="text-[11px] font-mono text-purple-400">
                {currentSnapshot.commit_sha ? currentSnapshot.commit_sha.slice(0, 7) : "HEAD"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Search Input & Controls */}
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbols, functions, classes, or code concepts (e.g. authenticate_user, calculate_health)..."
            className="w-full pl-10 pr-24 py-2.5 rounded-lg bg-[#161b22] border border-[#30363d] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-500 shadow-inner"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-20 text-slate-400 hover:text-slate-200 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="absolute right-2 px-3 py-1.5 text-xs font-medium rounded-md bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 transition-colors"
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </div>

        {/* Mode Selector and Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Mode Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#161b22] border border-[#30363d]">
            <button
              type="button"
              onClick={() => setSearchMode("hybrid")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                searchMode === "hybrid"
                  ? "bg-purple-600/30 text-purple-300 border border-purple-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Hybrid (RRF)</span>
              {capabilities?.semantic_available ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Vector + BM25 Ready" />
              ) : (
                <span className="text-[10px] text-slate-500 bg-[#21262d] px-1 rounded">BM25</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSearchMode("lexical")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                searchMode === "lexical"
                  ? "bg-purple-600/30 text-purple-300 border border-purple-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-indigo-400" />
              <span>Lexical (BM25)</span>
            </button>

            <button
              type="button"
              onClick={() => setSearchMode("semantic")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                searchMode === "semantic"
                  ? "bg-purple-600/30 text-purple-300 border border-purple-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Binary className="w-3.5 h-3.5 text-cyan-400" />
              <span>Semantic (Vector)</span>
              {!capabilities?.semantic_available && (
                <span className="text-[10px] text-amber-400 bg-amber-950/40 border border-amber-800/40 px-1 rounded">
                  Optional
                </span>
              )}
            </button>
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <span className="text-slate-500">Filters:</span>
            </div>

            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="px-2.5 py-1 rounded bg-[#161b22] border border-[#30363d] text-slate-300 text-xs focus:outline-none focus:border-purple-500"
            >
              <option value="">All Languages</option>
              <option value="Python">Python</option>
              <option value="TypeScript">TypeScript</option>
              <option value="JavaScript">JavaScript</option>
              <option value="Markdown">Markdown</option>
            </select>

            <select
              value={symbolTypeFilter}
              onChange={(e) => setSymbolTypeFilter(e.target.value)}
              className="px-2.5 py-1 rounded bg-[#161b22] border border-[#30363d] text-slate-300 text-xs focus:outline-none focus:border-purple-500"
            >
              <option value="">All Symbol Types</option>
              <option value="function">Function</option>
              <option value="class">Class</option>
              <option value="import">Import Block</option>
              <option value="doc">Documentation</option>
              <option value="code_block">Code Block</option>
            </select>

            <input
              type="text"
              value={filePathFilter}
              onChange={(e) => setFilePathFilter(e.target.value)}
              placeholder="Filter by path..."
              className="px-2.5 py-1 rounded bg-[#161b22] border border-[#30363d] text-slate-300 text-xs w-32 focus:outline-none focus:border-purple-500 placeholder:text-slate-600"
            />
          </div>
        </div>
      </form>

      {/* Optional Semantic Status Notice */}
      {!capabilities?.semantic_available && searchMode === "semantic" && (
        <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/30 flex items-start gap-2.5 text-xs text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <span className="font-semibold">Semantic Embedding Provider Not Configured: </span>
            <span>
              Pure vector similarity retrieval requires a local embedding endpoint (e.g. Ollama or OpenAI-compatible service).
              Switch to <strong>Hybrid (RRF)</strong> or <strong>Lexical (BM25)</strong> to search with full AST symbol boosting.
            </span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3 rounded-lg bg-red-950/30 border border-red-800/40 flex items-center gap-2 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Search Results Display */}
      {searchResponse && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-[#21262d]">
            <span>
              Found <strong className="text-slate-200">{searchResponse.total_results}</strong> result(s) using{" "}
              <code className="text-purple-300">{searchResponse.mode_used}</code> retrieval
            </span>
            {searchResponse.warning && (
              <span className="text-amber-400 text-[11px]">{searchResponse.warning}</span>
            )}
          </div>

          {searchResponse.results.length === 0 ? (
            <div className="text-center py-12 rounded-lg bg-[#161b22] border border-[#30363d] space-y-2">
              <Code2 className="w-8 h-8 text-slate-500 mx-auto" />
              <h4 className="text-sm font-medium text-slate-300">No matching code chunks found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try broadening your query, removing language or path filters, or triggering snapshot reindexing.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {searchResponse.results.map((item) => (
                <div
                  key={item.chunk_id}
                  className="rounded-lg bg-[#161b22] border border-[#30363d] hover:border-purple-600/40 p-4 transition-all space-y-3 group"
                >
                  {/* Result Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.symbol_name ? (
                          <span className="text-sm font-semibold text-purple-300 flex items-center gap-1.5">
                            <span className="text-xs px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/40 text-purple-400 font-mono">
                              {item.symbol_type || item.chunk_type}
                            </span>
                            <span>{item.symbol_name}</span>
                          </span>
                        ) : (
                          <span className="text-sm font-medium text-slate-200">
                            {item.file_name}
                          </span>
                        )}

                        <span className="text-xs font-mono text-indigo-300 bg-indigo-950/40 border border-indigo-800/40 px-2 py-0.5 rounded">
                          {item.citation}
                        </span>

                        <span className="text-xs text-slate-400 bg-[#21262d] px-2 py-0.5 rounded border border-[#30363d]">
                          {item.language}
                        </span>
                      </div>

                      <p className="text-xs font-mono text-slate-400 mt-1 truncate">
                        {item.relative_path}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs px-2 py-1 rounded bg-[#21262d] text-slate-300 border border-[#30363d] font-mono">
                        Score: {item.score}
                      </span>
                      <button
                        onClick={() => handleInspectChunk(item)}
                        disabled={isLoadingChunk}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-[#21262d] group-hover:bg-purple-900/30 text-slate-300 group-hover:text-purple-300 border border-[#30363d] group-hover:border-purple-700/50 flex items-center gap-1 transition-all"
                      >
                        <span>Inspect</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Excerpt Code Preview */}
                  <div className="p-3 rounded bg-[#090d13] border border-[#21262d] overflow-x-auto font-mono text-xs text-slate-300 leading-relaxed max-h-40">
                    <pre className="whitespace-pre">{item.excerpt}</pre>
                  </div>

                  {/* Terms & Badges */}
                  {item.matched_terms && item.matched_terms.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <span>Matches:</span>
                      {item.matched_terms.map((term, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-1.5 py-0.5 rounded bg-[#21262d] text-slate-400 font-mono"
                        >
                          {term}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chunk Detail Modal */}
      {inspectingChunk && (
        <ChunkDetailModal
          chunk={inspectingChunk}
          onClose={() => setInspectingChunk(null)}
        />
      )}
    </div>
  );
};
