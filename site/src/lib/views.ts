import { stringify } from "yaml";
import {
  displayPin,
  fullPin,
  imageRef,
  repoPath,
  latestVersion,
  repoOrg,
  repoSlug,
  shortCommit,
  stableVersion,
  verifiedCount,
  type Registry,
} from "./registry";
import type {
  Benchmark,
  Model,
  ModelKind,
  ModelVersion,
} from "./schema";
import { benchmarksFor, skillOf } from "./benchmarks";
import type { Proposals } from "./proposals";
import {
  COV_LABEL,
  datasetNameFor,
  presentationFor,
  type CovariateMode,
} from "./presentation";

/**
 * Serializable card view of a model, built on the server and handed to the
 * client components that do search/filter. Everything the interactive
 * catalog needs, nothing more.
 */
export interface ModelCardView {
  id: string;
  name: string;
  shortName: string;
  repo: string;
  kind: ModelKind;
  summary: string;
  framework: string;
  language: string;
  covMode: CovariateMode;
  covLabel: string;
  periodType: string;
  /** e.g. "1–24 periods" — the service's declared forecast bounds. */
  horizon: string;
  requiresGeo: boolean;
  author: string;
  organization: string | null;
}

/** The model's stored results, stable-channel pin first, then by dataset. */
function recordsFor(model: Model, benchmarks: Benchmark[]): Benchmark[] {
  return benchmarksFor(benchmarks, model.id).sort(
    (a, b) =>
      Number(b.version === model.channels.stable) -
        Number(a.version === model.channels.stable) ||
      a.dataset.localeCompare(b.dataset),
  );
}

/** "0–100 periods", or "3 periods" when the bounds coincide. */
export function horizonLabel(model: Model): string {
  const { min_prediction_periods: min, max_prediction_periods: max } =
    model.compatibility;
  return min === max ? `${max} periods` : `${min}–${max} periods`;
}

export function toCardView(model: Model): ModelCardView {
  const pres = presentationFor(model.id);
  return {
    id: model.id,
    name: model.display_name,
    shortName: pres.shortName,
    repo: repoPath(model),
    kind: model.kind,
    summary: model.summary,
    framework: pres.framework,
    language: pres.language,
    covMode: pres.covMode,
    covLabel: COV_LABEL[pres.covMode],
    periodType: model.compatibility.period_types.join(" · "),
    horizon: horizonLabel(model),
    requiresGeo: model.compatibility.requires_geo,
    author: model.attribution.author,
    organization: model.attribution.organization ?? null,
  };
}

/* ---------- in-review (open PR) views ---------- */

export interface InReviewPinView {
  modelId: string;
  /** On the model's own Versions tab: the proposed tag (or the model name). */
  label: string;
  /** On the catalog strip, where the model needs naming too. */
  catalogLabel: string;
  commitShort: string | null;
  isNewModel: boolean;
  approvals: string;
  prNumber: number;
  prTitle: string;
  prUrl: string;
  author: string;
  updatedAt: string;
}

function approvalsLabel(count: number, required: number): string {
  return `${Math.min(count, required)}/${required}`;
}

/** "as of" label for PR-derived data — the fetch happens once per build. */
export function fetchedAtLabel(fetchedAt: string | null): string | null {
  return fetchedAt
    ? `${fetchedAt.slice(0, 16).replace("T", " ")} UTC`
    : null;
}

export function toInReviewViews(
  proposals: Proposals,
  required: number,
): InReviewPinView[] {
  return proposals.proposals.flatMap((pr) =>
    pr.pins.map((pin) => ({
      modelId: pin.modelId,
      label: pin.versionTag ?? pin.displayName,
      catalogLabel: pin.isNewModel
        ? pin.versionTag
          ? `${pin.displayName} · ${pin.versionTag}`
          : pin.displayName
        : `${pin.modelId} · ${pin.versionTag ?? "?"}`,
      commitShort: pin.commit ? shortCommit(pin.commit) : null,
      isNewModel: pin.isNewModel,
      approvals: approvalsLabel(pr.approvedBy.length, required),
      prNumber: pr.number,
      prTitle: pr.title,
      prUrl: pr.url,
      author: pr.author,
      updatedAt: pr.updatedAt.slice(0, 10),
    })),
  );
}

/* ---------- detail view ---------- */

export interface ChannelView {
  channel: "stable" | "latest";
  tag: string;
  status: string;
  pinDisplay: string;
  pinFull: string;
  image: string;
}

export interface VersionRowView {
  tag: string;
  pinDisplay: string;
  pinFull: string;
  image: string;
  imageTag: string;
  chapkit: string;
  status: string;
  verifiedBy: string[];
  changelog: string | null;
  notes: string | null;
  isStable: boolean;
  isLatest: boolean;
}

export interface ConfigurationView {
  key: string;
  description: string;
  /** The flat chapkit config, as YAML for reading and keeping in a file. */
  yaml: string;
  /** The same config as the request that creates it on a running service. */
  curl: string;
}

export interface BenchmarksView {
  crpsByHorizon: number[];
  baseline: number[];
  comparison: { name: string; mean: number; self: boolean }[];
  /** Provenance + headline metrics of the primary record. */
  provenance: {
    dataset: string;
    versionTag: string;
    evaluatedAt: string;
    harnessTool: string;
    runUrl: string | null;
  };
  headline: { label: string; value: string }[];
}

export interface ModelDetailView {
  id: string;
  serviceId: string;
  name: string;
  shortName: string;
  kind: ModelKind;
  summary: string;
  developedFor: string | null;
  repo: string;
  repoUrl: string;
  org: string;
  attribution: {
    author: string;
    organization: string | null;
    citation: string | null;
    originalSource: string | null;
  };
  framework: string;
  covLabel: string;
  periodType: string;
  horizon: string;
  minPeriods: number;
  maxPeriods: number;
  requiresGeo: boolean;
  allowFreeAdditional: boolean;
  requiredCovariates: string[];
  defaultCovariates: string[];
  imageBase: string;
  runtimeImage: string;
  chapkitRequirement: string;
  stable: ChannelView;
  latest: ChannelView;
  latestSameAsStable: boolean;
  versions: VersionRowView[];
  inReview: InReviewPinView[];
  inReviewAsOf: string | null;
  configurations: ConfigurationView[];
  benchmarks: BenchmarksView | null;
  /** Cross-model benchmark state for the CTA card; null while no run exists. */
  benchmarkSummary: {
    measured: number;
    listed: number;
    suiteNames: string[];
  } | null;
  verifiedPins: number;
  reviews: number;
  installUrl: string;
}

function toChannelView(
  model: Model,
  channel: "stable" | "latest",
  version: ModelVersion,
): ChannelView {
  return {
    channel,
    tag: version.version,
    status: version.status,
    pinDisplay: displayPin(model, version),
    pinFull: fullPin(model, version),
    image: imageRef(model, version),
  };
}

/** The flat chapkit config, as a YAML document. */
function configYaml(config: Record<string, unknown>): string {
  return stringify(config, { lineWidth: 0 });
}

/**
 * The request that creates this configuration on a running service. chapkit
 * takes `{name, data}` on POST /api/v1/configs, where `data` is the flat
 * config object validated against the model's own config schema.
 */
function configCurl(key: string, config: Record<string, unknown>): string {
  const body = JSON.stringify({ name: key, data: config });
  return [
    "curl -X POST http://localhost:8000/api/v1/configs \\",
    "  -H 'Content-Type: application/json' \\",
    `  -d '${body}'`,
  ].join("\n");
}

function benchmarksView(
  model: Model,
  registry: Registry,
  benchmarks: Benchmark[],
): BenchmarksView | null {
  const records = recordsFor(model, benchmarks);
  const primary = records.find((b) => b.metrics.crps_by_horizon) ?? records[0];
  if (!primary) return null;

  const comparison = registry.models
    .map((m) => {
      const onDataset = benchmarksFor(benchmarks, m.id).filter(
        (b) => b.dataset === primary.dataset,
      );
      const mean =
        onDataset.length > 0
          ? onDataset.reduce((s, b) => s + b.metrics.crps, 0) / onDataset.length
          : null;
      return { name: presentationFor(m.id).abbrev, mean, self: m.id === model.id };
    })
    .filter((c): c is { name: string; mean: number; self: boolean } =>
      typeof c.mean === "number",
    );

  const skill = skillOf(primary);
  const headline: { label: string; value: string }[] = [
    { label: "Mean CRPS", value: primary.metrics.crps.toFixed(2) },
    ...(primary.metrics.mae !== undefined
      ? [{ label: "MAE", value: primary.metrics.mae.toFixed(1) }]
      : []),
    ...(primary.metrics.rmse !== undefined
      ? [{ label: "RMSE", value: primary.metrics.rmse.toFixed(1) }]
      : []),
    ...(primary.metrics.norm_crps !== undefined
      ? [
          {
            label: "Normalised CRPS",
            value: primary.metrics.norm_crps.toFixed(6),
          },
        ]
      : []),
    ...(primary.metrics.coverage_80 !== undefined
      ? [{ label: "Coverage 80%", value: primary.metrics.coverage_80.toFixed(2) }]
      : []),
    ...(skill !== null
      ? [{ label: "Skill vs baseline", value: `+${skill.toFixed(2)}` }]
      : []),
  ];

  return {
    crpsByHorizon: primary.metrics.crps_by_horizon ?? [],
    baseline: primary.metrics.baseline_crps_by_horizon ?? [],
    comparison: comparison.length > 1 ? comparison : [],
    provenance: {
      dataset: primary.dataset,
      versionTag: primary.version,
      evaluatedAt: primary.evaluated_at,
      harnessTool: primary.harness.tool,
      runUrl: primary.harness.run ?? null,
    },
    headline,
  };
}

export function toDetailView(
  model: Model,
  registry: Registry,
  benchmarks: Benchmark[],
  proposals: Proposals,
): ModelDetailView {
  const pres = presentationFor(model.id);
  const stable = stableVersion(model);
  const latest = latestVersion(model);
  const required = registry.index.review_policy.required_approvals;
  const verifiedPins = verifiedCount(model);

  return {
    id: model.id,
    serviceId: model.service_id,
    name: model.display_name,
    shortName: pres.shortName,
    kind: model.kind,
    summary: model.summary,
    developedFor: model.developed_for ?? null,
    repo: repoSlug(model),
    repoUrl: model.source.repository,
    org: repoOrg(model),
    attribution: {
      author: model.attribution.author,
      organization: model.attribution.organization ?? null,
      citation: model.attribution.citation ?? null,
      originalSource: model.attribution.original_source ?? null,
    },
    framework: pres.framework,
    covLabel: COV_LABEL[pres.covMode],
    periodType: model.compatibility.period_types.join(" · "),
    horizon: horizonLabel(model),
    minPeriods: model.compatibility.min_prediction_periods,
    maxPeriods: model.compatibility.max_prediction_periods,
    requiresGeo: model.compatibility.requires_geo,
    allowFreeAdditional: model.covariates.allow_free_additional,
    requiredCovariates: model.covariates.required,
    defaultCovariates: model.covariates.defaults,
    imageBase: model.source.image,
    runtimeImage: model.source.runtime_image,
    chapkitRequirement: stable.chapkit,
    stable: toChannelView(model, "stable", stable),
    latest: toChannelView(model, "latest", latest),
    latestSameAsStable: model.channels.stable === model.channels.latest,
    versions: model.versions.map((v) => ({
      tag: v.version,
      pinDisplay: displayPin(model, v),
      pinFull: fullPin(model, v),
      image: imageRef(model, v),
      imageTag: v.image_tag,
      chapkit: v.chapkit,
      status: v.status,
      verifiedBy: v.verified_by,
      changelog: v.changelog,
      notes: v.notes ?? null,
      isStable: v.version === model.channels.stable,
      isLatest: v.version === model.channels.latest,
    })),
    inReview: toInReviewViews(proposals, required).filter(
      (pin) => pin.modelId === model.id,
    ),
    inReviewAsOf: fetchedAtLabel(proposals.fetchedAt),
    configurations: Object.entries(model.configurations).map(
      ([key, configuration]) => ({
        key,
        description: configuration.description,
        yaml: configYaml(configuration.config),
        curl: configCurl(key, configuration.config),
      }),
    ),
    benchmarks: benchmarksView(model, registry, benchmarks),
    benchmarkSummary:
      benchmarks.length > 0
        ? {
            measured: new Set(benchmarks.map((b) => b.model)).size,
            listed: registry.models.length,
            suiteNames: [
              ...new Set(benchmarks.map((b) => datasetNameFor(b.dataset))),
            ],
          }
        : null,
    verifiedPins,
    reviews: verifiedPins * required,
    installUrl:
      registry.index.marketplace.documentation.install ??
      "https://chap.dhis2.org",
  };
}
