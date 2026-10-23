
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

/** Display names for the suite dataset ids in chap-api.ts. */
export const DATASET_NAME: Record<string, string> = {
  "vietnam-monthly": "Vietnam monthly",
  "laos-monthly": "Laos monthly",
  "thailand-monthly": "Thailand monthly",
};

export function datasetNameFor(id: string): string {
  return DATASET_NAME[id] ?? id.replace(/-/g, " ");
}

/**
 * Where each suite's data comes from: the benchmarking server seeds its
 * evaluation sets from these admin-1 monthly CSV + GeoJSON pairs
 * (dhis2-chap/chap_benchmarking, example_config/dataset_seeds.yaml).
 */
const DATASET_SOURCE_ROOT =
  "https://github.com/dhis2/climate-health-data/tree/af362d5260c6";
export const DATASET_SOURCE: Record<string, string> = {
  "vietnam-monthly": `${DATASET_SOURCE_ROOT}/vnm`,
  "laos-monthly": `${DATASET_SOURCE_ROOT}/lao`,
  "thailand-monthly": `${DATASET_SOURCE_ROOT}/tha`,
};

export function datasetSourceFor(id: string): string | null {
  return DATASET_SOURCE[id] ?? null;
}
