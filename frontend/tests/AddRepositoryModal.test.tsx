import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AddRepositoryModal } from "../src/components/repository/AddRepositoryModal";
import { repositoryService } from "../src/services/repositoryService";

vi.mock("../src/services/repositoryService", () => ({
  repositoryService: {
    createAndIngestRepository: vi.fn(),
  },
}));

describe("AddRepositoryModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders modal dialog when isOpen is true", () => {
    render(
      <AddRepositoryModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText("Analyze Repository — Phase 1 Roadmap")).toBeInTheDocument();
    expect(screen.getByText("Public GitHub")).toBeInTheDocument();
    expect(screen.getByText("Local Directory")).toBeInTheDocument();
  });

  it("switches to Local Directory form tab", () => {
    render(
      <AddRepositoryModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const localTab = screen.getByRole("button", { name: /Local Directory/i });
    fireEvent.click(localTab);

    expect(screen.getByLabelText(/Local Directory Path/i)).toBeInTheDocument();
    expect(screen.getByText(/Must be an absolute path inside/i)).toBeInTheDocument();
  });

  it("validates GitHub URL format before submission", async () => {
    render(
      <AddRepositoryModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const urlInput = screen.getByLabelText(/Repository URL/i);
    fireEvent.change(urlInput, { target: { value: "http://insecure-url.com" } });

    const submitBtn = screen.getByRole("button", { name: /Start Ingestion/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText("URL must start with 'https://github.com/'.")).toBeInTheDocument();
    expect(repositoryService.createAndIngestRepository).not.toHaveBeenCalled();
  });

  it("submits valid GitHub repository and invokes onSuccess callback", async () => {
    const mockRepo = {
      id: "repo-123",
      name: "sample-repo",
      source_type: "github" as const,
      source_identifier: "github:owner/sample-repo",
      status: "completed" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    vi.mocked(repositoryService.createAndIngestRepository).mockResolvedValueOnce(mockRepo);

    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    render(
      <AddRepositoryModal
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    const urlInput = screen.getByLabelText(/Repository URL/i);
    fireEvent.change(urlInput, { target: { value: "https://github.com/owner/sample-repo" } });

    const submitBtn = screen.getByRole("button", { name: /Start Ingestion/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(repositoryService.createAndIngestRepository).toHaveBeenCalledWith({
        source_type: "github",
        source_url: "https://github.com/owner/sample-repo",
        default_branch: undefined,
      });
      expect(handleSuccess).toHaveBeenCalledWith(mockRepo);
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it("displays error banner when ingestion fails", async () => {
    vi.mocked(repositoryService.createAndIngestRepository).mockRejectedValueOnce(
      new Error("Repository archive exceeds download limit (50MB).")
    );

    render(
      <AddRepositoryModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const urlInput = screen.getByLabelText(/Repository URL/i);
    fireEvent.change(urlInput, { target: { value: "https://github.com/owner/oversized-repo" } });

    const submitBtn = screen.getByRole("button", { name: /Start Ingestion/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText("Repository archive exceeds download limit (50MB).")
    ).toBeInTheDocument();
  });
});
