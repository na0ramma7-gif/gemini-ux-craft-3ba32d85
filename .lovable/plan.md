

# PostgreSQL Schema & Data Export Script

## What You'll Get
A complete `.sql` file containing:
1. All table definitions with proper types, constraints, and foreign keys matching your current data model
2. All seed data from `initialData.ts` as INSERT statements
3. Proper enum types for status fields, priorities, lifecycle stages, etc.

## Tables (12 total)
- `departments` — Department info
- `portfolios` — Portfolio hierarchy under department
- `products` — Products under portfolios (with array fields for capabilities, teams, etc.)
- `releases` — Releases under products
- `features` — Features linked to products and optionally releases
- `resources` — Team members with employee IDs
- `resource_skills` — Skills per resource (normalized)
- `assignments` — Resource-to-product/release assignments
- `costs` — CAPEX/OPEX cost records per product
- `revenue_plan` — Planned revenue per feature per month
- `revenue_actual` — Actual revenue per feature per month
- `documents` — Document metadata

## Technical Details
- Uses PostgreSQL enums for constrained fields (priority, status, lifecycle_stage, etc.)
- Foreign keys enforce the hierarchy: Department → Portfolio → Product → Release → Feature
- Array columns (`TEXT[]`) for capabilities, success_metrics, supporting_teams
- All current seed data (8 products, 6 releases, 19 features, 5 resources, 4 assignments, 5 costs, 28 revenue plan rows, 23 revenue actual rows) included as INSERTs

## Delivery
A single downloadable `.sql` file at `/mnt/documents/schema_and_data.sql` ready to run with `psql -f schema_and_data.sql` on your local PostgreSQL.

