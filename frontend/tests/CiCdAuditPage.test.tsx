import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CiCdAuditPage } from "../src/pages/CiCdAuditPage";
import { cicdService } from "../src/services/cicdService";
import { repositoryService } from "../src/services/repositoryService";
import { remediationService } from "../src/services/remediationService";

vi.mock("../src/services/cicdService", () => ({
  cicdService: {
    generateWorkflow: vi.fn(),
    executeAudit: vi.fn(),
    listAudits: vi.fn(),
    getAudit: vi.fn(),
    getSarif: vi.fn(),
    getMarkdownReport: vi.fn(),
    preparePr: vi.fn(),
    getPr: vi.fn(),
    getPatchBundle: vi.fn(),
  },
}));

vi.mock("../src/services/repositoryService", () => ({
  repositoryService: {
    listRepositories: vi.fn(),
  },
}));

vi.mock("../src/services/remediationService", () => ({
  remediationService: {
    listProposals: vi.fn(),
  },
}));

const mockRepo = {
  id: "repo-cicd-1",
  name: "SentinelRepo",
  source_type: "local",
  source_identifier: "/mock/repo",
  status: "ready",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockWorkflowResponse = {
  filename: ".github/workflows/codesentinel-ci.yml",
  yaml_content: `name: 'CodeSentinel Security CI'\n'on':\n  push:\n    branches:\n      - 'main'\npermissions:\n  contents: read\njobs:\n  audit:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2`,
  ecosystem_detected: "python",
  permissions_summary: { contents: "read" },
  security_warnings: [
    "Workflow permissions pinned to least-privilege: {'contents': 'read'}.",
    "Actions pinned to immutable full commit SHAs.",
  ],
};

const mockAuditRun = {
  id: "audit-run-123",
  repository_id: "repo-cicd-1",
  snapshot_id: "snap-123",
  status: "COMPLETED",
  overall_status: "PASSED",
  started_at: new Date().toISOString(),
  completed_at: new Date().toISOString(),
  summary: {
    total_checks: 6,
    passed_checks: 6,
    failed_checks: 0,
    warning_checks: 0,
    skipped_checks: 0,
    unsupported_checks: 0,
    error_checks: 0,
    total_findings: 0,
    findings_by_severity: {},
    total_duration_ms: 125,
  },
  checks: [
    {
      check_id: "AUDIT-INGEST-001",
      category: "INGESTION",
      name: "Snapshot Integrity & File Inventory",
      status: "PASSED",
      description: "Verifies completeness and SHA-256 fingerprinting.",
      details: {},
      duration_ms: 15,
    },
    {
      check_id: "AUDIT-STATIC-001",
      category: "STATIC_ANALYSIS",
      name: "AST Cyclomatic Complexity",
      status: "PASSED",
      description: "Evaluates McCabe complexity.",
      details: {},
      duration_ms: 20,
    },
  ],
  findings_preview: [],
  markdown_report: "# CodeSentinel AI Audit Report\nStatus: PASSED",
  sarif_json: { version: "2.1.0", runs: [] },
};

const mockProposal = {
  id: "prop-1",
  repository_id: "repo-cicd-1",
  snapshot_id: "snap-123",
  remediation_rule_id: "FIX-PYSEC001-LITERAL-EVAL",
  status: "VALIDATED",
  file_path: "src/calc.py",
  original_content_hash: "hash1",
  target_content_hash: "hash2",
  start_line: 10,
  end_line: 10,
  original_code_snippet: "eval(data)",
  proposed_code_snippet: "ast.literal_eval(data)",
  unified_diff: "--- a/src/calc.py\n+++ b/src/calc.py\n@@ -10,1 +10,1 @@\n-eval(data)\n+ast.literal_eval(data)",
  rationale: "Safe literal evaluation",
  confidence: "HIGH",
  risk_level: "LOW",
  is_llm_assisted: false,
  metadata_json: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  validations: [],
};

const mockPrResponse = {
  id: "pr-prep-123",
  repository_id: "repo-cicd-1",
  snapshot_id: "snap-123",
  title: "fix(security): remediate 1 vulnerability via CodeSentinel AI",
  description: "## Automated Remediation Pull Request\nValidated by CodeSentinel AI.",
  status: "PREPARED",
  proposal_count: 1,
  proposal_ids: ["prop-1"],
  combined_diff: "--- a/src/calc.py\n+++ b/src/calc.py\n@@ -10,1 +10,1 @@\n-eval(data)\n+ast.literal_eval(data)",
  patch_bundle: "# [PATCH] fix(security)\n--- a/src/calc.py\n+++ b/src/calc.py",
  has_conflicts: false,
  conflict_details: {},
  risk_summary: "Low-to-medium syntactic refactoring across 1 file(s).",
  created_at: new Date().toISOString(),
};

describe("Phase 8 CiCdAuditPage Console", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(repositoryService.listRepositories).mockResolvedValue({
      items: [mockRepo as any],
      total: 1,
      page: 1,
      page_size: 100,
    });
    vi.mocked(cicdService.listAudits).mockResolvedValue({
      items: [
        {
          id: mockAuditRun.id,
          repository_id: mockRepo.id,
          snapshot_id: "snap-123",
          status: "COMPLETED",
          overall_status: "PASSED",
          started_at: mockAuditRun.started_at,
          total_checks: 6,
          failed_checks: 0,
          warning_checks: 0,
          total_findings: 0,
        },
      ],
      total: 1,
    });
    vi.mocked(cicdService.getAudit).mockResolvedValue(mockAuditRun as any);
    vi.mocked(remediationService.listProposals).mockResolvedValue({
      items: [mockProposal as any],
      total: 1,
    });
    vi.mocked(cicdService.generateWorkflow).mockResolvedValue(mockWorkflowResponse as any);
    vi.mocked(cicdService.preparePr).mockResolvedValue(mockPrResponse as any);
  });

  it("renders page title and sub-navigation tabs", async () => {
    render(<CiCdAuditPage initialRepoId="repo-cicd-1" />);

    expect(screen.getByText(/CI\/CD Automation, Security Audits & PR Synthesis/i)).toBeInTheDocument();
    expect(screen.getByText("CI/CD Workflow Generator")).toBeInTheDocument();
    expect(screen.getByText("Codebase Audit Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Pull Request Synthesis Console")).toBeInTheDocument();
  });

  it("generates and renders hardened GitHub Actions workflow", async () => {
    render(<CiCdAuditPage initialRepoId="repo-cicd-1" />);

    await waitFor(() => {
      expect(screen.getByText("Generate Hardened Workflow")).toBeInTheDocument();
    });

    const genButton = screen.getByText("Generate Hardened Workflow");
    fireEvent.click(genButton);

    await waitFor(() => {
      expect(cicdService.generateWorkflow).toHaveBeenCalled();
      expect(screen.getByText(".github/workflows/codesentinel-ci.yml")).toBeInTheDocument();
      expect(screen.getByText("Copy YAML")).toBeInTheDocument();
      expect(screen.getByText("Download")).toBeInTheDocument();
    });
  });

  it("switches to Audit Dashboard and renders check pillars", async () => {
    render(<CiCdAuditPage initialRepoId="repo-cicd-1" />);

    const auditTabBtn = screen.getByText("Codebase Audit Dashboard");
    fireEvent.click(auditTabBtn);

    await waitFor(() => {
      expect(screen.getByText("Run Codebase Audit")).toBeInTheDocument();
      expect(screen.getByText("6-Pillar Analysis Verification")).toBeInTheDocument();
      expect(screen.getByText("Snapshot Integrity & File Inventory")).toBeInTheDocument();
      expect(screen.getByText("SARIF 2.1.0 Standard")).toBeInTheDocument();
    });
  });

  it("switches to PR Synthesis Console and synthesizes change set", async () => {
    render(<CiCdAuditPage initialRepoId="repo-cicd-1" />);

    const prTabBtn = screen.getByText("Pull Request Synthesis Console");
    fireEvent.click(prTabBtn);

    await waitFor(() => {
      expect(screen.getByText("Select Validated Proposals for PR Change Set")).toBeInTheDocument();
      expect(screen.getByText("FIX-PYSEC001-LITERAL-EVAL")).toBeInTheDocument();
    });

    const synthBtn = screen.getByText("Synthesize Pull Request Change Set");
    fireEvent.click(synthBtn);

    await waitFor(() => {
      expect(cicdService.preparePr).toHaveBeenCalled();
      expect(screen.getByText(/Change Set Verified Clean — Zero Line Overlaps or Drift/i)).toBeInTheDocument();
      expect(screen.getByText("Download .patch Bundle")).toBeInTheDocument();
      expect(screen.getByText("Combined Unified Diff Review")).toBeInTheDocument();
    });
  });

  it("handles copy YAML and download workflow triggers", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<CiCdAuditPage initialRepoId="repo-cicd-1" />);

    await waitFor(() => {
      expect(screen.getByText("Generate Hardened Workflow")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Generate Hardened Workflow"));

    await waitFor(() => {
      expect(screen.getByText("Copy YAML")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Copy YAML"));
    expect(writeTextMock).toHaveBeenCalledWith(mockWorkflowResponse.yaml_content);
  });

  it("downloads SARIF and Markdown audit reports", async () => {
    vi.mocked(cicdService.getMarkdownReport).mockResolvedValue("# Markdown Audit Report");

    render(<CiCdAuditPage initialRepoId="repo-cicd-1" />);

    fireEvent.click(screen.getByText("Codebase Audit Dashboard"));

    await waitFor(() => {
      expect(screen.getByText("SARIF 2.1.0 Standard")).toBeInTheDocument();
      expect(screen.getByText("Markdown Report")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("SARIF 2.1.0 Standard"));
    fireEvent.click(screen.getByText("Markdown Report"));

    await waitFor(() => {
      expect(cicdService.getMarkdownReport).toHaveBeenCalledWith("audit-run-123");
    });
  });

  it("displays conflict warning when overlapping patch conflicts are detected", async () => {
    const conflictingPrResponse = {
      ...mockPrResponse,
      has_conflicts: true,
      conflict_details: {
        message: "Proposals prop-1 and prop-2 conflict on lines 10-15 of src/calc.py",
      },
    };
    vi.mocked(cicdService.preparePr).mockResolvedValue(conflictingPrResponse as any);

    render(<CiCdAuditPage initialRepoId="repo-cicd-1" />);

    fireEvent.click(screen.getByText("Pull Request Synthesis Console"));

    await waitFor(() => {
      expect(screen.getByText("Synthesize Pull Request Change Set")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Synthesize Pull Request Change Set"));

    await waitFor(() => {
      expect(
        screen.getByText("Overlapping Patch Conflicts Detected — Safe Refusal Enforced")
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Proposals prop-1 and prop-2 conflict on lines 10-15/i)
      ).toBeInTheDocument();
    });
  });

  it("renders empty state when no audit records exist for repository", async () => {
    vi.mocked(cicdService.listAudits).mockResolvedValue({
      items: [],
      total: 0,
    });
    vi.mocked(cicdService.getAudit).mockRejectedValue(new Error("Not found"));

    render(<CiCdAuditPage initialRepoId="repo-cicd-1" />);

    fireEvent.click(screen.getByText("Codebase Audit Dashboard"));

    await waitFor(() => {
      expect(screen.getByText("No audit records found for this repository")).toBeInTheDocument();
    });
  });
});
