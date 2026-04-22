

# Consolidated Engineering Handoff — Last 24h Changes

This is a **read-only summary** consolidating all material changes from **2026-04-21 07:12 → 2026-04-22 06:42** into a single handoff manifest for the GitLab engineering repo. No code is modified by this plan; once you approve, I'll switch to default mode and write the manifest file plus capture before/after screenshots.

## What changed in the last day (chronological)

1. **Financial calculations unified (Single Source of Truth)** — 04-21 07:19
2. **"Add Portfolio" / "Add Product" full-profile dialogs** — 04-21 07:28
3. **Validation pass on all form dialogs** (zod + react-hook-form, error toasts) — 04-21 ~10:00
4. **Edit Product Profile dialog** rebuilt with strict validation/limits — 04-21 11:17
5. **Strategic Alignment as managed entity** with bidirectional Portfolio↔Product linking — 04-21 11:26
6. **Terminology + formula standardization** ("Planned" → "Target", removed × 1.35 multiplier, Net Profit = Actual − Cost everywhere) — 04-21 12:59
7. **Revenue model refactor** to subscription-driver model: `Revenue = Rate × Transactions`, per-feature service catalog, legacy migration — 04-21 19:40
8. **Phase 2 service breakdowns** in Compare/Forecast/Drivers — 04-21 19:49
9. **Forecast module total redesign (Schema v3)** — direct-entry per-cell grid replacing Simple/Seasonal/Matrix modes — 04-21 22:05
10. **Forecast page cleanup** — removed Cost Forecast, Profit Projection, Per-service baseline; enlarged Revenue chart — 04-21 22:13
11. **PortfolioFormDialog** silent-validation fix (`onInvalid` toast) — 04-21 22:17
12. **a11y chart fix** — `AccessibleFigure` inner wrapper height — 04-22 06:18
13. **Dialog layout fixes** — Monthly Financial Planning, Forecast Assumptions, Edit Product Profile, Edit Resource — 04-22 06:21–06:38
14. **Global dialog refactor** in `src/components/ui/dialog.tsx` to 3-row flex (header / scrollable body / footer) — 04-22 06:42

---

## Formulas locked in (canonical, all levels)

**Hierarchy** Feature → Product → Portfolio → Department. Feature is single source of truth; all higher levels are pure summation.

```text
Per Feature, per month:
  RevenueLine.planned = rate × plannedTransactions
  RevenueLine.actual  = rate × actualTransactions
  Feature.TargetRevenue(window) = Σ RevenueLine.planned for months ∈ window
  Feature.ActualRevenue(window) = Σ RevenueLine.actual  for months ∈ window
  Feature.Cost(window)          = Σ monthlyCostForRow(c) for months ∈ window
                                  (cost row's startDate/endDate intersected with window)

Roll-up (Product/Portfolio/Department):
  TargetRevenue = Σ children.TargetRevenue
  ActualRevenue = Σ children.ActualRevenue
  Cost          = Σ children.Cost

Derived (every level):
  NetProfit       = ActualRevenue − Cost
  Margin          = NetProfit / ActualRevenue          (0 if ActualRevenue = 0)
  Achievement %   = round(ActualRevenue / TargetRevenue × 100)
                    → 0 if TargetRevenue = 0
                    → may exceed 100 (valid)

Forecast (Schema v3, per scenario):
  data[serviceId][monthIndex] = { transactions, rate? }
  Projected revenue per cell  = transactions × (rate ?? service.defaultRate)
  Projected cost per month    = baselineCost × (1 + costGrowthRate/100) ^ monthIndex
```

The `× 1.35` target multiplier was **removed**. Annual-fixed target logic was also removed in favor of pure summation per spec #226.

---

## Manifest deliverable (will be written on approval)

A single `.lovable/change-manifest.yaml` covering the full 24-hour window with `bucket: data-contract` (most invasive bucket wins), listing:

- **New entities**: `RevenueService`, `RevenueLine`, `StrategicObjective`
- **New fields**: `Product.strategicObjectiveIds: int[]`, `Feature.revenueServices`, `Feature.revenueLines`, `ForecastSettings.schemaVersion=3`, `ForecastSettings.scenarios[].data[serviceId][monthIndex]={transactions, rate?}`, `ForecastSettings.scenarios[].costGrowthRate`
- **Removed/renamed**: "Planned Revenue" → "Target Revenue" everywhere; removed `× 1.35`; removed forecast Simple/Seasonal/Matrix modes, growth rates, seasonal presets, Ramadan auto-detect, override indicators
- **New API calls (engineering must add)**:
  - `GET/POST/PUT/DELETE /api/v1/strategic-objectives?portfolioId={int}`
  - `GET/POST/PUT/DELETE /api/v1/features/{id}/revenue-services`
  - `GET/POST/PUT/DELETE /api/v1/features/{id}/revenue-lines?month={YYYY-MM}`
  - `GET/PUT /api/v1/features/{id}/forecast-settings` (schema v3)
- **New enum values**: none (existing `FeatureStatus`, `ReleaseStatus`, etc. unchanged)
- **Acceptance criteria**: 8 testable bullets covering roll-up parity, terminology, edge cases (zero target, null values, actual > target), real-time recalculation, date-filter propagation, and dialog layout
- **stack_port_hints**: all in-memory `AppContext` mutations to be ported to REST writes; legacy `revenuePlan`/`revenueActual` arrays are derived views — engineering should drop them and read directly from `revenue_lines` table
- **known_limitations**: state is in-memory (no persistence across reload); legacy migration creates "Legacy Revenue" service rows that users must rename

## Files affected (full list)

**Created** (10): `EditProductProfileDialog.tsx`, `PortfolioFormDialog.tsx`, `ProductFormDialog.tsx`, `StrategicObjectiveDialog.tsx`, `PortfolioStrategicAlignment.tsx`, `compare/ServiceBreakdownTable.tsx`, `forecast/ForecastAssumptionsPanel.tsx`, `forecast/ForecastMatrixGrid.tsx`, `ui/multi-select.tsx`, `a11y/AccessibleFigure.tsx`

**Modified** (~25): `lib/utils.ts`, `lib/featureForecast.ts`, `lib/compare.ts`, `hooks/useHierarchicalMetrics.ts`, `hooks/useFeatureForecastSettings.ts`, `hooks/useCompareMetrics.ts`, `context/AppContext.tsx`, `types/index.ts`, `data/initialData.ts`, `i18n/translations.ts`, `pages/Dashboard.tsx`, `pages/PortfolioPage.tsx`, `pages/ProductPage.tsx`, `components/FeatureFinancialPlanning.tsx`, `FeatureForecast.tsx`, `ProductOverview.tsx`, `RevenueAreaChart.tsx`, `RevenueCostLineChart.tsx`, `dashboard/UpcomingRevenueDrivers.tsx`, plus dashboard chart wrappers and `ui/dialog.tsx` global refactor

**Protected files touched (flagged for engineering review)**:
- `src/context/AppContext.tsx` — added revenue service/line + strategic objective CRUD actions; legacy `revenuePlan`/`revenueActual` now derived
- `src/types/index.ts` — new entity interfaces
- `src/i18n/translations.ts` — ~30 new keys EN+AR

## What I'll do once you approve

1. Create `/dev-server/.lovable/change-manifest.yaml` with the full v1 schema filled in
2. Capture before/after screenshots of affected screens to `/dev-server/.lovable/screens/2026-04-22/`:
   - Dashboard, PortfolioPage, ProductPage, FeatureFinancialPlanning, FeatureForecast, ForecastAssumptionsPanel, EditProductProfileDialog, ResourceFormDialog, PortfolioStrategicAlignment
3. Echo the same YAML in chat inside a ` ```yaml ` block

No source code changes — this is documentation/handoff artifact only.

