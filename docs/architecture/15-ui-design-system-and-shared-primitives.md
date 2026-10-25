# CodeSentinel AI — Phase 2 Design System & Shared UI Primitives

**Document Reference:** `docs/architecture/15-ui-design-system-and-shared-primitives.md`  
**Phase:** Phase 2 — Core Design System Tokens & Shared UI Primitives  
**Status:** Certified & Implemented  
**Date:** October 2026  
**Visual Identity:** *Obsidian Sentinel — High-Precision Engineering Console*

---

## 1. Executive Summary & Design Principles

Phase 2 establishes the core design system and shared component primitives for **CodeSentinel AI**. Rather than relying on generic dashboard templates or raw GitHub dark-mode clones, this phase implements a purpose-built, high-density engineering console aesthetic tailored for senior developers, security researchers, and software architects.

### Core Visual Principles

1. **High Information Density with Purposeful Restraint**: Technical consoles require clear visual hierarchy and compact data representation rather than oversized cards and superfluous whitespace.
2. **Deep Obsidian Foundation**: A dark-theme palette centered on deep zinc-950 (`#09090b`) base background, elevated surfaces (`#121215` / `#18181b`), and subtle micro-borders (`#27272a`), avoiding eye strain during prolonged code audits.
3. **Restrained Brand Accent (Obsidian Indigo)**: Indigo accents (`#6366f1` / `#4f46e5`) are reserved for active states, primary actions, and focus indicators, ensuring interactive clarity without visual noise.
4. **Semantic Status Colors**: Purposeful semantic tokens for `success` (emerald), `warning` (amber), `danger` (rose/red), and `info` (sky) with high-contrast text and subtle background variants that adhere to WCAG 2.1 AA readability.
5. **Zero Fluff**: Elimination of generic AI dashboard clichés—no neon gradients, gratuitous glassmorphism, decorative charts, or artificial animations.

---

## 2. Semantic Token System & Architecture

Design tokens are declared as CSS custom properties in [`frontend/src/index.css`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/src/index.css) and exposed through Tailwind CSS utilities via [`frontend/tailwind.config.js`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/tailwind.config.js).

### Surface & Background Tokens

| Token Name | Value | Purpose / Usage |
| :--- | :--- | :--- |
| `--color-bg-base` | `#09090b` (zinc-950) | Root application canvas and body background |
| `--color-surface-base` | `#09090b` | Base page layer |
| `--color-surface-elevated`| `#121215` | Table headers, secondary panels, toolbars |
| `--color-surface-card` | `#18181b` (zinc-900) | Standard cards, data containers, and content blocks |
| `--color-surface-card-hover` | `#1f1f23` | Interactive card hover state |
| `--color-surface-subtle` | `#141417` | Flat section backdrops, sub-containers |
| `--color-surface-hover` | `#222227` | Button, tab, and list-item hover state |
| `--color-surface-active` | `#27272a` | Pressed, active, or selected item state |
| `--color-surface-overlay`| `rgba(9, 9, 11, 0.82)` | Modal backdrop and dialog scrims |
| `--color-surface-input` | `#111114` | Form inputs, textareas, and select elements |

### Typography & Text Tokens

| Token Name | Value | Purpose / Usage |
| :--- | :--- | :--- |
| `--color-text-primary` | `#f4f4f5` (zinc-100) | Headings, primary titles, active labels |
| `--color-text-secondary`| `#a1a1aa` (zinc-400) | Body copy, table cells, secondary metadata |
| `--color-text-muted` | `#71717a` (zinc-500) | Captions, timestamps, disabled indicators |
| `--color-text-disabled` | `#52525b` (zinc-600) | Inactive controls, placeholder text |
| `--color-text-inverse` | `#09090b` | Text on high-contrast inverted surfaces |

### Border & Divider Tokens

| Token Name | Value | Purpose / Usage |
| :--- | :--- | :--- |
| `--color-border-default` | `#27272a` (zinc-800) | Standard 1px container and card boundaries |
| `--color-border-subtle` | `#1e1e22` | Internal item dividers and table row borders |
| `--color-border-strong` | `#3f3f46` (zinc-700) | Hovered borders, active card borders |
| `--color-border-interactive` | `#6366f1` | Focus indicators and active tab underlines |

### Accent & Focus Tokens

| Token Name | Value | Purpose / Usage |
| :--- | :--- | :--- |
| `--color-accent-primary` | `#6366f1` (indigo-500) | Primary call-to-actions and key brand highlights |
| `--color-accent-hover` | `#4f46e5` (indigo-600) | Primary button hover state |
| `--color-accent-active` | `#4338ca` (indigo-700) | Primary button active/pressed state |
| `--color-accent-subtle` | `rgba(99, 102, 241, 0.12)` | Active tab/row background tint |
| `--color-accent-border` | `rgba(99, 102, 241, 0.35)` | Border on accent-tinted surfaces |
| `--color-accent-foreground`| `#ffffff` | Text on primary accent buttons |
| `--color-focus-ring` | `#6366f1` | Accessible `:focus-visible` outline |
| `--color-focus-ring-offset`| `#09090b` | Ring offset matching base background |

### Status Tokens

| Domain | Base Color | Background Tint | Border | Text |
| :--- | :--- | :--- | :--- | :--- |
| **Success** | `#10b981` | `rgba(16, 185, 129, 0.12)` | `rgba(16, 185, 129, 0.3)` | `#34d399` |
| **Warning** | `#f59e0b` | `rgba(245, 158, 11, 0.12)` | `rgba(245, 158, 11, 0.3)` | `#fbbf24` |
| **Danger** | `#ef4444` | `rgba(239, 68, 68, 0.12)` | `rgba(239, 68, 68, 0.3)` | `#f87171` |
| **Info** | `#38bdf8` | `rgba(56, 189, 248, 0.12)` | `rgba(56, 189, 248, 0.3)` | `#38bdf8` |

### Radii & Shadow Tokens

- **Radius**: `xs` (2px), `sm` (4px), `md` (6px), `lg` (8px), `xl` (12px), `full` (9999px).
- **Shadows**:
  - `--shadow-card`: `0 1px 3px 0 rgba(0, 0, 0, 0.35), 0 1px 2px -1px rgba(0, 0, 0, 0.35)`
  - `--shadow-elevated`: `0 10px 15px -3px rgba(0, 0, 0, 0.55), 0 4px 6px -4px rgba(0, 0, 0, 0.45)`
  - `--shadow-modal`: `0 25px 50px -12px rgba(0, 0, 0, 0.85)`

---

## 3. Typography & Technical Data Display

Typography uses a resilient native and system fallback stack that avoids remote font downloads, layout shifts, or runtime latency:

- **Interface Sans Font**:
  `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", Helvetica, Arial, sans-serif`
- **Technical Monospace Font**:
  `"JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace`

### Typography Scale

| Level | Size | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Page Title** | 20px / 24px (`text-xl` to `text-2xl`) | Bold (700) | Tight | View headers (`Repositories`, `Analysis Console`) |
| **Section Title** | 16px / 18px (`text-base` to `text-lg`) | Semibold (600) | Snug | Card headers, modal headers, subsection dividers |
| **Card / Item Title** | 14px (`text-sm`) | Semibold (600) | Normal | Finding titles, metric card labels, list headers |
| **Body Copy** | 14px (`text-sm`) | Regular (400) | Relaxed | Descriptions, explanatory paragraphs |
| **Secondary Metadata** | 12px (`text-xs`) | Regular / Medium | Normal | Table cells, timestamps, helper text |
| **Technical Code** | 12px / 13px (`text-xs` to `text-sm`) | Regular (400) | Relaxed | File paths, commit SHAs, line numbers, diff blocks |

---

## 4. Shared UI Primitives Inventory

All shared primitives reside in [`frontend/src/components/common/`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/src/components/common/) and are exported through [`frontend/src/components/common/index.ts`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/src/components/common/index.ts).

```
frontend/src/components/common/
├── Button.tsx                 # Primary, secondary, outline, ghost, danger buttons
├── Badge.tsx                  # Semantic status and severity badges
├── StatusBadge.tsx            # Backward-compatible wrapper for existing phase views
├── Card.tsx                   # Composite Card (Header, Title, Description, Content, Footer)
├── DataTable.tsx              # High-density technical table with contained scroll
├── Tabs.tsx                   # Keyboard-accessible ARIA tab navigation
├── Modal.tsx                  # Accessible dialog with backdrop and escape dismissal
├── EmptyState.tsx             # Standardized empty list/page placeholder
├── SkeletonLoader.tsx         # Text, card, table, and circular loading placeholders
├── CodeBlock.tsx              # Syntax-ready monospace code display with copy & diff mode
├── Input.tsx                  # Standard form text input with labels and error alert
├── Select.tsx                 # Standard select dropdown with custom chevron
├── Textarea.tsx               # Standard multi-line textarea with validation
├── LoadingSpinner.tsx         # Accessible inline loading indicator
├── ErrorState.tsx             # Standard error banner with retry action
├── BackendUnavailableState.tsx# Offline diagnostic banner with local start commands
├── GithubIcon.tsx             # Brand SVG icon
└── index.ts                   # Centralized barrel export
```

### Component Details & Props

#### 1. `Button` ([`Button.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/src/components/common/Button.tsx))
- **Variants**: `primary`, `secondary`, `outline`, `ghost`, `danger`.
- **Sizes**: `sm` (compact 28px height), `md` (standard 34px height), `lg` (40px height).
- **Features**: Native `<button>` semantics, `isLoading` with animated `Loader2` and `aria-busy`, `leftIcon`, `rightIcon`, full `disabled` state with pointer-event locking, and visible `:focus-visible` focus ring.

#### 2. `Badge` ([`Badge.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/src/components/common/Badge.tsx))
- **Variants**: `neutral`, `success`, `warning`, `danger`, `info`, `accent`, `purple`.
- **Sizes**: `sm` (padding 2px/8px), `md` (padding 4px/10px).
- **Features**: Optional pulsating `dot`, optional `icon`, monospace by default for technical data (`isMono={true}`), WCAG AA contrast.
- **Compatibility**: [`StatusBadge.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/src/components/common/StatusBadge.tsx) cleanly delegates to `Badge`, maintaining 100% backward compatibility for all Phase 1–13 views.

#### 3. `Card` ([`Card.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/src/components/common/Card.tsx))
- **Variants**: `default`, `elevated`, `interactive` (hover border highlight and cursor pointer), `flat`.
- **Paddings**: `none`, `sm`, `md`, `lg`.
- **Subcomponents**: `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.

#### 4. `DataTable` ([`DataTable.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/src/components/common/DataTable.tsx))
- **Features**: Generic TypeScript typing `<T>`, custom cell render functions, alignment (`left`, `center`, `right`), `keyExtractor`, optional `onRowClick` with interactive row hover highlighting, `selectedKey` selection indicator, contained horizontal scrolling (`overflow-x-auto`), accessible `th[scope="col"]`, built-in loading and empty state fallbacks.

#### 5. `Tabs` ([`Tabs.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/src/components/common/Tabs.tsx))
- **Variants**: `underline`, `pills`, `enclosed`.
- **Accessibility**: Native `role="tablist"` and `role="tab"`, `aria-selected`, `aria-controls`, `id` binding.
- **Keyboard Navigation**: Full support for `ArrowRight`, `ArrowLeft`, `Home`, and `End` keys with automatic focus transfer.
- **Badges**: Built-in support for count badges per tab item.

#### 6. `Modal` ([`Modal.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/src/components/common/Modal.tsx))
- **Sizes**: `sm` (max-w-md), `md` (max-w-lg), `lg` (max-w-2xl), `xl` (max-w-4xl), `full` (max-w-6xl).
- **Accessibility**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="modal-title"`, `aria-describedby="modal-description"`.
- **Dismissal**: Escape key handler, backdrop click dismissal, body scroll locking during open state, accessible close button with `aria-label="Close dialog"`.

#### 7. `EmptyState` ([`EmptyState.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/src/components/common/EmptyState.tsx))
- **Features**: Icon container, title, description, primary action via `Button`, optional secondary action via `Button`, compact vs default sizing.

#### 8. `SkeletonLoader` ([`SkeletonLoader.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/src/components/common/SkeletonLoader.tsx))
- **Variants**: `text` (configurable multi-line with shorter last line), `circular` (avatars), `card` (composite placeholder), `table` (header and row grid), `rectangular` (custom dimensions).
- **Accessibility**: `role="status"` with screen-reader text (`<span className="sr-only">Loading...</span>`).

#### 9. `CodeBlock` ([`CodeBlock.tsx`](file:///C:/Users/Akhil/Projects/CodeSentinalAi/frontend/src/components/common/CodeBlock.tsx))
- **Features**: Monospace typography, contained horizontal scroll, optional line numbers, copy-to-clipboard action with feedback tooltip ("Copied!"), optional header bar with file name/language.
- **Diff Mode**: Safe line-by-line diff highlighting (`+` green tint, `-` red tint, `@@` hunk header) without third-party runtime dependencies.

#### 10. Form Controls (`Input`, `Select`, `Textarea`)
- **Accessibility**: Automated `id`/`htmlFor` pairing via React `useId()`, `aria-invalid` binding when error is passed, `aria-describedby` referencing error message (`role="alert"`) and helper text.
- **Styling**: `bg-surface-input`, `border-border-default`, `focus-visible:ring-accent`.

---

## 5. Accessibility & Responsive Conventions

1. **Keyboard Focus Management**:
   - Universal `:focus-visible` ring using `--color-focus-ring` (`#6366f1`) with 2px offset. Focus is never suppressed with `outline: none` unless replaced by accessible focus rings.
2. **Screen Reader Support**:
   - All interactive controls have accessible names. Modals implement proper dialog semantics. Skeletons provide `role="status"`. Error states provide `role="alert"`.
3. **Reduced Motion**:
   - Explicit `@media (prefers-reduced-motion: reduce)` block in `index.css` sets all animations and transitions to `0.01ms` for users with vestibular sensitivities.
4. **Responsive Overflow Protection**:
   - Tables and code blocks are encased in responsive scroll containers (`overflow-x-auto`) to prevent layout breaking or horizontal document scroll on 13" laptop screens (1280px) and tablet devices.

---

## 6. Verification Results

All tests, builds, and linting were executed directly on the project:

### 1. Vitest Unit Test Suite
- **Command**: `npm.cmd test -- --run`
- **Result**: **25 test files passed (25/25)**, **90 tests passed (90/90)**, **0 failed**.
- **Duration**: 46.89s.
- **Coverage**:
  - Baseline tests: All 16 original test files passed with zero regressions.
  - New primitive tests: 9 new test suites (`Button.test.tsx`, `Badge.test.tsx`, `Card.test.tsx`, `DataTable.test.tsx`, `Tabs.test.tsx`, `Modal.test.tsx`, `FormControls.test.tsx`, `CodeBlock.test.tsx`, `SkeletonLoader.test.tsx`) all passed.

### 2. TypeScript & Production Build
- **Command**: `npm.cmd run build` (`tsc -b && vite build`)
- **Result**: **Exit Code 0.**
- **Transformed**: 1,950 modules transformed in 2.10s.
- **Type Checking**: Clean strict compilation with zero type errors.

### 3. Linter Execution
- **Command**: `npm.cmd run lint` (`oxlint`)
- **Result**: **Exit Code 0. 0 errors, 13 pre-existing React Compiler optimization warnings across 100 files in 112ms.**
- **New Code**: Zero lint warnings or errors in any of the newly created design system primitives.

---

## 7. Migration Plan & Legacy Component Status

The application remains fully functional in its current state. Backward compatibility was maintained during Phase 2:
- Existing color utilities (`bg-surface-50`, `border-border-default`, etc.) continue to resolve.
- `StatusBadge` continues to export its original interface while using the new `Badge` internally.
- `EmptyState`, `ErrorState`, `BackendUnavailableState`, and `Modal` maintain their exact prop contracts.

### Remaining Legacy Views Scheduled for Redesign

| Phase | Scope | Legacy Components to Migrate |
| :--- | :--- | :--- |
| **Phase 3** | AppShell & Overview | `AppShell.tsx`, `Sidebar.tsx`, `Header.tsx`, `OverviewPage.tsx` |
| **Phase 4** | Repositories & Ingestion | `RepositoriesPage.tsx`, `AddRepositoryModal.tsx`, `RepositoryDetailView.tsx` |
| **Phase 5** | Analysis & Security | `AnalysisPage.tsx`, `FindingsTable.tsx`, `FindingDetailModal.tsx`, `ArchitectureView.tsx`, `DependencyView.tsx` |
| **Phase 6** | Remediation & CI/CD | `RemediationPage.tsx`, `UnifiedDiffViewer.tsx`, `CiCdAuditPage.tsx` |
| **Phase 7** | Search, AI & Settings | `CodeSearchPage.tsx`, `AIAssistantPage.tsx`, `SettingsPage.tsx` |

---

## 8. Confirmation of Non-Negotiable Rules

1. **Backend Code & APIs**: Completely untouched (0 backend files modified).
2. **Git Publishing Operations**: Zero Git commits, pushes, or branch operations were run. All changes remain staged/working-tree only for manual user management.
3. **Application Features**: All 8 tabs, routes, modals, and actions remain 100% intact.
4. **Third-Party Dependencies**: No heavy component libraries or runtime font loaders were added.
