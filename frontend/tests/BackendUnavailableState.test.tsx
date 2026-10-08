import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BackendUnavailableState } from "../src/components/common/BackendUnavailableState";

describe("BackendUnavailableState Component", () => {
  it("renders offline banner and execution instructions", () => {
    render(<BackendUnavailableState onRetry={vi.fn()} />);

    expect(screen.getByText("Backend API Disconnected")).toBeInTheDocument();
    expect(screen.getByText("Offline")).toBeInTheDocument();
    expect(screen.getByText(/uvicorn backend\.app\.main:app/)).toBeInTheDocument();
  });

  it("calls retry callback when Reconnect button is clicked", () => {
    const handleRetry = vi.fn();
    render(<BackendUnavailableState onRetry={handleRetry} />);

    const retryButton = screen.getByRole("button", { name: /Reconnect to Backend/i });
    fireEvent.click(retryButton);

    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
