import { describe, expect, it } from "vitest";
import { SUITES, toBenchmarks, type Specification } from "./chap-api";
import { loadRegistry, stableVersion } from "./registry";

const registry = loadRegistry();
const multistep = registry.models.find((m) => m.id === "chapkit_simple_multistep_model")!;
const stable = stableVersion(multistep);
const suite = SUITES[0];

type Backtest = Specification["backtests"][number];

function backtest(overrides: {
  id?: number;
  name?: string;
  template?: string;
  digest?: string | null;
  created?: string;
  metrics?: Record<string, number>;
} = {}): Backtest {
  const template = overrides.template ?? multistep.service_id;
  return {
    id: overrides.id ?? 1,
    created: overrides.created ?? "2026-09-30T12:17:44.869682",
    chapVersion: "2.4.0",
    aggregateMetrics: overrides.metrics ?? {
      crps: 414.5,
      crps_norm: 0.006,
      mae: 539.1,
      rmse: 1247.8,
      coverage_10_90: 0.66,
      mape: 25.2,
    },
    configuredModel: {
      id: overrides.id ?? 1,
      name: `${template}:${overrides.name ?? "monthly_climate"}`,
      modelTemplate: {
        name: template,
        sourceDigest: overrides.digest === undefined ? stable.commit : overrides.digest,
      },
    },
  };
}

function spec(...backtests: Backtest[]): Specification {
  return { id: 1, dataset: { name: suite.datasetName }, backtests };
}

describe("toBenchmarks", () => {
  it("maps a listed pin's backtest onto a record, keeping every metric", () => {
    const { records, skipped } = toBenchmarks(registry, suite, spec(backtest()));
    expect(skipped).toEqual([]);
    expect(records).toEqual([
      {
        model: multistep.id,
        version: stable.version,
        commit: stable.commit,
        dataset: "vietnam-monthly",
        evaluated_at: "2026-09-30",
        harness: { tool: "chap 2.4.0" },
        run: { configuration: "monthly_climate", horizon: 3, splits: 6 },
        metrics: {
          crps: 414.5,
          crps_norm: 0.006,
          mae: 539.1,
          rmse: 1247.8,
          coverage_10_90: 0.66,
          mape: 25.2,
        },
      },
    ]);
  });

  it("keeps only the newest backtest per configured model", () => {
    const { records } = toBenchmarks(
      registry,
      suite,
      spec(
        backtest({ created: "2026-09-30T00:00:00", metrics: { crps: 1 } }),
        backtest({ created: "2026-09-29T00:00:00", metrics: { crps: 2 } }),
      ),
    );
    expect(records.map((r) => r.metrics.crps)).toEqual([1]);
  });

  it("skips what is not a listed pin and configuration, or has no metrics", () => {
    const { records, skipped } = toBenchmarks(
      registry,
      suite,
      spec(
        backtest({ id: 1, template: "naive_model", name: "naive_model", digest: null }),
        backtest({ id: 2, digest: "0".repeat(40) }),
        backtest({ id: 3, name: "nightly" }),
        backtest({ id: 4, metrics: {} }),
      ),
    );
    expect(records).toEqual([]);
    expect(skipped).toEqual([
      "naive_model:naive_model: not a listed model",
      `${multistep.service_id}:monthly_climate: commit ${"0".repeat(40)} is not a pin`,
      `${multistep.service_id}:nightly: not a listed configuration`,
      `${multistep.service_id}:monthly_climate: no metrics`,
    ]);
  });
});
