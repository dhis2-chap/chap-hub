/**
 * Standalone registry validation: `pnpm validate`.
 * Loads registry.yaml, every model file and every benchmarks/ file through
 * the same zod schemas the site build uses, so a PR gets a red check without
 * building the site. Stays offline — open-PR ingestion is build-only and
 * fail-soft, so it is not a gate.
 */
import { loadBenchmarks } from "../src/lib/benchmarks";
import {
  displayPin,
  imageRef,
  loadRegistry,
  stableVersion,
  verifiedCount,
} from "../src/lib/registry";

try {
  const registry = loadRegistry();
  const starters = registry.models.filter((m) => m.kind === "starter").length;
  console.log(
    `registry.yaml OK — ${registry.models.length - starters} models, ${starters} starters\n`,
  );
  for (const model of registry.models) {
    const stable = stableVersion(model);
    console.log(`  ✓ ${model.id}`);
    console.log(
      `      ${model.kind.padEnd(8)} assessed=${model.assessed_status.padEnd(6)} ${verifiedCount(model)} verified pin${verifiedCount(model) === 1 ? "" : "s"}`,
    );
    console.log(`      commit  ${displayPin(model, stable)}`);
    console.log(`      image   ${imageRef(model, stable)}`);
  }

  const benchmarks = loadBenchmarks(registry, registry.root);
  console.log(
    `\nbenchmarks/ OK — ${benchmarks.length} result file${benchmarks.length === 1 ? "" : "s"}`,
  );
  for (const bench of benchmarks) {
    console.log(
      `  ✓ ${bench.model}@${bench.version} · ${bench.dataset} (crps ${bench.metrics.crps})`,
    );
  }

  console.log("\nAll files valid.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
