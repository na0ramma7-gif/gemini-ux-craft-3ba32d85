# Technical Issue — Diagnosis & Fix

## Symptom
The preview crashes with:
```
TypeError: Importing a module script failed.
```
ErrorBoundary catches it at the top of the React tree, so the entire app fails to mount.

## Root cause
`src/index.css` has `@import` statements for Google Fonts placed **after** the `@tailwind` directives:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter...');
@import url('https://fonts.googleapis.com/css2?family=Tajawal...');
```

Vite/PostCSS rejects this with:
> `@import must precede all other statements (besides @charset or empty @layer)`

The CSS build fails → the generated JS module that injects styles fails to load → the browser reports "Importing a module script failed" → ErrorBoundary takes over and the page is blank.

This is purely a CSS-ordering bug. No data, logic, or component code is broken.

## Fix
Reorder the top of `src/index.css` so `@import` rules come **before** the `@tailwind` directives:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;
```

That's the entire change — two lines moved from below the `@tailwind` block to above it. No other files touched.

## Expected outcome
- Vite CSS warning disappears.
- The JS module loads successfully.
- ErrorBoundary no longer triggers; the dashboard renders normally.
- Inter and Tajawal fonts continue to load (bilingual EN/AR typography preserved per project memory).

## Out of scope
- No changes to components, data, hooks, or business logic.
- No changes to the dashboard, Upcoming Revenue Drivers, or any feature discussed earlier.
