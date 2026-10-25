import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Input } from "../src/components/common/Input";
import { Select } from "../src/components/common/Select";
import { Textarea } from "../src/components/common/Textarea";

describe("Form Controls Primitives", () => {
  describe("Input Component", () => {
    it("renders label, placeholder, and handles change events", () => {
      const handleChange = vi.fn();
      render(
        <Input
          label="Repository Name"
          placeholder="e.g. acme/api-gateway"
          onChange={handleChange}
        />
      );

      const input = screen.getByLabelText("Repository Name");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("placeholder", "e.g. acme/api-gateway");

      fireEvent.change(input, { target: { value: "my-repo" } });
      expect(handleChange).toHaveBeenCalled();
    });

    it("displays error message with role=alert and marks aria-invalid=true", () => {
      render(
        <Input
          label="Target Branch"
          error="Branch cannot contain spaces"
        />
      );

      const input = screen.getByLabelText("Target Branch");
      expect(input).toHaveAttribute("aria-invalid", "true");

      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent("Branch cannot contain spaces");
    });
  });

  describe("Select Component", () => {
    it("renders options and triggers selection change", () => {
      const handleChange = vi.fn();
      const options = [
        { value: "main", label: "main" },
        { value: "develop", label: "develop" },
      ];

      render(
        <Select
          label="Default Branch"
          options={options}
          defaultValue="main"
          onChange={handleChange}
        />
      );

      const select = screen.getByLabelText("Default Branch");
      expect(select).toBeInTheDocument();

      fireEvent.change(select, { target: { value: "develop" } });
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe("Textarea Component", () => {
    it("renders label, helper text, and accepts input", () => {
      render(
        <Textarea
          label="Commit Message"
          helperText="Write a concise imperative message"
        />
      );

      const textarea = screen.getByLabelText("Commit Message");
      expect(textarea).toBeInTheDocument();
      expect(screen.getByText("Write a concise imperative message")).toBeInTheDocument();

      fireEvent.change(textarea, { target: { value: "fix: security patch" } });
      expect(textarea).toHaveValue("fix: security patch");
    });
  });
});
