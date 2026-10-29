/**
 * `pnpm fetch-benchmarks`: read the benchmark results from the benchmarking
 * server's chap API into benchmarks/results.json, which the build renders.
 * Run by the deploy workflow before the build; needs CHAP_API_URL and
 * CHAP_API_TOKEN, from the environment or, locally, from the gitignored
 * site/.env.local (the environment wins). The token can write to that chap instance, so it lives only
 * in the deploy workflow's secrets and never reaches the site.
 *
 * Any failure — missing token, an unreachable server, a suite that no longer
 * resolves, a record the registry rejects — exits non-zero, so a deploy never
 * ships a stale or empty leaderboard in place of the real one.
 */
import fs from "node:fs";
import path from "node:path";
import { loadBenchmarks, RESULTS_FILE } from "../src/lib/benchmarks";
import { fetchBenchmarks } from "../src/lib/chap-api";
import { loadRegistry } from "../src/lib/registry";

const envFile = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const url = process.env.CHAP_API_URL;
const token = process.env.CHAP_API_TOKEN;

async function main() {
  if (!url || !token) throw new Error("CHAP_API_URL and CHAP_API_TOKEN must be set");
  const registry = loadRegistry();
  const fetched = await fetchBenchmarks(registry, url.replace(/\/$/, ""), token);
  const file = path.join(registry.root, RESULTS_FILE);
  fs.writeFileSync(file, `${JSON.stringify(fetched, null, 2)}\n`);
  loadBenchmarks(registry, registry.root);
  const n = fetched.results.length;
  console.log(
    `wrote ${n} record${n === 1 ? "" : "s"} and ${fetched.metrics.length} metric definitions to ${RESULTS_FILE}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
