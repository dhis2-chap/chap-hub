import type { Registry } from "./registry";
import type {
  Baseline,
  Benchmark,
  BenchmarkResults,
  MetricInfo,
} from "./schema";

/**
 * Benchmark results come from the benchmarking server's chap API, read at
 * deploy time with a bearer token (scripts/fetch-benchmarks.ts). Nothing in
 * the site talks to the server at runtime.
 *
 * A benchmark there is a backtest specification: a dataset plus the backtest
 * parameters. It has no stable name, so each suite is looked up by that tuple
 * rather than by a stored specification id.
 */
export interface Suite {
  /** Marketplace dataset id, as stored on each record. */
  dataset: string;
  /** The dataset's name on the benchmarking server. */
  datasetName: string;
  nPeriods: number;
  nSplits: number;
  stride: number;
  nRetrain: number;
}

export const SUITES: Suite[] = [
  { dataset: "vietnam-monthly", datasetName: "vietnam_evaluation_set", nPeriods: 3, nSplits: 6, stride: 1, nRetrain: 1 },
  { dataset: "laos-monthly", datasetName: "laos_evaluation_set", nPeriods: 3, nSplits: 6, stride: 1, nRetrain: 1 },
  { dataset: "thailand-monthly", datasetName: "thailand_evaluation_set", nPeriods: 3, nSplits: 6, stride: 1, nRetrain: 1 },
];

/** The fields of GET /v1/crud/backtest-specifications/{id} that are read. */
export interface Specification {
  id: number;
  dataset: { name: string };
  backtests: {
    id: number;
    created: string | null;
    chapVersion: string | null;
    aggregateMetrics: Record<string, number>;
    configuredModel: {
      id: number;
      name: string;
      modelTemplate: { name: string; sourceDigest: string | null };
    };
    /** Per reference model; null on chap-core before 2.6. */
    comparisons?: {
      configuredModelId: number;
      values: Record<string, number | null>;
    }[] | null;
  }[];
  /** chap-core's built-in baselines run on this specification. */
  baselines?: {
    status: string;
    configuredModel: {
      id: number;
      name: string;
      modelTemplate: { displayName: string | null };
    };
  }[] | null;
}

/** The specification's baselines that have scores to compare with. */
function toBaselines(spec: Specification): Baseline[] {
  return (spec.baselines ?? [])
    .filter((b) => b.status === "done")
    .map((b) => ({
      id: b.configuredModel.name,
      name: b.configuredModel.modelTemplate.displayName || b.configuredModel.name,
    }));
}

/**
 * The records of one specification that belong to a listed pin: the template
 * is a listed model's service, its digest is one of that model's pinned
 * commits and the configured model is one of its configurations (chap-admin
 * names them "<service id>:<configuration key>"). Backtests come newest first and
 * only the newest per configured model is kept. Skipped backtests are
 * reported, not recorded.
 */
export function toBenchmarks(
  registry: Registry,
  suite: Suite,
  spec: Specification,
): { records: Benchmark[]; skipped: string[] } {
  const records: Benchmark[] = [];
  const skipped: string[] = [];
  const seen = new Set<number>();
  const baselines = new Map(
    (spec.baselines ?? [])
      .filter((b) => b.status === "done")
      .map((b) => [b.configuredModel.id, b.configuredModel.name]),
  );

  for (const backtest of spec.backtests) {
    const cm = backtest.configuredModel;
    if (seen.has(cm.id)) continue;
    seen.add(cm.id);

    const model = registry.models.find(
      (m) => m.service_id === cm.modelTemplate.name,
    );
    const version = model?.versions.find(
      (v) => v.commit === cm.modelTemplate.sourceDigest,
    );
    const configuration = cm.name.slice(cm.modelTemplate.name.length + 1);
    const metrics = backtest.aggregateMetrics;
    const reason = !model
      ? "not a listed model"
      : model.kind === "starter"
        ? "a starter, not benchmarked"
        : !version
        ? `commit ${cm.modelTemplate.sourceDigest} is not a pin`
        : !cm.name.startsWith(`${cm.modelTemplate.name}:`) ||
          !(configuration in model.configurations)
          ? "not a listed configuration"
          : metrics.crps === undefined
            ? "no metrics"
            : null;
    if (!model || !version || reason) {
      skipped.push(`${cm.name}: ${reason}`);
      continue;
    }

    records.push({
      model: model.id,
      version: version.version,
      commit: version.commit,
      dataset: suite.dataset,
      evaluated_at: (backtest.created ?? "").slice(0, 10),
      harness: { tool: `chap ${backtest.chapVersion ?? ""}`.trim() },
      run: {
        configuration,
        horizon: suite.nPeriods,
        splits: suite.nSplits,
      },
      metrics: { ...metrics, crps: metrics.crps },
      comparisons: Object.fromEntries(
        (backtest.comparisons ?? []).flatMap((c) => {
          const baseline = baselines.get(c.configuredModelId);
          return baseline ? [[baseline, finiteValues(c.values)]] : [];
        }),
      ),
    });
  }
  return { records, skipped };
}

function finiteValues(
  values: Record<string, number | null>,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(values).filter(
      (e): e is [string, number] => Number.isFinite(e[1]),
    ),
  );
}

/**
 * Every listed pin's newest result on every suite, with chap-core's
 * definitions of the metrics they carry. Throws on any failure.
 */
export async function fetchBenchmarks(
  registry: Registry,
  url: string,
  token: string,
): Promise<BenchmarkResults> {
  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${url}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`GET ${path}: ${res.status} ${res.statusText}`);
    return (await res.json()) as T;
  }

  const records: Benchmark[] = [];
  const baselines = new Map<string, Baseline>();
  let anyBacktest: number | null = null;
  for (const suite of SUITES) {
    const query = new URLSearchParams({
      nPeriods: String(suite.nPeriods),
      nSplits: String(suite.nSplits),
      stride: String(suite.stride),
      nRetrain: String(suite.nRetrain),
    });
    const matches = (
      await get<{ id: number; dataset: { name: string } }[]>(
        `/v1/crud/backtest-specifications?${query}`,
      )
    ).filter((s) => s.dataset.name === suite.datasetName);
    if (matches.length !== 1) {
      throw new Error(
        `${suite.dataset}: expected one specification for ${suite.datasetName} ${query}, found ${matches.length}`,
      );
    }
    const spec = await get<Specification>(
      `/v1/crud/backtest-specifications/${matches[0].id}`,
    );
    anyBacktest ??= spec.backtests[0]?.id ?? null;
    const { records: found, skipped } = toBenchmarks(registry, suite, spec);
    console.log(
      `${suite.dataset}: ${found.length} recorded, ${skipped.length} skipped` +
        skipped.map((s) => `\n  - ${s}`).join(""),
    );
    records.push(...found);
    for (const b of toBaselines(spec)) baselines.set(b.id, b);
  }
  if (anyBacktest === null)
    return { metrics: [], baselines: [], results: records };

  // chap-core's metric registry: the same whichever backtest is asked about.
  const all = await get<MetricInfo[]>(`/v1/visualization/metrics/${anyBacktest}`);
  const used = new Set(records.flatMap((r) => Object.keys(r.metrics)));
  return {
    metrics: all.filter((m) => used.has(m.id)),
    baselines: [...baselines.values()],
    results: records,
  };
}
