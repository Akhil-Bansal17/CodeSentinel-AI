import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Header } from "../src/components/layout/Header";
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

describe("Header Global Controls Component", () => {
  it("renders breadcrumb title according to active tab", () => {
    const { rerender } = render(
      <Header
        currentTab="overview"
        onOpenMobileMenu={vi.fn()}
        onAnalyzeClick={vi.fn()}
        healthState={mockHealth}
      />
    );

    expect(screen.getByRole("heading", { name: "System Overview" })).toBeInTheDocument();
    expect(screen.getByText("CodeSentinel /")).toBeInTheDocument();

    rerender(
      <Header
        currentTab="cicd-audit"
        onOpenMobileMenu={vi.fn()}
        onAnalyzeClick={vi.fn()}
        healthState={mockHealth}
      />
    );
    expect(screen.getByRole("heading", { name: "CI/CD Workflows & Security Audits" })).toBeInTheDocument();
  });

  it("calls onAnalyzeClick when primary CTA is clicked", () => {
    const handleAnalyze = vi.fn();
    render(
      <Header
        currentTab="overview"
        onOpenMobileMenu={vi.fn()}
        onAnalyzeClick={handleAnalyze}
        healthState={mockHealth}
      />
    );

    const cta = screen.getByRole("button", { name: /Analyze Repository/i });
    fireEvent.click(cta);
    expect(handleAnalyze).toHaveBeenCalledTimes(1);
  });

  it("calls onOpenMobileMenu when mobile menu button is clicked", () => {
    const handleOpenMobile = vi.fn();
    render(
      <Header
        currentTab="overview"
        onOpenMobileMenu={handleOpenMobile}
        onAnalyzeClick={vi.fn()}
        healthState={mockHealth}
      />
    );

    const menuBtn = screen.getByRole("button", { name: "Toggle navigation menu" });
    fireEvent.click(menuBtn);
    expect(handleOpenMobile).toHaveBeenCalledTimes(1);
  });

  it("triggers healthState.refetch when refresh button is clicked", () => {
    render(
      <Header
        currentTab="overview"
        onOpenMobileMenu={vi.fn()}
        onAnalyzeClick={vi.fn()}
        healthState={mockHealth}
      />
    );

    const refreshBtn = screen.getByRole("button", { name: "Refresh backend status" });
    fireEvent.click(refreshBtn);
    expect(mockHealth.refetch).toHaveBeenCalledTimes(1);
  });
});
