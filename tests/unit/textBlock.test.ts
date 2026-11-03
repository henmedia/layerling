import { beforeAll, describe, expect, it } from "vitest";
import { textLetterSize, textLetterSizePatch } from "@/lib/nameTag";
import { offersTextBlock, textBlockFor, textBlockLines } from "@/lib/textBlock";
import { loadTextFonts } from "@/lib/textFonts";
import { shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

// #1207: several lines of text, one text each, aligned under one another.
function text(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  const base = {
    id: "t", name: "Text", kind: "text", color: "#ff0000", x: 10, z: 20, elevation: 0, rotation: 0,
    width: 60, depth: 12, height: 3, size: 60, text: "LAYERLING", font: "Sans", ...overrides,
  } as WorkplaneShape;
  return { ...base, ...textLetterSizePatch(base, 10) } as WorkplaneShape;
}

const edges = (shape: WorkplaneShape) => ({
  left: shape.x - shapeWidth(shape) / 2,
  right: shape.x + shapeWidth(shape) / 2,
  top: shape.z - shapeDepth(shape) / 2,
  bottom: shape.z + shapeDepth(shape) / 2,
});

describe("the text block (#1207)", () => {
  beforeAll(async () => {
    await loadTextFonts();
  });

  it("takes one line per line of the field, without blank ones, cut to a text's length", () => {
    expect(textBlockLines("LAYERLING\n\n  IS THE \r\nBest")).toEqual(["LAYERLING", "IS THE", "Best"]);
    expect(textBlockLines("x".repeat(40))[0]).toHaveLength(24);
    expect(textBlockLines(Array.from({ length: 30 }, (_, i) => `L${i}`).join("\n"))).toHaveLength(20);
  });

  it("is offered for a plain straight text only", () => {
    expect(offersTextBlock(text())).toBe(true);
    expect(offersTextBlock(text({ textCurved: true }))).toBe(false);
    expect(offersTextBlock(text({ textVertical: true }))).toBe(false);
    expect(offersTextBlock(text({ locked: true }))).toBe(false);
    expect(offersTextBlock({ ...text(), kind: "box" } as WorkplaneShape)).toBe(false);
  });

  it("stacks the lines from the text's top down, the gap between them, the first keeping the text's id", () => {
    const source = text();
    const block = textBlockFor(source, ["LAYERLING", "IS THE", "Best"], { align: "center", gap: 3, step: 100 });
    expect(block.map((line) => line.text)).toEqual(["LAYERLING", "IS THE", "Best"]);
    expect(block[0].id).toBe("t");
    expect(new Set(block.map((line) => line.id)).size).toBe(3);
    expect(edges(block[0]).top).toBeCloseTo(edges(source).top, 3);
    expect(edges(block[1]).top - edges(block[0]).bottom).toBeCloseTo(3, 3);
    expect(edges(block[2]).top - edges(block[1]).bottom).toBeCloseTo(3, 3);
    block.forEach((line) => {
      expect(line.x).toBeCloseTo(source.x, 3);
      expect(textLetterSize(line)).toBeCloseTo(10, 2);
    });
  });

  it("lines them up on the left or the right edge of the text", () => {
    const source = text();
    const left = textBlockFor(source, ["LAYERLING", "IS THE"], { align: "left", gap: 2, step: 100 });
    const right = textBlockFor(source, ["LAYERLING", "IS THE"], { align: "right", gap: 2, step: 100 });
    left.forEach((line) => expect(edges(line).left).toBeCloseTo(edges(source).left, 3));
    right.forEach((line) => expect(edges(line).right).toBeCloseTo(edges(source).right, 3));
  });

  it("makes each line smaller by the step", () => {
    const block = textBlockFor(text(), ["A", "B", "C"], { align: "center", gap: 2, step: 80 });
    expect(block.map((line) => Number(textLetterSize(line).toFixed(2)))).toEqual([10, 8, 6.4]);
  });

  it("turns the block with a turned text", () => {
    const source = text({ rotation: 90 });
    const block = textBlockFor(source, ["LAYERLING", "IS THE"], { align: "center", gap: 2, step: 100 });
    // Turned a quarter about the vertical axis, the text's own +z (down the block) points along +x.
    expect(block[1].z).toBeCloseTo(source.z, 3);
    expect(block[1].x).toBeGreaterThan(block[0].x + 5);
    expect(block.every((line) => line.rotation === 90)).toBe(true);
  });
});
