import React, { useState } from "react";
import { Folder, AlertCircle, Loader2 } from "lucide-react";
import { GithubIcon } from "../common/GithubIcon";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { repositoryService } from "../../services/repositoryService";
import { Repository, RepositorySourceType } from "../../types/api";

export interface AddRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (repository: Repository) => void;
  title?: string;
}

export const AddRepositoryModal: React.FC<AddRepositoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = "Connect Repository",
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

    // Form input validation
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
      title={title}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Architecture Notice */}
        <div className="p-3 rounded-md bg-accent-subtle border border-accent-border flex items-start gap-2.5">
          <div className="text-xs text-text-secondary leading-relaxed">
            <span className="font-semibold text-text-primary block mb-0.5">
              Foundational Architecture In Place
            </span>
            Deterministic repository ingestion, safe file discovery, and snapshots are active in the console.
          </div>
        </div>

        {/* Source Type Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-surface-base rounded-lg border border-border-default">
          <button
            type="button"
            onClick={() => {
              setSourceType("github");
              setErrorMessage(null);
            }}
            disabled={loading}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all ${
              sourceType === "github"
                ? "bg-surface-elevated text-text-primary shadow-xs border border-border-strong font-semibold"
                : "text-text-muted hover:text-text-secondary"
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
                ? "bg-surface-elevated text-text-primary shadow-xs border border-border-strong font-semibold"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Local Directory</span>
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="p-3 rounded-md bg-danger-bg border border-danger-border flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <div className="text-xs text-danger-text leading-relaxed break-words">{errorMessage}</div>
          </div>
        )}

        {/* GitHub Form Fields */}
        {sourceType === "github" ? (
          <div className="space-y-3">
            <div>
              <label htmlFor="github-url-input" className="block text-xs font-medium text-text-secondary mb-1">
                Repository URL <span className="text-danger">*</span>
              </label>
              <input
                id="github-url-input"
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                disabled={loading}
                placeholder="https://github.com/owner/repository"
                required
                className="w-full px-3 py-2 rounded-md bg-surface-base border border-border-default text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-accent disabled:opacity-50"
              />
              <p className="text-[11px] text-text-muted mt-1">
                Accepts public repositories only. No passwords, SSH keys, or personal access tokens required.
              </p>
            </div>

            <div>
              <label htmlFor="github-branch-input" className="block text-xs font-medium text-text-secondary mb-1">
                Branch <span className="text-text-muted font-normal">(Optional)</span>
              </label>
              <input
                id="github-branch-input"
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                disabled={loading}
                placeholder="main (auto-detected)"
                className="w-full px-3 py-2 rounded-md bg-surface-base border border-border-default text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-accent disabled:opacity-50"
              />
            </div>
          </div>
        ) : (
          /* Local Path Form Fields */
          <div className="space-y-3">
            <div>
              <label htmlFor="local-path-input" className="block text-xs font-medium text-text-secondary mb-1">
                Local Directory Path <span className="text-danger">*</span>
              </label>
              <input
                id="local-path-input"
                type="text"
                value={localPath}
                onChange={(e) => setLocalPath(e.target.value)}
                disabled={loading}
                placeholder="e.g. C:/Users/name/Projects/my-app or /workspace/my-app"
                required
                className="w-full px-3 py-2 rounded-md bg-surface-base border border-border-default text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-accent disabled:opacity-50"
              />
              <p className="text-[11px] text-text-muted mt-1">
                Must be an absolute path inside the backend server's configured <code className="text-text-secondary bg-surface-base px-1 py-0.5 rounded border border-border-subtle">LOCAL_REPOSITORY_ROOTS</code>.
              </p>
            </div>

            <div>
              <label htmlFor="local-name-input" className="block text-xs font-medium text-text-secondary mb-1">
                Display Name Override <span className="text-text-muted font-normal">(Optional)</span>
              </label>
              <input
                id="local-name-input"
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                disabled={loading}
                placeholder="Defaults to directory name"
                className="w-full px-3 py-2 rounded-md bg-surface-base border border-border-default text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-accent disabled:opacity-50"
              />
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="pt-4 border-t border-border-default flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleClose}
            disabled={loading}
          >
            Understood
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={loading}
            leftIcon={loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : undefined}
          >
            {loading ? "Ingesting Repository..." : "Start Ingestion"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
