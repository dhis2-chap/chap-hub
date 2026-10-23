"use client";

import {
  IconArrowLeft16,
  IconArrowRight16,
  IconChevronDown16,
  IconCross16,
} from "@dhis2/ui-icons";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { BenchmarkRowView, BenchmarkSuiteView } from "@/lib/benchmarks";
import {
  DEFAULT_METRIC_COLUMNS,
  metricRankKey,
  type MetricColumn,
} from "@/lib/metrics";

/**
 * The benchmark suites, one table after another, each row opening its
 * run record in a centred modal so the full metric list stays out of the
 * page flow. The shown metrics, sorting and the open row are the only
 * client state; everything rendered comes from the build-time suite views.
 */

/** Remembers the visitor's metric picks; storage may be unavailable. */
const STORAGE_KEY = "chap-hub:benchmark-metrics";

function readPicks(): string[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) &&
      parsed.every((id) => typeof id === "string")
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function writePicks(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Not remembered; the picks still apply for this visit.
  }
}

function valueOf(row: BenchmarkRowView, id: string): string {
  return row.metrics.find((m) => m.id === id)?.value ?? "—";
}

/** The @dhis2-ui/checkbox regular icon. */
function CheckboxIcon() {
  return (
    <span className="d2-checkbox-icon" aria-hidden>
      <svg viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
        <rect className="background" x="0" y="0" width="18" height="18" rx="3" />
        <path
          className="border"
          d="M15,0 C16.6568542,0 18,1.34314575 18,3 L18,15 C18,16.6568542 16.6568542,18 15,18 L3,18 C1.34314575,18 0,16.6568542 0,15 L0,3 C0,1.34314575 1.34314575,0 3,0 L15,0 Z M15,1 L3,1 C1.9456382,1 1.08183488,1.81587779 1.00548574,2.85073766 L1,3 L1,15 C1,16.0543618 1.81587779,16.9181651 2.85073766,16.9945143 L3,17 L15,17 C16.0543618,17 16.9181651,16.1841222 16.9945143,15.1492623 L17,15 L17,3 C17,1.9456382 16.1841222,1.08183488 15.1492623,1.00548574 L15,1 Z"
        />
        <path
          className="checkmark"
          d="M4.74451387,8.02852516 C4.39595738,8.11985643 4.12375034,8.39235188 4.03251575,8.74127768 C3.94128115,9.09020348 4.04521722,9.46125864 4.30437605,9.71182782 L7.29823844,12.7078028 C7.68753993,13.0973991 8.31859767,13.0973991 8.70789916,12.7078028 L13.695624,6.71585285 C13.9547828,6.46528367 14.0587189,6.09422851 13.9674843,5.74530271 C13.8762497,5.39637691 13.6040426,5.12388146 13.2554861,5.0325502 C12.9069296,4.94121893 12.5362672,5.04526513 12.2859632,5.30469855 L8.0030688,10.5910713 L5.71403676,8.30067351 C5.46373279,8.0412401 5.09307036,7.9371939 4.74451387,8.02852516 Z"
        />
      </svg>
    </span>
  );
}

type SortDirection = "asc" | "desc";

/**
 * The @dhis2-ui/table Sorter: `asc` ranks best first, `desc` worst first;
 * columns not ranked by show `default`.
 */
function Sorter({
  direction,
  label,
  onClick,
}: {
  direction: SortDirection | "default";
  label: string;
  onClick: () => void;
}) {
  const title =
    direction === "asc"
      ? `Ranked by ${label}, best first — click for worst first`
      : direction === "desc"
        ? `Ranked by ${label}, worst first — click for best first`
        : `Rank by ${label}`;
  return (
    <button
      type="button"
      className="d2-table-sorter"
      data-direction={direction}
      title={title}
      aria-label={title}
      onClick={onClick}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
        <polygon className="top" points="4 9 12 9 8 14" />
        <polygon className="bottom" points="4 7 12 7 8 2" />
      </svg>
    </button>
  );
}

function MetricPicker({
  columns,
  selected,
  onChange,
}: {
  columns: MetricColumn[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Keep chap-core's metric order whatever order the boxes were ticked in.
  const toggle = (id: string) =>
    onChange(
      columns
        .map((c) => c.id)
        .filter((c) => (c === id ? !selected.includes(c) : selected.includes(c))),
    );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="d2-button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        Metrics ({selected.length} of {columns.length})
        <IconChevronDown16 />
      </button>
      {open ? (
        <div className="d2-flyout absolute right-0 z-20 mt-1 max-h-[480px] w-[min(360px,calc(100vw-32px))]">
          <div className="flex items-center justify-between gap-3 pr-3">
            <h6 className="d2-menu-header">Shown metrics</h6>
            <span className="flex gap-2">
              <button
                type="button"
                className="d2-button d2-button-small d2-button-secondary"
                onClick={() => onChange(columns.map((c) => c.id))}
              >
                All
              </button>
              <button
                type="button"
                className="d2-button d2-button-small d2-button-secondary"
                onClick={() =>
                  onChange(
                    DEFAULT_METRIC_COLUMNS.filter((id) =>
                      columns.some((c) => c.id === id),
                    ),
                  )
                }
              >
                Default
              </button>
            </span>
          </div>
          <ul className="m-0 list-none p-0">
            {columns.map((c) => (
              <li key={c.id}>
                <label className="d2-menu-item d2-checkbox items-start py-2.5">
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={() => toggle(c.id)}
                  />
                  <CheckboxIcon />
                  <span className="ml-1 min-w-0">
                    <span className="block">{c.label}</span>
                    {c.description ? (
                      <span className="mt-0.5 block text-[13px] leading-[1.4] text-ink-2">
                        {c.description}
                      </span>
                    ) : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Figure({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="min-w-0 bg-surface px-4 py-3">
      <div className="truncate text-[13px] text-ink-2">{label}</div>
      <div
        className={`mt-1 truncate font-mono ${
          strong ? "text-[18px] font-medium text-ink" : "text-[16px] text-ink-2"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function RunRecord({
  row,
  shown,
}: {
  row: BenchmarkRowView;
  shown: string[];
}) {
  if (!row.measured) {
    return (
      <p className="max-w-[60ch] text-[14px] leading-[1.6] text-ink-2">
        The benchmarking server has no result for this pin on this suite yet. It
        benchmarks every listed model whose period type and covariates the
        dataset has, and the row fills in once it does.
      </p>
    );
  }
  // The metrics picked for the table head the record; the rest follow.
  const headline = row.metrics.filter((m) => shown.includes(m.id));
  const rest = row.metrics.filter((m) => !shown.includes(m.id));
  return (
    <div className="flex flex-col gap-6">
      {headline.length > 0 ? (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line sm:grid-cols-4">
          {headline.map((m, i) => (
            <Figure key={m.id} label={m.label} value={m.value} strong={i === 0} />
          ))}
        </div>
      ) : null}

      {rest.length > 0 ? (
        <section>
          <h3 className="mb-2 text-[14px] font-medium text-ink">
            {headline.length > 0 ? "Other recorded metrics" : "All recorded metrics"}
          </h3>
          <dl className="grid gap-x-8 sm:grid-cols-2">
            {rest.map((m) => (
              <div
                key={m.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-t border-line py-2.5"
              >
                <dt className="text-[14px] text-ink">{m.label}</dt>
                <dd className="text-right font-mono text-[13px] text-ink">
                  {m.value}
                </dd>
                {m.description ? (
                  <dd className="col-span-2 mt-0.5 text-[13px] leading-[1.45] text-ink-2">
                    {m.description}
                  </dd>
                ) : null}
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </div>
  );
}

function RunRecordModal({
  dialogRef,
  suite,
  rows,
  index,
  shown,
  onStep,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  suite: BenchmarkSuiteView;
  rows: BenchmarkRowView[];
  index: number;
  shown: string[];
  onStep: (index: number) => void;
}) {
  const row = rows[index];
  if (!row) return <dialog ref={dialogRef} />;
  const close = () => dialogRef.current?.close();
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="run-record-title"
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" && index > 0) onStep(index - 1);
        if (e.key === "ArrowRight" && index < rows.length - 1)
          onStep(index + 1);
      }}
      className="d2-modal d2-modal-large"
    >
      <button
        type="button"
        className="d2-modal-close"
        aria-label="Close"
        onClick={close}
      >
        <IconCross16 />
      </button>

      <header className="order-1 mb-3 min-w-0 pr-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 id="run-record-title" className="d2-modal-title order-none m-0">
            {row.name}
          </h1>
          <span
            className={`d2-tag ${
              row.measured ? "d2-tag-positive" : "d2-tag-neutral"
            }`}
          >
            {row.measured ? "Successful run" : "Not run"}
          </span>
        </div>
        <div className="mt-1 text-[13px] text-ink-2">
          {suite.heading} · {row.measured ? `rank ${index + 1}` : "no run"}
        </div>
        <div className="mt-0.5 truncate font-mono text-[12px] text-ink-3">
          {row.pinLine} · {row.versionTag}
        </div>
      </header>

      <div className="d2-modal-content">
        <RunRecord row={row} shown={shown} />
      </div>

      <div className="d2-modal-actions flex-wrap justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="d2-button d2-button-secondary"
            disabled={index === 0}
            onClick={() => onStep(index - 1)}
            aria-label="Previous row"
          >
            <IconArrowLeft16 />
          </button>
          <span className="text-[14px] text-ink-2">
            {index + 1} of {rows.length}
          </span>
          <button
            type="button"
            className="d2-button d2-button-secondary"
            disabled={index === rows.length - 1}
            onClick={() => onStep(index + 1)}
            aria-label="Next row"
          >
            <IconArrowRight16 />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/models/${row.modelId}`} className="d2-button">
            Model page
          </Link>
          <button
            type="button"
            className="d2-button d2-button-primary"
            data-autofocus
            onClick={close}
          >
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}

function SuiteTable({
  suite,
  shown,
}: {
  suite: BenchmarkSuiteView;
  shown: string[];
}) {
  // Ranked by the first shown metric, best first, until a sorter is used;
  // using the ranked column's sorter again flips the direction.
  const [sortPick, setSortPick] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [openIndex, setOpenIndex] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const columns = suite.columns.filter((c) => shown.includes(c.id));
  // A sort column the visitor has since hidden falls back to the first shown.
  const sortColumn =
    columns.find((c) => c.id === sortPick) ?? columns[0] ?? null;
  const rankOf = (row: BenchmarkRowView) => {
    const v = sortColumn ? row.values[sortColumn.id] : undefined;
    return v === undefined ? undefined : metricRankKey(sortColumn!, v);
  };
  // Rows without a value for the ranked metric stay last either way.
  const compare = (a: BenchmarkRowView, b: BenchmarkRowView) => {
    const ka = rankOf(a);
    const kb = rankOf(b);
    if (ka === undefined || kb === undefined)
      return (ka === undefined ? 1 : 0) - (kb === undefined ? 1 : 0);
    return sortDirection === "asc" ? ka - kb : kb - ka;
  };
  const sortBy = (id: string) => {
    if (sortColumn?.id === id)
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else setSortDirection("asc");
    setSortPick(id);
  };
  const measured = suite.rows.filter((r) => r.measured);
  const rows = (
    sortColumn ? [...measured].sort(compare) : measured
  ).concat(suite.rows.filter((r) => !r.measured));

  const openRow = (i: number) => {
    setOpenIndex(i);
    dialogRef.current?.showModal();
    // showModal focuses the first enabled control (the close cross);
    // start on Close instead.
    dialogRef.current
      ?.querySelector<HTMLElement>("[data-autofocus]")
      ?.focus();
  };

  return (
    <>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <dl className="flex flex-wrap gap-x-5 gap-y-1">
          {suite.runContext.map((c) => (
            <div key={c.k} className="flex items-baseline gap-1.5">
              <dt className="text-[13px] text-ink-2">{c.k}</dt>
              <dd className="font-mono text-[13px] text-ink">
                {c.href ? (
                  <a
                    href={c.href}
                    className="font-medium text-brand hover:underline"
                  >
                    {c.v}
                  </a>
                ) : (
                  c.v
                )}
              </dd>
            </div>
          ))}
        </dl>
        <span className="whitespace-nowrap text-[13px] text-ink-2">
          {suite.countLine}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table
          className="d2-table"
          style={{ minWidth: 400 + columns.length * 120 }}
        >
          <thead>
            <tr>
              <th className="w-12 text-left" scope="col">
                <span className="d2-table-head">#</span>
              </th>
              <th className="text-left" scope="col">
                <span className="d2-table-head">Model · pin</span>
              </th>
              <th className="text-left" scope="col">
                <span className="d2-table-head">Version</span>
              </th>
              {columns.map((c) => (
                <th
                  key={c.id}
                  scope="col"
                  title={c.description}
                  aria-sort={
                    sortColumn?.id === c.id
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  <span className="d2-table-head justify-end">
                    {c.label}
                    <Sorter
                      direction={
                        sortColumn?.id === c.id ? sortDirection : "default"
                      }
                      label={c.label}
                      onClick={() => sortBy(c.id)}
                    />
                  </span>
                </th>
              ))}
              <th className="text-left" scope="col">
                <span className="d2-table-head">Status</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.id}
                onClick={() => openRow(i)}
                className={`cursor-pointer ${row.measured ? "" : "opacity-[0.62]"}`}
              >
                <td className="font-mono text-ink-2">
                  {row.measured ? i + 1 : "—"}
                </td>
                <td className="max-w-0 min-w-[220px]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openRow(i);
                    }}
                    className="block max-w-full cursor-pointer truncate border-0 bg-transparent p-0 text-left text-[14px] font-medium text-ink hover:underline"
                  >
                    {row.name}
                  </button>
                  <span className="mt-0.5 block truncate font-mono text-[12px] text-ink-3">
                    {row.pinLine}
                  </span>
                </td>
                <td className="whitespace-nowrap font-mono text-[13px] text-ink-2">
                  {row.isStable ? (
                    <span
                      tabIndex={0}
                      className="d2-tooltip-anchor underline decoration-dotted underline-offset-2"
                    >
                      stable
                      <span role="tooltip" className="d2-tooltip">
                        Stable · {row.versionTag}
                      </span>
                    </span>
                  ) : (
                    row.versionTag
                  )}
                </td>
                {columns.map((c) => (
                  <td
                    key={c.id}
                    className={`text-right font-mono ${
                      sortColumn?.id === c.id ? "text-ink" : "text-ink-2"
                    }`}
                  >
                    {valueOf(row, c.id)}
                  </td>
                ))}
                <td>
                  <span
                    className={`d2-tag ${
                      row.measured ? "d2-tag-positive" : "d2-tag-neutral"
                    }`}
                  >
                    {row.measured ? "Successful" : "Not run"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {suite.pendingNote ? (
        <p className="mt-2 text-[13px] text-ink-2">{suite.pendingNote}</p>
      ) : null}

      <RunRecordModal
        dialogRef={dialogRef}
        suite={suite}
        rows={rows}
        index={openIndex}
        shown={shown}
        onStep={setOpenIndex}
      />
    </>
  );
}

export function BenchmarkSuites({ suites }: { suites: BenchmarkSuiteView[] }) {
  // Every metric any suite records, in chap-core's default order.
  const columns = [
    ...new Map(suites.flatMap((s) => s.columns).map((c) => [c.id, c])).values(),
  ];
  const defaults = DEFAULT_METRIC_COLUMNS.filter((id) =>
    columns.some((c) => c.id === id),
  );
  const [shown, setShown] = useState(defaults);

  // Restored after hydration so the prerendered table matches the first render.
  useEffect(() => {
    const picks = readPicks()?.filter((id) => columns.some((c) => c.id === id));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (picks) setShown(picks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (suites.length === 0) return null;
  return (
    <>
      <section className="mx-auto flex max-w-[1240px] flex-wrap items-start justify-between gap-x-6 gap-y-3 px-5 pt-9 sm:px-8">
        <p className="max-w-[80ch] text-[14px] leading-[1.5] text-ink-2">
          Use a column&apos;s sort arrows to rank by it (again to reverse), open a row for its run
          record, and pick the metrics to show. MAE, RMSE and CRPS are in cases and only comparable
          within one suite; normalised CRPS is the cross-dataset figure.
        </p>
        <MetricPicker
          columns={columns}
          selected={shown}
          onChange={(ids) => {
            setShown(ids);
            writePicks(ids);
          }}
        />
      </section>
      {suites.map((suite) => (
        <section
          key={suite.dataset}
          className="mx-auto max-w-[1240px] px-5 sm:px-8 pt-8"
        >
          <h2 className="mb-2 text-[20px] font-medium text-ink">
            {suite.heading}
          </h2>
          <SuiteTable suite={suite} shown={shown} />
        </section>
      ))}
    </>
  );
}
