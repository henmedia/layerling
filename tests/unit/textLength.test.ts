import { beforeAll, describe, expect, it } from "vitest";
import { textLetterSize, textLetterSizePatch } from "@/lib/nameTag";
import { MAX_EDGED_TEXT_LENGTH, textAllowsEdge, textHasEdge } from "@/lib/textEdge";
import { loadTextFonts } from "@/lib/textFonts";
import { limitedText, MAX_TEXT_LENGTH } from "@/lib/textLength";
import { normalizeShapeCustomizations } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

// A text took 24 characters from the first version on; asked to lift it in the Facebook group (07.11.2026).
describe("text length", () => {
  beforeAll(async () => {
    await loadTextFonts();
  });

  it("takes 250 characters and no more, and an empty text stays a space", () => {
    expect(MAX_TEXT_LENGTH).toBe(250);
    expect(limitedText("x".repeat(100))).toHaveLength(100);
    expect(limitedText("x".repeat(400))).toHaveLength(250);
    expect(limitedText("")).toBe(" ");
  });

  it("keeps a long default text for new texts", () => {
    const long = "Long default text ".repeat(5).trim();
    expect(normalizeShapeCustomizations({ text: { text: long } }).text?.text).toBe(long);
    expect(normalizeShapeCustomizations({ text: { text: "y".repeat(300) } }).text?.text).toHaveLength(250);
  });

  it("lets a long text grow past 260 mm while its letters keep their size", () => {
    const shape = {
      id: "t", name: "Text", kind: "text", color: "#ff0000", x: 0, z: 0, elevation: 0, rotation: 0,
      width: 60, depth: 12, height: 3, size: 60, text: "LAYERLING", font: "Sans",
    } as WorkplaneShape;
    const letterSize = textLetterSize(shape);
    const longText = limitedText("THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG ".repeat(6));
    const patch = textLetterSizePatch({ ...shape, text: longText } as WorkplaneShape, letterSize);
    expect(patch.width).toBeGreaterThan(260);
    expect(textLetterSize({ ...shape, text: longText, ...patch } as WorkplaneShape)).toBeCloseTo(letterSize, 3);
  });

  it("gives a letter edge only to a text of up to 40 characters, and keeps the setting on a longer one", () => {
    const edged = { kind: "text", textEdge: { kind: "round", size: 0.4 } } as const;
    expect(MAX_EDGED_TEXT_LENGTH).toBe(40);
    expect(textHasEdge({ ...edged, text: "x".repeat(40) })).toBe(true);
    expect(textHasEdge({ ...edged, text: "x".repeat(41) })).toBe(false);
    // A letter outside the basic plane counts once, not as two halves.
    expect(textAllowsEdge({ text: "😀".repeat(40) })).toBe(true);
    expect(textHasEdge({ kind: "text", text: "x".repeat(41) })).toBe(false);
  });
});
