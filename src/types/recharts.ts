/**
 * Lightweight typings for the Recharts tooltip/formatter callback shapes.
 *
 * Recharts ships its own types but the `content` render-prop and the
 * `formatter` callbacks are intentionally loose because consumers attach
 * arbitrary data shapes via `payload`. We use a generic `TPayload` so each
 * chart can specify the row shape it stored on the data points.
 *
 * Round 16 — type-safety sweep replacing ad-hoc `any` annotations.
 */

export interface RechartsTooltipEntry<TPayload = Record<string, unknown>> {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string | null;
  color?: string;
  payload: TPayload;
}

export interface RechartsTooltipProps<TPayload = Record<string, unknown>> {
  active?: boolean;
  label?: string | number;
  payload?: Array<RechartsTooltipEntry<TPayload>>;
}
