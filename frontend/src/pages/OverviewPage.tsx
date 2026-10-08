import React from "react";
import {
  Shield,
  Layers,
  Sparkles,
  GitBranch,
  Terminal,
  Server,
  Database,
  CheckCircle2,
  AlertCircle,
  Code2,
} from "lucide-react";
import { HealthState } from "../hooks/useHealth";
import { EmptyState } from "../components/common/EmptyState";
import { StatusBadge } from "../components/common/StatusBadge";
import { BackendUnavailableState } from "../components/common/BackendUnavailableState";

interface OverviewPageProps {
  healthState: HealthState;
  onAnalyzeClick: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  healthState,
  onAnalyzeClick,
}) => {
  return (
    <div className="space-y-8">
      {/* Backend Unavailable Warning (only if offline) */}
      {!healthState.isLoading && !healthState.isAvailable && (
        <BackendUnavailableState onRetry={healthState.refetch} />
      )}

      {/* Hero Header */}
      <div className="rounded-xl border border-[#30363d] bg-radial from-[#161b22] to-[#0d1117] p-6 sm:p-8 relative overflow-hidden">
        <div className="max-w-3xl space-y-4">
          <div className="flex items-center gap-2">
            <StatusBadge label="Phase 0 Foundation" variant="info" />
            <span className="text-xs font-mono text-slate-400">Deterministic Engine Architecture</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-100">
            CodeSentinel AI
          </h1>

          <p className="text-base sm:text-lg text-slate-300 font-medium">
            AI-powered software engineering intelligence for your codebase.
          </p>

          <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
            A serious developer intelligence platform separating deterministic analysis from AI reasoning.
            Deterministic engines produce verified facts, findings, and evidence. The AI layer explains,
            summarizes, and prioritizes over verified facts—never hallucinating repository details.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onAnalyzeClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-semibold transition-colors shadow-sm cursor-pointer"
            >
              <GitBranch className="w-4 h-4" />
              <span>Analyze Repository</span>
            </button>

            <a
              href="#architecture"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#21262d] hover:bg-[#30363d] text-slate-200 text-sm font-medium border border-[#30363d] transition-colors"
            >
              <Layers className="w-4 h-4" />
              <span>Architecture Blueprint</span>
            </a>
          </div>
        </div>
      </div>

      {/* Primary Repository State (Rule: Zero Fake Numbers) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 font-mono">
            Active Repository Status
          </h2>
          <span className="text-xs text-slate-400 font-mono">Real deterministic state only</span>
        </div>

        <EmptyState
          title="No repository analyzed yet."
          description="Connect or register a repository in Phase 1 to trigger real AST parsing, static analysis, security auditing, and test intelligence pipelines."
          actionLabel="Analyze Repository"
          onAction={onAnalyzeClick}
        />
      </section>

      {/* System Foundation Verification Card */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 font-mono">
          Phase 0 Foundation Telemetry
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Service Name */}
          <div className="p-4 rounded-lg border border-[#21262d] bg-[#161b22]">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-mono">API Service</span>
              <Server className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-base font-semibold text-slate-200 font-mono">
              {healthState.data?.service || "codesentinel-api"}
            </div>
            <div className="text-xs text-slate-400 mt-1">FastAPI Backend Service</div>
          </div>

          {/* Service Version */}
          <div className="p-4 rounded-lg border border-[#21262d] bg-[#161b22]">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-mono">API Version</span>
              <Terminal className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-base font-semibold text-slate-200 font-mono">
              v{healthState.data?.version || "0.1.0"}
            </div>
            <div className="text-xs text-slate-400 mt-1">Foundation Release</div>
          </div>

          {/* Database Status */}
          <div className="p-4 rounded-lg border border-[#21262d] bg-[#161b22]">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-mono">Database Dialect</span>
              <Database className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-base font-semibold text-slate-200 font-mono capitalize flex items-center gap-1.5">
              {healthState.data?.database === "connected" ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>PostgreSQL (Ready)</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>{healthState.data?.database || "Disconnected"}</span>
                </>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-1">SQLAlchemy & Alembic Engine</div>
          </div>

          {/* Active Environment */}
          <div className="p-4 rounded-lg border border-[#21262d] bg-[#161b22]">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-mono">Environment</span>
              <Shield className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-base font-semibold text-slate-200 font-mono capitalize">
              {healthState.data?.environment || "Development"}
            </div>
            <div className="text-xs text-slate-400 mt-1">Strict Validation Mode</div>
          </div>
        </div>
      </section>

      {/* Planned Pipeline & Capability Boundaries */}
      <section id="architecture" className="space-y-4 pt-4 border-t border-[#21262d]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-200">
              Architecture & Engine Boundaries
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Clear segregation between deterministic analysis engines and AI reasoning
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800 px-2.5 py-1 rounded">
            No LLM Wrappers
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Deterministic Engine */}
          <div className="p-5 rounded-lg border border-[#21262d] bg-[#161b22] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-semibold text-slate-200">Deterministic Engine Layer</h3>
              </div>
              <StatusBadge label="Phase 1 Planned" variant="neutral" />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Analyzes repository source trees directly using AST parsers, linters, SAST scanners,
              and package manifests. Produces immutable evidence, scores, and findings with zero AI hallucination.
            </p>
            <ul className="text-xs text-slate-400 space-y-1 font-mono pt-1">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                Repository Structure & AST Parsing
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                Security Scanning (SAST & CVE Correlation)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                Dependency Intelligence & License Audits
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                Test Coverage & Flakiness Metrics
              </li>
            </ul>
          </div>

          {/* Card 2: Grounded AI Reasoning */}
          <div className="p-5 rounded-lg border border-[#21262d] bg-[#161b22] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-slate-200">AI Reasoning & Agency</h3>
              </div>
              <StatusBadge label="Phase 3 Planned" variant="neutral" />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Synthesizes, explains, and prioritizes verified deterministic findings. Operates over
              retrieval-augmented codebase indexes with evidence citations and bounded agent proposals.
            </p>
            <ul className="text-xs text-slate-400 space-y-1 font-mono pt-1">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                Evidence-Grounded Codebase Q&amp;A
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                Engineering Explanations of Security Vulnerabilities
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                Prioritized Action Recommendations
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                Safe Agentic Patch Proposals with Verification Plans
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};
