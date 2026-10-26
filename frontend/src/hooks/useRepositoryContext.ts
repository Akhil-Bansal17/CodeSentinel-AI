import { useContext } from "react";
import { RepositoryContext, RepositoryContextType } from "../context/RepositoryContext";

export function useRepositoryContext(): RepositoryContextType {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error("useRepositoryContext must be used within a RepositoryProvider");
  }
  return context;
}
