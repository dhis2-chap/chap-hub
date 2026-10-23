import type { Metadata } from "next";
import Link from "next/link";
import { BenchmarkSuites } from "@/components/BenchmarksClient";
import {
  buildBenchmarkSuites,
  getBenchmarks,
  getMetricDefinitions,
} from "@/lib/benchmarks";
import { BENCHMARKS_LIVE } from "@/lib/flags";
import { getRegistry } from "@/lib/registry";

const LINK = "font-medium text-brand hover:underline";

export const metadata: Metadata = {
  title: "Benchmarks",
  description:
    "Backtest results for every listed pin, from controlled Chap evaluations — nothing self-reported.",
};

/** Rendered until real benchmark results exist. */
function BenchmarksComingSoon() {
  return (
    <main>
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-[1240px] px-5 pb-10 pt-11 sm:px-8 sm:pb-12 sm:pt-16">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-exp">
            Coming soon
          </span>
          <h1 className="my-4 font-brand text-[clamp(36px,4vw,50px)] font-medium leading-[1.02] text-ink">
            Benchmarks
          </h1>
          <p className="max-w-[58ch] text-[16px] leading-[1.7] text-ink-2">
            Every score on this page will come from a controlled Chap
            evaluation of a pinned commit — nothing self-reported. No
            results have been published yet.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 sm:px-8 pt-9">
        <div className="d2-card px-[26px] py-6">
          <div className="font-brand text-[15px] font-medium text-ink">
            What will appear here
          </div>
          <p className="mt-1 max-w-[72ch] text-[13px] leading-[1.6] text-ink-2">
            One ranked table per reference dataset, with a full run record
            behind every row. The exact datasets, metrics and run parameters
            will be documented once the methodology is settled. Results are
            read from Chap&apos;s benchmarking server each time the site is
            published.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 sm:px-8 pb-24 pt-9">
        <div className="flex flex-wrap items-center justify-between gap-5 border-t border-line pt-5">
          <span className="text-[13px] text-ink-2">
            Per-model benchmark charts get the same treatment — they appear on
            each model&apos;s detail page together with the first recorded
            runs.
          </span>
          <Link
            href="/"
            className="d2-button"
          >
            Browse models
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function BenchmarksPage() {
  const records = getBenchmarks();
  if (!BENCHMARKS_LIVE || records.length === 0) return <BenchmarksComingSoon />;

  const suites = buildBenchmarkSuites(getRegistry(), records, getMetricDefinitions());
  const singleSplitSmoke = records.length === 1 && records[0].run?.splits === 1;

  return (
    <main>
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-[1240px] px-5 pb-10 pt-11 sm:px-8 sm:pt-16">
          <div>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-exp">
              {records.length === 0
                ? "Waiting for the first run"
                : suites.length === 1
                  ? "Early results · one suite"
                  : `Early results · ${suites.length} suites`}
            </span>
            <h1 className="my-4 font-brand text-[clamp(36px,4vw,50px)] font-medium leading-[1.02] text-ink">
              Benchmarks
            </h1>
            <p className="max-w-[58ch] text-[16px] leading-[1.7] text-ink-2">
              Every score on this page comes from a controlled Chap evaluation
              of a pinned commit — nothing is self-reported.{" "}
              {records.length === 0
                ? "No run has been recorded yet, so there is nothing to rank — a suite appears once its first result is published."
                : singleSplitSmoke
                  ? "Only one model has been evaluated so far, over a single backtest split, so read this as provenance rather than a ranking. Rows without a run stay empty on purpose."
                  : `${records.length} runs have been recorded so far — still early, so read this as provenance rather than a ranking. Rows without a run stay empty on purpose.`}
            </p>
          </div>
        </div>
      </section>

      <BenchmarkSuites suites={suites} />

      {suites.length > 0 ? (
        <section className="mx-auto max-w-[1240px] px-5 sm:px-8 pt-9">
          <div className="d2-card px-[26px] py-6">
            <div className="font-brand text-[15px] font-medium text-ink">
              How models are run
            </div>
            <p className="mt-1 max-w-[72ch] text-[13px] leading-[1.6] text-ink-2">
              Chap&apos;s{" "}
              <a href="https://github.com/dhis2-chap/chap_benchmarking" className={LINK}>
                benchmarking server
              </a>{" "}
              installs every listed pin with{" "}
              <code className="font-mono text-[12px] text-ink">chap-admin</code>{" "}
              and backtests it on a schedule, on each of the{" "}
              <a href="https://github.com/dhis2/climate-health-data" className={LINK}>
                datasets
              </a>{" "}
              it can run on. A{" "}
              <a
                href="https://chap.dhis2.org/chap-modeling-platform/contributor/evaluation_pipeline/"
                className={LINK}
              >
                backtest
              </a>{" "}
              trains the model on the history up to a cut-off, forecasts the
              next few months, and repeats from later cut-offs; the forecasts
              are scored against the observed cases with Chap&apos;s own
              metrics. Each row&apos;s run record shows the settings it ran
              with. How the suites are ranked is not settled yet.
            </p>
          </div>
        </section>
      ) : null}

      {suites.length === 0 ? (
        <section className="mx-auto max-w-[1240px] px-5 sm:px-8 pt-9">
          <div className="d2-card px-[26px] py-6">
            <div className="font-brand text-[15px] font-medium text-ink">
              Waiting for the first results
            </div>
            <p className="mt-1 max-w-[64ch] text-[13px] leading-[1.6] text-ink-2">
              This page renders the runs read from Chap&apos;s benchmarking
              server each time the site is published. A row appears once a
              listed model&apos;s run has been published.
            </p>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-[1240px] px-5 sm:px-8 pb-24 pt-9">
        <div className="flex flex-wrap items-center justify-between gap-5 border-t border-line pt-5">
          <span className="text-[13px] text-ink-2">
            Each model&apos;s detail page shows its best configuration&apos;s
            metrics and how it compares with the other listed models.
          </span>
          <Link
            href="/"
            className="d2-button"
          >
            Browse models
          </Link>
        </div>
      </section>
    </main>
  );
}
