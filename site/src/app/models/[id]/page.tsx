import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { KindBadge } from "@/components/badges";
import { AuthorPanel } from "@/components/author";
import { GitHubMark } from "@/components/icons";
import { ModelDetailTabs } from "@/components/ModelDetailTabs";
import { getBenchmarks, getMetricDefinitions } from "@/lib/benchmarks";
import { getProposals } from "@/lib/proposals";
import { getModel, getRegistry } from "@/lib/registry";
import { toDetailView } from "@/lib/views";

export function generateStaticParams() {
  return getRegistry().models.map((m) => ({ id: m.id }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const model = getModel((await params).id);
  if (!model) return {};
  return { title: model.display_name, description: model.summary };
}

export default async function ModelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const model = getModel(id);
  if (!model) notFound();
  const registry = getRegistry();
  const proposals = await getProposals(registry);
  const view = toDetailView(
    model,
    registry,
    getBenchmarks(),
    getMetricDefinitions(),
    proposals,
  );

  const header = (
    <>
      <Link
        href="/"
        className="text-[15px] font-medium text-brand hover:underline"
      >
        ← All models
      </Link>
      <div className="mt-5 grid items-start gap-8 pb-8 lg:grid-cols-[1fr_360px] lg:gap-12">
        <div className="min-w-0">
          <h1 className="font-brand text-[clamp(30px,5vw,44px)] font-medium leading-[1.05] text-ink">
            {view.name}
          </h1>
          {view.kind === "starter" ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <KindBadge kind={view.kind} />
            </div>
          ) : null}
          <p className="mt-5 max-w-[64ch] text-[17px] leading-[1.65] text-ink-2">
            {view.summary}
          </p>
          <a
            href={view.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="d2-button d2-button-secondary mt-5"
          >
            <GitHubMark className="h-4 w-4 shrink-0" />
            Source code
          </a>
        </div>
        <AuthorPanel
          author={view.attribution.author}
          organization={view.attribution.organization}
          originalSource={view.attribution.originalSource}
        />
      </div>
    </>
  );

  return <ModelDetailTabs view={view} header={header} />;
}
