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
    getFinding: vi.fn(),
    getRulesCatalog: vi.fn(),
  },
}));

const mockSecurityRun: AnalysisRun = {
  id: "sec-run-201",
  repository_id: "repo-sec",
  snapshot_id: "snap-sec",
  status: "completed",
  started_at: new Date().toISOString(),
  completed_at: new Date().toISOString(),
  rule_set_version: "2.0.0",
  files_discovered: 8,
  files_analyzed: 8,
  files_skipped: 0,
  findings_count: 2,
  summary_json: {
    total_findings: 2,
    severity_distribution: {
      CRITICAL: 1,
      HIGH: 1,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
    },
    confidence_distribution: {
      HIGH: 1,
      MEDIUM: 1,
      LOW: 0,
    },
    category_distribution: {
      SECURITY: 2,
    },
    analyzed_files: 8,
    skipped_files: 0,
  },
};

const mockSecurityFindings: AnalysisFinding[] = [
  {
    id: "find-pysec-001",
    analysis_run_id: "sec-run-201",
    repository_id: "repo-sec",
    snapshot_id: "snap-sec",
    rule_id: "PYSEC001",
    rule_name: "Dynamic Code Execution (eval/exec)",
    rule_version: "1.0.0",
    title: "Call to dangerous dynamic execution primitive 'eval'",
    description: "Detected execution of dynamic code via eval().",
    severity: "HIGH",
    category: "SECURITY",
    confidence: "HIGH",
    file_path: "app/server.py",
    start_line: 42,
    start_column: 8,
    evidence_summary: "eval(payload)",
    fingerprint: "sha256-eval-fingerprint-9999",
    metadata_json: {
      why_it_matters: "Dynamic code execution allows arbitrary commands if input is attacker-influenced.",
      remediation: "Refactor to use safe deserialization or an explicit mapping table.",
      limitations: "AST detection inspects syntactic calls; does not perform global taint tracking.",
      confidence: "HIGH",
    },
    created_at: new Date().toISOString(),
  },
  {
    id: "find-jssec-002",
    analysis_run_id: "sec-run-201",
    repository_id: "repo-sec",
    snapshot_id: "snap-sec",
    rule_id: "JSSEC002",
    rule_name: "Dangerous Raw HTML Injection Sink",
    rule_version: "1.0.0",
    title: "Assignment to dangerous HTML injection sink 'innerHTML'",
    description: "Assigning unescaped content to innerHTML introduces Cross-Site Scripting (XSS) risks.",
    severity: "CRITICAL",
    category: "SECURITY",
    confidence: "MEDIUM",
    file_path: "client/dom.js",
    start_line: 19,
    start_column: 5,
    evidence_summary: "element.innerHTML = markup;",
    fingerprint: "sha256-xss-fingerprint-8888",
    metadata_json: {
      why_it_matters: "Raw HTML assignment can cause Cross-Site Scripting (XSS).",
      remediation: "Use textContent, or sanitize markup with DOMPurify.",
      limitations: "Heuristic sink check does not verify whether markup is already sanitized.",
      confidence: "MEDIUM",
    },
    created_at: new Date().toISOString(),
  },
];

const mockRepository: Repository = {
  id: "repo-sec",
  name: "secure-service",
  source_type: "local",
  source_identifier: "local:secure-service",
  status: "completed",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  latest_snapshot: {
    id: "snap-sec",
    repository_id: "repo-sec",
    status: "completed",
    started_at: new Date().toISOString(),
    file_count: 8,
    source_file_count: 8,
    ignored_file_count: 0,
    total_size_bytes: 12000,
    directory_count: 3,
    total_lines_of_code: 450,
    language_distribution: {},
    metrics_json: {
      summary: {
        total_files: 8,
        source_files: 8,
        ignored_files: 0,
        total_size_bytes: 12000,
        directory_count: 3,
        total_lines_of_code: 450,
      },
      language_distribution: {},
      category_distribution: {},
      largest_files: [],
      top_level_directories: [],
    },
  },
};

describe("Phase 4 Application Security Intelligence View", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(repositoryService.listSnapshotFiles).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 25,
      snapshot_id: "snap-sec",
    });
    vi.mocked(analysisService.listRepositoryAnalyses).mockResolvedValue({
      items: [mockSecurityRun],
      total: 1,
      page: 1,
      page_size: 20,
    });
    vi.mocked(analysisService.listFindings).mockResolvedValue({
      items: mockSecurityFindings,
      total: 2,
      page: 1,
      page_size: 25,
    });
  });

  it("displays confidence breakdown and security findings badges in summary cards", async () => {
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
      expect(screen.getByText(/Security Findings: 2/i)).toBeInTheDocument();
      expect(screen.getByText("CRITICAL: 1")).toBeInTheDocument();
      // Both Severity and Confidence have "HIGH: 1"
      expect(screen.getAllByText("HIGH: 1")).toHaveLength(2);
      expect(screen.getByText("MEDIUM: 1")).toBeInTheDocument();
    });
  });

  it("renders security findings table with separate severity, confidence and rule IDs", async () => {
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
      expect(screen.getByText("PYSEC001")).toBeInTheDocument();
      expect(screen.getByText("JSSEC002")).toBeInTheDocument();
      expect(screen.getByText("app/server.py:42")).toBeInTheDocument();
      expect(screen.getByText("client/dom.js:19")).toBeInTheDocument();
    });

    // Check confidence and severity display
    expect(screen.getAllByText("HIGH").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("MEDIUM")).toBeInTheDocument();
    expect(screen.getByText("CRITICAL")).toBeInTheDocument();
  });

  it("filters findings by confidence and category dropdowns", async () => {
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
      expect(screen.getByText("PYSEC001")).toBeInTheDocument();
    });

    // Filter by Confidence
    const confidenceSelect = screen.getByDisplayValue("All Confidences");
    fireEvent.change(confidenceSelect, { target: { value: "HIGH" } });

    await waitFor(() => {
      expect(analysisService.listFindings).toHaveBeenCalledWith(
        "sec-run-201",
        expect.objectContaining({ confidence: "HIGH" })
      );
    });

    // Filter by Category
    const categorySelect = screen.getByDisplayValue("All Categories");
    fireEvent.change(categorySelect, { target: { value: "SECURITY" } });

    await waitFor(() => {
      expect(analysisService.listFindings).toHaveBeenCalledWith(
        "sec-run-201",
        expect.objectContaining({ category: "SECURITY" })
      );
    });
  });

  it("opens security finding detail modal with Why It Matters, Remediation, and Disclaimer", async () => {
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
      expect(screen.getByText("PYSEC001")).toBeInTheDocument();
    });

    // Inspect first finding (PYSEC001)
    const inspectBtns = screen.getAllByRole("button", { name: /Inspect/i });
    fireEvent.click(inspectBtns[0]);

    await waitFor(() => {
      // Header tag check
      expect(screen.getByText("HIGH CONFIDENCE")).toBeInTheDocument();
      // Security disclaimer notice check
      expect(screen.getByText("Static Pattern Detection Notice")).toBeInTheDocument();
      // Why it matters section check
      expect(screen.getByText("Why It Matters:")).toBeInTheDocument();
      expect(
        screen.getByText("Dynamic code execution allows arbitrary commands if input is attacker-influenced.")
      ).toBeInTheDocument();
      // Remediation check
      expect(screen.getByText("Recommended Remediation:")).toBeInTheDocument();
      expect(
        screen.getByText("Refactor to use safe deserialization or an explicit mapping table.")
      ).toBeInTheDocument();
      // Limitations check
      expect(screen.getByText("Detection Method & Known Limitations:")).toBeInTheDocument();
      // Evidence check
      expect(screen.getByText("eval(payload)")).toBeInTheDocument();
    });

    // Close modal
    fireEvent.click(screen.getByRole("button", { name: /Close dialog/i }));
    await waitFor(() => {
      expect(screen.queryByText("Static Pattern Detection Notice")).not.toBeInTheDocument();
    });
  });
});
