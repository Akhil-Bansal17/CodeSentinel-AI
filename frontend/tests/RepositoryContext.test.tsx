import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RepositoryProvider, useRepositoryContext } from "../src/context/RepositoryContext";
import { repositoryService } from "../src/services/repositoryService";
import { Repository } from "../src/types/api";

vi.mock("../src/services/repositoryService", () => ({
  repositoryService: {
    listRepositories: vi.fn(),
  },
}));

const mockRepoList: Repository[] = [
  {
    id: "repo-alpha",
    name: "alpha-service",
    source_type: "github",
    source_identifier: "github:org/alpha-service",
    status: "completed",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "repo-beta",
    name: "beta-service",
    source_type: "github",
    source_identifier: "github:org/beta-service",
    status: "completed",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const TestConsumer: React.FC = () => {
  const { repositories, selectedRepoId, selectedRepo, setSelectedRepoId, isLoadingRepos } =
    useRepositoryContext();

  return (
    <div>
      <span data-testid="loading">{isLoadingRepos ? "loading" : "idle"}</span>
      <span data-testid="repo-count">{repositories.length}</span>
      <span data-testid="selected-id">{selectedRepoId || "none"}</span>
      <span data-testid="selected-name">{selectedRepo ? selectedRepo.name : "none"}</span>
      <button type="button" onClick={() => setSelectedRepoId("repo-beta")}>
        Select Beta
      </button>
      <button type="button" onClick={() => setSelectedRepoId(null)}>
        Clear Selection
      </button>
    </div>
  );
};

describe("RepositoryContext Provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("loads repositories and defaults selectedRepoId to the first repository", async () => {
    vi.mocked(repositoryService.listRepositories).mockResolvedValueOnce({
      items: mockRepoList,
      total: 2,
      page: 1,
      page_size: 50,
    });

    render(
      <RepositoryProvider>
        <TestConsumer />
      </RepositoryProvider>
    );

    expect(screen.getByTestId("loading")).toHaveTextContent("loading");

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("idle");
    });

    expect(screen.getByTestId("repo-count")).toHaveTextContent("2");
    expect(screen.getByTestId("selected-id")).toHaveTextContent("repo-alpha");
    expect(screen.getByTestId("selected-name")).toHaveTextContent("alpha-service");
  });

  it("updates selected repository when setSelectedRepoId is invoked", async () => {
    vi.mocked(repositoryService.listRepositories).mockResolvedValueOnce({
      items: mockRepoList,
      total: 2,
      page: 1,
      page_size: 50,
    });

    render(
      <RepositoryProvider>
        <TestConsumer />
      </RepositoryProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("selected-id")).toHaveTextContent("repo-alpha");
    });

    fireEvent.click(screen.getByRole("button", { name: "Select Beta" }));

    expect(screen.getByTestId("selected-id")).toHaveTextContent("repo-beta");
    expect(screen.getByTestId("selected-name")).toHaveTextContent("beta-service");
  });

  it("clears repository selection when null is passed", async () => {
    vi.mocked(repositoryService.listRepositories).mockResolvedValueOnce({
      items: mockRepoList,
      total: 2,
      page: 1,
      page_size: 50,
    });

    render(
      <RepositoryProvider>
        <TestConsumer />
      </RepositoryProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("selected-id")).toHaveTextContent("repo-alpha");
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear Selection" }));

    expect(screen.getByTestId("selected-id")).toHaveTextContent("none");
    expect(screen.getByTestId("selected-name")).toHaveTextContent("none");
  });
});
