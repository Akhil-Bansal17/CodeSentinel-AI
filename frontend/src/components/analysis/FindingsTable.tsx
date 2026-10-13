import React, { useState, useEffect, useCallback } from "react";
import { Search, Filter, ShieldCheck, ChevronRight, FileCode, Shield } from "lucide-react";
import { AnalysisFinding, FindingSeverity, FindingConfidence } from "../../types/analysis";
import { analysisService } from "../../services/analysisService";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { ErrorState } from "../common/ErrorState";
import { FindingDetailModal } from "./FindingDetailModal";

interface FindingsTableProps {
  analysisId: string;
}

const SEVERITY_BADGES: Record<FindingSeverity, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: "bg-rose-950/60", text: "text-rose-300", border: "border-rose-800" },
  HIGH: { bg: "bg-orange-950/60", text: "text-orange-300", border: "border-orange-800" },
  MEDIUM: { bg: "bg-amber-950/60", text: "text-amber-300", border: "border-amber-800" },
  LOW: { bg: "bg-sky-950/60", text: "text-sky-300", border: "border-sky-800" },
  INFO: { bg: "bg-slate-800", text: "text-slate-300", border: "border-slate-700" },
};

const CONFIDENCE_BADGES: Record<FindingConfidence, { bg: string; text: string; border: string }> = {
  HIGH: { bg: "bg-emerald-950/60", text: "text-emerald-300", border: "border-emerald-800" },
  MEDIUM: { bg: "bg-amber-950/60", text: "text-amber-300", border: "border-amber-800" },
  LOW: { bg: "bg-slate-800", text: "text-slate-400", border: "border-slate-700" },
};

export const FindingsTable: React.FC<FindingsTableProps> = ({ analysisId }) => {
  const [findings, setFindings] = useState<AnalysisFinding[]>([]);
  const [totalFindings, setTotalFindings] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const [searchPath, setSearchPath] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("");
  const [selectedConfidence, setSelectedConfidence] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedFinding, setSelectedFinding] = useState<AnalysisFinding | null>(null);

  const loadFindings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analysisService.listFindings(analysisId, {
        page,
        pageSize,
        filePath: searchPath.trim() || undefined,
        severity: selectedSeverity || undefined,
        confidence: selectedConfidence || undefined,
        category: selectedCategory || undefined,
      });
      setFindings(res.items);
      setTotalFindings(res.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load static analysis findings.");
    } finally {
      setLoading(false);
    }
  }, [analysisId, page, pageSize, searchPath, selectedSeverity, selectedConfidence, selectedCategory]);

  useEffect(() => {
    let isCancelled = false;

    async function fetchAsync() {
      try {
        const res = await analysisService.listFindings(analysisId, {
          page,
          pageSize,
          filePath: searchPath.trim() || undefined,
          severity: selectedSeverity || undefined,
          confidence: selectedConfidence || undefined,
          category: selectedCategory || undefined,
        });
        if (isCancelled) return;
        setFindings(res.items);
        setTotalFindings(res.total);
      } catch (err: unknown) {
        if (isCancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load static analysis findings.");
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchAsync();

    return () => {
      isCancelled = true;
    };
  }, [analysisId, page, pageSize, searchPath, selectedSeverity, selectedConfidence, selectedCategory]);

  const totalPages = Math.ceil(totalFindings / pageSize) || 1;

  return (
    <div className="space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-[#161b22] border border-[#30363d]">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Filter className="w-4 h-4 text-sky-400" />
            Static Analysis & Security Findings
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Showing {totalFindings} deterministic findings matching current filters
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* File path filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchPath}
              onChange={(e) => {
                setSearchPath(e.target.value);
                setPage(1);
              }}
              placeholder="Filter file path..."
              className="pl-8 pr-3 py-1.5 rounded-md bg-[#0d1117] border border-[#30363d] text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Severity filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => {
              setSelectedSeverity(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-md bg-[#0d1117] border border-[#30363d] text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="INFO">Info</option>
          </select>

          {/* Confidence filter */}
          <select
            value={selectedConfidence}
            onChange={(e) => {
              setSelectedConfidence(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-md bg-[#0d1117] border border-[#30363d] text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Confidences</option>
            <option value="HIGH">High Confidence</option>
            <option value="MEDIUM">Medium Confidence</option>
            <option value="LOW">Low Confidence</option>
          </select>

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-md bg-[#0d1117] border border-[#30363d] text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Categories</option>
            <option value="SECURITY">Security</option>
            <option value="COMPLEXITY">Complexity</option>
            <option value="MAINTAINABILITY">Maintainability</option>
            <option value="CODE_SMELL">Code Smell</option>
            <option value="SYNTAX">Syntax</option>
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="rounded-lg bg-[#161b22] border border-[#30363d] overflow-hidden">
        {loading ? (
          <div className="p-8">
            <LoadingSpinner message="Loading findings..." />
          </div>
        ) : error ? (
          <div className="p-6">
            <ErrorState title="Error Loading Findings" message={error} onRetry={loadFindings} />
          </div>
        ) : findings.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-200">No Findings Detected</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No issues matched the active filters. Note: Zero findings does not imply the codebase is fully secure; the analysis covers documented deterministic rules only.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#21262d] text-slate-400 bg-[#0d1117]">
                  <th className="py-2.5 px-4 font-medium">Severity</th>
                  <th className="py-2.5 px-4 font-medium">Confidence</th>
                  <th className="py-2.5 px-4 font-medium">Rule</th>
                  <th className="py-2.5 px-4 font-medium">Title & Location</th>
                  <th className="py-2.5 px-4 font-medium">Category</th>
                  <th className="py-2.5 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#21262d]">
                {findings.map((f) => {
                  const sevStyle = SEVERITY_BADGES[f.severity] || SEVERITY_BADGES.INFO;
                  const conf = f.confidence || "MEDIUM";
                  const confStyle = CONFIDENCE_BADGES[conf] || CONFIDENCE_BADGES.MEDIUM;
                  return (
                    <tr
                      key={f.id}
                      onClick={() => setSelectedFinding(f)}
                      className="hover:bg-[#1f242c] transition-colors cursor-pointer group"
                    >
                      {/* Severity */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${sevStyle.bg} ${sevStyle.text} ${sevStyle.border}`}
                        >
                          {f.severity}
                        </span>
                      </td>

                      {/* Confidence */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${confStyle.bg} ${confStyle.text} ${confStyle.border}`}
                        >
                          {conf}
                        </span>
                      </td>

                      {/* Rule ID */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <code className="text-[11px] font-mono text-sky-300 bg-sky-950/40 px-1.5 py-0.5 rounded border border-sky-800/60">
                          {f.rule_id}
                        </code>
                      </td>

                      {/* Title & Location */}
                      <td className="py-2.5 px-4 space-y-0.5 max-w-md">
                        <div className="font-semibold text-slate-200 group-hover:text-sky-300 transition-colors truncate flex items-center gap-1.5">
                          {f.category === "SECURITY" && (
                            <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                          <span className="truncate">{f.title}</span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-400 flex items-center gap-1 truncate">
                          <FileCode className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>
                            {f.file_path}:{f.start_line}
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                            f.category === "SECURITY"
                              ? "bg-rose-950/40 border-rose-800/60 text-rose-300"
                              : "bg-[#0d1117] border-[#30363d] text-slate-300"
                          }`}
                        >
                          {f.category}
                        </span>
                      </td>

                      {/* View Detail link */}
                      <td className="py-2.5 px-4 whitespace-nowrap text-right text-slate-400 group-hover:text-slate-200">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFinding(f);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 hover:underline cursor-pointer"
                        >
                          Inspect <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-[#21262d] text-xs text-slate-400 bg-[#0d1117]">
            <div>
              Showing {Math.min((page - 1) * pageSize + 1, totalFindings)} to{" "}
              {Math.min(page * pageSize, totalFindings)} of {totalFindings} findings
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-slate-200 border border-[#30363d] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>
              <span className="text-slate-300 font-mono">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-slate-200 border border-[#30363d] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Inspection Modal */}
      <FindingDetailModal finding={selectedFinding} onClose={() => setSelectedFinding(null)} />
    </div>
  );
};
