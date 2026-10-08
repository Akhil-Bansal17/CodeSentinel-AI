import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OverviewPage } from "../src/pages/OverviewPage";
import { HealthState } from "../src/hooks/useHealth";

const mockConnectedHealth: HealthState = {
  data: {
    status: "ok",
    service: "codesentinel-api",
    version: "0.1.0",
    database: "connected",
    environment: "development",
  },
  isLoading: false,
  isAvailable: true,
  error: null,
  lastChecked: new Date(),
  refetch: vi.fn(),
};

describe("OverviewPage", () => {
  it("renders platform title and tagline", () => {
    render(<OverviewPage healthState={mockConnectedHealth} onAnalyzeClick={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "CodeSentinel AI", level: 1 })).toBeInTheDocument();
    expect(
      screen.getByText("AI-powered software engineering intelligence for your codebase.")
    ).toBeInTheDocument();
  });

  it("renders Analyze Repository CTA and triggers callback", () => {
    const handleAnalyze = vi.fn();
    render(<OverviewPage healthState={mockConnectedHealth} onAnalyzeClick={handleAnalyze} />);

    const buttons = screen.getAllByRole("button", { name: /Analyze Repository/i });
    expect(buttons.length).toBeGreaterThan(0);

    fireEvent.click(buttons[0]);
    expect(handleAnalyze).toHaveBeenCalledTimes(1);
  });

  it("displays honest empty state with zero fake metrics", () => {
    render(<OverviewPage healthState={mockConnectedHealth} onAnalyzeClick={vi.fn()} />);

    expect(screen.getByText("No repository analyzed yet.")).toBeInTheDocument();
    // Verify there are no fake numbers/metrics displayed
    expect(screen.queryByText(/87%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/12 vulnerabilities/i)).not.toBeInTheDocument();
  });

  it("renders telemetry with service name and version", () => {
    render(<OverviewPage healthState={mockConnectedHealth} onAnalyzeClick={vi.fn()} />);

    expect(screen.getByText("codesentinel-api")).toBeInTheDocument();
    expect(screen.getByText("v0.1.0")).toBeInTheDocument();
  });
});
