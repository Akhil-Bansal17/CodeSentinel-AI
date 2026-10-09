import React, { useState, useEffect } from "react";
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
  FileCode,
  Clock,
  ArrowRight,
} from "lucide-react";
import { HealthState } from "../hooks/useHealth";
import { EmptyState } from "../components/common/EmptyState";
import { StatusBadge } from "../components/common/StatusBadge";
import { BackendUnavailableState } from "../components/common/BackendUnavailableState";
import { repositoryService } from "../services/repositoryService";
import { Repository } from "../types/api";

interface OverviewPageProps {
  healthState: HealthState;
  onAnalyzeClick: () => void;
  onViewRepository?: (repo: Repository) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  healthState,
  onAnalyzeClick,
  onViewRepository,
}) => {
  const [repositories, setRepositories] = useState<Repository[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadRepos() {
      try {
        const res = await repositoryService.listRepositories(1, 10);
        if (isMounted) {
          setRepositories(Array.isArray(res?.items) ? res.items : []);
        }
      } catch {
        if (isMounted) {
          setRepositories([]);
        }
      }
    }
    loadRepos();

    return () => {
      isMounted = false;
    };
  }, []);

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
            <StatusBadge label="Phase 1 Active" variant="success" />
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
            Tracked Repositories
          </h2>
          <span className="text-xs text-slate-400 font-mono">Real deterministic state only</span>
        </div>

        {(repositories || []).length === 0 ? (
          <EmptyState

            title="No repository analyzed yet."
            description="Connect a public GitHub repository or approved local directory to discover file structures, detect languages, and generate deterministic snapshots."
            actionLabel="Analyze Repository"
            onAction={onAnalyzeClick}
          />

        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {repositories.map((repo) => {
              const snap = repo.latest_snapshot;
              return (
                <div
                  key={repo.id}
                  onClick={() => onViewRepository && onViewRepository(repo)}
                  className="p-4 rounded-lg bg-[#161b22] border border-[#30363d] hover:border-slate-500/50 transition-all cursor-pointer flex flex-col justify-between gap-3 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-slate-100 group-hover:text-sky-400 transition-colors truncate">
                        {repo.name}
                      </span>
                      <StatusBadge
                        label={repo.status}
                        variant={
                          repo.status === "completed"
                            ? "success"
                            : repo.status === "failed"
                            ? "danger"
                            : "warning"
                        }
                      />

                    </div>

                    <div className="text-xs text-slate-400 space-y-1">
                      {snap && (
                        <div className="flex items-center gap-1.5">
                          <FileCode className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            {snap.file_count.toLocaleString()} files (
                            {snap.total_lines_of_code.toLocaleString()} LOC)
                          </span>
                        </div>
                      )}
                      {repo.last_ingested_at && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>Last ingested: {new Date(repo.last_ingested_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end text-xs text-sky-400 font-medium group-hover:translate-x-0.5 transition-transform">
                    <span>Inspect Snapshot</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* System Telemetry Card */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 font-mono">
          System Telemetry &amp; Foundation
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
            <div className="text-xs text-slate-400 mt-1">Phase 1 Ingestion Release</div>
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
                  <span>Database Ready</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>{healthState.data?.database || "Disconnected"}</span>
                </>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-1">SQLAlchemy &amp; Alembic Engine</div>
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
              Architecture &amp; Engine Boundaries
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
              <StatusBadge label="Phase 1 Active" variant="success" />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Discovers repository source trees directly, classifies languages deterministically, enforces
              security boundaries, and computes immutable snapshots with zero AI hallucination.
            </p>
            <ul className="text-xs text-slate-400 space-y-1 font-mono pt-1">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                Deterministic Repository Ingestion &amp; Snapshots
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                Safe Archive Extraction &amp; Symlink Protection
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                Exact Language Detection &amp; LOC Counting
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                Static Analysis &amp; SAST (Phase 2 Ready)
              </li>
            </ul>
          </div>

          {/* Card 2: Grounded AI Reasoning */}
          <div className="p-5 rounded-lg border border-[#21262d] bg-[#161b22] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-slate-200">AI Reasoning &amp; Agency</h3>
              </div>
              <StatusBadge label="Future Phase" variant="neutral" />
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
