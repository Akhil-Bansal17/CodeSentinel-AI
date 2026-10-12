import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-[#161b22] border border-[#30363d]">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-sky-400" />
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Dependency Intelligence & Software Composition Analysis
            </h3>
            <p className="text-[11px] text-slate-400">
              Deterministic manifest discovery, PEP 440 & npm Semver version matching, and security advisory correlation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {runs.length > 1 && (
            <select
              value={selectedRunId || ""}
              onChange={(e) => setSelectedRunId(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-[#0d1117] border border-[#30363d] rounded-md text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
            >
              {runs.map((r, idx) => (
                <option key={r.id} value={r.id}>
                  Run #{runs.length - idx} • {new Date(r.started_at).toLocaleDateString()} ({r.status})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleStartAnalysis}
            disabled={isStartingAnalysis}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50 transition-colors shadow-sm"
          >
            {isStartingAnalysis ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Scanning Dependencies...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Run SCA Scan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {runError && <ErrorState message={runError} />}

      {/* Advisory dataset callout if empty or unavailable */}
      {advisoryStatus && advisoryStatus.status === "UNAVAILABLE" && (
        <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs">
            <span className="font-semibold text-amber-300">Advisory Dataset Unavailable: </span>
            <span className="text-slate-300">
              Vulnerability correlation cannot be performed because no active advisory dataset is loaded. Discovered dependencies are still inventoried.
            </span>
          </div>
        </div>
      )}

      {/* When no runs exist yet */}
      {!activeRun ? (
        <div className="p-12 text-center rounded-lg border border-[#30363d] bg-[#161b22]">
          <Package className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-60" />
          <h4 className="text-base font-semibold text-slate-200 mb-1">
            No Dependency Analysis Run Yet
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
            Discover manifests (requirements.txt, pyproject.toml, package.json, lockfiles), resolve direct and transitive packages, and correlate real vulnerability advisories.
          </p>
          <button
            onClick={handleStartAnalysis}
            disabled={isStartingAnalysis}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md bg-sky-600 text-white hover:bg-sky-500 transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Start First Dependency Scan</span>
          </button>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <DependencySummaryCards run={activeRun} />

          {/* Sub-tab navigation */}
          <div className="border-b border-[#30363d] flex gap-4 text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab("vulnerabilities")}
              className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
                activeSubTab === "vulnerabilities"
                  ? "border-sky-500 text-sky-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Vulnerabilities</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300">
                {activeRun.vulnerabilities_count}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab("inventory")}
              className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
                activeSubTab === "inventory"
                  ? "border-sky-500 text-sky-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Dependency Inventory</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300">
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
