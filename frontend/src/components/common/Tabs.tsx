import React, { useRef, KeyboardEvent } from "react";
import { cn } from "../../lib/utils";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export type TabsVariant = "underline" | "pills" | "enclosed";
export type TabsSize = "sm" | "md";

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: TabsVariant;
  size?: TabsSize;
  ariaLabel?: string;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = "underline",
  size = "md",
  ariaLabel = "Tab Navigation",
  className,
}) => {
  const tabListRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const enabledTabs = tabs.filter((t) => !t.disabled);
    const currentIndex = enabledTabs.findIndex((t) => t.id === tabs[index].id);

    let nextIndex: number | null = null;
    if (e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % enabledTabs.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = enabledTabs.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const targetTab = enabledTabs[nextIndex];
      onChange(targetTab.id);

      // Focus the newly active tab button
      const buttons = tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])');
      if (buttons && buttons[nextIndex]) {
        buttons[nextIndex].focus();
      }
    }
  };

  const sizeStyles: Record<TabsSize, string> = {
    sm: "text-xs py-1.5 px-3 gap-1.5",
    md: "text-sm py-2 px-4 gap-2",
  };

  return (
    <div
      ref={tabListRef}
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex items-center overflow-x-auto scrollbar-none",
        variant === "underline" && "border-b border-border-default gap-1",
        variant === "pills" && "p-1 rounded-lg bg-surface-elevated border border-border-default gap-1",
        variant === "enclosed" && "border-b border-border-default gap-1",
        className
      )}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;

        let variantStyle = "";
        if (variant === "underline") {
          variantStyle = isActive
            ? "border-b-2 border-accent text-text-primary font-semibold -mb-px"
            : "border-b-2 border-transparent text-text-muted hover:text-text-secondary hover:border-border-strong";
        } else if (variant === "pills") {
          variantStyle = isActive
            ? "bg-accent text-accent-foreground font-semibold rounded-md shadow-xs"
            : "text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-md";
        } else if (variant === "enclosed") {
          variantStyle = isActive
            ? "bg-surface-card border-t border-x border-border-default rounded-t-md text-text-primary font-semibold -mb-px"
            : "text-text-muted hover:text-text-primary rounded-t-md";
        }

        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            id={`tab-${tab.id}`}
            aria-controls={`panel-${tab.id}`}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              "inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors cursor-pointer select-none",
              "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent",
              "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
              sizeStyles[size],
              variantStyle
            )}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                  isActive
                    ? variant === "pills"
                      ? "bg-white/20 text-white"
                      : "bg-accent-subtle text-accent-foreground border border-accent-border"
                    : "bg-surface-elevated text-text-muted border border-border-default"
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
