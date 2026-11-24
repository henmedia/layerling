import { describe, expect, it } from "vitest";
import { applyVaseChange, beginVaseDraft, endVaseDraft } from "@/lib/vaseDraft";
import { normalizeVaseSettings, vaseDraftBuild, vaseSettingsInFrame } from "@/lib/vaseSettings";
import { createVaseGeometry, fittedVaseMesh, vaseShapePatch } from "@/lib/vaseShape";

/*
 * A vase while a value of it is held in its panel (lib/vaseDraft.ts): its body is built coarse, as the Draft detail
 * builds it, and in the vase's own detail when the hold is over. The settings are never touched by that. (No worker
 * here: a body is built at once.)
 */

type Patch = ReturnType<typeof vaseShapePatch>;

const frame = (id: string) => ({ id, width: 90, depth: 90, height: 180 });
const triangles = (id: string | undefined, vase: unknown) => fittedVaseMesh({ id, width: 90, depth: 90, height: 180, vase }).triangleCount;

describe("a vase while a value is held", () => {
  it("is built in its own detail where nothing is held, and the change is handed on once", () => {
    const vase = normalizeVaseSettings({ effect: "waben", reliefDepth: 2 });
    const updates: Patch[] = [];
    applyVaseChange(frame("a"), vase, (patch) => updates.push(patch));
    expect(updates).toHaveLength(1);
    expect(updates[0].vase).toBe(vase);
    expect(vaseDraftBuild("a")).toBe(false);
  }, 60000);

  it("is built coarse once it is changed in a hold, and in full when the hold is over - one more update, then released", () => {
    const vase = normalizeVaseSettings({ effect: "waben", reliefDepth: 2.5 });
    const full = triangles(undefined, vase);
    const updates: Patch[] = [];
    beginVaseDraft("b");
    // Taken hold of, but nothing changed yet: still the full body.
    expect(vaseDraftBuild("b")).toBe(false);
    applyVaseChange(frame("b"), vase, (patch) => updates.push(patch));
    expect(vaseDraftBuild("b")).toBe(true);
    expect(updates).toHaveLength(1);
    // The settings say what they said: only the body is the coarse one, and only for this vase.
    expect(updates[0].vase.quality).toBe("standard");
    expect(triangles("b", vase)).toBeLessThan(full / 2);
    expect(triangles("other", vase)).toBe(full);
    let released = 0;
    endVaseDraft(() => {
      released += 1;
    });
    expect(released).toBe(1);
    expect(vaseDraftBuild("b")).toBe(false);
    expect(updates).toHaveLength(2);
    expect(updates[1].vase).toBe(vase);
    expect(triangles("b", vase)).toBe(full);
  }, 60000);

  it("a hold in which nothing is changed is over at once, and never coarse", () => {
    let released = 0;
    beginVaseDraft("c");
    endVaseDraft(() => {
      released += 1;
    });
    expect(released).toBe(1);
    expect(vaseDraftBuild("c")).toBe(false);
    // Letting go twice is harmless.
    endVaseDraft(() => {
      released += 1;
    });
    expect(released).toBe(2);
  });

  it("a change to another vase than the one held is built in full", () => {
    const vase = normalizeVaseSettings({ effect: "waben", reliefDepth: 3 });
    beginVaseDraft("d");
    applyVaseChange(frame("e"), vase, () => {});
    expect(vaseDraftBuild("e")).toBe(false);
    expect(vaseDraftBuild("d")).toBe(false);
    endVaseDraft(() => {});
  }, 60000);

  it("is drawn as it is printed in vase mode - one thin wall, open at the top - while its body stays the solid", () => {
    const frame = { width: 90, depth: 90, height: 180 };
    const topFaces = (geometry: { getAttribute: (name: string) => { count: number; getY: (index: number) => number } }) => {
      const position = geometry.getAttribute("position");
      let count = 0;
      for (let i = 0; i < position.count; i += 3) if (position.getY(i) > 179.99 && position.getY(i + 1) > 179.99 && position.getY(i + 2) > 179.99) count += 1;
      return count;
    };
    const bottomFaces = (geometry: { getAttribute: (name: string) => { count: number; getY: (index: number) => number } }) => {
      const position = geometry.getAttribute("position");
      let count = 0;
      for (let i = 0; i < position.count; i += 3) if (position.getY(i) < 0.01 && position.getY(i + 1) < 0.01 && position.getY(i + 2) < 0.01) count += 1;
      return count;
    };
    const solid = normalizeVaseSettings({ quality: "entwurf", printView: "nein" });
    const printed = normalizeVaseSettings({ quality: "entwurf" });
    expect(printed.printView).toBe("ja");
    const asSolid = createVaseGeometry({ ...frame, vase: solid });
    const asPrinted = createVaseGeometry({ ...frame, vase: printed });
    // The solid has its lid; drawn as printed the lid is gone and every other face is there as it was.
    const lid = topFaces(asSolid);
    expect(lid).toBeGreaterThan(8);
    expect(topFaces(asPrinted)).toBe(0);
    expect(asPrinted.getAttribute("position").count).toBe(asSolid.getAttribute("position").count - lid * 3);
    expect(bottomFaces(asPrinted)).toBeGreaterThan(0);
    // The body itself is the same solid either way: what is exported and checked.
    expect(fittedVaseMesh({ ...frame, vase: printed }).triangleCount).toBe(fittedVaseMesh({ ...frame, vase: solid }).triangleCount);
    // A vase with a real wall is drawn as it is.
    const hollow = normalizeVaseSettings({ quality: "entwurf", body: "hohl" });
    expect(createVaseGeometry({ ...frame, vase: hollow }).getAttribute("position").count).toBe(fittedVaseMesh({ ...frame, vase: hollow }).triangleCount * 3);
    expect(normalizeVaseSettings({ printView: "vielleicht" }).printView).toBe("ja");
  }, 60000);

  it("coarse is the Draft detail whatever the vase's own is", () => {
    const fine = normalizeVaseSettings({ quality: "fein" });
    expect(vaseSettingsInFrame(fine, 90, 90, 180).quality).toBe("fein");
    expect(vaseSettingsInFrame(fine, 90, 90, 180, true).quality).toBe("entwurf");
  });
});
