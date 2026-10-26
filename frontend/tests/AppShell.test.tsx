import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppShell } from "../src/components/layout/AppShell";
import { HealthState } from "../src/hooks/useHealth";

const mockHealth: HealthState = {
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

describe("AppShell Component", () => {
  it("renders desktop sidebar, header, and children within main area", () => {
    render(
      <AppShell
        currentTab="overview"
        onSelectTab={vi.fn()}
        onAnalyzeClick={vi.fn()}
        healthState={mockHealth}
      >
        <div data-testid="page-content">Dashboard Content</div>
      </AppShell>
    );

    expect(screen.getByTestId("page-content")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "System Overview" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Overview/i })).toBeInTheDocument();
  });

  it("opens mobile drawer when mobile toggle is triggered", () => {
    render(
      <AppShell
        currentTab="overview"
        onSelectTab={vi.fn()}
        onAnalyzeClick={vi.fn()}
        healthState={mockHealth}
      >
        <div>Content</div>
      </AppShell>
    );

    const toggleBtn = screen.getByRole("button", { name: "Toggle navigation menu" });
    fireEvent.click(toggleBtn);

    const drawer = screen.getByRole("dialog", { name: "Mobile Navigation" });
    expect(drawer).toBeInTheDocument();
  });
});
