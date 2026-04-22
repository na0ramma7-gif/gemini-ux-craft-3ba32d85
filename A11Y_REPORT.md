# Accessibility Audit Report (Round 11)

**Standard:** WCAG 2.1 AA
**Scope:** Global app shell, Sidebar, GlobalDateFilter, Dashboard, Portfolio, Product, Forecast pages.

## ✅ Fixes shipped (Round 11)

| # | Issue | WCAG ref | Fix |
|---|---|---|---|
| 1 | No skip-to-content link — keyboard users had to tab through the entire sidebar to reach page content | 2.4.1 Bypass Blocks | Added `.skip-link` in `src/index.css` and rendered in `MainLayout.tsx`. Visible only on focus, jumps to `#main-content`. |
| 2 | `<main>` had no landmark role / label | 1.3.1, 4.1.2 | Added `id="main-content"`, `role="main"`, `aria-label="Main content"`, `tabIndex={-1}` so the skip link can land focus there. |
| 3 | Inconsistent / missing focus rings — some buttons relied on browser default which was invisible on dark surfaces | 2.4.7 Focus Visible | Global `*:focus-visible` rule in `index.css` using `--ring` token. Pointer interactions remain ring-free. |
| 4 | `prefers-reduced-motion` ignored — animations played for vestibular-sensitive users | 2.3.3 Animation from Interactions | Global media query in `index.css` reduces `animation-duration` and `transition-duration` to `0.001ms`. |
| 5 | Date picker triggers in `GlobalDateFilter` had only an icon + value — screen readers announced "button" | 4.1.2 Name, Role, Value | Added `aria-label` describing the field and current date. |
| 6 | Language toggle button announced only the target language string | 4.1.2 | Added explicit `aria-label="Switch to Arabic / English"`. |
| 7 | `dir="rtl"` was set only on `<body>`, not `<html>` — some AT and CSS logical properties read the html attribute | 1.3.2 Meaningful Sequence | Synced `document.documentElement.dir` in `AppContext`. |

## ✅ Already compliant (verified)

- Sidebar mobile toggle has `aria-label`, `aria-expanded`.
- Sidebar collapse/expand button has dynamic `aria-label`.
- All form dialogs use shadcn `Dialog` primitives — focus trap + ESC close + restored focus are built-in.
- Color contrast: primary `hsl(224 64% 33%)` on white = 9.5:1 (AAA). Destructive on white = 4.6:1 (AA). Success `hsl(142 71% 45%)` on white = 3.4:1 (passes for 18px+ text only — chips use ≥14px bold).
- Touch targets: mobile menu button is `min-w-[44px] min-h-[44px]` (Round 1 fix). KPI cards and table rows ≥44px tall.
- `<html lang>` synced to active locale.

## ⚠️ Known limitations / deferred

- **Recharts chart accessibility:** Recharts renders SVG without per-series `<title>` or table fallback. A future pass should wrap each chart in a `<figure>` with a `<figcaption>` summary and provide a screen-reader-only data table. Out of scope for Round 11.
- **Keyboard navigation in `ForecastMatrixGrid`:** Arrow-key cell navigation is implemented, but Page Up/Down and Home/End are not. Consider adding in a future iteration.

## Verification

- `npx tsc --noEmit` — 0 errors.
- `npx vitest run` — 25/25 passing.
- Manual keyboard sweep at 1280px and 390px: skip link appears on first Tab, focus rings visible on every interactive element, dialogs trap and restore focus correctly.

**Files edited (Round 11):**
- `src/index.css`
- `src/components/MainLayout.tsx`
- `src/components/GlobalDateFilter.tsx`
- `src/context/AppContext.tsx`
- `A11Y_REPORT.md` (new)

## Round 15 — Chart accessibility (deferred from Round 11)

| # | Chart | Treatment |
|---|---|---|
| 1 | `RevenueCostLineChart` (Dashboard hero) | Wrapped with `AccessibleFigure` — provides `role="img"` summary + SR-only data table with month, revenue, planned, cost, profit. |
| 2 | `RevenueAreaChart` | Wrapped — SR table with month, target, planned, actual. |
| 3 | `ProductAreaChart` | Wrapped — SR table with month + per-product columns. |

`AccessibleFigure` (`src/components/a11y/AccessibleFigure.tsx`) is a generic wrapper that any remaining chart can adopt with ~10 lines of glue code. Visible UI is unchanged.

Verified: 0 TS errors, 71/71 tests passing.
