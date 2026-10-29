import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ValidationChecklist } from "../src/components/remediation/ValidationChecklist";
import { RemediationValidationItem } from "../src/types/remediation";

describe("ValidationChecklist Component", () => {
  const sampleValidations: RemediationValidationItem[] = [
    {
      check_id: "CHK-01-INTEGRITY",
      check_name: "Source & Path Integrity",
      status: "PASSED",
      explanation: "Source path is authorized and content hash verified.",
    },
    {
      check_id: "CHK-02-STRUCTURE",
      check_name: "Patch Structure & Reconstitution",
      status: "FAILED",
      explanation: "Target region did not match cleanly.",
      diagnostic_message: "Error: offset +5 lines drifted",
    },
    {
      check_id: "CHK-03-UNAVAILABLE",
      check_name: "Linter Compatibility Check",
      status: "UNAVAILABLE",
      explanation: "Flake8 binary not found in container.",
    },
  ];

  it("renders pipeline header, check names, and passed check ratio", () => {
    render(
      <ValidationChecklist
        validations={sampleValidations}
        overallStatus="VALIDATION_FAILED"
      />
    );

    expect(screen.getByText("In-Memory Patch Validation Pipeline")).toBeInTheDocument();
    expect(screen.getByText("1/3 Checks Passed")).toBeInTheDocument();
    expect(screen.getByText("Source & Path Integrity")).toBeInTheDocument();
    expect(screen.getByText("Patch Structure & Reconstitution")).toBeInTheDocument();
    expect(screen.getByText("Linter Compatibility Check")).toBeInTheDocument();
    expect(screen.getByText("Error: offset +5 lines drifted")).toBeInTheDocument();
  });
});

