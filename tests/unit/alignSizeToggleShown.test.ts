import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(__dirname, "../../apps/web/src/app/globals.css"), "utf8");

describe("Align: the Size mode switch stands in for Alt+click (#1770)", () => {
  it("is shown with a mouse too, not only where a finger or pen is the pointer", () => {
    // Many Linux desktops take Alt+click to move the window, so the click never reaches the dots.
    const rules = [...css.matchAll(/\.align-size-toggle \{([^}]*)\}/g)];
    expect(rules.length, "rule for the switch").toBeGreaterThan(0);
    rules.forEach((rule) => expect(rule[1]).not.toMatch(/display:\s*none/));
  });
});
