import React from "react";
import { Menu, Plus, RefreshCw } from "lucide-react";
import { NavigationTab } from "../../types/navigation";
import { HealthState } from "../../hooks/useHealth";
import { StatusBadge } from "../common/StatusBadge";

interface HeaderProps {
  currentTab: NavigationTab;
  onOpenMobileMenu: () => void;
  onAnalyzeClick: () => void;
  healthState: HealthState;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenMobileMenu,
  onAnalyzeClick,
  healthState,
}) => {
  const getTabTitle = (tab: NavigationTab): string => {
    switch (tab) {
      case "overview":
        return "System Overview";
      case "repositories":
        return "Connected Repositories";
      case "analysis":
        return "Deterministic Analysis Engine";
      case "code-search":
        return "AST & Code Search";
      case "ai-assistant":
        return "AI Codebase Assistant";
      case "settings":
        return "Platform Settings";
    }
  };

  return (
    <header className="h-16 px-4 sm:px-6 border-b border-[#21262d] bg-[#161b22] flex items-center justify-between shrink-0">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-md text-slate-400 hover:text-slate-200 hover:bg-[#21262d] transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400 hidden sm:inline">CodeSentinel /</span>
          <h1 className="text-sm font-semibold text-slate-100">{getTabTitle(currentTab)}</h1>
        </div>
      </div>

      {/* Right: Health indicator & Primary CTA */}
      <div className="flex items-center gap-3">
        {/* API Health Pill */}
        <div className="hidden sm:flex items-center gap-2">
          {healthState.isLoading ? (
            <StatusBadge label="Connecting API..." variant="neutral" dot />
          ) : healthState.isAvailable ? (
            <StatusBadge
              label={`API: ${healthState.data?.service || "online"}`}
              variant="success"
              dot
            />
          ) : (
            <StatusBadge label="API: Offline" variant="danger" dot />
          )}

          <button
            type="button"
            onClick={() => healthState.refetch()}
            title="Refresh backend status"
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-[#21262d] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${healthState.isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Primary CTA: Analyze Repository */}
        <button
          type="button"
          onClick={onAnalyzeClick}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Analyze Repository</span>
        </button>
      </div>
    </header>
  );
};
