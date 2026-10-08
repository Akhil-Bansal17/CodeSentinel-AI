import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { App } from "../src/App";

describe("App Root Component", () => {
  beforeEach(() => {
    // Mock global fetch for health check
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ok",
        service: "codesentinel-api",
        version: "0.1.0",
        database: "connected",
        environment: "development",
      }),
    } as Response);
  });

  it("renders the application shell and main navigation", async () => {
    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getAllByText("Overview").length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText("Repositories").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Analysis").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Code Search").length).toBeGreaterThan(0);
    expect(screen.getAllByText("AI Assistant").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Settings").length).toBeGreaterThan(0);
  });

  it("navigates between views when tabs are clicked", async () => {
    await act(async () => {
      render(<App />);
    });

    // Click Repositories tab
    const reposTab = screen.getByRole("button", { name: /^Repositories/i });
    await act(async () => {
      fireEvent.click(reposTab);
    });
    expect(screen.getByText("Connected Repositories")).toBeInTheDocument();

    // Click Settings tab
    const settingsTab = screen.getByRole("button", { name: /^Settings/i });
    await act(async () => {
      fireEvent.click(settingsTab);
    });
    expect(screen.getAllByText("Platform Settings").length).toBeGreaterThan(0);
  });

  it("opens the Analyze Repository roadmap modal when CTA is clicked", async () => {
    await act(async () => {
      render(<App />);
    });

    const ctaButton = screen.getAllByRole("button", { name: /Analyze Repository/i })[0];
    await act(async () => {
      fireEvent.click(ctaButton);
    });

    expect(screen.getByText("Analyze Repository — Phase 1 Roadmap")).toBeInTheDocument();
    expect(screen.getByText(/Foundational Architecture In Place/i)).toBeInTheDocument();

    // Close dialog
    const closeBtn = screen.getByRole("button", { name: "Understood" });
    await act(async () => {
      fireEvent.click(closeBtn);
    });
    expect(screen.queryByText("Analyze Repository — Phase 1 Roadmap")).not.toBeInTheDocument();
  });
});
