import { describe, expect, it } from "vitest";
import { assemblyCollisions, meshSolid } from "@/lib/vase/vase-collisions.mjs";
import { buildVase, vaseShape } from "@/lib/vase/vase-geometry.mjs";
import { assembledMesh, buildParts } from "@/lib/vase/vase-parts.mjs";
import { buildVaseBody } from "@/lib/vaseBody";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { normalizeVaseSettings } from "@/lib/vaseSettings";
import { sceneWithVaseAccessories, vaseAssemblyCollisions } from "@/lib/vaseShape";
import { canonicalizeShape } from "@/lib/workplaneShapes";

/*
 * Whether a vase and its accessories run into one another when they are put together: bodies that overlap by more
 * than a play of 0.2 mm are named, bodies that only touch are not.
 */

/** A box as a closed mesh, its faces looking out. */
function box(id: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
  const vertices = [x0, y0, z0, x1, y0, z0, x1, y1, z0, x0, y1, z0, x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1];
  const indices = [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7];
  return { id, vertices: new Float64Array(vertices), indices: new Uint32Array(indices) };
}

/** The vase with what is moulded onto it, and its accessories where they sit when put together. */
function assembly(settings: Record<string, unknown>) {
  const vase = normalizeVaseSettings(settings);
  const body = buildVaseBody(vase);
  const parts = buildParts(vase).parts.filter((part) => !part.merge);
  return [{ id: "vase", vertices: body.vertices, indices: body.indices }, ...parts.map((part) => ({ id: part.id, ...assembledMesh(part) }))];
}

const pot = { height: 120, diameter: 140, body: "hohl", profile: "topfKlassik", quality: "entwurf" };

describe("a closed mesh as a solid", () => {
  it("knows inside from outside, and where two of its shells overlap", () => {
    const one = box("a", 0, 0, 0, 10, 10, 10);
    const solid = meshSolid(one.vertices, one.indices);
    expect(solid.winding(5, 5, 5)).toBe(1);
    expect(solid.winding(5, 5, 11)).toBe(0);
    expect(solid.winding(5, 5, -1)).toBe(0);
    expect(solid.winding(-1, 5, 5)).toBe(0);
    expect(solid.winding(9.99, 0.01, 9.99)).toBe(1);
    // Two boxes in one mesh, 2 mm into one another: inside both, the point is wrapped twice.
    const other = box("b", 8, 0, 0, 20, 10, 10);
    const both = meshSolid(new Float64Array([...one.vertices, ...other.vertices]), new Uint32Array([...one.indices, ...[...other.indices].map((index) => index + 8)]));
    expect(both.winding(9, 5, 5)).toBe(2);
    expect(both.winding(15, 5, 5)).toBe(1);
    expect(both.winding(21, 5, 5)).toBe(0);
    // A hollow vase: its wall is solid, the space in it is not.
    const body = buildVase(pot);
    const shape = vaseShape(pot);
    const vessel = meshSolid(body.vertices, body.indices);
    expect(vessel.winding(0, 0, 60)).toBe(0);
    expect(vessel.winding((shape.outerAt(0, 60) + shape.innerAt(0, 60)) / 2, 0, 60)).toBe(1);
    expect(vessel.winding(shape.outerAt(0, 60) + 1, 0, 60)).toBe(0);
    expect(vessel.winding(10, 10, 1)).toBe(1);
  });
});

describe("bodies that run into one another", () => {
  it("are named with how deep at least; bodies that touch or keep a play are not", () => {
    const a = box("a", 0, 0, 0, 20, 20, 20);
    // Standing on it, beside it with 0.1 mm of air, and 0.1 mm into it: none of that is a collision.
    expect(assemblyCollisions([a, box("b", 0, 0, 20, 20, 20, 30)])).toEqual([]);
    expect(assemblyCollisions([a, box("b", 20.1, 0, 0, 30, 20, 20)])).toEqual([]);
    expect(assemblyCollisions([a, box("b", 5, 5, 19.9, 15, 15, 30)])).toEqual([]);
    // 0.3 mm, 0.6 mm, 3 mm and 12 mm into it: at least 0.2, 0.5, 2 and 4 mm (the levels the depth is counted in).
    expect(assemblyCollisions([a, box("b", 5, 5, 19.7, 15, 15, 30)])).toEqual([{ a: "a", b: "b", depth: 0.2 }]);
    expect(assemblyCollisions([a, box("b", 5, 5, 19.4, 15, 15, 30)])).toEqual([{ a: "a", b: "b", depth: 0.5 }]);
    expect(assemblyCollisions([a, box("b", 5, 5, 17, 15, 15, 30)])).toEqual([{ a: "a", b: "b", depth: 2 }]);
    expect(assemblyCollisions([a, box("b", 5, 5, 8, 15, 15, 30)])).toEqual([{ a: "a", b: "b", depth: 4 }]);
    // A small body wholly inside a large one is found from its side.
    expect(assemblyCollisions([box("big", 0, 0, 0, 40, 40, 40), box("small", 18, 18, 18, 22, 22, 22)])).toEqual([{ a: "big", b: "small", depth: 4 }]);
    // Three bodies: only the pair that overlaps.
    expect(assemblyCollisions([a, box("b", 40, 0, 0, 50, 20, 20), box("c", 45, 5, 5, 60, 15, 15)])).toEqual([{ a: "b", b: "c", depth: 4 }]);
  });
});

describe("a vase's accessories put together", () => {
  // Every kind of accessory as the designer builds it: none runs into the vase or into another.
  it.each([
    ["a saucer and an inner pot", { saucerMode: "schale", insertMode: "pflanze", drainHoles: 3 }],
    ["a slanted saucer that hugs the pot, and an inner pot with a water store", { saucerMode: "schale", saucerForm: "huelle", saucerRise: 30, insertMode: "bewaesserung" }],
    ["a docked bowl on pins", { saucerMode: "andock", drainHoles: 3 }],
    ["a docked bowl on magnets, an inner pot and the wall holder", { saucerMode: "andock", saucerHold: "magnet", wallMount: "schiene", insertMode: "pflanze" }],
    ["legs to plug in, in a saucer", { legMode: "stecken", saucerMode: "schale" }],
    ["legs moulded on, in a saucer", { legMode: "angeformt", saucerMode: "schale" }],
    ["a stand in a saucer", { legMode: "staender", saucerMode: "schale" }],
    ["a dish hidden in the hollow foot", { footHeight: 12, saucerMode: "versteckt", drainHoles: 3 }],
    ["a slip lid", { profile: "fass", lidMode: "stuelp" }],
    ["a snap lid", { profile: "fass", lidMode: "schnapp" }],
    ["a screw lid", { profile: "fass", lidMode: "schraube" }],
    ["a teapot lid with its knob", { profile: "bauchig", lidMode: "kanne", lidKnob: "ja" }],
    ["a flower frog", { profile: "fass", insertMode: "stecker" }],
    ["a water tube", { profile: "fass", insertMode: "roehrchen" }],
    ["a pot with fins, its inner pot and a saucer", { section: "welle", sectionWaves: 24, sectionWaveStyle: "lamellen", insertMode: "pflanze", saucerMode: "schale", saucerForm: "huelle" }],
    ["a patterned pot, its inner pot and a saucer", { effect: "rillen", ribDepth: 3, saucerMode: "schale", insertMode: "pflanze" }],
  ])("fits: %s", (_name, settings) => {
    const bodies = assembly({ ...pot, ...settings });
    expect(bodies.length).toBeGreaterThan(1);
    expect(assemblyCollisions(bodies)).toEqual([]);
  }, 30_000);

  it("fits a wall rail into its holder on every pot: the wedge passes between the holder's rails, the slanted faces keep a play", () => {
    for (const more of [{}, { profile: "bauchig", height: 200 }, { section: "vieleck", polySides: 6 }, { section: "welle", twist: 40 }, { profile: "topfSchale", height: 70, diameter: 160 }, { fitClearance: 0 }]) {
      expect(assemblyCollisions(assembly({ ...pot, wallMount: "schiene", ...more })), JSON.stringify(more)).toEqual([]);
    }
    // The rail's wedge is only as wide as its neck until it reaches the dovetail's head, 4 mm before the wall.
    const settings = { ...pot, wallMount: "schiene" };
    const { wall } = vaseShape(settings);
    const rail = buildParts(settings).parts.find((part) => part.id === "wandschiene")!.mesh.vertices;
    for (let i = 0; i < rail.length; i += 3) {
      if (rail[i + 1] < wall.back - 4 - 1e-6) expect(Math.abs(rail[i])).toBeLessThanOrEqual(7.002);
    }
  });

  it("names what does run into one another: an inner pot and a lid that reaches into the neck", () => {
    const hits = assemblyCollisions(assembly({ ...pot, profile: "fass", insertMode: "pflanze", lidMode: "stuelp" }));
    expect(hits).toHaveLength(1);
    expect([hits[0].a, hits[0].b].sort()).toEqual(["deckel", "einsatz"]);
    expect(hits[0].depth).toBeGreaterThanOrEqual(0.2);
    // And parts made for another pot: an inner pot of a wider pot does not go into a narrower one.
    const narrow = assembly({ ...pot, diameter: 110 }), wide = assembly({ ...pot, insertMode: "pflanze" });
    // (How deep is counted inside the other body: through a wall of 2 mm, no more than that wall allows.)
    const forced = assemblyCollisions([narrow[0], wide[1]]);
    expect(forced.map(({ a, b }) => [a, b])).toEqual([["vase", "einsatz"]]);
    expect(forced[0].depth).toBeGreaterThanOrEqual(0.5);
  });

  it("is checked when the editor puts the parts together, and not when it lays them out for printing", () => {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "vase")!;
    const shape = (settings: Record<string, unknown>) => {
      const made = makeShapeFromAsset(asset, { x: 0, z: 0 });
      return canonicalizeShape({ ...made, width: 140, depth: 140, size: 140, height: 120, vase: normalizeVaseSettings({ ...made.vase, ...pot, ...settings }) });
    };
    const fits = shape({ saucerMode: "schale", insertMode: "pflanze" });
    expect(sceneWithVaseAccessories([fits], fits.id, () => "part", true).collisions).toEqual([]);
    expect(sceneWithVaseAccessories([fits], fits.id, () => "part").collisions).toBeUndefined();
    const clash = shape({ profile: "fass", insertMode: "pflanze", lidMode: "stuelp" });
    const found = sceneWithVaseAccessories([clash], clash.id, () => "part", true).collisions!;
    expect(found).toHaveLength(1);
    expect([found[0].a?.kind, found[0].b?.kind].sort()).toEqual(["lid", "plantInsert"]);
    expect(found[0].mm).toBeGreaterThanOrEqual(0.2);
    expect(vaseAssemblyCollisions({ width: 140, depth: 140, height: 120, vase: clash.vase })).toEqual(found);
    // A vase built solid for the slicer's vase mode is not held against its parts: printed, it is a thin shell.
    const solid = shape({ body: "voll", saucerMode: "schale", legMode: "staender" });
    expect(sceneWithVaseAccessories([solid], solid.id, () => "part", true).collisions).toEqual([]);
  });
});
