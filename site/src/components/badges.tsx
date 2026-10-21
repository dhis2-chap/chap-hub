import type { ModelKind } from "@/lib/schema";

/*
 * Every badge here is a DHIS2 Tag (`d2-tag`, see globals.css). DHIS2 gives
 * Tag four tones — default, neutral, positive, negative — plus `bold` for
 * the few that must be seen in a dense view.
 */

/**
 * Starter marker. A starter is scaffolding to copy when writing a model,
 * not something to forecast with. Models get no badge at all: the catalog
 * tabs already carry that axis, and a word printed on five of seven
 * listings only crowds out the signals that vary.
 */
export function KindBadge({ kind }: { kind: ModelKind }) {
  if (kind === "model") return null;
  return <span className="d2-tag">Starter</span>;
}

/**
 * A version's status, shown only when it is not `verified`. Every listed
 * version is verified, so the tag marks the exceptions alone.
 */
export function StatusBadge({ status }: { status: string }) {
  if (status === "verified") return null;
  const tone =
    status === "unstable" || status === "in review"
      ? "bg-as-yellow-tint text-as-yellow"
      : "";
  return <span className={`d2-tag ${tone}`}>{status}</span>;
}

export function ChannelChip({ channel }: { channel: "stable" | "latest" }) {
  return channel === "stable" ? (
    <span className="d2-tag d2-tag-bold d2-tag-positive">stable</span>
  ) : (
    <span className="d2-tag d2-tag-neutral">latest</span>
  );
}

export function SoonPill({ label = "soon" }: { label?: string }) {
  return <span className="d2-tag">{label}</span>;
}
