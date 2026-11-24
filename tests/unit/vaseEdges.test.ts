import { describe, expect, it } from "vitest";
import { analyzeTriangleSoup } from "@/lib/svgImport";
import { buildVase, normalizeParams } from "@/lib/vase/vase-geometry.mjs";

/** A plain hollow cylinder, 60 mm across and 80 mm high, with a 3 mm wall: its edges are easy to measure. */
const CYLINDER = { profile: "zylinder", effect: "keine", body: "hohl", diameter: 60, height: 80, wall: 3, bottom: 3, quality: "entwurf" };

/** Largest and smallest distance from the axis among the mesh's points at the height `z`. */
function radiiAt(mesh: { vertices: Float64Array }, z: number) {
  let outer = -Infinity, inner = Infinity;
  for (let i = 0; i < mesh.vertices.length; i += 3) {
    if (Math.abs(mesh.vertices[i + 2] - z) > 1e-6) continue;
    const r = Math.hypot(mesh.vertices[i], mesh.vertices[i + 1]);
    outer = Math.max(outer, r);
    inner = Math.min(inner, r);
  }
  return { outer, inner };
}

describe("the vase's own edges: rim and bottom, round or chamfered (Discussion #1965)", () => {
  it("leaves a vase as it was while both edges are straight", () => {
    const settings = normalizeParams({});
    expect(settings.rimEdge).toBe("gerade");
    expect(settings.baseEdge).toBe("gerade");
    // An unknown style falls back to straight, and the size stays within its limits.
    expect(normalizeParams({ rimEdge: "wellig", baseEdgeSize: 99 })).toMatchObject({ rimEdge: "gerade", baseEdgeSize: 10 });
    const plain = buildVase(CYLINDER);
    expect(plain.edges).toEqual({ rim: 0, base: 0 });
    expect(radiiAt(plain, 80)).toMatchObject({ outer: expect.closeTo(30, 6), inner: expect.closeTo(27, 6) });
    // The sizes alone change nothing.
    expect(buildVase({ ...CYLINDER, rimEdgeSize: 2, baseEdgeSize: 2 }).triangleCount).toBe(plain.triangleCount);
  });

  it("rounds the rim outside and inside as a quarter circle", () => {
    const mesh = buildVase({ ...CYLINDER, rimEdge: "rund", rimEdgeSize: 1 });
    expect(mesh.edges.rim).toBeCloseTo(1, 6);
    // At the top the wall is 1 mm narrower from each side, and 1 mm below it is whole.
    expect(radiiAt(mesh, 80)).toMatchObject({ outer: expect.closeTo(29, 6), inner: expect.closeTo(28, 6) });
    expect(radiiAt(mesh, 79)).toMatchObject({ outer: expect.closeTo(30, 6), inner: expect.closeTo(27, 6) });
    // In between every point lies on the circle of 1 mm around (29, 79) outside and (28, 79) inside.
    let between = 0;
    for (let i = 0; i < mesh.vertices.length; i += 3) {
      const z = mesh.vertices[i + 2];
      if (z <= 79 + 1e-6 || z >= 80 - 1e-6) continue;
      const r = Math.hypot(mesh.vertices[i], mesh.vertices[i + 1]);
      const centre = r > 28.5 ? 29 : 28;
      expect(Math.hypot(r - centre, z - 79)).toBeCloseTo(1, 6);
      between += 1;
    }
    expect(between).toBeGreaterThan(0);
  });

  it("chamfers the rim at 45 degrees", () => {
    const mesh = buildVase({ ...CYLINDER, rimEdge: "fase", rimEdgeSize: 1.2 });
    expect(radiiAt(mesh, 80)).toMatchObject({ outer: expect.closeTo(28.8, 6), inner: expect.closeTo(28.2, 6) });
    expect(radiiAt(mesh, 78.8)).toMatchObject({ outer: expect.closeTo(30, 6), inner: expect.closeTo(27, 6) });
  });

  it("takes at most half the wall from each side: a fully round lip", () => {
    const mesh = buildVase({ ...CYLINDER, rimEdge: "rund", rimEdgeSize: 10 });
    expect(mesh.edges.rim).toBeCloseTo(1.45, 6);
    const top = radiiAt(mesh, 80);
    expect(top.outer - top.inner).toBeCloseTo(0.1, 6);
  });

  it("chamfers or rounds the outer edge of the bottom", () => {
    const chamfer = buildVase({ ...CYLINDER, baseEdge: "fase", baseEdgeSize: 2 });
    expect(chamfer.edges).toEqual({ rim: 0, base: 2 });
    expect(radiiAt(chamfer, 0).outer).toBeCloseTo(28, 6);
    expect(radiiAt(chamfer, 2).outer).toBeCloseTo(30, 6);
    // The vase still stands on z = 0 and is as wide as before.
    expect(radiiAt(chamfer, 40).outer).toBeCloseTo(30, 6);
    const round = buildVase({ ...CYLINDER, baseEdge: "rund", baseEdgeSize: 2 });
    expect(radiiAt(round, 0).outer).toBeCloseTo(28, 6);
    // 0.8 mm of material stays beside the corner of the inner floor: wall 3 + bottom 3 - 1.2.
    expect(buildVase({ ...CYLINDER, baseEdge: "fase", baseEdgeSize: 10 }).edges.base).toBeCloseTo(4.8, 6);
    // A solid vase for the slicer's vase mode gets them too, outside only.
    const solid = buildVase({ ...CYLINDER, body: "voll", rimEdge: "rund", rimEdgeSize: 4, baseEdge: "fase", baseEdgeSize: 3 });
    expect(solid.edges).toEqual({ rim: 4, base: 3 });
    expect(radiiAt(solid, 0).outer).toBeCloseTo(27, 6);
  });

  it("keeps the holes in the bottom whole and the wall of a hollow foot standing", () => {
    const feet = buildVase({ ...CYLINDER, rubberFeet: 4, baseEdge: "fase", baseEdgeSize: 10 });
    expect(feet.floor.blind.length).toBe(4);
    for (const hole of feet.floor.blind) expect(Math.hypot(hole.cx, hole.cy) + hole.r + 0.6).toBeLessThanOrEqual(30 - feet.edges.base + 1e-6);
    // On a hollow foot, or without a bottom, half of the ring the vase stands on stays.
    expect(buildVase({ ...CYLINDER, footHeight: 10, baseEdge: "fase", baseEdgeSize: 10 }).edges.base).toBeCloseTo(1.5, 6);
    expect(buildVase({ ...CYLINDER, bottom: 0, baseEdge: "rund", baseEdgeSize: 10 }).edges.base).toBeCloseTo(1.5, 6);
  });

  it("keeps straight edges where the vase cannot shape them", () => {
    const edges = { rimEdge: "rund", baseEdge: "rund" };
    // Facets and the slitted body for vase mode: both stay straight.
    expect(buildVase({ ...CYLINDER, ...edges, effect: "lowpoly" }).edges).toEqual({ rim: 0, base: 0 });
    expect(buildVase({ ...CYLINDER, ...edges, body: "voll", reinforce: "rippen" }).edges).toEqual({ rim: 0, base: 0 });
    // A rim that carries a lid stays square; the bottom edge is shaped all the same.
    for (const lidMode of ["stuelp", "schnapp", "schraube", "kanne"]) expect(buildVase({ ...CYLINDER, ...edges, lidMode }).edges, lidMode).toEqual({ rim: 0, base: 1 });
  });

  it("stays closed with every kind of wall, bottom and pattern", () => {
    const variants: Array<[string, Record<string, unknown>]> = [
      ["a bottle, round rim and chamfered bottom", { profile: "flasche", rimEdge: "rund", baseEdge: "fase", baseEdgeSize: 2 }],
      ["a bowl in fine quality", { profile: "schale", quality: "fein", wall: 2, rimEdge: "rund", baseEdge: "rund", baseEdgeSize: 4 }],
      ["a twisted hexagon with a round inner wall", { section: "vieleck", innerShape: "rund", twist: 90, rimEdge: "fase", baseEdge: "rund" }],
      ["grooves up to the rim", { effect: "rillen", zoneFrom: 0, zoneTo: 100, rimEdge: "rund", baseEdge: "fase" }],
      ["Voronoi cells", { effect: "voronoi", rimEdge: "rund", baseEdge: "rund", baseEdgeSize: 2 }],
      ["an open honeycomb wall from top to bottom", { cutout: "waben", cutoutFrom: 0, cutoutTo: 100, rimEdge: "rund", rimEdgeSize: 1.5, baseEdge: "fase" }],
      ["a hollow foot with drain holes", { footHeight: 12, drainHoles: 5, rimEdge: "rund", baseEdge: "fase", baseEdgeSize: 5 }],
      ["no bottom", { bottom: 0, rimEdge: "rund", baseEdge: "rund", baseEdgeSize: 5 }],
      ["drain holes and recesses for feet", { drainHoles: 5, rubberFeet: 4, baseEdge: "fase", baseEdgeSize: 8 }],
      ["a standing lampshade with a cable slot", { lamp: "stehend", footHeight: 20, lampNotch: 8, rimEdge: "rund", baseEdge: "fase", baseEdgeSize: 3 }],
      ["a lampshade over an LED puck", { lamp: "puck", lampNotch: 8, rimEdge: "rund", baseEdge: "fase", baseEdgeSize: 3 }],
      ["a screw lid", { lidMode: "schraube", rimEdge: "rund", baseEdge: "rund" }],
      ["a solid vase with recesses", { body: "voll", rubberFeet: 4, rimEdge: "rund", rimEdgeSize: 5, baseEdge: "rund", baseEdgeSize: 8 }],
    ];
    for (const [name, settings] of variants) {
      const mesh = buildVase({ ...CYLINDER, ...settings });
      const analysis = analyzeTriangleSoup(Array.from(mesh.positions));
      expect(analysis.boundaryEdges, name).toBe(0);
      expect(analysis.nonManifoldEdges, name).toBe(0);
    }
    // Thirteen whole vases, one of them cut along its Voronoi joints.
  }, 30_000);
});
