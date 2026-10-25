import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "../src/components/common/Badge";
import { StatusBadge } from "../src/components/common/StatusBadge";

describe("Badge Primitive Component", () => {
  it("renders with label text and neutral styling by default", () => {
    render(<Badge label="v1.4.0" />);
    const badge = screen.getByText("v1.4.0");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-surface-elevated");
    expect(badge).toHaveClass("font-mono");
  });

  it("renders semantic status variants with proper styles", () => {
    const { rerender } = render(<Badge label="Pass" variant="success" />);
    expect(screen.getByText("Pass")).toHaveClass("bg-status-success-bg");

    rerender(<Badge label="Warning" variant="warning" />);
    expect(screen.getByText("Warning")).toHaveClass("bg-status-warning-bg");

    rerender(<Badge label="Critical" variant="danger" />);
    expect(screen.getByText("Critical")).toHaveClass("bg-status-danger-bg");

    rerender(<Badge label="Informational" variant="info" />);
    expect(screen.getByText("Informational")).toHaveClass("bg-status-info-bg");

    rerender(<Badge label="Accent" variant="accent" />);
    expect(screen.getByText("Accent")).toHaveClass("bg-accent-subtle");
  });

  it("renders pulsating dot indicator when dot is true", () => {
    const { container } = render(<Badge label="Active" dot variant="success" />);
    const dot = container.querySelector(".animate-pulse");
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass("bg-emerald-400");
  });

  it("preserves backward compatibility in StatusBadge wrapper", () => {
    render(<StatusBadge label="Operational" variant="success" dot />);
    expect(screen.getByText("Operational")).toBeInTheDocument();
    expect(screen.getByText("Operational")).toHaveClass("bg-status-success-bg");
  });
});
