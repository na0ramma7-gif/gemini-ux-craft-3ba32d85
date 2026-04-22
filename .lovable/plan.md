

# Business TODO List — Yesterday's Changes to Port to Your New Stack

I'll produce **one plain-English Markdown document** (`/mnt/documents/engineering-todo-2026-04-22.md`) written for your engineers, organized as a checklist of business changes from 2026-04-21 → 2026-04-22. No code in your project will be touched.

## Document structure

### Part 1 — The 6 business decisions that changed yesterday

For each: one paragraph in plain language, then a "What your stack must do" checklist.

1. **Revenue is now Rate × Transactions, not a typed-in number**
   - Old: users typed Planned Revenue and Actual Revenue per feature per month.
   - New: users define *services* (subscriptions/products) per feature with a default rate, then enter *transactions* per month. Revenue is computed.
   - Stack TODO: new tables `revenue_services`, `revenue_lines`; drop `revenue_plans` / `revenue_actuals` after migration; migration rule = one synthetic "Legacy Revenue" service per feature, rate=1, plannedTx=oldExpected, actualTx=oldActual.

2. **The 1.35× target multiplier is gone**
   - Old: Target = Planned × 1.35.
   - New: Target = sum of feature target revenue, no multiplier. Pure roll-up Feature → Product → Portfolio → Department.
   - Stack TODO: remove the multiplier from any aggregation; Achievement % = round(actual/target×100), returns 0 when target=0, may exceed 100.

3. **"Planned" renamed to "Target" everywhere in the UI**
   - Labels only — no DB column renames required. Update display strings + new EN/AR keys (~30 keys, listed in Appendix A).

4. **Strategic Objectives became a real entity**
   - Old: free-text on Product.
   - New: managed list per Portfolio. Products link M:N to objectives in their own portfolio.
   - Stack TODO: new table `strategic_objectives`; join `product_strategic_objectives`; cascade delete clears product links; new CRUD endpoints.

5. **Forecast module rebuilt — Schema v3 (direct entry grid)**
   - Old: Simple/Seasonal/Matrix modes with growth %, seasonal presets, Ramadan auto, override flags.
   - New: a grid where the user types transactions per service per month, optional per-cell rate override, plus a single `costGrowthRate` for compounding cost.
   - Stack TODO: store as JSON column or split table `(scenario_id, service_id, month_index, transactions, rate?)`; remove old mode/growth/seasonal columns; one-time migration replays old assumptions into explicit per-month numbers.

6. **Form & dialog hardening (no schema impact, UX contract)**
   - All create/edit dialogs now use zod validation with inline errors and toasts on invalid submit.
   - All tall dialogs have pinned header/footer with a scrollable middle (3-row flex). Mirror this pattern when porting components.

### Part 2 — Flat checklist (copy-paste into Jira/Linear)

- [ ] Create `revenue_services` table + EF entity + REST CRUD
- [ ] Create `revenue_lines` table + EF entity + REST CRUD (bulk upsert by feature+month)
- [ ] Migrate legacy `revenue_plans` / `revenue_actuals` → `revenue_lines` via "Legacy Revenue" service (rate=1)
- [ ] Drop `Feature.expectedRevenue` / `actualRevenue` after migration verified
- [ ] Remove the ×1.35 target multiplier from any aggregation query / report
- [ ] Update Achievement % formula (target=0 ⇒ 0; uncapped above 100)
- [ ] Create `strategic_objectives` + `product_strategic_objectives` join + CRUD; cascade-delete clears links
- [ ] Add `Product.strategicObjectiveIds` to update payload (validate same portfolio)
- [ ] Replace Forecast schema with v3 (per-cell grid); remove mode/growth/seasonal/Ramadan/override columns
- [ ] Implement migration that replays v1/v2 forecast assumptions into explicit per-month transactions
- [ ] Update all UI labels Planned→Target; ship ~30 new EN+AR translation keys (Appendix A)
- [ ] Apply zod-equivalent validation rules to all create/edit endpoints (Appendix B)
- [ ] Confirm cost model: monthly cost rows preferred; CAPEX falls back to total/amortization; date-window intersection per row

### Part 3 — Appendix

- **A** — Translation keys delta (added / changed / removed), EN + AR
- **B** — Validation rules per field (min/max/required), extracted from the dialogs
- **C** — New REST endpoint list with one-line purpose each
- **D** — Cross-reference: business item → Lovable file path (so engineers can read the source if they want)

## What this doc deliberately leaves out

- No YAML manifest (you already have it).
- No JSON examples or .http files.
- No screenshots embedded (already in `.lovable/screens/2026-04-22/`).
- No code snippets longer than 3 lines.

## Output

Single downloadable file: `/mnt/documents/engineering-todo-2026-04-22.md`, ~6–8 pages of plain Markdown.

