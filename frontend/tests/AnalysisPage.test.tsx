import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AnalysisPage } from "../src/pages/AnalysisPage";
import { repositoryService } from "../src/services/repositoryService";
import { analysisService } from "../src/services/analysisService";
import { Repository } from "../src/types/api";
import { AnalysisRun } from "../src/types/analysis";
import { RepositoryContext } from "../src/context/RepositoryContext";

vi.mock("../src/services/repositoryService", () => ({
  repositoryService: {
    listRepositories: vi.fn(),
  },
}));

vi.mock("../src/services/analysisService", () => ({
  analysisService: {
    listRepositoryAnalyses: vi.fn(),
    startAnalysis: vi.fn(),
    listFindings: vi.fn(),
    getAnalysis: vi.fn(),
    getFinding: vi.fn(),
    getRulesCatalog: vi.fn(),
  },
}));

const mockRepo1: Repository = {
  id: "repo-p5-1",
  name: "sentinel-core",
  source_type: "local",
  source_identifier: "local:/workspace/sentinel",
  default_branch: "main",
  status: "completed",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  latest_snapshot: {
    id: "snap-p5-1",
    repository_id: "repo-p5-1",
    status: "completed",
    started_at: new Date().toISOString(),
    file_count: 14,
    source_file_count: 12,
    ignored_file_count: 2,
    total_size_bytes: 12000,
    directory_count: 4,
    total_lines_of_code: 850,
    language_distribution: {},
    metrics_json: {
      summary: {
        total_files: 14,
        source_files: 12,
        ignored_files: 2,
        total_size_bytes: 12000,
        directory_count: 4,
        total_lines_of_code: 850,
      },
      language_distribution: {},
      category_distribution: {},
      largest_files: [],
      top_level_directories: [],
    },
  },
};

const mockRepo2: Repository = {
  id: "repo-p5-2",
  name: "auth-gateway",
  source_type: "github",
  source_identifier: "github:codesentinel/auth",
  default_branch: "dev",
  status: "completed",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  latest_snapshot: {
    id: "snap-p5-2",
    repository_id: "repo-p5-2",
    status: "completed",
    started_at: new Date().toISOString(),
    file_count: 8,
    source_file_count: 8,
    ignored_file_count: 0,
    total_size_bytes: 4000,
    directory_count: 2,
    total_lines_of_code: 320,
    language_distribution: {},
    metrics_json: {
      summary: {
        total_files: 8,
        source_files: 8,
        ignored_files: 0,
        total_size_bytes: 4000,
        directory_count: 2,
        total_lines_of_code: 320,
      },
      language_distribution: {},
      category_distribution: {},
      largest_files: [],
      top_level_directories: [],
    },
  },
};

const mockAnalysisRun1: AnalysisRun = {
  id: "run-p5-101",
  repository_id: "repo-p5-1",
  snapshot_id: "snap-p5-1",
  status: "completed",
  started_at: "2026-10-28T10:00:00Z",
  completed_at: "2026-10-28T10:00:15Z",
  rule_set_version: "2.0.0",
  files_discovered: 12,
  files_analyzed: 12,
  files_skipped: 0,
  findings_count: 1,
  summary_json: {
    total_findings: 1,
    severity_distribution: { CRITICAL: 1, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 },
    confidence_distribution: { HIGH: 1, MEDIUM: 0, LOW: 0 },
    category_distribution: { SECURITY: 1 },
    analyzed_files: 12,
    skipped_files: 0,
  },
};

const mockAnalysisRun2: AnalysisRun = {
  id: "run-p5-102",
  repository_id: "repo-p5-1",
  snapshot_id: "snap-p5-1",
  status: "completed",
  started_at: "2026-10-28T11:00:00Z",
  completed_at: "2026-10-28T11:00:18Z",
  rule_set_version: "2.0.0",
  files_discovered: 12,
  files_analyzed: 12,
  files_skipped: 0,
  findings_count: 2,
  summary_json: {
    total_findings: 2,
    severity_distribution: { CRITICAL: 1, HIGH: 1, MEDIUM: 0, LOW: 0, INFO: 0 },
    confidence_distribution: { HIGH: 2, MEDIUM: 0, LOW: 0 },
    category_distribution: { SECURITY: 2 },
    analyzed_files: 12,
    skipped_files: 0,
  },
};

describe("AnalysisPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(analysisService.listFindings).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
    });
  });

  it("renders empty state when no repositories exist", async () => {
    vi.mocked(repositoryService.listRepositories).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 50,
    });

    render(<AnalysisPage />);

    await waitFor(() => {
      expect(screen.getByText("No Repositories Connected")).toBeInTheDocument();
      expect(
        screen.getByText(/Please register and ingest a software repository first/i)
      ).toBeInTheDocument();
    });
  });

  it("renders repository context strip, summary cards, and run selector when data exists", async () => {
    vi.mocked(repositoryService.listRepositories).mockResolvedValue({
      items: [mockRepo1, mockRepo2],
      total: 2,
      page: 1,
      page_size: 50,
    });

    vi.mocked(analysisService.listRepositoryAnalyses).mockResolvedValue({
      items: [mockAnalysisRun2, mockAnalysisRun1],
      total: 2,
      page: 1,
      page_size: 20,
    });

    render(
      <RepositoryContext.Provider
        value={{
          repositories: [mockRepo1, mockRepo2],
          selectedRepoId: "repo-p5-1",
          selectedRepo: mockRepo1,
          isLoadingRepos: false,
          repoError: null,
          setSelectedRepoId: vi.fn(),
          refetchRepositories: vi.fn(),
        }}
      >
        <AnalysisPage initialRepoId="repo-p5-1" />
      </RepositoryContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText("Static Analysis & Security Intelligence")).toBeInTheDocument();
      expect(screen.getAllByText("sentinel-core").length).toBeGreaterThan(0);
      expect(screen.getByText("main")).toBeInTheDocument();
      expect(screen.getByText("CRITICAL: 1")).toBeInTheDocument();
      expect(screen.getByText("HIGH: 1")).toBeInTheDocument();
    });

    // Check historical run selector presence
    const runSelect = screen.getByRole("combobox", { name: /Select Analysis Run/i });
    expect(runSelect).toBeInTheDocument();
  });

  it("prevents stale state by clearing analyses when switching repositories", async () => {
    vi.mocked(repositoryService.listRepositories).mockResolvedValue({
      items: [mockRepo1, mockRepo2],
      total: 2,
      page: 1,
      page_size: 50,
    });

    vi.mocked(analysisService.listRepositoryAnalyses)
      .mockResolvedValueOnce({
        items: [mockAnalysisRun1],
        total: 1,
        page: 1,
        page_size: 20,
      })
      .mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        page_size: 20,
      });

    const mockSetSelectedRepo = vi.fn();

    render(
      <RepositoryContext.Provider
        value={{
          repositories: [mockRepo1, mockRepo2],
          selectedRepoId: "repo-p5-1",
          selectedRepo: mockRepo1,
          isLoadingRepos: false,
          repoError: null,
          setSelectedRepoId: mockSetSelectedRepo,
          refetchRepositories: vi.fn(),
        }}
      >
        <AnalysisPage initialRepoId="repo-p5-1" />
      </RepositoryContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText("CRITICAL: 1")).toBeInTheDocument();
    });

    // Switch to repo 2
    const repoSelect = screen.getByRole("combobox", { name: /Select Repository/i });
    fireEvent.change(repoSelect, { target: { value: "repo-p5-2" } });

    await waitFor(() => {
      expect(mockSetSelectedRepo).toHaveBeenCalledWith("repo-p5-2");
      expect(screen.getByText("No Static Analysis Executed")).toBeInTheDocument();
    });
  });

  it("triggers a new static analysis on button click", async () => {
    vi.mocked(repositoryService.listRepositories).mockResolvedValue({
      items: [mockRepo1],
      total: 1,
      page: 1,
      page_size: 50,
    });

    vi.mocked(analysisService.listRepositoryAnalyses).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
    });

    vi.mocked(analysisService.startAnalysis).mockResolvedValue(mockAnalysisRun1);

    render(<AnalysisPage initialRepoId="repo-p5-1" />);

    await waitFor(() => {
      expect(screen.getByText("No Static Analysis Executed")).toBeInTheDocument();
    });

    const runButtons = screen.getAllByRole("button", { name: /Run Static Analysis|Run Analysis/i });
    fireEvent.click(runButtons[0]);

    await waitFor(() => {
      expect(analysisService.startAnalysis).toHaveBeenCalledWith("repo-p5-1", {
        snapshot_id: "snap-p5-1",
      });
    });
  });
});
