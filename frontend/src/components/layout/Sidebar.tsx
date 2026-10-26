import React from "react";
import {
  LayoutDashboard,
  FolderGit2,
  FileCode2,
  Wrench,
  Search,
  Bot,
  Settings,
  ShieldCheck,
  Workflow,
  Circle,
} from "lucide-react";
import { NavigationItem, NavigationTab } from "../../types/navigation";
import { HealthState } from "../../hooks/useHealth";
import { cn } from "../../lib/utils";

export interface NavSection {
  title: string;
  items: NavigationItem[];
}

export interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  healthState: HealthState;
  className?: string;
  onCloseMobile?: () => void;
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Platform",
    items: [
      { id: "overview", label: "Overview" },
      { id: "repositories", label: "Repositories" },
    ],
  },
  {
    title: "Code Intelligence",
    items: [
      { id: "analysis", label: "Analysis" },
      { id: "code-search", label: "Code Search" },
      { id: "ai-assistant", label: "AI Assistant" },
    ],
  },
  {
    title: "Operations & Security",
    items: [
      { id: "remediation", label: "Remediation" },
      { id: "cicd-audit", label: "CI/CD & Audits" },
    ],
  },
  {
    title: "System",
    items: [{ id: "settings", label: "Settings" }],
  },
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
        return <LayoutDashboard className="w-4 h-4" aria-hidden="true" />;
      case "repositories":
        return <FolderGit2 className="w-4 h-4" aria-hidden="true" />;
      case "analysis":
        return <FileCode2 className="w-4 h-4" aria-hidden="true" />;
      case "remediation":
        return <Wrench className="w-4 h-4" aria-hidden="true" />;
      case "cicd-audit":
        return <Workflow className="w-4 h-4" aria-hidden="true" />;
      case "code-search":
        return <Search className="w-4 h-4" aria-hidden="true" />;
      case "ai-assistant":
        return <Bot className="w-4 h-4" aria-hidden="true" />;
      case "settings":
        return <Settings className="w-4 h-4" aria-hidden="true" />;
    }
  };

  return (
    <aside
      aria-label="Primary Navigation"
      className={cn(
        "flex flex-col w-64 h-full bg-surface-card border-r border-border-default select-none shadow-xs",
        className
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 py-4.5 border-b border-border-default shrink-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/15 border border-accent-border text-accent shadow-xs">
          <ShieldCheck className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold tracking-tight text-text-primary flex items-center gap-1.5 truncate">
            <span>CodeSentinel AI</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-xs bg-surface-elevated border border-border-default text-text-muted">
              v{healthState.data?.version || "0.1.0"}
            </span>
          </div>
          <div className="text-[11px] text-text-muted truncate">Codebase Intelligence Console</div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-text-muted">
              {section.title}
            </div>
            {section.items.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => {
                    onSelectTab(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer",
                    "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent",
                    isActive
                      ? "bg-surface-elevated text-text-primary font-semibold border border-border-default shadow-xs"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-hover/70 border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className={isActive ? "text-accent" : "text-text-muted"} aria-hidden="true">
                      {getIcon(item.id)}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full border border-border-default bg-surface-elevated text-text-secondary">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Live System Health Footer */}
      <div className="p-4 border-t border-border-default bg-surface-elevated/50 space-y-2 shrink-0">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-muted text-[11px] flex items-center gap-1.5">
            <Circle
              className={cn(
                "w-2 h-2 fill-current shrink-0",
                healthState.isAvailable ? "text-status-success animate-pulse" : "text-status-danger"
              )}
              aria-hidden="true"
            />
            <span>Backend API</span>
          </span>
          <span
            className={cn(
              "text-[11px] font-mono font-medium",
              healthState.isAvailable ? "text-status-success" : "text-status-danger"
            )}
          >
            {healthState.isLoading ? "Checking..." : healthState.isAvailable ? "Connected" : "Offline"}
          </span>
        </div>

        {healthState.data?.database && (
          <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-border-subtle/50 font-mono">
            <span className="text-text-muted">Database</span>
            <span className={healthState.data.database === "connected" ? "text-text-secondary" : "text-status-warning"}>
              {healthState.data.database}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};
