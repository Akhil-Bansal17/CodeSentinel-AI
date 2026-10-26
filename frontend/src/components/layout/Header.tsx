import React from "react";
import { Menu, Plus, RefreshCw, GitFork, FolderGit2 } from "lucide-react";
import { NavigationTab } from "../../types/navigation";
import { HealthState } from "../../hooks/useHealth";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { useRepositoryContext } from "../../context/RepositoryContext";

export interface HeaderProps {
  currentTab: NavigationTab;
  onOpenMobileMenu: () => void;
  onAnalyzeClick: () => void;
  healthState: HealthState;
  onViewRepositoryDetail?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenMobileMenu,
  onAnalyzeClick,
  healthState,
  onViewRepositoryDetail,
}) => {
  let repoContext: ReturnType<typeof useRepositoryContext> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    repoContext = useRepositoryContext();
  } catch {
    repoContext = null;
  }

  const getTabTitle = (tab: NavigationTab): string => {
    switch (tab) {
      case "overview":
        return "System Overview";
      case "repositories":
        return "Connected Repositories";
      case "analysis":
        return "Deterministic Analysis Engine";
      case "remediation":
        return "Automated Remediation & Safe Patches";
      case "cicd-audit":
        return "CI/CD Workflows & Security Audits";
      case "code-search":
        return "AST & Code Search";
      case "ai-assistant":
        return "AI Codebase Assistant";
      case "settings":
        return "Platform Settings";
      default:
        return "System Overview";
    }
  };

  const repositories = repoContext?.repositories || [];
  const selectedRepoId = repoContext?.selectedRepoId;
  const setSelectedRepoId = repoContext?.setSelectedRepoId;

  return (
    <header className="h-16 px-4 sm:px-6 border-b border-border-default bg-surface-card/90 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer shrink-0"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2 truncate">
          <span className="text-xs font-mono text-text-muted hidden sm:inline select-none shrink-0">
            CodeSentinel /
          </span>
          <h1 className="text-sm font-semibold text-text-primary truncate">
            {getTabTitle(currentTab)}
          </h1>
        </div>
      </div>

      {/* Center/Right: Global Repository Context & Actions */}
      <div className="flex items-center gap-3">
        {/* Global Repository Context Picker (Desktop & Tablet) */}
        {repositories.length > 0 && (
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md border border-border-default bg-surface-elevated text-xs">
            <FolderGit2 className="w-3.5 h-3.5 text-accent shrink-0" aria-hidden="true" />
            <label htmlFor="global-repo-selector" className="text-text-muted font-mono sr-only">
              Active Repository Context
            </label>
            <select
              id="global-repo-selector"
              value={selectedRepoId || ""}
              onChange={(e) => setSelectedRepoId?.(e.target.value || null)}
              aria-label="Active Repository Context"
              className="bg-transparent text-text-primary font-mono text-xs focus:outline-hidden cursor-pointer max-w-[180px] truncate"
            >
              {repositories.map((repo) => (
                <option key={repo.id} value={repo.id} className="bg-surface-card text-text-primary">
                  {repo.name}
                </option>
              ))}
            </select>
            {onViewRepositoryDetail && selectedRepoId && (
              <button
                type="button"
                onClick={onViewRepositoryDetail}
                title="View active repository details"
                className="p-1 rounded text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                aria-label="View repository details"
              >
                <GitFork className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* API Health Status Pill */}
        <div className="hidden sm:flex items-center gap-1.5">
          {healthState.isLoading ? (
            <Badge label="Connecting API..." variant="neutral" dot size="sm" />
          ) : healthState.isAvailable ? (
            <Badge
              label={`API: ${healthState.data?.service || "online"}`}
              variant="success"
              dot
              size="sm"
            />
          ) : (
            <Badge label="API: Offline" variant="danger" dot size="sm" />
          )}

          <button
            type="button"
            onClick={() => healthState.refetch()}
            title="Refresh backend status"
            aria-label="Refresh backend status"
            className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${healthState.isLoading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Primary CTA: Analyze Repository */}
        <Button
          variant="primary"
          size="sm"
          onClick={onAnalyzeClick}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Analyze Repository
        </Button>
      </div>
    </header>
  );
};
