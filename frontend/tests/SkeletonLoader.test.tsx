import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SkeletonLoader } from "../src/components/common/SkeletonLoader";

describe("SkeletonLoader Primitive Component", () => {
  it("renders text skeleton with lines and role=status", () => {
    render(<SkeletonLoader variant="text" lines={4} />);

    const loader = screen.getByRole("status", { name: "Loading content..." });
    expect(loader).toBeInTheDocument();
    expect(loader.querySelectorAll(".animate-pulse")).toHaveLength(4);
  });

  it("renders card skeleton with role=status", () => {
    render(<SkeletonLoader variant="card" />);

    const loader = screen.getByRole("status", { name: "Loading card..." });
    expect(loader).toBeInTheDocument();
  });

  it("renders table skeleton with columns and rows", () => {
    render(<SkeletonLoader variant="table" columns={3} rows={2} />);

    const loader = screen.getByRole("status", { name: "Loading table..." });
    expect(loader).toBeInTheDocument();
  });
});
