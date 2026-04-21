# Compare by Duration — Implementation Plan

## Confirmed decisions
- **Selector placement**: Only when Compare is ON. Hidden by default; appears below the date filter when toggled.
- **Selected state**: Always shown as removable chips in the page header while Compare is ON.
- **Comparison UI**: Inline delta on KPI cards (Current primary, Δ + % chip below). Tables get Δ% columns. Charts overlay comparison as dashed series aligned by month index.
- **Scope per page**: Dashboard → portfolios + products · Portfolio → products · Product → features.
- **Delivery**: Phased — Logic layer first, then Dashboard, then Portfolio, then Product. Each phase ends with a clean `tsc --noEmit` and verified preview.

## Phase 1 — Shared logic & primitives (no visible UI change)
1. `src/lib/compare.ts` (new) — pure helpers:
   - `computeWindowMetrics(state, window, { portfolioIds?, productIds?, featureIds? })` → revenue/cost/profit/margin/counts scoped by entity filter
   - `computeDelta(current, comparison, { lowerIsBetter? })` → `{ abs, pct, trend }`
   - `validateCompareWindows(primary, comparison)` → `{ ok, errors[], warnings[] }`
2. `src/context/AppContext.tsx` — extend with `compareSelection: { portfolioIds, productIds, featureIds }` and `setCompareSelection`. Reset when Compare toggles off.
3. `src/hooks/useCompareMetrics.ts` (new) — page-aware hook returning `{ current, comparison, delta, validation, hasCurrent, hasComparison }`.
4. UI primitives in `src/components/compare/`:
   - `DeltaChip.tsx` — ▲/▼/— chip (semantic tokens, supports `lowerIsBetter`)
   - `KPIDelta.tsx` — slot for KPI cards
   - `EntityMultiSelectChips.tsx` — popover multi-select + always-visible removable chips with "All" pill
   - `CompareEmptyState.tsx` — no-data / partial / invalid-range message
   - `CompareLegend.tsx` — solid = current, dashed = comparison

## Phase 2 — Department Dashboard
- KPI cards (revenue, cost, profit, target%, products) → `KPIDelta` slot when Compare is ON.
- `EntityMultiSelectChips` (Portfolios + Products) appears under `GlobalDateFilter` only when `compareEnabled`. Selection chips remain visible in header sub-row.
- `RevenueCostLineChart` → dashed comparison series aligned by month index + `CompareLegend`.
- `PortfolioBarChart` / `PortfolioDonutChart` → grouped current vs comparison, respect portfolio selection.
- `ProductTable` → Δ% columns for revenue/cost/profit, respect product selection.
- Validation banner from `validateCompareWindows` if invalid.

## Phase 3 — Portfolio Page
- Same pattern, scope = products inside the portfolio.
- KPI cards, financial summary cards, charts, products table driven by `useCompareMetrics`.

## Phase 4 — Product Page
- Same pattern, scope = features inside the product.
- KPI/financial cards, feature table, roadmap-impacted summaries get current vs comparison + Δ%.

## Phase 5 — Validation, error/no-data, responsive, regression
- Validation surfaced via `CompareEmptyState` / inline banners: invalid range, same start=end, overlap warning, no data (current/comparison/both/partial).
- Responsive: chips wrap; popover `w-[min(360px,90vw)]`; tables horizontal scroll on mobile.
- Localization: new strings added EN + AR; RTL-safe (`me-`/`ms-`).
- Regression sweep: non-compare views visually unchanged; existing date filter and financial reconciliation untouched.

## Phase 6 — Tests & E2E report
- Unit tests: `compare.test.ts` (delta, validation, scoped metrics, edge cases) and `useCompareMetrics.test.tsx`.
- Component smoke tests for `DeltaChip`, `EntityMultiSelectChips`, `KPIDelta`.
- Final E2E regression report covering: Compare off, Compare on (All / Single / Multi), no-data states, invalid range, responsive (desktop/tablet/mobile), EN + AR.

## Constraints honored
- Reuse `monthlyCostForRow`, `computeCostForMonths`, `monthsInDateRange` from `src/lib/utils.ts`.
- Reuse RHF + Zod patterns from `src/lib/validation.ts`.
- No backend changes. Semantic design tokens only. No unrelated changes.

## Assumptions
- Empty entity selection = treated as "All" with subtle hint chip.
- Line charts align by **month index** so windows of different lengths render coherently; longer window defines X axis.
- For cost, lower = positive trend (`DeltaChip lowerIsBetter`).
