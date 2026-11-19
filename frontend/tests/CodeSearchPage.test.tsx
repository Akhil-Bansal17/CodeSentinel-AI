import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CodeSearchPage } from "../src/pages/CodeSearchPage";
import { repositoryService } from "../src/services/repositoryService";
import { searchService } from "../src/services/searchService";
import { Repository } from "../src/types/api";

vi.mock("../src/services/repositoryService", () => ({
  repositoryService: {
    listRepositories: vi.fn(),
    getRepository: vi.fn(),
  },
}));

vi.mock("../src/services/searchService", () => ({
  searchService: {
    getIndexStatus: vi.fn(),
    getCapabilities: vi.fn(),
    startIndexing: vi.fn(),
    searchCode: vi.fn(),
    getChunkDetail: vi.fn(),
  },
}));

const mockRepo: Repository = {
  id: "repo-search-1",
  name: "code-sentinel-ai",
  source_type: "local",
  source_identifier: "local:code-sentinel",
  status: "completed",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  latest_snapshot: {
    id: "snap-search-1",
    repository_id: "repo-search-1",
    status: "completed",
    started_at: new Date().toISOString(),
    file_count: 10,
    source_file_count: 8,
    ignored_file_count: 2,
    total_size_bytes: 45000,
    directory_count: 4,
    total_lines_of_code: 1200,
    language_distribution: {},
    metrics_json: {} as any,
  },
};

describe("CodeSearchPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(repositoryService.listRepositories).mockResolvedValue({
      items: [mockRepo],
      total: 1,
      page: 1,
      page_size: 10,
    });
    vi.mocked(repositoryService.getRepository).mockResolvedValue(mockRepo);
    vi.mocked(searchService.getIndexStatus).mockResolvedValue({
      id: "run-idx-1",
      repository_id: "repo-search-1",
      snapshot_id: "snap-search-1",
      status: "completed",
      started_at: new Date().toISOString(),
      index_version: "1.0.0",
      chunk_count: 24,
      files_indexed: 8,
      files_skipped: 2,
      summary_json: {},
    });
    vi.mocked(searchService.getCapabilities).mockResolvedValue({
      lexical_available: true,
      semantic_available: false,
      hybrid_available: false,
      embedding_provider: "none",
      embedding_model: "unconfigured",
      index_status: "completed",
      chunk_count: 24,
      llm_available: false,
      llm_provider: "none",
      warnings: ["Semantic search is unavailable: no embedding provider is configured."],
    });
  });

  it("renders search controls, index status, and mode selectors", async () => {
    render(<CodeSearchPage />);

    expect(screen.getByText("Semantic Code Search & AST Retrieval")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search symbols, functions, classes/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hybrid \(RRF\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lexical \(BM25\)/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("24 chunks")).toBeInTheDocument();
    });
  });

  it("executes code search and renders results with citations and scores", async () => {
    vi.mocked(searchService.searchCode).mockResolvedValue({
      query: "authenticate_user",
      mode_requested: "lexical",
      mode_used: "lexical",
      total_results: 1,
      capabilities: {
        lexical_available: true,
        semantic_available: false,
        hybrid_available: false,
        embedding_provider: "none",
        embedding_model: "unconfigured",
        index_status: "completed",
        chunk_count: 24,
        llm_available: false,
        llm_provider: "none",
        warnings: [],
      },
      results: [
        {
          chunk_id: "chk-1",
          repository_id: "repo-search-1",
          snapshot_id: "snap-search-1",
          relative_path: "src/auth.py",
          file_name: "auth.py",
          language: "Python",
          chunk_type: "function",
          symbol_name: "authenticate_user",
          symbol_type: "function",
          start_line: 15,
          end_line: 30,
          score: 0.95,
          rank: 1,
          retrieval_mode: "lexical",
          content_hash: "hash123",
          excerpt: "def authenticate_user(token: str):\n    return verify(token)",
          citation: "src/auth.py:L15-L30",
        },
      ],
    });

    render(<CodeSearchPage />);

    await waitFor(() => {
      expect(repositoryService.listRepositories).toHaveBeenCalled();
    });

    const input = screen.getByPlaceholderText(/Search symbols, functions, classes/i);
    fireEvent.change(input, { target: { value: "authenticate_user" } });

    const searchBtn = screen.getByRole("button", { name: "Search" });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(searchService.searchCode).toHaveBeenCalled();
      expect(screen.getByText("authenticate_user")).toBeInTheDocument();
      expect(screen.getByText("src/auth.py:L15-L30")).toBeInTheDocument();
      expect(screen.getByText("Score: 0.95")).toBeInTheDocument();
    });
  });

  it("opens chunk inspection modal when Inspect button is clicked", async () => {
    vi.mocked(searchService.searchCode).mockResolvedValue({
      query: "calculate_metrics",
      mode_requested: "lexical",
      mode_used: "lexical",
      total_results: 1,
      capabilities: {} as any,
      results: [
        {
          chunk_id: "chk-modal-1",
          repository_id: "repo-search-1",
          snapshot_id: "snap-search-1",
          relative_path: "src/metrics.py",
          file_name: "metrics.py",
          language: "Python",
          chunk_type: "function",
          symbol_name: "calculate_metrics",
          symbol_type: "function",
          start_line: 1,
          end_line: 20,
          score: 0.91,
          rank: 1,
          retrieval_mode: "lexical",
          content_hash: "h99",
          excerpt: "def calculate_metrics(): pass",
          citation: "src/metrics.py:L1-L20",
        },
      ],
    });

    vi.mocked(searchService.getChunkDetail).mockResolvedValue({
      id: "chk-modal-1",
      index_run_id: "run-idx-1",
      repository_id: "repo-search-1",
      snapshot_id: "snap-search-1",
      relative_path: "src/metrics.py",
      file_name: "metrics.py",
      language: "Python",
      chunk_index: 0,
      chunk_type: "function",
      symbol_name: "calculate_metrics",
      symbol_type: "function",
      start_line: 1,
      end_line: 20,
      content: "def calculate_metrics():\n    return {'score': 100}",
      content_hash: "h99",
      chunk_fingerprint: "fp99",
      has_embedding: false,
      metadata_json: {},
      citation: "src/metrics.py:L1-L20",
    });

    render(<CodeSearchPage />);

    await waitFor(() => {
      expect(repositoryService.listRepositories).toHaveBeenCalled();
    });

    const input = screen.getByPlaceholderText(/Search symbols, functions, classes/i);
    fireEvent.change(input, { target: { value: "calculate_metrics" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => {
      expect(screen.getByText("Inspect")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Inspect"));

    await waitFor(() => {
      expect(searchService.getChunkDetail).toHaveBeenCalledWith(
        "repo-search-1",
        "snap-search-1",
        "chk-modal-1"
      );
      expect(screen.getByText(/Copy Citation/i)).toBeInTheDocument();
      expect(screen.getByText("Lines 1 – 20")).toBeInTheDocument();
    });
  });

  it("resets all active filters and re-queries active search", async () => {
    vi.mocked(searchService.searchCode).mockResolvedValue({
      query: "test_query",
      mode_requested: "hybrid",
      mode_used: "hybrid",
      total_results: 1,
      capabilities: {} as any,
      results: [
        {
          chunk_id: "chk-reset-1",
          repository_id: "repo-search-1",
          snapshot_id: "snap-search-1",
          relative_path: "src/reset.py",
          file_name: "reset.py",
          language: "Python",
          chunk_type: "function",
          symbol_name: "reset_filters_fn",
          symbol_type: "function",
          start_line: 1,
          end_line: 10,
          score: 0.99,
          rank: 1,
          retrieval_mode: "hybrid",
          content_hash: "hash_rst",
          excerpt: "def reset_filters_fn(): pass",
          citation: "src/reset.py:L1-L10",
        },
      ],
    });

    render(<CodeSearchPage />);

    await waitFor(() => {
      expect(repositoryService.listRepositories).toHaveBeenCalled();
    });

    // Set query and a filter
    const input = screen.getByPlaceholderText(/Search symbols, functions, classes/i);
    fireEvent.change(input, { target: { value: "test_query" } });

    const langSelect = screen.getByDisplayValue("All Languages");
    fireEvent.change(langSelect, { target: { value: "Python" } });

    expect(screen.getByRole("button", { name: /Reset/i })).toBeInTheDocument();

    // Click Reset
    fireEvent.click(screen.getByRole("button", { name: /Reset/i }));

    await waitFor(() => {
      // searchCode should have been called with language: undefined (cleared)
      expect(searchService.searchCode).toHaveBeenCalledWith(
        "repo-search-1",
        "snap-search-1",
        expect.objectContaining({
          query: "test_query",
          language: undefined,
          symbol_type: undefined,
          file_path: undefined,
        })
      );
    });
  });

  it("discards earlier in-flight search responses when a newer query finishes first", async () => {
    let resolveFirstSearch!: (val: any) => void;
    const firstSearchPromise = new Promise((resolve) => {
      resolveFirstSearch = resolve;
    });

    const secondSearchResult = {
      query: "second_query",
      mode_requested: "hybrid",
      mode_used: "hybrid",
      total_results: 1,
      capabilities: {} as any,
      results: [
        {
          chunk_id: "chk-second",
          repository_id: "repo-search-1",
          snapshot_id: "snap-search-1",
          relative_path: "src/second.py",
          file_name: "second.py",
          language: "Python",
          chunk_type: "function",
          symbol_name: "second_symbol",
          symbol_type: "function",
          start_line: 5,
          end_line: 15,
          score: 0.88,
          rank: 1,
          retrieval_mode: "hybrid",
          content_hash: "hash_sec",
          excerpt: "def second_symbol(): pass",
          citation: "src/second.py:L5-L15",
        },
      ],
    };

    const firstSearchResult = {
      query: "first_query",
      mode_requested: "hybrid",
      mode_used: "hybrid",
      total_results: 1,
      capabilities: {} as any,
      results: [
        {
          chunk_id: "chk-first",
          repository_id: "repo-search-1",
          snapshot_id: "snap-search-1",
          relative_path: "src/first.py",
          file_name: "first.py",
          language: "Python",
          chunk_type: "function",
          symbol_name: "stale_first_symbol",
          symbol_type: "function",
          start_line: 1,
          end_line: 10,
          score: 0.77,
          rank: 1,
          retrieval_mode: "hybrid",
          content_hash: "hash_fst",
          excerpt: "def stale_first_symbol(): pass",
          citation: "src/first.py:L1-L10",
        },
      ],
    };

    // First call hangs until resolveFirstSearch is called; second call resolves immediately
    vi.mocked(searchService.searchCode)
      .mockReturnValueOnce(firstSearchPromise as any)
      .mockResolvedValueOnce(secondSearchResult as any);

    render(<CodeSearchPage />);

    await waitFor(() => {
      expect(repositoryService.listRepositories).toHaveBeenCalled();
    });

    const input = screen.getByPlaceholderText(/Search symbols, functions, classes/i);

    // Trigger first search
    fireEvent.change(input, { target: { value: "first_query" } });
    fireEvent.submit(input.closest("form")!);

    // Trigger second search immediately
    fireEvent.change(input, { target: { value: "second_query" } });
    fireEvent.submit(input.closest("form")!);

    // Second search resolves first
    await waitFor(() => {
      expect(screen.getByText("second_symbol")).toBeInTheDocument();
    });

    // Now resolve the older first search
    resolveFirstSearch(firstSearchResult);

    // Ensure the stale first search response did NOT overwrite the results
    await waitFor(() => {
      expect(screen.queryByText("stale_first_symbol")).not.toBeInTheDocument();
      expect(screen.getByText("second_symbol")).toBeInTheDocument();
    });
  });
});
