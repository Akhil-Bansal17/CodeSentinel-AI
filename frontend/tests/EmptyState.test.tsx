import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmptyState } from "../src/components/common/EmptyState";

describe("EmptyState Component", () => {
  it("renders title and description properly", () => {
    render(
      <EmptyState
        title="No repository analyzed yet."
        description="Connect a repository to begin analysis."
      />
    );

    expect(screen.getByText("No repository analyzed yet.")).toBeInTheDocument();
    expect(screen.getByText("Connect a repository to begin analysis.")).toBeInTheDocument();
  });

  it("triggers action callback on button click", () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        title="No repository analyzed yet."
        description="Connect a repository."
        actionLabel="Analyze Repository"
        onAction={handleAction}
      />
    );

    const button = screen.getByRole("button", { name: "Analyze Repository" });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});
