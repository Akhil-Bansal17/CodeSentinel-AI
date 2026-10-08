import React, { useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { OverviewPage } from "./pages/OverviewPage";
import { RepositoriesPage } from "./pages/RepositoriesPage";
import { AnalysisPage } from "./pages/AnalysisPage";
import { CodeSearchPage } from "./pages/CodeSearchPage";
import { AIAssistantPage } from "./pages/AIAssistantPage";
import { SettingsPage } from "./pages/SettingsPage";
import { Modal } from "./components/common/Modal";
import { useHealth } from "./hooks/useHealth";
import { NavigationTab } from "./types/navigation";
import { Info, Lock } from "lucide-react";

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavigationTab>("overview");
  const [isAnalyzeModalOpen, setIsAnalyzeModalOpen] = useState<boolean>(false);
  const healthState = useHealth(20000);

  const renderActivePage = () => {
    switch (currentTab) {
      case "overview":
        return (
          <OverviewPage
            healthState={healthState}
            onAnalyzeClick={() => setIsAnalyzeModalOpen(true)}
          />
        );
      case "repositories":
        return (
          <RepositoriesPage
            onAnalyzeClick={() => setIsAnalyzeModalOpen(true)}
          />
        );
      case "analysis":
        return <AnalysisPage />;
      case "code-search":
        return <CodeSearchPage />;
      case "ai-assistant":
        return <AIAssistantPage />;
      case "settings":
        return <SettingsPage healthState={healthState} />;
      default:
        return (
          <OverviewPage
            healthState={healthState}
            onAnalyzeClick={() => setIsAnalyzeModalOpen(true)}
          />
        );
    }
  };

  return (
    <>
      <AppShell
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onAnalyzeClick={() => setIsAnalyzeModalOpen(true)}
        healthState={healthState}
      >
        {renderActivePage()}
      </AppShell>

      {/* Analyze Repository Roadmap Modal */}
      <Modal
        isOpen={isAnalyzeModalOpen}
        onClose={() => setIsAnalyzeModalOpen(false)}
        title="Analyze Repository — Phase 1 Roadmap"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-sky-950/30 border border-sky-800/50 flex items-start gap-3">
            <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div className="text-xs text-sky-200 leading-relaxed">
              <span className="font-semibold block mb-0.5">Foundational Architecture In Place</span>
              Repository ingestion, file discovery, and deterministic AST parsing will be activated
              in Phase 1. CodeSentinel AI refuses to display simulated or fake analysis results.
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Git Repository URL
              </label>
              <div className="relative">
                <input
                  type="text"
                  disabled
                  placeholder="https://github.com/org/repository.git"
                  className="w-full px-3 py-2 rounded bg-[#0d1117] border border-[#30363d] text-xs font-mono text-slate-400 cursor-not-allowed select-none"
                />
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Default Branch
              </label>
              <input
                type="text"
                disabled
                placeholder="main"
                className="w-full px-3 py-2 rounded bg-[#0d1117] border border-[#30363d] text-xs font-mono text-slate-400 cursor-not-allowed select-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#21262d] flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAnalyzeModalOpen(false)}
              className="px-4 py-2 rounded bg-[#21262d] hover:bg-[#30363d] text-slate-200 text-xs font-medium border border-[#30363d] transition-colors cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default App;
