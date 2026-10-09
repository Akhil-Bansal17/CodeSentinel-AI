import React, { useState } from "react";
import { Folder, AlertCircle, Loader2 } from "lucide-react";
import { GithubIcon } from "../common/GithubIcon";
import { Modal } from "../common/Modal";

import { repositoryService } from "../../services/repositoryService";
import { Repository, RepositorySourceType } from "../../types/api";

interface AddRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (repository: Repository) => void;
}

export const AddRepositoryModal: React.FC<AddRepositoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [sourceType, setSourceType] = useState<RepositorySourceType>("github");
  const [githubUrl, setGithubUrl] = useState("");
  const [branch, setBranch] = useState("");
  const [localPath, setLocalPath] = useState("");
  const [customName, setCustomName] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetForm = () => {
    setGithubUrl("");
    setBranch("");
    setLocalPath("");
    setCustomName("");
    setErrorMessage(null);
    setLoading(false);
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (sourceType === "github") {
      const trimmed = githubUrl.trim();
      if (!trimmed) {
        setErrorMessage("Please enter a GitHub repository URL.");
        return;
      }
      if (!trimmed.toLowerCase().startsWith("https://github.com/")) {
        setErrorMessage("URL must start with 'https://github.com/'.");
        return;
      }
    } else {
      const trimmed = localPath.trim();
      if (!trimmed) {
        setErrorMessage("Please enter an absolute local directory path.");
        return;
      }
    }

    setLoading(true);

    try {
      const payload =
        sourceType === "github"
          ? {
              source_type: "github" as const,
              source_url: githubUrl.trim(),
              default_branch: branch.trim() || undefined,
            }
          : {
              source_type: "local" as const,
              local_path: localPath.trim(),
              name: customName.trim() || undefined,
              default_branch: branch.trim() || undefined,
            };

      const repo = await repositoryService.createAndIngestRepository(payload);
      resetForm();
      onSuccess(repo);
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to ingest repository. Please try again.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Analyze Repository — Phase 1 Roadmap"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Architecture Notice */}
        <div className="p-3 rounded-md bg-sky-950/30 border border-sky-800/50 flex items-start gap-2.5">
          <div className="text-xs text-sky-200 leading-relaxed">
            <span className="font-semibold block mb-0.5">Foundational Architecture In Place</span>
            Deterministic repository ingestion, safe file discovery, and snapshots are active in Phase 1.
          </div>
        </div>

        {/* Source Type Selector */}

        <div className="grid grid-cols-2 gap-2 p-1 bg-[#0d1117] rounded-lg border border-[#30363d]">
          <button
            type="button"
            onClick={() => {
              setSourceType("github");
              setErrorMessage(null);
            }}
            disabled={loading}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all ${
              sourceType === "github"
                ? "bg-[#21262d] text-white shadow-sm border border-[#30363d]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <GithubIcon className="w-3.5 h-3.5" />
            <span>Public GitHub</span>
          </button>


          <button
            type="button"
            onClick={() => {
              setSourceType("local");
              setErrorMessage(null);
            }}
            disabled={loading}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all ${
              sourceType === "local"
                ? "bg-[#21262d] text-white shadow-sm border border-[#30363d]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Local Directory</span>
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="p-3 rounded-md bg-rose-950/40 border border-rose-800/60 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-200 leading-relaxed break-words">{errorMessage}</div>
          </div>
        )}

        {/* GitHub Form Fields */}
        {sourceType === "github" ? (
          <div className="space-y-3">
            <div>
              <label htmlFor="github-url-input" className="block text-xs font-medium text-slate-300 mb-1">
                Repository URL <span className="text-rose-400">*</span>
              </label>
              <input
                id="github-url-input"
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                disabled={loading}
                placeholder="https://github.com/owner/repository"
                required
                className="w-full px-3 py-2 rounded-md bg-[#0d1117] border border-[#30363d] text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:opacity-50"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Accepts public repositories only. No passwords, SSH keys, or personal access tokens required.
              </p>
            </div>

            <div>
              <label htmlFor="github-branch-input" className="block text-xs font-medium text-slate-300 mb-1">
                Branch <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                id="github-branch-input"
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                disabled={loading}
                placeholder="main (auto-detected)"
                className="w-full px-3 py-2 rounded-md bg-[#0d1117] border border-[#30363d] text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:opacity-50"
              />
            </div>
          </div>
        ) : (
          /* Local Path Form Fields */
          <div className="space-y-3">
            <div>
              <label htmlFor="local-path-input" className="block text-xs font-medium text-slate-300 mb-1">
                Local Directory Path <span className="text-rose-400">*</span>
              </label>
              <input
                id="local-path-input"
                type="text"
                value={localPath}
                onChange={(e) => setLocalPath(e.target.value)}
                disabled={loading}
                placeholder="e.g. C:/Users/name/Projects/my-app or /workspace/my-app"
                required
                className="w-full px-3 py-2 rounded-md bg-[#0d1117] border border-[#30363d] text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:opacity-50"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Must be an absolute path inside the backend server's configured <code className="text-slate-300">LOCAL_REPOSITORY_ROOTS</code>.
              </p>
            </div>

            <div>
              <label htmlFor="local-name-input" className="block text-xs font-medium text-slate-300 mb-1">
                Display Name Override <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                id="local-name-input"
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                disabled={loading}
                placeholder="Defaults to directory name"
                className="w-full px-3 py-2 rounded-md bg-[#0d1117] border border-[#30363d] text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:opacity-50"
              />
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="pt-4 border-t border-[#21262d] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-slate-300 text-xs font-medium border border-[#30363d] transition-colors cursor-pointer disabled:opacity-50"
          >
            Understood
          </button>

          <button

            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Ingesting Repository...</span>
              </>
            ) : (
              <span>Start Ingestion</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
