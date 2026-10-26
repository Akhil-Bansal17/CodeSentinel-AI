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
  FolderGit2,
  Cpu,
  ShieldCheck,
} from "lucide-react";
import { HealthState } from "../hooks/useHealth";
import { EmptyState } from "../components/common/EmptyState";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../components/common/Card";
import { SkeletonLoader } from "../components/common/SkeletonLoader";
import { BackendUnavailableState } from "../components/common/BackendUnavailableState";
import { repositoryService } from "../services/repositoryService";
import { Repository } from "../types/api";

export interface OverviewPageProps {
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
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadRepos() {
      setIsLoading(true);
      try {
        const res = await repositoryService.listRepositories(1, 20);
        if (isMounted) {
          setRepositories(Array.isArray(res?.items) ? res.items : []);
        }
      } catch {
        if (isMounted) {
          setRepositories([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    loadRepos();

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute honest portfolio metrics from real snapshots (Zero fake numbers)
  const portfolioMetrics = React.useMemo(() => {
    let totalFiles = 0;
    let totalLoc = 0;
    const languages = new Set<string>();

    repositories.forEach((repo) => {
      if (repo.latest_snapshot) {
        totalFiles += repo.latest_snapshot.file_count || 0;
        totalLoc += repo.latest_snapshot.total_lines_of_code || 0;
        if (repo.latest_snapshot.language_distribution) {
          Object.keys(repo.latest_snapshot.language_distribution).forEach((lang) =>
            languages.add(lang)
          );
        }
      }
    });

    return {
      repoCount: repositories.length,
      totalFiles,
      totalLoc,
      activeLanguageCount: languages.size,
    };
  }, [repositories]);

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Backend Unavailable Warning (only if backend is offline) */}
      {!healthState.isLoading && !healthState.isAvailable && (
        <BackendUnavailableState onRetry={healthState.refetch} />
      )}

      {/* Hero Command Banner */}
      <section className="rounded-xl border border-border-default bg-surface-card p-6 sm:p-8 relative overflow-hidden shadow-card">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex items-center gap-2">
            <Badge label="Production Architecture" variant="accent" size="sm" isMono />
            <span className="text-xs font-mono text-text-muted">High-Precision Engineering Console</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-text-primary">
            CodeSentinel AI
          </h1>

          <p className="text-base sm:text-lg text-text-secondary font-medium">
            AI-powered software engineering intelligence for your codebase.
          </p>

          <p className="text-sm text-text-muted leading-relaxed max-w-2xl">
            A serious developer intelligence platform separating deterministic analysis from AI reasoning.
            Deterministic engines produce verified AST facts, vulnerabilities, and dependency graphs. The AI
            layer synthesizes, explains, and formulates safe remediation proposals over verified evidence.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={onAnalyzeClick}
              leftIcon={<GitBranch className="w-4 h-4" />}
            >
              Analyze Repository
            </Button>

            <a href="#architecture">
              <Button
                variant="secondary"
                size="md"
                leftIcon={<Layers className="w-4 h-4" />}
              >
                Architecture Blueprint
              </Button>
            </a>
          </div>
        </div>

        {/* Ambient subtle background watermark */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 pointer-events-none opacity-[0.03] text-text-primary hidden md:block">
          <ShieldCheck className="w-96 h-96" />
        </div>
      </section>

      {/* Aggregated Deterministic Metrics (Only displayed when repositories exist) */}
      {repositories.length > 0 && (
        <section aria-label="Portfolio Summary" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="flat" padding="sm">
            <div className="flex items-center justify-between text-xs text-text-muted mb-1 font-mono">
              <span>Tracked Repos</span>
              <FolderGit2 className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="text-xl font-bold text-text-primary font-mono">
              {portfolioMetrics.repoCount}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">Active repository projects</div>
          </Card>

          <Card variant="flat" padding="sm">
            <div className="flex items-center justify-between text-xs text-text-muted mb-1 font-mono">
              <span>Source Files</span>
              <FileCode className="w-3.5 h-3.5 text-text-muted" />
            </div>
            <div className="text-xl font-bold text-text-primary font-mono">
              {portfolioMetrics.totalFiles.toLocaleString()}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">Indexed across snapshots</div>
          </Card>

          <Card variant="flat" padding="sm">
            <div className="flex items-center justify-between text-xs text-text-muted mb-1 font-mono">
              <span>Lines of Code</span>
              <Code2 className="w-3.5 h-3.5 text-text-muted" />
            </div>
            <div className="text-xl font-bold text-text-primary font-mono">
              {portfolioMetrics.totalLoc.toLocaleString()}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">Verified deterministic LOC</div>
          </Card>

          <Card variant="flat" padding="sm">
            <div className="flex items-center justify-between text-xs text-text-muted mb-1 font-mono">
              <span>Languages</span>
              <Cpu className="w-3.5 h-3.5 text-text-muted" />
            </div>
            <div className="text-xl font-bold text-text-primary font-mono">
              {portfolioMetrics.activeLanguageCount}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">Polyglot AST classifiers</div>
          </Card>
        </section>
      )}

      {/* Primary Repository State (Rule: Zero Fake Numbers) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-primary font-mono">
              Tracked Repositories
            </h2>
            {repositories.length > 0 && (
              <Badge label={`${repositories.length}`} variant="neutral" size="sm" isMono />
            )}
          </div>
          <span className="text-xs text-text-muted font-mono">Real deterministic state only</span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonLoader variant="card" />
            <SkeletonLoader variant="card" />
            <SkeletonLoader variant="card" />
          </div>
        ) : repositories.length === 0 ? (
          <EmptyState
            title="No repository analyzed yet."
            description="Connect a public GitHub repository or approved local directory to discover file structures, detect languages, and generate deterministic snapshots."
            actionLabel="Analyze Repository"
            onAction={onAnalyzeClick}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {repositories.map((repo) => {
              const snap = repo.latest_snapshot;
              const topLanguages = snap?.language_distribution
                ? Object.keys(snap.language_distribution).slice(0, 3)
                : [];

              return (
                <Card
                  key={repo.id}
                  variant="interactive"
                  padding="md"
                  onClick={() => onViewRepository && onViewRepository(repo)}
                  className="flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-sm text-text-primary group-hover:text-accent transition-colors truncate block">
                          {repo.name}
                        </span>
                        <span className="text-[11px] font-mono text-text-muted truncate block mt-0.5">
                          {repo.source_identifier || repo.source_type}
                        </span>
                      </div>
                      <Badge
                        label={repo.status}
                        variant={
                          repo.status === "completed"
                            ? "success"
                            : repo.status === "failed"
                            ? "danger"
                            : "warning"
                        }
                        size="sm"
                        dot={repo.status === "processing" || repo.status === "pending"}
                      />
                    </div>

                    <div className="text-xs text-text-secondary space-y-1.5 pt-1">
                      {snap && (
                        <div className="flex items-center gap-1.5">
                          <FileCode className="w-3.5 h-3.5 text-text-muted shrink-0" />
                          <span>
                            {snap.file_count.toLocaleString()} files (
                            {snap.total_lines_of_code.toLocaleString()} LOC)
                          </span>
                        </div>
                      )}
                      {repo.last_ingested_at && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-text-muted shrink-0" />
                          <span>Last ingested: {new Date(repo.last_ingested_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {topLanguages.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {topLanguages.map((lang) => (
                          <Badge key={lang} label={lang} variant="neutral" size="sm" isMono />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end text-xs text-accent font-medium pt-4 mt-3 border-t border-border-subtle group-hover:translate-x-0.5 transition-transform">
                    <span>Inspect Snapshot</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* System Telemetry & Foundation Card */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-primary font-mono">
          System Telemetry &amp; Foundation
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Service Name */}
          <Card variant="flat" padding="sm">
            <div className="flex items-center justify-between text-xs text-text-muted mb-2 font-mono">
              <span>API Service</span>
              <Server className="w-3.5 h-3.5 text-text-muted" />
            </div>
            <div className="text-base font-semibold text-text-primary font-mono truncate">
              {healthState.data?.service || "codesentinel-api"}
            </div>
            <div className="text-xs text-text-muted mt-1">FastAPI Backend Service</div>
          </Card>

          {/* Service Version */}
          <Card variant="flat" padding="sm">
            <div className="flex items-center justify-between text-xs text-text-muted mb-2 font-mono">
              <span>API Version</span>
              <Terminal className="w-3.5 h-3.5 text-text-muted" />
            </div>
            <div className="text-base font-semibold text-text-primary font-mono">
              v{healthState.data?.version || "0.1.0"}
            </div>
            <div className="text-xs text-text-muted mt-1">Operational API Engine</div>
          </Card>

          {/* Database Status */}
          <Card variant="flat" padding="sm">
            <div className="flex items-center justify-between text-xs text-text-muted mb-2 font-mono">
              <span>Database Dialect</span>
              <Database className="w-3.5 h-3.5 text-text-muted" />
            </div>
            <div className="text-base font-semibold text-text-primary font-mono capitalize flex items-center gap-1.5">
              {healthState.data?.database === "connected" ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />
                  <span>Database Ready</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-status-warning shrink-0" />
                  <span>{healthState.data?.database || "Disconnected"}</span>
                </>
              )}
            </div>
            <div className="text-xs text-text-muted mt-1">SQLAlchemy &amp; Alembic Engine</div>
          </Card>

          {/* Active Environment */}
          <Card variant="flat" padding="sm">
            <div className="flex items-center justify-between text-xs text-text-muted mb-2 font-mono">
              <span>Environment</span>
              <Shield className="w-3.5 h-3.5 text-text-muted" />
            </div>
            <div className="text-base font-semibold text-text-primary font-mono capitalize">
              {healthState.data?.environment || "Development"}
            </div>
            <div className="text-xs text-text-muted mt-1">Strict Validation Mode</div>
          </Card>
        </div>
      </section>

      {/* Architecture & Engine Boundaries */}
      <section id="architecture" className="space-y-4 pt-4 border-t border-border-default">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              Architecture &amp; Engine Boundaries
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Clear segregation between deterministic analysis engines and AI reasoning
            </p>
          </div>
          <Badge label="Grounded Reasoning" variant="accent" size="sm" isMono />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Deterministic Engine */}
          <Card variant="default" padding="md">
            <CardHeader
              action={<Badge label="Deterministic Facts" variant="info" size="sm" isMono />}
            >
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-sky-400" />
                <CardTitle as="h3">Deterministic Engine Layer</CardTitle>
              </div>
              <CardDescription>
                Discovers repository source trees directly, classifies languages deterministically, enforces
                security boundaries, and computes immutable snapshots with zero AI hallucination.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-xs text-text-secondary space-y-2 font-mono">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                  Deterministic Repository Ingestion &amp; Snapshots
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                  Safe Archive Extraction &amp; Symlink Protection
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                  Exact Language Detection &amp; LOC Counting
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                  Static Analysis, AST Parsing &amp; SAST Engine
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Card 2: Grounded AI Reasoning */}
          <Card variant="default" padding="md">
            <CardHeader
              action={<Badge label="Evidence Grounded" variant="accent" size="sm" isMono />}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <CardTitle as="h3">AI Reasoning &amp; Agency</CardTitle>
              </div>
              <CardDescription>
                Synthesizes, explains, and prioritizes verified deterministic findings. Operates over
                retrieval-augmented codebase indexes with evidence citations and bounded agent proposals.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-xs text-text-secondary space-y-2 font-mono">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                  Evidence-Grounded Codebase Q&amp;A
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                  Engineering Explanations of Security Vulnerabilities
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                  Prioritized Action Recommendations
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                  Safe Agentic Patch Proposals with Verification Plans
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};
