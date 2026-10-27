import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RepositoryDetailView } from "../src/components/repository/RepositoryDetailView";
import { repositoryService } from "../src/services/repositoryService";
import { Repository, RepositoryFile } from "../src/types/api";

vi.mock("../src/services/repositoryService", () => ({
  repositoryService: {
    listRepositories: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 50 }),
    listSnapshotFiles: vi.fn(),
    reingestRepository: vi.fn(),
    deleteRepository: vi.fn(),
  },
}));

vi.mock("../src/services/analysisService", () => ({
  analysisService: {
    listRepositoryAnalyses: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 }),
    startAnalysis: vi.fn(),
    listFindings: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 50 }),
    getAnalysis: vi.fn(),
  },
}));

vi.mock("../src/services/architectureService", () => ({
  listArchitectureRuns: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 }),
  startArchitectureRun: vi.fn(),
  listModules: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 50 }),
  getModuleDetail: vi.fn(),
  listViolations: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 50 }),
  getArchitectureGraph: vi.fn().mockResolvedValue({ nodes: [], internal_edges: [], external_edges: [], unresolved_imports: [], cycles: [], metadata: { total_modules: 0, total_internal_edges: 0, total_external_edges: 0, total_cycles: 0, analyzed_languages: [] } }),
  getActivePolicy: vi.fn().mockResolvedValue({ is_configured: false, fingerprint: "default", policy: null }),
}));

vi.mock("../src/services/healthService", () => ({
  getRepositoryHealth: vi.fn().mockResolvedValue({
    id: "health-1",
    repository_id: "repo-1",
    snapshot_id: "snap-1",
    scoring_version: "1.0.0",
    overall_score: 85.0,
    status: "completed",
    dimensions: {},
    contributing_runs: {},
    missing_inputs: [],
    recommendations: [],
    assessed_at: new Date().toISOString(),
  }),
}));

const mockFiles: RepositoryFile[] = [
  {
    id: "f-1",
    snapshot_id: "snap-1",
    relative_path: "src/index.ts",
    file_name: "index.ts",
    extension: ".ts",
    language: "TypeScript",
    category: "source",
    size_bytes: 1200,
    is_source_file: true,
    is_binary: false,
    line_count: 45,
    sha256: "abc123456789",
  },
  {
    id: "f-2",
    snapshot_id: "snap-1",
    relative_path: "README.md",
    file_name: "README.md",
    extension: ".md",
    language: "Markdown",
    category: "documentation",
    size_bytes: 800,
    is_source_file: false,
    is_binary: false,
    line_count: 30,
    sha256: "def987654321",
  },
];

const mockRepository: Repository = {
  id: "repo-1",
  name: "sentinel-analytics",
  source_type: "github",
  source_identifier: "github:owner/sentinel-analytics",
  source_url: "https://github.com/owner/sentinel-analytics",
  default_branch: "main",
  status: "completed",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  last_ingested_at: new Date().toISOString(),
  latest_snapshot: {
    id: "snap-1",
    repository_id: "repo-1",
    status: "completed",
    started_at: new Date().toISOString(),
    file_count: 2,
    source_file_count: 1,
    ignored_file_count: 0,
    total_size_bytes: 2000,
    directory_count: 2,
    total_lines_of_code: 75,
    language_distribution: {
      TypeScript: { file_count: 1, size_bytes: 1200, lines_of_code: 45, percentage: 50.0 },
      Markdown: { file_count: 1, size_bytes: 800, lines_of_code: 30, percentage: 50.0 },
    },
    metrics_json: {
      summary: {
        total_files: 2,
        source_files: 1,
        ignored_files: 0,
        total_size_bytes: 2000,
        directory_count: 2,
        total_lines_of_code: 75,
      },
      language_distribution: {},
      category_distribution: {},
      largest_files: [
        {
          relative_path: "src/index.ts",
          file_name: "index.ts",
          size_bytes: 1200,
          language: "TypeScript",
          line_count: 45,
        },
      ],
      top_level_directories: [
        { name: "src", file_count: 1, total_size_bytes: 1200 },
      ],
    },
  },
};

describe("RepositoryDetailView Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(repositoryService.listSnapshotFiles).mockResolvedValue({
      items: mockFiles,
      total: 2,
      page: 1,
      page_size: 25,
      snapshot_id: "snap-1",
    });
  });

  it("renders repository metadata and deterministic metric cards", async () => {
    render(
      <RepositoryDetailView
        repository={mockRepository}
        onBack={vi.fn()}
        onRepositoryUpdated={vi.fn()}
        onRepositoryDeleted={vi.fn()}
      />
    );

    expect(screen.getByText("sentinel-analytics")).toBeInTheDocument();
    expect(screen.getByText("Total Files")).toBeInTheDocument();
    expect(screen.getByText("Lines of Code")).toBeInTheDocument();
    expect(screen.getByText("Processed Size")).toBeInTheDocument();
    expect(screen.getByText("Language Distribution")).toBeInTheDocument();

    await waitFor(() => {
      expect(repositoryService.listSnapshotFiles).toHaveBeenCalled();
    });
  });

  it("renders files in the File Explorer table with metadata", async () => {
    render(
      <RepositoryDetailView
        repository={mockRepository}
        onBack={vi.fn()}
        onRepositoryUpdated={vi.fn()}
        onRepositoryDeleted={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText("src/index.ts").length).toBeGreaterThan(0);
      expect(screen.getByText("README.md")).toBeInTheDocument();
      expect(screen.getByText("abc12345")).toBeInTheDocument(); // truncated SHA256
    });
  });

  it("navigates back when Back button is clicked", async () => {
    const handleBack = vi.fn();
    render(
      <RepositoryDetailView
        repository={mockRepository}
        onBack={handleBack}
        onRepositoryUpdated={vi.fn()}
        onRepositoryDeleted={vi.fn()}
      />
    );

    const backBtn = screen.getByRole("button", { name: /Back to Repositories/i });
    fireEvent.click(backBtn);

    expect(handleBack).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(repositoryService.listSnapshotFiles).toHaveBeenCalled();
    });
  });

  it("switches to Architecture and Codebase Health tabs", async () => {
    render(
      <RepositoryDetailView
        repository={mockRepository}
        onBack={vi.fn()}
        onRepositoryUpdated={vi.fn()}
        onRepositoryDeleted={vi.fn()}
      />
    );

    const archTab = screen.getByRole("button", { name: /Architecture & Coupling/i });
    fireEvent.click(archTab);

    await waitFor(() => {
      expect(screen.getByText(/Architecture Governance & Coupling/i)).toBeInTheDocument();
    });

    const healthTab = screen.getByRole("button", { name: /Codebase Health/i });
    fireEvent.click(healthTab);

    await waitFor(() => {
      expect(screen.getByText(/Codebase Health Index/i)).toBeInTheDocument();
    });
  });

  it("switches to Static Analysis, Dependencies, and CI/CD tabs", async () => {
    render(
      <RepositoryDetailView
        repository={mockRepository}
        onBack={vi.fn()}
        onRepositoryUpdated={vi.fn()}
        onRepositoryDeleted={vi.fn()}
      />
    );

    // Static Analysis tab
    const analysisTab = screen.getByRole("button", { name: /Static Analysis/i });
    fireEvent.click(analysisTab);
    expect(screen.getByRole("heading", { name: /Deterministic Static Analysis/i })).toBeInTheDocument();

    // Dependencies tab
    const depsTab = screen.getByRole("button", { name: /Dependencies & SCA/i });
    fireEvent.click(depsTab);
    expect(screen.getAllByText(/Dependency Intelligence/i).length).toBeGreaterThan(0);

    // CI/CD & Audits tab
    const cicdTab = screen.getByRole("button", { name: /CI\/CD & Audits/i });
    fireEvent.click(cicdTab);
    expect(screen.getByText(/CI\/CD Automation/i)).toBeInTheDocument();
  });
});

