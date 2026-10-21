"use client";

import Link from "next/link";
import { useState, type KeyboardEvent, type ReactNode } from "react";
import { IconWarningFilled24 } from "@dhis2/ui-icons";
import { BENCHMARKS_LIVE } from "@/lib/flags";
import type { ModelDetailView } from "@/lib/views";
import { ChannelChip, StatusBadge } from "./badges";
import { CodePanel } from "./CodePanel";
import { CopyButton } from "./copy";
import { ComparisonChart, CrpsByHorizonChart } from "./charts";

type Tab = "overview" | "versions" | "configs" | "benchmarks" | "install";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "install", label: "Install" },
  { id: "versions", label: "Versions" },
  { id: "configs", label: "Configurations" },
  ...(BENCHMARKS_LIVE
    ? [{ id: "benchmarks" as const, label: "Benchmarks" }]
    : []),
];

const H2 = "mb-2 font-brand text-[22px] font-medium text-ink";
const LEDE = "mb-6 max-w-[70ch] text-[15px] leading-[1.6] text-ink-2";
const Code = ({ children }: { children: ReactNode }) => (
  <code className="font-mono text-[14px] text-ink">{children}</code>
);

/** A DHIS2 NoticeBox, warning variant (yellow700 icon). */
function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="d2-notice d2-notice-warning mb-6 max-w-[70ch]">
      <span className="flex shrink-0">
        <IconWarningFilled24 color="#e56408" />
      </span>
      <p className="pt-0.5">{children}</p>
    </div>
  );
}

function OverviewTab({
  view,
  goInstall,
}: {
  view: ModelDetailView;
  goInstall: () => void;
}) {
  const optional = view.defaultCovariates.length
    ? view.defaultCovariates
    : view.allowFreeAdditional
      ? ["any"]
      : ["none"];
  return (
    <div className="grid items-start gap-10 lg:grid-cols-[1.5fr_1fr]">
      <div className="min-w-0">
        {view.kind === "template" ? (
          <Notice>
            A template to copy when writing a model. Do not use it for real
            forecasts.
          </Notice>
        ) : null}

        <h2 className={H2}>Author assessment</h2>
        <div className="d2-card mb-8 p-5">
          <p className="text-[15px] leading-[1.55] text-ink-2">
            {view.assessedBlurb}
          </p>
          <p className="mt-2 text-[14px] text-ink-3">
            Rated by the authors, not by the marketplace.
          </p>
        </div>

        <h2 className={H2}>Covariates</h2>
        <dl className="mb-8 grid gap-4 sm:grid-cols-2">
          {(
            [
              ["Required (supplied by Chap)", view.requiredCovariates.length ? view.requiredCovariates : ["none"]],
              ["Optional", optional],
            ] as const
          ).map(([label, names]) => (
            <div key={label} className="d2-card p-5">
              <dt className="mb-2 text-[14px] font-medium text-ink-2">{label}</dt>
              {names.map((n) => (
                <dd key={n} className="font-mono text-[15px] text-ink">
                  {n}
                </dd>
              ))}
            </div>
          ))}
        </dl>

        {view.attribution.citation ? (
          <>
            <h2 className={H2}>Citation</h2>
            <p className="max-w-[70ch] text-[15px] leading-[1.65] text-ink-2">
              {view.attribution.citation}
            </p>
          </>
        ) : null}
      </div>

      <div className="d2-card p-5">
        <h2 className="mb-2 font-brand text-[18px] font-medium text-ink">
          Details
        </h2>
        <dl>
          {(
            [
              ["Period", view.periodType],
              ["Horizon", view.horizon],
              ["Needs geometry", view.requiresGeo ? "yes" : "no"],
              ["Built with", view.framework],
              ["chapkit", view.chapkitRequirement],
              ["Service id", view.serviceId],
            ] as const
          ).map(([k, v]) => (
            <div
              key={k}
              className="flex justify-between gap-4 border-b border-line py-2.5 text-[15px]"
            >
              <dt className="shrink-0 text-ink-2">{k}</dt>
              <dd className="min-w-0 text-right font-mono text-[14px] text-ink [overflow-wrap:anywhere]">
                {v}
              </dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          onClick={goInstall}
          className="d2-button d2-button-primary d2-button-large mt-5 w-full"
        >
          Install
        </button>
      </div>
    </div>
  );
}

function VersionsTab({ view }: { view: ModelDetailView }) {
  const installable = view.kind !== "template";
  const installCmd = (v: ModelDetailView["versions"][number]) =>
    v.isStable
      ? `chap-admin install ${view.id}`
      : `chap-admin install ${view.id} --image ${v.image}`;
  return (
    <div>
      {view.inReview.length > 0 ? (
        <>
          <h2 className={H2}>In review</h2>
          <ul className="d2-card mb-10 divide-y divide-line overflow-hidden">
            {view.inReview.map((pin) => (
              <li key={`${pin.prNumber}-${pin.label}`}>
                <a
                  href={pin.prUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-surface-2"
                >
                  <span>
                    <span className="font-mono font-medium text-ink">
                      {pin.label}
                    </span>
                    <span className="ml-3 text-[14px] text-ink-2">
                      by @{pin.author} · #{pin.prNumber}
                    </span>
                  </span>
                  <span className="d2-tag bg-as-yellow-tint text-as-yellow">
                    {pin.approvals} approvals
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <h2 className={H2}>Versions</h2>
      <p className={LEDE}>
        Each version pins one commit and the image built from it. Production
        should run <Code>stable</Code>.
        {installable
          ? " Any other version installs as a custom image, with one default configuration instead of the verified ones, and only once you add --accept-risk yourself."
          : null}
      </p>
      <div className="d2-card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[15px]">
          <thead className="border-b border-line bg-surface-2 text-[14px] text-ink">
            <tr>
              <th scope="col" className="px-5 py-3 font-medium">Version</th>
              <th scope="col" className="px-5 py-3 font-medium">Status</th>
              <th scope="col" className="px-5 py-3 font-medium">Image</th>
              <th scope="col" className="px-5 py-3 font-medium">Changes</th>
              {installable ? (
                <th scope="col" className="px-5 py-3 font-medium">Install</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {view.versions.map((v) => (
              <tr key={v.tag} className="align-top">
                <td className="px-5 py-4">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-medium text-ink">{v.tag}</span>
                    {v.isStable ? <ChannelChip channel="stable" /> : null}
                    {v.isLatest && !v.isStable ? (
                      <ChannelChip channel="latest" />
                    ) : null}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={v.status} />
                </td>
                <td className="px-5 py-4">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[14px] text-ink">
                      :{v.imageTag}
                    </span>
                    <CopyButton text={v.image} />
                  </span>
                </td>
                <td className="max-w-[48ch] px-5 py-4 text-ink-2">
                  {v.changelog ?? "—"}
                </td>
                {installable ? (
                  <td className="px-5 py-4">
                    <CopyButton text={installCmd(v)} />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConfigsTab({ view }: { view: ModelDetailView }) {
  return (
    <div>
      <h2 className={H2}>Configurations</h2>
      <p className={LEDE}>
        Reviewed starting points. Copy one as YAML, or as the request that
        creates it on a running service.
      </p>
      <div className="flex flex-col gap-5">
        {view.configurations.map((config) => (
          <div
            key={config.key}
            className="d2-card overflow-hidden"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <div className="font-mono text-[16px] font-medium text-ink">
                  {config.key}
                </div>
                <p className="mt-1 max-w-[80ch] text-[15px] leading-[1.55] text-ink-2">
                  {config.description}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <CopyButton text={config.yaml} label="Copy YAML" size="md" />
                <CopyButton text={config.curl} label="Copy request" size="md" />
              </div>
            </div>
            <CodePanel code={config.yaml} />
          </div>
        ))}
      </div>
    </div>
  );
}

function BenchmarksTab({ view }: { view: ModelDetailView }) {
  const b = view.benchmarks;
  if (!b) {
    return (
      <p className="text-[15px] text-ink-2">
        No benchmark results for this model yet.
      </p>
    );
  }
  const p = b.provenance;
  return (
    <div>
      <h2 className={H2}>Benchmarks</h2>
      <p className={LEDE}>
        CRPS — lower is better. Measured on {p.dataset} at {p.versionTag},{" "}
        {p.evaluatedAt}
        {p.runUrl ? (
          <>
            {" · "}
            <a
              href={p.runUrl}
              target="_blank"
              rel="noreferrer"
              className="text-brand hover:underline"
            >
              raw output
            </a>
          </>
        ) : null}
        .
      </p>
      {b.headline.length > 0 ? (
        <dl className="d2-card mb-5 grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-4">
          {b.headline.map((h) => (
            <div key={h.label}>
              <dd className="font-brand text-[22px] font-medium text-ink">
                {h.value}
              </dd>
              <dt className="mt-1 text-[14px] text-ink-2">{h.label}</dt>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-2">
        {b.crpsByHorizon.length > 0 ? (
          <div className="d2-card p-5">
            <div className="mb-3 font-medium text-ink">
              CRPS by forecast horizon
            </div>
            <CrpsByHorizonChart
              crps={b.crpsByHorizon}
              baseline={b.baseline}
              shortName={view.shortName}
            />
          </div>
        ) : null}
        {b.comparison.length > 0 ? (
          <div className="d2-card p-5">
            <div className="mb-3 font-medium text-ink">
              Model comparison · {p.dataset}
            </div>
            <ComparisonChart items={b.comparison} />
          </div>
        ) : null}
      </div>
      <Link
        href="/benchmarks"
        className="mt-5 inline-block font-medium text-brand hover:underline"
      >
        All benchmarks →
      </Link>
    </div>
  );
}

function InstallTab({ view }: { view: ModelDetailView }) {
  const cmd = `chap-admin install ${view.id}`;
  return (
    <div className="max-w-[820px]">
      <h2 className={H2}>Install</h2>
      {view.kind === "template" ? (
        <Notice>
          A template is not installed into Chap. Copy its repository to start
          a model of your own.
        </Notice>
      ) : (
        <>
          <p className={LEDE}>
            Run this in the chap-core directory of a running Chap. It starts
            the model, registers it and adds its verified configurations, so it
            shows up in the DHIS2 Modeling App.
          </p>
          {view.requiresGeo ? (
            <Notice>
              Needs geometry: your dataset must include org-unit boundaries.
            </Notice>
          ) : null}
          <div className="d2-card flex items-center gap-2 py-2 pl-4 pr-2">
            <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[14px] text-ink">
              {cmd}
            </code>
            <CopyButton text={cmd} />
          </div>
          <p className="mt-8 text-[15px] text-ink-2">
            Installs the verified stable version, {view.stable.tag} (
            <Code>{view.stable.image}</Code>).{" "}
            <Code>chap-admin install-all</Code> installs every listed model.{" "}
            <a
              href={view.installUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-brand hover:underline"
            >
              Full guide →
            </a>
          </p>
        </>
      )}
    </div>
  );
}

export function ModelDetailTabs({
  view,
  header,
}: {
  view: ModelDetailView;
  header: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("overview");

  // Arrow keys move between tabs, as the WAI-ARIA tabs pattern expects.
  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    const i = TABS.findIndex((t) => t.id === tab);
    const next = TABS[(i + step + TABS.length) % TABS.length].id;
    setTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  };

  return (
    <>
      <div className="bg-surface">
        <div className="mx-auto max-w-[1240px] px-5 pt-8 sm:px-8">
          {header}
          <div
            role="tablist"
            aria-label="Model sections"
            onKeyDown={onKeyDown}
            className="d2-tabs no-scrollbar -mx-5 overflow-x-auto sm:mx-0"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                aria-controls="tab-panel"
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => setTab(t.id)}
                className="d2-tab"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <main
        id="tab-panel"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        className="mx-auto max-w-[1240px] px-5 pb-20 pt-10 sm:px-8"
      >
        {tab === "overview" ? (
          <OverviewTab
            view={view}
            goInstall={() => setTab("install")}
          />
        ) : null}
        {tab === "install" ? (
          <InstallTab view={view} />
        ) : null}
        {tab === "versions" ? <VersionsTab view={view} /> : null}
        {tab === "configs" ? <ConfigsTab view={view} /> : null}
        {tab === "benchmarks" ? <BenchmarksTab view={view} /> : null}
      </main>
    </>
  );
}
