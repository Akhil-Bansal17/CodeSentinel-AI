import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "../src/components/common/Button";

describe("Button Primitive Component", () => {
  it("renders with children text and default primary variant", () => {
    render(<Button>Deploy Service</Button>);
    const button = screen.getByRole("button", { name: "Deploy Service" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-accent");
    expect(button).not.toBeDisabled();
  });

  it("renders secondary and danger variants with appropriate styles", () => {
    const { rerender } = render(<Button variant="secondary">Cancel</Button>);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveClass("bg-surface-elevated");

    rerender(<Button variant="danger">Delete Repository</Button>);
    expect(screen.getByRole("button", { name: "Delete Repository" })).toHaveClass("bg-status-danger-bg");
  });

  it("handles click events", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);

    fireEvent.click(screen.getByRole("button", { name: "Click Me" }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("disables click interactions when disabled prop is true", () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled Action</Button>);

    const button = screen.getByRole("button", { name: "Disabled Action" });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("renders loading spinner, disables button, and sets aria-busy when isLoading is true", () => {
    const handleClick = vi.fn();
    render(<Button isLoading onClick={handleClick}>Saving</Button>);

    const button = screen.getByRole("button", { name: "Saving" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("renders left and right icons properly", () => {
    render(
      <Button
        leftIcon={<span data-testid="left-icon">Left</span>}
        rightIcon={<span data-testid="right-icon">Right</span>}
      >
        Icon Button
      </Button>
    );

    expect(screen.getByTestId("left-icon")).toBeInTheDocument();
    expect(screen.getByTestId("right-icon")).toBeInTheDocument();
    expect(screen.getByText("Icon Button")).toBeInTheDocument();
  });
});
