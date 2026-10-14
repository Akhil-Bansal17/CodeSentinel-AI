import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ArchitectureView } from "../src/components/architecture/ArchitectureView";
import * as architectureService from "../src/services/architectureService";
import { Repository } from "../src/types/api";
import { ArchitectureRun } from "../src/types/architecture";

vi.mock("../src/services/architectureService", () => ({
  listArchitectureRuns: vi.fn(),
  startArchitectureRun: vi.fn(),
  listModules: vi.fn(),
  getModuleDetail: vi.fn(),
  listViolations: vi.fn(),
  getArchitectureGraph: vi.fn(),
  getActivePolicy: vi.fn(),
}));

const mockRepository: Repository = {
  id: "repo-arch-1",
  name: "code-sentinel",
  source_type: "github",
  source_identifier: "github:codesentinel",
  default_branch: "main",
  status: "completed",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  latest_snapshot: {
    id: "snap-arch-1",
    repository_id: "repo-arch-1",
    status: "completed",
    started_at: new Date().toISOString(),
    file_count: 5,
    source_file_count: 5,
    ignored_file_count: 0,
    total_size_bytes: 5000,
    directory_count: 2,
    total_lines_of_code: 350,
    language_distribution: {},
    metrics_json: {
      summary: {
        total_files: 5,
        source_files: 5,
        ignored_files: 0,
        total_size_bytes: 5000,
        directory_count: 2,
        total_lines_of_code: 350,
      },
      language_distribution: {},
      category_distribution: {},
      largest_files: [],
      top_level_directories: [],
    },
  },
};

const mockRun: ArchitectureRun = {
  id: "run-arch-1",
  repository_id: "repo-arch-1",
  snapshot_id: "snap-arch-1",
  status: "completed",
  started_at: new Date().toISOString(),
  modules_analyzed: 12,
  internal_edges_count: 18,
  external_deps_count: 6,
  unresolved_count: 0,
  cycles_count: 1,
  violations_count: 2,
  policy_configured: true,
  policy_path: "codesentinel.architecture.json",
  summary_json: {},
};

describe("ArchitectureView Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when no historical runs exist", async () => {
    vi.mocked(architectureService.listArchitectureRuns).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
    });

    render(<ArchitectureView repository={mockRepository} />);

    await waitFor(() => {
      expect(screen.getByText("No Architecture Analysis Executed")).toBeInTheDocument();
      expect(screen.getByText("Run Initial Architecture Analysis")).toBeInTheDocument();
    });
  });

  it("renders run metrics, summary cards, and modules explorer when runs exist", async () => {
    vi.mocked(architectureService.listArchitectureRuns).mockResolvedValue({
      items: [mockRun],
      total: 1,
      page: 1,
      page_size: 20,
    });

    vi.mocked(architectureService.listModules).mockResolvedValue({
      items: [
        {
          path: "app/services/auth.py",
          language: "python",
          total_lines: 100,
          classes_count: 2,
          abstract_classes_count: 0,
          afferent_coupling: 3,
          efferent_coupling: 1,
          instability: 0.25,
          abstractness: 0.0,
          main_sequence_distance: 0.75,
        },
      ],
      total: 1,
      page: 1,
      page_size: 50,
    });

    render(<ArchitectureView repository={mockRepository} />);

    await waitFor(() => {
      expect(screen.getByText("Architecture Governance & Coupling")).toBeInTheDocument();
      expect(screen.getAllByText("12").length).toBeGreaterThan(0); // Modules analyzed
      expect(screen.getByText("18")).toBeInTheDocument(); // Internal edges
      expect(screen.getByText("app/services/auth.py")).toBeInTheDocument();
    });
  });

  it("allows switching to Governance Violations tab", async () => {
    vi.mocked(architectureService.listArchitectureRuns).mockResolvedValue({
      items: [mockRun],
      total: 1,
      page: 1,
      page_size: 20,
    });
    vi.mocked(architectureService.listModules).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 50,
    });
    vi.mocked(architectureService.listViolations).mockResolvedValue({
      items: [
        {
          id: "viol-1",
          architecture_run_id: "run-arch-1",
          repository_id: "repo-arch-1",
          snapshot_id: "snap-arch-1",
          rule_id: "layer_boundary_violation",
          policy_id: "strict_layering",
          source_module: "app/models/user.py",
          target_module: "app/services/user_service.py",
          edge_specifier: "app.services.user_service",
          line_number: 14,
          violated_boundary: "data -> service",
          description: "Data layer module cannot import from service layer.",
          remediation: "Invert dependency or use dependency injection.",
          severity: "HIGH",
          confidence: "HIGH",
          fingerprint: "fp123",
          metadata_json: {},
          created_at: new Date().toISOString(),
        },
      ],
      total: 1,
      page: 1,
      page_size: 50,
    });

    render(<ArchitectureView repository={mockRepository} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Governance Violations/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Governance Violations/i }));

    await waitFor(() => {
      expect(screen.getByText("layer_boundary_violation")).toBeInTheDocument();
      expect(screen.getByText("data -> service")).toBeInTheDocument();
      expect(screen.getByText(/Data layer module cannot import from service layer/i)).toBeInTheDocument();
    });
  });

  it("triggers new architecture analysis on button click", async () => {
    vi.mocked(architectureService.listArchitectureRuns).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
    });
    vi.mocked(architectureService.startArchitectureRun).mockResolvedValue(mockRun);
    vi.mocked(architectureService.listModules).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 50,
    });

    render(<ArchitectureView repository={mockRepository} />);

    await waitFor(() => {
      expect(screen.getByText("Run Initial Architecture Analysis")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Run Initial Architecture Analysis"));

    await waitFor(() => {
      expect(architectureService.startArchitectureRun).toHaveBeenCalledWith("repo-arch-1", {
        snapshot_id: "snap-arch-1",
      });
    });
  });
});
