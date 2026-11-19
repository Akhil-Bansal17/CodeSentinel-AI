import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AIAssistantPage } from "../src/pages/AIAssistantPage";
import { repositoryService } from "../src/services/repositoryService";
import { searchService } from "../src/services/searchService";
import { Repository, QAResponse } from "../src/types/api";

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

const mockRepo2: Repository = {
  id: "repo-qa-2",
  name: "second-repo-qa",
  source_type: "local",
  source_identifier: "local:second-repo-qa",
  status: "completed",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  latest_snapshot: {
    id: "snap-qa-2",
    repository_id: "repo-qa-2",
    status: "completed",
    started_at: new Date().toISOString(),
    file_count: 3,
    source_file_count: 3,
    ignored_file_count: 0,
    total_size_bytes: 10000,
    directory_count: 1,
    total_lines_of_code: 400,
    language_distribution: {},
    metrics_json: {} as any,
  },
};

describe("AIAssistantPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(repositoryService.listRepositories).mockResolvedValue({
      items: [mockRepo, mockRepo2],
      total: 2,
      page: 1,
      page_size: 10,
    });
    vi.mocked(repositoryService.getRepository).mockImplementation(async (id: string) => {
      if (id === "repo-qa-2") return mockRepo2;
      return mockRepo;
    });
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

  it("recalls and restores previous inquiry and coordinates from session history", async () => {
    const q1Response: QAResponse = {
      question: "Question One?",
      answer: "Answer to question one is in auth module.",
      repository_id: "repo-qa-test",
      snapshot_id: "snap-qa-test",
      retrieval_mode: "hybrid",
      confidence: "HIGH",
      evidence_sufficiency: "SUFFICIENT",
      llm_used: false,
      llm_provider: null,
      citations: ["src/auth.py:L1-L10"],
      warnings: [],
      evidence: [
        {
          evidence_id: "ev-1",
          chunk_id: "chk-1",
          repository_id: "repo-qa-test",
          snapshot_id: "snap-qa-test",
          relative_path: "src/auth.py",
          start_line: 1,
          end_line: 10,
          symbol_name: "auth_fn",
          symbol_type: "function",
          excerpt: "def auth_fn(): pass",
          content_hash: "h-1",
          score: 0.95,
          retrieval_mode: "hybrid",
          citation: "src/auth.py:L1-L10",
        },
      ],
    };

    const q2Response: QAResponse = {
      question: "Question Two?",
      answer: "Answer to question two is in database layer.",
      repository_id: "repo-qa-test",
      snapshot_id: "snap-qa-test",
      retrieval_mode: "hybrid",
      confidence: "MEDIUM",
      evidence_sufficiency: "SUFFICIENT",
      llm_used: false,
      llm_provider: null,
      citations: ["src/db.py:L20-L40"],
      warnings: [],
      evidence: [
        {
          evidence_id: "ev-2",
          chunk_id: "chk-2",
          repository_id: "repo-qa-test",
          snapshot_id: "snap-qa-test",
          relative_path: "src/db.py",
          start_line: 20,
          end_line: 40,
          symbol_name: "db_fn",
          symbol_type: "function",
          excerpt: "def db_fn(): pass",
          content_hash: "h-2",
          score: 0.85,
          retrieval_mode: "hybrid",
          citation: "src/db.py:L20-L40",
        },
      ],
    };

    vi.mocked(searchService.askQuestion)
      .mockResolvedValueOnce(q1Response)
      .mockResolvedValueOnce(q2Response);

    render(<AIAssistantPage />);

    await waitFor(() => {
      expect(repositoryService.listRepositories).toHaveBeenCalled();
    });

    const input = screen.getByPlaceholderText(/Ask anything about the codebase/i);

    // Ask first question
    fireEvent.change(input, { target: { value: "Question One?" } });
    fireEvent.click(screen.getByRole("button", { name: /Ask Q&A/i }));

    await waitFor(() => {
      expect(screen.getByText("Answer to question one is in auth module.")).toBeInTheDocument();
      expect(screen.getByText("Session Inquiries (1):")).toBeInTheDocument();
    });

    // Ask second question
    fireEvent.change(input, { target: { value: "Question Two?" } });
    fireEvent.click(screen.getByRole("button", { name: /Ask Q&A/i }));

    await waitFor(() => {
      expect(screen.getByText("Answer to question two is in database layer.")).toBeInTheDocument();
      expect(screen.getByText("Session Inquiries (2):")).toBeInTheDocument();
    });

    // Now click the history button for Question One
    const q1HistoryBtn = screen.getByRole("button", { name: "Question One?" });
    fireEvent.click(q1HistoryBtn);

    // Verify Question One's answer, confidence, and citation are restored
    expect(screen.getByText("Answer to question one is in auth module.")).toBeInTheDocument();
    expect(screen.getByText("[src/auth.py:L1-L10]")).toBeInTheDocument();
  });

  it("ensures inquiries from different repos are strictly isolated in history", async () => {
    const q1Response: QAResponse = {
      question: "Repo 1 Question?",
      answer: "Answer for repo 1 only.",
      repository_id: "repo-qa-test",
      snapshot_id: "snap-qa-test",
      retrieval_mode: "hybrid",
      confidence: "HIGH",
      evidence_sufficiency: "SUFFICIENT",
      llm_used: false,
      llm_provider: null,
      citations: ["src/r1.py:L1-L10"],
      warnings: [],
      evidence: [],
    };

    vi.mocked(searchService.askQuestion).mockResolvedValueOnce(q1Response);

    render(<AIAssistantPage />);

    await waitFor(() => {
      expect(repositoryService.listRepositories).toHaveBeenCalled();
    });

    const input = screen.getByPlaceholderText(/Ask anything about the codebase/i);
    fireEvent.change(input, { target: { value: "Repo 1 Question?" } });
    fireEvent.click(screen.getByRole("button", { name: /Ask Q&A/i }));

    await waitFor(() => {
      expect(screen.getByText("Answer for repo 1 only.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Repo 1 Question?" })).toBeInTheDocument();
    });

    // Switch repository to second repository
    const repoSelect = screen.getByRole("combobox");
    fireEvent.change(repoSelect, { target: { value: "repo-qa-2" } });

    // Verify that Repo 1's question is no longer displayed in the history strip for repo 2
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Repo 1 Question?" })).not.toBeInTheDocument();
      expect(screen.queryByText(/Session Inquiries/i)).not.toBeInTheDocument();
    });
  });

  it("does not create session history or overwrite view when Q&A request fails", async () => {
    vi.mocked(searchService.askQuestion).mockRejectedValueOnce(
      new Error("Network connection dropped")
    );

    render(<AIAssistantPage />);

    await waitFor(() => {
      expect(repositoryService.listRepositories).toHaveBeenCalled();
    });

    const input = screen.getByPlaceholderText(/Ask anything about the codebase/i);
    fireEvent.change(input, { target: { value: "Will this fail?" } });
    fireEvent.click(screen.getByRole("button", { name: /Ask Q&A/i }));

    await waitFor(() => {
      expect(screen.getByText(/Q&A query failed: Network connection dropped/i)).toBeInTheDocument();
      expect(screen.queryByText(/Session Inquiries/i)).not.toBeInTheDocument();
    });
  });
});
