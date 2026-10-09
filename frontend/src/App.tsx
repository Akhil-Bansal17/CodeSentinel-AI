import React, { useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { OverviewPage } from "./pages/OverviewPage";
import { RepositoriesPage } from "./pages/RepositoriesPage";
import { AnalysisPage } from "./pages/AnalysisPage";
import { CodeSearchPage } from "./pages/CodeSearchPage";
import { AIAssistantPage } from "./pages/AIAssistantPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AddRepositoryModal } from "./components/repository/AddRepositoryModal";
import { useHealth } from "./hooks/useHealth";
import { NavigationTab } from "./types/navigation";
import { Repository } from "./types/api";

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavigationTab>("overview");
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const healthState = useHealth(20000);

  const handleRepositoryCreated = (newRepo: Repository) => {
    setSelectedRepoId(newRepo.id);
    setCurrentTab("repositories");
  };

  const handleViewRepository = (repo: Repository) => {
    setSelectedRepoId(repo.id);
    setCurrentTab("repositories");
  };

  const renderActivePage = () => {
    switch (currentTab) {
      case "overview":
        return (
          <OverviewPage
            healthState={healthState}
            onAnalyzeClick={() => setIsAddModalOpen(true)}
            onViewRepository={handleViewRepository}
          />
        );
      case "repositories":
        return (
          <RepositoriesPage
            onAnalyzeClick={() => setIsAddModalOpen(true)}
            selectedRepoId={selectedRepoId}
            onClearSelectedRepo={() => setSelectedRepoId(null)}
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
            onAnalyzeClick={() => setIsAddModalOpen(true)}
            onViewRepository={handleViewRepository}
          />
        );
    }
  };

  return (
    <>
      <AppShell
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setSelectedRepoId(null);
          setCurrentTab(tab);
        }}
        onAnalyzeClick={() => setIsAddModalOpen(true)}
        healthState={healthState}
      >
        {renderActivePage()}
      </AppShell>

      {/* Add Repository Modal */}
      <AddRepositoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleRepositoryCreated}
      />
    </>
  );
};

export default App;
