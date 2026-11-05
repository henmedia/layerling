import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EDGE_MODIFIER_SETTINGS_KEY,
  readEdgeModifierSettings,
  rememberEdgeModifierSetting,
  sanitizeEdgeModifierSettings,
  startingEdgeModifierAmount,
} from "@/lib/edgeModifierMemory";

/** The edge tool keeps its settings per tool in this browser (#1342). */
describe("edge tool settings kept between starts", () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = new Map();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
      },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("gives nothing before anything was chosen, so the tool's own defaults stand", () => {
    expect(readEdgeModifierSettings("chamfer")).toEqual({});
  });

  it("keeps each changed setting, next to the ones kept before, for the tool it was changed in", () => {
    rememberEdgeModifierSetting("chamfer", { amount: 2 });
    rememberEdgeModifierSetting("chamfer", { quality: "fine" });
    rememberEdgeModifierSetting("chamfer", { sharpAngle: 10, onlyVisibleEdges: true, chamferAngle: 30 });
    rememberEdgeModifierSetting("fillet", { amount: 3, concave: true });
    expect(readEdgeModifierSettings("chamfer")).toEqual({ amount: 2, quality: "fine", sharpAngle: 10, onlyVisibleEdges: true, chamferAngle: 30 });
    expect(readEdgeModifierSettings("fillet")).toEqual({ amount: 3, concave: true });
    expect(readEdgeModifierSettings("chamfillet")).toEqual({});
  });

  it("keeps nothing for the other tools that use the edge machinery", () => {
    rememberEdgeModifierSetting("shell", { amount: 2 });
    expect(store.size).toBe(0);
    expect(readEdgeModifierSettings("shell")).toEqual({});
  });

  it("drops what the tool cannot take instead of guessing", () => {
    expect(sanitizeEdgeModifierSettings({ amount: -1, sharpAngle: 0, chamferAngle: 90, quality: "ultra", onlyVisibleEdges: "yes", concave: true }, "chamfer")).toEqual({});
    // A chamfer-fillet's angle runs from 15° to 75°, a chamfer's from 5° to 85°; only a fillet scoops.
    expect(sanitizeEdgeModifierSettings({ chamferAngle: 10, concave: true }, "chamfillet")).toEqual({});
    expect(sanitizeEdgeModifierSettings({ chamferAngle: 10 }, "chamfer")).toEqual({ chamferAngle: 10 });
    expect(sanitizeEdgeModifierSettings("broken", "fillet")).toEqual({});
  });

  it("survives broken or blocked storage", () => {
    store.set(EDGE_MODIFIER_SETTINGS_KEY, "{not json");
    expect(readEdgeModifierSettings("fillet")).toEqual({});
    vi.stubGlobal("window", { localStorage: { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } } });
    expect(() => rememberEdgeModifierSetting("fillet", { amount: 1 })).not.toThrow();
    expect(readEdgeModifierSettings("fillet")).toEqual({});
  });

  it("starts with the kept size where the body can take it, else with the size worked out from the body", () => {
    expect(startingEdgeModifierAmount({ amount: 3 }, 1, 19.8)).toBe(3);
    expect(startingEdgeModifierAmount({ amount: 25 }, 1, 19.8)).toBe(1);
    expect(startingEdgeModifierAmount({}, 0.5, 19.8)).toBe(0.5);
  });
});
