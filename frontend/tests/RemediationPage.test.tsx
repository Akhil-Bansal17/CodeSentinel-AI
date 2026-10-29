import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RemediationPage } from "../src/pages/RemediationPage";
import { remediationService } from "../src/services/remediationService";
import { RemediationProposal } from "../src/types/remediation";

vi.mock("../src/services/remediationService", () => ({
  remediationService: {
    getRules: vi.fn(),
    checkAvailability: vi.fn(),
    createProposal: vi.fn(),
    listProposals: vi.fn(),
    getProposal: vi.fn(),
    validateProposal: vi.fn(),
    approveProposal: vi.fn(),
    rejectProposal: vi.fn(),
    applyProposal: vi.fn(),
    getProposalHistory: vi.fn(),
  },
}));

const mockProposal: RemediationProposal = {
  id: "prop-test-1",
  repository_id: "repo-123",
  snapshot_id: "snap-123",
  finding_id: "finding-eval-1",
  finding_type: "STATIC_ANALYSIS",
  remediation_rule_id: "FIX-PYSEC001-LITERAL-EVAL",
  status: "VALIDATED",
  file_path: "src/utils.py",
  original_content_hash: "a".repeat(64),
  target_content_hash: "b".repeat(64),
  start_line: 4,
  end_line: 4,
  original_code_snippet: "    return eval(data)\n",
  proposed_code_snippet: "    return ast.literal_eval(data)\n",
  unified_diff: "--- a/src/utils.py\n+++ b/src/utils.py\n@@ -4,1 +4,1 @@\n-    return eval(data)\n+    return ast.literal_eval(data)\n",
  rationale: "Replace dynamic eval with safe literal parsing via ast.literal_eval.",
  confidence: "HIGH",
  risk_level: "LOW",
  is_llm_assisted: false,
  metadata_json: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  validations: [
    {
      check_id: "CHK-01-INTEGRITY",
      check_name: "Source & Path Integrity",
      status: "PASSED",
      explanation: "Source path is authorized and content hash verified.",
    },
    {
      check_id: "CHK-02-STRUCTURE",
      check_name: "Patch Structure & Reconstitution",
      status: "PASSED",
      explanation: "Target region matched cleanly and produced verified output hash.",
    },
    {
      check_id: "CHK-03-SYNTAX",
      check_name: "Abstract Syntax Tree Validation",
      status: "PASSED",
      explanation: "Patched Python code parsed into valid AST with zero syntax errors.",
    },
    {
      check_id: "CHK-04-RULE-RECHECK",
      check_name: "Deterministic Static Rule Re-check",
      status: "PASSED",
      explanation: "Re-running static analysis confirmed rule PYSEC001 is eliminated.",
    },
    {
      check_id: "CHK-05-REGRESSION-RISK",
      check_name: "Regression & Compatibility Risk Disclosure",
      status: "PASSED",
      explanation: "ast.literal_eval() safely parses literals. Human review recommended.",
    },
  ],
};

describe("RemediationPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(remediationService.listProposals).mockResolvedValue({
      items: [mockProposal],
      total: 1,
    });
    vi.mocked(remediationService.getProposal).mockResolvedValue(mockProposal);
    vi.mocked(remediationService.getProposalHistory).mockResolvedValue([
      {
        id: "audit-1",
        proposal_id: "prop-test-1",
        repository_id: "repo-123",
        action: "PROPOSAL_CREATED",
        actor: "system",
        details_json: { status: "VALIDATED" },
        created_at: new Date().toISOString(),
      },
    ]);
  });

  it("renders page title and proposal list table", async () => {
    render(<RemediationPage />);

    expect(screen.getByText("Automated Remediation & Safe Patch Synthesis")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("src/utils.py")).toBeInTheDocument();
      expect(screen.getAllByText("VALIDATED").length).toBeGreaterThan(0);
    });
  });

  it("opens proposal detail console on clicking review", async () => {
    render(<RemediationPage />);

    await waitFor(() => {
      expect(screen.getByText("src/utils.py")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Review" }));

    await waitFor(() => {
      expect(screen.getByText("In-Memory Patch Validation Pipeline")).toBeInTheDocument();
      expect(screen.getByText("CHK-01-INTEGRITY")).toBeInTheDocument();
      expect(screen.getByText("CHK-03-SYNTAX")).toBeInTheDocument();
      expect(screen.getByText("5/5 Checks Passed")).toBeInTheDocument();
      expect(screen.getByText("Copy Diff")).toBeInTheDocument();
    });
  });

  it("disables Apply Patch button when proposal is not yet approved", async () => {
    render(<RemediationPage initialProposalId="prop-test-1" />);

    await waitFor(() => {
      expect(screen.getByText("In-Memory Patch Validation Pipeline")).toBeInTheDocument();
    });

    const applyButton = screen.getByRole("button", { name: /Apply Patch/i });
    expect(applyButton).toBeDisabled();
  });

  it("enables Apply Patch after explicit approval and shows confirmation modal", async () => {
    const approvedProposal: RemediationProposal = {
      ...mockProposal,
      status: "APPROVED",
    };
    vi.mocked(remediationService.listProposals).mockResolvedValue({
      items: [approvedProposal],
      total: 1,
    });
    vi.mocked(remediationService.getProposal).mockResolvedValue(approvedProposal);
    vi.mocked(remediationService.approveProposal).mockResolvedValue(approvedProposal);

    render(<RemediationPage initialProposalId="prop-test-1" />);

    await waitFor(() => {
      const applyButton = screen.getByRole("button", { name: /Apply Patch/i });
      expect(applyButton).not.toBeDisabled();
    });

    const applyButton = screen.getByRole("button", { name: /Apply Patch/i });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText("Confirm Patch Application")).toBeInTheDocument();
      expect(screen.getByText("Automated Safety Guarantees:")).toBeInTheDocument();
    });
  });

  it("handles rejection modal and submits reason", async () => {
    const rejectedProposal: RemediationProposal = {
      ...mockProposal,
      status: "REJECTED",
    };
    vi.mocked(remediationService.rejectProposal).mockResolvedValue(rejectedProposal);
    vi.mocked(remediationService.getProposal).mockResolvedValue(mockProposal);

    render(<RemediationPage initialProposalId="prop-test-1" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Reject$/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /^Reject$/i }));

    await waitFor(() => {
      expect(screen.getByText("Reject Remediation Proposal")).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/Code logic relies on dynamic execution/i);
    fireEvent.change(textarea, { target: { value: "Not applicable in this context" } });

    fireEvent.click(screen.getByRole("button", { name: /Confirm Rejection/i }));

    await waitFor(() => {
      expect(remediationService.rejectProposal).toHaveBeenCalledWith(
        "prop-test-1",
        "Not applicable in this context"
      );
    });
  });

  it("renders summary cards with real counts and handles search filtering", async () => {
    render(<RemediationPage />);

    await waitFor(() => {
      expect(screen.getByText("Remediation Candidates")).toBeInTheDocument();
      expect(screen.getByText("Awaiting Review")).toBeInTheDocument();
      expect(screen.getByText("Approved / Applied")).toBeInTheDocument();
      expect(screen.getByText("Blocked / Failed")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search path, rule, rationale/i);
    fireEvent.change(searchInput, { target: { value: "nonexistent.py" } });

    await waitFor(() => {
      expect(screen.queryByText("src/utils.py")).not.toBeInTheDocument();
      expect(screen.getByText("Total Proposals: 0")).toBeInTheDocument();
    });

    fireEvent.change(searchInput, { target: { value: "utils" } });
    await waitFor(() => {
      expect(screen.getByText("src/utils.py")).toBeInTheDocument();
      expect(screen.getByText("Total Proposals: 1")).toBeInTheDocument();
    });
  });

  it("renders empty state when no proposals exist", async () => {
    vi.mocked(remediationService.listProposals).mockResolvedValue({
      items: [],
      total: 0,
    });

    render(<RemediationPage />);

    await waitFor(() => {
      expect(screen.getByText("No Remediation Proposals Found")).toBeInTheDocument();
    });
  });

  it("handles Re-Validate button click and reloads validation checklist", async () => {
    vi.mocked(remediationService.validateProposal).mockResolvedValue(mockProposal);

    render(<RemediationPage initialProposalId="prop-test-1" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Re-Validate/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Re-Validate/i }));

    await waitFor(() => {
      expect(remediationService.validateProposal).toHaveBeenCalledWith("prop-test-1");
    });
  });

  it("executes safe patch application and displays success alert", async () => {
    const approvedProposal: RemediationProposal = {
      ...mockProposal,
      status: "APPROVED",
    };
    vi.mocked(remediationService.listProposals).mockResolvedValue({
      items: [approvedProposal],
      total: 1,
    });
    vi.mocked(remediationService.getProposal).mockResolvedValue(approvedProposal);
    vi.mocked(remediationService.applyProposal).mockResolvedValue({
      status: "APPLIED",
      proposal_id: "prop-test-1",
      file_path: "src/utils.py",
      message: "Patch applied atomically to repository workspace.",
      can_export_diff: true,
      new_file_hash: "verifiedhash123",
    });

    render(<RemediationPage initialProposalId="prop-test-1" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Apply Patch/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /Apply Patch/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Confirm & Apply/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Confirm & Apply/i }));

    await waitFor(() => {
      expect(remediationService.applyProposal).toHaveBeenCalledWith("prop-test-1");
      expect(screen.getByText(/Application Status: APPLIED/i)).toBeInTheDocument();
      expect(screen.getByText(/Verified File SHA-256: verifiedhash123/i)).toBeInTheDocument();
    });
  });
});
