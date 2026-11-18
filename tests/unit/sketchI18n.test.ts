// @vitest-environment jsdom
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MESSAGES_EN } from "@/lib/messages.en";
import { translate, setLanguage } from "@/lib/i18n";
import { ERROR_RULES, localizedError } from "@/lib/userErrors";
import { sketchConstraintLabel } from "@/lib/sketchConstraintLabels";

const placeholders = (text: string) => [...text.matchAll(/\{([^}]+)\}/g)].map(match => match[1]).sort();

describe("sketch feature translations", () => {
  it("provides every sketch UI message and preserves placeholders in every locale", () => {
    const directory = resolve("apps/web/src/lib");
    const entries = Object.entries(MESSAGES_EN).filter(([key]) => key.startsWith("sketchUi."));
    expect(entries.length).toBeGreaterThan(150);
    for (const file of readdirSync(directory).filter(file => /^messages\..+\.ts$/.test(file))) {
      const source = readFileSync(resolve(directory, file), "utf8");
      const messages = new Map([...source.matchAll(/^\s*"([^"]+)":\s*("(?:[^"\\]|\\.)*")/gm)]
        .map(match => [match[1], JSON.parse(match[2]) as string]));
      for (const [key, english] of entries) {
        const translated = messages.get(key);
        expect(translated, `${file}: ${key}`).toBeTruthy();
        expect(placeholders(translated!), `${file}: ${key}`).toEqual(placeholders(english));
      }
    }
  });

  it("registers every static offset and linked-mirror diagnostic for localization", () => {
    for (const file of ["sketchOffsets.ts", "sketchCurveOffsets.ts", "sketchLinkedMirror.ts"]) {
      const source = readFileSync(resolve("apps/web/src/lib", file), "utf8");
      const diagnostics = [...source.matchAll(/(?:Error|fail)\("([^"\n]+)"|message: "([^"\n]+)"/g)]
        .map(match => match[1] ?? match[2]);
      expect(diagnostics.length, file).toBeGreaterThan(0);
      for (const message of diagnostics) {
        expect(ERROR_RULES.some(rule => rule.pattern.test(message)), `${file}: ${message}`).toBe(true);
      }
    }
  });

  it("substitutes translated geometry metadata", () => {
    const text = translate("de", "sketchUi.pointReference", { point: "P1", a: "P2", b: "P3" });
    expect(text).toContain("P1");
    expect(text).toContain("P2 → P3");
    expect(text).not.toContain("Constrained point");
    expect(text).not.toMatch(/\{.*\}/);
  });

  it("localizes constraint labels and known solver diagnostics", async () => {
    try {
      await setLanguage("de");
      expect(sketchConstraintLabel("point-on-line")).not.toContain("point-on-line");
      expect(localizedError("Enter a finite number.")).not.toContain("Enter a finite number.");
      expect(localizedError("This inset collapses the circle. Reduce the inset distance.")).not.toContain("This inset collapses");
    } finally {
      await setLanguage("en");
    }
  });
});
