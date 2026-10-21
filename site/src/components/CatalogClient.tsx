"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { IconSearch24 } from "@dhis2/ui-icons";
import type { InReviewPinView, ModelCardView } from "@/lib/views";
import { KindBadge } from "./badges";
import { AuthorLine } from "./author";


function matches(m: ModelCardView, q: string): boolean {
  if (!q) return true;
  const hay =
    `${m.name} ${m.summary} ${m.framework} ${m.repo} ${m.covLabel} ${m.author} ${m.organization ?? ""}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

/** A listing with its description, requirements and author. */
function ModelCard({ m }: { m: ModelCardView }) {
  return (
    <Link
      href={`/models/${m.id}`}
      className="d2-card flex min-w-0 flex-col gap-4 p-5 transition-shadow hover:shadow-card"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-brand text-[20px] font-medium leading-tight text-ink">
          {m.name}
        </h3>
      </div>
      <p className="line-clamp-3 text-[15px] leading-[1.55] text-ink-2">
        {m.summary}
      </p>
      <div className="mt-auto flex flex-wrap gap-1.5">
        <KindBadge kind={m.kind} />
        {[m.framework, m.periodType, m.covLabel].filter((t) => t !== "—").map((tag) => (
          <span key={tag} className="d2-tag">
            {tag}
          </span>
        ))}
      </div>
      <div className="border-t border-line pt-4">
        <AuthorLine
          author={m.author}
          organization={m.organization}
        />
      </div>
    </Link>
  );
}

function CardGrid({ models }: { models: ModelCardView[] }) {
  return (
    <div className="mt-6 grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr))]">
      {models.map((m) => (
        <ModelCard key={m.id} m={m} />
      ))}
    </div>
  );
}

/** Open pull requests: new models and new versions awaiting approval. */
function InReview({ pins }: { pins: InReviewPinView[] }) {
  return (
    <section className="mt-14">
      <h2 className="mb-4 font-brand text-[20px] font-medium text-ink">
        In review
      </h2>
      <ul className="divide-y divide-line overflow-hidden d2-card">
        {pins.map((pin) => (
          <li key={`${pin.prNumber}-${pin.modelId}-${pin.label}`}>
            <a
              href={pin.prUrl}
              target="_blank"
              rel="noreferrer"
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 hover:bg-surface-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-ink">
                  {pin.catalogLabel}
                  {pin.isNewModel ? (
                    <span className="d2-tag d2-tag-neutral ml-2">
                      New model
                    </span>
                  ) : null}
                </span>
                <span className="block text-[14px] text-ink-2">
                  Submitted by @{pin.author} · #{pin.prNumber}
                </span>
              </span>
              <span className="d2-tag bg-as-yellow-tint text-as-yellow">
                {pin.approvals} approvals
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CatalogClient({
  models,
  inReview,
}: {
  models: ModelCardView[];
  inReview: InReviewPinView[];
}) {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [q, setQ] = useState(urlQuery);
  // Adopt a new header-search query mid-session (state adjusted during render).
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);
  if (prevUrlQuery !== urlQuery) {
    setPrevUrlQuery(urlQuery);
    setQ(urlQuery);
  }

  const hits = models.filter((m) => matches(m, q));
  const forecasting = hits.filter((m) => m.kind === "model");
  const starters = hits.filter((m) => m.kind === "starter");

  return (
    <main className="mx-auto max-w-[1240px] px-5 pb-20 pt-12 sm:px-8 sm:pt-16">
      <h1 className="font-brand text-[clamp(32px,4vw,46px)] font-medium leading-[1.1] text-ink">
        Forecasting models for Chap
      </h1>
      <p className="mt-5 max-w-[46ch] text-[clamp(20px,2.2vw,24px)] leading-[1.45] text-ink">
        Early warning and forecasting models you can install into your Chap
        instance with a single command.
      </p>
      <p className="mt-4 max-w-[64ch] text-[17px] leading-[1.6] text-ink-2">
        Anyone can contribute a model: just{" "}
        <Link href="/contribute" className="font-medium text-brand hover:underline">
          open a pull request
        </Link>
        . Every version listed here is{" "}
        <Link href="/verification" className="font-medium text-brand hover:underline">
          verified
        </Link>{" "}
        to run in Chap.
      </p>

      <div className="relative mt-8 max-w-[560px]">
        <span className="pointer-events-none absolute left-2.5 top-1/2 flex -translate-y-1/2 text-ink-3">
          <IconSearch24 />
        </span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, method or author"
          aria-label="Search models"
          className="d2-input pl-10 text-[16px]"
        />
      </div>

      {hits.length === 0 ? (
        <div className="d2-card mt-6 p-12 text-center">
          <p className="text-[16px] font-medium text-ink">No matches</p>
          <button
            type="button"
            onClick={() => setQ("")}
            className="d2-button mt-4"
          >
            Clear search
          </button>
        </div>
      ) : forecasting.length > 0 ? (
        <CardGrid models={forecasting} />
      ) : (
        <p className="mt-6 text-[15px] text-ink-2">No models match.</p>
      )}

      {starters.length > 0 ? (
        <section className="mt-14">
          <h2 className="font-brand text-[20px] font-medium text-ink">
            Starters
          </h2>
          <p className="mt-1 text-[15px] text-ink-2">
            Starting points for writing a model — not for making forecasts.
          </p>
          <CardGrid models={starters} />
        </section>
      ) : null}

      {inReview.length > 0 ? <InReview pins={inReview} /> : null}

      <section className="d2-card mt-14 flex flex-wrap items-center justify-between gap-5 p-6 sm:p-8">
        <div>
          <h2 className="font-brand text-[20px] font-medium text-ink">
            Built a model?
          </h2>
          <p className="mt-1 text-[15px] text-ink-2">
            List it with one pull request. Your name goes on it.
          </p>
        </div>
        <Link
          href="/contribute"
          className="d2-button d2-button-primary d2-button-large"
        >
          Submit a model
        </Link>
      </section>
    </main>
  );
}
