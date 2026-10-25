import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../src/components/common/Card";

describe("Card Primitive Component", () => {
  it("renders card composite structure with title, description, content, and footer", () => {
    render(
      <Card variant="default">
        <CardHeader action={<button type="button">Action</button>}>
          <CardTitle>Repository Health</CardTitle>
          <CardDescription>Overall AST and architecture metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Score: 94/100</p>
        </CardContent>
        <CardFooter>
          <span>Last updated 2 hours ago</span>
        </CardFooter>
      </Card>
    );

    expect(screen.getByText("Repository Health")).toBeInTheDocument();
    expect(screen.getByText("Overall AST and architecture metrics")).toBeInTheDocument();
    expect(screen.getByText("Score: 94/100")).toBeInTheDocument();
    expect(screen.getByText("Last updated 2 hours ago")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();
  });

  it("applies interactive variant with hover styling", () => {
    const { container } = render(
      <Card variant="interactive">
        <CardContent>Interactive Item</CardContent>
      </Card>
    );

    expect(container.firstChild).toHaveClass("cursor-pointer");
    expect(container.firstChild).toHaveClass("hover:border-border-strong");
  });
});
