import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AIAssistantPage } from "../src/pages/AIAssistantPage";
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
    askQuestion: vi.fn(),
    getChunkDetail: vi.fn(),
  },
}));

const mockRepo: Repository = {
  id: "repo-qa-test",
  name: "code-sentinel-qa",
  source_type: "local",
  source_identifier: "local:code-sentinel-qa",
  status: "completed",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  latest_snapshot: {
    id: "snap-qa-test",
    repository_id: "repo-qa-test",
    status: "completed",
    started_at: new Date().toISOString(),
    file_count: 5,
    source_file_count: 4,
    ignored_file_count: 1,
    total_size_bytes: 20000,
    directory_count: 2,
    total_lines_of_code: 800,
    language_distribution: {},
    metrics_json: {} as any,
  },
};

describe("AIAssistantPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(repositoryService.listRepositories).mockResolvedValue({
      items: [mockRepo],
      total: 1,
      page: 1,
      page_size: 10,
    });
    vi.mocked(repositoryService.getRepository).mockResolvedValue(mockRepo);
  });

  it("renders page header, suggested questions, and input area", async () => {
    render(<AIAssistantPage />);

    expect(screen.getByText("Evidence-Backed Repository Q&A")).toBeInTheDocument();
    expect(screen.getByText("Where is user authentication implemented?")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask anything about the codebase/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ask Q&A/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(repositoryService.listRepositories).toHaveBeenCalled();
    });
  });

  it("submits question and renders evidence-grounded answer with verified citations", async () => {
    vi.mocked(searchService.askQuestion).mockResolvedValue({
      question: "Where is user authentication implemented?",
      answer: "User authentication is implemented in src/services/auth.py via authenticate_user.",
      repository_id: "repo-qa-test",
      snapshot_id: "snap-qa-test",
      retrieval_mode: "hybrid",
      confidence: "HIGH",
      evidence_sufficiency: "SUFFICIENT",
      llm_used: false,
      llm_provider: null,
      citations: ["src/services/auth.py:L10-L25"],
      warnings: [],
      evidence: [
        {
          evidence_id: "ev-1",
          chunk_id: "chk-auth-1",
          repository_id: "repo-qa-test",
          snapshot_id: "snap-qa-test",
          relative_path: "src/services/auth.py",
          start_line: 10,
          end_line: 25,
          symbol_name: "authenticate_user",
          symbol_type: "function",
          excerpt: "def authenticate_user(token: str): pass",
          content_hash: "h-auth",
          score: 0.96,
          retrieval_mode: "hybrid",
          citation: "src/services/auth.py:L10-L25",
        },
      ],
    });

    render(<AIAssistantPage />);

    await waitFor(() => {
      expect(repositoryService.listRepositories).toHaveBeenCalled();
    });

    const input = screen.getByPlaceholderText(/Ask anything about the codebase/i);
    fireEvent.change(input, { target: { value: "Where is user authentication implemented?" } });

    fireEvent.click(screen.getByRole("button", { name: /Ask Q&A/i }));

    await waitFor(() => {
      expect(searchService.askQuestion).toHaveBeenCalled();
      expect(screen.getByText("Deterministic Grounded Synthesis (No-LLM)")).toBeInTheDocument();
      expect(screen.getByText("Sufficiency: SUFFICIENT")).toBeInTheDocument();
      expect(screen.getByText("Confidence: HIGH")).toBeInTheDocument();
      expect(screen.getByText("[src/services/auth.py:L10-L25]")).toBeInTheDocument();
      expect(screen.getByText(/User authentication is implemented/i)).toBeInTheDocument();
    });
  });

  it("displays transparent insufficient-evidence state when no evidence is found", async () => {
    vi.mocked(searchService.askQuestion).mockResolvedValue({
      question: "How is cloud deployment configured?",
      answer: "The repository evidence does not contain sufficient information to answer the question.",
      repository_id: "repo-qa-test",
      snapshot_id: "snap-qa-test",
      retrieval_mode: "lexical",
      confidence: "INSUFFICIENT_EVIDENCE",
      evidence_sufficiency: "INSUFFICIENT",
      llm_used: false,
      llm_provider: null,
      citations: [],
      warnings: [],
      evidence: [],
    });

    render(<AIAssistantPage />);

    await waitFor(() => {
      expect(repositoryService.listRepositories).toHaveBeenCalled();
    });

    const input = screen.getByPlaceholderText(/Ask anything about the codebase/i);
    fireEvent.change(input, { target: { value: "How is cloud deployment configured?" } });

    fireEvent.click(screen.getByRole("button", { name: /Ask Q&A/i }));

    await waitFor(() => {
      expect(screen.getByText("Sufficiency: INSUFFICIENT")).toBeInTheDocument();
      expect(screen.getByText("Confidence: INSUFFICIENT_EVIDENCE")).toBeInTheDocument();
      expect(screen.getByText(/does not contain sufficient information/i)).toBeInTheDocument();
    });
  });
});
