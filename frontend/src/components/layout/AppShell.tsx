import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { NavigationTab } from "../../types/navigation";
import { HealthState } from "../../hooks/useHealth";

export interface AppShellProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onAnalyzeClick: () => void;
  healthState: HealthState;
  onViewRepositoryDetail?: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onSelectTab,
  onAnalyzeClick,
  healthState,
  onViewRepositoryDetail,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-text-secondary font-sans">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={onSelectTab}
          healthState={healthState}
        />
      </div>

      {/* Mobile Drawer Backdrop and Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-50 flex flex-col w-72 max-w-[85vw] h-full bg-surface-card shadow-modal animate-in slide-in-from-left duration-200">
            <Sidebar
              currentTab={currentTab}
              onSelectTab={onSelectTab}
              healthState={healthState}
              onCloseMobile={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Region */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          currentTab={currentTab}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onAnalyzeClick={onAnalyzeClick}
          healthState={healthState}
          onViewRepositoryDetail={onViewRepositoryDetail}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
