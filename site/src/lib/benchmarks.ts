import fs from "node:fs";
import path from "node:path";
import {
  getRegistry,
  shortCommit,
  stableVersion,
  versionByTag,
  type Registry,
} from "./registry";
import { inMetricOrder, type MetricColumn } from "./metrics";
import { datasetNameFor, datasetSourceFor } from "./presentation";
import {
  benchmarkResultsSchema,
  type Benchmark,
  type BenchmarkResults,
  type MetricInfo,
  type Model,
} from "./schema";

/**
 * Build-time loader for benchmark results. They are fetched from the
 * benchmarking server's chap API at deploy time (`pnpm fetch-benchmarks`) into
 * the gitignored <repo>/benchmarks/results.json; a build without that file —
 * CI, local dev — has no results. Every record is validated like the registry,
 * and any violation throws and fails the build: model, version, commit and
 * configuration must resolve against the registry, and every metric must be
 * one chap-core's definitions (stored alongside) describe.
 */

export const RESULTS_FILE = path.join("benchmarks", "results.json");

export function loadBenchmarks(
  registry: Registry,
  root: string,
): BenchmarkResults {
  const file = path.join(root, RESULTS_FILE);
  if (!fs.existsSync(file)) return { metrics: [], results: [] };

  const parsed = benchmarkResultsSchema.safeParse(
    JSON.parse(fs.readFileSync(file, "utf8")),
  );
  if (!parsed.success) {
    throw new Error(`${RESULTS_FILE} is invalid:\n${parsed.error.message}`);
  }

  const byId = new Map(registry.models.map((m) => [m.id, m]));
  const defined = new Set(parsed.data.metrics.map((m) => m.id));
  const results = parsed.data.results.map((bench) => {
    const label = `${RESULTS_FILE}: ${bench.model}@${bench.version} on ${bench.dataset}`;
    const model = byId.get(bench.model);
    if (!model) {
      throw new Error(`${label}: model "${bench.model}" is not in the registry`);
    }
    const version = versionByTag(model, bench.version);
    if (!version) {
      throw new Error(
        `${label}: version "${bench.version}" is not in models/${bench.model}.yaml`,
      );
    }
    if (version.commit !== bench.commit) {
      throw new Error(
        `${label}: commit does not match the pin for ${bench.model}@${bench.version} (${version.commit})`,
      );
    }
    const config = bench.run?.configuration;
    if (config && !(config in model.configurations)) {
      throw new Error(
        `${label}: configuration "${config}" is not in models/${bench.model}.yaml`,
      );
    }
    const undefinedMetric = Object.keys(bench.metrics).find(
      (id) => !defined.has(id),
    );
    if (undefinedMetric) {
      throw new Error(`${label}: metric "${undefinedMetric}" has no definition`);
    }
    return bench;
  });
  return { metrics: parsed.data.metrics, results };
}

let cached: BenchmarkResults | null = null;

function loaded(): BenchmarkResults {
  cached ??= loadBenchmarks(getRegistry(), getRegistry().root);
  return cached;
}

/** Benchmarks for the registry the site is building, loaded once. */
export function getBenchmarks(): Benchmark[] {
  return loaded().results;
}

/** chap-core's definitions of the metrics those benchmarks carry. */
export function getMetricDefinitions(): MetricInfo[] {
  return loaded().metrics;
}

export function benchmarksFor(
  records: Benchmark[],
  modelId: string,
): Benchmark[] {
  return records.filter((b) => b.model === modelId);
}

/** A metric as the pages show it: chap-core's name and description. */
export interface MetricView {
  id: string;
  label: string;
  value: string;
  description: string;
}

/** Four significant figures, plus chap's display unit (MAPE's "%"). */
function formatMetric(value: number, unit: string | null): string {
  const v = value.toLocaleString("en-US", { maximumSignificantDigits: 4 });
  return unit ? `${v}${unit === "%" ? "" : " "}${unit}` : v;
}

/** Every metric of a record, in chap-core's default metric order. */
export function metricViews(
  bench: Benchmark,
  metrics: MetricInfo[],
): MetricView[] {
  return inMetricOrder(metrics)
    .filter((m) => bench.metrics[m.id] !== undefined)
    .map((m) => ({
      id: m.id,
      label: m.displayName,
      value: formatMetric(bench.metrics[m.id], m.unit),
      description: m.description,
    }));
}

/* ---------- benchmark comparisons: recorded runs, one suite per dataset ---------- */

/**
 * Serializable benchmark views. A suite is a dataset every row shares; a
 * row is either a recorded run or a listed pin with no run yet — the page
 * never interpolates a score for the latter.
 */
export interface BenchmarkRowView {
  /** Selection key: "<model>@<version>[.<configuration>]". */
  id: string;
  modelId: string;
  name: string;
  versionTag: string;
  /** Whether versionTag is the model's stable pin; the table shows "stable" then. */
  isStable: boolean;
  /** "monthly_climate · chapkit_ghr_model@dfb2e3f" */
  pinLine: string;
  measured: boolean;
  /** Every metric of the run, formatted, in chap-core's default order; [] when unmeasured. */
  metrics: MetricView[];
  /** The same metrics' raw values, for sorting; {} when unmeasured. */
  values: Record<string, number>;
  /** Run-record panel subtitle: suite + full-ish commit, or the bare pin. */
  suiteLine: string;
}

export interface BenchmarkSuiteView {
  dataset: string;
  datasetName: string;
  /** "Laos admin-1 monthly · horizon 3" */
  heading: string;
  /** "4 of 5 configured models evaluated", one per table row. */
  countLine: string;
  measured: number;
  /** Every metric some run of the suite records, in chap-core's default order. */
  columns: MetricColumn[];
  /** `href` links a value to its source, e.g. the dataset's files. */
  runContext: { k: string; v: string; href?: string }[];
  /** Under-table note about pins with no run yet; null when all are measured. */
  pendingNote: string | null;
  rows: BenchmarkRowView[];
}

const NUMBER_WORDS = [
  "No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
];

function periodUnit(periodType: string | undefined): string {
  if (periodType === "monthly") return "months";
  if (periodType === "weekly") return "weeks";
  if (periodType === "yearly") return "years";
  return "periods";
}

function suiteIdOf(bench: Benchmark): string | null {
  return bench.run?.configuration
    ? `${bench.model}.${bench.run.configuration}`
    : null;
}

/**
 * The run to show per model and configuration: the stable pin's if it has
 * one, otherwise the newest version that has one (versions are listed newest
 * first). Older runs stay in the results, just not in the suite table.
 */
function newestRuns(byId: Map<string, Model>, runs: Benchmark[]): Benchmark[] {
  const rank = (b: Benchmark) => {
    const model = byId.get(b.model)!;
    return b.version === model.channels.stable
      ? -1
      : model.versions.findIndex((v) => v.version === b.version);
  };
  const best = new Map<string, Benchmark>();
  for (const b of runs) {
    const key = `${b.model}.${b.run?.configuration ?? ""}`;
    const current = best.get(key);
    if (!current || rank(b) < rank(current)) best.set(key, b);
  }
  return [...best.values()];
}

/**
 * One suite per dataset that has recorded runs: one row per model and
 * configuration (see newestRuns), measured rows first (best normalised CRPS
 * first, plain CRPS as fallback), then every other configuration of a
 * listed model at its stable pin as an unmeasured row.
 */
export function buildBenchmarkSuites(
  registry: Registry,
  records: Benchmark[],
  metrics: MetricInfo[],
): BenchmarkSuiteView[] {
  const byId = new Map(registry.models.map((m) => [m.id, m]));
  // Starters are scaffolding, not something to forecast with.
  const models = registry.models.filter((m) => m.kind !== "starter");
  const datasets = [...new Set(records.map((b) => b.dataset))].sort();

  return datasets.map((dataset) => {
    const runs = newestRuns(
      byId,
      records.filter((b) => b.dataset === dataset),
    );
    const primary = runs[0];
    const params = primary.run;
    const datasetName = datasetNameFor(dataset);

    const measuredRows = runs
      .map((b): BenchmarkRowView => {
        const model = byId.get(b.model)!;
        return {
          id: `${b.model}@${b.version}${b.run?.configuration ? `.${b.run.configuration}` : ""}`,
          modelId: b.model,
          name: model.display_name,
          versionTag: b.version,
          isStable: b.version === model.channels.stable,
          pinLine: `${b.run?.configuration ? `${b.run.configuration} · ` : ""}${b.model}@${shortCommit(b.commit)}`,
          measured: true,
          metrics: metricViews(b, metrics),
          values: b.metrics,
          suiteLine: `${suiteIdOf(b) ?? b.harness.tool} · ${b.commit.slice(0, 12)}…`,
        };
      })
      .sort(
        (a, b) =>
          (a.values.crps_norm ?? a.values.crps) -
          (b.values.crps_norm ?? b.values.crps),
      );

    // A row per configured model (`<model>:<configuration>`), so the count
    // line counts what the table lists. A run without a configuration covers
    // every configuration of its model.
    const covered = (m: Model, key: string | null) =>
      runs.some(
        (b) =>
          b.model === m.id &&
          (key === null || !b.run?.configuration || b.run.configuration === key),
      );
    const pendingRows = models.flatMap((m) => {
      const stable = stableVersion(m);
      const keys = Object.keys(m.configurations);
      return (keys.length > 0 ? keys : [null])
        .filter((key) => !covered(m, key))
        .map(
          (key): BenchmarkRowView => ({
            id: `${m.id}@${stable.version}${key ? `.${key}` : ""}`,
            modelId: m.id,
            name: m.display_name,
            versionTag: stable.version,
            isStable: true,
            pinLine: `${key ? `${key} · ` : ""}${m.id}@${shortCommit(stable.commit)}`,
            measured: false,
            metrics: [],
            values: {},
            suiteLine: `${m.id}@${shortCommit(stable.commit)}`,
          }),
        );
    });
    const listed = measuredRows.length + pendingRows.length;

    const runContext: BenchmarkSuiteView["runContext"] = [];
    const source = datasetSourceFor(dataset);
    runContext.push(
      source
        ? { k: "Dataset", v: datasetName, href: source }
        : { k: "Dataset", v: datasetName },
    );
    if (params?.observations !== undefined) {
      runContext.push({
        k: "Observations",
        v: `${params.observations.toLocaleString("en-US")} rows`,
      });
    }
    const unit = periodUnit(
      byId.get(primary.model)?.compatibility.period_types[0],
    );
    if (params?.horizon !== undefined) {
      runContext.push({ k: "Horizon", v: `${params.horizon} ${unit}` });
    }
    if (params?.splits !== undefined) {
      runContext.push({ k: "Backtest splits", v: String(params.splits) });
    }
    if (params?.samples !== undefined) {
      runContext.push({ k: "Predictive samples", v: String(params.samples) });
    }
    runContext.push({ k: "Harness", v: primary.harness.tool });

    const pendingNote =
      pendingRows.length === 0
        ? null
        : pendingRows.length === 1
          ? "One configured model has no evaluation on this suite yet. A row appears the moment a run lands — the page never interpolates a score."
          : `${NUMBER_WORDS[pendingRows.length] ?? pendingRows.length} configured models have no evaluation on this suite yet. A row appears the moment a run lands — the page never interpolates a score.`;

    return {
      dataset,
      datasetName,
      heading:
        params?.horizon !== undefined
          ? `${datasetName} · horizon ${params.horizon}`
          : datasetName,
      countLine: `${measuredRows.length} of ${listed} configured models evaluated`,
      measured: measuredRows.length,
      columns: inMetricOrder(metrics)
        .filter((m) => runs.some((b) => b.metrics[m.id] !== undefined))
        .map((m) => ({
          id: m.id,
          label: m.displayName,
          description: m.description,
          target: m.target,
          targetBehavior: m.targetBehavior,
          optimizationDirection: m.optimizationDirection,
        })),
      runContext,
      pendingNote,
      rows: [...measuredRows, ...pendingRows],
    };
  });
}
