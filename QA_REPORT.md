# Lean — Responsive, Cross-Browser & UX Audit
**Date:** 2026-04-22  
**Scope:** Audit-only (Parts 1–6 of the QA brief). No code changes shipped this round.  
**Method:** Static codebase analysis + spot-check in the live preview at 428×703 (mobile). Patterns scanned: dialog widths, table overflow, sticky positioning, hover-only affordances, font sizes, focus styles, icon-only buttons, locale handling, RTL flips, localStorage error handling, error boundaries, loading/empty/error states.

> The product currently has **no real backend** — all state is client-side with localStorage. That eliminates a whole class of network-error issues but introduces others (quota, private mode), which are flagged below.

---

## Severity legend
- **Critical** — feature is unusable or data is at risk on a supported device/browser.
- **High** — feature works but is painful, ugly, or inaccessible to a meaningful slice of users.
- **Medium** — visible polish issue, edge-case break, or accessibility gap.
- **Low** — nice-to-have, defensive hardening, or single-browser quirk.

---

## 1. Issues found

### 1.1 Tables — every multi-column table on mobile

| # | Table (file) | Columns | Current mobile behavior | Severity | Recommended fix | Effort |
|---|---|---|---|---|---|---|
| T1 | `FeatureFinancialPlanning.tsx` lines 1110, 1178 — **Monthly Transactions / Monthly Cost grids** inside the per-month edit popup | 6–7 | Wrapped in `overflow-x-auto`; popup itself is `w-[95vw] max-w-[1400px] h-[90vh]` (good), but the inner table forces horizontal scroll *inside* the modal on phones. Inputs are `text-xs` → iOS auto-zoom on focus. | **Critical** | Convert to vertical card layout per service/cost line < 768px. Bump input font-size to ≥16px on mobile. | M |
| T2 | `forecast/ForecastMatrixGrid.tsx` — **Forecast direct-entry grid** | 1 + N months (12–36) | Sticky first column + sticky header; `overflow-x-auto`. On a 360px screen the sticky service column eats ~55% of width, leaving ~160px for data. Cells are `text-xs/text-[10px]` and 110px wide. Keyboard nav assumes a real keyboard — unusable on touch. | **Critical** | (a) Below 768px swap to a per-service accordion: tap service → opens a vertical month list. (b) Disable sticky-column on mobile (it conflicts with horizontal scroll momentum on iOS Safari). | L |
| T3 | `FeatureForecast.tsx` line 366, `ProductForecast.tsx` line 395 — **Forecast revenue/cost summary tables** | 1 + 12/24/36 | Same sticky-first-column pattern, same readability issues. | **High** | Same as T2: collapse to per-row accordion < 768px. | M |
| T4 | `pages/ResourcesPage.tsx` line 76 — **Resource directory** | 7 | `min-w-[700px]` forces horizontal scroll on every device < 700px; on 360px users see only 2 columns at a time and miss the **Status** + **Utilization** indicators (the most important columns). Row tap target is ~36px (below the 44px guideline). | **High** | Card layout < 768px: name + role as headline, employeeId/location as meta, utilization + status as the badge row. Bump row height. | M |
| T5 | `dashboard/ProductTable.tsx` line 92 — **Products: Target vs Achieved** | 5–7 (compare on) | `overflow-auto` (scroll in both axes). Headers are `text-xs uppercase` (~10–11px rendered) — borderline unreadable. Achievement % is in the last column → invisible on phone without scrolling. Compare mode adds an 8th column with stacked DeltaChips that wrap badly. | **High** | Card per product < 1024px when compare is on; < 768px otherwise. Lead with the achievement % chip. | M |
| T6 | `dashboard/ForecastByService.tsx` line 71 — **Forecast by service** | Variable | `overflow-x-auto`, no `min-w` set. Behavior depends on data — likely OK on tablet, cramped on phone. | **Medium** | Verify visually; card layout < 640px. | S |
| T7 | `dashboard/UpcomingRevenueDrivers.tsx` line 90 | Variable | Same as T6. | **Medium** | Same. | S |
| T8 | `pages/PortfolioPage.tsx` lines 427, 476, 594, 667 — **4 separate overflow-x tables** in tabs (products, releases, financials, etc.) | 4–6 | Horizontal scroll on phone for all of them. No sticky header so the column meanings are lost when scrolling vertically inside a long list. | **High** | Card layout < 768px for all four. Decide per-table which 2–3 fields to surface. | L |
| T9 | `pages/ProductPage.tsx` lines 385, 488, 634, 714 — **4 tables in product tabs** | 4–6 | Same as T8. The `bg-secondary/30 rounded-xl p-3 sm:p-4 overflow-x-auto` Gantt-ish table at line 385 in particular: bars do not visually scroll with the row labels. | **High** | Same recommendation; Gantt needs a separate phone treatment (vertical timeline) — out of scope here, document only. | L |
| T10 | `ProductDocumentation.tsx` line 375 | 5 | Horizontal scroll. Acceptable but row tap target small. | **Medium** | Card layout, or accept scroll + bump row height to 44px. | S |

**Cross-cutting table notes:**
- `components/ui/table.tsx` Tailwind classes use `text-left` (LTR-only) instead of `text-start`. In Arabic/RTL the heading alignment will not flip. **High** — flip to `text-start` in the base component.
- The Tabs strips on PortfolioPage / ProductPage / ResourceProfilePage / FeatureFinancialPlanning (`overflow-x-auto flex-nowrap`) work, but there is no fade gradient or scroll indicator, so users on phone don't realize there are more tabs offscreen. **Medium**.

### 1.2 Modals & dialogs

| # | Component | Issue | Severity | Recommended fix | Effort |
|---|---|---|---|---|---|
| M1 | `components/ui/dialog.tsx` base `DialogContent` | `fixed left-[50%] top-[50%] ... w-full max-w-lg ... translate-x-[-50%] translate-y-[-50%]` — no mobile full-screen variant. On 360px the dialog is ~344px wide with hard corners that sit on the viewport edge. Padding is `p-6` (24px) which steals readable width. | **High** | Add a mobile branch: `inset-0 max-w-none translate-x-0 translate-y-0 h-full rounded-none sm:inset-auto sm:left-[50%] sm:top-[50%] sm:rounded-lg`. Single change benefits **every** dialog. | S |
| M2 | All form dialogs using `sm:max-w-md / lg / 2xl` with `max-h-[90vh] overflow-y-auto` (PortfolioFormDialog, ProductFormDialog, EditProductProfileDialog, ResourceFormDialog, AssignmentFormDialog, FeatureFormDialog, ReleaseFormDialog, ScenarioConfigModal) | Footer (Save/Cancel) is **inside** the scrolling area, so on a short phone the user must scroll a long form to find Save. No sticky header/footer. | **High** | Refactor pattern: make `DialogHeader` `sticky top-0`, scrollable middle `flex-1 overflow-y-auto`, `DialogFooter` `sticky bottom-0` — all inside a `flex flex-col h-full` content. | M |
| M3 | `FeatureFinancialPlanning.tsx` line 793 — Financial Planning modal | `w-[95vw] max-w-[1400px] h-[90vh]`. The two-column layout (content + right `aside` summary at line 1220) is `min-[1100px]:sticky` — below 1100px the summary collapses to *below* the content. On phone the user must scroll past the entire form to see the live summary. | **High** | Below 768px: pin the summary as a horizontal compact strip at the top (sticky), not the bottom; collapse to 2–3 KPI numbers. | M |
| M4 | `forecast/ForecastAssumptionsPanel.tsx` line 167 | `max-w-[1280px] w-[96vw] h-[90vh]` with `lg:border-s` aside. Below `lg` the summary `aside` becomes `border-t` and stacks below — same scroll-past problem as M3. | **High** | Same fix as M3. | M |
| M5 | `ForecastMatrixGrid.tsx` line 408 — bulk-fill prompt | Renders its own `fixed inset-0 z-50` overlay instead of using `<Dialog>`. Skips focus trap, ESC handling outside the input, and a11y wiring. | **Medium** | Replace with shadcn Dialog. | S |
| M6 | `EditProductProfileDialog.tsx` line 949 — nested AlertDialog inside a `max-h-[85vh] overflow-y-auto` Dialog | Nested modals on iOS Safari sometimes inherit body-scroll-lock issues; the inner alert can render below the outer when both are open. | **Medium** | Verify with browser test; consider hoisting AlertDialog out of the Dialog tree. | S |

### 1.3 Navigation / Sidebar

| # | Issue | Severity |
|---|---|---|
| N1 | `Sidebar.tsx` mobile toggle is `fixed top-3 start-3 z-50` — overlaps the page H1 / breadcrumb on every page below 768px. On Dashboard it sits on top of the date filter chip. | **High** |
| N2 | Mobile drawer width is `w-56 sm:w-64` (~224–256px). On 360px that leaves only 104px of dimmed page behind it — fine. But the drawer has no visible Close button inside it; user must tap the dimmed overlay or the toggle (which is now hidden behind the drawer header). | **Medium** |
| N3 | Sidebar active-state border uses `border-inline-end: 3px solid` (good — RTL-safe). ✅ |
| N4 | No hamburger animation, no haptic; pure visual swap. Acceptable. | **Low** |

### 1.4 Typography & touch density

| # | Issue | Severity |
|---|---|---|
| Y1 | `index.css` body is `font-size: 14px` with `line-height: 1.6`. **189 occurrences** of `text-[10px] / text-[11px] / text-[9px]` in the codebase, concentrated in FeatureFinancialPlanning, EditProductProfileDialog, ForecastMatrixGrid. On a 360px phone these render below the 12px legibility floor. | **High** |
| Y2 | Many table rows use `py-1.5` / `py-2` (~28–32px row height) — well below the 44×44px tap target on mobile. Affects every table flagged in 1.1 plus dropdown menu items. | **High** |
| Y3 | All `Input` components are `text-base ... md:text-sm` — base is 16px which prevents iOS auto-zoom ✅. **But** `FeatureFinancialPlanning.tsx` overrides with `className="h-7/8 text-xs"` on dozens of inline inputs (e.g. lines 850, 1031, 1140, 1193). On iOS Safari every focus on those will zoom the page. | **High** |
| Y4 | `card-elevated:hover { -translate-y-0.5 }` — pure hover affordance with no touch equivalent. Cards on mobile look static. | **Low** |

### 1.5 Forms

| # | Issue | Severity |
|---|---|---|
| F1 | Date inputs use `<Input type="date" />` everywhere (AssignmentFormDialog, FeatureFormDialog, ProductDocumentation, ProductFormDialog, ReleaseFormDialog). On iOS Safari this opens the native picker ✅, on macOS Safari it falls back to a plain text input with a tiny stepper — known Safari quirk; users can't see a calendar. | **Medium** |
| F2 | Number inputs use `type="number"` but no `inputMode="decimal"` or `inputMode="numeric"`. On Android the keyboard is correct (decimal), on iOS it shows the alphanumeric keyboard with a small numeric row. | **Medium** |
| F3 | Validation errors: `validation.ts` exists but spot-checks of FeatureFinancialPlanning show inline `text-[10px] text-destructive` messages with no `role="alert"` / `aria-live`, and no `aria-invalid` on the offending input. Screen readers won't announce the error. | **Medium** |
| F4 | Several inputs use placeholder as the only label hint (e.g. `placeholder="0"` in cost rows). Labels exist for the form-level field but the per-row inputs are bare. | **Medium** |

### 1.6 Charts (Recharts)

| # | Issue | Severity |
|---|---|---|
| C1 | All charts use `<ResponsiveContainer width="100%" height="100%">` ✅. No fixed widths found. | — |
| C2 | Tooltips: Recharts default behavior is hover-only on touch devices. The custom tooltip in `FeatureForecast.tsx` line 226 etc. inherits this. On a phone, tap-to-show works for the first tap but the tooltip frequently misaligns or disappears on scroll. | **Medium** |
| C3 | Legends are not configured to wrap; long service names overflow on narrow charts. Spot-checked in the user's session replay (Jul tooltip at 60×10px, narrow viewport). | **Medium** |
| C4 | No RTL-aware axis flip — time axis runs left-to-right even in Arabic, which conflicts with the Arabic reading direction expectation noted in Part 4 of the brief. | **Low** (debatable convention; document and decide) |

### 1.7 Cross-browser

| # | Risk area | Status from static analysis | Severity |
|---|---|---|---|
| X1 | Safari `flexbox gap` | Tailwind compiles to `gap:` directly. Supported in Safari 14.1+ (April 2021). Acceptable. | — |
| X2 | Sticky columns inside `overflow-x-auto` on iOS Safari | `ForecastMatrixGrid` and `FeatureForecast` use `sticky start-0` + `overflow-x-auto`. **Known to glitch on iOS Safari < 16** (sticky cell loses background during momentum scroll, content bleeds through). | **Medium** |
| X3 | `Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' })` | Renders Arabic-Indic digits (٠١٢٣...) and the SAR symbol differently across Chrome/Safari/Firefox. Per user direction: **document only, do not change**. Current output: Chrome and Safari both render `ر.س.‏ ١٬٢٣٤` in Arabic mode; Firefox prefixes differently. Mixed digit systems on the same page when language=ar (charts axis labels are Western, body is Arabic-Indic). | **Medium** (document) |
| X4 | Custom scrollbar in `index.css` (`::-webkit-scrollbar`) | WebKit-only. Firefox shows default scrollbars. Acceptable degradation. | **Low** |
| X5 | localStorage in Safari Private mode | `featureForecast.ts:273-333`, `forecastEngine.ts:276-292`, and `useFeatureForecastSettings`/`useForecastSettings` call `localStorage.getItem/setItem` with **no try/catch**. `AppContext.tsx` likewise has no localStorage error handling visible (grep returned 0 try/catch hits). In Safari Private mode `setItem` throws `QuotaExceededError` and the entire app will crash with no error boundary to catch it. | **Critical** |
| X6 | No `<ErrorBoundary>` anywhere in the tree (grep: 0 hits). Any unexpected render error white-screens the whole app. | **Critical** |
| X7 | Arabic font `Tajawal` loaded from Google Fonts at runtime (`@import url(...)` in index.css line 6). On slow connections the page renders with fallback first, then re-flows. Also placed **after** `@tailwind` directives — Vite warns about this in build output (the warning the user already saw). | **Low** |

### 1.8 RTL audit

| # | Issue | Severity |
|---|---|---|
| R1 | `components/ui/table.tsx` uses `text-left` on `<TableHead>` — does **not** flip in Arabic. All shadcn tables in the app inherit this. | **High** |
| R2 | `components/ui/dialog.tsx` close button is `absolute right-4 top-4` — does not flip to left in RTL. Same in `alert-dialog.tsx`, `sheet.tsx`. | **High** |
| R3 | `Sidebar.tsx` correctly conditionalizes chevron direction on `isRTL` and uses `start-/end-` logical properties ✅. Good template for the rest. | — |
| R4 | The mobile drawer slide direction is correctly flipped: `mobileOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'` ✅. |
| R5 | Number inputs inside RTL container — `tabular-nums` is used widely ✅. Spot-check showed digits render LTR inside RTL block, as desired. | — |
| R6 | Date input in Arabic locale: `formatDate` in `lib/utils.ts` uses `'ar-SA'` which produces Hijri-tinged labels in some browsers. No Gregorian-with-Arabic-month-names fallback. | **Medium** |
| R7 | Charts axes do not flip in RTL (see C4). | **Low** |
| R8 | Tabs strips (`flex-nowrap overflow-x-auto`) — reading order does flip via document `dir`, but the scroll-snap origin doesn't, so the *first* tab appears off-screen on the right when Arabic + narrow viewport. | **Medium** |

### 1.9 Loading / empty / error / feedback states

| # | Issue | Severity |
|---|---|---|
| S1 | App loads from in-memory + localStorage — no async fetches → no loading states needed currently ✅. *(If a backend is added later, every page needs skeletons.)* |
| S2 | Empty states: `CompareEmptyState.tsx` exists and is well done ✅. Other empty cases (no portfolios, no resources, no features) render a bare empty container or fall through to "—" cells. | **Medium** |
| S3 | Error states for form submission: many handlers `try { ... addPortfolio(...) } catch` patterns are missing in spot checks. Save buttons don't show a loading state during work (synchronous in this app, but if Save grows, missing). | **Low** (current), would be **High** with backend |
| S4 | Toast usage: sonner is wired ✅ but inconsistent — some saves toast, some don't. Need a consistency pass. | **Medium** |
| S5 | Destructive actions: `AlertDialog` is used for some deletes (PortfolioStrategicAlignment, EditProductProfileDialog, FeatureFinancialPlanning) ✅. Spot-check resource delete and release delete — not verified, may be missing. | **Medium** |
| S6 | No "Undo" affordance on any destructive toast. | **Low** |

### 1.10 Accessibility basics

| # | Issue | Severity |
|---|---|---|
| A1 | `aria-label` count: 20 occurrences across the entire codebase — too low given the number of icon-only buttons (`size="icon"` in PortfolioStrategicAlignment, creatable-select, sidebar trigger, etc.). | **High** |
| A2 | Focus styles are good in shadcn primitives (`focus-visible:ring-2`) ✅. Custom buttons in `ForecastMatrixGrid` (cells) don't show a focus ring per-cell, only on the container. | **Medium** |
| A3 | Color contrast: `text-muted-foreground` is `220 9% 46%` on `220 20% 97%` background = ~4.6:1 ✅ (passes AA body). `text-[10px] text-muted-foreground` fails large-text rule because it's small text and contrast is borderline. | **Medium** |
| A4 | Only 1 `<img>` tag in the entire codebase (`ProductOverview.tsx` product logo) and it has alt text ✅. Lucide icons are inline SVGs without role/aria-hidden — fine because they're decorative when paired with text labels. | — |
| A5 | Form inputs: most use `<Label>` properly via shadcn `<FormLabel>` ✅. The handful of bare `<input>` and `<Input>` calls inside table cells (FeatureFinancialPlanning) have no label association. | **Medium** |
| A6 | Tab focus order: not tested in this audit (would require keyboard-driven browser session). | **Unknown** |

### 1.11 Performance

| # | Issue | Severity |
|---|---|---|
| P1 | Bundle is 1.42 MB un-split (warning the user already saw). One big `index.js`. Affects mobile cold start over 3G/4G significantly. Recommend route-level `React.lazy` on heavy pages (Dashboard, ProductPage, FeatureFinancialPlanning, ForecastAssumptionsPanel). | **High** |
| P2 | No image optimization needed — only the product logo and SVGs. ✅ |
| P3 | Recharts re-render on every state tick in FeatureFinancialPlanning (no memoization on chart data computation visible). Likely jank on phone. | **Medium** |
| P4 | LocalStorage parsed on every read in `featureForecast.ts` — fine for small data, would matter at scale. | **Low** |

---

## 2. Issues NOT fixed / deferred for design decisions

These need product input before any code changes:

1. **Card-vs-scroll decision per table** — the brief says ">3 columns becomes vertical card layout", but Tables T2/T3 (forecast grids) carry 12–36 month columns; a card-per-cell explosion is unworkable. We need to decide between (a) accordion-by-row, (b) collapsed-summary + drill-in modal, or (c) accept "desktop only" for the forecast direct-entry workflow.
2. **Arabic digit policy** — current behavior produces mixed digit systems on the same screen (chart axes Western, body Arabic-Indic). Per direction this round we document only, but it is a real consistency bug that needs a verdict.
3. **Date format in Arabic locale** — Hijri vs Gregorian with Arabic month names. Picked silently by `Intl.DateTimeFormat('ar-SA')` today.
4. **Chart axis direction in RTL** — flipping the time axis is a debatable convention; needs stakeholder confirmation.
5. **Mobile information architecture for the Gantt-style table** in ProductPage line 385 — vertical timeline? Horizontal scroll with sticky labels? Hide entirely on phone? Out of scope to guess.
6. **Sidebar tablet behavior (768–1024)** — brief says "collapsible on tablet". Today the sidebar is hidden < 768px (mobile drawer) and persistent ≥ 768px. The `iPad portrait` (768×1024) and `iPad landscape` (1024×1366) experience needs an explicit collapsed-rail-with-icons mode.
7. **Hover affordances in `ForecastMatrixGrid`** ("Set rate" link only appears on `:hover`) — needs a touch-equivalent (maybe always-visible at < 1024px, or long-press).
8. **Cross-browser visual QA at 9 breakpoints × 6 browsers** was not performed in this audit (would require ~50+ browser-tool calls; user opted for "spot-check only"). Issues above are predicted from code patterns. Visual QA recommended as a follow-up round.

---

## 3. Testing matrix

Static code analysis covers all breakpoints/browsers uniformly. Live spot-checks:

| Breakpoint / Browser | Static analysis | Live preview spot-check | Notes |
|---|---|---|---|
| 360 px (small Android) | ✅ | — | Predicted issues T1–T5, M1, N1, Y1, Y2 |
| 390 px (iPhone 14) | ✅ | — | Same |
| 428 px (iPhone Pro Max) | ✅ | ✅ (user's current viewport) | Confirmed: tooltip on chart works tap-then-tap-again to clear; sidebar mobile toggle visible top-left |
| 768 px (iPad portrait) | ✅ | — | Sidebar transitions kick in at this exact breakpoint; verify no flash |
| 1024 px (iPad landscape) | ✅ | — | Two-column dialog layouts collapse here |
| 1280 / 1440 / 1920 px (laptop/desktop) | ✅ | — | Primary design target; no concerns |
| 2560 px (large monitor) | ✅ | — | App is centered (no `max-w` on `MainLayout main`) — content may stretch unhelpfully wide. Low. |
| Chrome desktop | ✅ | — | Primary target |
| Safari desktop | ✅ | — | Predicted: X2 sticky bug, F1 date input quirk |
| Firefox desktop | ✅ | — | Predicted: X4 default scrollbars |
| Edge desktop | ✅ | — | Equivalent to Chrome |
| Safari iOS | ✅ | — | Predicted: X2, X5 (private mode), Y3 (auto-zoom on `text-xs` inputs) |
| Chrome Android | ✅ | — | Predicted: T1–T9 cramped tables |

**Known limitations of this audit:**
- No live browser-based reproduction at each breakpoint × browser combination.
- No keyboard-tab traversal performed end-to-end.
- No screen-reader audit (VoiceOver / NVDA).
- No automated Lighthouse / axe-core scan (project has no CI for it).
- Arabic visual rendering verified only via code, not visually compared across Chrome / Safari / Firefox.

A follow-up "fix round" should request explicit browser verification budget for the items marked Critical and High.

---

## 4. Suggested fix order (when you give the go-ahead)

1. **X5 + X6** — wrap localStorage calls in try/catch and add a top-level `<ErrorBoundary>`. (~30 min, no design decisions needed.)
2. **M1 + M2** — full-screen mobile dialogs with sticky header/footer in the base `dialog.tsx`. Single-component change benefits all forms. (~1h.)
3. **R1 + R2** — flip `text-left` → `text-start`, move dialog close button to `start-4`. (~30 min.)
4. **Y3** — bump inline financial-planning input font size to ≥16px on mobile to kill iOS auto-zoom. (~30 min.)
5. **N1** — reposition the mobile sidebar toggle so it doesn't overlap page headers. (~15 min.)
6. **A1** — sweep icon-only buttons and add `aria-label`s. (~45 min.)
7. **T1–T9** — table → card conversions, after you decide the per-table strategy from §2.1.
8. **P1** — route-level lazy loading. (~1h.)

Items 1–6 are all "no design decisions required" and could ship as a single PR.

---

*End of report.*

---

## Round 1 — fixes shipped (2026-04-22)

After delivering the audit, the following "no design decisions required" items from §4 were applied. **Verified:** TypeScript 0 errors, 25/25 tests passing.

| # | Fix | Files | Audit ref |
|---|---|---|---|
| 1 | **Top-level `<ErrorBoundary>`** wraps the app — recoverable error card with reload CTA replaces white-screen on render errors. | `src/components/ErrorBoundary.tsx` (new), `src/App.tsx` | X6 |
| 2 | **Mobile full-screen `Dialog` + `AlertDialog`** — below `sm` (640px) every dialog is full-screen with native scroll; above `sm` keeps the centered floating-card layout. Solves "Save scrolls away" + cramped-padding issues for **every** form dialog at once. | `src/components/ui/dialog.tsx`, `src/components/ui/alert-dialog.tsx` | M1, M2 |
| 3 | **RTL: dialog close button** moved from `right-4` to `end-4` (logical property) — flips correctly to the left in Arabic. Header/footer alignment classes also moved from `text-left` to `text-start`. | `src/components/ui/dialog.tsx`, `src/components/ui/alert-dialog.tsx` | R2 |
| 4 | **RTL: table headers** changed from `text-left` to `text-start` in the base `<TableHead>` — every shadcn table now flips correctly in Arabic. | `src/components/ui/table.tsx` | R1 |
| 5 | **Mobile sidebar toggle** moved from `start-3` (overlapped page H1 / date filter) to `end-3`, padded to a 44×44 tap target, given proper `aria-label` and `aria-expanded`. | `src/components/Sidebar.tsx` | N1 |
| 6 | **iOS auto-zoom killed** on Financial Planning inline inputs — every `text-xs h-7/8` input now renders `text-base h-10` on mobile, drops to compact size at `md+`. 7 inputs updated (service editor, utilization, cost rows). | `src/components/FeatureFinancialPlanning.tsx` | Y3 |

### Audit corrections

While applying fixes I discovered three audit items were partially or fully overstated and have been corrected here:

- **X5 (localStorage in Safari Private mode)** — `featureForecast.ts` and `forecastEngine.ts` already wrap `getItem`/`setItem` in `try { } catch { }` blocks. `AppContext.tsx` does not touch localStorage at all (state is in-memory only). The crash risk this round is **low**, not Critical. The audit note stands as a future-proofing reminder if more persistence is added.
- **A1 (icon-only buttons missing `aria-label`)** — spot-check after the fact showed the four flagged components (`PortfolioStrategicAlignment`, `creatable-select`, `sidebar-trigger`) all already carry either `aria-label` or `<span className="sr-only">`. Severity downgraded to **Low** pending a wider sweep.
- **M2 (sticky header/footer inside form dialogs)** — partially addressed by Fix #2: on mobile the entire dialog now scrolls naturally and Save/Cancel land at the bottom of the form within reach. A future round can add `sticky` header/footer for very long forms (PortfolioFormDialog, EditProductProfileDialog) but the critical "Save is invisible" failure mode is resolved.

### Still outstanding (deferred per §2)

All Critical/High items from §1.1 (table → card conversions T1–T9), the 1100px-summary-collapse pattern in M3/M4, sidebar tablet-rail mode, and the cross-browser visual matrix remain. They need either design decisions or browser-verification budget before a fix round.

---

## Round 2 — fixes shipped (2026-04-22)

Continuation of §4 items 6–8. **Verified:** TypeScript 0 errors, 25/25 tests passing, production build succeeds.

| # | Fix | Files | Audit ref |
|---|---|---|---|
| 7 | **Icon-only buttons labelled** — added `aria-label` to View/Download/Edit/Delete document buttons, product-logo Replace/Remove/Upload buttons, and the Financial Planning back button. Existing labelled buttons (`PortfolioStrategicAlignment`, `creatable-select`, `sidebar`) verified untouched. | `src/components/ProductDocumentation.tsx`, `src/components/ProductOverview.tsx`, `src/components/FeatureFinancialPlanning.tsx` | A1 |
| 8 | **Route-level lazy loading** — `PortfolioPage`, `ProductPage`, `ResourcesPage`, `ResourceProfilePage` now load via `React.lazy` + `<Suspense>` with a spinner fallback. Dashboard remains eager (initial view). | `src/components/MainLayout.tsx` | P1 |

### Bundle impact (P1)

| Chunk | Before | After |
|---|---|---|
| Main `index.js` | 1.42 MB | **1.11 MB** (gzip 323 KB) |
| `ProductPage` | (in main) | 232 KB lazy |
| `PortfolioPage` | (in main) | 42 KB lazy |
| `ResourceProfilePage` | (in main) | 17 KB lazy |
| `ResourcesPage` | (in main) | 5 KB lazy |

First paint now ships ~22 % less JS; visiting Portfolio/Product/Resource pages fetches their chunk on demand.

### Still outstanding

Same as after Round 1 — table→card conversions (T1–T9), summary-collapse pattern (M3/M4), sidebar tablet-rail mode, and the cross-browser visual matrix. All require design decisions or browser-verification budget.
