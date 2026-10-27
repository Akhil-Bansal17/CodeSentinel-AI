import React, { useState } from "react";
import { ArrowLeft, RotateCw, Trash2, Folder, Code2, Clock, ExternalLink } from "lucide-react";
import { GithubIcon } from "../common/GithubIcon";
import { StatusBadge } from "../common/StatusBadge";
import { Button } from "../common/Button";
import { Repository } from "../../types/api";
import { repositoryService } from "../../services/repositoryService";

export interface RepositoryHeaderProps {
  repository: Repository;
  onBack: () => void;
  onRepositoryUpdated: (updated: Repository) => void;
  onRepositoryDeleted: (deletedId: string) => void;
}

export const RepositoryHeader: React.FC<RepositoryHeaderProps> = ({
  repository,
  onBack,
  onRepositoryUpdated,
  onRepositoryDeleted,
}) => {
  const [isReingesting, setIsReingesting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleReingest = async () => {
    if (repository.source_type === "local") {
      setActionError("To re-ingest a local repository, please connect it again with its directory path.");
      return;
    }
    setIsReingesting(true);
    setActionError(null);
    try {
      const updated = await repositoryService.reingestRepository(repository.id);
      onRepositoryUpdated(updated);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to re-ingest repository.");
    } finally {
      setIsReingesting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to remove '${repository.name}' from CodeSentinel AI?`)) {
      return;
    }
    setIsDeleting(true);
    setActionError(null);
    try {
      await repositoryService.deleteRepository(repository.id);
      onRepositoryDeleted(repository.id);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to delete repository.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-5 border-b border-border-default">
      {/* Navigation and Actions Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
          className="text-text-muted hover:text-text-primary px-2"
        >
          Back to Repositories
        </Button>

        <div className="flex items-center gap-2">
          {repository.source_type === "github" && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleReingest}
              disabled={isReingesting || repository.status === "processing"}
              leftIcon={<RotateCw className={`w-3.5 h-3.5 ${isReingesting ? "animate-spin" : ""}`} />}
            >
              {isReingesting ? "Re-ingesting..." : "Re-ingest"}
            </Button>
          )}

          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>

      {actionError && (
        <div className="p-3 rounded-md bg-danger-bg border border-danger-border text-xs text-danger-text flex items-center justify-between">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-xs text-danger-text hover:underline ml-2 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Identity & Metadata Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
            {repository.name}
          </h1>

          {repository.source_type === "github" ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-medium bg-surface-elevated text-text-secondary border border-border-default">
              <GithubIcon className="w-3.5 h-3.5 text-text-secondary" />
              GitHub
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-medium bg-surface-elevated text-text-secondary border border-border-default">
              <Folder className="w-3.5 h-3.5 text-amber-400" />
              Local Directory
            </span>
          )}

          <StatusBadge
            label={repository.status}
            variant={
              repository.status === "completed"
                ? "success"
                : repository.status === "failed"
                ? "danger"
                : "warning"
            }
          />
        </div>

        <div className="flex items-center gap-x-5 gap-y-1.5 text-xs text-text-muted flex-wrap">
          {repository.source_url && (
            <a
              href={repository.source_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-text-secondary hover:text-accent transition-colors underline underline-offset-2"
            >
              <span>{repository.source_url}</span>
              <ExternalLink className="w-3 h-3 text-text-muted" />
            </a>
          )}
          {repository.default_branch && (
            <span className="flex items-center gap-1.5 font-mono">
              <Code2 className="w-3.5 h-3.5 text-text-muted" />
              Branch: <span className="text-text-secondary">{repository.default_branch}</span>
            </span>
          )}
          {repository.last_ingested_at && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-text-muted" />
              Last ingested:{" "}
              <span className="text-text-secondary">
                {new Date(repository.last_ingested_at).toLocaleString()}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
