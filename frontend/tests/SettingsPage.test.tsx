import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsPage } from "../src/pages/SettingsPage";
import { HealthState } from "../src/hooks/useHealth";

describe("SettingsPage Component", () => {
  const mockRefetch = vi.fn();
  const mockHealthState: HealthState = {
    isAvailable: true,
    isLoading: false,
    error: null,
    lastChecked: new Date(),
    data: {
      status: "ok",
      service: "codesentinel-api",
      version: "0.1.0",
      database: "connected",
      environment: "development",
    },
    refetch: mockRefetch,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders page title, connection diagnostics, and engine status", () => {
    render(<SettingsPage healthState={mockHealthState} />);

    expect(screen.getByText("Platform Settings")).toBeInTheDocument();
    expect(screen.getByText("Backend API Connection")).toBeInTheDocument();
    expect(screen.getByText("Database Engine")).toBeInTheDocument();
    expect(screen.getByText("Public GitHub Ingestion & Diagnostics")).toBeInTheDocument();
    expect(screen.getByText("Engine Limits & Ingestion Thresholds")).toBeInTheDocument();
    expect(screen.getByText("Console Preferences")).toBeInTheDocument();
    expect(screen.getByText("Deterministic Isolation & Security")).toBeInTheDocument();

    expect(screen.getByText("HEALTHY")).toBeInTheDocument();
    expect(screen.getByText("CONNECTED")).toBeInTheDocument();
    expect(screen.getByText("OPERATIONAL")).toBeInTheDocument();
    expect(screen.getByText("ENFORCED")).toBeInTheDocument();
  });

  it("triggers refetch when Test Connection button is clicked", () => {
    render(<SettingsPage healthState={mockHealthState} />);

    const testBtn = screen.getByRole("button", { name: /Test Connection/i });
    fireEvent.click(testBtn);

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("validates and tests public GitHub repository URL format", async () => {
    render(<SettingsPage healthState={mockHealthState} />);

    const input = screen.getByLabelText(/Test GitHub Repository URL \/ Reachability/i);
    const validateBtn = screen.getByRole("button", { name: /Test Reachability/i });

    // Invalid format
    fireEvent.change(input, { target: { value: "invalid-url" } });
    fireEvent.click(validateBtn);

    expect(screen.getByText(/URL must begin with 'https:\/\/github\.com\/'/i)).toBeInTheDocument();

    // Valid format
    fireEvent.change(input, { target: { value: "https://github.com/torvalds/linux" } });
    fireEvent.click(validateBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Verified valid public GitHub format for https:\/\/github\.com\/torvalds\/linux/i)
      ).toBeInTheDocument();
    });
  });

  it("saves and resets console preferences in localStorage", async () => {
    render(<SettingsPage healthState={mockHealthState} />);

    const searchModeSelect = screen.getByLabelText(/Default Code Search Retrieval Mode/i);
    fireEvent.change(searchModeSelect, { target: { value: "lexical" } });

    const saveBtn = screen.getByRole("button", { name: /Save Preferences/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText("Preferences Saved")).toBeInTheDocument();
    });

    const savedRaw = localStorage.getItem("codesentinel_user_preferences");
    expect(savedRaw).toContain('"defaultSearchMode":"lexical"');

    const resetBtn = screen.getByRole("button", { name: /Reset to Defaults/i });
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(localStorage.getItem("codesentinel_user_preferences")).toBeNull();
    });
  });
});
