import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CodeBlock } from "../src/components/common/CodeBlock";

describe("CodeBlock Primitive Component", () => {
  it("renders code content, file name, and line numbers", () => {
    const sampleCode = `const x = 10;\nconst y = 20;\nconsole.log(x + y);`;
    render(
      <CodeBlock
        code={sampleCode}
        fileName="src/calculator.ts"
        showLineNumbers={true}
      />
    );

    expect(screen.getByText("src/calculator.ts")).toBeInTheDocument();
    expect(screen.getByText("const x = 10;")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("highlights diff lines appropriately when isDiff is true", () => {
    const diffCode = `@@ -1,3 +1,3 @@\n-const oldVal = 1;\n+const newVal = 2;`;
    render(<CodeBlock code={diffCode} isDiff={true} />);

    const addedLine = screen.getByText("+const newVal = 2;");
    expect(addedLine.closest(".table-row")).toHaveClass("bg-status-success-bg");

    const removedLine = screen.getByText("-const oldVal = 1;");
    expect(removedLine.closest(".table-row")).toHaveClass("bg-status-danger-bg");
  });

  it("copies code to clipboard on copy button click", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<CodeBlock code="echo 'hello world'" allowCopy={true} />);

    const copyBtn = screen.getByRole("button", { name: "Copy code" });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith("echo 'hello world'");
    expect(await screen.findByText("Copied!")).toBeInTheDocument();
  });
});
