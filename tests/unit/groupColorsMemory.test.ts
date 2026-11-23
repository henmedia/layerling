// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { readNewGroupsMulticolor, rememberGroupMulticolor, withRememberedMulticolor } from "@/lib/groupColorsMemory";
import type { WorkplaneShape } from "@/types/layerling";

const part = { id: "a", kind: "box", color: "#ff0000" } as unknown as WorkplaneShape;
const group = (patch: Partial<WorkplaneShape> = {}) => ({ ...part, id: "g", groupedShapes: [part, { ...part, id: "b" }], groupOperation: "group", multicolor: false, ...patch }) as WorkplaneShape;

afterEach(() => {
  vi.restoreAllMocks();
  rememberGroupMulticolor([group()], false);
});

describe("remembered Multicolor choice for new groups (#1989)", () => {
  it("leaves a new group alone until Multicolor was switched on", () => {
    const made = group();
    expect(withRememberedMulticolor(made)).toBe(made);
  });

  it("starts the next group in its parts' colours, until it is switched off again", () => {
    rememberGroupMulticolor([group()], true);
    expect(withRememberedMulticolor(group()).multicolor).toBe(true);
    rememberGroupMulticolor([group()], false);
    expect(withRememberedMulticolor(group()).multicolor).toBe(false);
  });

  it("does not go by bundles and does not touch bundles, hulls or holes", () => {
    rememberGroupMulticolor([group({ groupOperation: "bundle" })], true);
    expect(readNewGroupsMulticolor()).toBe(false);
    rememberGroupMulticolor([group()], true);
    for (const shape of [group({ groupOperation: "bundle" }), group({ groupOperation: "hull" }), group({ hole: true }), part]) {
      expect(withRememberedMulticolor(shape)).toBe(shape);
    }
  });

  it("holds for the visit where the browser cannot store it", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    rememberGroupMulticolor([group()], true);
    expect(readNewGroupsMulticolor()).toBe(true);
  });
});
