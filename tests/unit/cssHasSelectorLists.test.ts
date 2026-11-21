import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Issue #1761: Firefox before 121 (the last one on Windows 7 is 115 ESR) does not know :has(), and a selector it does not know
// throws away the whole list it stands in. The custom shapes' tiles showed their buttons by a rule that listed `:hover` next to
// `:has(.danger)`, so on Firefox 115 the buttons never appeared. A :has() selector stands in a rule of its own.

const SOURCE = join(__dirname, "../../apps/web/src");

function cssFiles(folder: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    const path = join(folder, name);
    if (statSync(path).isDirectory()) return cssFiles(path);
    return name.endsWith(".css") ? [path] : [];
  });
}

/** The parts of a selector list, split at the commas outside brackets: `:has(a, b)` stays one part. */
function selectorParts(selector: string) {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const character of selector) {
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  parts.push(current.trim());
  return parts;
}

/** Every selector list in a stylesheet whose parts mix :has() with selectors without it. */
function mixedHasSelectorLists(css: string) {
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const found: string[] = [];
  for (const match of plain.matchAll(/([^{}]+)\{/g)) {
    const selector = match[1].trim();
    if (selector.startsWith("@")) continue;
    const parts = selectorParts(selector);
    if (parts.length > 1 && parts.some((part) => part.includes(":has(")) && parts.some((part) => !part.includes(":has("))) {
      found.push(selector.replace(/\s+/g, " "));
    }
  }
  return found;
}

describe("a :has() selector stands in a rule of its own (Issue #1761)", () => {
  it("finds a list that mixes :has() with other selectors, and leaves a comma inside :has() alone", () => {
    expect(mixedHasSelectorLists(".a:hover .b,\n.b:has(.danger) { opacity: 1; }")).toHaveLength(1);
    expect(mixedHasSelectorLists(".a:has(.b, .c) .d::after { opacity: 1; }")).toEqual([]);
    expect(mixedHasSelectorLists("@media (hover: none) { .a, .b { opacity: 1; } }")).toEqual([]);
  });

  it("has no such list in the editor's stylesheets", () => {
    const found = cssFiles(SOURCE).flatMap((file) => mixedHasSelectorLists(readFileSync(file, "utf8")).map((selector) => `${file}: ${selector}`));
    expect(found).toEqual([]);
  });
});
