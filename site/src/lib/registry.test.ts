import { describe, expect, it } from "vitest";
import {
  displayPin,
  fullPin,
  imageRef,
  loadRegistry,
  marketplaceStats,
  stableVersion,
} from "./registry";
import { modelSchema } from "./schema";

describe("the real registry", () => {
  const registry = loadRegistry();

  it("loads and validates every model file", () => {
    expect(registry.models.length).toBeGreaterThan(0);
    expect(registry.index.review_policy.required_approvals).toBe(3);
  });

  it("carries the marketplace's own repository for open-PR ingestion", () => {
    expect(registry.index.marketplace.repository).toBe(
      "https://github.com/dhis2-chap/model-marketplace",
    );
  });

  it("resolves both channels for every model", () => {
    for (const model of registry.models) {
      expect(stableVersion(model).status).toBe("verified");
    }
  });

  it("lists chapkit services only — every model has a published image", () => {
    for (const model of registry.models) {
      expect(model.source.image).toMatch(/^ghcr\.io\//);
      expect(model.source.runtime_image).toMatch(
        /^ghcr\.io\/dhis2-chap\/chapkit-/,
      );
      for (const version of model.versions) {
        expect(version.chapkit).toMatch(/^>=2\.\d+\.\d+,<3$/);
      }
    }
  });

  it("derives the source pin in both display and chap-consumable form", () => {
    const ghr = registry.models.find((m) => m.id === "chapkit_ghr_model");
    expect(ghr).toBeDefined();
    const stable = stableVersion(ghr!);
    expect(displayPin(ghr!, stable)).toBe(
      "github.com/chap-models/chapkit_ghr_model@1748a64",
    );
    expect(fullPin(ghr!, stable)).toBe(
      "https://github.com/chap-models/chapkit_ghr_model@1748a6462eda57b9d68f7e0344ade727b975b481",
    );
  });

  it("derives the deployable image pin from the same commit", () => {
    const ghr = registry.models.find((m) => m.id === "chapkit_ghr_model")!;
    expect(imageRef(ghr, stableVersion(ghr))).toBe(
      "ghcr.io/chap-models/chapkit_ghr_model:sha-1748a64",
    );
  });

  it("counts forecasting models and templates separately", () => {
    const stats = marketplaceStats(registry);
    expect(stats.models + stats.templates).toBe(registry.models.length);
    expect(stats.templates).toBeGreaterThan(0);
  });

  it("counts reviews as verified pins × required approvals", () => {
    const stats = marketplaceStats(registry);
    expect(stats.reviews).toBe(stats.verifiedPins * 3);
  });
});

describe("schema refinements", () => {
  const base = {
    schema_version: 2,
    id: "my_model",
    service_id: "my-model",
    display_name: "My Model",
    kind: "model",
    assessed_status: "red",
    summary: "A test model.",
    source: {
      repository: "https://github.com/org/my_model",
      image: "ghcr.io/org/my_model",
      runtime_image: "ghcr.io/dhis2-chap/chapkit-py",
    },
    attribution: { author: "Someone" },
    compatibility: {
      period_types: ["monthly"],
      min_prediction_periods: 1,
      max_prediction_periods: 12,
      requires_geo: false,
    },
    covariates: {
      required: ["population"],
      defaults: ["rainfall"],
      allow_free_additional: false,
    },
    channels: { stable: "1.0.0", latest: "1.0.0" },
    versions: [
      {
        version: "1.0.0",
        commit: "1111111111111111111111111111111111111111",
        image_tag: "sha-1111111",
        chapkit: ">=2.0.0,<3",
        status: "verified",
        verified_by: [],
        changelog: null,
      },
    ],
    configurations: {},
  };

  it("accepts a well-formed model", () => {
    expect(modelSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a service id that is not the kebab-case model id", () => {
    const bad = { ...base, service_id: "something-else" };
    expect(modelSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a channel pointing at a missing version", () => {
    const bad = { ...base, channels: { stable: "1.0.0", latest: "9.9.9" } };
    expect(modelSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a stable channel pointing at an unverified version", () => {
    const bad = {
      ...base,
      versions: [{ ...base.versions[0], status: "unstable" }],
    };
    expect(modelSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a short commit hash", () => {
    const bad = {
      ...base,
      versions: [{ ...base.versions[0], commit: "cdd06ed" }],
    };
    expect(modelSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a sha- image tag that disagrees with the commit", () => {
    const bad = {
      ...base,
      versions: [{ ...base.versions[0], image_tag: "sha-2222222" }],
    };
    expect(modelSchema.safeParse(bad).success).toBe(false);
  });

  it("accepts a non-sha image tag without cross-checking it", () => {
    const ok = {
      ...base,
      versions: [{ ...base.versions[0], image_tag: "1.0.0" }],
    };
    expect(modelSchema.safeParse(ok).success).toBe(true);
  });

  it("rejects prediction_periods outside the declared range", () => {
    const bad = {
      ...base,
      configurations: {
        monthly: {
          description: "test",
          config: { prediction_periods: 24 },
        },
      },
    };
    expect(modelSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects configurations repeating a required covariate", () => {
    const bad = {
      ...base,
      configurations: {
        monthly: {
          description: "test",
          config: {
            prediction_periods: 3,
            additional_continuous_covariates: ["population"],
          },
        },
      },
    };
    expect(modelSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects undeclared covariates when the service refuses free extras", () => {
    const bad = {
      ...base,
      configurations: {
        monthly: {
          description: "test",
          config: {
            prediction_periods: 3,
            additional_continuous_covariates: ["mean_temperature"],
          },
        },
      },
    };
    expect(modelSchema.safeParse(bad).success).toBe(false);
  });

  it("allows any covariate when the service accepts free extras", () => {
    const ok = {
      ...base,
      covariates: { ...base.covariates, allow_free_additional: true },
      configurations: {
        monthly: {
          description: "test",
          config: {
            prediction_periods: 3,
            additional_continuous_covariates: ["mean_temperature"],
          },
        },
      },
    };
    expect(modelSchema.safeParse(ok).success).toBe(true);
  });
});
