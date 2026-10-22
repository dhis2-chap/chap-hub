"use client";

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

const HEAD_TYPE =
  "overflow-hidden text-ellipsis whitespace-nowrap font-brand text-[10px] font-medium uppercase tracking-[0.09em]";
const HEAD = `${HEAD_TYPE} text-ink-3`;

function valueOf(row: BenchmarkRowView, id: string): string {
  return row.metrics.find((m) => m.id === id)?.value ?? "—";
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
        className="d2-button d2-button-small"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        Metrics ({selected.length} of {columns.length}) ▾
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-[min(340px,calc(100vw-32px))] rounded-[3px] border border-line bg-surface py-2 shadow-lift">
          <div className="flex items-center justify-between gap-3 px-4 pb-2">
            <span className="font-brand text-[10px] font-medium uppercase tracking-[0.09em] text-ink-3">
              Shown metrics
            </span>
            <span className="flex gap-3 text-[12px]">
              <button
                type="button"
                className="cursor-pointer border-0 bg-transparent p-0 text-brand hover:underline"
                onClick={() => onChange(columns.map((c) => c.id))}
              >
                All
              </button>
              <button
                type="button"
                className="cursor-pointer border-0 bg-transparent p-0 text-brand hover:underline"
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
          <ul className="max-h-[360px] overflow-y-auto">
            {columns.map((c) => (
              <li key={c.id}>
                <label className="flex cursor-pointer items-start gap-2.5 px-4 py-1.5 hover:bg-surface-2">
                  <input
                    type="checkbox"
                    className="mt-[3px] accent-brand"
                    checked={selected.includes(c.id)}
                    onChange={() => toggle(c.id)}
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] text-ink">{c.label}</span>
                    {c.description ? (
                      <span className="block text-[11.5px] leading-[1.4] text-ink-3">
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
      <div className="truncate font-brand text-[10px] font-medium uppercase tracking-[0.09em] text-ink-3">
        {label}
      </div>
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
          <h3 className="mb-2 font-brand text-[13px] font-medium text-ink">
            {headline.length > 0 ? "Other recorded metrics" : "All recorded metrics"}
          </h3>
          <dl className="grid gap-x-8 sm:grid-cols-2">
            {rest.map((m) => (
              <div
                key={m.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-t border-line py-2.5"
              >
                <dt className="text-[13px] text-ink">{m.label}</dt>
                <dd className="text-right font-mono text-[13px] text-ink">
                  {m.value}
                </dd>
                {m.description ? (
                  <dd className="col-span-2 mt-0.5 text-[11.5px] leading-[1.45] text-ink-3">
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
      className="m-auto max-h-[calc(100dvh-48px)] w-[calc(100vw-32px)] max-w-[800px] overflow-hidden rounded-[3px] border-0 bg-surface p-0 text-ink shadow-lift backdrop:bg-[rgba(33,41,52,0.6)] open:flex open:flex-col"
    >
      <header className="flex items-start justify-between gap-4 border-b border-line px-6 pb-4 pt-5">
        <div className="min-w-0">
          <div className="font-brand text-[10px] font-medium uppercase tracking-[0.1em] text-ink-3">
            {suite.heading} · {row.measured ? `rank ${index + 1}` : "no run"}
          </div>
          <h2
            id="run-record-title"
            className="mt-1.5 font-brand text-[20px] font-medium leading-tight text-ink"
          >
            {row.name}
          </h2>
          <div className="mt-1 truncate font-mono text-[12px] text-ink-3">
            {row.pinLine}
          </div>
        </div>
        <span
          className={`d2-tag shrink-0 ${
            row.measured ? "d2-tag-positive" : "d2-tag-neutral"
          }`}
        >
          {row.measured ? "Successful run" : "Not run"}
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <RunRecord row={row} shown={shown} />
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-2 px-6 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="d2-button d2-button-small"
            disabled={index === 0}
            onClick={() => onStep(index - 1)}
            aria-label="Previous row"
          >
            ←
          </button>
          <span className="font-mono text-[12px] text-ink-3">
            {index + 1} / {rows.length}
          </span>
          <button
            type="button"
            className="d2-button d2-button-small"
            disabled={index === rows.length - 1}
            onClick={() => onStep(index + 1)}
            aria-label="Next row"
          >
            →
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
            onClick={() => dialogRef.current?.close()}
          >
            Close
          </button>
        </div>
      </footer>
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
  // Ranked by the first shown metric until a column is clicked.
  const [sortPick, setSortPick] = useState<string | null>(null);
  const [openIndex, setOpenIndex] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const columns = suite.columns.filter((c) => shown.includes(c.id));
  // A sort column the visitor has since hidden falls back to the first shown.
  const sortColumn =
    columns.find((c) => c.id === sortPick) ?? columns[0] ?? null;
  const rankOf = (row: BenchmarkRowView) => {
    const v = sortColumn ? row.values[sortColumn.id] : undefined;
    return v === undefined ? Infinity : metricRankKey(sortColumn!, v);
  };
  const measured = suite.rows.filter((r) => r.measured);
  const rows = (
    sortColumn ? [...measured].sort((a, b) => rankOf(a) - rankOf(b)) : measured
  ).concat(suite.rows.filter((r) => !r.measured));
  const grid = {
    gridTemplateColumns: `36px minmax(200px,1.9fr) repeat(${columns.length}, minmax(96px,1fr)) 100px`,
  };

  return (
    <>
      <div className="mb-3.5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <dl className="flex flex-wrap gap-x-5 gap-y-1">
          {suite.runContext.map((c) => (
            <div key={c.k} className="flex items-baseline gap-1.5">
              <dt className="text-[12px] text-ink-3">{c.k}</dt>
              <dd className="font-mono text-[12px] text-ink">{c.v}</dd>
            </div>
          ))}
        </dl>
        <span className="whitespace-nowrap font-mono text-[11.5px] text-ink-3">
          {suite.countLine}
        </span>
      </div>

      <div className="overflow-x-auto rounded-[3px] border border-line bg-surface">
        <div style={{ minWidth: 400 + columns.length * 108 }}>
          <div
            style={grid}
            className="grid gap-3 border-b border-line bg-surface-2 px-5 py-[11px]"
          >
            <span className={HEAD}>#</span>
            <span className={HEAD}>Model · pin</span>
            {columns.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.description}
                onClick={() => setSortPick(c.id)}
                className={`${HEAD_TYPE} cursor-pointer border-0 bg-transparent p-0 text-right ${
                  sortColumn?.id === c.id ? "text-brand" : "text-ink-3"
                }`}
              >
                {c.label}
                {sortColumn?.id === c.id ? " ↑" : ""}
              </button>
            ))}
            <span className={HEAD}>Status</span>
          </div>
          {rows.map((row, i) => (
            <button
              key={row.id}
              type="button"
              onClick={() => {
                setOpenIndex(i);
                dialogRef.current?.showModal();
                // showModal focuses the first enabled control (an arrow);
                // start on Close instead.
                dialogRef.current
                  ?.querySelector<HTMLElement>("[data-autofocus]")
                  ?.focus();
              }}
              style={grid}
              className={`grid w-full cursor-pointer items-center gap-3 border-b border-l-[3px] border-b-line border-l-transparent py-[13px] pl-[17px] pr-5 text-left last:border-b-0 hover:border-l-brand hover:bg-surface-2 ${
                row.measured ? "" : "opacity-[0.62]"
              }`}
            >
              <span className="font-mono text-[13px] text-ink-3">
                {row.measured ? i + 1 : "—"}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-brand text-[13.5px] font-medium text-ink">
                  {row.name}
                </span>
                <span className="mt-[3px] block truncate font-mono text-[11px] text-ink-3">
                  {row.pinLine}
                </span>
              </span>
              {columns.map((c) => (
                <span
                  key={c.id}
                  className={`text-right font-mono ${
                    sortColumn?.id === c.id
                      ? "text-[13.5px] text-ink"
                      : "text-[13px] text-ink-2"
                  }`}
                >
                  {valueOf(row, c.id)}
                </span>
              ))}
              <span
                className={`justify-self-start whitespace-nowrap rounded-[3px] border px-1.5 py-0.5 font-mono text-[10.5px] ${
                  row.measured
                    ? "border-verified bg-verified-tint text-verified"
                    : "border-line-strong text-ink-3"
                }`}
              >
                {row.measured ? "Successful" : "Not run"}
              </span>
            </button>
          ))}
          {suite.pendingNote ? (
            <div className="border-t border-line bg-surface-2 px-5 py-3 text-[12.5px] text-ink-2">
              {suite.pendingNote}
            </div>
          ) : null}
        </div>
      </div>

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
        <p className="max-w-[80ch] text-[13px] text-ink-2">
          Click a column to sort, a row to open its run record, and pick the
          metrics to show. MAE, RMSE and CRPS are in cases and only comparable
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
          <h2 className="mb-2 font-brand text-[22px] font-medium text-ink">
            {suite.heading}
          </h2>
          <SuiteTable suite={suite} shown={shown} />
        </section>
      ))}
    </>
  );
}
