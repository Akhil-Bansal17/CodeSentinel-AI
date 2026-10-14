import React, { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Layers,
  Network,
  Play,
  RefreshCw,
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
    return (
      <div className="p-12 text-center bg-[#161b22] border border-[#30363d] rounded-lg">
        <RefreshCw className="w-8 h-8 text-sky-400 animate-spin mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-200">Loading Architecture History</h3>
        <p className="text-xs text-slate-400 mt-1">Retrieving module dependency graphs and governance assessments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Run Selection & Trigger Toolbar */}
      <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100">Architecture Governance & Coupling</h2>
              {activeRun && (
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#0d1117] text-slate-300 border border-[#30363d]">
                  v1.0.0
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Module dependency resolution, Martin's coupling metrics ($Ca, Ce, I, A, D$), Tarjan's SCC cycles, and layer governance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {runs.length > 1 && (
            <select
              value={selectedRunId || ""}
              onChange={(e) => setSelectedRunId(e.target.value)}
              className="px-2.5 py-1.5 rounded-md bg-[#0d1117] border border-[#30363d] text-xs text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {new Date(r.started_at).toLocaleString()} ({r.status})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleStartRun}
            disabled={isStartingRun || !snapshot || snapshot.status !== "completed"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {isStartingRun ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span>{isStartingRun ? "Analyzing..." : "Run Architecture Analysis"}</span>
          </button>
        </div>
      </div>

      {runError && (
        <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-md text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{runError}</span>
        </div>
      )}

      {/* Main Content */}
      {!activeRun ? (
        <div className="p-12 rounded-lg bg-[#161b22] border border-[#30363d] text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#0d1117] border border-[#30363d] flex items-center justify-center mx-auto text-sky-400">
            <Network className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">No Architecture Analysis Executed</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Extract deterministic module dependency graphs, evaluate layer boundary rules from
            <code className="text-slate-300 mx-1">codesentinel.architecture.json</code>,
            and inspect cyclic dependency clusters.
          </p>
          <button
            onClick={handleStartRun}
            disabled={!snapshot || snapshot.status !== "completed"}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run Initial Architecture Analysis</span>
          </button>
        </div>
      ) : activeRun.status === "failed" ? (
        <div className="p-8 rounded-lg bg-[#161b22] border border-rose-800/50 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-200">Architecture Run Failed</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {activeRun.failure_reason || "Architecture extraction failed to complete."}
          </p>
          <button
            onClick={handleStartRun}
            className="px-3 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-xs font-medium text-slate-200 border border-[#30363d] cursor-pointer"
          >
            Retry Analysis
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Summary Metric Cards */}
          <ArchitectureSummaryCards run={activeRun} />

          {/* Sub-tab Navigation */}
          <div className="flex items-center gap-2 border-b border-[#21262d] pt-2">
            <button
              onClick={() => setActiveTab("modules")}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === "modules"
                  ? "border-sky-500 text-sky-400 font-semibold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Modules & Coupling</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#21262d] text-slate-300">
                {activeRun.modules_analyzed}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("violations")}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === "violations"
                  ? "border-sky-500 text-sky-400 font-semibold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Governance Violations</span>
              {activeRun.violations_count > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-950 border border-rose-800 text-rose-300">
                  {activeRun.violations_count}
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#21262d] text-slate-400">
                  0
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("cycles")}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === "cycles"
                  ? "border-sky-500 text-sky-400 font-semibold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Circular Dependencies</span>
              {activeRun.cycles_count > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-950 border border-rose-800 text-rose-300">
                  {activeRun.cycles_count}
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#21262d] text-slate-400">
                  0
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("policy")}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === "policy"
                  ? "border-sky-500 text-sky-400 font-semibold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Architectural Policy</span>
              {activeRun.policy_configured ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-950 border border-emerald-800 text-emerald-300">
                  Configured
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#21262d] text-slate-400">
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
                <div className="p-8 text-center bg-[#161b22] border border-[#30363d] rounded-lg">
                  <RefreshCw className="w-6 h-6 text-sky-400 animate-spin mx-auto mb-2" />
                  <span className="text-xs text-slate-300">Resolving circular dependency components...</span>
                </div>
              ) : !graph || graph.cycles.length === 0 ? (
                <div className="p-10 bg-[#161b22] border border-[#30363d] rounded-lg text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <h4 className="text-sm font-semibold text-slate-200">Zero Circular Dependencies Detected</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    The module dependency graph is a clean Directed Acyclic Graph (DAG) with no mutual recursion or cyclical coupling.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-slate-300">
                    Found <strong className="text-rose-400 font-mono">{graph.cycles.length}</strong> strongly connected circular dependency cluster(s) via Tarjan's SCC algorithm:
                  </div>

                  {graph.cycles.map((cycle, idx) => {
                    const cycleModules = cycle.modules || [];
                    return (
                      <div
                        key={cycle.id || idx}
                        className="p-4 bg-[#161b22] border border-rose-800/40 rounded-lg space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                            <RotateCw className="w-3.5 h-3.5 text-rose-400" />
                            Cycle #{idx + 1} ({cycleModules.length} modules involved)
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-800/50">
                            TARJAN SCC CLUSTER
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
                          {cycleModules.map((modPath, mIdx) => (
                            <React.Fragment key={modPath}>
                              <span className="px-2 py-1 rounded bg-[#0d1117] text-slate-200 border border-[#30363d] hover:border-sky-500 transition-colors">
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
            <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-sky-400" />
                    Governance Policy Configuration
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Defined via repository root file <code className="text-slate-300">codesentinel.architecture.json</code>.
                  </p>
                </div>
                {policyInfo?.policy_configured ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/80">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Custom Policy Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    Default Policy (No Config File)
                  </span>
                )}
              </div>

              {isLoadingPolicy ? (
                <div className="p-6 text-center text-xs text-slate-400">Loading policy details...</div>
              ) : (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-[#0d1117] rounded border border-[#30363d]">
                      <span className="text-slate-400 block mb-1">Configuration Path</span>
                      <code className="text-slate-200 font-mono text-[11px] break-all">
                        {policyInfo?.policy_path || "codesentinel.architecture.json"}
                      </code>
                    </div>
                    <div className="p-3 bg-[#0d1117] rounded border border-[#30363d]">
                      <span className="text-slate-400 block mb-1">Defined Layers</span>
                      <strong className="text-slate-100 font-mono text-sm">
                        {policyInfo?.policy?.layers ? policyInfo.policy.layers.length : 0}
                      </strong>
                    </div>
                    <div className="p-3 bg-[#0d1117] rounded border border-[#30363d]">
                      <span className="text-slate-400 block mb-1">Forbidden Rules</span>
                      <strong className="text-slate-100 font-mono text-sm">
                        {policyInfo?.policy?.forbidden_dependencies ? policyInfo.policy.forbidden_dependencies.length : 0}
                      </strong>
                    </div>
                  </div>

                  {policyInfo?.policy?.layers && policyInfo.policy.layers.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-semibold text-slate-300">Layer Hierarchy & Patterns:</span>
                      <div className="space-y-2">
                        {policyInfo.policy.layers.map((layer) => (
                          <div key={layer.name} className="p-3 bg-[#0d1117] rounded border border-[#30363d] space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <strong className="text-sky-300 font-mono">{layer.name}</strong>
                              <span className="text-[11px] text-slate-400 font-mono">
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
