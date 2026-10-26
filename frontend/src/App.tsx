import React, { useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { OverviewPage } from "./pages/OverviewPage";
import { RepositoriesPage } from "./pages/RepositoriesPage";
import { AnalysisPage } from "./pages/AnalysisPage";
import { RemediationPage } from "./pages/RemediationPage";
import { CiCdAuditPage } from "./pages/CiCdAuditPage";
import { CodeSearchPage } from "./pages/CodeSearchPage";
import { AIAssistantPage } from "./pages/AIAssistantPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AddRepositoryModal } from "./components/repository/AddRepositoryModal";
import { useHealth } from "./hooks/useHealth";
import { NavigationTab } from "./types/navigation";
import { Repository } from "./types/api";
import { RepositoryProvider, useRepositoryContext } from "./context/RepositoryContext";

const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavigationTab>("overview");
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const healthState = useHealth(20000);

  const { selectedRepoId, setSelectedRepoId, refetchRepositories } = useRepositoryContext();

  const handleRepositoryCreated = (newRepo: Repository) => {
    setSelectedRepoId(newRepo.id);
    refetchRepositories();
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
        return <AnalysisPage initialRepoId={selectedRepoId} />;
      case "remediation":
        return (
          <RemediationPage
            initialProposalId={selectedProposalId}
            onClearInitialProposal={() => setSelectedProposalId(null)}
          />
        );
      case "cicd-audit":
        return <CiCdAuditPage initialRepoId={selectedRepoId} />;
      case "code-search":
        return <CodeSearchPage initialRepoId={selectedRepoId} />;
      case "ai-assistant":
        return <AIAssistantPage initialRepoId={selectedRepoId} />;
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
          setCurrentTab(tab);
        }}
        onAnalyzeClick={() => setIsAddModalOpen(true)}
        healthState={healthState}
        onViewRepositoryDetail={() => setCurrentTab("repositories")}
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

export const App: React.FC = () => {
  return (
    <RepositoryProvider>
      <AppContent />
    </RepositoryProvider>
  );
};

export default App;
