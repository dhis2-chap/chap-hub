/**
 * Gates the benchmarks page, the per-model Benchmarks tab and the header nav.
 * Off, they render a "coming soon" state. Results are fetched from the
 * benchmarking server at deploy time; a build without them (CI, local dev
 * without a token) shows no benchmark views even while this is on.
 *
 * Kept in its own module with no node imports so client components
 * (ModelDetailTabs) can read it without pulling in the fs-based loaders.
 */
export const BENCHMARKS_LIVE: boolean = true;
