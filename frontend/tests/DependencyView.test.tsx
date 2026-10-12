import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DependencyView } from "../src/components/dependency/DependencyView";
import { dependencyService } from "../src/services/dependencyService";
import { Repository } from "../src/types/api";
import {
  AdvisoryStatus,
  DependencyRun,
  DependencyVulnerability,
  RepositoryDependency,
} from "../src/types/dependency";

vi.mock("../src/services/dependencyService", () => ({
  dependencyService: {
    listRepositoryDependencyRuns: vi.fn(),
    startDependencyAnalysis: vi.fn(),
    getDependencyRun: vi.fn(),
    listDependencies: vi.fn(),
    listVulnerabilities: vi.fn(),
    getAdvisoryStatus: vi.fn(),
  },
}));

const mockRepository: Repository = {
  id: "repo-dep-1",
  name: "backend-service",
  source_type: "github",
  source_identifier: "https://github.com/org/backend-service",
  source_url: "https://github.com/org/backend-service",
  default_branch: "main",
  status: "completed",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  latest_snapshot: {
    id: "snap-dep-1",
    repository_id: "repo-dep-1",
    status: "completed",
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    file_count: 10,
    source_file_count: 8,
    ignored_file_count: 2,
    total_size_bytes: 20480,
    directory_count: 3,
    total_lines_of_code: 500,
    language_distribution: {
      Python: { file_count: 8, size_bytes: 20480, lines_of_code: 500, percentage: 100.0 },
    },
    metrics_json: {
      summary: {
        total_files: 10,
        source_files: 8,
        ignored_files: 2,
        total_size_bytes: 20480,
        directory_count: 3,
        total_lines_of_code: 500,
      },
      language_distribution: {
        Python: { file_count: 8, size_bytes: 20480, lines_of_code: 500, percentage: 100.0 },
      },
      category_distribution: {},
      largest_files: [],
      top_level_directories: [],
    },
  },
};

const mockDependencyRun: DependencyRun = {
  id: "dep-run-1",
  repository_id: "repo-dep-1",
  snapshot_id: "snap-dep-1",
  status: "completed",
  started_at: new Date().toISOString(),
  completed_at: new Date().toISOString(),
  advisory_dataset_version: "2026.10.1",
  parser_version: "1.0.0",
  matching_engine_version: "1.0.0",
  dependencies_discovered: 4,
  dependencies_resolved: 4,
  dependencies_unresolved: 0,
  vulnerabilities_count: 1,
  manifest_files_count: 1,
  summary_json: {
    total_dependencies: 4,
    resolved_dependencies: 4,
    unresolved_dependencies: 0,
    direct_count: 3,
    transitive_count: 1,
    vulnerabilities_count: 1,
    severity_distribution: {
      CRITICAL: 0,
      HIGH: 1,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
      UNKNOWN: 0,
    },
    advisory_dataset_status: "POPULATED",
    advisory_dataset_version: "2026.10.1",
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockVulnerabilities: DependencyVulnerability[] = [
  {
    id: "vuln-1",
    dependency_run_id: "dep-run-1",
    advisory_id: "GHSA-j8r2-6x86-q33q",
    ecosystem: "pypi",
    package_name: "requests",
    resolved_version: "2.28.1",
    affected_range: "< 2.31.0",
    severity: "HIGH",
    severity_source: "CVSS:3.1",
    cvss_score: 7.5,
    remediation_version: "2.31.0",
    manifest_path: "requirements.txt",
    line_number: 1,
    evidence_summary: "Package 'requests' resolved at version 2.28.1 matches range '< 2.31.0'",
    fingerprint: "abc123fingerprint456",
    cve_ids: ["CVE-2023-32681"],
    advisory_dataset_version: "2026.10.1",
    metadata_json: {
      source_url: "https://github.com/advisories/GHSA-j8r2-6x86-q33q",
    },
    repository_id: "repo-dep-1",
    snapshot_id: "snap-dep-1",
    created_at: new Date().toISOString(),
  },
];

const mockDependencies: RepositoryDependency[] = [
  {
    id: "dep-item-1",
    dependency_run_id: "dep-run-1",
    repository_id: "repo-dep-1",
    snapshot_id: "snap-dep-1",
    manifest_path: "requirements.txt",
    ecosystem: "pypi",
    package_name: "requests",
    original_package_name: "requests",
    version_constraint: "==2.28.1",
    resolved_version: "2.28.1",
    dependency_type: "direct",
    is_direct: true,
    parser_name: "python-requirements-txt",
    parser_version: "1.0.0",
    status: "resolved",
    metadata_json: {},
    created_at: new Date().toISOString(),
  },
  {
    id: "dep-item-2",
    dependency_run_id: "dep-run-1",
    repository_id: "repo-dep-1",
    snapshot_id: "snap-dep-1",
    manifest_path: "requirements.txt",
    ecosystem: "pypi",
    package_name: "certifi",
    original_package_name: "certifi",
    version_constraint: null,
    resolved_version: "2024.2.2",
    dependency_type: "transitive",
    is_direct: false,
    parser_name: "python-requirements-txt",
    parser_version: "1.0.0",
    status: "resolved",
    metadata_json: {},
    created_at: new Date().toISOString(),
  },
];

const mockAdvisoryStatus: AdvisoryStatus = {
  status: "POPULATED",
  dataset_version: "2026.10.1",
  source_name: "codesentinel_curated_osv",
  records_count: 8,
  checksum: "abcdef123456",
  message: "Active dataset version 2026.10.1",
};

describe("DependencyView Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders metric cards, vulnerabilities, and opens detail inspection modal", async () => {
    vi.mocked(dependencyService.listRepositoryDependencyRuns).mockResolvedValue({
      items: [mockDependencyRun],
      total: 1,
      page: 1,
      page_size: 20,
    });
    vi.mocked(dependencyService.getAdvisoryStatus).mockResolvedValue(mockAdvisoryStatus);
    vi.mocked(dependencyService.listVulnerabilities).mockResolvedValue({
      items: mockVulnerabilities,
      total: 1,
      page: 1,
      page_size: 25,
    });
    vi.mocked(dependencyService.listDependencies).mockResolvedValue({
      items: mockDependencies,
      total: 2,
      page: 1,
      page_size: 25,
    });

    render(<DependencyView repository={mockRepository} />);

    // Wait for header and metrics
    await waitFor(() => {
      expect(screen.getByText("Discovered Packages")).toBeInTheDocument();
      expect(screen.getByText("Resolved Versions")).toBeInTheDocument();
      expect(screen.getByText("GHSA-j8r2-6x86-q33q")).toBeInTheDocument();
    });

    // Verify remediation suggestion displayed in table
    expect(screen.getByText("Fix: 2.31.0")).toBeInTheDocument();

    // Click on vulnerability row to open inspection modal
    fireEvent.click(screen.getByText("GHSA-j8r2-6x86-q33q"));

    // Modal inspection elements
    await waitFor(() => {
      expect(screen.getByText("Remediation Available")).toBeInTheDocument();
      expect(screen.getByText("Evidence & Match Summary")).toBeInTheDocument();
      expect(screen.getByText("abc123fingerprint456")).toBeInTheDocument();
    });

    // Close modal
    fireEvent.click(screen.getByRole("button", { name: /close modal/i }));
    await waitFor(() => {
      expect(screen.queryByText("Remediation Available")).not.toBeInTheDocument();
    });
  });

  it("switches to Dependency Inventory tab and displays package classifications", async () => {
    vi.mocked(dependencyService.listRepositoryDependencyRuns).mockResolvedValue({
      items: [mockDependencyRun],
      total: 1,
      page: 1,
      page_size: 20,
    });
    vi.mocked(dependencyService.getAdvisoryStatus).mockResolvedValue(mockAdvisoryStatus);
    vi.mocked(dependencyService.listVulnerabilities).mockResolvedValue({
      items: mockVulnerabilities,
      total: 1,
      page: 1,
      page_size: 25,
    });
    vi.mocked(dependencyService.listDependencies).mockResolvedValue({
      items: mockDependencies,
      total: 2,
      page: 1,
      page_size: 25,
    });

    render(<DependencyView repository={mockRepository} />);

    await waitFor(() => {
      expect(screen.getByText("Dependency Inventory")).toBeInTheDocument();
    });

    // Click Dependency Inventory tab
    fireEvent.click(screen.getByText("Dependency Inventory"));

    await waitFor(() => {
      expect(screen.getByText("certifi")).toBeInTheDocument();
      expect(screen.getByText("Transitive")).toBeInTheDocument();
      expect(screen.getByText("Direct")).toBeInTheDocument();
    });
  });

  it("displays advisory dataset unavailable alert when advisory status is UNAVAILABLE", async () => {
    vi.mocked(dependencyService.listRepositoryDependencyRuns).mockResolvedValue({
      items: [mockDependencyRun],
      total: 1,
      page: 1,
      page_size: 20,
    });
    vi.mocked(dependencyService.getAdvisoryStatus).mockResolvedValue({
      status: "UNAVAILABLE",
      records_count: 0,
      message: "No active advisory dataset",
    });
    vi.mocked(dependencyService.listVulnerabilities).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 25,
    });
    vi.mocked(dependencyService.listDependencies).mockResolvedValue({
      items: mockDependencies,
      total: 2,
      page: 1,
      page_size: 25,
    });

    render(<DependencyView repository={mockRepository} />);

    await waitFor(() => {
      expect(screen.getByText(/Advisory Dataset Unavailable/i)).toBeInTheDocument();
    });
  });

  it("renders empty callout when no dependency runs have been executed", async () => {
    vi.mocked(dependencyService.listRepositoryDependencyRuns).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
    });
    vi.mocked(dependencyService.getAdvisoryStatus).mockResolvedValue(mockAdvisoryStatus);

    render(<DependencyView repository={mockRepository} />);

    await waitFor(() => {
      expect(screen.getByText("No Dependency Analysis Run Yet")).toBeInTheDocument();
      expect(screen.getByText("Start First Dependency Scan")).toBeInTheDocument();
    });
  });
});
