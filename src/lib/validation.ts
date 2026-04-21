import { z } from 'zod';

/**
 * Shared zod primitives — single source of truth for validation rules.
 * Used by every form/dialog in the system to ensure consistent behavior
 * and error messages.
 */

// ── Common messages ──
export const M = {
  required: (field: string) => `${field} is required`,
  blank: (field: string) => `${field} cannot be blank`,
  min: (field: string, n: number) => `${field} must be at least ${n} characters`,
  max: (field: string, n: number) => `${field} must be ${n} characters or fewer`,
  exact: (field: string, n: number) => `${field} must be exactly ${n} characters`,
  email: 'Enter a valid email address',
  phone: 'Enter a valid phone number',
  number: (field: string) => `${field} must be a number`,
  positive: (field: string) => `${field} must be greater than 0`,
  nonNegative: (field: string) => `${field} cannot be negative`,
  pct: 'Must be between 0 and 100',
  date: 'Enter a valid date',
  dateOrder: 'End date must be on or after start date',
  duplicate: (field: string) => `This ${field.toLowerCase()} already exists`,
  invalidChars: (field: string) => `${field} contains invalid characters`,
};

// ── Reusable field schemas ──
const trimmed = (s: string) => s.trim();

export const nameField = (label = 'Name', { min = 2, max = 100 } = {}) =>
  z
    .string({ required_error: M.required(label) })
    .transform(trimmed)
    .pipe(
      z
        .string()
        .min(1, M.blank(label))
        .min(min, M.min(label, min))
        .max(max, M.max(label, max))
        .regex(/^[\p{L}\p{N}][\p{L}\p{N}\s\-_./()&,'+]*$/u, M.invalidChars(label)),
    );

export const codeField = (label = 'Code', { min = 2, max = 10 } = {}) =>
  z
    .string({ required_error: M.required(label) })
    .transform(s => s.trim().toUpperCase())
    .pipe(
      z
        .string()
        .min(min, M.min(label, min))
        .max(max, M.max(label, max))
        .regex(/^[A-Z0-9_-]+$/, `${label} may only contain letters, numbers, _ or -`),
    );

export const optionalText = (label = 'Field', max = 500) =>
  z
    .string()
    .transform(trimmed)
    .pipe(z.string().max(max, M.max(label, max)))
    .optional()
    .or(z.literal(''));

export const longText = (label = 'Description', max = 2000) =>
  z
    .string()
    .transform(trimmed)
    .pipe(z.string().max(max, M.max(label, max)))
    .optional()
    .or(z.literal(''));

export const personField = (label = 'Owner', required = false) => {
  const base = z
    .string()
    .transform(trimmed)
    .pipe(
      z
        .string()
        .max(100, M.max(label, 100))
        .regex(/^[\p{L}\s.\-']*$/u, `${label} may only contain letters, spaces, . - '`),
    );
  if (required) {
    return base.refine(v => v.length >= 2, { message: M.min(label, 2) });
  }
  return base.optional().or(z.literal(''));
};

export const emailField = (required = false) => {
  const base = z.string().transform(trimmed).pipe(z.string().email(M.email).max(255));
  return required ? base : base.optional().or(z.literal(''));
};

export const phoneField = (required = false) => {
  const base = z
    .string()
    .transform(trimmed)
    .pipe(z.string().regex(/^\+?[0-9\s\-()]{7,20}$/, M.phone));
  return required ? base : base.optional().or(z.literal(''));
};

export const moneyField = (label = 'Amount', { allowZero = true } = {}) =>
  z
    .number({ invalid_type_error: M.number(label), required_error: M.required(label) })
    .finite(M.number(label))
    .refine(v => (allowZero ? v >= 0 : v > 0), {
      message: allowZero ? M.nonNegative(label) : M.positive(label),
    });

export const percentField = (label = 'Percent') =>
  z
    .number({ invalid_type_error: M.number(label), required_error: M.required(label) })
    .min(0, M.pct)
    .max(100, M.pct);

export const integerField = (label: string, { min = 0, max }: { min?: number; max?: number } = {}) => {
  let s = z
    .number({ invalid_type_error: M.number(label), required_error: M.required(label) })
    .int(`${label} must be a whole number`)
    .min(min, min === 0 ? M.nonNegative(label) : `${label} must be at least ${min}`);
  if (typeof max === 'number') s = s.max(max, `${label} must be ${max} or less`);
  return s;
};

// ISO date string (YYYY-MM-DD) — required
export const dateField = (label = 'Date', required = true) => {
  const base = z
    .string()
    .refine(v => v === '' || !Number.isNaN(new Date(v).getTime()), { message: M.date });
  return required
    ? base.refine(v => v.length > 0, { message: M.required(label) })
    : base.optional().or(z.literal(''));
};

// Cross-field: end >= start
export const dateRangeRefine =
  <T extends { startDate?: string; endDate?: string }>(opts?: { allowEqual?: boolean }) =>
  (data: T, ctx: z.RefinementCtx) => {
    if (!data.startDate || !data.endDate) return;
    const s = new Date(data.startDate).getTime();
    const e = new Date(data.endDate).getTime();
    if (Number.isNaN(s) || Number.isNaN(e)) return;
    const ok = opts?.allowEqual === false ? e > s : e >= s;
    if (!ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: M.dateOrder });
    }
  };

// Duplicate-code helper: returns a refine fn for a `code` field
export const uniqueAmong = <T extends { code?: string }>(
  existing: T[],
  selfId?: number,
  field: keyof T = 'code',
  label = 'Code',
) => {
  const norm = (v: unknown) => String(v ?? '').trim().toUpperCase();
  const taken = new Set(
    existing
      .filter(e => (e as { id?: number }).id !== selfId)
      .map(e => norm(e[field])),
  );
  return (val: string) => !taken.has(norm(val)) || M.duplicate(label);
};

// ── Numeric input helpers (for inline numeric fields outside RHF) ──
/** Parse + clamp a numeric input string. Returns 0 for invalid. */
export const parseNumber = (
  raw: string,
  { min = -Infinity, max = Infinity, integer = false }: { min?: number; max?: number; integer?: boolean } = {},
): number => {
  const n = integer ? parseInt(raw, 10) : parseFloat(raw);
  if (Number.isNaN(n) || !Number.isFinite(n)) return Math.max(min, Math.min(max, 0));
  return Math.max(min, Math.min(max, n));
};

/** Clamp a number to [min,max] with NaN/Infinity guard. */
export const clamp = (n: number, min: number, max: number): number => {
  if (Number.isNaN(n) || !Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
};

/** Parse a money input: non-negative, finite, capped at 1e10. */
export const parseMoney = (raw: string): number =>
  parseNumber(raw, { min: 0, max: 1e10 });

/** Parse a percent input: 0..100. */
export const parsePercent = (raw: string): number =>
  parseNumber(raw, { min: 0, max: 100 });

/** Parse a growth rate input: -100..100 (allows negative growth). */
export const parseGrowthRate = (raw: string): number =>
  parseNumber(raw, { min: -100, max: 100 });
