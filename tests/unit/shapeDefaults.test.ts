import { describe, expect, it } from "vitest";
import { makeShapeFromAsset } from "@/lib/shapeCatalog";
import { shapeDefaultsAsset, shapeDefaultsFromShape, withShapeDefaults } from "@/lib/shapeDefaults";
import { normalizeWorkspaceSettings, readWorkspaceDefault, saveShapeDefaultsForNewDesigns } from "@/lib/workplaneSettings";

function shapeOf(kind: Parameters<typeof shapeDefaultsAsset>[0], patch: Record<string, unknown> = {}) {
  const asset = shapeDefaultsAsset(kind);
  if (!asset) throw new Error(`no asset for ${kind}`);
  return { ...makeShapeFromAsset(asset), ...patch };
}

describe("saving a shape's values as its defaults", () => {
  it("has nothing to save for a shape that is as the app starts it", () => {
    expect(shapeDefaultsFromShape(shapeOf("box"))).toBeNull();
    expect(shapeDefaultsFromShape(shapeOf("cone"))).toBeNull();
  });

  it("keeps size and own settings that differ from the app's start", () => {
    const cone = shapeDefaultsFromShape(shapeOf("cone", { height: 40, topRadius: 3 }));
    expect(cone).toMatchObject({ height: 40, topRadius: 3 });
    // What was not changed is not stored, so the kind still follows the app for it.
    expect(cone).not.toHaveProperty("baseRadius");
    const star = shapeDefaultsFromShape(shapeOf("star", { starPoints: 8 }));
    expect(star).toMatchObject({ starPoints: 8 });
  });

  it("leaves a hinge's opening angle out, so new hinges start flat (#1336)", () => {
    const hinge = shapeDefaultsFromShape(shapeOf("hinge", { hingeAngle: -90, hingeLeafStyle: "raised" }));
    expect(hinge).toMatchObject({ hingeLeafStyle: "raised" });
    expect(hinge).not.toHaveProperty("hingeAngle");
  });

  it("keeps the size limit that was set in the settings", () => {
    const entry = shapeDefaultsFromShape(shapeOf("box", { height: 33 }), { box: { maxDimension: 500 } });
    expect(entry).toMatchObject({ height: 33, maxDimension: 500 });
  });

  it("has no defaults for a shape that is no toolbar shape", () => {
    expect(shapeDefaultsAsset("sketch")).toBeNull();
    expect(shapeDefaultsAsset("mesh")).toBeNull();
  });

  it("sets and removes the entry of one kind without touching the others", () => {
    const map = { cone: { height: 40 }, box: { height: 12 } };
    expect(withShapeDefaults(map, "cone", { height: 41 })).toEqual({ cone: { height: 41 }, box: { height: 12 } });
    expect(withShapeDefaults(map, "cone", null)).toEqual({ box: { height: 12 } });
    expect(map.cone).toEqual({ height: 40 });
  });

  it("starts a new shape with the saved defaults and survives the settings round trip", () => {
    const entry = shapeDefaultsFromShape(shapeOf("cone", { height: 40, topRadius: 3 }));
    const settings = normalizeWorkspaceSettings({ shapeCustomizations: { cone: entry } });
    const asset = shapeDefaultsAsset("cone");
    if (!asset) throw new Error("no cone asset");
    const fresh = makeShapeFromAsset(asset, undefined, settings.shapeCustomizations.cone);
    expect(fresh.height).toBe(40);
    expect(fresh.topRadius).toBe(3);
  });
});

describe("the colour is part of a shape's defaults (#483)", () => {
  it("has nothing to save while the colour is the app's own", () => {
    expect(shapeDefaultsFromShape(shapeOf("cylinder"))).toBeNull();
    // The same colour written another way is still the app's colour.
    expect(shapeDefaultsFromShape(shapeOf("cylinder", { color: "#D97813" }))).toBeNull();
  });

  it("keeps a colour that differs, on its own or with a size", () => {
    expect(shapeDefaultsFromShape(shapeOf("cylinder", { color: "#2f9e44" }))).toEqual({ color: "#2f9e44" });
    expect(shapeDefaultsFromShape(shapeOf("box", { color: "#1c7ed6", height: 33 }))).toMatchObject({ color: "#1c7ed6", height: 33 });
  });

  it("starts a new shape of the kind in the saved colour, and the other kinds in their own", () => {
    const entry = shapeDefaultsFromShape(shapeOf("cylinder", { color: "#2f9e44" }));
    const settings = normalizeWorkspaceSettings({ shapeCustomizations: { cylinder: entry } });
    const cylinder = shapeDefaultsAsset("cylinder");
    const box = shapeDefaultsAsset("box");
    if (!cylinder || !box) throw new Error("no asset");
    expect(makeShapeFromAsset(cylinder, undefined, settings.shapeCustomizations.cylinder).color).toBe("#2f9e44");
    expect(makeShapeFromAsset(box, undefined, settings.shapeCustomizations.box).color).toBe(box.color);
  });

  it("reads a colour from the settings only if it is one, and writes it as #rrggbb", () => {
    const settings = normalizeWorkspaceSettings({ shapeCustomizations: { box: { color: "red" }, cylinder: { color: "#0f0" }, cone: { color: "#AA5500" } } });
    expect(settings.shapeCustomizations.box).toBeUndefined();
    expect(settings.shapeCustomizations.cylinder).toEqual({ color: "#00ff00" });
    expect(settings.shapeCustomizations.cone).toEqual({ color: "#aa5500" });
  });

  it("keeps the colour when other defaults of the kind are changed, and drops it with the entry", () => {
    const map = { cylinder: { color: "#2f9e44", height: 40 } };
    const settings = normalizeWorkspaceSettings({ shapeCustomizations: { cylinder: { ...map.cylinder, height: 50 } } });
    expect(settings.shapeCustomizations.cylinder).toEqual({ color: "#2f9e44", height: 50 });
    expect(withShapeDefaults(map, "cylinder", null)).toEqual({});
  });
});

describe("Save as default reaches new designs (#483)", () => {
  const memoryStorage = () => {
    const data = new Map<string, string>();
    return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => void data.set(key, value), removeItem: (key: string) => void data.delete(key), clear: () => data.clear(), key: () => null, length: 0 } as unknown as Storage;
  };

  it("writes the kind's values into the default of the browser, with no other default there before", () => {
    const storage = memoryStorage();
    expect(saveShapeDefaultsForNewDesigns("box", { color: "#2e9d3f" }, storage)).toBe(true);
    expect(readWorkspaceDefault(storage)?.workspace.shapeCustomizations.box?.color).toBe("#2e9d3f");
  });

  it("changes only that kind and leaves the rest of the saved default alone", () => {
    const storage = memoryStorage();
    saveShapeDefaultsForNewDesigns("box", { color: "#2e9d3f" }, storage);
    saveShapeDefaultsForNewDesigns("cylinder", { color: "#aa2200" }, storage);
    const saved = readWorkspaceDefault(storage)!.workspace;
    expect(saved.shapeCustomizations.box?.color).toBe("#2e9d3f");
    expect(saved.shapeCustomizations.cylinder?.color).toBe("#aa2200");
  });

  it("takes the kind back with no entry", () => {
    const storage = memoryStorage();
    saveShapeDefaultsForNewDesigns("box", { color: "#2e9d3f" }, storage);
    saveShapeDefaultsForNewDesigns("box", null, storage);
    expect(readWorkspaceDefault(storage)?.workspace.shapeCustomizations.box).toBeUndefined();
  });
});
