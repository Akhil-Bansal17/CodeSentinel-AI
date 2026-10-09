import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RepositoriesPage } from "../src/pages/RepositoriesPage";

import { repositoryService } from "../src/services/repositoryService";
import { Repository } from "../src/types/api";

vi.mock("../src/services/repositoryService", () => ({
  repositoryService: {
    listRepositories: vi.fn(),
    listSnapshotFiles: vi.fn(),
  },
}));

const mockRepo: Repository = {
  id: "repo-1",
  name: "codesentinel-core",
  source_type: "github",
  source_identifier: "github:owner/codesentinel-core",
  source_url: "https://github.com/owner/codesentinel-core",
  default_branch: "main",
  status: "completed",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  last_ingested_at: new Date().toISOString(),
  latest_snapshot: {
    id: "snap-1",
    repository_id: "repo-1",
    status: "completed",
    started_at: new Date().toISOString(),
    file_count: 42,
    source_file_count: 28,
    ignored_file_count: 5,
    total_size_bytes: 125000,
    directory_count: 6,
    total_lines_of_code: 3400,
    language_distribution: {
      TypeScript: { file_count: 20, size_bytes: 80000, lines_of_code: 2400, percentage: 71.4 },
      Python: { file_count: 8, size_bytes: 45000, lines_of_code: 1000, percentage: 28.6 },
    },
    metrics_json: {
      summary: {
        total_files: 42,
        source_files: 28,
        ignored_files: 5,
        total_size_bytes: 125000,
        directory_count: 6,
        total_lines_of_code: 3400,
      },
      language_distribution: {},
      category_distribution: {},
      largest_files: [],
      top_level_directories: [],
    },
  },
};

describe("RepositoriesPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when no repositories exist", async () => {
    vi.mocked(repositoryService.listRepositories).mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      page_size: 50,
    });

    render(<RepositoriesPage onAnalyzeClick={vi.fn()} />);

    expect(await screen.findByText("No repositories connected yet.")).toBeInTheDocument();
  });

  it("renders repository list when repositories exist", async () => {
    vi.mocked(repositoryService.listRepositories).mockResolvedValueOnce({
      items: [mockRepo],
      total: 1,
      page: 1,
      page_size: 50,
    });

    render(<RepositoriesPage onAnalyzeClick={vi.fn()} />);

    expect(await screen.findByText("codesentinel-core")).toBeInTheDocument();
    expect(screen.getByText("42 files (28 source)")).toBeInTheDocument();
    expect(screen.getByText(/TypeScript/i)).toBeInTheDocument();
  });

  it("navigates to detail view when repository is clicked", async () => {
    vi.mocked(repositoryService.listRepositories).mockResolvedValueOnce({
      items: [mockRepo],
      total: 1,
      page: 1,
      page_size: 50,
    });

    vi.mocked(repositoryService.listSnapshotFiles).mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      page_size: 25,
      snapshot_id: "snap-1",
    });

    render(<RepositoriesPage onAnalyzeClick={vi.fn()} />);

    const repoCard = await screen.findByText("codesentinel-core");
    fireEvent.click(repoCard);

    expect(await screen.findByText("Back to Repositories")).toBeInTheDocument();
    expect(screen.getByText("File Explorer")).toBeInTheDocument();
  });
});
