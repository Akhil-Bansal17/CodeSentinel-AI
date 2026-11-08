import React, { useContext, useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FolderGit2,
  GitBranch,
  GitPullRequest,
  Shield,
  ShieldCheck,
  Terminal,
  Workflow,
  X,
  XCircle,
} from "lucide-react";
import { Repository } from "../types/api";
import {
  AuditRunListItem,
  AuditRunResponse,
  PrPrepareResponse,
  WorkflowGenerateResponse,
} from "../types/cicd";
import { RemediationProposal } from "../types/remediation";
import { cicdService } from "../services/cicdService";
import { repositoryService } from "../services/repositoryService";
import { remediationService } from "../services/remediationService";
import { RepositoryContext } from "../context/RepositoryContext";
import { WorkflowGeneratorTab } from "../components/cicd/WorkflowGeneratorTab";
import { AuditDashboardTab } from "../components/cicd/AuditDashboardTab";
import { PrSynthesisTab } from "../components/cicd/PrSynthesisTab";
import { Tabs, TabItem } from "../components/common/Tabs";
import { cn } from "../lib/utils";

type ActiveSubTab = "workflow" | "audit" | "pr";

interface CiCdAuditPageProps {
  initialRepoId?: string | null;
}

export const CiCdAuditPage: React.FC<CiCdAuditPageProps> = ({ initialRepoId }) => {
  const repoContext = useContext(RepositoryContext);

  // Navigation & Repository State
  const [activeTab, setActiveTab] = useState<ActiveSubTab>("workflow");
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>(
    initialRepoId || repoContext?.selectedRepoId || ""
  );
  const [isLoadingRepos, setIsLoadingRepos] = useState<boolean>(true);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Tab 1: Workflow Generator State
  const [ecosystem, setEcosystem] = useState<"python" | "node" | "mixed" | "generic">("python");
  const [workflowName, setWorkflowName] = useState<string>("CodeSentinel Security CI");
  const [triggerBranches, setTriggerBranches] = useState<string>("main");
  const [includeLint, setIncludeLint] = useState<boolean>(true);
  const [includeTest, setIncludeTest] = useState<boolean>(true);
  const [includeTypecheck, setIncludeTypecheck] = useState<boolean>(true);
  const [includeBuild, setIncludeBuild] = useState<boolean>(false);
  const [includeSecurityAudit, setIncludeSecurityAudit] = useState<boolean>(true);
  const [includeArtifactUpload, setIncludeArtifactUpload] = useState<boolean>(true);
  const [pythonVersion, setPythonVersion] = useState<string>("3.12");
  const [nodeVersion, setNodeVersion] = useState<string>("20");
  const [isGeneratingWorkflow, setIsGeneratingWorkflow] = useState<boolean>(false);
  const [generatedWorkflow, setGeneratedWorkflow] = useState<WorkflowGenerateResponse | null>(null);

  // Tab 2: Audit Dashboard State
  const [auditRuns, setAuditRuns] = useState<AuditRunListItem[]>([]);
  const [selectedAuditRun, setSelectedAuditRun] = useState<AuditRunResponse | null>(null);
  const [isExecutingAudit, setIsExecutingAudit] = useState<boolean>(false);
  const [_isLoadingAuditDetails, setIsLoadingAuditDetails] = useState<boolean>(false);
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");

  // Tab 3: PR Preparation Console State
  const [proposals, setProposals] = useState<RemediationProposal[]>([]);
  const [selectedProposalIds, setSelectedProposalIds] = useState<string[]>([]);
  const [customPrTitle, setCustomPrTitle] = useState<string>("");
  const [isPreparingPr, setIsPreparingPr] = useState<boolean>(false);
  const [preparedPr, setPreparedPr] = useState<PrPrepareResponse | null>(null);

  // Sync with RepositoryContext
  useEffect(() => {
    if (repoContext?.selectedRepoId && repoContext.selectedRepoId !== selectedRepoId) {
      setSelectedRepoId(repoContext.selectedRepoId);
    }
  }, [repoContext?.selectedRepoId, selectedRepoId]);

  // Load repositories on mount
  useEffect(() => {
    let isMounted = true;
    async function loadRepos() {
      setIsLoadingRepos(true);
      try {
        if (repoContext?.repositories && repoContext.repositories.length > 0) {
          if (isMounted) {
            setRepositories(repoContext.repositories);
            setSelectedRepoId((prev) => prev || (repoContext.repositories ? repoContext.repositories[0].id : ""));
          }
        } else {
          const resp = await repositoryService.listRepositories(1, 100);
          if (isMounted) {
            setRepositories(resp.items || []);
            if (resp.items && resp.items.length > 0) {
              setSelectedRepoId((prev) => prev || resp.items[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load repositories:", err);
      } finally {
        if (isMounted) {
          setIsLoadingRepos(false);
        }
      }
    }
    loadRepos();
    return () => {
      isMounted = false;
    };
  }, [initialRepoId, repoContext?.repositories]);

  // Load audits and proposals when selected repository changes
  useEffect(() => {
    if (!selectedRepoId) return;
    let isMounted = true;

    // Load audit run history
    cicdService
      .listAudits(selectedRepoId)
      .then((res) => {
        if (!isMounted) return;
        setAuditRuns(res.items || []);
        if (res.items && res.items.length > 0) {
          cicdService
            .getAudit(res.items[0].id)
            .then((audit) => {
              if (isMounted) setSelectedAuditRun(audit);
            })
            .catch(() => {
              if (isMounted) setSelectedAuditRun(null);
            });
        } else {
          setSelectedAuditRun(null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAuditRuns([]);
          setSelectedAuditRun(null);
        }
      });

    // Load remediation proposals
    remediationService
      .listProposals({ repositoryId: selectedRepoId })
      .then((res) => {
        if (!isMounted) return;
        setProposals(res.items || []);
        // Pre-select validated or approved proposals
        const eligible = (res.items || [])
          .filter((p) => ["VALIDATED", "APPROVED"].includes(p.status))
          .map((p) => p.id);
        setSelectedProposalIds(eligible);
      })
      .catch(() => {
        if (isMounted) {
          setProposals([]);
          setSelectedProposalIds([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedRepoId]);

  // Auto-dismiss notification
  useEffect(() => {
    if (feedbackMessage) {
      const timer = setTimeout(() => setFeedbackMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedbackMessage]);

  const showFeedback = (type: "success" | "error" | "info", text: string) => {
    setFeedbackMessage({ type, text });
  };

  const activeRepo = repositories.find((r) => r.id === selectedRepoId) || repoContext?.selectedRepo;

  // =========================================================================
  // Workflow Generator Actions
  // =========================================================================
  const handleGenerateWorkflow = async () => {
    if (!selectedRepoId) {
      showFeedback("error", "Please select a repository first.");
      return;
    }
    setIsGeneratingWorkflow(true);
    try {
      const branches = triggerBranches.split(",").map((b) => b.trim()).filter(Boolean);
      const resp = await cicdService.generateWorkflow({
        repository_id: selectedRepoId,
        ecosystem,
        workflow_name: workflowName,
        trigger_branches: branches,
        include_lint: includeLint,
        include_test: includeTest,
        include_typecheck: includeTypecheck,
        include_build: includeBuild,
        include_security_audit: includeSecurityAudit,
        include_artifact_upload: includeArtifactUpload,
        python_version: pythonVersion,
        node_version: nodeVersion,
      });
      setGeneratedWorkflow(resp);
      showFeedback("success", `Workflow generated (${resp.filename}) with pinned commit SHAs!`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate workflow.";
      showFeedback("error", message);
    } finally {
      setIsGeneratingWorkflow(false);
    }
  };

  const handleCopyWorkflow = () => {
    if (!generatedWorkflow) return;
    navigator.clipboard.writeText(generatedWorkflow.yaml_content);
    showFeedback("success", "Workflow YAML copied to clipboard!");
  };

  const handleDownloadWorkflow = () => {
    if (!generatedWorkflow) return;
    const blob = new Blob([generatedWorkflow.yaml_content], { type: "text/yaml;charset=utf-8" });
    if (typeof URL.createObjectURL === "function") {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "codesentinel-ci.yml";
      link.click();
      if (typeof URL.revokeObjectURL === "function") {
        URL.revokeObjectURL(url);
      }
    }
    showFeedback("info", "Downloaded codesentinel-ci.yml");
  };

  // =========================================================================
  // Audit Runner Actions
  // =========================================================================
  const handleExecuteAudit = async () => {
    if (!selectedRepoId) {
      showFeedback("error", "Please select a repository first.");
      return;
    }
    setIsExecutingAudit(true);
    try {
      const result = await cicdService.executeAudit(selectedRepoId);
      setSelectedAuditRun(result);
      const listRes = await cicdService.listAudits(selectedRepoId);
      setAuditRuns(listRes.items || []);
      showFeedback(
        "success",
        `Audit completed: ${result.overall_status} (${result.summary.total_checks} pillars evaluated)`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to execute audit.";
      showFeedback("error", message);
    } finally {
      setIsExecutingAudit(false);
    }
  };

  const handleSelectAuditRun = async (auditId: string) => {
    setIsLoadingAuditDetails(true);
    try {
      const data = await cicdService.getAudit(auditId);
      setSelectedAuditRun(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load audit run.";
      showFeedback("error", message);
    } finally {
      setIsLoadingAuditDetails(false);
    }
  };

  const handleDownloadSarif = () => {
    if (!selectedAuditRun) return;
    const blob = new Blob([JSON.stringify(selectedAuditRun.sarif_json, null, 2)], {
      type: "application/json",
    });
    if (typeof URL.createObjectURL === "function") {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `codesentinel-audit-${selectedAuditRun.id.slice(0, 8)}.sarif`;
      link.click();
      if (typeof URL.revokeObjectURL === "function") {
        URL.revokeObjectURL(url);
      }
    }
    showFeedback("info", "Downloaded SARIF 2.1.0 standard report.");
  };

  const handleDownloadMarkdown = async () => {
    if (!selectedAuditRun) return;
    try {
      const md = await cicdService.getMarkdownReport(selectedAuditRun.id);
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      if (typeof URL.createObjectURL === "function") {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `codesentinel-audit-${selectedAuditRun.id.slice(0, 8)}.md`;
        link.click();
        if (typeof URL.revokeObjectURL === "function") {
          URL.revokeObjectURL(url);
        }
      }
      showFeedback("info", "Downloaded Markdown audit report.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to download Markdown report.";
      showFeedback("error", message);
    }
  };

  // =========================================================================
  // PR Synthesizer Actions
  // =========================================================================
  const toggleProposalSelection = (id: string) => {
    setSelectedProposalIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handlePreparePr = async () => {
    if (!selectedRepoId) {
      showFeedback("error", "Please select a repository first.");
      return;
    }
    if (selectedProposalIds.length === 0) {
      showFeedback("error", "Select at least one proposal to prepare a pull request.");
      return;
    }
    setIsPreparingPr(true);
    try {
      const result = await cicdService.preparePr({
        repository_id: selectedRepoId,
        proposal_ids: selectedProposalIds,
        custom_title: customPrTitle.trim() || undefined,
      });
      setPreparedPr(result);
      if (result.has_conflicts) {
        showFeedback(
          "error",
          "Conflicts detected between proposals. Review conflict details below."
        );
      } else {
        showFeedback(
          "success",
          `PR change set synthesized successfully: ${result.proposal_count} patches composed.`
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to prepare PR.";
      showFeedback("error", message);
    } finally {
      setIsPreparingPr(false);
    }
  };

  const handleDownloadPatch = async () => {
    if (!preparedPr) return;
    try {
      const patch = await cicdService.getPatchBundle(preparedPr.id);
      const blob = new Blob([patch], { type: "text/x-patch;charset=utf-8" });
      if (typeof URL.createObjectURL === "function") {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `codesentinel-remediation-${preparedPr.id.slice(0, 8)}.patch`;
        link.click();
        if (typeof URL.revokeObjectURL === "function") {
          URL.revokeObjectURL(url);
        }
      }
      showFeedback("info", "Downloaded .patch bundle.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to download patch bundle.";
      showFeedback("error", message);
    }
  };

  const handleCopyPrDescription = () => {
    if (!preparedPr) return;
    navigator.clipboard.writeText(preparedPr.description);
    showFeedback("success", "PR markdown description copied!");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PASSED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Passed
          </span>
        );
      case "WARNING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Warning
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 font-mono">
            <XCircle className="w-3.5 h-3.5 text-rose-400" /> Failed
          </span>
        );
      case "SKIPPED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-elevated text-text-muted border border-border-default font-mono">
            Skipped
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-elevated text-text-muted border border-border-default font-mono">
            {status}
          </span>
        );
    }
  };

  const subTabs: TabItem[] = [
    {
      id: "workflow",
      label: "CI/CD Workflow Generator",
      icon: <Terminal className="w-4 h-4" />,
    },
    {
      id: "audit",
      label: "Codebase Audit Dashboard",
      icon: <ShieldCheck className="w-4 h-4" />,
      badge: selectedAuditRun ? selectedAuditRun.overall_status : undefined,
    },
    {
      id: "pr",
      label: "Pull Request Synthesis Console",
      icon: <GitPullRequest className="w-4 h-4" />,
      badge: proposals.length > 0 ? proposals.length : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Console Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-default pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-accent-subtle text-accent border border-accent-border font-semibold">
              Pipeline Automation & Governance
            </span>
            <span className="text-xs text-text-muted">• Security CI/CD Console</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent-subtle border border-accent-border text-accent shrink-0 shadow-xs">
              <Workflow className="w-4.5 h-4.5" />
            </div>
            CI/CD Automation, Security Audits & PR Synthesis
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1.5 max-w-3xl leading-relaxed">
            Generate hardened GitHub Actions workflows, execute 6-pillar codebase audits, and safely synthesize reviewable PR patches.
          </p>
        </div>

        {/* Repository Selector (Toolbar context) */}
        {!initialRepoId && (
          <div className="flex items-center gap-2.5 bg-surface-card border border-border-default rounded-lg px-3 py-2 shadow-xs shrink-0">
            <label htmlFor="cicd-repo-selector" className="text-xs text-text-muted font-medium whitespace-nowrap flex items-center gap-1.5">
              <FolderGit2 className="w-3.5 h-3.5 text-accent" />
              Repository:
            </label>
            <select
              id="cicd-repo-selector"
              value={selectedRepoId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedRepoId(newId);
                repoContext?.setSelectedRepoId(newId);
              }}
              disabled={isLoadingRepos}
              className="bg-surface-elevated border border-border-default text-text-primary text-xs rounded-md px-2.5 py-1.5 focus:ring-1 focus:ring-accent focus:outline-hidden min-w-[190px] font-medium"
            >
              {repositories.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.source_type})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Active Repository Provenance Strip */}
      {activeRepo && (
        <div className="flex items-center gap-4 px-3.5 py-2.5 rounded-lg bg-surface-card border border-border-default text-xs text-text-secondary flex-wrap shadow-xs">
          <div className="flex items-center gap-1.5 text-text-primary font-medium">
            <FolderGit2 className="w-3.5 h-3.5 text-accent" />
            <span className="font-semibold">{activeRepo.name}</span>
          </div>
          {activeRepo.default_branch && (
            <div className="flex items-center gap-1 text-text-muted">
              <GitBranch className="w-3.5 h-3.5" />
              <span className="font-mono text-text-secondary">{activeRepo.default_branch}</span>
            </div>
          )}
          <div className="text-text-muted">
            Source: <span className="text-text-secondary capitalize font-mono">{activeRepo.source_type}</span>
          </div>
          {activeRepo.latest_snapshot && (
            <div className="text-text-muted font-mono">
              Files: <span className="text-text-primary">{activeRepo.latest_snapshot.file_count ?? "—"}</span> (
              <span className="text-text-primary">{activeRepo.latest_snapshot.total_lines_of_code ?? "—"}</span> LOC)
            </div>
          )}
        </div>
      )}

      {/* High-Precision Feedback Toast / Banner */}
      {feedbackMessage && (
        <div
          className={cn(
            "p-3 rounded-lg border text-xs sm:text-sm flex items-center justify-between gap-3 shadow-xs transition-all",
            feedbackMessage.type === "success" &&
              "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
            feedbackMessage.type === "error" &&
              "bg-rose-500/10 border-rose-500/30 text-rose-300",
            feedbackMessage.type === "info" &&
              "bg-accent-subtle border-accent-border text-accent"
          )}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMessage.type === "success" && (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            )}
            {feedbackMessage.type === "error" && (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            {feedbackMessage.type === "info" && (
              <Shield className="w-4 h-4 shrink-0 text-accent" />
            )}
            <span className="font-medium">{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-text-muted hover:text-text-primary p-0.5 rounded transition-colors"
            aria-label="Dismiss feedback"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sub-Tab Navigation */}
      <Tabs
        tabs={subTabs}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as ActiveSubTab)}
        variant="underline"
        size="md"
        buttonRole="button"
      />

      {/* Tab 1: Workflow Generator */}
      {activeTab === "workflow" && (
        <WorkflowGeneratorTab
          ecosystem={ecosystem}
          setEcosystem={setEcosystem}
          workflowName={workflowName}
          setWorkflowName={setWorkflowName}
          triggerBranches={triggerBranches}
          setTriggerBranches={setTriggerBranches}
          includeLint={includeLint}
          setIncludeLint={setIncludeLint}
          includeTest={includeTest}
          setIncludeTest={setIncludeTest}
          includeTypecheck={includeTypecheck}
          setIncludeTypecheck={setIncludeTypecheck}
          includeBuild={includeBuild}
          setIncludeBuild={setIncludeBuild}
          includeSecurityAudit={includeSecurityAudit}
          setIncludeSecurityAudit={setIncludeSecurityAudit}
          includeArtifactUpload={includeArtifactUpload}
          setIncludeArtifactUpload={setIncludeArtifactUpload}
          pythonVersion={pythonVersion}
          setPythonVersion={setPythonVersion}
          nodeVersion={nodeVersion}
          setNodeVersion={setNodeVersion}
          isGeneratingWorkflow={isGeneratingWorkflow}
          onGenerateWorkflow={handleGenerateWorkflow}
          generatedWorkflow={generatedWorkflow}
          onCopyWorkflow={handleCopyWorkflow}
          onDownloadWorkflow={handleDownloadWorkflow}
        />
      )}

      {/* Tab 2: Audit Dashboard */}
      {activeTab === "audit" && (
        <AuditDashboardTab
          auditRuns={auditRuns}
          selectedAuditRun={selectedAuditRun}
          isExecutingAudit={isExecutingAudit}
          onExecuteAudit={handleExecuteAudit}
          onSelectAuditRun={handleSelectAuditRun}
          onDownloadSarif={handleDownloadSarif}
          onDownloadMarkdown={handleDownloadMarkdown}
          severityFilter={severityFilter}
          setSeverityFilter={setSeverityFilter}
          getStatusBadge={getStatusBadge}
        />
      )}

      {/* Tab 3: Pull Request Synthesis */}
      {activeTab === "pr" && (
        <PrSynthesisTab
          proposals={proposals}
          selectedProposalIds={selectedProposalIds}
          toggleProposalSelection={toggleProposalSelection}
          customPrTitle={customPrTitle}
          setCustomPrTitle={setCustomPrTitle}
          isPreparingPr={isPreparingPr}
          onPreparePr={handlePreparePr}
          preparedPr={preparedPr}
          onCopyPrDescription={handleCopyPrDescription}
          onDownloadPatch={handleDownloadPatch}
        />
      )}
    </div>
  );
};
