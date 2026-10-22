# Chap Hub

A curated, verified catalog of forecasting models for [Chap](https://chap.dhis2.org),
the Climate & Health Analytics Platform. **This repository is the marketplace**:
the YAML files at the root are the source of truth, and the website is a
rendering of them.

Listed model versions are marked **Verified** after a compatibility review.
Verification checks the pinned revision and published image, chapkit service
registration, and training and prediction. **Verified does not assess or
guarantee model performance.** See [Model verification](https://chap-marketplace.dhis2.org/verification)
for the checks and their limitations.

The authors' own `assessed_status` remains in the registry as data; the site
does not show it.

## Layout

```
registry.yaml       Marketplace index: metadata, review policy, model list
models/*.yaml       One file per whitelisted model (see models/README.md)
benchmarks/         How benchmark results are fetched from Chap's benchmarking
                    server at deploy time (see benchmarks/README.md)
site/               The marketplace website (Next.js, TypeScript, pnpm)
```

## The registry

Every listed model is a [chapkit](https://dhis2-chap.github.io/chapkit/) 2
ML service. A version pin therefore has two halves of one revision: a
`repository URL + full commit hash` for reading the code, and a published
image at `<image>:sha-<short commit>` for running it. The schema cross-checks
the two, so they cannot drift; `:latest` moves and is never a pin.

Channels (`stable` / `latest`) are named pointers into the version list;
`channels.stable` must point at a version with `status: verified`. Files also
declare `kind` — a forecasting `model`, or a `starter` for authors to copy —
and the format is documented with an annotated example in
[models/README.md](models/README.md).

### Listed models

| Model | `assessed_status` | Framework | Horizon |
|---|---|---|---|
| [Rwanda Malaria BYM](models/chapkit_rwanda_malaria_bym_model.yaml) | gray | R · INLA | 1–24 |
| [Simple Multistep](models/chapkit_simple_multistep_model.yaml) | orange | Python · scikit-learn + skpro | 1–100 |
| [Auto-ARIMA](models/auto_arima_chapkit.yaml) | red | R · fable | 0–12 |
| [GHRmodel](models/chapkit_ghr_model.yaml) | red | R · INLA | 1–12 |

Starters — scaffolding, not forecasting models:

| Starter | `assessed_status` | Framework |
|---|---|---|
| [Minimalist Example (Python)](models/chapkit_minimalist_example_py.yaml) | red | Python · scikit-learn |
| [Minimalist Example (R)](models/chapkit_minimalist_example_r.yaml) | red | R · `lm()` |

## Repository rules

`main` is protected. Every change lands by pull request, needs green CI and
**three approvals**, and the merge is the listing. The count is
`review_policy.required_approvals` in `registry.yaml`, applied to the whole
repository rather than to registry paths alone: a single number is easier to
trust than a split, and nothing on the site is urgent enough to deserve a
lane of its own.

GitHub counts an approval only from someone with write access to this
repository, so the roster is repository membership: there is no `CODEOWNERS`
file to keep in sync and no workflow tallying approvals — the branch ruleset
is the whole mechanism. An author cannot approve their own pull request, and
approvals are dismissed when new commits are pushed.

Every commit must carry a verified signature.

The applied configuration is recorded at
[`.github/rulesets/main.json`](.github/rulesets/main.json) so it is
reviewable like everything else. GitHub is the live source of truth; that
file is the record of what was applied, replayable with
`gh api -X POST repos/dhis2-chap/model-marketplace/rulesets --input .github/rulesets/main.json`.

**Currently pending:** the maintainers are not yet collaborators on this
repository, so nobody but the repository owner can cast an approval that
counts, and three of them cannot be collected at all. Until they are added,
the owner holds the ruleset's only bypass, scoped to `pull_request` — so work
still goes through a pull request with CI, and only the approval wait can be
skipped, never the branch itself. Direct pushes to `main` are refused for
everyone. Remove the bypass once the maintainers have write access; that
single edit is what turns three approvals from an intention into a rule.

## The site

```bash
cd site
pnpm install
pnpm dev        # http://localhost:3000
```

The site is fully static: at build time it loads the YAML (registry and
models) and any fetched benchmark results through a zod schema (`site/src/lib/schema.ts`) and
prerenders every page, so an invalid file fails the build.

The build also ingests this repo's **open pull requests** (via the GitHub
API) so an in-review model or version pin appears on the site as an
experimental, non-verified pin with its running approval count (n/3) — on
the model's Versions tab and in an "In review" strip on the catalog. The
registry stays the only hard gate: if GitHub is unreachable the build logs a
warning and continues without in-review pins, and the rendered PR state is
only as fresh as the last build (labeled as such in the UI). `GITHUB_TOKEN`
is used when set; `MARKETPLACE_SKIP_PR_INGEST=1` skips ingestion entirely.

Other scripts, all run from `site/`:

```bash
pnpm validate   # check registry.yaml + models/*.yaml against the schema
pnpm test       # loader + schema unit tests (vitest)
pnpm typecheck  # tsc --noEmit
pnpm build      # production build (also implies validation)
```

**Deploying on Vercel**: set the project's Root Directory to `site`
(the loader reads `../registry.yaml`; files outside the root directory are
available at build time by default).

Every push to `main` deploys to production automatically
(`.github/workflows/deploy.yml`, which runs `.github/scripts/deploy-vercel.sh`
— `vercel pull` + `vercel build` + `vercel deploy --prebuilt`). Merging a pin
therefore publishes it; no hand-run deploy. The workflow also runs hourly and on manual
dispatch, to pick up new benchmark results (see
[benchmarks/README.md](benchmarks/README.md)). It needs four repository
secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` — the
`orgId` and `projectId` of the gitignored `.vercel/project.json` — and
`CHAP_API_TOKEN` for the benchmarking server. The same script takes `preview` instead of
`production` for a throwaway deploy from a laptop.

Each run is recorded under the repository's **Deployments** → `production`
environment, linking <https://chap-marketplace.dhis2.org> — the workflow names
that domain in `SITE_URL`, because the raw deployment hostname is behind
Vercel's SSO. So the tab is the history of what is actually live.

### Honest-data rules

- Everything rendered from the YAML is real: models, pins, channels,
  configurations, attribution — and benchmark results read from Chap's
  benchmarking server.
- There are no mock benchmark figures anywhere. A model with no real results
  shows no scores at all — not an illustrative sparkline, not a placeholder
  number. The benchmarks page and each model's Benchmarks tab render only
  the fetched results.
- `assessed_status` is transcribed from each service's own chapkit metadata.
  It is kept in the registry but not shown on the site.
- In-review pins come from real open PRs at build time and are labeled with
  the build timestamp; the site never invents proposals.
- Presentation-only metadata the schema doesn't carry yet (framework labels,
  covariate-mode grouping) lives in `site/src/lib/presentation.ts` and is a
  candidate for a future `schema_version` bump.

## Benchmarking

The benchmark views on the site (the benchmarks page and each model's
Benchmarks tab) are behind `BENCHMARKS_LIVE` in `site/src/lib/flags.ts`, and
show "coming soon" when a build has no results.

Results are read from Chap's benchmarking server at each deploy (and hourly)
and only backtests of listed pins are kept. Exactly
how the comparison will be run — datasets, backtest parameters, ranking — is
still being decided; the methodology will be documented in
[benchmarks/README.md](benchmarks/README.md) once it is settled. For the underlying evaluation command, see the Chap guide to
[evaluating models](https://chap.dhis2.org/chap-modeling-platform/external_models/running_models_in_chap/).
