import { describe, expect, it } from "vitest";
import { DEFAULT_TEXT_LAYERS, nameTagOffsets, namesFromList, normalizeTextLayers, textLayerShapes, textLayersOf } from "@/lib/textLayers";
import type { WorkplaneShape } from "@/types/layerling";

// #215: one text as a stack of layers, and a tag per name.
const text = (overrides: Partial<WorkplaneShape> = {}): WorkplaneShape => ({
  id: "t", name: "Text", kind: "text", color: "#cf101b", x: 10, z: -4, elevation: 2, rotation: 15,
  width: 60, depth: 20, height: 5, size: 60, text: "Arany", font: "Script", ...overrides,
});

describe("text layers (#215)", () => {
  it("stacks the layers bottom up on the text's elevation, each wider by its grow, letters shared", () => {
    const layers = textLayerShapes(text(), DEFAULT_TEXT_LAYERS);
    expect(layers.map((layer) => layer.name)).toEqual(["Text 1", "Text 2", "Text 3"]);
    // Top to bottom: the plate at the text's elevation, the rim on it, the letters on top.
    expect(layers.map((layer) => layer.elevation)).toEqual([2 + 2 + 1.2, 2 + 2, 2]);
    expect(layers.map((layer) => layer.height)).toEqual([1.2, 1.2, 2]);
    expect(layers.map((layer) => layer.width)).toEqual([60, 63, 66]);
    expect(layers.map((layer) => layer.depth)).toEqual([20, 23, 26]);
    expect(layers.map((layer) => layer.color)).toEqual(["#ffffff", "#d41721", "#2b2b2b"]);
    expect(layers[0].textStroke).toBeUndefined();
    expect(layers[1].textStroke).toEqual({ width: 1.5, align: "grow", join: "round", cap: "flat" });
    expect(layers[2].textSilhouette).toBe(true);
    expect(layers[1].textSilhouette).toBeUndefined();
    // Every layer keeps the words, the font, the place and the turn.
    layers.forEach((layer) => expect(layer).toMatchObject({ text: "Arany", font: "Script", x: 10, z: -4, rotation: 15, kind: "text" }));
  });

  it("reads a stack back as the letters and the layers, whatever order the parts come in", () => {
    const built = textLayerShapes(text(), DEFAULT_TEXT_LAYERS);
    const read = textLayersOf([built[2], built[0], built[1]]);
    expect(read).not.toBeNull();
    expect(read!.layers).toEqual(DEFAULT_TEXT_LAYERS.map((layer) => ({ ...layer })));
    expect(read!.source).toMatchObject({ text: "Arany", name: "Text", width: 60, depth: 20, elevation: 2 });
    expect(read!.source.textStroke).toBeUndefined();
    expect(read!.source.textSilhouette).toBeUndefined();
    expect(read!.ids).toEqual(["t-layer-1", "t-layer-2", "t-layer-3"]);
    // Built again from what was read, the stack is the same.
    expect(textLayerShapes(read!.source, read!.layers, read!.ids)).toEqual(built);
  });

  it("a text with a fill of its own is one layer of itself; mixed parts are no stack", () => {
    const wide = text({ width: 64, depth: 24, textStroke: { width: 2, align: "grow", join: "miter", cap: "flat" } });
    const read = textLayersOf([wide]);
    expect(read!.layers).toEqual([{ grow: 2, height: 5, color: "#cf101b" }]);
    expect(read!.source).toMatchObject({ width: 60, depth: 20 });
    expect(textLayersOf([text(), text({ text: "Other" })])).toBeNull();
    expect(textLayersOf([text(), { ...text(), kind: "box" }])).toBeNull();
    expect(textLayersOf([])).toBeNull();
  });

  it("keeps layer settings within range and drops bad lists", () => {
    expect(normalizeTextLayers([{ grow: -1, height: 0, color: "red" }, { grow: 99, height: 3, color: "#ABCDEF", silhouette: true }]))
      .toEqual([{ grow: 0, height: 0.2, color: "#ffffff" }, { grow: 20, height: 3, color: "#abcdef", silhouette: true }]);
    expect(normalizeTextLayers([])).toBeNull();
    expect(normalizeTextLayers("three")).toBeNull();
    expect(normalizeTextLayers(new Array(7).fill({}))).toBeNull();
  });

  it("a name per line, and the tags in rows and columns", () => {
    expect(namesFromList(" Anna \n\nBen\r\nCarla\n")).toEqual(["Anna", "Ben", "Carla"]);
    expect(namesFromList("a\nb\nc", 2)).toEqual(["a", "b"]);
    expect(nameTagOffsets(3, 60, 20, 5)).toEqual([{ x: 0, z: 0 }, { x: 0, z: 25 }, { x: 0, z: 50 }]);
    expect(nameTagOffsets(4, 60, 20, 5, 2)).toEqual([{ x: 0, z: 0 }, { x: 0, z: 25 }, { x: 65, z: 0 }, { x: 65, z: 25 }]);
  });
});
