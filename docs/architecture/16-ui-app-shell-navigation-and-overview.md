# CodeSentinel AI — Phase 3 Application Shell, Global Navigation & Overview Console

**Document Reference:** `docs/architecture/16-ui-app-shell-navigation-and-overview.md`  
**Phase:** Phase 3 — Application Shell, Global Navigation, Repository Context & Overview Console  
**Status:** Certified & Implemented  
**Date:** October 2026  
**Visual Identity:** *Obsidian Sentinel — High-Precision Engineering Console*

---

## 1. Executive Summary

Phase 3 delivers the first major surface redesign of the **CodeSentinel AI** frontend by establishing a high-density, professional application shell and transforming the executive overview dashboard into an engineering command center.

Prior to Phase 3, the application suffered from hardcoded GitHub dark-theme colors, stale Phase 0/7/8 milestone tags, uncoordinated repository selectors that reset on every tab click, cramped layout constraints (`max-w-6xl mx-auto`), and an overview page displaying Phase 1 roadmap stubs.

In Phase 3, the platform shell, navigation, global repository state, and overview dashboard were completely modernized using the **Obsidian Sentinel** tokens and shared primitives established in Phase 2. Zero backend files, APIs, database schemas, or business logic were modified.

---

## 2. Global Application Shell Architecture

The application shell ([`frontend/src/components/layout/AppShell.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/src/components/layout/AppShell.tsx)) defines the primary layout scaffold:

- **Desktop Layout (`md` breakpoint and above)**:
  - Persistent left sidebar (`w-64`, fixed width) with subtle 1px border (`border-border-default`) and zinc-900 background (`bg-surface-card`).
  - Top header (`h-16`) with semi-transparent frosted glass backdrop (`bg-surface-card/90 backdrop-blur-md`).
  - Fluid main content region with responsive padding (`p-4 sm:p-6 lg:p-8`) expanding up to `max-w-7xl mx-auto w-full`, replacing the cramped legacy container.
- **Mobile & Tablet Layout (`< 768px`)**:
  - Sidebar collapses off-canvas.
  - Header provides an accessible hamburger button (`aria-label="Toggle navigation menu"`).
  - Activating the toggle triggers an accessible modal drawer (`role="dialog"`, `aria-modal="true"`, `aria-label="Mobile Navigation"`) with a backdrop scrim (`bg-black/80 backdrop-blur-xs`) and smooth slide-in animation.
  - Clicking any navigation item or clicking the backdrop cleanly closes the mobile drawer.

---

## 3. Sidebar & Navigation Organization

The sidebar ([`frontend/src/components/layout/Sidebar.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/src/components/layout/Sidebar.tsx)) organizes all 8 application destinations into 4 logical platform groups:

```
Platform
  ├── Overview                (LayoutDashboard)
  └── Repositories            (FolderGit2)

Code Intelligence
  ├── Analysis                (FileCode2)
  ├── Code Search             (Search)
  └── AI Assistant            (Bot)

Operations & Security
  ├── Remediation             (Wrench)
  └── CI/CD & Audits          (Workflow)

System
  └── Settings                (Settings)
```

### Key Improvements:
1. **Preservation of All Destinations**: Exactly 8 original routes/tabs were preserved without additions, removals, or route path modifications.
2. **Removal of Stale Development Badges**: Completely removed `"Milestone: Phase 0 • Foundation"`, `"Phase 7"`, and `"Phase 8"` badges.
3. **Product Brand Identity**: Replaced ad-hoc icons with a refined product emblem—`ShieldCheck` encased in an Indigo accent container (`bg-accent/15 border border-accent/30 text-accent`), accompanied by the application version tag (`v0.1.0`).
4. **Active State Clarity**: Active navigation buttons feature high-contrast text (`text-text-primary font-semibold`), elevated surface background (`bg-surface-elevated`), and an accent icon tint (`text-accent`) with `aria-current="page"`.
5. **Real Live System Health Footer**: Directly reflects backend connectivity using the `useHealth` hook:
   - Live pulsating status dot (`text-status-success` when online, `text-status-danger` when offline).
   - Real database readiness label (`Database Ready` or `Disconnected`).
   - Zero fabricated status labels.

---

## 4. Header & Global Controls

The header ([`frontend/src/components/layout/Header.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/src/components/layout/Header.tsx)) provides focused, functional controls:

1. **Breadcrumb Context**: Displays `CodeSentinel / ${PageTitle}` for orientation.
2. **Global Repository Context Selector**: When repositories are registered, displays an inline repository dropdown selector (`FolderGit2` icon, monospace font, truncated name, keyboard accessible). Changing the selection instantly synchronizes across the entire platform.
3. **Live API Status Badge**: Displays `Badge` component with service name (`API: codesentinel-api`), live status dot, and an instant refetch button to refresh backend health without reloading the page.
4. **Primary Platform CTA**: Standardized "Analyze Repository" button built using the Phase 2 `Button` primitive (`variant="primary" size="sm"` with `Plus` icon), opening the ingestion modal.

---

## 5. Global Repository Context Architecture

In earlier phases, individual pages (`AnalysisPage`, `CiCdAuditPage`, `CodeSearchPage`, `AIAssistantPage`, `RepositoriesPage`) maintained separate repository dropdowns, and switching tabs in `App.tsx` explicitly cleared the active repository (`setSelectedRepoId(null)`).

Phase 3 introduces a typed, unified state provider:
- **Provider**: [`frontend/src/context/RepositoryContext.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/src/context/RepositoryContext.tsx)
- **Hook**: [`frontend/src/hooks/useRepositoryContext.ts`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/src/hooks/useRepositoryContext.ts)

### How It Works:
1. **Single Source of Truth**: On platform mount, `RepositoryProvider` queries `repositoryService.listRepositories(1, 50)` once.
2. **Graceful Default Selection**: If no repository is selected, it defaults to the first available repository. If repositories list is empty, it gracefully remains `null`.
3. **Session Persistence**: The chosen repository ID is mirrored to `sessionStorage` (`codesentinel_selected_repo_id`), preserving repository context during browser page refreshes without putting sensitive parameters into URLs.
4. **Stale ID Protection**: If a previously selected repository is deleted, the context detects that the ID is no longer present in the updated list and automatically falls back to the first available repository.
5. **Cross-Tab Synchronization**: Switching tabs in `App.tsx` no longer wipes `selectedRepoId`. When a user chooses a repository in the Header or on the Overview page, navigating to *Analysis*, *Code Search*, *AI Assistant*, or *CI/CD & Audits* automatically inspects that exact repository.

---

## 6. Overview Dashboard Redesign

The overview page ([`frontend/src/pages/OverviewPage.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/src/pages/OverviewPage.tsx)) was refactored into a serious engineering command console:

### 1. Hero Command Banner
- Concise executive description of CodeSentinel AI.
- Architecture badge: `Production Architecture` (Obsidian Indigo).
- Action buttons: `Analyze Repository` (primary) and `Architecture Blueprint` (secondary anchor scroll).
- Subtle ambient brand watermark.

### 2. Portfolio Summary Cards (Aggregated Deterministic Metrics)
When repositories exist, 4 compact cards display honest, computed metrics:
- **Tracked Repos**: Count of active repository projects.
- **Source Files**: Summed file count from immutable snapshots.
- **Lines of Code**: Exact total lines of code counted across source files.
- **Languages**: Count of detected polyglot programming languages.
*Rule Enforced: Zero fake metrics, zero fabricated vulnerability counts, zero artificial trend lines.*

### 3. Tracked Repositories Roster
- Grid of interactive cards (`Card variant="interactive"`).
- Displays repository name, source identifier (`github:owner/repo` or `local`), and real status badge (`completed`, `processing`, `failed`).
- Shows exact file counts, LOC, and last ingested date.
- Language distribution tags (e.g. `TypeScript`, `Python`) computed deterministically from `latest_snapshot.language_distribution`.
- Clicking any card navigates directly to the deep repository inspection view.

### 4. System Telemetry & Foundation
- 4 telemetry panels displaying live backend diagnostic data:
  - **API Service**: `codesentinel-api`
  - **API Version**: `v0.1.0`
  - **Database Dialect**: `Database Ready` (connected) or `Disconnected`
  - **Environment**: `Development` / `Production` (strict mode)

### 5. Architecture & Engine Boundaries
- High-contrast visual segregation between:
  - **Deterministic Engine Layer**: Explains AST analysis, SAST rules catalog, exact LOC classification, and immutable snapshotting with zero AI hallucination.
  - **Grounded AI Reasoning & Agency**: Explains retrieval-augmented codebase indexing, vulnerability explanation, and bounded safe patch generation over verified facts.

---

## 7. Responsiveness & Accessibility

1. **Fluid Responsive Grid**: Adapts seamlessly from 1 column on mobile (< 640px) to 2 columns on tablet (768px–1024px) to 3–4 columns on desktop (> 1024px).
2. **Keyboard Navigation & ARIA**:
   - Navigation links declare `aria-current="page"`.
   - Modals and drawers declare `role="dialog"` and `aria-modal="true"`.
   - All interactive controls provide visible focus rings (`focus-visible:ring-accent`).
3. **Touch Targets**: All sidebar buttons and header controls exceed the 32px minimum touch target specification.
4. **No Horizontal Scroll**: Layout gutters and flex wrappers prevent viewport overflow on standard 13" laptop displays (1280px).

---

## 8. Verification Results

### 1. Vitest Unit Test Suite
- **Command**: `npm.cmd test -- --run`
- **Result**: **29 test files passed (29/29)**, **104 tests passed (104/104)**, **0 failed** (Duration: 9.42s).
- **New Tests Added**:
  - [`tests/Sidebar.test.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/tests/Sidebar.test.tsx) (5 tests passed)
  - [`tests/Header.test.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/tests/Header.test.tsx) (4 tests passed)
  - [`tests/RepositoryContext.test.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/tests/RepositoryContext.test.tsx) (3 tests passed)
  - [`tests/AppShell.test.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/tests/AppShell.test.tsx) (2 tests passed)

### 2. TypeScript & Production Build
- **Command**: `npm.cmd run build` (`tsc -b && vite build`)
- **Result**: **Exit Code 0.** 1,953 modules transformed in 8.09s, 0 type errors.

### 3. Linter Execution
- **Command**: `npm.cmd run lint` (`oxlint`)
- **Result**: **Exit Code 0.** 0 errors across 106 files. All newly authored shell, header, sidebar, context, and overview code passed with zero lint errors.

---

## 9. Exact Files Modified / Created

### New Files Created (6):
- [`frontend/src/context/RepositoryContext.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/src/context/RepositoryContext.tsx)
- [`frontend/src/hooks/useRepositoryContext.ts`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/src/hooks/useRepositoryContext.ts)
- [`frontend/tests/Sidebar.test.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/tests/Sidebar.test.tsx)
- [`frontend/tests/Header.test.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/tests/Header.test.tsx)
- [`frontend/tests/RepositoryContext.test.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/tests/RepositoryContext.test.tsx)
- [`frontend/tests/AppShell.test.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/tests/AppShell.test.tsx)
- [`docs/architecture/16-ui-app-shell-navigation-and-overview.md`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/docs/architecture/16-ui-app-shell-navigation-and-overview.md)

### Files Modified (5):
- [`frontend/src/components/layout/AppShell.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/src/components/layout/AppShell.tsx)
- [`frontend/src/components/layout/Sidebar.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/src/components/layout/Sidebar.tsx)
- [`frontend/src/components/layout/Header.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/src/components/layout/Header.tsx)
- [`frontend/src/pages/OverviewPage.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/src/pages/OverviewPage.tsx)
- [`frontend/src/pages/AnalysisPage.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/src/pages/AnalysisPage.tsx)
- [`frontend/src/App.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/src/App.tsx)

---

## 10. Confirmation of Boundaries

1. **Backend Code**: Untouched (0 backend files modified).
2. **Git Operations**: Zero Git commits, pushes, or branch operations were run.
3. **Application Features**: All routes, actions, and modal workflows remain 100% operational.
