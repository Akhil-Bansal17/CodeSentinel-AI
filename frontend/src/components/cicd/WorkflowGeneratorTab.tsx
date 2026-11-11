import React, { useState } from "react";
import {
  Code2,
  Copy,
  Download,
  FileCode,
  RefreshCw,
  ShieldCheck,
  Workflow,
  CheckCircle2,
  Cpu,
  Layers,
  GitBranch,
  Check,
} from "lucide-react";
import { WorkflowGenerateResponse } from "../../types/cicd";
import { Button } from "../common/Button";
import { Card } from "../common/Card";
import { cn } from "../../lib/utils";

interface WorkflowGeneratorTabProps {
  ecosystem: "python" | "node" | "mixed" | "generic";
  setEcosystem: (eco: "python" | "node" | "mixed" | "generic") => void;
  workflowName: string;
  setWorkflowName: (name: string) => void;
  triggerBranches: string;
  setTriggerBranches: (branches: string) => void;
  includeLint: boolean;
  setIncludeLint: (v: boolean) => void;
  includeTest: boolean;
  setIncludeTest: (v: boolean) => void;
  includeTypecheck: boolean;
  setIncludeTypecheck: (v: boolean) => void;
  includeBuild: boolean;
  setIncludeBuild: (v: boolean) => void;
  includeSecurityAudit: boolean;
  setIncludeSecurityAudit: (v: boolean) => void;
  includeArtifactUpload: boolean;
  setIncludeArtifactUpload: (v: boolean) => void;
  pythonVersion: string;
  setPythonVersion: (v: string) => void;
  nodeVersion: string;
  setNodeVersion: (v: string) => void;
  isGeneratingWorkflow: boolean;
  onGenerateWorkflow: () => void;
  generatedWorkflow: WorkflowGenerateResponse | null;
  onCopyWorkflow: () => void;
  onDownloadWorkflow: () => void;
}

export const WorkflowGeneratorTab: React.FC<WorkflowGeneratorTabProps> = ({
  ecosystem,
  setEcosystem,
  workflowName,
  setWorkflowName,
  triggerBranches,
  setTriggerBranches,
  includeLint,
  setIncludeLint,
  includeTest,
  setIncludeTest,
  includeTypecheck,
  setIncludeTypecheck,
  includeBuild,
  setIncludeBuild,
  includeSecurityAudit,
  setIncludeSecurityAudit,
  includeArtifactUpload,
  setIncludeArtifactUpload,
  pythonVersion,
  setPythonVersion,
  nodeVersion,
  setNodeVersion,
  isGeneratingWorkflow,
  onGenerateWorkflow,
  generatedWorkflow,
  onCopyWorkflow,
  onDownloadWorkflow,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    onCopyWorkflow();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Configuration Controls Column */}
      <div className="lg:col-span-5 space-y-4">
        <Card padding="md" className="bg-surface-card border-border-default space-y-4 shadow-xs">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-primary flex items-center gap-2">
              <Code2 className="w-4 h-4 text-accent" />
              Workflow Configuration
            </h2>
            <p className="text-xs text-text-muted mt-1">
              Configure parameters to synthesize an immutable, least-privilege CI workflow.
            </p>
          </div>

          {/* Section 1: Ecosystem & Target */}
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text-muted">
                Runtime Ecosystem
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["python", "node", "mixed", "generic"] as const).map((eco) => (
                  <button
                    key={eco}
                    type="button"
                    onClick={() => setEcosystem(eco)}
                    className={cn(
                      "px-3 py-2 text-xs font-medium rounded-md border text-left capitalize transition-all select-none cursor-pointer flex items-center justify-between",
                      ecosystem === eco
                        ? "bg-accent-subtle border-accent text-accent font-semibold shadow-xs"
                        : "bg-surface-elevated border-border-default text-text-secondary hover:border-border-strong hover:text-text-primary"
                    )}
                  >
                    <span>{eco === "mixed" ? "Mixed (Python & Node)" : eco}</span>
                    {ecosystem === eco && (
                      <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Workflow Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text-muted">
                Workflow Name
              </label>
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="w-full bg-surface-elevated border border-border-default text-text-primary text-xs rounded-md px-3 py-2 focus:ring-1 focus:ring-accent focus:border-accent focus:outline-hidden font-medium"
              />
            </div>

            {/* Trigger Branches */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text-muted flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-text-muted" />
                Trigger Branches (comma-separated)
              </label>
              <input
                type="text"
                value={triggerBranches}
                onChange={(e) => setTriggerBranches(e.target.value)}
                placeholder="main, release"
                className="w-full bg-surface-elevated border border-border-default text-text-primary text-xs rounded-md px-3 py-2 focus:ring-1 focus:ring-accent focus:border-accent focus:outline-hidden font-mono text-xs"
              />
            </div>
          </div>

          {/* Section 2: Included Pipeline Stages */}
          <div className="pt-3 border-t border-border-default space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-text-primary">
                Included Pipeline Stages
              </label>
              <span className="text-[10px] text-text-muted uppercase font-mono">Select verification steps</span>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2.5 p-2 rounded-md bg-surface-elevated/60 border border-border-subtle hover:border-border-default text-xs text-text-secondary cursor-pointer hover:text-text-primary transition-all">
                <input
                  type="checkbox"
                  checked={includeLint}
                  onChange={(e) => setIncludeLint(e.target.checked)}
                  className="rounded border-border-strong bg-surface-base text-accent focus:ring-accent shrink-0 cursor-pointer"
                />
                <span className="font-medium">Automated Static Linting (flake8/ruff/eslint)</span>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-md bg-surface-elevated/60 border border-border-subtle hover:border-border-default text-xs text-text-secondary cursor-pointer hover:text-text-primary transition-all">
                <input
                  type="checkbox"
                  checked={includeTest}
                  onChange={(e) => setIncludeTest(e.target.checked)}
                  className="rounded border-border-strong bg-surface-base text-accent focus:ring-accent shrink-0 cursor-pointer"
                />
                <span className="font-medium">Unit & Integration Test Execution (pytest/npm test)</span>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-md bg-surface-elevated/60 border border-border-subtle hover:border-border-default text-xs text-text-secondary cursor-pointer hover:text-text-primary transition-all">
                <input
                  type="checkbox"
                  checked={includeTypecheck}
                  onChange={(e) => setIncludeTypecheck(e.target.checked)}
                  className="rounded border-border-strong bg-surface-base text-accent focus:ring-accent shrink-0 cursor-pointer"
                />
                <span className="font-medium">Type Checking (mypy/tsc)</span>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-md bg-surface-elevated/60 border border-border-subtle hover:border-border-default text-xs text-text-secondary cursor-pointer hover:text-text-primary transition-all">
                <input
                  type="checkbox"
                  checked={includeBuild}
                  onChange={(e) => setIncludeBuild(e.target.checked)}
                  className="rounded border-border-strong bg-surface-base text-accent focus:ring-accent shrink-0 cursor-pointer"
                />
                <span className="font-medium">Production Build Step (npm run build)</span>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-md bg-surface-elevated/60 border border-border-subtle hover:border-border-default text-xs text-text-secondary cursor-pointer hover:text-text-primary transition-all">
                <input
                  type="checkbox"
                  checked={includeSecurityAudit}
                  onChange={(e) => setIncludeSecurityAudit(e.target.checked)}
                  className="rounded border-border-strong bg-surface-base text-accent focus:ring-accent shrink-0 cursor-pointer"
                />
                <span className="font-medium text-text-primary">CodeSentinel AI 6-Pillar Security Audit</span>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-md bg-surface-elevated/60 border border-border-subtle hover:border-border-default text-xs text-text-secondary cursor-pointer hover:text-text-primary transition-all">
                <input
                  type="checkbox"
                  checked={includeArtifactUpload}
                  onChange={(e) => setIncludeArtifactUpload(e.target.checked)}
                  className="rounded border-border-strong bg-surface-base text-accent focus:ring-accent shrink-0 cursor-pointer"
                />
                <span className="font-medium">Export Report Artifacts (SARIF & Markdown)</span>
              </label>
            </div>
          </div>

          {/* Section 3: Runtime Version Controls */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border-default">
            {ecosystem !== "node" && (
              <div className="space-y-1">
                <label className="block text-xs font-medium text-text-muted flex items-center gap-1.5">
                  <Cpu className="w-3 h-3 text-accent" />
                  Python Version
                </label>
                <input
                  type="text"
                  value={pythonVersion}
                  onChange={(e) => setPythonVersion(e.target.value)}
                  className="w-full bg-surface-elevated border border-border-default text-text-primary text-xs rounded-md px-2.5 py-1.5 focus:ring-1 focus:ring-accent focus:outline-hidden font-mono"
                />
              </div>
            )}
            {ecosystem !== "python" && (
              <div className="space-y-1">
                <label className="block text-xs font-medium text-text-muted flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-accent" />
                  Node Version
                </label>
                <input
                  type="text"
                  value={nodeVersion}
                  onChange={(e) => setNodeVersion(e.target.value)}
                  className="w-full bg-surface-elevated border border-border-default text-text-primary text-xs rounded-md px-2.5 py-1.5 focus:ring-1 focus:ring-accent focus:outline-hidden font-mono"
                />
              </div>
            )}
          </div>

          {/* Generate Button */}
          <Button
            variant="primary"
            size="md"
            onClick={onGenerateWorkflow}
            disabled={isGeneratingWorkflow}
            isLoading={isGeneratingWorkflow}
            leftIcon={
              isGeneratingWorkflow ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Workflow className="w-4 h-4" />
              )
            }
            className="w-full mt-3 text-xs font-semibold justify-center shadow-sm cursor-pointer"
          >
            {isGeneratingWorkflow
              ? "Synthesizing Secure Workflow..."
              : "Generate Hardened Workflow"}
          </Button>
        </Card>

        {/* Hardened Security Standards Card */}
        <Card padding="md" className="bg-surface-card border-border-default text-xs text-text-secondary space-y-2.5 shadow-xs">
          <h3 className="font-semibold text-text-primary flex items-center gap-1.5 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Hardened Security Standard
          </h3>
          <ul className="space-y-2 text-text-secondary">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>Actions pinned to immutable full commit SHAs</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Least-privilege permission default:{" "}
                <code className="text-accent font-mono bg-surface-elevated px-1 py-0.5 rounded border border-border-default">
                  contents: read
                </code>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>Fork PR containment (no privileged write tokens)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>Shell parameter sanitization to block command injection</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>Strict job timeout (15 min) and concurrency cancellation</span>
            </li>
          </ul>
        </Card>
      </div>

      {/* YAML Preview Column */}
      <div className="lg:col-span-7">
        <Card padding="md" className="bg-surface-card border-border-default flex flex-col h-full min-h-[560px] shadow-xs">
          <div className="flex items-center justify-between border-b border-border-default pb-3 mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded bg-surface-elevated border border-border-default text-accent shrink-0">
                <FileCode className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-mono text-text-primary font-medium tracking-tight">
                {generatedWorkflow
                  ? generatedWorkflow.filename
                  : ".github/workflows/codesentinel-ci.yml"}
              </span>
            </div>

            {generatedWorkflow && (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopy}
                  leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  className="text-xs font-medium cursor-pointer"
                >
                  {copied ? "Copied YAML" : "Copy YAML"}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onDownloadWorkflow}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  className="text-xs font-medium cursor-pointer"
                >
                  Download
                </Button>
              </div>
            )}
          </div>

          {generatedWorkflow ? (
            <div className="flex-1 flex flex-col space-y-4">
              <pre className="flex-1 p-4 rounded-lg bg-surface-base border border-border-default text-xs font-mono text-text-secondary overflow-x-auto whitespace-pre leading-relaxed select-all max-h-[500px]">
                {generatedWorkflow.yaml_content}
              </pre>

              {/* Security Warnings / Disclosures */}
              {generatedWorkflow.security_warnings.length > 0 && (
                <div className="p-3.5 rounded-lg bg-surface-elevated border border-border-default text-xs space-y-2 shadow-xs">
                  <span className="font-semibold text-text-primary block">
                    Security Design Controls:
                  </span>
                  <div className="space-y-1.5">
                    {generatedWorkflow.security_warnings.map((w, idx) => (
                      <div key={idx} className="text-text-secondary flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                        <span className="font-mono text-[11px] leading-relaxed">{w}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-text-muted">
              <div className="w-12 h-12 rounded-xl bg-surface-elevated border border-border-default flex items-center justify-center text-text-muted opacity-50 mb-3 shadow-xs">
                <Workflow className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-text-secondary">
                No workflow synthesized yet
              </p>
              <p className="text-xs text-text-muted max-w-sm mt-1.5 leading-relaxed">
                Select your runtime ecosystem and pipeline options on the left, then click &quot;Generate Hardened Workflow&quot; to preview the YAML.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
