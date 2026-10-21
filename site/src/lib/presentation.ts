import type { AssessedStatus } from "./schema";

/**
 * Editorial, site-side metadata the registry YAML does not carry (yet).
 * Facts about the model repositories — framework, how the model uses
 * covariates — that may migrate into the YAML in a schema_version bump.
 * Nothing here is fabricated data.
 */

export type CovariateMode = "climate" | "none" | "both";

export interface Presentation {
  /** e.g. "R · INLA" — what the model is implemented with. */
  framework: string;
  /** The implementation language, for the catalog's language filter. */
  language: "Python" | "R";
  /** How the model relates to climate covariates. */
  covMode: CovariateMode;
  /** Short name for tight chart labels. */
  shortName: string;
  /** Very short name for bar-chart tick labels. */
  abbrev: string;
}

export const COV_LABEL: Record<CovariateMode, string> = {
  climate: "climate-driven",
  none: "no covariates",
  both: "climate or history",
};

export const PRESENTATION: Record<string, Presentation> = {
  chapkit_rwanda_malaria_bym_model: {
    framework: "R · INLA",
    language: "R",
    covMode: "climate",
    shortName: "Rwanda BYM",
    abbrev: "BYM",
  },
  chapkit_simple_multistep_model: {
    framework: "Python · scikit-learn + skpro",
    language: "Python",
    covMode: "both",
    shortName: "Simple Multistep",
    abbrev: "Multi",
  },
  auto_arima_chapkit: {
    framework: "R · fable",
    language: "R",
    covMode: "none",
    shortName: "Auto-ARIMA",
    abbrev: "ARIMA",
  },
  chapkit_minimalist_example_py: {
    framework: "Python · scikit-learn",
    language: "Python",
    covMode: "none",
    shortName: "Minimalist (Py)",
    abbrev: "Min-py",
  },
  chapkit_minimalist_example_r: {
    framework: "R · lm()",
    language: "R",
    covMode: "none",
    shortName: "Minimalist (R)",
    abbrev: "Min-R",
  },
};

export function presentationFor(id: string): Presentation {
  return (
    PRESENTATION[id] ?? {
      framework: "—",
      language: "Python",
      covMode: "both",
      shortName: id,
      abbrev: id.slice(0, 6),
    }
  );
}

/* ---------- assessed status ---------- */

/**
 * chapkit's AssessedStatus scale, worded for the site. These are the
 * *author's* own definitions, transcribed from chapkit
 * (`src/chapkit/api/service_builder.py`) — the marketplace does not
 * reinterpret them and does not assign them.
 */
export const ASSESSED_STATUS_COPY: Record<
  AssessedStatus,
  { label: string; blurb: string }
> = {
  green: {
    label: "Validated",
    blurb: "Validated and ready for production use.",
  },
  yellow: {
    label: "Ready for testing",
    blurb: "Ready for more rigorous testing on diverse data.",
  },
  orange: {
    label: "Promising",
    blurb:
      "Shows promise on limited data, needs manual configuration and careful evaluation.",
  },
  red: {
    label: "Prototype",
    blurb:
      "Highly experimental prototype, not validated, only for early experimentation.",
  },
  gray: {
    label: "Not intended for use",
    blurb:
      "Not intended for use — deprecated, or kept only for backwards compatibility.",
  },
};

/** Display names for the dataset ids used in benchmarks/. */
export const DATASET_NAME: Record<string, string> = {
  "laos-admin1-monthly": "Laos admin-1 monthly",
};

export function datasetNameFor(id: string): string {
  return DATASET_NAME[id] ?? id.replace(/-/g, " ");
}
