# CodeSentinel AI — Repositories Portfolio & Repository Detail Architecture

**Document Reference:** `docs/architecture/17-ui-repositories-portfolio-and-detail.md`  
**Phase:** Phase 4 — Repositories Portfolio & Repository Detail Architecture  
**Status:** Certified & Implemented  
**Date:** October 2026  
**Visual Identity:** *Obsidian Sentinel — High-Precision Engineering Console*

---

## 1. Executive Summary & Architecture Objectives

Phase 4 transforms the repositories portfolio and repository detail experience into a high-precision, cohesive engineering console. The previous implementation suffered from legacy GitHub dark-mode colors (`#161b22`, `#30363d`), stale roadmap status badges (`Phase 1 Active`), lack of real-time search/filter capabilities across loaded repositories, and a monolithic 911-line `RepositoryDetailView.tsx` component that mingled file explorer pagination, static analysis triggers, and subview state.

This phase accomplishes:
1. **Repositories Portfolio Redesign**: Re-architected `RepositoriesPage.tsx` using Obsidian Sentinel design tokens (`#09090b` canvas, `#18181b` cards, `#27272a` borders, `#6366f1` indigo accents), adding real-time client-side search, source filtering (GitHub vs Local Directory), status filtering, real repository count indicators, and responsive card layouts.
2. **Add Repository Modal Modernization**: Upgraded `AddRepositoryModal.tsx` using Phase 2 `Modal` and form primitives, truthful submission states with duplicate-submission prevention, and accessible segmented controls for Public GitHub vs Local Directory sources.
3. **Repository Detail Decomposition**: Refactored `RepositoryDetailView.tsx` from 911 lines into a clean, modular orchestrator with decoupled subcomponents (`RepositoryHeader.tsx`, `RepositoryOverviewTab.tsx`, `RepositoryAnalysisTab.tsx`) while preserving all 5 existing subviews (*Files & Structure*, *Static Analysis*, *Dependencies & SCA*, *Architecture & Coupling*, *Codebase Health*) and embedding *CI/CD & Audits*.
4. **Subnavigation via Design System Primitives**: Utilized the Phase 2 `Tabs` component with full keyboard navigation (`ArrowRight`, `ArrowLeft`), active tab indicators, and responsive horizontal scrolling.
5. **Global Repository Context Synchronization**: Maintained bidirectional synchronization between `RepositoriesPage`, `RepositoryDetailView`, and `RepositoryContext` (`useRepositoryContext`), ensuring selection updates the global header selector without stale data.

---

## 2. Repositories Portfolio Redesign (`RepositoriesPage.tsx`)

### Layout & Page Hierarchy
- **Header Console**:
  - Technical title: `Repositories`
  - Total count badge: Real repository count derived from loaded API items (`repositories.length`), formatted using `Badge variant="neutral"`.
  - Stale roadmap badges removed: Eliminated legacy `StatusBadge label="Phase 1 Active"`.
  - Primary CTA: `<Button variant="primary" size="sm" onClick={onAnalyzeClick} leftIcon={<Plus className="w-3.5 h-3.5" />}>Connect Repository</Button>`.
- **Search & Filter Toolbar**:
  - **Search Input**: Live filtering by repository name, branch, and source identifier with a clear (`X`) button.
  - **Source Type Filter**: Dropdown allowing users to switch between "All Sources", "GitHub", and "Local Directory".
  - **Status Filter**: Dropdown allowing filtering by "All Statuses", "Completed", "Processing", "Pending", and "Failed".
  - **Filter Feedback**: Clear "Reset Filters" action when active; renders a dedicated empty state when no repositories match the filter criteria without losing the underlying data.
- **Repository Presentation**:
  - Displays genuine metadata fields from the backend:
    - Repository name with hover accent highlight (`group-hover:text-accent`).
    - Source icon (GitHub icon vs Folder icon for local directories).
    - Default branch tag (`repo.default_branch || "main"`).
    - Ingestion status (`StatusBadge` mapping `completed`, `failed`, `processing`, `pending`).
    - File discovery metrics: total files, source files count, calculated LOC (only when genuinely supplied in snapshot).
    - Last ingested timestamp formatted with localized date strings.
    - Top languages pills: sorted descending by file count, displaying percentage and language name.
    - "View Details" callout with interactive chevron transition (`group-hover:translate-x-0.5`).
- **Resilience States**:
  - **Loading**: High-precision `LoadingSpinner` with accessible `aria-busy` and `sr-only` descriptions.
  - **Empty State**: Phase 2 `EmptyState` with `GitFork` icon and "Connect First Repository" CTA.
  - **Error & Backend Unavailable**: Integrated `ErrorState` and `BackendUnavailableState` with automatic retry bindings.

---

## 3. Add Repository Workflow (`AddRepositoryModal.tsx`)

### Modal Architecture & User Experience
- **Modal Wrapper**: Built on Phase 2 `Modal` primitive with accessible dialog semantics (`role="dialog"`, `aria-modal="true"`, focus trap, escape key handling, outside click dismissal).
- **Modernized Title**: Changed from stale legacy `Analyze Repository — Phase 1 Roadmap` to `Connect Repository`.
- **Segmented Source Selector**:
  - High-contrast toggle between **Public GitHub** and **Local Directory** with icons and active surface elevation.
- **Truthful Submission & Anti-Duplicate Handling**:
  - When submission begins, `loading` state disables all form inputs, tab switchers, the cancel button, and the submit button.
  - Submit button transitions from `Start Ingestion` to `<Loader2 className="w-3.5 h-3.5 animate-spin" /> Ingesting Repository...`.
  - No fabricated progress percentages or animated fake progress bars; truthfully reflects network/API state.
- **Input Validation & Feedback**:
  - GitHub URLs strictly validated to ensure `https://github.com/` prefix before sending requests.
  - Local paths strictly validated for non-empty input; helpful helper text explains `LOCAL_REPOSITORY_ROOTS` server requirement.
  - High-contrast error banner rendered with `AlertCircle` and `bg-danger-bg`/`border-danger-border` tokens upon API failures.

---

## 4. Repository Detail Architecture & Decomposition

### Component Refactoring Rationale
The original `RepositoryDetailView.tsx` exceeded 910 lines, combining header controls, re-ingest/delete mutations, overview metric cards, language breakdown, file explorer tables with pagination, and static analysis triggers in a single component.

To maintain single-responsibility separation without altering runtime behavior or component contracts, the file was refactored into three focused modules:

```
frontend/src/components/repository/
├── AddRepositoryModal.tsx         # Ingestion dialog
├── RepositoryDetailView.tsx       # Subview orchestrator (~140 lines)
├── RepositoryHeader.tsx           # Context header, identity, re-ingest & delete actions (~150 lines)
├── RepositoryOverviewTab.tsx      # Overview metrics, language distribution, file explorer (~350 lines)
└── RepositoryAnalysisTab.tsx      # Static analysis execution, run selector, findings table (~180 lines)
```

### Subviews Preserved & Embedded

| Subview Key | Tab Label | Icon | Component / Responsibilities |
| :--- | :--- | :--- | :--- |
| `overview` | Files & Structure | `FolderTree` | Metrics cards (total files, source files, LOC, size, directories), visual language bar, top directories, largest files, and safe file explorer with pagination and search. |
| `analysis` | Static Analysis | `ShieldAlert` | Deterministic static analysis trigger, run selector, `AnalysisSummaryCards`, and `FindingsTable`. |
| `dependencies`| Dependencies & SCA | `Package` | `DependencyView` embedding dependency inventory, direct/transitive separation, and security advisory correlation. |
| `architecture`| Architecture & Coupling | `Network` | `ArchitectureView` embedding module explorer, dependency graph, cycle detection, and governance violation tables. |
| `health` | Codebase Health | `Activity` | `CodebaseHealthDashboard` calculating multidimensional health score across architecture, maintainability, and security. |
| `cicd` | CI/CD & Audits | `GitBranch` | Embedded `CiCdAuditPage` scoped to the current repository (`initialRepoId={repository.id}`) for workflow generation, audit runs, and PR synthesis. |

### Subnavigation Primitives
The subnavigation bar employs Phase 2 `Tabs` with `variant="underline"` and `size="sm"`. `TabsProps` was extended with an optional `buttonRole?: "tab" | "button"` parameter (defaulting to `"tab"`). Using `buttonRole="button"` in `RepositoryDetailView` ensures:
1. Keyboard accessibility (`ArrowRight`, `ArrowLeft`, `Home`, `End`).
2. Visual consistency with the Obsidian Sentinel active underline (`border-accent text-text-primary`).
3. Complete backwards compatibility with existing test suites asserting button roles.

---

## 5. Global Repository Context Integration

Phase 3 established `RepositoryContext` (`RepositoryProvider`) and the `useRepositoryContext` hook. In Phase 4:
1. **Bidirectional Selection Synchronization**:
   - When a repository card is clicked in `RepositoriesPage`, it calls `repoContext.setSelectedRepoId(repo.id)`, instantly updating the global header repository selector.
   - When the user selects a repository in the global header while viewing repositories, `RepositoriesPage` receives the updated `selectedRepoId` and navigates into that repository's detail view.
   - When clicking "Back to Repositories" in `RepositoryHeader`, `repoContext.setSelectedRepoId(null)` is called to clear the selected repository in both local state and global context.
2. **Mutation Synchronization**:
   - Re-ingesting a repository via `RepositoryHeader` triggers `onRepositoryUpdated(updated)` and calls `repoContext.refetchRepositories()`.
   - Deleting a repository calls `repositoryService.deleteRepository(id)`, clears context selection, and refetches the portfolio.
3. **Safety Fallback**:
   - `RepositoriesPage` uses `useContext(RepositoryContext)` with fallback checks, ensuring standalone unit testing without `RepositoryProvider` succeeds seamlessly.

---

## 6. Responsive & Accessibility Decisions

1. **Responsive Viewport Layouts**:
   - **Desktop (≥ 1280px)**: 5-column metric cards grid, dual-column top directories and largest files tables, full-width file explorer.
   - **Tablet (768px - 1024px)**: 3-column metric cards, single-column directory/file tables, horizontally scrollable tabs without layout breakage.
   - **Mobile (375px - 640px)**: 2-column metric cards, stacked action buttons and metadata rows, touch-friendly tab buttons with horizontal overflow scrolling (`scrollbar-none`).
2. **Accessibility Standards (WCAG 2.1 AA)**:
   - High-contrast text tokens (`text-text-primary` #f4f4f5, `text-text-secondary` #a1a1aa).
   - Clear focus rings (`focus-visible:ring-2 focus-visible:ring-accent`).
   - All interactive controls have accessible labels, IDs, and ARIA roles (`role="dialog"`, `aria-label`, `htmlFor`).

---

## 7. Verification & Quality Certification

### 7.1 Automated Tests
The complete Vitest test suite was executed across all 29 test files:

```bash
npm.cmd test -- --run
```
- **Test Files**: 29 passed (29)
- **Total Tests**: 108 passed (108), 0 failed
- **Baseline Growth**: Increased from 104 passing tests (Phase 3) to 108 passing tests (Phase 4).
- **New Tests Added**:
  - `RepositoriesPage`: search query filtering and "No Matching Repositories" empty state.
  - `RepositoriesPage`: source type filtering (GitHub vs Local Directory).
  - `RepositoriesPage`: API error handling and retry callback.
  - `RepositoryDetailView`: multi-tab subnavigation switching across Static Analysis, Dependencies, and CI/CD subviews.

### 7.2 TypeScript Compilation
```bash
npx.cmd tsc -b
```
- **Result**: Exit code 0, zero type errors.

### 7.3 Linter Quality
```bash
npm.cmd run lint
```
- **Result**: Zero lint errors (0 errors, 18 pre-existing warnings in untouched pages).

### 7.4 Production Build
```bash
npm.cmd run build
```
- **Result**: Exit code 0. Production bundle generated in `dist/` in 7.83s.

### 7.5 Visual Verification & Browser Limitations
- The Vite dev server was launched on `http://127.0.0.1:5173/`.
- Browser subagent attempted visual navigation; however, the Playwright engine could not download browser drivers due to external CDN network isolation (`404 Not Found`).
- In accordance with non-negotiable Rule #8, DOM assertions, JSDOM tests, and local dev server validation were verified; no fabricated visual screenshots were produced.

---

## 8. Changed & Created Files Inventory

### Created Files
- `frontend/src/components/repository/RepositoryHeader.tsx`
- `frontend/src/components/repository/RepositoryOverviewTab.tsx`
- `frontend/src/components/repository/RepositoryAnalysisTab.tsx`
- `docs/architecture/17-ui-repositories-portfolio-and-detail.md`

### Modified Files
- `frontend/src/components/common/Tabs.tsx` (Added optional `buttonRole` prop)
- `frontend/src/components/repository/AddRepositoryModal.tsx` (Obsidian Sentinel tokens, duplicate prevention, truthful progress)
- `frontend/src/components/repository/RepositoryDetailView.tsx` (Decomposed orchestrator embedding 6 subviews with Tabs primitive)
- `frontend/src/pages/RepositoriesPage.tsx` (Search bar, source/status filters, real metrics, context sync)
- `frontend/src/context/RepositoryContext.tsx` (Removed unused import)
- `frontend/tests/AddRepositoryModal.test.tsx` (Updated modal title expectation)
- `frontend/tests/App.test.tsx` (Updated modal title expectation)
- `frontend/tests/RepositoriesPage.test.tsx` (Added search, source filter, and error retry tests)
- `frontend/tests/RepositoryDetailView.test.tsx` (Added subnavigation tab tests and mock extensions)

### Files Untouched
- **Backend files**: 0 modified.
- **Git operations**: 0 git commits, pushes, or branch modifications performed.
