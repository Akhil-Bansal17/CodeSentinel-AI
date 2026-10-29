import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { UnifiedDiffViewer } from "../src/components/remediation/UnifiedDiffViewer";

describe("UnifiedDiffViewer Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleDiff = `--- a/src/server.py
+++ b/src/server.py
@@ -10,2 +10,2 @@
-eval(user_input)
+ast.literal_eval(user_input)`;

  it("renders unified diff lines with appropriate markers and file path", () => {
    render(
      <UnifiedDiffViewer
        diff={sampleDiff}
        filePath="src/server.py"
        originalSnippet="eval(user_input)"
        proposedSnippet="ast.literal_eval(user_input)"
        startLine={10}
      />
    );

    expect(screen.getByText("src/server.py")).toBeInTheDocument();
    expect(screen.getByText("unified diff")).toBeInTheDocument();
    expect(screen.getByText("-eval(user_input)")).toBeInTheDocument();
    expect(screen.getByText("+ast.literal_eval(user_input)")).toBeInTheDocument();
    expect(screen.getByText("Copy Diff")).toBeInTheDocument();
  });

  it("switches to split view when Split button is clicked", () => {
    render(
      <UnifiedDiffViewer
        diff={sampleDiff}
        filePath="src/server.py"
        originalSnippet="eval(user_input)"
        proposedSnippet="ast.literal_eval(user_input)"
        startLine={10}
      />
    );

    const splitBtn = screen.getByRole("button", { name: /Split/i });
    fireEvent.click(splitBtn);

    expect(screen.getByText(/Original Source/i)).toBeInTheDocument();
    expect(screen.getByText("BEFORE")).toBeInTheDocument();
    expect(screen.getByText(/Proposed Remediation/i)).toBeInTheDocument();
    expect(screen.getByText("AFTER")).toBeInTheDocument();
  });

  it("renders empty state message when diff is empty", () => {
    render(
      <UnifiedDiffViewer
        diff=""
        filePath="src/empty.py"
      />
    );

    expect(screen.getByText("No diff content available.")).toBeInTheDocument();
  });

  it("handles copy diff button interaction", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <UnifiedDiffViewer
        diff={sampleDiff}
        filePath="src/server.py"
      />
    );

    const copyBtn = screen.getByRole("button", { name: /Copy Diff/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeTextMock).toHaveBeenCalledWith(sampleDiff);
  });
});
