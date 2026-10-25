import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Tabs, TabItem } from "../src/components/common/Tabs";

describe("Tabs Primitive Component", () => {
  const tabs: TabItem[] = [
    { id: "overview", label: "Overview", badge: 4 },
    { id: "findings", label: "Findings", badge: "12" },
    { id: "settings", label: "Settings", disabled: true },
  ];

  it("renders tab items with role=tab and marks active tab as aria-selected=true", () => {
    render(<Tabs tabs={tabs} activeTab="overview" onChange={vi.fn()} />);

    expect(screen.getByRole("tablist", { name: "Tab Navigation" })).toBeInTheDocument();

    const overviewTab = screen.getByRole("tab", { name: /Overview/i });
    const findingsTab = screen.getByRole("tab", { name: /Findings/i });
    const settingsTab = screen.getByRole("tab", { name: /Settings/i });

    expect(overviewTab).toHaveAttribute("aria-selected", "true");
    expect(findingsTab).toHaveAttribute("aria-selected", "false");
    expect(settingsTab).toBeDisabled();
  });

  it("calls onChange callback when an inactive enabled tab is clicked", () => {
    const handleChange = vi.fn();
    render(<Tabs tabs={tabs} activeTab="overview" onChange={handleChange} />);

    fireEvent.click(screen.getByRole("tab", { name: /Findings/i }));
    expect(handleChange).toHaveBeenCalledWith("findings");
  });

  it("supports keyboard navigation with ArrowRight and ArrowLeft keys", () => {
    const handleChange = vi.fn();
    render(<Tabs tabs={tabs} activeTab="overview" onChange={handleChange} />);

    const overviewTab = screen.getByRole("tab", { name: /Overview/i });
    fireEvent.keyDown(overviewTab, { key: "ArrowRight" });

    expect(handleChange).toHaveBeenCalledWith("findings");
  });
});
