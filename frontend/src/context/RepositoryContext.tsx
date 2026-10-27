import React, { createContext, useState, useEffect, useCallback, useMemo } from "react";
import { Repository } from "../types/api";
import { repositoryService } from "../services/repositoryService";

export interface RepositoryContextType {
  repositories: Repository[];
  selectedRepoId: string | null;
  selectedRepo: Repository | null;
  isLoadingRepos: boolean;
  repoError: string | null;
  setSelectedRepoId: (repoId: string | null) => void;
  refetchRepositories: () => Promise<void>;
}

export const RepositoryContext = createContext<RepositoryContextType | undefined>(undefined);

const STORAGE_KEY = "codesentinel_selected_repo_id";

export const RepositoryProvider: React.FC<{
  children: React.ReactNode;
  initialRepoId?: string | null;
}> = ({ children, initialRepoId }) => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoIdState] = useState<string | null>(() => {
    if (initialRepoId) return initialRepoId;
    try {
      return sessionStorage.getItem(STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });
  const [isLoadingRepos, setIsLoadingRepos] = useState<boolean>(true);
  const [repoError, setRepoError] = useState<string | null>(null);

  const fetchRepositories = useCallback(async () => {
    setIsLoadingRepos(true);
    setRepoError(null);
    try {
      const response = await repositoryService.listRepositories(1, 50);
      const items = Array.isArray(response?.items) ? response.items : [];
      setRepositories(items);

      setSelectedRepoIdState((currentId) => {
        // If current selection is valid, keep it
        if (currentId && items.some((r) => r.id === currentId)) {
          return currentId;
        }
        // If items exist, default to the first one
        if (items.length > 0) {
          const defaultId = items[0].id;
          try {
            sessionStorage.setItem(STORAGE_KEY, defaultId);
          } catch {
            // Ignore storage errors
          }
          return defaultId;
        }
        // If list is empty, reset selection
        try {
          sessionStorage.removeItem(STORAGE_KEY);
        } catch {
          // Ignore storage errors
        }
        return null;
      });
    } catch (err: unknown) {
      setRepoError(err instanceof Error ? err.message : "Failed to load repositories.");
    } finally {
      setIsLoadingRepos(false);
    }
  }, []);

  useEffect(() => {
    fetchRepositories();
  }, [fetchRepositories]);

  const setSelectedRepoId = useCallback((repoId: string | null) => {
    setSelectedRepoIdState(repoId);
    try {
      if (repoId) {
        sessionStorage.setItem(STORAGE_KEY, repoId);
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const selectedRepo = useMemo(() => {
    if (!selectedRepoId) return null;
    return repositories.find((r) => r.id === selectedRepoId) || null;
  }, [repositories, selectedRepoId]);

  const value = useMemo(
    () => ({
      repositories,
      selectedRepoId,
      selectedRepo,
      isLoadingRepos,
      repoError,
      setSelectedRepoId,
      refetchRepositories: fetchRepositories,
    }),
    [repositories, selectedRepoId, selectedRepo, isLoadingRepos, repoError, setSelectedRepoId, fetchRepositories]
  );

  return <RepositoryContext.Provider value={value}>{children}</RepositoryContext.Provider>;
};

export { useRepositoryContext } from "../hooks/useRepositoryContext";
