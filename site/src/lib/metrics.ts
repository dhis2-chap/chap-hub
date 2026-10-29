/**
 * Benchmark table metric columns, kept free of the build-time loaders in
 * benchmarks.ts (node:fs) so the client table can import them.
 */

/** A metric the benchmark tables can show as a column, and how to rank by it. */
export interface MetricColumn {
  id: string;
  label: string;
  description: string;
  target: number | null;
  targetBehavior: string;
  optimizationDirection: "minimize" | "maximize" | null;
  /** How chap-core compares a score with a baseline's, e.g. "skill_ratio". */
  comparisonOp: string | null;
}

/**
 * chap-core's default metric order, first six selected — DEFAULT_METRIC_ORDER
 * in chap_core/database/settings.py (dhis2-chap/chap-core#763). The server
 * does not return its saved order yet, so it is copied here.
 */
export const METRIC_ORDER = [
  "crps_log1p",
  "winkler_score_25_75_log1p",
  "mae",
  "rmse",
  "mape",
  "coverage_10_90",
  "coverage_25_75",
  "crps",
  "crps_norm",
  "ratio_above_truth",
  "winkler_score_10_90",
  "winkler_score_10_90_log1p",
  "winkler_score_25_75",
];

/** The metrics shown before a visitor picks their own. */
export const DEFAULT_METRIC_COLUMNS = METRIC_ORDER.slice(0, 6);

/**
 * Metrics in METRIC_ORDER; ones it does not name follow in their given
 * order, as chap-core appends metrics registered later.
 */
export function inMetricOrder<T extends { id: string }>(metrics: T[]): T[] {
  const rank = (id: string) => {
    const i = METRIC_ORDER.indexOf(id);
    return i === -1 ? METRIC_ORDER.length : i;
  };
  return metrics
    .map((m, i) => ({ m, i }))
    .sort((a, b) => rank(a.m.id) - rank(b.m.id) || a.i - b.i)
    .map(({ m }) => m);
}

/**
 * A value's rank key under chap-core's definition of the metric — lower is
 * better: the value itself when minimised, its negation when maximised, the
 * distance to the target when it should be close to it, and the shortfall
 * below it when it should be at least the target.
 */
export function metricRankKey(column: MetricColumn, value: number): number {
  if (column.target !== null) {
    return column.targetBehavior === "at_least"
      ? Math.max(0, column.target - value)
      : Math.abs(value - column.target);
  }
  return column.optimizationDirection === "maximize" ? -value : value;
}

/**
 * A comparison with a baseline, signed so positive is better whatever the
 * metric's direction: a skill ratio as a percentage, anything else in the
 * metric's units.
 */
export function formatComparison(column: MetricColumn, value: number): string {
  return value.toLocaleString("en-US", {
    maximumSignificantDigits: 3,
    signDisplay: "exceptZero",
    ...(column.comparisonOp === "skill_ratio" ? { style: "percent" } : {}),
  });
}
