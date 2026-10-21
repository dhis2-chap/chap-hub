import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The package index also loads its prop-types, which touch the browser-only
// `Element` global at import time — so take the two plain modules directly.
const constants = path.join(
  __dirname,
  "..",
  "..",
  "node_modules",
  "@dhis2",
  "ui-constants",
  "build",
  "es",
);
const { colors }: { colors: Record<string, string> } = await import(
  path.join(constants, "colors.js")
);
const { elevations }: { elevations: Record<string, string> } = await import(
  path.join(constants, "elevations.js")
);

/** The site's tokens are copies of the DHIS2 design system's; keep them so. */
const css = readFileSync(
  path.join(__dirname, "..", "app", "globals.css"),
  "utf8",
);

const normalize = (value: string) =>
  value.replace(/\s+/g, "").replace(/,\s*/g, ",").toLowerCase();

describe("globals.css against @dhis2/ui-constants", () => {
  // `--mp-x: #hex; /* grey200 */` — the comment names the constant copied.
  const annotated = [
    ...css.matchAll(/--mp-[\w-]+:\s*(#[0-9a-fA-F]{6});\s*\/\*\s*(\w+)/g),
  ].map(([, hex, name]) => ({ hex, name }));

  it("annotates the palette tokens", () => {
    expect(annotated.length).toBeGreaterThan(20);
  });

  it.each(annotated)("$name is $hex", ({ hex, name }) => {
    expect(colors).toHaveProperty(name);
    expect(hex.toLowerCase()).toBe(
      colors[name].toLowerCase(),
    );
  });

  it("uses the DHIS2 elevations for shadows", () => {
    const flat = normalize(css);
    for (const key of ["e100", "e200", "e300"]) {
      expect(flat).toContain(normalize(elevations[key]));
    }
  });
});
