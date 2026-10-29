import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "Marketplace reference material and direct links to the Chap modeling documentation.",
};

const ENTRIES = [
  {
    kicker: "marketplace",
    title: "Model registry format",
    body: "The marketplace YAML schema, version pins, channels, configurations, and review conventions.",
    href: "https://github.com/dhis2-chap/model-marketplace/blob/main/models/README.md",
  },
  {
    kicker: "marketplace",
    title: "Benchmark results",
    body: "Where benchmark results come from and how the models are run.",
    href: "https://github.com/dhis2-chap/model-marketplace/blob/main/benchmarks/README.md",
  },
  {
    kicker: "platform",
    title: "Install marketplace models",
    body: "Install, update and remove listed models in a running Chap with chap-admin.",
    href: "https://chap.dhis2.org/chap-modeling-platform/chap-cli/chap-core-cli-setup/#running-marketplace-models",
  },
  {
    kicker: "platform",
    title: "Run chapkit models in Chap",
    body: "How Chap talks to chapkit services over HTTP, including the data format.",
    href: "https://chap.dhis2.org/chap-modeling-platform/external_models/chapkit/",
  },
  {
    kicker: "platform",
    title: "DHIS2 Chap app",
    body: "Evaluate, predict, configure, and compare models from the DHIS2 Modeling App.",
    href: "https://chap.dhis2.org/chap-modeling-platform/modeling-app/using-the-modeling-app/getting-started/",
  },
  {
    kicker: "chapkit",
    title: "Build a model with chapkit",
    body: "Config, artifact and train/predict workflows for model services — the toolkit every listed model is built with.",
    href: "https://dhis2-chap.github.io/chapkit/",
  },
  {
    kicker: "community",
    title: "Get in touch",
    body: "Questions about listing a model, or joining the review board.",
    href: "mailto:climate@dhis2.org",
  },
];

export default function DocsPage() {
  return (
    <main className="mx-auto max-w-[1240px] px-5 pb-20 pt-11 sm:px-8 sm:pb-24 sm:pt-16">
      <div className="grid gap-x-10 gap-y-9 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.45fr)] xl:gap-x-16">
        <div>
          <h1 className="mb-5 font-brand text-[clamp(34px,3.6vw,46px)] font-medium leading-[1.02] text-ink">
            Documentation
          </h1>
          <p className="max-w-[44ch] text-[17px] leading-[1.7] text-ink-2">
            Guides for running, building and listing chapkit models.
          </p>
        </div>
        <div className="d2-card overflow-hidden">
          {ENTRIES.map((entry) => (
            <a
              key={entry.title}
              href={entry.href}
              target={entry.href.startsWith("mailto:") ? undefined : "_blank"}
              rel="noreferrer"
              className="group grid grid-cols-[92px_minmax(0,1fr)_auto] items-start gap-x-6 border-b border-line px-5 py-[22px] transition-colors duration-150 last:border-b-0 hover:bg-surface-2 hover:[box-shadow:inset_4px_0_0_var(--mp-brand)] max-sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <span className="pt-[3px] text-[13px] font-medium uppercase tracking-[0.08em] text-ink-3 max-sm:col-span-2 max-sm:pb-1.5">
                {entry.kicker}
              </span>
              <span className="min-w-0">
                <span className="block font-brand text-[17px] font-medium text-ink transition-colors group-hover:text-brand">
                  {entry.title}
                </span>
                <span className="mt-1 block max-w-[62ch] text-[15px] leading-[1.55] text-ink-2">
                  {entry.body}
                </span>
              </span>
              <span className="self-center pl-4 font-brand text-[15px] text-ink-3 transition-[color,transform] duration-150 group-hover:translate-x-[2px] group-hover:-translate-y-[2px] group-hover:text-brand">
                ↗
              </span>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
