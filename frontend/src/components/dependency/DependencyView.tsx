import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Package,
  Play,
  RotateCw,
  ShieldAlert,
} from "lucide-react";
import { Repository } from "../../types/api";
import {
  AdvisoryStatus,
  DependencyRun,
  DependencyVulnerability,
  RepositoryDependency,
} from "../../types/dependency";
import { dependencyService } from "../../services/dependencyService";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { ErrorState } from "../common/ErrorState";
import { EmptyState } from "../common/EmptyState";
import { Button } from "../common/Button";
import { DependencySummaryCards } from "./DependencySummaryCards";
import { VulnerabilitiesTable } from "./VulnerabilitiesTable";
import { DependencyInventoryTable } from "./DependencyInventoryTable";
import { VulnerabilityDetailModal } from "./VulnerabilityDetailModal";

interface DependencyViewProps {
  repository: Repository;
}

export const DependencyView: React.FC<DependencyViewProps> = ({ repository }) => {
  const [runs, setRuns] = useState<DependencyRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [isStartingAnalysis, setIsStartingAnalysis] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  // Active sub-view
  const [activeSubTab, setActiveSubTab] = useState<"vulnerabilities" | "inventory">("vulnerabilities");

  // Advisory status
  const [advisoryStatus, setAdvisoryStatus] = useState<AdvisoryStatus | null>(null);

  // Vulnerabilities state
  const [vulnerabilities, setVulnerabilities] = useState<DependencyVulnerability[]>([]);
  const [totalVulns, setTotalVulns] = useState(0);
  const [vulnPage, setVulnPage] = useState(1);
  const [vulnSeverity, setVulnSeverity] = useState("");
  const [vulnEcosystem, setVulnEcosystem] = useState("");
  const [vulnSearch, setVulnSearch] = useState("");
  const [selectedVuln, setSelectedVuln] = useState<DependencyVulnerability | null>(null);
  const [loadingVulns, setLoadingVulns] = useState(false);

  // Dependencies inventory state
  const [dependencies, setDependencies] = useState<RepositoryDependency[]>([]);
  const [totalDeps, setTotalDeps] = useState(0);
  const [depPage, setDepPage] = useState(1);
  const [depEcosystem, setDepEcosystem] = useState("");
  const [depDirect, setDepDirect] = useState("");
  const [depStatus, setDepStatus] = useState("");
  const [depSearch, setDepSearch] = useState("");
  const [loadingDeps, setLoadingDeps] = useState(false);

  // 1. Fetch historical runs and advisory status
  const fetchRuns = useCallback(async () => {
    setLoadingRuns(true);
    setRunError(null);
    try {
      const [runsRes, advStatus] = await Promise.all([
        dependencyService.listRepositoryDependencyRuns(repository.id, 1, 20),
        dependencyService.getAdvisoryStatus().catch(() => null),
      ]);
      setRuns(runsRes.items);
      if (advStatus) setAdvisoryStatus(advStatus);
      if (runsRes.items.length > 0) {
        setSelectedRunId((curr) => curr || runsRes.items[0].id);
      }
    } catch (err: unknown) {
      setRunError(err instanceof Error ? err.message : "Failed to load dependency analysis history.");
    } finally {
      setLoadingRuns(false);
    }
  }, [repository.id]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const activeRun = runs.find((r) => r.id === selectedRunId) || runs[0] || null;

  // 2. Fetch vulnerabilities for active run
  const fetchVulnerabilities = useCallback(async () => {
    if (!activeRun) return;
    setLoadingVulns(true);
    try {
      const res = await dependencyService.listVulnerabilities(activeRun.id, {
        severity: vulnSeverity || undefined,
        ecosystem: vulnEcosystem || undefined,
        package: vulnSearch || undefined,
        page: vulnPage,
        pageSize: 25,
      });
      setVulnerabilities(res.items);
      setTotalVulns(res.total);
    } catch (err: unknown) {
      console.error("Failed to load vulnerabilities:", err);
    } finally {
      setLoadingVulns(false);
    }
  }, [activeRun, vulnPage, vulnSeverity, vulnEcosystem, vulnSearch]);

  useEffect(() => {
    if (activeRun) {
      fetchVulnerabilities();
    }
  }, [activeRun, fetchVulnerabilities]);

  // 3. Fetch dependencies inventory for active run
  const fetchDependencies = useCallback(async () => {
    if (!activeRun) return;
    setLoadingDeps(true);
    try {
      const isDirectBool =
        depDirect === "direct" ? true : depDirect === "transitive" ? false : undefined;

      const res = await dependencyService.listDependencies(activeRun.id, {
        ecosystem: depEcosystem || undefined,
        package: depSearch || undefined,
        is_direct: isDirectBool,
        status: depStatus || undefined,
        page: depPage,
        pageSize: 25,
      });
      setDependencies(res.items);
      setTotalDeps(res.total);
    } catch (err: unknown) {
      console.error("Failed to load dependencies:", err);
    } finally {
      setLoadingDeps(false);
    }
  }, [activeRun, depPage, depEcosystem, depDirect, depStatus, depSearch]);

  useEffect(() => {
    if (activeRun) {
      fetchDependencies();
    }
  }, [activeRun, fetchDependencies]);

  // Trigger new run
  const handleStartAnalysis = async () => {
    setIsStartingAnalysis(true);
    setRunError(null);
    try {
      const newRun = await dependencyService.startDependencyAnalysis(repository.id, {
        snapshot_id: repository.latest_snapshot?.id,
      });
      setRuns((prev) => [newRun, ...prev.filter((r) => r.id !== newRun.id)]);
      setSelectedRunId(newRun.id);
    } catch (err: unknown) {
      setRunError(err instanceof Error ? err.message : "Failed to run dependency analysis.");
    } finally {
      setIsStartingAnalysis(false);
    }
  };

  if (loadingRuns) {
    return <LoadingSpinner message="Loading dependency intelligence data..." />;
  }

  return (
    <div className="space-y-4">
      {/* Top action toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-surface-card border border-border-default shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent-subtle border border-accent-border text-accent shrink-0 shadow-xs">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary tracking-tight">
              Dependency Intelligence & Software Composition Analysis
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Deterministic manifest discovery, PEP 440 & npm Semver version matching, and security advisory correlation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {runs.length > 1 && (
            <div className="relative">
              <select
                value={selectedRunId || ""}
                onChange={(e) => setSelectedRunId(e.target.value)}
                aria-label="Select dependency analysis run"
                className="h-8 pl-2.5 pr-7 py-1 text-xs bg-surface-base border border-border-default rounded-md text-text-primary font-mono focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent appearance-none cursor-pointer"
              >
                {runs.map((r, idx) => (
                  <option key={r.id} value={r.id}>
                    Run #{runs.length - idx} • {new Date(r.started_at).toLocaleDateString()} ({r.status})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleStartAnalysis}
            disabled={isStartingAnalysis}
            leftIcon={
              isStartingAnalysis ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )
            }
          >
            {isStartingAnalysis ? "Scanning Dependencies..." : "Run SCA Scan"}
          </Button>
        </div>
      </div>

      {runError && <ErrorState message={runError} />}

      {/* Advisory dataset callout if empty or unavailable */}
      {advisoryStatus && advisoryStatus.status === "UNAVAILABLE" && (
        <div className="p-3.5 rounded-lg bg-status-warning-bg border border-status-warning-border flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs">
            <span className="font-semibold text-amber-300">Advisory Dataset Unavailable: </span>
            <span className="text-text-secondary">
              Vulnerability correlation cannot be performed because no active advisory dataset is loaded. Discovered dependencies are still inventoried.
            </span>
          </div>
        </div>
      )}

      {/* When no runs exist yet */}
      {!activeRun ? (
        <EmptyState
          icon={<Package className="w-6 h-6 text-text-muted" />}
          title="No Dependency Analysis Run Yet"
          description="Discover manifests (requirements.txt, pyproject.toml, package.json, lockfiles), resolve direct and transitive packages, and correlate real vulnerability advisories."
          actionLabel="Start First Dependency Scan"
          onAction={handleStartAnalysis}
        />
      ) : (
        <>
          {/* Summary Cards */}
          <DependencySummaryCards run={activeRun} />

          {/* Sub-tab navigation */}
          <div className="border-b border-border-default flex gap-6 text-xs font-medium">
            <button
              onClick={() => setActiveSubTab("vulnerabilities")}
              className={`pb-2.5 transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
                activeSubTab === "vulnerabilities"
                  ? "border-accent text-accent font-semibold"
                  : "border-transparent text-text-muted hover:text-text-primary"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Vulnerabilities</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-surface-elevated text-text-muted border border-border-default">
                {activeRun.vulnerabilities_count}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab("inventory")}
              className={`pb-2.5 transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
                activeSubTab === "inventory"
                  ? "border-accent text-accent font-semibold"
                  : "border-transparent text-text-muted hover:text-text-primary"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Dependency Inventory</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-surface-elevated text-text-muted border border-border-default">
                {activeRun.dependencies_discovered}
              </span>
            </button>
          </div>

          {/* View Content */}
          {activeSubTab === "vulnerabilities" ? (
            loadingVulns ? (
              <LoadingSpinner message="Loading vulnerability findings..." />
            ) : (
              <VulnerabilitiesTable
                vulnerabilities={vulnerabilities}
                total={totalVulns}
                page={vulnPage}
                pageSize={25}
                onPageChange={setVulnPage}
                selectedSeverity={vulnSeverity}
                onSeverityChange={setVulnSeverity}
                selectedEcosystem={vulnEcosystem}
                onEcosystemChange={setVulnEcosystem}
                searchQuery={vulnSearch}
                onSearchChange={setVulnSearch}
                onSelectVulnerability={setSelectedVuln}
              />
            )
          ) : loadingDeps ? (
            <LoadingSpinner message="Loading dependency inventory..." />
          ) : (
            <DependencyInventoryTable
              dependencies={dependencies}
              total={totalDeps}
              page={depPage}
              pageSize={25}
              onPageChange={setDepPage}
              selectedEcosystem={depEcosystem}
              onEcosystemChange={setDepEcosystem}
              selectedDirect={depDirect}
              onDirectChange={setDepDirect}
              selectedStatus={depStatus}
              onStatusChange={setDepStatus}
              searchQuery={depSearch}
              onSearchChange={setDepSearch}
            />
          )}

          {/* Modal */}
          <VulnerabilityDetailModal
            vulnerability={selectedVuln}
            onClose={() => setSelectedVuln(null)}
          />
        </>
      )}
    </div>
  );
};
