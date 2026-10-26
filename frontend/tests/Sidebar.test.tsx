import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "../src/components/layout/Sidebar";
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

const mockOfflineHealth: HealthState = {
  data: null,
  isLoading: false,
  isAvailable: false,
  error: "Network Error",
  lastChecked: new Date(),
  refetch: vi.fn(),
};

describe("Sidebar Navigation Component", () => {
  it("renders brand identity and platform title", () => {
    render(
      <Sidebar
        currentTab="overview"
        onSelectTab={vi.fn()}
        healthState={mockConnectedHealth}
      />
    );

    expect(screen.getByText("CodeSentinel AI")).toBeInTheDocument();
    expect(screen.getByText("Codebase Intelligence Console")).toBeInTheDocument();
  });

  it("renders all four logical navigation sections and destinations", () => {
    render(
      <Sidebar
        currentTab="overview"
        onSelectTab={vi.fn()}
        healthState={mockConnectedHealth}
      />
    );

    // Section Headers
    expect(screen.getByText("Platform")).toBeInTheDocument();
    expect(screen.getByText("Code Intelligence")).toBeInTheDocument();
    expect(screen.getByText("Operations & Security")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();

    // Destinations
    expect(screen.getByRole("button", { name: /^Overview/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Repositories/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Analysis/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Code Search/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^AI Assistant/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Remediation/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^CI\/CD & Audits/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Settings/i })).toBeInTheDocument();
  });

  it("marks the active navigation tab with aria-current=page", () => {
    render(
      <Sidebar
        currentTab="analysis"
        onSelectTab={vi.fn()}
        healthState={mockConnectedHealth}
      />
    );

    const activeBtn = screen.getByRole("button", { name: /^Analysis/i });
    expect(activeBtn).toHaveAttribute("aria-current", "page");

    const inactiveBtn = screen.getByRole("button", { name: /^Overview/i });
    expect(inactiveBtn).not.toHaveAttribute("aria-current");
  });

  it("triggers onSelectTab callback when an item is clicked", () => {
    const handleSelect = vi.fn();
    render(
      <Sidebar
        currentTab="overview"
        onSelectTab={handleSelect}
        healthState={mockConnectedHealth}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /^Repositories/i }));
    expect(handleSelect).toHaveBeenCalledWith("repositories");
  });

  it("displays real backend connectivity status and excludes stale milestone badges", () => {
    const { rerender } = render(
      <Sidebar
        currentTab="overview"
        onSelectTab={vi.fn()}
        healthState={mockConnectedHealth}
      />
    );

    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("Database")).toBeInTheDocument();

    // Verify stale milestone labels are absent
    expect(screen.queryByText(/Phase 0 • Foundation/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Phase 7")).not.toBeInTheDocument();
    expect(screen.queryByText("Phase 8")).not.toBeInTheDocument();

    // Rerender in offline state
    rerender(
      <Sidebar
        currentTab="overview"
        onSelectTab={vi.fn()}
        healthState={mockOfflineHealth}
      />
    );
    expect(screen.getByText("Offline")).toBeInTheDocument();
  });
});
