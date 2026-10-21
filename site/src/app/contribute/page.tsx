import type { Metadata } from "next";
import Link from "next/link";
import { IconCheckmarkCircle24 } from "@dhis2/ui-icons";
import { GitHubMark } from "@/components/icons";
import { CodePanel } from "@/components/CodePanel";
import { CopyButton } from "@/components/copy";
import { getRegistry } from "@/lib/registry";

export const metadata: Metadata = {
  title: "Contribute",
  description:
    "How to list a model: one YAML file, one pull request and verification.",
};

/** Compact version of the real schema documented in models/README.md. */
const EXAMPLE_YAML = `schema_version: 2

id: my_model
service_id: my-model          # MLServiceInfo.id — kebab-case of id
display_name: My Model
kind: model                   # model | starter
assessed_status: red          # YOUR OWN chapkit AssessedStatus

summary: >-
  What the model is and when to use it.

developed_for: >-             # the disease and setting you tested it on
  Monthly dengue cases in Country X at district level.

source:
  repository: https://github.com/org/my_model
  image: ghcr.io/org/my_model                  # published, no tag
  runtime_image: ghcr.io/dhis2-chap/chapkit-py # the chapkit base

attribution:
  author: Your Name
  organization: Your Institute
  original_source: https://...  # upstream model, if you adapted one

compatibility:
  period_types: [monthly]
  min_prediction_periods: 1
  max_prediction_periods: 12
  requires_geo: false

covariates:
  required: [population]      # supplied automatically by chap
  defaults: [rainfall]        # your service's own defaults
  allow_free_additional: true

channels:
  stable: 1.0.0               # must point at a verified version
  latest: 1.0.0

versions:
  - version: 1.0.0            # your MLServiceInfo.version
    commit: 1111111111111111111111111111111111111111
    image_tag: sha-1111111    # the tag built from that commit
    chapkit: ">=2.0.0,<3"
    status: verified          # set by maintainers on approval
    verified_by: []           # the reviewers
    changelog: First submission.

configurations:
  monthly:
    description: When to use this configuration.
    config:
      prediction_periods: 3
      some_option: 12
      additional_continuous_covariates: [rainfall]
`;

const CHECKS = [
  "It is a chapkit service.",
  "The image is published with a sha-<short commit> tag.",
  "The pin is the full 40-character commit and the image tag built from it.",
  "It registers with chap-core and runs a train and a predict.",
  "assessed_status is your own honest rating — we copy it as is.",
  "At least one maintainer GitHub handle is listed.",
];

const STEPS = [
  ["Add one YAML file", "Describe your model in models/<id>.yaml."],
  ["Open a pull request", "No account or form — just GitHub."],
  ["Get verified", "Once merged, your model is listed under your name."],
];

export default function ContributePage() {
  const registry = getRegistry();
  const repository = registry.index.marketplace.repository;
  return (
    <main className="mx-auto max-w-[1240px] px-5 pb-20 pt-12 sm:px-8 sm:pt-16">
      <h1 className="max-w-[20ch] font-brand text-[clamp(32px,4vw,46px)] font-medium leading-[1.1] text-ink">
        Submit a model
      </h1>
      <p className="mt-3 max-w-[52ch] text-[17px] leading-[1.6] text-ink-2">
        One file, one pull request and verification. Your name is shown on the
        listing.{" "}
        <Link href="/verification" className="font-medium text-brand hover:underline">
          Read what verification covers.
        </Link>
      </p>

      <ol className="mt-10 grid gap-4 md:grid-cols-3">
        {STEPS.map(([title, body], i) => (
          <li key={title} className="d2-card p-5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand font-medium text-white">
              {i + 1}
            </span>
            <h2 className="mt-3 text-[17px] font-medium text-ink">{title}</h2>
            <p className="mt-1 text-[15px] text-ink-2">{body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-12 grid items-start gap-10 lg:grid-cols-[1.3fr_1fr]">
        {/* min-w-0: without it the grid track sizes to the widest YAML line
            instead of letting the code panel scroll. */}
        <div className="min-w-0">
          <h2 className="mb-2 font-brand text-[22px] font-medium text-ink">
            Example file
          </h2>
          <p className="mb-5 text-[15px] text-ink-2">
            Full format in{" "}
            <a
              href={`${repository}/blob/main/models/README.md`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-brand hover:underline"
            >
              models/README.md
            </a>
            .
          </p>
          <div className="overflow-hidden rounded-[3px] border border-line">
            <div className="flex items-center justify-between gap-4 border-b border-line bg-surface-2 px-4 py-3">
              <span className="font-mono text-[14px] text-ink-2">
                models/my_model.yaml
              </span>
              <CopyButton text={EXAMPLE_YAML} label="Copy file" />
            </div>
            <CodePanel code={EXAMPLE_YAML} gutterWidth={18} />
          </div>
        </div>
        <aside className="min-w-0">
          <h2 className="mb-4 font-brand text-[22px] font-medium text-ink">
            Before you open the PR
          </h2>
          <ul className="space-y-3">
            {CHECKS.map((c) => (
              <li key={c} className="flex gap-3 text-[15px] leading-[1.5] text-ink-2">
                <span className="flex shrink-0">
                  <IconCheckmarkCircle24 color="var(--mp-verified)" />
                </span>
                {c}
              </li>
            ))}
          </ul>
          <a
            href={`${repository}/compare`}
            target="_blank"
            rel="noreferrer"
            className="d2-button d2-button-primary d2-button-large mt-8 w-full"
          >
            <GitHubMark className="h-4 w-4" />
            Open a pull request
          </a>
        </aside>
      </div>
    </main>
  );
}
