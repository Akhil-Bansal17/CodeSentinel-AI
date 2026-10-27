import React, { useState } from "react";
import {
  FolderTree,
  ShieldAlert,
  Package,
  Network,
  Activity,
  GitBranch,
} from "lucide-react";
import { Repository } from "../../types/api";
import { Tabs, TabItem } from "../common/Tabs";
import { RepositoryHeader } from "./RepositoryHeader";
import { RepositoryOverviewTab } from "./RepositoryOverviewTab";
import { RepositoryAnalysisTab } from "./RepositoryAnalysisTab";
import { DependencyView } from "../dependency/DependencyView";
import { ArchitectureView } from "../architecture/ArchitectureView";
import { CodebaseHealthDashboard } from "../architecture/CodebaseHealthDashboard";
import { CiCdAuditPage } from "../../pages/CiCdAuditPage";

export interface RepositoryDetailViewProps {
  repository: Repository;
  onBack: () => void;
  onRepositoryUpdated: (updated: Repository) => void;
  onRepositoryDeleted: (deletedId: string) => void;
}

export type RepositoryDetailTab =
  | "overview"
  | "analysis"
  | "dependencies"
  | "architecture"
  | "health"
  | "cicd";

export const RepositoryDetailView: React.FC<RepositoryDetailViewProps> = ({
  repository,
  onBack,
  onRepositoryUpdated,
  onRepositoryDeleted,
}) => {
  const [activeTab, setActiveTab] = useState<RepositoryDetailTab>("overview");

  const tabs: TabItem[] = [
    {
      id: "overview",
      label: "Files & Structure",
      icon: <FolderTree className="w-3.5 h-3.5" />,
    },
    {
      id: "analysis",
      label: "Static Analysis",
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
    },
    {
      id: "dependencies",
      label: "Dependencies & SCA",
      icon: <Package className="w-3.5 h-3.5" />,
    },
    {
      id: "architecture",
      label: "Architecture & Coupling",
      icon: <Network className="w-3.5 h-3.5" />,
    },
    {
      id: "health",
      label: "Codebase Health",
      icon: <Activity className="w-3.5 h-3.5" />,
    },
    {
      id: "cicd",
      label: "CI/CD & Audits",
      icon: <GitBranch className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Contextual Controls */}
      <RepositoryHeader
        repository={repository}
        onBack={onBack}
        onRepositoryUpdated={onRepositoryUpdated}
        onRepositoryDeleted={onRepositoryDeleted}
      />

      {/* Subnavigation Bar */}
      <div className="border-b border-border-default">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={(tabId) => setActiveTab(tabId as RepositoryDetailTab)}
          variant="underline"
          size="sm"
          buttonRole="button"
          ariaLabel="Repository Subviews Navigation"
        />
      </div>

      {/* Active Subview Content Container */}
      <div className="pt-1">
        {activeTab === "overview" && (
          <RepositoryOverviewTab
            repository={repository}
            snapshot={repository.latest_snapshot}
          />
        )}

        {activeTab === "analysis" && (
          <RepositoryAnalysisTab
            repository={repository}
            snapshot={repository.latest_snapshot}
          />
        )}

        {activeTab === "dependencies" && (
          <DependencyView repository={repository} />
        )}

        {activeTab === "architecture" && (
          <ArchitectureView repository={repository} />
        )}

        {activeTab === "health" && (
          <CodebaseHealthDashboard repository={repository} />
        )}

        {activeTab === "cicd" && (
          <CiCdAuditPage initialRepoId={repository.id} />
        )}
      </div>
    </div>
  );
};
