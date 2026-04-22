# Project Memory

## Core
Stack: React (Vite), TypeScript, Tailwind CSS, shadcn/ui, PostgreSQL.
State: Global state via React Context (AppContext).
Currency: All financial values use Saudi Riyal (SAR / ر.س).
Hierarchy: Dept -> Portfolio -> Product -> Release -> Feature. Aggregation is strictly bottom-up.
Constraints: Strictly adhere to baseline functional flows; never remove features during UI enhancements.
Engineering target = ASP.NET Core REST /api/v1/* + EF Core + Postgres with INT PKs. Use NUMERIC enums from src/lib/domainEnums.ts — never string statuses ('Delivered','CAPEX', etc.).
Protected (don't edit unless asked): src/lib/api/**, src/lib/domainEnums.ts, src/lib/validations.ts, src/context/**, src/types/**, vite.config.ts, eslint.config.js, tsconfig*.json.
Every code change MUST emit .lovable/change-manifest.yaml + same YAML in reply + before/after screenshots in .lovable/screens/<date>/. See engineering-handoff memory.

## Memories
- [Engineering Handoff Contract](mem://process/engineering-handoff) — Numeric enums, int PKs, REST API, required change-manifest.yaml + screenshots on every change
- [Lean Design System](mem://style/design-system) — Brand colors, charts palette, and card layout specifics
- [Localization & Typography](mem://style/localization) — Bilingual (AR/EN) RTL support using Inter and Tajawal
- [Data Hierarchy](mem://logic/data-hierarchy) — Bottom-up aggregation: Dept -> Portfolio -> Product -> Release -> Feature
- [Target Calculations](mem://logic/target-calculations) — Formula for target calculation (target = planned * 1.35)
- [Executive Dashboard](mem://features/dashboard-analytics) — KPI cards, target vs achieved charts, and unified scenario headers
- [Gantt Chart](mem://features/gantt-chart) — Dual-bar roadmap visualization with delayed status logic
- [Financial Planning](mem://features/financial-planning) — Yearly workspace, popup dialog editing, and resource allocation
- [Global Filters](mem://features/global-filters) — Date range with comparison mode propagating across hierarchy
- [Forecasting](mem://features/forecasting) — 12/24/36-month projections, scenario comparisons, and pipeline
- [Product Profile](mem://features/product-profile) — Product overview, maturity radar, and feature profile toggle
- [Portfolio Profile](mem://features/portfolio-profile) — Identity management, financial charts, and strategic alignment
- [Documentation](mem://features/documentation) — Product documentation structure and file management
- [Resource Management](mem://features/resource-management) — Directory, profiles, structured skills, and capacity dashboard
- [Release Management](mem://features/releases) — Release properties and multi-select feature assignment
- [Database Schema](mem://architecture/database-schema) — PostgreSQL 12-table normalized schema mirroring data hierarchy
