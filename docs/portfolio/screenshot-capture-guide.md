# CodeSentinel AI — Screenshot Capture & Visual Asset Guide

**Project:** CodeSentinel AI  
**Design Identity:** Obsidian Sentinel — High-Precision Engineering Console  
**Phase:** 9 — Portfolio Release Preparation  
**Date:** November 26, 2026  
**Status:** Visual Capture Specification & Checklist  

---

## 1. Overview & Capture Standards

To maintain a professional, cohesive presentation across the GitHub repository, portfolio website, and technical demonstration slides, all screenshots must strictly adhere to the following standards:

- **Design Identity:** Obsidian Sentinel (`#09090b` background, `#121215` / `#18181b` card surfaces, `#27272a` micro-borders, `#6366f1` Indigo accent).
- **Aspect Ratio:** 16:9 standard landscape format.
- **Recommended Viewport:** `1440 × 900` (Desktop High-DPI, 2x scale / Retina preferred).
- **Demonstration Repositories (Safe Public Fixtures):**
  - Primary: `https://github.com/pallets/click` or `https://github.com/psf/requests`
  - Local Demonstration: `local:code-sentinel-demo`
- **Strict Privacy Invariant:** Never display real private repository tokens, GitHub personal access tokens, private internal network addresses, or proprietary company code.

---

## 2. Screenshot Manifest & Specifications

| # | Screen / Feature | Viewport | Target File Name | Key Visual Elements to Highlight |
| :- | :--- | :--- | :--- | :--- |
| **01** | **System Overview** | 1440 × 900 | `01-system-overview.png` | Global health metric badge, repository portfolio summary cards, latest scan activity, platform status indicator. |
| **02** | **Repository Portfolio** | 1440 × 900 | `02-repository-portfolio.png` | Repository card grid, source types (GitHub/Local), LOC badges, snapshot status, "Add Repository" modal trigger. |
| **03** | **Repository Detail & Snapshot** | 1440 × 900 | `03-repository-detail.png` | Snapshot metadata header (commit SHA, branch, file count, language distribution bar), multi-pillar navigation tabs. |
| **04** | **Static Code Analysis** | 1440 × 900 | `04-static-analysis.png` | Cyclomatic complexity metric cards, code smell counts, findings table with exact file line coordinates, category filters. |
| **05** | **Application Security Intelligence**| 1440 × 900 | `05-security-findings.png` | Decoupled Severity (`HIGH`/`CRITICAL`) and Confidence (`HIGH`) badges, CWE/OWASP sink descriptions, finding detail modal. |
| **06** | **Dependencies & SCA** | 1440 × 900 | `06-dependency-sca.png` | Manifest inventory (`package.json`, `requirements.txt`), direct vs. transitive tags, advisory match badges, remediation versions. |
| **07** | **Architecture & Coupling** | 1440 × 900 | `07-architecture-coupling.png` | Martin's coupling metrics ($Ca$, $Ce$, Instability $I$, Distance $D$), module dependency graph, circular dependency cluster alerts. |
| **08** | **Codebase Health Console** | 1440 × 900 | `08-codebase-health.png` | Overall 0–100 score gauge, 5-pillar breakdown (Maintainability, AppSec, Architecture, Dependencies, Coverage), prioritized action items. |
| **09** | **Hybrid Code Search** | 1440 × 900 | `09-code-search.png` | Search input with symbol suggestions, Mode pills (Hybrid RRF / Lexical BM25 / Semantic Vector), syntax chunk inspection modal. |
| **10** | **Evidence-Backed Q&A** | 1440 × 900 | `10-ai-assistant.png` | Grounded answer with sufficiency badge (`SUFFICIENT`), confidence score, bracketed citation chips, expandable source evidence list. |
| **11** | **Automated Remediation** | 1440 × 900 | `11-remediation-proposals.png` | Unified side-by-side diff viewer, 5-stage validation status checks, human "Approve Patch" and "Reject" action gates. |
| **12** | **CI/CD & Multi-Pillar Audits** | 1440 × 900 | `12-cicd-audit-pr.png` | Generated GitHub Actions YAML preview, unified multi-pillar audit report, SARIF 2.1.0 export button, PR synthesis change bundle. |
| **13** | **Platform Settings & Diagnostics** | 1440 × 900 | `13-settings-diagnostics.png` | Live GitHub reachability tester (HTTP 200/404/403 states), database connection probe, local preference toggles with persistence. |

---

## 3. Step-by-Step Capture Instructions

### Step 1: Start the Local Stack
```bash
# Terminal 1: Backend (from repository root)
source backend/.venv/bin/activate  # or .\backend\.venv\Scripts\Activate.ps1 on Windows
uvicorn backend.app.main:app --port 8000

# Terminal 2: Frontend (from frontend directory)
cd frontend
npm run dev
```

### Step 2: Prepare Clean Demonstration State
1. Open Google Chrome or Microsoft Edge at `http://localhost:5173`.
2. Open Chrome DevTools (`F12` or `Cmd+Option+I`).
3. Toggle Device Toolbar (`Cmd+Shift+M` or `Ctrl+Shift+M`).
4. Set dimension to **Responsive**: `1440` width, `900` height, Device Pixel Ratio: `2.0`.
5. Onboard the sample repository `https://github.com/pallets/click` or run local test fixture ingestion.
6. Trigger an analysis run and code indexing to populate all multi-pillar tabs with actual deterministic findings.

### Step 3: Capture Clean Screenshots
1. In DevTools, open the Command Menu (`Cmd+Shift+P` or `Ctrl+Shift+P`).
2. Type `Capture screenshot` (or `Capture full size screenshot` if scrolling is required).
3. Save each screenshot directly into `docs/portfolio/assets/` using the exact filenames listed in the manifest table above.
4. Verify that each image renders crisply without pixelation or cut-off modals.

---

## 4. Visual QA Verification Checklist

Before publishing screenshots to GitHub or presenting in portfolio slides:

- [ ] All 13 screens match the **Obsidian Sentinel** dark theme token palette.
- [ ] No browser bookmarks bars, DevTools panels, or personal OS taskbars are visible.
- [ ] Text is sharp and readable at standard GitHub preview widths (800–1000px).
- [ ] Findings and diffs display realistic, deterministic AST code excerpts.
- [ ] Status badges show accurate, un-fabricated data (`SUFFICIENT`, `HIGH`, `PASSED`).
- [ ] All sensitive credentials or tokens are completely absent.
