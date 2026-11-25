import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(__dirname, "../../apps/web/src/app/globals.css"), "utf8");

describe("Slider names wrap instead of being cut off (Discussion #1975)", () => {
  it("lets a long name such as Patties' slope run onto a second line", () => {
    // In the Patties panel "Slope through the plate (°)" ended in "…" next to the value field, and the panel cannot be widened.
    const rules = [...css.matchAll(/(?:^|\n)([^{}\n]*\.range-property-name[^{}\n]*)\{([^}]*)\}/g)];
    expect(rules.length, "rules for the slider name").toBeGreaterThan(0);
    rules.forEach((rule) => {
      expect(rule[2], rule[1]).not.toMatch(/white-space:\s*nowrap/);
      expect(rule[2], rule[1]).not.toMatch(/text-overflow:\s*ellipsis/);
    });
  });
});
