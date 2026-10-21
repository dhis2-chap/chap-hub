/** Who made a model, from the model YAML's `attribution`. */

/** Compact credit for the catalog card. */
export function AuthorLine({
  author,
  organization,
}: {
  author: string;
  organization: string | null;
}) {
  return (
    <div className="min-w-0 leading-tight">
      <div className="text-[14px] font-medium text-ink">
        <span className="font-normal text-ink-2">By </span>
        {author}
      </div>
      {organization ? (
        <div className="truncate text-[13px] text-ink-2">{organization}</div>
      ) : null}
    </div>
  );
}

/** The model page's author panel. */
export function AuthorPanel({
  author,
  organization,
  originalSource,
}: {
  author: string;
  organization: string | null;
  originalSource: string | null;
}) {
  return (
    <section
      aria-label="Author"
      className="d2-card p-5"
    >
      <div className="text-[13px] font-medium uppercase tracking-[0.08em] text-ink-3">
        Author
      </div>
      <div className="mt-2 font-brand text-[22px] font-medium leading-tight text-ink">
        {author}
      </div>
      {organization ? (
        <div className="mt-1 text-[15px] text-ink-2">{organization}</div>
      ) : null}
      {originalSource ? (
        <a
          href={originalSource}
          target="_blank"
          rel="noreferrer"
          className="mt-4 block border-t border-line pt-3 text-[15px] font-medium text-brand hover:underline"
        >
          Original model ↗
        </a>
      ) : null}
    </section>
  );
}
