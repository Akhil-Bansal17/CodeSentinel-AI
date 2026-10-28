import React, { useState, useEffect, useCallback } from "react";
import { Search, Filter, ShieldCheck, ChevronRight, FileCode, Shield, RotateCcw } from "lucide-react";
import { AnalysisFinding, FindingSeverity, FindingConfidence } from "../../types/analysis";
import { analysisService } from "../../services/analysisService";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { ErrorState } from "../common/ErrorState";
import { FindingDetailModal } from "./FindingDetailModal";

interface FindingsTableProps {
  analysisId: string;
}

const SEVERITY_BADGES: Record<FindingSeverity, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: "bg-danger-bg", text: "text-danger-text", border: "border-danger-border" },
  HIGH: { bg: "bg-warning-bg", text: "text-warning-text", border: "border-warning-border" },
  MEDIUM: { bg: "bg-amber-500/10", text: "text-amber-300", border: "border-amber-500/30" },
  LOW: { bg: "bg-info-bg", text: "text-info-text", border: "border-info-border" },
  INFO: { bg: "bg-surface-hover", text: "text-text-muted", border: "border-border-default" },
};

const CONFIDENCE_BADGES: Record<FindingConfidence, { bg: string; text: string; border: string }> = {
  HIGH: { bg: "bg-success-bg", text: "text-success-text", border: "border-success-border" },
  MEDIUM: { bg: "bg-warning-bg", text: "text-warning-text", border: "border-warning-border" },
  LOW: { bg: "bg-surface-hover", text: "text-text-muted", border: "border-border-default" },
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
  const hasActiveFilters = Boolean(searchPath || selectedSeverity || selectedConfidence || selectedCategory);

  const handleResetFilters = () => {
    setSearchPath("");
    setSelectedSeverity("");
    setSelectedConfidence("");
    setSelectedCategory("");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-surface-card border border-border-default shadow-xs">
        <div>
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Filter className="w-4 h-4 text-accent" />
            Static Analysis & Security Findings
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Showing {totalFindings} deterministic findings matching current filters
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* File path filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-text-disabled absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchPath}
              onChange={(e) => {
                setSearchPath(e.target.value);
                setPage(1);
              }}
              placeholder="Filter file path..."
              className="pl-8 pr-3 py-1.5 rounded-md bg-surface-base border border-border-default text-xs font-mono text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Severity filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => {
              setSelectedSeverity(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-md bg-surface-base border border-border-default text-xs text-text-primary focus:outline-none focus:border-accent transition-colors"
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
            className="px-2.5 py-1.5 rounded-md bg-surface-base border border-border-default text-xs text-text-primary focus:outline-none focus:border-accent transition-colors"
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
            className="px-2.5 py-1.5 rounded-md bg-surface-base border border-border-default text-xs text-text-primary focus:outline-none focus:border-accent transition-colors"
          >
            <option value="">All Categories</option>
            <option value="SECURITY">Security</option>
            <option value="COMPLEXITY">Complexity</option>
            <option value="MAINTAINABILITY">Maintainability</option>
            <option value="CODE_SMELL">Code Smell</option>
            <option value="SYNTAX">Syntax</option>
          </select>

          {/* Reset Filters CTA */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-surface-hover hover:bg-surface-active text-text-secondary text-xs font-medium border border-border-default transition-colors cursor-pointer"
              title="Reset all active filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="rounded-lg bg-surface-card border border-border-default overflow-hidden shadow-xs">
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
            <ShieldCheck className="w-8 h-8 text-success mx-auto" />
            <h4 className="text-sm font-semibold text-text-primary">No Findings Detected</h4>
            <p className="text-xs text-text-muted max-w-md mx-auto">
              No issues matched the active filters. Note: Zero findings does not imply the codebase is fully secure; the analysis covers documented deterministic rules only.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-default text-text-muted bg-surface-base font-mono uppercase text-[11px]">
                  <th className="py-2.5 px-4 font-medium">Severity</th>
                  <th className="py-2.5 px-4 font-medium">Confidence</th>
                  <th className="py-2.5 px-4 font-medium">Rule</th>
                  <th className="py-2.5 px-4 font-medium">Title & Location</th>
                  <th className="py-2.5 px-4 font-medium">Category</th>
                  <th className="py-2.5 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {findings.map((f) => {
                  const sevStyle = SEVERITY_BADGES[f.severity] || SEVERITY_BADGES.INFO;
                  const conf = f.confidence || "MEDIUM";
                  const confStyle = CONFIDENCE_BADGES[conf] || CONFIDENCE_BADGES.MEDIUM;
                  return (
                    <tr
                      key={f.id}
                      onClick={() => setSelectedFinding(f)}
                      className="hover:bg-surface-hover/70 transition-colors cursor-pointer group"
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
                        <code className="text-[11px] font-mono text-accent bg-accent-subtle px-1.5 py-0.5 rounded border border-accent-border">
                          {f.rule_id}
                        </code>
                      </td>

                      {/* Title & Location */}
                      <td className="py-2.5 px-4 space-y-0.5 max-w-md">
                        <div className="font-semibold text-text-primary group-hover:text-accent transition-colors truncate flex items-center gap-1.5">
                          {f.category === "SECURITY" && (
                            <Shield className="w-3.5 h-3.5 text-warning shrink-0" />
                          )}
                          <span className="truncate">{f.title}</span>
                        </div>
                        <div className="font-mono text-[11px] text-text-muted flex items-center gap-1 truncate">
                          <FileCode className="w-3 h-3 text-text-disabled shrink-0" />
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
                              ? "bg-danger-bg border-danger-border text-danger-text"
                              : "bg-surface-base border-border-default text-text-secondary"
                          }`}
                        >
                          {f.category}
                        </span>
                      </td>

                      {/* View Detail link */}
                      <td className="py-2.5 px-4 whitespace-nowrap text-right text-text-muted group-hover:text-text-primary">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFinding(f);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-accent hover:text-accent-hover hover:underline cursor-pointer font-medium"
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
          <div className="flex items-center justify-between p-3 border-t border-border-default text-xs text-text-muted bg-surface-base">
            <div>
              Showing {Math.min((page - 1) * pageSize + 1, totalFindings)} to{" "}
              {Math.min(page * pageSize, totalFindings)} of {totalFindings} findings
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-2.5 py-1 rounded bg-surface-card hover:bg-surface-hover text-text-primary border border-border-default disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                Previous
              </button>
              <span className="text-text-primary font-mono">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="px-2.5 py-1 rounded bg-surface-card hover:bg-surface-hover text-text-primary border border-border-default disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
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
