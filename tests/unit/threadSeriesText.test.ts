import { describe, expect, it } from "vitest";
import { MESSAGES_EN } from "@/lib/messages.en";
import { MESSAGES_DE } from "@/lib/messages.de";
import { THREAD_SERIES_TEXT, THREAD_SIZE_GROUPS, THREAD_SIZES, threadSeriesFor } from "@/lib/threadGeometry";

/*
 * Every series in the thread size menu has a short group header and a hint
 * line in both languages. The header stays short so the native dropdown,
 * which is as wide as its longest line, stays narrow: no header is longer
 * than "UNC – US inch, coarse" by more than a few characters.
 */
describe("thread size series texts", () => {
  const catalogues = { en: MESSAGES_EN, de: MESSAGES_DE } as const;

  it.each(Object.entries(catalogues))("gives every series a header and a hint in %s", (_language, messages) => {
    for (const group of THREAD_SIZE_GROUPS) {
      const text = THREAD_SERIES_TEXT[group.series];
      expect(messages[text.group].trim().length).toBeGreaterThan(0);
      expect(messages[text.hint].trim().length).toBeGreaterThan(0);
      expect(messages[text.group].length).toBeLessThanOrEqual(28);
      // One line: a single sentence, no line break.
      expect(messages[text.hint]).not.toMatch(/\n/);
    }
  });

  it("names the series in its header, and every size belongs to the series it is listed under", () => {
    const leads = { metric: "M", UNC: "UNC", UNF: "UNF", G: "G", bottle: "PCO" } as const;
    for (const group of THREAD_SIZE_GROUPS) {
      for (const messages of Object.values(catalogues)) expect(messages[THREAD_SERIES_TEXT[group.series].group].startsWith(`${leads[group.series]} – `)).toBe(true);
      for (const size of group.sizes) expect(threadSeriesFor(size)).toBe(group.series);
    }
    expect(THREAD_SIZES.every((size) => threadSeriesFor(size) !== null)).toBe(true);
  });

  it("keeps the everyday examples in the hints", () => {
    expect(MESSAGES_EN["thread.hint.UNC"]).toContain('1/4"-20 (ISO 1222)');
    expect(MESSAGES_DE["thread.hint.UNC"]).toContain('1/4"-20 (ISO 1222)');
    for (const hint of [MESSAGES_EN["thread.hint.G"], MESSAGES_DE["thread.hint.G"]]) {
      expect(hint).toContain("G1/2");
      expect(hint).toContain("G3/4");
    }
  });
});
