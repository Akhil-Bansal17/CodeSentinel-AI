import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RepositoryDetailView } from "../src/components/repository/RepositoryDetailView";
import { repositoryService } from "../src/services/repositoryService";
import { analysisService } from "../src/services/analysisService";
import { Repository } from "../src/types/api";
import { AnalysisFinding, AnalysisRun } from "../src/types/analysis";

vi.mock("../src/services/repositoryService", () => ({
  repositoryService: {
    listSnapshotFiles: vi.fn(),
    reingestRepository: vi.fn(),
    deleteRepository: vi.fn(),
  },
}));

vi.mock("../src/services/analysisService", () => ({
  analysisService: {
    listRepositoryAnalyses: vi.fn(),
    startAnalysis: vi.fn(),
    listFindings: vi.fn(),
    getAnalysis: vi.fn(),
  },
}));

const mockCompletedRun: AnalysisRun = {
  id: "run-101",
  repository_id: "repo-1",
  snapshot_id: "snap-1",
  status: "completed",
  started_at: new Date().toISOString(),
  completed_at: new Date().toISOString(),
  rule_set_version: "1.0.0",
  files_discovered: 5,
  files_analyzed: 4,
  files_skipped: 1,
  findings_count: 2,
  summary_json: {
    total_findings: 2,
    severity_distribution: {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 1,
      LOW: 1,
      INFO: 0,
    },
    category_distribution: {
      COMPLEXITY: 1,
      CODE_SMELL: 1,
    },
    analyzed_files: 4,
    skipped_files: 1,
  },
};

const mockFindings: AnalysisFinding[] = [
  {
    id: "find-1",
    analysis_run_id: "run-101",
    repository_id: "repo-1",
    snapshot_id: "snap-1",
    rule_id: "PY-COMPLEXITY-001",
    rule_name: "High Cyclomatic Complexity",
    rule_version: "1.0.0",
    title: "High cyclomatic complexity in 'calculate_stats'",
    description: "Function calculate_stats exceeds cyclomatic complexity threshold.",
    severity: "MEDIUM",
    category: "COMPLEXITY",
    file_path: "src/calculator.py",
    start_line: 14,
    start_column: 1,
    end_line: 35,
    end_column: 10,
    evidence_summary: "Function 'calculate_stats' complexity=12 (threshold=10)",
    fingerprint: "sha256-fingerprint-12345",
    metadata_json: { complexity: 12, threshold: 10 },
    created_at: new Date().toISOString(),
  },
  {
    id: "find-2",
    analysis_run_id: "run-101",
    repository_id: "repo-1",
    snapshot_id: "snap-1",
    rule_id: "PY-IMPORT-001",
    rule_name: "Repeated Import Statement",
    rule_version: "1.0.0",
    title: "Duplicate import of 'math' on line 3",
    description: "The statement 'import math' duplicates an identical import on line 1.",
    severity: "LOW",
    category: "CODE_SMELL",
    file_path: "src/calculator.py",
    start_line: 3,
    start_column: 1,
    evidence_summary: "Duplicate import of 'math' (first imported on line 1)",
    fingerprint: "sha256-fingerprint-67890",
    metadata_json: { import_name: "math", first_line: 1 },
    created_at: new Date().toISOString(),
  },
];

const mockRepository: Repository = {
  id: "repo-1",
  name: "code-analytics-project",
  source_type: "local",
  source_identifier: "local:code-analytics-project",
  status: "completed",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  latest_snapshot: {
    id: "snap-1",
    repository_id: "repo-1",
    status: "completed",
    started_at: new Date().toISOString(),
    file_count: 5,
    source_file_count: 4,
    ignored_file_count: 0,
    total_size_bytes: 4500,
    directory_count: 2,
    total_lines_of_code: 200,
    language_distribution: {},
    metrics_json: {
      summary: {
        total_files: 5,
        source_files: 4,
        ignored_files: 0,
        total_size_bytes: 4500,
        directory_count: 2,
        total_lines_of_code: 200,
      },
      language_distribution: {},
      category_distribution: {},
      largest_files: [],
      top_level_directories: [],
    },
  },
};

describe("Static Analysis Tab & Findings Exploration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(repositoryService.listSnapshotFiles).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 25,
      snapshot_id: "snap-1",
    });
    vi.mocked(analysisService.listRepositoryAnalyses).mockResolvedValue({
      items: [mockCompletedRun],
      total: 1,
      page: 1,
      page_size: 20,
    });
    vi.mocked(analysisService.listFindings).mockResolvedValue({
      items: mockFindings,
      total: 2,
      page: 1,
      page_size: 25,
    });
  });

  it("switches to Static Analysis tab and displays analysis summary cards", async () => {
    render(
      <RepositoryDetailView
        repository={mockRepository}
        onBack={vi.fn()}
        onRepositoryUpdated={vi.fn()}
        onRepositoryDeleted={vi.fn()}
      />
    );

    // Click Static Analysis tab
    const analysisTab = screen.getByRole("button", { name: /Static Analysis/i });
    fireEvent.click(analysisTab);

    // Verify summary metric cards render
    await waitFor(() => {
      expect(screen.getByText("Total Findings")).toBeInTheDocument();
      expect(screen.getByText("Analyzed Files")).toBeInTheDocument();
      expect(screen.getByText("Engine Version")).toBeInTheDocument();
      expect(screen.getByText("MEDIUM: 1")).toBeInTheDocument();
      expect(screen.getByText("LOW: 1")).toBeInTheDocument();
    });
  });

  it("renders findings table and opens detail modal on row click", async () => {
    render(
      <RepositoryDetailView
        repository={mockRepository}
        onBack={vi.fn()}
        onRepositoryUpdated={vi.fn()}
        onRepositoryDeleted={vi.fn()}
      />
    );

    // Switch to analysis tab
    fireEvent.click(screen.getByRole("button", { name: /Static Analysis/i }));

    // Verify findings table rendered
    await waitFor(() => {
      expect(screen.getByText("PY-COMPLEXITY-001")).toBeInTheDocument();
      expect(screen.getByText("PY-IMPORT-001")).toBeInTheDocument();
      expect(screen.getByText("High cyclomatic complexity in 'calculate_stats'")).toBeInTheDocument();
    });

    // Click Inspect button to open detail modal
    const inspectBtns = screen.getAllByRole("button", { name: /Inspect/i });
    fireEvent.click(inspectBtns[0]);

    // Verify modal elements
    await waitFor(() => {
      expect(screen.getByText(/Rule Description & Rationale/i)).toBeInTheDocument();
      expect(screen.getByText(/Detection Evidence/i)).toBeInTheDocument();
      expect(screen.getByTitle("sha256-fingerprint-12345")).toBeInTheDocument();
    });

    // Close modal
    fireEvent.click(screen.getByRole("button", { name: /Close dialog/i }));
    await waitFor(() => {
      expect(screen.queryByText("Rule Description & Rationale:")).not.toBeInTheDocument();
    });
  });

  it("triggers a new static analysis run when Re-run Analysis is clicked", async () => {
    vi.mocked(analysisService.startAnalysis).mockResolvedValue({
      ...mockCompletedRun,
      id: "run-102",
      findings_count: 3,
    });

    render(
      <RepositoryDetailView
        repository={mockRepository}
        onBack={vi.fn()}
        onRepositoryUpdated={vi.fn()}
        onRepositoryDeleted={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Static Analysis/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Re-run Analysis/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Re-run Analysis/i }));

    await waitFor(() => {
      expect(analysisService.startAnalysis).toHaveBeenCalledWith("repo-1", {
        snapshot_id: "snap-1",
      });
    });
  });
});
