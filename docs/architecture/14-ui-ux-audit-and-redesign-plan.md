# CodeSentinel AI — UI/UX Transformation
## Phase 1: Frontend Audit, Design Direction & Redesign Architecture Blueprint

**Document:** `docs/architecture/14-ui-ux-audit-and-redesign-plan.md`  
**Project:** CodeSentinel AI  
**Project Root:** `C:\Users\Akhil\Projects\CodeSentinalAi`  
**Phase:** Frontend Transformation — Phase 1 (Audit, Direction & Architecture)  
**Status:** **AUDIT COMPLETE — BLUEPRINT READY FOR USER APPROVAL**  

---

## 1. Executive Summary

Phase 13 completed the production deployment certification, disaster recovery automation, and operational resilience testing for CodeSentinel AI. With backend stability, data integrity, and operational metrics fully established, the project priority has shifted exclusively to **Frontend UI/UX Quality**.

The primary objective of this transformation is to elevate CodeSentinel AI from a functional, engineer-built prototype into a premier, developer-grade software intelligence product. The target aesthetic is that of a serious, high-trust engineering platform (comparable in polish, information density, and typographical discipline to Linear, Sentry, Datadog, and Vercel) rather than an AI-generated template characterized by generic neon glows, oversized cards, and low-density layouts.

This Phase 1 deliverable represents the comprehensive frontend audit, visual identity definition, design token specification, information architecture redesign, and sequential implementation roadmap. In accordance with non-negotiable rules, **no application code was destructively rewritten, no backend APIs were altered, and no full visual redesign was started in this phase**.

---

## 2. Verified Frontend Architecture & Technology Stack

The active frontend codebase was inspected directly from source files and package manifests:

### Core Frameworks & Runtime
- **Application Framework:** React 19.2.8 (`react`, `react-dom`)
- **Language & Type System:** TypeScript ~6.0.2 with strict type-checking enabled in `tsconfig.app.json`
- **Build Tool & Bundler:** Vite 8.3.4 with `@vitejs/plugin-react`
- **Styling Architecture:** Tailwind CSS 3.4.17 with PostCSS 8.4.49 and Autoprefixer 10.4.20
- **Iconography:** Lucide React 1.16.0 (consistent vector icon set)
- **Code Linter:** Oxlint 1.81.0 (Rust-based high-performance linter configured via `.oxlintrc.json`)
- **Testing Framework:** Vitest 3.2.7 with JSDOM 26.0.0 and `@testing-library/react` 16.2.0

### Routing Architecture
- **Routing Engine:** State-based client navigation inside `frontend/src/App.tsx`.
- **Navigation Model:** Active view managed by `currentTab: NavigationTab` with 8 primary tabs (`overview`, `repositories`, `analysis`, `remediation`, `cicd-audit`, `code-search`, `ai-assistant`, `settings`).
- **Deep-linking & Sub-routing:**
  - `RepositoriesPage`: Drills down to `RepositoryDetailView` via `selectedRepoId`.
  - `RepositoryDetailView`: Features 5 sub-tabs (`overview`, `analysis`, `dependencies`, `architecture`, `health`).
  - `CiCdAuditPage`: Features 3 sub-tabs (`workflow`, `audit`, `pr`).
  - `ArchitectureView`: Features 4 sub-tabs (`modules`, `violations`, `cycles`, `policy`).
  - `DependencyView`: Features 2 sub-tabs (`vulnerabilities`, `inventory`).
- **Absence of URL-based Routing:** No `react-router-dom` or hash router is installed. Navigation state resets to `overview` on page refresh unless parameters are injected via top-level state props.

### Layout & Component Structure
- **Shell (`AppShell.tsx`):** Fixed 64-column (256px) sidebar on desktop with a collapsible mobile drawer backdrop, top 64px header, and fluid content container bounded by `max-w-6xl mx-auto`.
- **Styling Paradigm:** Direct utility class composition with significant reliance on hardcoded GitHub dark mode hex values (`bg-[#0d1117]`, `bg-[#161b22]`, `border-[#21262d]`, `border-[#30363d]`, `bg-[#238636]`).
- **Theme Support:** Dark-mode only (`:root { color-scheme: dark; }`). Zero runtime theme toggle or CSS variable abstractions exist.

---

## 3. Actual Route and Page Inventory

The frontend exposes 8 primary navigation tabs and several deeply nested views:

| Route / Tab ID | Page Component | Primary Purpose | Sub-Views / Nested Components |
| :--- | :--- | :--- | :--- |
| `overview` | `OverviewPage.tsx` | Platform executive summary, health telemetry, and tracked repository shortcuts | `EmptyState`, `StatusBadge`, `BackendUnavailableState` |
| `repositories` | `RepositoriesPage.tsx` | Repository connection management, snapshot indexing, and file inspection | `AddRepositoryModal`, `RepositoryDetailView` (5 sub-tabs) |
| `analysis` | `AnalysisPage.tsx` | Independent SAST static analysis runner and finding inspection console | `AnalysisSummaryCards`, `FindingsTable`, `FindingDetailModal` |
| `remediation` | `RemediationPage.tsx` | Human-in-the-loop automated patch review, syntax validation, and diff application | `UnifiedDiffViewer`, `ValidationChecklist`, `AuditTimeline` |
| `cicd-audit` | `CiCdAuditPage.tsx` | Hardened workflow generation, multi-pillar security audit runner, and PR synthesis | Sub-tabs: Workflow Generator, Audit Runner, PR Composer |
| `code-search` | `CodeSearchPage.tsx` | Syntax-aware AST chunk search (Lexical BM25, Semantic Dense Vector, Hybrid RRF) | `ChunkDetailModal`, Search Filters, Index Trigger |
| `ai-assistant` | `AIAssistantPage.tsx` | Evidence-grounded repository Q&A citing exact source coordinates | Question prompt box, Evidence Accordion, Chunk Inspector |
| `settings` | `SettingsPage.tsx` | API connectivity diagnostics and database dialect verification | Read-only connection status cards |

---

## 4. Page-by-Page UI/UX Audit

### 4.1 Global Layout (`AppShell.tsx`, `Sidebar.tsx`, `Header.tsx`)
- **Current State:**
  - Sidebar: 256px wide, dark `#161b22` background with `#21262d` borders.
  - Header: 64px high, displaying active tab title, API status pill, and "+ Analyze Repository" green button.
- **Identified Deficiencies:**
  1. *Hardcoded Milestone Artifacts:* Line 140 of `Sidebar.tsx` permanently renders `Milestone: Phase 0 • Foundation` despite the project completing Phase 13.
  2. *Developmental Badges in Main Nav:* Navigation items display internal development badges (`Phase 7` on Remediation, `Phase 8` on CI/CD & Audits), undermining the feel of a commercial software product.
  3. *Excessive Container Constraints:* Main content is constrained to `max-w-6xl mx-auto` (1152px). On modern 1440p and 4K displays, over 50% of screen real estate is dead space, severely compressing dense engineering tables.
  4. *Inflexible Header:* Header title does not support breadcrumb navigation when drilled into a specific repository, finding, or audit run.
  5. *Redundant CTAs:* "+ Analyze Repository" is present in both Header and active page bodies, creating visual noise.

---

### 4.2 Overview Page (`OverviewPage.tsx`)
- **Current State:**
  - Hero card with dark radial gradient, headline, and "Analyze Repository" CTA.
  - Tracked repositories card list showing file count, LOC, and status badge.
  - 4 telemetry cards (API Service, API Version, Database Dialect, Environment).
  - Architecture blueprint two-column card comparing Deterministic Engine vs AI Reasoning.
- **Identified Deficiencies:**
  1. *Stale Milestone Badging:* Displays `Phase 1 Active`, `Phase 1 Ingestion Release`, and marks AI Reasoning as `Future Phase` even though Phases 2–13 are fully operational.
  2. *Marketing Persona Mismatch:* The hero text reads like a promotional landing page rather than a high-productivity engineering console. A developer logging in wants immediate visibility into active vulnerabilities, security posture, and critical alerts.
  3. *Unclickable Architecture Cards:* The lower blueprint section takes up significant vertical space with static bullet points that offer zero interactivity or drill-down.
  4. *Lack of Actionable Aggregates:* No high-level rollup of unresolved critical findings, failed audits, or pending remediation proposals across repositories.

---

### 4.3 Repositories Page (`RepositoriesPage.tsx` & `RepositoryDetailView.tsx`)
- **Current State:**
  - Repositories list view with search, status badges, branch tags, LOC, and language distribution tags.
  - Drill-down into `RepositoryDetailView` with 5 internal sub-tabs: Overview (File Explorer), Analysis, Dependencies, Architecture, and Health.
- **Identified Deficiencies:**
  1. *Navigation Model Collision:* Clicking a repository changes the page into `RepositoryDetailView`, which introduces a second layer of 5 horizontal tabs. This nested tab structure conflicts with the primary sidebar navigation where "Analysis" already exists as a top-level tab.
  2. *File Explorer Pagination & Filtering:* In the repository Overview tab, the file explorer displays 25 files per page with basic text filtering. File paths wrap poorly on smaller viewports.
  3. *Language Distribution Bar:* Renders colored bar segments without percentage labels on hover or interactive language filtering.
  4. *Dangerous Action Placement:* "Delete Repository" button is placed at the top of `RepositoryDetailView` with basic window confirmation rather than an intentional typed confirmation dialog.

---

### 4.4 Analysis Page (`AnalysisPage.tsx`) & Components
- **Current State:**
  - Repository selector dropdown at top right.
  - Historical run selector with "+ Start Analysis" button.
  - Summary metric cards (Total Findings, Critical, High, Medium, Low, Security Risks).
  - `FindingsTable` with search, severity filter, confidence filter, category filter, and modal inspection.
- **Identified Deficiencies:**
  1. *Unstyled Native `<select>` Elements:* The repository and run selectors use default browser styling with inconsistent padding and contrast.
  2. *Findings Table Clutter:* File path column is truncated with ellipsis, hiding the exact directory context where vulnerabilities reside.
  3. *Modal Information Overload:* `FindingDetailModal.tsx` is 390 lines. It displays metadata, line numbers, raw evidence snippets, remediation availability, and "Synthesize Patch" buttons in a crowded vertical layout with inconsistent font sizes.
  4. *Code Snippet Presentation:* Code evidence in the modal uses basic dark backgrounds without proper line numbering gutters or syntax token highlighting.

---

### 4.5 Remediation Page (`RemediationPage.tsx`) & Components
- **Current State:**
  - List of remediation proposals filtered by status (`ALL`, `PROPOSED`, `VALIDATING`, `VALIDATED`, `APPROVED`, `APPLIED`, `REJECTED`).
  - Side-by-side or stacked review console: `ValidationChecklist`, `UnifiedDiffViewer`, `AuditTimeline`, and Action bar ("Approve", "Apply Patch", "Reject").
- **Identified Deficiencies:**
  1. *Diff Viewer Styling:* `UnifiedDiffViewer.tsx` handles additions and deletions with basic green/red background colors, but lacks side-by-side split view, line-number alignment, and monospaced font consistency across platforms.
  2. *Modal Confirmation Modals:* Reject modal opens with a generic textarea that lacks structured reason tags (e.g., "False Positive", "High Regression Risk", "Superseded").
  3. *Audit Timeline Density:* `AuditTimeline.tsx` displays timestamped audit items with large circles and excessive vertical padding, pushing the diff viewer below the fold on laptop screens.

---

### 4.6 CI/CD & Audits Page (`CiCdAuditPage.tsx`)
- **Current State:**
  - Sub-tab 1: Workflow Generator (Options: ecosystem, test, lint, typecheck, pinned SHAs, least-privilege).
  - Sub-tab 2: Audit Dashboard (Trigger audit across 6 pillars, view SARIF/Markdown export, inspect findings).
  - Sub-tab 3: PR Preparation Studio (Select approved proposals, conflict detection, unified `.patch` export).
- **Identified Deficiencies:**
  1. *Extreme Component Size:* At 1,103 lines of TypeScript, `CiCdAuditPage.tsx` contains 3 completely distinct operational workflows bundled into one massive file, leading to state coupling and rerender latency.
  2. *Form Hierarchy in Workflow Generator:* 8 distinct toggle switches are arranged in a flat vertical grid without visual grouping into logical stages (Preflight, Security Scan, Build, Artifacts).
  3. *PR Preparation Empty State:* When no approved proposals exist, the PR studio displays a blank area rather than an instructive empty state guiding the user to the Remediation console.

---

### 4.7 Code Search (`CodeSearchPage.tsx`) & AI Assistant (`AIAssistantPage.tsx`)
- **Current State:**
  - Search: Search input, mode toggle (`hybrid`, `lexical`, `semantic`), language/type/path filters, search hits table, and `ChunkDetailModal`.
  - Assistant: Sticky prompt input, sample prompt chips, chat stream, evidence citation accordion.
- **Identified Deficiencies:**
  1. *Search Mode Selector Clarity:* The toggle between `Hybrid`, `Lexical`, and `Semantic` uses generic buttons without tooltips explaining when to use dense vectors vs BM25 keyword matching.
  2. *Evidence Accordion in AI Assistant:* When multiple chunks are cited, the evidence accordion expands to several thousand pixels high, pushing the AI response off the screen.
  3. *Lack of Streaming / Progress Indicators:* When generating answers or searching across thousands of AST chunks, the loading spinner gives no indication of phase progress (Retrieval → Verification → Synthesis).

---

### 4.8 Settings Page (`SettingsPage.tsx`)
- **Current State:**
  - Two read-only cards showing `/api/health` status and DB status.
- **Identified Deficiencies:**
  1. *Functional Emptiness:* The page is purely diagnostic. It provides no actual settings controls: no theme switching, no local repository root path configuration, no LLM provider selection, no rule threshold adjustments, and no cache management.
  2. *Wasted Screen Real Estate:* Two small cards float in a massive empty container.

---

## 5. Confirmed Issues vs. Items Requiring Visual Verification

To ensure 100% honesty and avoid fabricating visual states:

### Confirmed Source-Code Deficiencies
1. **Hardcoded Phase 0/1/2/4/7/8 Labels:** Present across `Sidebar.tsx`, `OverviewPage.tsx`, `RepositoriesPage.tsx`, and `AnalysisPage.tsx`.
2. **Hardcoded Hex Palette:** 150+ instances of `#0d1117`, `#161b22`, `#21262d`, and `#30363d` in JSX classes, preventing systematic theming.
3. **Monolithic Components:** `CiCdAuditPage.tsx` (1,103 lines) and `RepositoryDetailView.tsx` (911 lines) bundle excessive responsibilities into single files.
4. **Settings Page Incompleteness:** Only two diagnostic cards exist in `SettingsPage.tsx`.
5. **Lack of Breadcrumb Trail:** Header displays static tab title without path navigation.

### Visual & Layout Items Requiring Browser Verification
1. **Exact Color Contrast on Non-Retina Displays:** Determining whether `#484f58` text meets WCAG AA on `#161b22` backgrounds under various ambient lighting.
2. **Multi-Column Table Horizontal Overflow:** Testing whether `FindingsTable` and `DependencyInventoryTable` scroll smoothly on 13-inch laptop viewports (1280x800).
3. **Diff Viewer Line Alignment:** Verifying that unified and split diff viewers maintain line-number alignment when diff chunks have long wrapping lines.

---

## 6. Recommended Design Direction & Rationale

### Design Philosophy: "Engineered Precision"
CodeSentinel AI is a technical instrument for software engineers and security professionals. The design must communicate **rigor, credibility, and deterministic authority**.

### Visual Influences:
- **Linear:** Fluid keyboard shortcuts, refined border hierarchy, subtle surface elevations, disciplined typography.
- **Sentry & Datadog:** High-density technical data tables, prominent severity tags, actionable stack and AST inspection.
- **Vercel / Next.js Console:** Monospaced data tags, crisp monochrome borders, zero gratuitous decoration.

### Theming Decision: Dark-First with Semantic Variable Architecture
- **Recommendation:** Maintain a premier, high-contrast dark theme as the primary experience, but refactor all styling into **CSS custom properties (tokens)**.
- **Rationale:** Dark mode is the industry standard for code analysis, AST inspection, and terminal-adjacent developer tools. Building a tokenized variable architecture (`--bg-canvas`, `--bg-surface`, `--border-subtle`, `--text-primary`) ensures that a clean light theme can be supported in the future without modifying component logic.

### Aesthetic Rules (Anti-AI Dashboard):
1. **No Gratuitous Glassmorphism:** Eliminate blurred semi-transparent overlays that degrade legibility and performance.
2. **No Neon / Glowing Borders:** Replace bright neon borders with crisp 1px borders using refined opacity scales (`border-slate-800` / `#21262d`).
3. **Restrained Color Accents:** Reserve saturated colors strictly for **semantic meaning**:
   - Red/Rose: Critical security findings and fatal errors.
   - Orange: High severity findings.
   - Amber: Warnings, complexity alerts, and partial statuses.
   - Emerald/Green: Passing checks, verified patches, and clean statuses.
   - Blue/Sky: Primary actions, links, and AST symbols.
   - Purple: AI reasoning and semantic search indicators.
4. **Information Density over Whitespace:** Increase table row density (36–40px row height instead of 56px), compact summary cards, and maximize screen width for code viewers.

---

## 7. Proposed Design Tokens & Component Conventions

### 7.1 Color Palette & Surface Hierarchy

```css
:root {
  /* Canvas & Background Surfaces */
  --color-canvas-default: #0b0e14;    /* Deepest obsidian background */
  --color-canvas-subtle:  #0f131a;    /* Secondary page sections */
  --color-surface-default: #151922;   /* Standard card & container surface */
  --color-surface-elevated: #1c212c;  /* Modals, dropdowns, popovers */
  --color-surface-hover:   #232936;   /* Interactive item hover */
  --color-surface-active:  #2b3242;   /* Selected item state */

  /* Borders & Dividers */
  --color-border-subtle:  #1e2430;    /* Structural layout dividers */
  --color-border-default: #2a3242;    /* Card & input borders */
  --color-border-hover:   #3b455b;    /* Interactive border focus */
  --color-border-accent:  #3b82f6;    /* Focus ring highlight */

  /* Typography Colors */
  --color-text-primary:   #f1f5f9;    /* High-contrast headings and primary labels */
  --color-text-secondary: #94a3b8;    /* Body text and secondary descriptions */
  --color-text-muted:     #64748b;    /* Metadata, timestamps, table headers */
  --color-text-disabled:  #475569;    /* Disabled actions and empty states */

  /* Semantic Accents */
  --color-critical:       #f43f5e;    /* Rose 500 */
  --color-critical-subtle: rgba(244, 63, 94, 0.12);
  --color-high:           #f97316;    /* Orange 500 */
  --color-high-subtle:     rgba(249, 115, 22, 0.12);
  --color-medium:         #f59e0b;    /* Amber 500 */
  --color-medium-subtle:   rgba(245, 158, 11, 0.12);
  --color-low:            #38bdf8;    /* Sky 400 */
  --color-low-subtle:      rgba(56, 189, 248, 0.12);
  --color-success:        #10b981;    /* Emerald 500 */
  --color-success-subtle:  rgba(16, 185, 129, 0.12);
  --color-info:           #6366f1;    /* Indigo 500 */
  --color-info-subtle:     rgba(99, 102, 241, 0.12);
}
```

### 7.2 Typography Scale
- **Headings Font:** `Inter`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif` (letter-spacing: `-0.02em` for H1/H2).
- **Monospace Font:** `JetBrains Mono`, `SFMono-Regular`, `Consolas`, `monospace` (for code snippets, diffs, rule IDs, file paths, hashes).
- **Scale:**
  - `text-xs`: 12px (line-height: 16px) — Table cells, metadata, badges.
  - `text-sm`: 14px (line-height: 20px) — Standard UI body, form inputs, button labels.
  - `text-base`: 16px (line-height: 24px) — Section descriptions, modal titles.
  - `text-lg`: 18px (line-height: 28px) — Card titles, sub-headers.
  - `text-xl`: 20px (line-height: 28px) — Primary page headers.
  - `text-2xl`: 24px (line-height: 32px) — Executive metric counters, dashboard summaries.

### 7.3 Border Radii & Elevation
- **Radii:**
  - Micro tags / pills: `rounded` (4px).
  - Buttons / Inputs / Table rows: `rounded-md` (6px).
  - Cards / Panels: `rounded-lg` (8px).
  - Modals / Popovers: `rounded-xl` (12px).
  - *Prohibit:* Large bulbous rounded corners (`rounded-3xl` / `rounded-full` on cards).
- **Shadows:** Minimalistic layered shadows (`shadow-sm`, `shadow-md` for modals only). No glowing drop-shadows.

---

## 8. Global Navigation and Page Hierarchy Proposal

### Unified Repository Context Architecture
To resolve the navigation disconnect where features are duplicated across `RepositoryDetailView` and standalone pages:

```
[ App Header: Global Repository Selector (Dropdown: All Repositories | Repo A | Repo B) ]
   ├── Overview (Rollup when All Repos; Focused when Repo Selected)
   ├── Repositories (Manage, Ingest, Snapshot History)
   ├── Code Analysis (SAST, Security Intelligence, AST Complexity)
   ├── Dependencies (SCA, Advisories, Package Graphs)
   ├── Architecture (Coupling, Tarjan Cycles, Governance Policies, Health)
   ├── Remediation (Proposals, Diff Inspector, Safe Application)
   ├── CI/CD & Audits (Workflows, SARIF Audits, PR Preparation)
   ├── Code Search (AST Hybrid & Semantic Code Search)
   ├── AI Assistant (Evidence-Grounded Codebase Q&A)
   └── Settings (Platform Configuration, Providers, Engine Limits)
```

### Key Architectural Benefits:
1. **Single Source of Truth:** Selecting a repository in the header seamlessly filters Analysis, Dependencies, Architecture, Search, and Remediation to that active repository.
2. **Elimination of Duplicated Views:** Eliminates the redundant `RepositoryDetailView` sub-tabs, unifying them with the primary sidebar views.
3. **Global Breadcrumbs:** Header dynamically shows `CodeSentinel / Repositories / Akhil-Bansal17-CodeSentinel / Analysis`.

---

## 9. Reusable Component Architecture

To replace ad-hoc implementations, the redesign will standardize on a core component library:

1. **`Button` (`components/ui/Button.tsx`):**
   - Variants: `primary`, `secondary`, `outline`, `ghost`, `danger`.
   - Sizes: `xs` (28px), `sm` (32px), `md` (38px).
   - Integrated loading spinner and icon support.
2. **`DataTable` (`components/ui/DataTable.tsx`):**
   - Standardized table layout with sticky header, sorting, pagination, empty state, and column alignment.
3. **`Badge` (`components/ui/Badge.tsx`):**
   - Semantic variants (`critical`, `high`, `medium`, `low`, `success`, `neutral`).
4. **`MetricCard` (`components/ui/MetricCard.tsx`):**
   - Consistent stat presentation with label, value, trend/delta, icon, and optional progress bar.
5. **`CodeViewer` (`components/ui/CodeViewer.tsx`):**
   - Monospaced code container with line numbers, copy button, and syntax highlight container.
6. **`Tabs` (`components/ui/Tabs.tsx`):**
   - Clean horizontal tab bar with active indicator, badge support, and keyboard arrow navigation.
7. **`Modal` (`components/ui/Modal.tsx`):**
   - Standardized backdrop, Escape key listener, focus trap, and clean header/footer action slots.

---

## 10. Responsive and Accessibility Strategy

- **Breakpoints:**
  - Mobile (`< 768px`): Collapsible sidebar into off-canvas drawer; single-column card grids; horizontally scrolling data tables.
  - Tablet (`768px - 1024px`): Slim icon-only sidebar (64px) with tooltip expansion; 2-column card layouts.
  - Desktop (`1024px - 1536px`): Standard 256px sidebar; full multi-column tables; side-by-side diff viewers.
  - Ultra-Wide (`> 1536px`): Fluid container (`max-w-[1800px]`) allowing code viewers and dependency graphs to utilize full screen real estate.
- **Accessibility Standards:**
  - All interactive elements must have visible focus rings (`focus-visible:ring-2 focus-visible:ring-blue-500`).
  - Text-to-background contrast ratio must strictly satisfy WCAG AA (>= 4.5:1 for normal text, >= 3:1 for large text).
  - All icon buttons must provide explicit `aria-label` attributes.
  - Modal dialogues must lock background scroll and trap keyboard focus.

---

## 11. Sequential UI Redesign Roadmap

To avoid breaking existing functionality and allow iterative visual verification, the redesign will be executed in **7 sequential phases**:

```
Phase 1: Audit, Direction & Architecture Blueprint (THIS PHASE - COMPLETE)
   ↓
Phase 2: Core Design System, CSS Tokens & Shared UI Primitives
   ↓
Phase 3: Global Shell, Navigation & Repository Context Unification
   ↓
Phase 4: Repositories & Ingestion Overhaul
   ↓
Phase 5: Analysis, Security & Architecture Intelligence Consoles
   ↓
Phase 6: Remediation Studio, CI/CD Audits & PR Preparation
   ↓
Phase 7: Code Search, AI Assistant, Settings & Final Polish
```

### Detailed Phase Breakdown:

#### **Phase 2: Core Design System, CSS Tokens & Shared UI Primitives**
- **Scope:** Define Tailwind theme extension in `tailwind.config.js`, create CSS variables in `index.css`, and implement foundational components (`Button`, `Badge`, `Card`, `DataTable`, `Tabs`, `Modal`, `CodeViewer`, `Input`, `Select`).
- **Files Changed:** `frontend/src/index.css`, `frontend/tailwind.config.js`, `frontend/src/components/ui/*`.
- **QA Verification:** Vitest component tests, visual preview inspection.

#### **Phase 3: Global Shell, Navigation & Repository Context Unification**
- **Scope:** Refactor `AppShell.tsx`, `Sidebar.tsx`, and `Header.tsx`. Implement global repository context selector and breadcrumbs. Remove stale Phase 0/1/2 milestone labels.
- **Files Changed:** `AppShell.tsx`, `Sidebar.tsx`, `Header.tsx`, `App.tsx`, `navigation.ts`.
- **QA Verification:** Responsive sidebar toggle, tab switching tests, active state styling.

#### **Phase 4: Repositories & Ingestion Overhaul**
- **Scope:** Redesign `RepositoriesPage.tsx` and `AddRepositoryModal.tsx`. Upgrade file explorer, snapshot metadata displays, and language distribution visualizers.
- **Files Changed:** `RepositoriesPage.tsx`, `AddRepositoryModal.tsx`, `RepositoryDetailView.tsx`.
- **QA Verification:** Repository connection flow, file table filtering, modal validation tests.

#### **Phase 5: Analysis, Security & Architecture Intelligence Consoles**
- **Scope:** Redesign `AnalysisPage.tsx`, `FindingsTable.tsx`, `FindingDetailModal.tsx`, `ArchitectureView.tsx`, `CodebaseHealthDashboard.tsx`, and `DependencyView.tsx`.
- **Files Changed:** `AnalysisPage.tsx`, `FindingsTable.tsx`, `ArchitectureView.tsx`, `DependencyView.tsx`, and related modal components.
- **QA Verification:** Finding filtering, severity sorting, architecture graph view, health score gauge.

#### **Phase 6: Remediation Studio, CI/CD Audits & PR Preparation**
- **Scope:** Redesign `RemediationPage.tsx`, `UnifiedDiffViewer.tsx`, and decompose `CiCdAuditPage.tsx` (1,103 lines) into modular sub-views. Implement professional side-by-side diffs.
- **Files Changed:** `RemediationPage.tsx`, `UnifiedDiffViewer.tsx`, `CiCdAuditPage.tsx`, and sub-components.
- **QA Verification:** Proposal approval/apply flows, diff chunk rendering, SARIF export triggers.

#### **Phase 7: Code Search, AI Assistant, Settings & Final Polish**
- **Scope:** Redesign `CodeSearchPage.tsx`, `AIAssistantPage.tsx`, and turn `SettingsPage.tsx` into a real configuration panel with theme toggles, provider choices, and system controls.
- **Files Changed:** `CodeSearchPage.tsx`, `AIAssistantPage.tsx`, `SettingsPage.tsx`.
- **QA Verification:** Search hit rendering, evidence citations, settings persistence, full regression suite.

---

## 12. Testing and Visual QA Strategy

Every redesign phase must satisfy a four-layer verification gate before approval:
1. **Automated Unit & Component Tests:** Vitest suites must pass with 0 failures (`npm test -- --run`).
2. **Type Safety & Build Verification:** `tsc -b && vite build` must compile with 0 errors.
3. **Static Code Quality:** Oxlint must report 0 lint errors (`npm run lint`).
4. **Visual & Responsive Inspection:** Manual inspection of desktop (1440px), laptop (1280px), tablet (768px), and mobile (375px) layouts covering loading, empty, and active states.

---

## 13. Baseline Test, Build, Lint & Type-Check Results

All safe frontend verification commands were executed directly against the baseline workspace:

### 1. Frontend Vitest Test Suite
```bash
npm.cmd test -- --run (in frontend/)
```
- **Exit Code:** `0`
- **Result:** **16 test files passed, 57 passed, 0 failed** in 8.68s.
- All existing tests for App, Overview, Repositories, Analysis, Security, Architecture, Dependencies, Search, Assistant, Remediation, and CI/CD passed.

### 2. Frontend TypeScript & Production Build
```bash
npm.cmd run build (in frontend/)
```
- **Exit Code:** `0`
- **Result:** `tsc -b && vite build` succeeded in 4.41s.
- **Bundle Output:**
  - `dist/index.html`: 0.71 kB (gzip: 0.45 kB)
  - `dist/assets/index-Dd7_vl9A.css`: 38.42 kB (gzip: 7.63 kB)
  - `dist/assets/index-BcZFdC4h.js`: 516.55 kB (gzip: 124.51 kB)
  - 1,948 modules transformed with **zero TypeScript errors**.

### 3. Frontend Static Linter (Oxlint)
```bash
npm.cmd run lint (in frontend/)
```
- **Exit Code:** `0`
- **Result:** Oxlint checked 80 files with 116 rules in 618ms.
- **Errors:** **0 errors**.
- **Warnings:** 13 React Compiler optimization warnings (related to existing `useEffect` callbacks in `ArchitectureView.tsx` and `RemediationPage.tsx`).

---

## 14. Risks, Constraints & Acceptance Criteria

### Technical Risks:
- **Breaking API Contracts:** Any modification to service signatures or component prop types risks regression. *Mitigation:* The redesign will modify strictly JSX/CSS presentation layers; service calls and response types in `frontend/src/types/` remain untouched.
- **Large Component Refactoring Risk:** Decomposing `CiCdAuditPage.tsx` and `RepositoryDetailView.tsx` could introduce state synchronization bugs. *Mitigation:* Preserve existing state hooks and extract presentation sub-views sequentially with unit test coverage.

### Acceptance Criteria for Phase 1 Approval:
- [x] Complete inventory of all existing routes, pages, and components compiled.
- [x] Every page audited for layout, typography, visual defects, and information architecture.
- [x] Design direction defined with concrete HSL/HEX tokens and typography scales.
- [x] Sequential 7-phase implementation roadmap established.
- [x] Baseline test suite, build, lint, and typecheck verified with 0 errors.
- [x] Comprehensive architectural blueprint document delivered at `docs/architecture/14-ui-ux-audit-and-redesign-plan.md`.

---

## 15. Explicit Confirmation of Backend Integrity

- **Backend Code Unaltered:** Zero backend files (`backend/app/*`, `backend/tests/*`) were modified.
- **Database Models & Migrations Preserved:** All database models, Alembic scripts, and connection pools remain untouched.
- **APIs & Contracts Unchanged:** All 45+ FastAPI OpenAPI endpoints remain intact.
- **Zero Git Operations Executed:** No Git staging, commits, branches, or pushes were performed.
