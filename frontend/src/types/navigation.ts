export type NavigationTab =
  | "overview"
  | "repositories"
  | "analysis"
  | "remediation"
  | "code-search"
  | "ai-assistant"
  | "settings";

export interface NavigationItem {
  id: NavigationTab;
  label: string;
  badge?: string;
  isComingSoon?: boolean;
}
