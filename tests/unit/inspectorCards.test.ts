import { describe, expect, it } from "vitest";
import { INSPECTOR_CARDS_KEY, readInspectorCards, surfaceTextureCardStaysOpen, writeInspectorCard } from "@/lib/inspectorCards";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return { getItem: (key: string) => data[key] ?? null, setItem: (key: string, value: string) => { data[key] = value; }, data };
}

describe("the folding cards of the shape settings keep their state (#632)", () => {
  it("reads nothing as no card changed", () => {
    expect(readInspectorCards(memoryStorage())).toEqual({});
    expect(readInspectorCards(null)).toEqual({});
  });

  it("keeps each card on its own, and what was saved before", () => {
    const storage = memoryStorage();
    writeInspectorCard(storage, "rotation", true);
    writeInspectorCard(storage, "properties", false);
    writeInspectorCard(storage, "rotation", false);
    expect(readInspectorCards(storage)).toEqual({ rotation: false, properties: false });
  });

  it("ignores a saved value that is damaged or of another kind", () => {
    expect(readInspectorCards(memoryStorage({ [INSPECTOR_CARDS_KEY]: "{broken" }))).toEqual({});
    expect(readInspectorCards(memoryStorage({ [INSPECTOR_CARDS_KEY]: "[1,2]" }))).toEqual({});
    expect(readInspectorCards(memoryStorage({ [INSPECTOR_CARDS_KEY]: '{"taper":true,"twist":"yes"}' }))).toEqual({ taper: true });
  });

  it("does not fail when the browser refuses to store", () => {
    const refusing = { getItem: () => null, setItem: () => { throw new Error("full"); } };
    expect(() => writeInspectorCard(refusing, "taper", true)).not.toThrow();
  });
});

// The surface texture card is the texture tool: kept, it stayed on for every body chosen later and after a reload.
describe("the surface texture card", () => {
  const present = (ids: string[]) => (id: string) => ids.includes(id);

  it("stays open while the same body is chosen", () => {
    expect(surfaceTextureCardStaysOpen("a", "a", present(["a", "b"]))).toBe(true);
  });

  it("closes when another body is chosen, several or none", () => {
    expect(surfaceTextureCardStaysOpen("a", "b", present(["a", "b"]))).toBe(false);
    expect(surfaceTextureCardStaysOpen("a", null, present(["a", "b"]))).toBe(false);
    expect(surfaceTextureCardStaysOpen(null, "a", present(["a"]))).toBe(false);
  });

  it("stays open when an edit replaced the body under a new id, as a texture does", () => {
    expect(surfaceTextureCardStaysOpen("a", "a-textured", present(["a-textured"]))).toBe(true);
  });
});
