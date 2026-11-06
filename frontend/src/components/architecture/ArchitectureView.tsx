import React, { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ChevronDown,
  Layers,
  Network,
  Play,
  RotateCw,
  ShieldAlert,
} from "lucide-react";
import { Repository } from "../../types/api";
import {
  ArchitectureGraph,
  ArchitecturePolicyResponse,
  ArchitectureRun,
  ArchitectureViolation,
  ModuleNode,
} from "../../types/architecture";
import {
  getActivePolicy,
  getArchitectureGraph,
  listArchitectureRuns,
  listModules,
  listViolations,
  startArchitectureRun,
} from "../../services/architectureService";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { EmptyState } from "../common/EmptyState";
import { Button } from "../common/Button";
import { ArchitectureSummaryCards } from "./ArchitectureSummaryCards";
import { ModuleExplorerTable } from "./ModuleExplorerTable";
import { ArchitectureViolationsTable } from "./ArchitectureViolationsTable";

interface ArchitectureViewProps {
  repository: Repository;
}

export const ArchitectureView: React.FC<ArchitectureViewProps> = ({ repository }) => {
  const snapshot = repository.latest_snapshot;

  // Run selection state
  const [runs, setRuns] = useState<ArchitectureRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [isLoadingRuns, setIsLoadingRuns] = useState<boolean>(true);
  const [isStartingRun, setIsStartingRun] = useState<boolean>(false);
  const [runError, setRunError] = useState<string | null>(null);

  // Active sub-tab state
  const [activeTab, setActiveTab] = useState<"modules" | "violations" | "cycles" | "policy">("modules");

  // Modules state
  const [modules, setModules] = useState<ModuleNode[]>([]);
  const [totalModules, setTotalModules] = useState<number>(0);
  const [modulePage, setModulePage] = useState<number>(1);
  const [modulePageSize] = useState<number>(50);
  const [moduleSearch, setModuleSearch] = useState<string>("");
  const [moduleSortBy, setModuleSortBy] = useState<string>("coupling");
  const [isLoadingModules, setIsLoadingModules] = useState<boolean>(false);

  // Violations state
  const [violations, setViolations] = useState<ArchitectureViolation[]>([]);
  const [totalViolations, setTotalViolations] = useState<number>(0);
  const [violationPage, setViolationPage] = useState<number>(1);
  const [violationPageSize] = useState<number>(50);
  const [severityFilter, setSeverityFilter] = useState<string | undefined>(undefined);
  const [isLoadingViolations, setIsLoadingViolations] = useState<boolean>(false);

  // Graph / Cycles state
  const [graph, setGraph] = useState<ArchitectureGraph | null>(null);
  const [isLoadingGraph, setIsLoadingGraph] = useState<boolean>(false);

  // Policy state
  const [policyInfo, setPolicyInfo] = useState<ArchitecturePolicyResponse | null>(null);
  const [isLoadingPolicy, setIsLoadingPolicy] = useState<boolean>(false);

  // 1. Load historical runs
  const fetchRuns = useCallback(async () => {
    setIsLoadingRuns(true);
    setRunError(null);
    try {
      const res = await listArchitectureRuns(repository.id, 1, 20);
      setRuns(res.items);
      if (res.items.length > 0) {
        setSelectedRunId((curr) => curr || res.items[0].id);
      }
    } catch (err: unknown) {
      setRunError(err instanceof Error ? err.message : "Failed to load architecture runs.");
    } finally {
      setIsLoadingRuns(false);
    }
  }, [repository.id]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const activeRun = runs.find((r) => r.id === selectedRunId) || runs[0] || null;

  // 2. Trigger new run
  const handleStartRun = async () => {
    if (!snapshot) return;
    setIsStartingRun(true);
    setRunError(null);
    try {
      const run = await startArchitectureRun(repository.id, {
        snapshot_id: snapshot.id,
      });
      setRuns((prev) => [run, ...prev.filter((r) => r.id !== run.id)]);
      setSelectedRunId(run.id);
    } catch (err: unknown) {
      setRunError(err instanceof Error ? err.message : "Failed to start architecture analysis.");
    } finally {
      setIsStartingRun(false);
    }
  };

  // 3. Load modules when activeTab is "modules" or run changes
  const fetchModules = useCallback(async () => {
    if (!activeRun) return;
    setIsLoadingModules(true);
    try {
      const res = await listModules(
        activeRun.id,
        modulePage,
        modulePageSize,
        moduleSearch,
        moduleSortBy
      );
      setModules(res.items);
      setTotalModules(res.total);
    } catch (err) {
      console.error("Failed to load modules:", err);
    } finally {
      setIsLoadingModules(false);
    }
  }, [activeRun, modulePage, modulePageSize, moduleSearch, moduleSortBy]);

  useEffect(() => {
    if (activeRun && activeTab === "modules") {
      fetchModules();
    }
  }, [activeRun, activeTab, fetchModules]);

  // 4. Load violations when activeTab is "violations" or filters change
  const fetchViolations = useCallback(async () => {
    if (!activeRun) return;
    setIsLoadingViolations(true);
    try {
      const res = await listViolations(
        activeRun.id,
        severityFilter,
        undefined,
        undefined,
        violationPage,
        violationPageSize
      );
      setViolations(res.items);
      setTotalViolations(res.total);
    } catch (err) {
      console.error("Failed to load violations:", err);
    } finally {
      setIsLoadingViolations(false);
    }
  }, [activeRun, severityFilter, violationPage, violationPageSize]);

  useEffect(() => {
    if (activeRun && activeTab === "violations") {
      fetchViolations();
    }
  }, [activeRun, activeTab, fetchViolations]);

  // 5. Load graph / cycles when activeTab is "cycles"
  const fetchGraph = useCallback(async () => {
    if (!activeRun) return;
    setIsLoadingGraph(true);
    try {
      const g = await getArchitectureGraph(activeRun.id);
      setGraph(g);
    } catch (err) {
      console.error("Failed to load architecture graph:", err);
    } finally {
      setIsLoadingGraph(false);
    }
  }, [activeRun]);

  useEffect(() => {
    if (activeRun && activeTab === "cycles" && !graph) {
      fetchGraph();
    }
  }, [activeRun, activeTab, graph, fetchGraph]);

  // 6. Load policy info when activeTab is "policy"
  const fetchPolicy = useCallback(async () => {
    setIsLoadingPolicy(true);
    try {
      const p = await getActivePolicy(repository.id, snapshot?.id);
      setPolicyInfo(p);
    } catch (err) {
      console.error("Failed to load architectural policy:", err);
    } finally {
      setIsLoadingPolicy(false);
    }
  }, [repository.id, snapshot?.id]);

  useEffect(() => {
    if (activeTab === "policy" && !policyInfo) {
      fetchPolicy();
    }
  }, [activeTab, policyInfo, fetchPolicy]);

  if (isLoadingRuns) {
    return <LoadingSpinner message="Loading architecture governance and coupling data..." />;
  }

  return (
    <div className="space-y-6">
      {/* Run Selection & Trigger Toolbar */}
      <div className="p-3.5 bg-surface-card border border-border-default rounded-lg shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent-subtle border border-accent-border text-accent shrink-0 shadow-xs">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-text-primary tracking-tight">
                Architecture Governance & Coupling
              </h2>
              {activeRun && (
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-surface-base text-text-secondary border border-border-default">
                  v1.0.0
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Module dependency resolution, Martin's coupling metrics (Ca, Ce, I, A, D), Tarjan's SCC cycles, and layer governance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {runs.length > 1 && (
            <div className="relative">
              <select
                value={selectedRunId || ""}
                onChange={(e) => setSelectedRunId(e.target.value)}
                aria-label="Select architecture analysis run"
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
            onClick={handleStartRun}
            disabled={isStartingRun || !snapshot || snapshot.status !== "completed"}
            leftIcon={
              isStartingRun ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )
            }
          >
            {isStartingRun ? "Analyzing Architecture..." : "Run Architecture Analysis"}
          </Button>
        </div>
      </div>

      {runError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-400 flex items-center gap-2 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{runError}</span>
        </div>
      )}

      {/* Main Content */}
      {!activeRun ? (
        <EmptyState
          icon={<Network className="w-6 h-6 text-accent" />}
          title="No Architecture Analysis Executed"
          description="Extract deterministic module dependency graphs, evaluate layer boundary rules from codesentinel.architecture.json, and inspect cyclic dependency clusters."
          actionLabel="Run Initial Architecture Analysis"
          onAction={handleStartRun}
        />
      ) : activeRun.status === "failed" ? (
        <div className="p-8 rounded-lg bg-surface-card border border-rose-500/40 text-center space-y-3 shadow-xs">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
          <h3 className="text-sm font-semibold text-text-primary">Architecture Run Failed</h3>
          <p className="text-xs text-text-muted max-w-md mx-auto">
            {activeRun.failure_reason || "Architecture extraction failed to complete."}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleStartRun}
          >
            Retry Analysis
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Summary Metric Cards */}
          <ArchitectureSummaryCards run={activeRun} />

          {/* Sub-tab Navigation */}
          <div className="flex items-center gap-6 border-b border-border-default text-xs font-medium">
            <button
              onClick={() => setActiveTab("modules")}
              className={`flex items-center gap-2 pb-2.5 transition-colors border-b-2 cursor-pointer ${
                activeTab === "modules"
                  ? "border-accent text-accent font-semibold"
                  : "border-transparent text-text-muted hover:text-text-primary"
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Modules & Coupling</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-surface-elevated text-text-secondary border border-border-default">
                {activeRun.modules_analyzed}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("violations")}
              className={`flex items-center gap-2 pb-2.5 transition-colors border-b-2 cursor-pointer ${
                activeTab === "violations"
                  ? "border-accent text-accent font-semibold"
                  : "border-transparent text-text-muted hover:text-text-primary"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Governance Violations</span>
              {activeRun.violations_count > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500/10 border border-rose-500/30 text-rose-400">
                  {activeRun.violations_count}
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-surface-elevated text-text-muted border border-border-default">
                  0
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("cycles")}
              className={`flex items-center gap-2 pb-2.5 transition-colors border-b-2 cursor-pointer ${
                activeTab === "cycles"
                  ? "border-accent text-accent font-semibold"
                  : "border-transparent text-text-muted hover:text-text-primary"
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Circular Dependencies</span>
              {activeRun.cycles_count > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500/10 border border-rose-500/30 text-rose-400">
                  {activeRun.cycles_count}
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-surface-elevated text-text-muted border border-border-default">
                  0
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("policy")}
              className={`flex items-center gap-2 pb-2.5 transition-colors border-b-2 cursor-pointer ${
                activeTab === "policy"
                  ? "border-accent text-accent font-semibold"
                  : "border-transparent text-text-muted hover:text-text-primary"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Architectural Policy</span>
              {activeRun.policy_configured ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  Configured
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-surface-elevated text-text-muted border border-border-default">
                  Default
                </span>
              )}
            </button>
          </div>

          {/* Tab 1: Modules Explorer */}
          {activeTab === "modules" && (
            <ModuleExplorerTable
              runId={activeRun.id}
              modules={modules}
              total={totalModules}
              page={modulePage}
              pageSize={modulePageSize}
              search={moduleSearch}
              sortBy={moduleSortBy}
              onPageChange={(p) => setModulePage(p)}
              onSearchChange={(s) => {
                setModuleSearch(s);
                setModulePage(1);
              }}
              onSortChange={(sort) => {
                setModuleSortBy(sort);
                setModulePage(1);
              }}
              isLoading={isLoadingModules}
            />
          )}

          {/* Tab 2: Violations */}
          {activeTab === "violations" && (
            <ArchitectureViolationsTable
              violations={violations}
              total={totalViolations}
              page={violationPage}
              pageSize={violationPageSize}
              severityFilter={severityFilter}
              onPageChange={(p) => setViolationPage(p)}
              onSeverityFilterChange={(sev) => {
                setSeverityFilter(sev);
                setViolationPage(1);
              }}
              isLoading={isLoadingViolations}
            />
          )}

          {/* Tab 3: Circular Dependencies */}
          {activeTab === "cycles" && (
            <div className="space-y-3">
              {isLoadingGraph ? (
                <div className="p-8 text-center bg-surface-card border border-border-default rounded-lg">
                  <LoadingSpinner message="Resolving circular dependency components..." />
                </div>
              ) : !graph || graph.cycles.length === 0 ? (
                <div className="p-10 bg-surface-card border border-border-default rounded-lg text-center space-y-2 shadow-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <h4 className="text-sm font-semibold text-text-primary">Zero Circular Dependencies Detected</h4>
                  <p className="text-xs text-text-muted max-w-md mx-auto">
                    The module dependency graph is a clean Directed Acyclic Graph (DAG) with no mutual recursion or cyclical coupling.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-text-secondary">
                    Found <strong className="text-rose-400 font-mono">{graph.cycles.length}</strong> strongly connected circular dependency cluster(s) via Tarjan's SCC algorithm:
                  </div>

                  {graph.cycles.map((cycle, idx) => {
                    const cycleModules = cycle.modules || [];
                    return (
                      <div
                        key={cycle.id || idx}
                        className="p-4 bg-surface-card border border-rose-500/30 rounded-lg space-y-2.5 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                            <RotateCw className="w-3.5 h-3.5 text-rose-400" />
                            Cycle #{idx + 1} ({cycleModules.length} modules involved)
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            TARJAN SCC CLUSTER
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
                          {cycleModules.map((modPath, mIdx) => (
                            <React.Fragment key={modPath}>
                              <span className="px-2 py-1 rounded bg-surface-base text-text-primary border border-border-default hover:border-accent transition-colors">
                                {modPath}
                              </span>
                              {mIdx < cycleModules.length - 1 && (
                                <span className="text-rose-400 font-bold">→</span>
                              )}
                            </React.Fragment>
                          ))}
                          <span className="text-rose-400 font-bold">↺</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Architectural Policy */}
          {activeTab === "policy" && (
            <div className="p-4 bg-surface-card border border-border-default rounded-lg space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <Layers className="w-4 h-4 text-accent" />
                    Governance Policy Configuration
                  </h4>
                  <p className="text-xs text-text-muted mt-0.5">
                    Defined via repository root file <code className="text-text-secondary">codesentinel.architecture.json</code>.
                  </p>
                </div>
                {policyInfo?.policy_configured ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Custom Policy Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-elevated text-text-muted border border-border-default">
                    Default Policy (No Config File)
                  </span>
                )}
              </div>

              {isLoadingPolicy ? (
                <div className="p-6 text-center text-xs text-text-muted">Loading policy details...</div>
              ) : (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-surface-base rounded-lg border border-border-default">
                      <span className="text-text-muted block mb-1">Configuration Path</span>
                      <code className="text-text-primary font-mono text-[11px] break-all">
                        {policyInfo?.policy_path || "codesentinel.architecture.json"}
                      </code>
                    </div>
                    <div className="p-3 bg-surface-base rounded-lg border border-border-default">
                      <span className="text-text-muted block mb-1">Defined Layers</span>
                      <strong className="text-text-primary font-mono text-sm">
                        {policyInfo?.policy?.layers ? policyInfo.policy.layers.length : 0}
                      </strong>
                    </div>
                    <div className="p-3 bg-surface-base rounded-lg border border-border-default">
                      <span className="text-text-muted block mb-1">Forbidden Rules</span>
                      <strong className="text-text-primary font-mono text-sm">
                        {policyInfo?.policy?.forbidden_dependencies ? policyInfo.policy.forbidden_dependencies.length : 0}
                      </strong>
                    </div>
                  </div>

                  {policyInfo?.policy?.layers && policyInfo.policy.layers.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-semibold text-text-secondary">Layer Hierarchy & Patterns:</span>
                      <div className="space-y-2">
                        {policyInfo.policy.layers.map((layer) => (
                          <div key={layer.name} className="p-3 bg-surface-base rounded-lg border border-border-default space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <strong className="text-accent font-mono">{layer.name}</strong>
                              <span className="text-[11px] text-text-muted font-mono">
                                patterns: {layer.patterns.join(", ")}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
