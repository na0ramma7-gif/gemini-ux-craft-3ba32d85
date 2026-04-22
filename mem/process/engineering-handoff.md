---
name: Engineering Handoff Contract
description: Hard rules for code shipping to GitLab ASP.NET Core repo — numeric enums, int PKs, REST API, and required .lovable/change-manifest.yaml artifact on every change.
type: constraint
---

Code ships to a separate engineering repo on GitLab, NOT just the Lovable preview.
Engineering target: React+TS+Vite+shadcn+Tailwind (frontend) / ASP.NET Core REST `/api/v1/*` with JWT bearer / PostgreSQL + EF Core with **integer surrogate PKs** (not uuid).

## Hard rules
1. **Numeric enums only.** Match C# enums. Canonical source: `src/lib/domainEnums.ts`.
   - FeatureStatus: Planned=0, InProgress=1, Delivered=2, Cancelled=3
   - ReleaseStatus: Planned=0, InProgress=1, Released=2
   - ProductStatus, PriorityLevel, CostType, ResourceStatus, ResourceCategory, ResourceLocation follow same pattern.
   - Never introduce string-literal statuses ('Delivered', 'CAPEX', 'InProgress'). Always reference numeric enum constants.
   - Don't rename/remove/repurpose existing values. New values = NEW numeric, listed under `data_contract.new_enum_values`.
2. **Integer PKs.** Don't change PK shape; don't add uuid ids in shared types.
3. **Auth.** JWT in `localStorage["leanpulse_access_token"]`. Don't call `supabase.auth.*` for shippable flows; flag any such usage in `stack_port_hints`.
4. **Data access.** Engineering repo uses `src/lib/api/*.ts` typed clients, not `supabase.from(...)`. Any Supabase call added for preview must be listed under `stack_port_hints` with REST equivalent.
5. **Protected files** — do not edit unless the user explicitly asks: `src/lib/api/**`, `src/lib/domainEnums.ts`, `src/lib/validations.ts`, `src/context/**`, `src/types/**`, `vite.config.ts`, `eslint.config.js`, `tsconfig*.json`. If touched, list under `files.modified` and explain in `stack_port_hints`.

## Required handoff artifact (every change, starting 2026-04-24)
At the end of EVERY change, in addition to shipping code:
(a) write `.lovable/change-manifest.yaml` at repo root,
(b) include the same YAML in chat reply inside a ```yaml block,
(c) commit before/after screenshots of every affected screen under `.lovable/screens/<YYYY-MM-DD>/`.

## Manifest schema (v1, fill every field; use [] or "none")
```yaml
version: 1
session_id: <YYYY-MM-DDTHH-MM-short-slug>
intent: >
  1-3 sentences: what the PM asked for and why.
bucket: visual-only | structural | behavior | data-contract
screens:
  - name: <PageOrComponentName>
    before: .lovable/screens/<date>/<name>-before.png
    after:  .lovable/screens/<date>/<name>-after.png
files:
  added: []
  modified: []
  removed: []
i18n:
  added: []
  changed: []
  removed: []
data_contract:
  new_entities: []        # "Milestone { id:int, name:string, dueAt:date }"
  new_fields: []          # "Product.archivedAt: datetime?"
  new_enum_values: []     # "FeatureStatus.Blocked = 4"
  new_api_calls: []       # "GET /api/v1/portfolios?ownerId={int}"
  removed_or_renamed: []
deps:
  added: []               # [{ name, version, reason }]
  removed: []
acceptance:
  - Given ... When ... Then ...   # 3-8 bullets, testable
accessibility:
  - <keyboard/aria notes for new interactive elements>
out_of_scope:
  - <things intentionally not changed>
stack_port_hints:
  - <every Supabase call added + REST equivalent>
  - <every RLS/auth assumption relied on>
  - <every place string status was used where engineering uses numeric enum>
known_limitations: []
```

## Bucket classification (when unsure, pick the MORE invasive)
- **visual-only**: copy, spacing, color, order, shadcn variant swap
- **structural**: new component, extracted component, renamed prop, moved file
- **behavior**: new flow, dialog, filter, derived value, route
- **data-contract**: ANY new field/status/entity/enum value/endpoint or request/response change. **Blocks engineering until backend lands** — be honest.

## How to apply
- Apply to every change request from 2026-04-24 onward.
- For pure conversational replies with no code changes, the manifest is not required.
- For trivial copy tweaks, still emit the manifest (`bucket: visual-only`, minimal fields).
- Generate `session_id` as `<ISO-date>T<HH-MM>-<3-5 word slug>`.
- Screenshots: capture via the preview before editing and after the change.