import React from "react";
import {
  LayoutDashboard,
  FolderGit2,
  FileCode2,
  Search,
  Bot,
  Settings,
  ShieldCheck,
  Circle,
} from "lucide-react";
import { NavigationItem, NavigationTab } from "../../types/navigation";
import { HealthState } from "../../hooks/useHealth";
import { cn } from "../../lib/utils";

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  healthState: HealthState;
  className?: string;
  onCloseMobile?: () => void;
}

const NAV_ITEMS: NavigationItem[] = [
  { id: "overview", label: "Overview" },
  { id: "repositories", label: "Repositories" },
  { id: "analysis", label: "Analysis", badge: "Phase 1", isComingSoon: true },
  { id: "code-search", label: "Code Search", badge: "Phase 2", isComingSoon: true },
  { id: "ai-assistant", label: "AI Assistant", badge: "Phase 3", isComingSoon: true },
  { id: "settings", label: "Settings" },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  healthState,
  className,
  onCloseMobile,
}) => {
  const getIcon = (id: NavigationTab) => {
    switch (id) {
      case "overview":
        return <LayoutDashboard className="w-4 h-4" />;
      case "repositories":
        return <FolderGit2 className="w-4 h-4" />;
      case "analysis":
        return <FileCode2 className="w-4 h-4" />;
      case "code-search":
        return <Search className="w-4 h-4" />;
      case "ai-assistant":
        return <Bot className="w-4 h-4" />;
      case "settings":
        return <Settings className="w-4 h-4" />;
    }
  };

  return (
    <aside
      className={cn(
        "flex flex-col w-64 h-full bg-[#161b22] border-r border-[#21262d] select-none",
        className
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[#21262d]">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-950/70 border border-emerald-700/60 text-emerald-400">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight text-slate-100 flex items-center gap-1.5">
            CodeSentinel AI
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#21262d] border border-[#30363d] text-slate-400">
              v0.1.0
            </span>
          </div>
          <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
            Engineering Intelligence
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-mono uppercase tracking-wider text-slate-400">
          Platform
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectTab(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer",
                isActive
                  ? "bg-[#21262d] text-slate-100 font-semibold border border-[#30363d]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#21262d]/50"
              )}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? "text-emerald-400" : "text-slate-400"}>
                  {getIcon(item.id)}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={cn(
                    "text-[10px] font-mono px-1.5 py-0.2 rounded border",
                    item.isComingSoon
                      ? "bg-[#0d1117] text-slate-400 border-[#30363d]"
                      : "bg-emerald-950/40 text-emerald-400 border-emerald-800"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Phase 0 Status & System Health */}
      <div className="p-4 border-t border-[#21262d] bg-[#0d1117]/60 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono text-[11px]">Milestone</span>
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-800 text-emerald-300">
            Phase 0 • Foundation
          </span>
        </div>

        {/* Backend Connectivity Status */}
        <div className="flex items-center justify-between pt-2 border-t border-[#21262d] text-xs">
          <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
            <Circle
              className={cn(
                "w-2 h-2 fill-current",
                healthState.isAvailable ? "text-emerald-400" : "text-rose-400"
              )}
            />
            Backend API
          </span>
          <span
            className={cn(
              "text-[11px] font-mono",
              healthState.isAvailable ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {healthState.isLoading
              ? "Checking..."
              : healthState.isAvailable
              ? `Connected`
              : "Offline"}
          </span>
        </div>
      </div>
    </aside>
  );
};
