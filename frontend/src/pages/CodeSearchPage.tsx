import React, { useCallback, useContext, useEffect, useState } from "react";
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
  Copy,
  Check,
  RotateCcw,
  BookOpen,
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
import { RepositoryContext } from "../context/RepositoryContext";

interface CodeSearchPageProps {
  initialRepoId?: string | null;
}

const SUGGESTED_SYMBOLS = [
  "create_analysis_run",
  "parse_ast",
  "DependencyGraph",
  "SecurityRule",
  "validate_token",
];

export const CodeSearchPage: React.FC<CodeSearchPageProps> = ({ initialRepoId }) => {
  const repoContext = useContext(RepositoryContext);

  const [repositories, setRepositories] = useState<Repository[]>(() => repoContext?.repositories || []);
  const [selectedRepoId, setSelectedRepoId] = useState<string>(
    initialRepoId || repoContext?.selectedRepoId || ""
  );
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
  const [copiedCitation, setCopiedCitation] = useState<string | null>(null);

  // Sync with RepositoryContext
  useEffect(() => {
    if (repoContext?.selectedRepoId && repoContext.selectedRepoId !== selectedRepoId) {
      setSelectedRepoId(repoContext.selectedRepoId);
    }
  }, [repoContext?.selectedRepoId, selectedRepoId]);

  useEffect(() => {
    if (repoContext?.repositories && repoContext.repositories.length > 0) {
      setRepositories(repoContext.repositories);
      if (!selectedRepoId && repoContext.repositories[0]) {
        const defaultId = initialRepoId || repoContext.repositories[0].id;
        setSelectedRepoId(defaultId);
      }
    }
  }, [repoContext?.repositories, selectedRepoId, initialRepoId]);

  // Fallback load repositories if context is empty
  useEffect(() => {
    if (repositories.length > 0) return;
    let mounted = true;
    repositoryService
      .listRepositories(1, 50)
      .then((res) => {
        if (!mounted) return;
        const repos = res.items || [];
        setRepositories(repos);
        if (repos.length > 0 && !selectedRepoId) {
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
  }, [repositories.length, initialRepoId, selectedRepoId]);

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
  }, [selectedRepoId, currentSnapshot]);

  useEffect(() => {
    fetchIndexData();
  }, [fetchIndexData]);

  // Handle repository selection change
  const handleRepoChange = (newRepoId: string) => {
    setSelectedRepoId(newRepoId);
    repoContext?.setSelectedRepoId(newRepoId);
    setSearchResponse(null);
    setErrorMessage(null);
    const found = repositories.find((r) => r.id === newRepoId);
    if (found?.latest_snapshot) {
      setCurrentSnapshot(found.latest_snapshot);
    }
  };

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
  const handleSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const queryText = (customQuery !== undefined ? customQuery : query).trim();
    if (!selectedRepoId || !currentSnapshot?.id || !queryText) return;

    setIsSearching(true);
    setErrorMessage(null);
    try {
      const res = await searchService.searchCode(selectedRepoId, currentSnapshot.id, {
        query: queryText,
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

  const handleCopyCitation = (citation: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(citation).then(() => {
      setCopiedCitation(citation);
      setTimeout(() => setCopiedCitation(null), 2000);
    }).catch(() => {
      // fallback
    });
  };

  const hasActiveFilters = Boolean(languageFilter || symbolTypeFilter || filePathFilter);

  const handleClearFilters = () => {
    setLanguageFilter("");
    setSymbolTypeFilter("");
    setFilePathFilter("");
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-default">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-subtle border border-accent-border flex items-center justify-center text-accent shrink-0">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <span>Semantic Code Search &amp; AST Retrieval</span>
              </h2>
              <StatusBadge label="AST Indexing & Retrieval" variant="info" isMono />
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Deterministic AST symbol search, BM25 ranking, and multi-modal vector retrieval
            </p>
          </div>
        </div>

        {/* Index Status & Action */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated border border-border-default text-xs">
            <Database className="w-3.5 h-3.5 text-accent" />
            <span className="text-text-muted">Index:</span>
            <span className="font-semibold text-text-primary font-mono">
              {indexStatus?.status === "completed"
                ? `${indexStatus.chunk_count} chunks`
                : indexStatus?.status || "Unindexed"}
            </span>
          </div>

          <button
            onClick={() => handleTriggerIndex(true)}
            disabled={isIndexing || !currentSnapshot?.id}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-elevated hover:bg-surface-hover text-accent border border-accent-border hover:border-accent/50 flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-sm focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isIndexing ? "animate-spin" : ""}`} />
            <span>{isIndexing ? "Indexing..." : "Reindex Snapshot"}</span>
          </button>
        </div>
      </div>

      {/* Repository & Snapshot Selection Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-surface-card border border-border-default">
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1.5">Repository</label>
          <select
            value={selectedRepoId}
            onChange={(e) => handleRepoChange(e.target.value)}
            className="w-full text-xs rounded-lg bg-surface-base border border-border-default text-text-primary px-3 py-2 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
          >
            {repositories.map((repo) => (
              <option key={repo.id} value={repo.id}>
                {repo.name} ({repo.source_type})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-muted mb-1.5">Active Snapshot</label>
          <div className="w-full text-xs rounded-lg bg-surface-base border border-border-default text-text-secondary px-3 py-2 flex items-center justify-between">
            <span>
              {currentSnapshot
                ? `${currentSnapshot.id.slice(0, 8)}... (${currentSnapshot.branch || "main"}) — ${currentSnapshot.file_count} files`
                : "No completed snapshot"}
            </span>
            {currentSnapshot && (
              <span className="text-[11px] font-mono text-accent">
                {currentSnapshot.commit_sha ? currentSnapshot.commit_sha.slice(0, 7) : "HEAD"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Search Input & Controls */}
      <form onSubmit={(e) => handleSearch(e)} className="space-y-4">
        <div className="space-y-2">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search symbols, functions, classes, or code concepts (e.g. authenticate_user, calculate_health)..."
              className="w-full pl-10 pr-24 py-2.5 rounded-lg bg-surface-card border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all shadow-inner"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-20 text-text-muted hover:text-text-primary p-1 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="submit"
              disabled={isSearching || !query.trim()}
              className="absolute right-2 px-3 py-1.5 text-xs font-medium rounded-md bg-accent hover:bg-accent-hover text-accent-foreground disabled:opacity-50 transition-colors shadow-sm focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {isSearching ? "Searching..." : "Search"}
            </button>
          </div>

          {/* Suggested Quick Symbol Queries */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs text-text-muted">
            <span className="flex items-center gap-1 text-[11px]">
              <Sparkles className="w-3 h-3 text-accent" />
              <span>Suggested symbols:</span>
            </span>
            {SUGGESTED_SYMBOLS.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => {
                  setQuery(sym);
                  handleSearch(undefined, sym);
                }}
                className="px-2 py-0.5 rounded bg-surface-elevated hover:bg-surface-hover text-text-secondary hover:text-accent border border-border-default hover:border-accent-border font-mono text-[11px] transition-colors cursor-pointer"
              >
                {sym}
              </button>
            ))}
          </div>
        </div>

        {/* Mode Selector and Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Mode Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-card border border-border-default">
            <button
              type="button"
              onClick={() => setSearchMode("hybrid")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                searchMode === "hybrid"
                  ? "bg-accent-subtle text-accent border border-accent-border"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-hover/60 border border-transparent"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>Hybrid (RRF)</span>
              {capabilities?.semantic_available ? (
                <span className="w-1.5 h-1.5 rounded-full bg-status-success" title="Vector + BM25 Ready" />
              ) : (
                <span className="text-[10px] text-text-muted bg-surface-elevated px-1 rounded border border-border-subtle">BM25</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSearchMode("lexical")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                searchMode === "lexical"
                  ? "bg-accent-subtle text-accent border border-accent-border"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-hover/60 border border-transparent"
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-status-info" />
              <span>Lexical (BM25)</span>
            </button>

            <button
              type="button"
              onClick={() => setSearchMode("semantic")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                searchMode === "semantic"
                  ? "bg-accent-subtle text-accent border border-accent-border"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-hover/60 border border-transparent"
              }`}
            >
              <Binary className="w-3.5 h-3.5 text-accent" />
              <span>Semantic (Vector)</span>
              {!capabilities?.semantic_available && (
                <span className="text-[10px] text-status-warning bg-status-warning-bg border border-status-warning-border px-1 rounded">
                  Optional
                </span>
              )}
            </button>
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-text-muted">
              <Filter className="w-3.5 h-3.5" />
              <span className="text-text-muted">Filters:</span>
            </div>

            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="px-2.5 py-1 rounded bg-surface-elevated border border-border-default text-text-secondary text-xs focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
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
              className="px-2.5 py-1 rounded bg-surface-elevated border border-border-default text-text-secondary text-xs focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
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
              className="px-2.5 py-1 rounded bg-surface-elevated border border-border-default text-text-secondary text-xs w-32 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent placeholder:text-text-muted transition-colors"
            />

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-accent hover:text-accent-hover transition-colors cursor-pointer"
                title="Clear all active filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Optional Semantic Status Notice */}
      {!capabilities?.semantic_available && searchMode === "semantic" && (
        <div className="p-3.5 rounded-lg bg-status-warning-bg border border-status-warning-border flex items-start gap-2.5 text-xs text-status-warning-text">
          <AlertCircle className="w-4 h-4 shrink-0 text-status-warning mt-0.5" />
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
        <div className="p-3.5 rounded-lg bg-status-danger-bg border border-status-danger-border flex items-center gap-2 text-xs text-status-danger-text">
          <AlertCircle className="w-4 h-4 text-status-danger shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Searching Loading State */}
      {isSearching && (
        <div className="space-y-3 animate-pulse">
          <div className="p-4 rounded-lg bg-surface-card border border-border-default space-y-3">
            <div className="h-4 bg-surface-elevated rounded w-1/3" />
            <div className="h-16 bg-surface-base rounded" />
          </div>
          <div className="p-4 rounded-lg bg-surface-card border border-border-default space-y-3">
            <div className="h-4 bg-surface-elevated rounded w-1/4" />
            <div className="h-16 bg-surface-base rounded" />
          </div>
        </div>
      )}

      {/* Initial Exploration Card (when no search executed yet) */}
      {!searchResponse && !isSearching && (
        <div className="rounded-xl bg-surface-card border border-border-default p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-accent-subtle border border-accent-border text-accent">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                Codebase Exploration &amp; AST Retrieval Engine
              </h3>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Execute deterministic symbol lookups, BM25 keyword searches, or vector similarity queries across all indexed source syntax trees.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-lg bg-surface-elevated border border-border-subtle space-y-1">
              <div className="font-semibold text-accent flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Hybrid (RRF)</span>
              </div>
              <p className="text-text-muted text-[11px] leading-relaxed">
                Combines BM25 lexical token matching with AST symbol boost and reciprocal rank fusion.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-surface-elevated border border-border-subtle space-y-1">
              <div className="font-semibold text-status-info flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5" />
                <span>Lexical (BM25)</span>
              </div>
              <p className="text-text-muted text-[11px] leading-relaxed">
                Deterministic term frequency search across functions, classes, and comments without vector overhead.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-surface-elevated border border-border-subtle space-y-1">
              <div className="font-semibold text-accent flex items-center gap-1.5">
                <Binary className="w-3.5 h-3.5" />
                <span>Semantic (Vector)</span>
              </div>
              <p className="text-text-muted text-[11px] leading-relaxed">
                Multi-modal dense vector retrieval capturing conceptual intent when embeddings are configured.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search Results Display */}
      {searchResponse && !isSearching && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-text-muted pb-2 border-b border-border-default">
            <span>
              Found <strong className="text-text-primary font-mono">{searchResponse.total_results}</strong> result(s) using{" "}
              <code className="text-accent">{searchResponse.mode_used}</code> retrieval
            </span>
            {searchResponse.warning && (
              <span className="text-status-warning text-[11px]">{searchResponse.warning}</span>
            )}
          </div>

          {searchResponse.results.length === 0 ? (
            <div className="text-center py-12 rounded-lg bg-surface-card border border-border-default space-y-2">
              <Code2 className="w-8 h-8 text-text-muted mx-auto" />
              <h4 className="text-sm font-medium text-text-primary">No matching code chunks found</h4>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                Try broadening your query, removing language or path filters, or triggering snapshot reindexing.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {searchResponse.results.map((item) => (
                <div
                  key={item.chunk_id}
                  className="rounded-lg bg-surface-card border border-border-default hover:border-accent-border p-4 transition-all space-y-3 group shadow-card"
                >
                  {/* Result Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.symbol_name ? (
                          <span className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                            <span className="text-xs px-1.5 py-0.5 rounded bg-accent-subtle border border-accent-border text-accent font-mono">
                              {item.symbol_type || item.chunk_type}
                            </span>
                            <span>{item.symbol_name}</span>
                          </span>
                        ) : (
                          <span className="text-sm font-medium text-text-primary">
                            {item.file_name}
                          </span>
                        )}

                        <span className="text-xs font-mono text-accent bg-accent-subtle border border-accent-border px-2 py-0.5 rounded">
                          {item.citation}
                        </span>

                        <span className="text-xs text-text-secondary bg-surface-elevated px-2 py-0.5 rounded border border-border-default font-mono">
                          {item.language}
                        </span>
                      </div>

                      <p className="text-xs font-mono text-text-muted mt-1 truncate">
                        {item.relative_path}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs px-2 py-1 rounded bg-surface-elevated text-text-secondary border border-border-default font-mono">
                        Score: {item.score}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleCopyCitation(item.citation, e)}
                        className="px-2 py-1 text-xs font-medium rounded-lg bg-surface-elevated hover:bg-surface-hover text-text-secondary hover:text-text-primary border border-border-default hover:border-accent-border flex items-center gap-1 transition-all focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
                        title="Copy citation"
                      >
                        {copiedCitation === item.citation ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-mono text-[11px]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="font-mono text-[11px]">Cite</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleInspectChunk(item)}
                        disabled={isLoadingChunk}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-surface-elevated group-hover:bg-accent-subtle text-text-secondary group-hover:text-accent border border-border-default group-hover:border-accent-border flex items-center gap-1 transition-all focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
                      >
                        <span>Inspect</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Excerpt Code Preview */}
                  <div className="p-3 rounded-lg bg-surface-base border border-border-default overflow-x-auto font-mono text-xs text-text-secondary leading-relaxed max-h-40 selection:bg-accent-subtle">
                    <pre className="whitespace-pre">{item.excerpt}</pre>
                  </div>

                  {/* Terms & Badges */}
                  {item.matched_terms && item.matched_terms.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                      <span>Matches:</span>
                      {item.matched_terms.map((term, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-1.5 py-0.5 rounded bg-surface-elevated text-text-secondary font-mono border border-border-subtle"
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
