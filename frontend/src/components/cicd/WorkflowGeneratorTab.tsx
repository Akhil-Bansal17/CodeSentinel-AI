import React from "react";
import {
  Code2,
  Copy,
  Download,
  FileCode,
  RefreshCw,
  ShieldCheck,
  Workflow,
  CheckCircle2,
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
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Controls Column */}
      <div className="lg:col-span-5 space-y-4">
        <Card padding="md" className="bg-surface-card border-border-default space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-primary flex items-center gap-2">
            <Code2 className="w-4 h-4 text-accent" />
            Workflow Configuration
          </h2>

          {/* Ecosystem Selector */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Runtime Ecosystem
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["python", "node", "mixed", "generic"] as const).map((eco) => (
                <button
                  key={eco}
                  type="button"
                  onClick={() => setEcosystem(eco)}
                  className={cn(
                    "px-3 py-2 text-xs font-medium rounded-md border text-left capitalize transition-colors",
                    ecosystem === eco
                      ? "bg-accent-subtle border-accent text-accent font-semibold shadow-xs"
                      : "bg-surface-elevated border-border-default text-text-secondary hover:border-border-strong hover:text-text-primary"
                  )}
                >
                  {eco === "mixed" ? "Mixed (Python & Node)" : eco}
                </button>
              ))}
            </div>
          </div>

          {/* Workflow Name */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              Workflow Name
            </label>
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="w-full bg-surface-elevated border border-border-default text-text-primary text-xs rounded-md px-3 py-2 focus:ring-1 focus:ring-accent focus:outline-none"
            />
          </div>

          {/* Branches */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              Trigger Branches (comma-separated)
            </label>
            <input
              type="text"
              value={triggerBranches}
              onChange={(e) => setTriggerBranches(e.target.value)}
              placeholder="main, release"
              className="w-full bg-surface-elevated border border-border-default text-text-primary text-xs rounded-md px-3 py-2 focus:ring-1 focus:ring-accent focus:outline-none"
            />
          </div>

          {/* Features Toggles */}
          <div className="pt-2 border-t border-border-default space-y-2.5">
            <label className="block text-xs font-medium text-text-primary">
              Included Pipeline Stages
            </label>

            <label className="flex items-center gap-2.5 text-xs text-text-secondary cursor-pointer hover:text-text-primary transition-colors">
              <input
                type="checkbox"
                checked={includeLint}
                onChange={(e) => setIncludeLint(e.target.checked)}
                className="rounded border-border-strong bg-surface-base text-accent focus:ring-accent"
              />
              <span>Automated Static Linting (flake8/ruff/eslint)</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-text-secondary cursor-pointer hover:text-text-primary transition-colors">
              <input
                type="checkbox"
                checked={includeTest}
                onChange={(e) => setIncludeTest(e.target.checked)}
                className="rounded border-border-strong bg-surface-base text-accent focus:ring-accent"
              />
              <span>Unit & Integration Test Execution (pytest/npm test)</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-text-secondary cursor-pointer hover:text-text-primary transition-colors">
              <input
                type="checkbox"
                checked={includeTypecheck}
                onChange={(e) => setIncludeTypecheck(e.target.checked)}
                className="rounded border-border-strong bg-surface-base text-accent focus:ring-accent"
              />
              <span>Type Checking (mypy/tsc)</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-text-secondary cursor-pointer hover:text-text-primary transition-colors">
              <input
                type="checkbox"
                checked={includeBuild}
                onChange={(e) => setIncludeBuild(e.target.checked)}
                className="rounded border-border-strong bg-surface-base text-accent focus:ring-accent"
              />
              <span>Production Build Step (npm run build)</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-text-secondary cursor-pointer hover:text-text-primary transition-colors">
              <input
                type="checkbox"
                checked={includeSecurityAudit}
                onChange={(e) => setIncludeSecurityAudit(e.target.checked)}
                className="rounded border-border-strong bg-surface-base text-accent focus:ring-accent"
              />
              <span>CodeSentinel AI 6-Pillar Security Audit</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-text-secondary cursor-pointer hover:text-text-primary transition-colors">
              <input
                type="checkbox"
                checked={includeArtifactUpload}
                onChange={(e) => setIncludeArtifactUpload(e.target.checked)}
                className="rounded border-border-strong bg-surface-base text-accent focus:ring-accent"
              />
              <span>Export Report Artifacts (SARIF & Markdown)</span>
            </label>
          </div>

          {/* Version Controls */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border-default">
            {ecosystem !== "node" && (
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Python Version
                </label>
                <input
                  type="text"
                  value={pythonVersion}
                  onChange={(e) => setPythonVersion(e.target.value)}
                  className="w-full bg-surface-elevated border border-border-default text-text-primary text-xs rounded-md px-2.5 py-1.5 focus:ring-1 focus:ring-accent focus:outline-none"
                />
              </div>
            )}
            {ecosystem !== "python" && (
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Node Version
                </label>
                <input
                  type="text"
                  value={nodeVersion}
                  onChange={(e) => setNodeVersion(e.target.value)}
                  className="w-full bg-surface-elevated border border-border-default text-text-primary text-xs rounded-md px-2.5 py-1.5 focus:ring-1 focus:ring-accent focus:outline-none"
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
            className="w-full mt-3 text-xs font-semibold justify-center"
          >
            {isGeneratingWorkflow
              ? "Synthesizing Secure Workflow..."
              : "Generate Hardened Workflow"}
          </Button>
        </Card>

        {/* Security Guarantee Box */}
        <Card padding="md" className="bg-surface-card border-border-default text-xs text-text-secondary space-y-2">
          <h3 className="font-semibold text-text-primary flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-status-success" />
            Hardened Security Standard
          </h3>
          <ul className="space-y-1.5 list-disc list-inside text-text-muted">
            <li>Actions pinned to immutable full commit SHAs</li>
            <li>
              Least-privilege permission default:{" "}
              <code className="text-accent font-mono">contents: read</code>
            </li>
            <li>Fork PR containment (no privileged write tokens)</li>
            <li>Shell parameter sanitization to block command injection</li>
            <li>Strict job timeout (15 min) and concurrency cancellation</li>
          </ul>
        </Card>
      </div>

      {/* YAML Preview Column */}
      <div className="lg:col-span-7">
        <Card padding="md" className="bg-surface-card border-border-default flex flex-col h-full min-h-[560px]">
          <div className="flex items-center justify-between border-b border-border-default pb-3 mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-accent" />
              <span className="text-xs font-mono text-text-primary font-medium">
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
                  onClick={onCopyWorkflow}
                  leftIcon={<Copy className="w-3.5 h-3.5" />}
                  className="text-xs font-medium"
                >
                  Copy YAML
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onDownloadWorkflow}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  className="text-xs font-medium"
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

              {/* Security Warnings */}
              {generatedWorkflow.security_warnings.length > 0 && (
                <div className="p-3 rounded-lg bg-surface-elevated border border-border-default text-xs space-y-1.5">
                  <span className="font-semibold text-text-primary block mb-1">
                    Security Design Controls:
                  </span>
                  {generatedWorkflow.security_warnings.map((w, idx) => (
                    <div key={idx} className="text-text-secondary flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-text-muted">
              <Workflow className="w-12 h-12 text-text-muted opacity-40 mb-3" />
              <p className="text-sm font-medium text-text-secondary">
                No workflow synthesized yet
              </p>
              <p className="text-xs text-text-muted max-w-sm mt-1">
                Select your runtime ecosystem and pipeline options on the left, then click &quot;Generate Hardened Workflow&quot; to preview the YAML.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

