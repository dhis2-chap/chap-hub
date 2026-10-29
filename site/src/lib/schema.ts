import { z } from "zod";

/**
 * Zod encoding of the registry format (schema_version 2) documented in
 * models/README.md. The site's build and `pnpm validate` both fail when a
 * file violates it, so a model PR gets a machine check before the three
 * maintainer reviews.
 *
 * schema_version 2: a listed model is a containerised
 * chapkit ML service, so a pin carries both a commit and the image tag built
 * from it, and the file records what the service's own MLServiceInfo
 * declares — service id, prediction-period bounds, required covariates,
 * whether it accepts free-form extras, whether it needs geometry, and the
 * author's own AssessedStatus.
 */

export const VERSION_STATUSES = [
  "verified",
  "unstable",
  "deprecated",
  "yanked",
] as const;

/**
 * chapkit's `AssessedStatus` — the *author's* own judgement of how
 * rigorously the model has been validated, copied verbatim from the
 * service's `MLServiceInfo.model_metadata`. It is not a marketplace
 * verification: the review gate checks that a pin runs and is what it claims
 * to be, never that the forecasts are good. Definitions (chapkit
 * `src/chapkit/api/service_builder.py`):
 *
 * - `gray`   — not intended for use; deprecated or kept for compatibility.
 * - `red`    — highly experimental prototype, not validated.
 * - `orange` — shows promise on limited data; needs careful evaluation.
 * - `yellow` — ready for more rigorous testing on diverse data.
 * - `green`  — validated and ready for production use.
 */
export const ASSESSED_STATUSES = [
  "green",
  "yellow",
  "orange",
  "red",
  "gray",
] as const;

/** Real forecasting model, or scaffolding to copy when writing one. */
export const MODEL_KINDS = ["model", "starter"] as const;

/**
 * A model's role as a reference in Chap evaluations. `comparison` flags a
 * model that other models are compared against on request, for example a
 * country's own method. Baseline models are built into chap-core and are
 * never listed here, so `comparison` is the only role an entry can set.
 */
export const MODEL_ROLES = ["comparison"] as const;

const versionSchema = z.object({
  version: z.string().min(1),
  commit: z
    .string()
    .regex(/^[0-9a-f]{40}$/, "commit must be a full 40-char git sha"),
  /**
   * Tag on `source.image` built from `commit`. The publish workflow tags
   * every build `sha-<short>`, so that form is the immutable image pin and
   * has to agree with the commit — enforced below.
   */
  image_tag: z.string().min(1),
  /** The chapkit requirement the pinned revision declares. */
  chapkit: z.string().min(1),
  status: z.enum(VERSION_STATUSES),
  verified_by: z.array(z.string()).default([]),
  changelog: z.string().nullable().default(null),
  notes: z.string().optional(),
});

/**
 * A chapkit config: the flat object POSTed to `/api/v1/configs` as `data`.
 * `prediction_periods` is required by chapkit's own `BaseConfig`;
 * `additional_continuous_covariates` is the other field Chap interprets.
 * Everything else is the model's own option set.
 */
const configurationSchema = z.object({
  description: z.string(),
  config: z
    .object({
      prediction_periods: z.number().int().nonnegative(),
      additional_continuous_covariates: z.array(z.string()).optional(),
    })
    .catchall(z.unknown()),
});

export const modelSchema = z
  .object({
    schema_version: z.literal(2),
    id: z.string().regex(/^[a-z0-9_]+$/),
    /** `MLServiceInfo.id` — the identity the service registers under. */
    service_id: z.string().regex(/^[a-z0-9-]+$/),
    display_name: z.string().min(1),
    kind: z.enum(MODEL_KINDS),
    /** Absent for ordinary models. */
    role: z.enum(MODEL_ROLES).optional(),
    /** The author's own AssessedStatus, not a marketplace verdict. */
    assessed_status: z.enum(ASSESSED_STATUSES),
    summary: z.string().min(1),
    /**
     * The disease and setting the authors developed and tested the model on,
     * in their words. An assessment only holds for this context.
     */
    developed_for: z.string().min(1).optional(),
    source: z.object({
      repository: z.string().url(),
      /** Published chapkit service image, without a tag. */
      image: z.string().regex(/^[a-z0-9][a-z0-9._\-/]*$/, "image must be a tagless registry path"),
      /** The chapkit base image the service is built on. */
      runtime_image: z.string().min(1),
    }),
    /** Copied from `MLServiceInfo.model_metadata` — who stands behind it. */
    attribution: z.object({
      author: z.string().min(1),
      organization: z.string().min(1).optional(),
      citation: z.string().min(1).optional(),
      /** The upstream model or package this service adapts, if any. */
      original_source: z.string().url().optional(),
    }),
    compatibility: z.object({
      period_types: z.array(z.string()).min(1),
      min_prediction_periods: z.number().int().nonnegative(),
      max_prediction_periods: z.number().int().positive(),
      /** `MLServiceInfo.requires_geo` — the service needs a GeoJSON input. */
      requires_geo: z.boolean().default(false),
    }),
    covariates: z.object({
      /** `required_covariates` — supplied automatically by chap. */
      required: z.array(z.string()),
      /** The service's own default `additional_continuous_covariates`. */
      defaults: z.array(z.string()),
      /** `allow_free_additional_continuous_covariates`. */
      allow_free_additional: z.boolean(),
    }),
    channels: z.object({
      stable: z.string().min(1),
      latest: z.string().min(1),
    }),
    versions: z.array(versionSchema).min(1),
    configurations: z.record(z.string(), configurationSchema).default({}),
  })
  .superRefine((model, ctx) => {
    if (model.role && model.kind === "starter") {
      ctx.addIssue({
        code: "custom",
        path: ["role"],
        message: "a starter is not a forecasting model and cannot be a comparison model",
      });
    }

    // The service id is the model id in kebab-case. Enforced so a listing
    // cannot drift from the identity the service registers with chap-core.
    const expectedServiceId = model.id.replace(/_/g, "-");
    if (model.service_id !== expectedServiceId) {
      ctx.addIssue({
        code: "custom",
        path: ["service_id"],
        message: `service_id must be the kebab-case form of id ("${expectedServiceId}")`,
      });
    }

    const byTag = new Map(model.versions.map((v) => [v.version, v]));
    for (const channel of ["stable", "latest"] as const) {
      if (!byTag.has(model.channels[channel])) {
        ctx.addIssue({
          code: "custom",
          path: ["channels", channel],
          message: `channels.${channel} points at "${model.channels[channel]}", which is not in versions`,
        });
      }
    }
    const stable = byTag.get(model.channels.stable);
    if (stable && stable.status !== "verified") {
      ctx.addIssue({
        code: "custom",
        path: ["channels", "stable"],
        message: `channels.stable must point at a verified version (got status "${stable.status}")`,
      });
    }

    const seen = new Set<string>();
    model.versions.forEach((v, i) => {
      if (seen.has(v.version)) {
        ctx.addIssue({
          code: "custom",
          path: ["versions"],
          message: `duplicate version tag "${v.version}"`,
        });
      }
      seen.add(v.version);
      // A sha- tag is the commit; anything else (a semver release tag) is
      // taken at face value.
      const shortCommit = v.commit.slice(0, 7);
      if (
        v.image_tag.startsWith("sha-") &&
        v.image_tag !== `sha-${shortCommit}`
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["versions", i, "image_tag"],
          message: `image_tag "${v.image_tag}" does not match the pinned commit (expected "sha-${shortCommit}")`,
        });
      }
    });

    const { min_prediction_periods: min, max_prediction_periods: max } =
      model.compatibility;
    if (min > max) {
      ctx.addIssue({
        code: "custom",
        path: ["compatibility", "min_prediction_periods"],
        message: `min_prediction_periods (${min}) exceeds max_prediction_periods (${max})`,
      });
    }

    const required = new Set(model.covariates.required);
    const declared = new Set(model.covariates.defaults);
    for (const [name, { config }] of Object.entries(model.configurations)) {
      const periods = config.prediction_periods;
      if (periods < min || periods > max) {
        ctx.addIssue({
          code: "custom",
          path: ["configurations", name, "config", "prediction_periods"],
          message: `prediction_periods ${periods} is outside the declared range ${min}–${max}`,
        });
      }
      for (const cov of config.additional_continuous_covariates ?? []) {
        if (required.has(cov)) {
          ctx.addIssue({
            code: "custom",
            path: ["configurations", name],
            message: `"${cov}" is a required covariate (auto-supplied by chap) and must not be repeated in configurations`,
          });
        } else if (!model.covariates.allow_free_additional && !declared.has(cov)) {
          // The service refuses free-form extras, so the only names it can
          // take are the ones it ships as defaults.
          ctx.addIssue({
            code: "custom",
            path: ["configurations", name],
            message: `"${cov}" is not one of covariates.defaults, and this service does not allow free additional covariates`,
          });
        }
      }
    }
  });

export const registrySchema = z.object({
  schema_version: z.literal(2),
  marketplace: z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    /** The marketplace repo itself — the target of open-PR ingestion. */
    repository: z.string().url().optional(),
    documentation: z.record(z.string(), z.string().url()),
  }),
  review_policy: z.object({
    required_approvals: z.number().int().positive(),
    note: z.string().optional(),
  }),
  models: z.array(z.string().regex(/^models\/[a-z0-9_]+\.yaml$/)).min(1),
});

/**
 * One benchmark result: a listed pin's newest run on one suite, as fetched
 * from the benchmarking server into benchmarks/results.json. The loader
 * additionally cross-checks model, version and commit against the registry.
 */
export const benchmarkSchema = z.object({
  model: z.string().regex(/^[a-z0-9_]+$/),
  version: z.string().min(1),
  commit: z
    .string()
    .regex(/^[0-9a-f]{40}$/, "commit must be a full 40-char git sha"),
  dataset: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  evaluated_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"),
  harness: z.object({
    tool: z.string().min(1),
    run: z.string().url().optional(),
  }),
  /** Backtest parameters of the run — what makes two rows comparable. */
  run: z
    .object({
      /** Configuration key inside the model file the run used. */
      configuration: z.string().min(1).optional(),
      observations: z.number().int().positive().optional(),
      horizon: z.number().int().positive().optional(),
      splits: z.number().int().positive().optional(),
      samples: z.number().int().positive().optional(),
    })
    .optional(),
  /**
   * The backtest's aggregate metrics, verbatim under chap's metric ids
   * (crps, crps_norm, mae, coverage_10_90, ...); `metricInfoSchema` says
   * what each one is. Every record has at least CRPS.
   */
  metrics: z
    .object({ crps: z.number().nonnegative() })
    .catchall(z.number()),
  /**
   * chap-core's comparison of the run with each baseline, by baseline id
   * and metric id, oriented so positive is better than the baseline.
   */
  comparisons: z
    .record(z.string(), z.record(z.string(), z.number()))
    .default({}),
});

/** A chap-core built-in baseline the runs are compared with. */
export const baselineSchema = z.object({
  /** The configured model's name, e.g. "seasonal_median". */
  id: z.string().min(1),
  name: z.string().min(1),
});

/**
 * One of chap-core's scoring metrics, as its
 * GET /v1/visualization/metrics/{backtest_id} describes it — copied verbatim.
 */
export const metricInfoSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string(),
  unit: z.string().nullable(),
  target: z.number().nullable(),
  targetBehavior: z.string(),
  optimizationDirection: z.enum(["minimize", "maximize"]).nullable(),
  /** How a score is compared with a baseline's, e.g. "skill_ratio". */
  comparisonOp: z.string().nullable().default(null),
});

/** benchmarks/results.json: the metric definitions, baselines and records. */
export const benchmarkResultsSchema = z.object({
  metrics: z.array(metricInfoSchema),
  baselines: z.array(baselineSchema).default([]),
  results: z.array(benchmarkSchema),
});

export type AssessedStatus = (typeof ASSESSED_STATUSES)[number];
export type ModelKind = (typeof MODEL_KINDS)[number];
export type ModelVersion = z.infer<typeof versionSchema>;
export type ModelConfiguration = z.infer<typeof configurationSchema>;
export type Model = z.infer<typeof modelSchema>;
export type RegistryIndex = z.infer<typeof registrySchema>;
export type Benchmark = z.infer<typeof benchmarkSchema>;
export type MetricInfo = z.infer<typeof metricInfoSchema>;
export type Baseline = z.infer<typeof baselineSchema>;
export type BenchmarkResults = z.infer<typeof benchmarkResultsSchema>;
