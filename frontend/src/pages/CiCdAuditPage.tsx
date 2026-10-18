import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Code2,
  Copy,
  Download,
  FileCheck2,
  FileCode,
  FolderGit2,
  GitPullRequest,
  Layers,
  Play,
  RefreshCw,
  Shield,
  ShieldCheck,
  Terminal,
  Workflow,
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
import { cn, formatDate } from "../lib/utils";

type ActiveSubTab = "workflow" | "audit" | "pr";

interface CiCdAuditPageProps {
  initialRepoId?: string | null;
}

export const CiCdAuditPage: React.FC<CiCdAuditPageProps> = ({ initialRepoId }) => {
  // Navigation & Repository State
  const [activeTab, setActiveTab] = useState<ActiveSubTab>("workflow");
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>(initialRepoId || "");
  const [isLoadingRepos, setIsLoadingRepos] = useState<boolean>(true);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

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

  // Load repositories on mount
  useEffect(() => {
    async function loadRepos() {
      setIsLoadingRepos(true);
      try {
        const resp = await repositoryService.listRepositories(1, 100);
        setRepositories(resp.items || []);
        if (!selectedRepoId && resp.items?.length > 0) {
          setSelectedRepoId(resp.items[0].id);
        }
      } catch (err) {
        console.error("Failed to load repositories:", err);
      } finally {
        setIsLoadingRepos(false);
      }
    }
    loadRepos();
  }, [initialRepoId]);

  // Load audits and proposals when selected repository changes
  useEffect(() => {
    if (!selectedRepoId) return;

    // Load audit run history
    cicdService.listAudits(selectedRepoId).then((res) => {
      setAuditRuns(res.items || []);
      if (res.items?.length > 0) {
        cicdService.getAudit(res.items[0].id).then(setSelectedAuditRun).catch(console.error);
      } else {
        setSelectedAuditRun(null);
      }
    }).catch(console.error);

    // Load remediation proposals
    remediationService.listProposals({ repositoryId: selectedRepoId }).then((res) => {
      setProposals(res.items || []);
      // Pre-select validated or approved proposals
      const eligible = (res.items || [])
        .filter((p) => ["VALIDATED", "APPROVED"].includes(p.status))
        .map((p) => p.id);
      setSelectedProposalIds(eligible);
    }).catch(console.error);
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
    } catch (err: any) {
      showFeedback("error", err?.message || "Failed to generate workflow.");
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
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "codesentinel-ci.yml";
    link.click();
    URL.revokeObjectURL(url);
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
      // Refresh list
      const listRes = await cicdService.listAudits(selectedRepoId);
      setAuditRuns(listRes.items || []);
      showFeedback("success", `Audit completed: ${result.overall_status} (${result.summary.total_checks} pillars evaluated)`);
    } catch (err: any) {
      showFeedback("error", err?.message || "Failed to execute audit.");
    } finally {
      setIsExecutingAudit(false);
    }
  };

  const handleSelectAuditRun = async (auditId: string) => {
    setIsLoadingAuditDetails(true);
    try {
      const data = await cicdService.getAudit(auditId);
      setSelectedAuditRun(data);
    } catch (err: any) {
      showFeedback("error", err?.message || "Failed to load audit run.");
    } finally {
      setIsLoadingAuditDetails(false);
    }
  };

  const handleDownloadSarif = () => {
    if (!selectedAuditRun) return;
    const blob = new Blob([JSON.stringify(selectedAuditRun.sarif_json, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `codesentinel-audit-${selectedAuditRun.id.slice(0, 8)}.sarif`;
    link.click();
    URL.revokeObjectURL(url);
    showFeedback("info", "Downloaded SARIF 2.1.0 standard report.");
  };

  const handleDownloadMarkdown = async () => {
    if (!selectedAuditRun) return;
    try {
      const md = await cicdService.getMarkdownReport(selectedAuditRun.id);
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `codesentinel-audit-${selectedAuditRun.id.slice(0, 8)}.md`;
      link.click();
      URL.revokeObjectURL(url);
      showFeedback("info", "Downloaded Markdown audit report.");
    } catch (err: any) {
      showFeedback("error", err?.message || "Failed to download Markdown report.");
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
        showFeedback("error", "Conflicts detected between proposals. Review conflict details below.");
      } else {
        showFeedback("success", `PR change set synthesized successfully: ${result.proposal_count} patches composed.`);
      }
    } catch (err: any) {
      showFeedback("error", err?.message || "Failed to prepare PR.");
    } finally {
      setIsPreparingPr(false);
    }
  };

  const handleDownloadPatch = async () => {
    if (!preparedPr) return;
    try {
      const patch = await cicdService.getPatchBundle(preparedPr.id);
      const blob = new Blob([patch], { type: "text/x-patch;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `codesentinel-remediation-${preparedPr.id.slice(0, 8)}.patch`;
      link.click();
      URL.revokeObjectURL(url);
      showFeedback("info", "Downloaded .patch bundle.");
    } catch (err: any) {
      showFeedback("error", err?.message || "Failed to download patch bundle.");
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
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800"><CheckCircle2 className="w-3 h-3" /> Passed</span>;
      case "WARNING":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-800"><AlertTriangle className="w-3 h-3" /> Warning</span>;
      case "FAILED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-400 border border-rose-800"><XCircle className="w-3 h-3" /> Failed</span>;
      case "SKIPPED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">Skipped</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded">
              Phase 8
            </span>
            <span className="text-xs text-slate-400">Automated Pipeline & Governance</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <Workflow className="w-6 h-6 text-indigo-400" />
            CI/CD Automation, Security Audits & PR Synthesis
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Generate hardened GitHub Actions workflows, execute 6-pillar codebase audits, and safely synthesize reviewable PR patches.
          </p>
        </div>

        {/* Repository Selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400 font-medium whitespace-nowrap flex items-center gap-1.5">
            <FolderGit2 className="w-3.5 h-3.5 text-slate-400" />
            Active Repository:
          </label>
          <select
            value={selectedRepoId}
            onChange={(e) => setSelectedRepoId(e.target.value)}
            disabled={isLoadingRepos}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none min-w-[220px]"
          >
            {repositories.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.source_type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Toast Feedback */}
      {feedbackMessage && (
        <div
          className={cn(
            "p-3 rounded-lg border text-sm flex items-center gap-2.5 shadow-lg transition-all",
            feedbackMessage.type === "success" && "bg-emerald-950/80 border-emerald-800 text-emerald-300",
            feedbackMessage.type === "error" && "bg-rose-950/80 border-rose-800 text-rose-300",
            feedbackMessage.type === "info" && "bg-indigo-950/80 border-indigo-800 text-indigo-300"
          )}
        >
          {feedbackMessage.type === "success" && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
          {feedbackMessage.type === "error" && <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
          {feedbackMessage.type === "info" && <Shield className="w-4 h-4 shrink-0 text-indigo-400" />}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Sub-Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("workflow")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2",
            activeTab === "workflow"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
          )}
        >
          <Terminal className="w-4 h-4" />
          CI/CD Workflow Generator
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2",
            activeTab === "audit"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
          )}
        >
          <ShieldCheck className="w-4 h-4" />
          Codebase Audit Dashboard
          {selectedAuditRun && (
            <span className={cn(
              "ml-1.5 px-2 py-0.2 rounded-full text-[10px] font-bold uppercase",
              selectedAuditRun.overall_status === "PASSED" && "bg-emerald-950 text-emerald-400 border border-emerald-800",
              selectedAuditRun.overall_status === "WARNING" && "bg-amber-950 text-amber-400 border border-amber-800",
              selectedAuditRun.overall_status === "FAILED" && "bg-rose-950 text-rose-400 border border-rose-800"
            )}>
              {selectedAuditRun.overall_status}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("pr")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2",
            activeTab === "pr"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
          )}
        >
          <GitPullRequest className="w-4 h-4" />
          Pull Request Synthesis Console
          {proposals.length > 0 && (
            <span className="ml-1.5 px-2 py-0.2 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
              {proposals.length}
            </span>
          )}
        </button>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: WORKFLOW GENERATOR                                           */}
      {/* =================================================================== */}
      {activeTab === "workflow" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-5">
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                Workflow Configuration
              </h2>

              {/* Ecosystem Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Runtime Ecosystem</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["python", "node", "mixed", "generic"] as const).map((eco) => (
                    <button
                      key={eco}
                      type="button"
                      onClick={() => setEcosystem(eco)}
                      className={cn(
                        "px-3 py-2 text-xs font-medium rounded-lg border text-left capitalize transition-all",
                        ecosystem === eco
                          ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      )}
                    >
                      {eco === "mixed" ? "Mixed (Python & Node)" : eco}
                    </button>
                  ))}
                </div>
              </div>

              {/* Workflow Name */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Workflow Name</label>
                <input
                  type="text"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Branches */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Trigger Branches (comma-separated)</label>
                <input
                  type="text"
                  value={triggerBranches}
                  onChange={(e) => setTriggerBranches(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="main, release"
                />
              </div>

              {/* Features Toggles */}
              <div className="pt-2 border-t border-slate-800 space-y-2.5">
                <label className="block text-xs font-medium text-slate-300">Included Pipeline Stages</label>

                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeLint}
                    onChange={(e) => setIncludeLint(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Automated Static Linting (flake8/ruff/eslint)</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTest}
                    onChange={(e) => setIncludeTest(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Unit & Integration Test Execution (pytest/npm test)</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTypecheck}
                    onChange={(e) => setIncludeTypecheck(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Type Checking (mypy/tsc)</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeBuild}
                    onChange={(e) => setIncludeBuild(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Production Build Step (npm run build)</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSecurityAudit}
                    onChange={(e) => setIncludeSecurityAudit(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>CodeSentinel AI 6-Pillar Security Audit</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeArtifactUpload}
                    onChange={(e) => setIncludeArtifactUpload(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Export Report Artifacts (SARIF & Markdown)</span>
                </label>
              </div>

              {/* Version Controls */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                {ecosystem !== "node" && (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Python Version</label>
                    <input
                      type="text"
                      value={pythonVersion}
                      onChange={(e) => setPythonVersion(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                )}
                {ecosystem !== "python" && (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Node Version</label>
                    <input
                      type="text"
                      value={nodeVersion}
                      onChange={(e) => setNodeVersion(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGenerateWorkflow}
                disabled={isGeneratingWorkflow}
                className="w-full mt-3 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {isGeneratingWorkflow ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Synthesizing Secure Workflow...
                  </>
                ) : (
                  <>
                    <Workflow className="w-4 h-4" />
                    Generate Hardened Workflow
                  </>
                )}
              </button>
            </div>

            {/* Security Guarantee Box */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 space-y-2">
              <h3 className="font-semibold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Hardened Security Standard
              </h3>
              <ul className="space-y-1.5 list-disc list-inside text-slate-400">
                <li>Actions pinned to immutable full commit SHAs</li>
                <li>Least-privilege permission default: <code className="text-indigo-300">contents: read</code></li>
                <li>Fork PR containment (no privileged write tokens)</li>
                <li>Shell parameter sanitization to block command injection</li>
                <li>Strict job timeout (15 min) and concurrency cancellation</li>
              </ul>
            </div>
          </div>

          {/* YAML Preview Column */}
          <div className="lg:col-span-7">
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm flex flex-col h-full min-h-[560px]">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-mono text-slate-300">
                    {generatedWorkflow ? generatedWorkflow.filename : ".github/workflows/codesentinel-ci.yml"}
                  </span>
                </div>

                {generatedWorkflow && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyWorkflow}
                      className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 border border-slate-700 transition-all"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy YAML
                    </button>
                    <button
                      onClick={handleDownloadWorkflow}
                      className="px-2.5 py-1 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </div>
                )}
              </div>

              {generatedWorkflow ? (
                <div className="flex-1 flex flex-col space-y-4">
                  <pre className="flex-1 p-4 rounded-lg bg-slate-950 border border-slate-800/80 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre leading-relaxed select-all">
                    {generatedWorkflow.yaml_content}
                  </pre>

                  {/* Security Warnings */}
                  {generatedWorkflow.security_warnings.length > 0 && (
                    <div className="p-3 rounded-lg bg-slate-950/80 border border-indigo-900/50 text-xs space-y-1">
                      <span className="font-semibold text-indigo-300 block mb-1">Security Design Controls:</span>
                      {generatedWorkflow.security_warnings.map((w, idx) => (
                        <div key={idx} className="text-slate-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
                  <Workflow className="w-12 h-12 text-slate-700 mb-3" />
                  <p className="text-sm font-medium text-slate-400">No workflow synthesized yet</p>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    Select your runtime ecosystem and pipeline options on the left, then click "Generate Hardened Workflow" to preview the YAML.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: AUDIT DASHBOARD                                              */}
      {/* =================================================================== */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          {/* Audit Controls & Action Bar */}
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleExecuteAudit}
                disabled={isExecutingAudit}
                className="py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {isExecutingAudit ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Executing 6-Pillar Audit...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Run Codebase Audit
                  </>
                )}
              </button>

              {auditRuns.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">History:</span>
                  <select
                    value={selectedAuditRun?.id || ""}
                    onChange={(e) => handleSelectAuditRun(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
                  >
                    {auditRuns.map((a) => (
                      <option key={a.id} value={a.id}>
                        {formatDate(a.started_at)} — {a.overall_status} ({a.total_findings} findings)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {selectedAuditRun && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadSarif}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  SARIF 2.1.0 Standard
                </button>
                <button
                  onClick={handleDownloadMarkdown}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  Markdown Report
                </button>
              </div>
            )}
          </div>

          {selectedAuditRun ? (
            <div className="space-y-6">
              {/* Executive Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Overall Audit Health</span>
                  <div className="mt-2 flex items-center gap-2">
                    {getStatusBadge(selectedAuditRun.overall_status)}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Pillar Checks Evaluated</span>
                  <div className="mt-2 text-2xl font-bold text-slate-100">
                    {selectedAuditRun.summary.passed_checks} / {selectedAuditRun.summary.total_checks}
                    <span className="text-xs font-normal text-slate-400 ml-2">Passed</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Total Discovered Findings</span>
                  <div className="mt-2 text-2xl font-bold text-slate-100">
                    {selectedAuditRun.summary.total_findings}
                    <span className="text-xs font-normal text-slate-400 ml-2">
                      ({selectedAuditRun.summary.findings_by_severity?.HIGH || 0} High, {selectedAuditRun.summary.findings_by_severity?.MEDIUM || 0} Med)
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Audit Execution Duration</span>
                  <div className="mt-2 text-2xl font-bold text-slate-100 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    {selectedAuditRun.summary.total_duration_ms} ms
                  </div>
                </div>
              </div>

              {/* 6 Pillars Check Breakdown */}
              <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  6-Pillar Analysis Verification
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedAuditRun.checks.map((c) => (
                    <div
                      key={c.check_id}
                      className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between space-y-2"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-mono text-slate-400">{c.category}</span>
                          {getStatusBadge(c.status)}
                        </div>
                        <h4 className="text-xs font-semibold text-slate-200">{c.name}</h4>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{c.description}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span>{c.check_id}</span>
                        <span>{c.duration_ms} ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discovered Findings Table */}
              <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Discovered Findings & Evidence ({selectedAuditRun.findings_preview.length})
                  </h3>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Severity:</span>
                    <select
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value)}
                      className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-md px-2 py-1"
                    >
                      <option value="ALL">All Severities</option>
                      <option value="CRITICAL">Critical</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>
                </div>

                {selectedAuditRun.findings_preview.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 font-medium border-b border-slate-800">
                        <tr>
                          <th className="px-3 py-2.5">Rule ID</th>
                          <th className="px-3 py-2.5">Severity</th>
                          <th className="px-3 py-2.5">Category</th>
                          <th className="px-3 py-2.5">Target Location</th>
                          <th className="px-3 py-2.5">Evidence Summary</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                        {selectedAuditRun.findings_preview
                          .filter((f) => severityFilter === "ALL" || f.severity === severityFilter)
                          .map((f, i) => (
                            <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                              <td className="px-3 py-2 font-mono text-indigo-300 font-medium">{f.rule_id}</td>
                              <td className="px-3 py-2">
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                  f.severity === "CRITICAL" && "bg-rose-950 text-rose-400 border border-rose-800",
                                  f.severity === "HIGH" && "bg-rose-950/80 text-rose-300 border border-rose-800/60",
                                  f.severity === "MEDIUM" && "bg-amber-950/80 text-amber-300 border border-amber-800/60",
                                  f.severity === "LOW" && "bg-slate-800 text-slate-300"
                                )}>
                                  {f.severity}
                                </span>
                              </td>
                              <td className="px-3 py-2 font-mono text-slate-400">{f.category}</td>
                              <td className="px-3 py-2 font-mono text-slate-300">
                                {f.file_path}:{f.start_line}
                              </td>
                              <td className="px-3 py-2 text-slate-400 max-w-md truncate">{f.evidence_summary}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-500 bg-slate-950/40 rounded-lg">
                    Zero security or complexity findings identified in this snapshot!
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-slate-500">
              <ShieldCheck className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-400">No audit records found for this repository</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Click "Run Codebase Audit" above to launch a complete, non-destructive 6-pillar assessment across ingestion, static AST rules, SCA, AppSec, architecture, and remediation feasibility.
              </p>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: PULL REQUEST PREPARATION CONSOLE                             */}
      {/* =================================================================== */}
      {activeTab === "pr" && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <GitPullRequest className="w-4 h-4 text-indigo-400" />
                Select Validated Proposals for PR Change Set
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Choose approved or validated remediation patches. CodeSentinel AI will verify source hashes, detect overlapping line conflicts, and compose a unified diff.
              </p>
            </div>

            {/* Custom PR Title */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Custom PR Title (Optional)</label>
              <input
                type="text"
                value={customPrTitle}
                onChange={(e) => setCustomPrTitle(e.target.value)}
                placeholder="e.g. fix(security): remediate dynamic eval & restore TLS"
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Proposals Selection Table */}
            {proposals.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-medium border-b border-slate-800">
                    <tr>
                      <th className="px-3 py-2.5 w-10 text-center">Include</th>
                      <th className="px-3 py-2.5">Rule ID</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Target File</th>
                      <th className="px-3 py-2.5">Line Span</th>
                      <th className="px-3 py-2.5">Rationale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                    {proposals.map((p) => {
                      const isSelected = selectedProposalIds.includes(p.id);
                      const isEligible = ["VALIDATED", "APPROVED"].includes(p.status);
                      return (
                        <tr
                          key={p.id}
                          className={cn(
                            "hover:bg-slate-800/40 transition-colors",
                            isSelected && "bg-indigo-950/20"
                          )}
                        >
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!isEligible}
                              onChange={() => toggleProposalSelection(p.id)}
                              className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-40"
                            />
                          </td>
                          <td className="px-3 py-2 font-mono text-indigo-300 font-medium">{p.remediation_rule_id}</td>
                          <td className="px-3 py-2">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                              p.status === "APPROVED" && "bg-emerald-950 text-emerald-400 border border-emerald-800",
                              p.status === "VALIDATED" && "bg-indigo-950 text-indigo-400 border border-indigo-800",
                              p.status === "PROPOSED" && "bg-slate-800 text-slate-400"
                            )}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-300">{p.file_path}</td>
                          <td className="px-3 py-2 font-mono text-slate-400">L{p.start_line}-L{p.end_line}</td>
                          <td className="px-3 py-2 text-slate-400 max-w-sm truncate">{p.rationale}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 bg-slate-950/40 rounded-lg">
                No remediation proposals found for this repository. Run analysis or generate proposals in the Remediation tab first.
              </div>
            )}

            {/* Synthesize Button */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                {selectedProposalIds.length} proposal(s) selected for change set composition
              </span>

              <button
                type="button"
                onClick={handlePreparePr}
                disabled={isPreparingPr || selectedProposalIds.length === 0}
                className="py-2.5 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {isPreparingPr ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Checking Conflicts & Synthesizing...
                  </>
                ) : (
                  <>
                    <GitPullRequest className="w-4 h-4" />
                    Synthesize Pull Request Change Set
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Prepared Change Set Review Panel */}
          {preparedPr && (
            <div className="space-y-6">
              {/* Conflict Warning Banner if conflicts detected */}
              {preparedPr.has_conflicts ? (
                <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 space-y-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle className="w-5 h-5 text-rose-400" />
                    Overlapping Patch Conflicts Detected — Safe Refusal Enforced
                  </div>
                  <p className="text-xs text-rose-200">
                    {preparedPr.conflict_details?.message || "Selected proposals edit overlapping line spans in the same file."}
                  </p>
                  <p className="text-xs text-rose-300">
                    CodeSentinel AI refuses to silently choose a winner. Please deselect conflicting proposals or stage them sequentially.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    Change Set Verified Clean — Zero Line Overlaps or Drift
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyPrDescription}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy PR Body
                    </button>
                    <button
                      onClick={handleDownloadPatch}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download .patch Bundle
                    </button>
                  </div>
                </div>
              )}

              {/* Title & Grounded Description Preview */}
              <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Synthesized PR Title</span>
                  <span className="text-xs font-mono text-indigo-400">{preparedPr.status}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg text-sm font-semibold text-slate-100 font-mono border border-slate-800">
                  {preparedPr.title}
                </div>

                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block pt-2">Evidence-Grounded Markdown Description</span>
                <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
                  {preparedPr.description}
                </pre>
              </div>

              {/* Unified Diff Review */}
              <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-indigo-400" />
                    Combined Unified Diff Review
                  </span>
                  <span className="text-xs text-slate-500 font-mono">{preparedPr.proposal_count} Patches Applied</span>
                </div>

                <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre leading-relaxed select-all">
                  {preparedPr.combined_diff}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
