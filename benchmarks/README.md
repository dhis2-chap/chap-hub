# Benchmark results

Benchmark results are not stored in this repository. They are read from
Chap's benchmarking server — a chap instance that backtests models on a cron
— each time the site is deployed, and baked into the build. The site never
talks to the server at runtime.

## How results reach the site

The deploy workflow (`.github/workflows/deploy.yml`) runs on every push to
`main`, every hour and on manual dispatch. Before the build it runs
`pnpm fetch-benchmarks` (`site/scripts/fetch-benchmarks.ts`), which:

1. looks up each suite in `SUITES` (`site/src/lib/chap-api.ts`) on
   `GET /v1/crud/backtest-specifications`, by its dataset and backtest
   parameters (`nPeriods`, `nSplits`, `stride`, `nRetrain`) — a specification
   has no stable name, so no specification id is stored here;
2. reads that specification's backtests from
   `GET /v1/crud/backtest-specifications/{id}`;
3. keeps the newest backtest per configured model that belongs to a listed
   pin — its model template is a listed model's `service_id`, its
   `sourceDigest` is one of that model's pinned commits and the configured
   model is named `<service_id>:<configuration key>` for one of its
   configurations — and drops every other backtest;
4. reads chap-core's metric definitions (name, description, unit, target,
   direction) from `GET /v1/visualization/metrics/{backtest_id}` — the same
   list whichever backtest is asked about — and keeps those the records use;
5. writes `{ metrics, results }` to the gitignored `benchmarks/results.json`,
   which the build validates against the registry and renders.

Any failure — no token, an unreachable server, a suite that does not resolve
to exactly one specification, a record the registry rejects — fails the
deploy, so stale or empty benchmarks are never shipped in place of the real
ones. Builds without the file (CI, local dev) render no results.

The server's API is gated by a single `CHAP_API_TOKEN` that can write as well
as read. It is a repository secret used only by the deploy workflow, which
never runs on pull requests. If it leaks, rotate it on the server and update
the secret.

To fetch locally, put both variables in the gitignored `site/.env.local`
(variables already set in the environment take precedence):

```bash
# site/.env.local
CHAP_API_URL=https://chap-benchmarking.dhis2.org
CHAP_API_TOKEN=...
```

then run `pnpm fetch-benchmarks` in `site/`.

## Record mapping

| Record field            | From the backtest                             |
| ----------------------- | --------------------------------------------- |
| `model`, `version`      | the listed pin `modelTemplate` resolves to    |
| `commit`                | `configuredModel.modelTemplate.sourceDigest`  |
| `run.configuration`     | `configuredModel.name` after `<service_id>:`  |
| `run.horizon`, `splits` | the specification's `nPeriods`, `nSplits`     |
| `evaluated_at`          | `created`                                     |
| `harness.tool`          | `chap <chapVersion>`                          |
| `metrics`               | `aggregateMetrics`, verbatim — every metric   |

Metrics keep chap's ids (`crps`, `crps_norm`, `mae`, `coverage_10_90`, ...)
and the site names and describes them with chap-core's own definitions; a
metric with no definition fails the build. A backtest whose metric
computation failed (no `crps`) is skipped.

## How models are run

The server's cron installs every listed pin with `chap-admin` and submits a
backtest for each model on each suite's dataset it can run on (see
[chap_benchmarking](https://github.com/dhis2-chap/chap_benchmarking)). The
datasets come from
[climate-health-data](https://github.com/dhis2/climate-health-data); a
backtest is chap-core's expanding-window evaluation, described in
[Evaluation Pipeline](https://chap.dhis2.org/chap-modeling-platform/contributor/evaluation_pipeline/).

How the suites are ranked is not settled yet. Until it is, the site shows the
server's results as recorded, provenance rather than a ranking.
