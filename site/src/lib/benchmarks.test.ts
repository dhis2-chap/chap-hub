import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildBenchmarkSuites,
  loadBenchmarks,
  RESULTS_FILE,
} from "./benchmarks";
import {
  inMetricOrder,
  metricRankKey,
  type MetricColumn,
} from "./metrics";
import { loadRegistry, shortCommit, stableVersion } from "./registry";
import type { Benchmark, MetricInfo } from "./schema";

const registry = loadRegistry();
const ghr = registry.models.find((m) => m.id === "chapkit_ghr_model")!;
const ghrStable = stableVersion(ghr);
const multistep = registry.models.find((m) => m.id === "chapkit_simple_multistep_model")!;
const multistepStable = stableVersion(multistep);

function metric(id: string, displayName: string): MetricInfo {
  return {
    id,
    displayName,
    description: `${displayName} description`,
    unit: null,
    target: null,
    targetBehavior: "closest",
    optimizationDirection: "minimize",
  };
}

const METRICS = [
  metric("crps", "CRPS"),
  metric("crps_norm", "CRPS Normalized"),
  metric("mae", "MAE"),
  metric("rmse", "RMSE"),
];

function benchmark(overrides: Partial<Benchmark> = {}): Benchmark {
  return {
    model: ghr.id,
    version: ghrStable.version,
    commit: ghrStable.commit,
    dataset: "dengue-brazil-monthly",
    evaluated_at: "2026-08-31",
    harness: { tool: "chap evaluate-ensemble" },
    metrics: { crps: 0.5 },
    ...overrides,
  } as Benchmark;
}

/** The shape of the repo's first real record: a full chap eval run. */
function smokeRun(overrides: Partial<Benchmark> = {}): Benchmark {
  return benchmark({
    model: multistep.id,
    version: multistepStable.version,
    commit: multistepStable.commit,
    dataset: "vietnam-monthly",
    harness: { tool: "chap eval" },
    run: {
      configuration: "monthly_climate",
      observations: 2808,
      horizon: 3,
      splits: 1,
      samples: 200,
    },
    metrics: { crps: 42.6692, mae: 57.0358, rmse: 108.3282, crps_norm: 0.045345 },
    ...overrides,
  });
}

describe("loadBenchmarks", () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "mp-bench-"));
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  function write(...records: Benchmark[]) {
    fs.mkdirSync(path.join(root, "benchmarks"));
    fs.writeFileSync(
      path.join(root, RESULTS_FILE),
      JSON.stringify({ metrics: METRICS, results: records }),
    );
  }

  it("returns nothing when no results were fetched", () => {
    expect(loadBenchmarks(registry, root)).toEqual({ metrics: [], results: [] });
  });

  it("loads valid records and the metric definitions", () => {
    write(benchmark());
    const { metrics, results } = loadBenchmarks(registry, root);
    expect(results).toHaveLength(1);
    expect(results[0].metrics.crps).toBe(0.5);
    expect(metrics).toEqual(METRICS);
  });

  it("round-trips the run and extra metric fields", () => {
    write(smokeRun());
    const [loaded] = loadBenchmarks(registry, root).results;
    expect(loaded.run?.configuration).toBe("monthly_climate");
    expect(loaded.run?.samples).toBe(200);
    expect(loaded.metrics.rmse).toBeCloseTo(108.3282);
    expect(loaded.metrics.crps_norm).toBeCloseTo(0.045345);
  });

  it("rejects a metric chap-core's definitions do not describe", () => {
    write(benchmark({ metrics: { crps: 0.5, mystery: 1 } }));
    expect(() => loadBenchmarks(registry, root)).toThrow(
      /metric "mystery" has no definition/,
    );
  });

  it("rejects a record that fails the schema", () => {
    write(benchmark({ commit: "abc" }));
    expect(() => loadBenchmarks(registry, root)).toThrow(/results\.json is invalid/);
  });

  it("rejects a model the registry does not list", () => {
    write(benchmark({ model: "ghost_model" }));
    expect(() => loadBenchmarks(registry, root)).toThrow(/not in the registry/);
  });

  it("rejects a commit that does not match the registry pin", () => {
    write(benchmark({ commit: "0".repeat(40) }));
    expect(() => loadBenchmarks(registry, root)).toThrow(/commit does not match the pin/);
  });

  it("rejects a run configuration the model file does not declare", () => {
    write(smokeRun({ run: { configuration: "nightly" } }));
    expect(() => loadBenchmarks(registry, root)).toThrow(
      /configuration "nightly" is not in models\/chapkit_simple_multistep_model\.yaml/,
    );
  });
});

describe("buildBenchmarkSuites", () => {
  it("is empty while the store is empty", () => {
    expect(buildBenchmarkSuites(registry, [], METRICS)).toEqual([]);
  });

  it("builds one suite per dataset: measured rows, then every other pin as not run", () => {
    const suites = buildBenchmarkSuites(registry, [smokeRun()], METRICS);
    expect(suites).toHaveLength(1);
    const suite = suites[0];

    expect(suite.heading).toBe("Vietnam monthly · horizon 3");
    expect(suite.countLine).toBe("1 of 4 listed models evaluated");
    // Columns are the metrics the suite's runs record, in chap-core's default order.
    expect(suite.columns.map((c) => c.id)).toEqual(["mae", "rmse", "crps", "crps_norm"]);
    expect(suite.runContext).toContainEqual({ k: "Observations", v: "2,808 rows" });
    expect(suite.pendingNote).toMatch(/^Three listed models/);

    // Starters are scaffolding, never listed as a model awaiting a run.
    expect(suite.rows).toHaveLength(
      registry.models.filter((m) => m.kind !== "starter").length,
    );
    const [first, ...rest] = suite.rows;
    expect(first.measured).toBe(true);
    expect(first.pinLine).toBe(
      `monthly_climate · chapkit_simple_multistep_model@${shortCommit(multistepStable.commit)} · ${multistepStable.version}`,
    );
    expect(first.suiteLine).toBe(
      `chapkit_simple_multistep_model.monthly_climate · ${multistepStable.commit.slice(0, 12)}…`,
    );
    // The run record carries every metric, named and described by chap-core.
    expect(first.metrics.map((m) => m.label)).toEqual([
      "MAE",
      "RMSE",
      "CRPS",
      "CRPS Normalized",
    ]);
    expect(first.metrics[0]).toEqual({
      id: "mae",
      label: "MAE",
      value: "57.04",
      description: "MAE description",
    });
    for (const row of rest) {
      expect(row.measured).toBe(false);
      expect(row.metrics).toEqual([]);
      expect(row.values).toEqual({});
    }
  });

  it("ranks measured rows by normalised CRPS ascending", () => {
    const arima = registry.models.find((m) => m.id === "auto_arima_chapkit")!;
    const arimaStable = stableVersion(arima);
    const suite = buildBenchmarkSuites(registry, [
      smokeRun(),
      smokeRun({
        model: arima.id,
        version: arimaStable.version,
        commit: arimaStable.commit,
        run: undefined,
        metrics: { crps: 39.2, crps_norm: 0.041 },
      }),
    ], METRICS)[0];
    expect(suite.rows.slice(0, 2).map((r) => r.modelId)).toEqual([
      "auto_arima_chapkit",
      "chapkit_simple_multistep_model",
    ]);
    expect(suite.countLine).toBe("2 of 4 listed models evaluated");
    expect(suite.pendingNote).toMatch(/^Two listed models/);
  });
});

describe("metricRankKey", () => {
  const column = (overrides: Partial<MetricColumn>): MetricColumn => ({
    id: "m",
    label: "M",
    description: "",
    target: null,
    targetBehavior: "closest",
    optimizationDirection: "minimize",
    ...overrides,
  });

  it("ranks lower first when minimised and higher first when maximised", () => {
    expect(metricRankKey(column({}), 3)).toBeLessThan(metricRankKey(column({}), 4));
    const max = column({ optimizationDirection: "maximize" });
    expect(metricRankKey(max, 4)).toBeLessThan(metricRankKey(max, 3));
  });

  it("ranks by distance to a target, either side", () => {
    const ratio = column({ target: 0.5, optimizationDirection: null });
    expect(metricRankKey(ratio, 0.45)).toBeCloseTo(0.05);
    expect(metricRankKey(ratio, 0.6)).toBeCloseTo(0.1);
  });

  it("ranks only the shortfall below an at-least target", () => {
    const coverage = column({ target: 0.8, targetBehavior: "at_least", optimizationDirection: null });
    expect(metricRankKey(coverage, 0.9)).toBe(0);
    expect(metricRankKey(coverage, 0.6)).toBeCloseTo(0.2);
  });
});

describe("inMetricOrder", () => {
  it("follows chap-core's default order, appending metrics it does not name", () => {
    const ids = ["crps", "newcomer", "mae", "crps_log1p", "later"];
    expect(inMetricOrder(ids.map((id) => ({ id }))).map((m) => m.id)).toEqual([
      "crps_log1p",
      "mae",
      "crps",
      "newcomer",
      "later",
    ]);
  });
});
