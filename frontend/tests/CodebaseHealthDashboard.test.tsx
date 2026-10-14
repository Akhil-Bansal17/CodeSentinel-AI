import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CodebaseHealthDashboard } from "../src/components/architecture/CodebaseHealthDashboard";
import * as healthService from "../src/services/healthService";
import { Repository } from "../src/types/api";
import { CodebaseHealth } from "../src/types/health";

vi.mock("../src/services/healthService", () => ({
  getRepositoryHealth: vi.fn(),
}));

const mockRepository: Repository = {
  id: "repo-health-1",
  name: "sentinel-core",
  source_type: "local",
  source_identifier: "local:/workspace",
  default_branch: "main",
  status: "completed",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  latest_snapshot: {
    id: "snap-health-1",
    repository_id: "repo-health-1",
    status: "completed",
    started_at: new Date().toISOString(),
    file_count: 10,
    source_file_count: 8,
    ignored_file_count: 2,
    total_size_bytes: 8000,
    directory_count: 3,
    total_lines_of_code: 600,
    language_distribution: {},
    metrics_json: {
      summary: {
        total_files: 10,
        source_files: 8,
        ignored_files: 2,
        total_size_bytes: 8000,
        directory_count: 3,
        total_lines_of_code: 600,
      },
      language_distribution: {},
      category_distribution: {},
      largest_files: [],
      top_level_directories: [],
    },
  },
};

const mockHealthAssessment: CodebaseHealth = {
  id: "health-rec-1",
  repository_id: "repo-health-1",
  snapshot_id: "snap-health-1",
  scoring_version: "1.0.0",
  overall_score: 82.5,
  status: "completed",
  dimensions: {
    maintainability: {
      name: "Maintainability",
      score: 88.0,
      status: "HEALTHY",
      weight: 0.25,
      contribution: 22.0,
      metrics: { syntax_error_count: 0, high_complexity_count: 1 },
      reasons: ["Clean syntax across snapshot.", "1 function exceeds CC threshold."],
    },
    app_security: {
      name: "Application Security",
      score: 75.0,
      status: "WARNING",
      weight: 0.25,
      contribution: 18.75,
      metrics: { critical_count: 0, high_count: 2 },
      reasons: ["2 high severity security findings detected."],
    },
    architecture: {
      name: "Architecture & Coupling",
      score: 90.0,
      status: "HEALTHY",
      weight: 0.2,
      contribution: 18.0,
      metrics: { cycle_count: 0, violations_count: 1 },
      reasons: ["No circular dependencies.", "1 layer boundary violation."],
    },
    dependency_risk: {
      name: "Dependency Risk",
      score: 80.0,
      status: "HEALTHY",
      weight: 0.15,
      contribution: 12.0,
      metrics: { total_dependencies: 14, vulnerable_dependencies: 1 },
      reasons: ["1 vulnerable direct package."],
    },
    coverage: {
      name: "Analysis Coverage",
      score: 78.0,
      status: "HEALTHY",
      weight: 0.15,
      contribution: 11.75,
      metrics: { total_files: 10, analyzed_files: 8 },
      reasons: ["80% source files parsed."],
    },
  },
  contributing_runs: {
    static_analysis: "run-static-1",
    security_analysis: "run-sec-1",
    architecture: "run-arch-1",
    dependencies: "run-dep-1",
  },
  missing_inputs: [],
  recommendations: [
    {
      priority: "HIGH",
      dimension: "app_security",
      title: "Remediate SQL Injection",
      action: "Use parameterized queries in auth_service.py to resolve high severity vulnerability.",
    },
    {
      priority: "MEDIUM",
      dimension: "maintainability",
      title: "Refactor Cyclomatic Complexity",
      action: "Break down complex parsing method in graph_builder.py (CC=18).",
    },
  ],
  assessed_at: new Date().toISOString(),
};

describe("CodebaseHealthDashboard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", async () => {
    vi.mocked(healthService.getRepositoryHealth).mockReturnValue(new Promise(() => {}));
    render(<CodebaseHealthDashboard repository={mockRepository} />);

    expect(screen.getByText("Evaluating Codebase Health")).toBeInTheDocument();
  });

  it("renders error state when fetch fails", async () => {
    vi.mocked(healthService.getRepositoryHealth).mockRejectedValue(new Error("Network timeout"));
    render(<CodebaseHealthDashboard repository={mockRepository} />);

    await waitFor(() => {
      expect(screen.getByText("Failed to Retrieve Codebase Health")).toBeInTheDocument();
      expect(screen.getByText("Network timeout")).toBeInTheDocument();
    });
  });

  it("renders overall score, 5 dimensions, and prioritized recommendations", async () => {
    vi.mocked(healthService.getRepositoryHealth).mockResolvedValue(mockHealthAssessment);
    render(<CodebaseHealthDashboard repository={mockRepository} />);

    await waitFor(() => {
      expect(screen.getByText("82.5")).toBeInTheDocument();
      expect(screen.getByText("Good Health")).toBeInTheDocument();
      expect(screen.getByText("Maintainability")).toBeInTheDocument();
      expect(screen.getByText("Application Security")).toBeInTheDocument();
      expect(screen.getByText("Architecture & Coupling")).toBeInTheDocument();
      expect(screen.getByText("Dependency Risk")).toBeInTheDocument();
      expect(screen.getByText("Analysis Coverage")).toBeInTheDocument();
    });

    // Check recommendations
    expect(screen.getByText("Remediate SQL Injection")).toBeInTheDocument();
    expect(screen.getByText(/Use parameterized queries/i)).toBeInTheDocument();
    expect(screen.getByText("Refactor Cyclomatic Complexity")).toBeInTheDocument();
  });

  it("handles unavailable status with missing inputs message", async () => {
    const unavailableAssessment: CodebaseHealth = {
      ...mockHealthAssessment,
      overall_score: null,
      status: "unavailable",
      missing_inputs: ["static_analysis", "security_analysis"],
      recommendations: [],
    };
    vi.mocked(healthService.getRepositoryHealth).mockResolvedValue(unavailableAssessment);

    render(<CodebaseHealthDashboard repository={mockRepository} />);

    await waitFor(() => {
      expect(screen.getByText("--")).toBeInTheDocument();
      expect(screen.getByText("Unavailable")).toBeInTheDocument();
      expect(screen.getByText(/Overall health score is unavailable until/i)).toBeInTheDocument();
    });
  });
});
