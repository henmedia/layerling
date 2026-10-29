import { describe, expect, it } from "vitest";
import { applySurfaceTexture, createSurfaceTextureSession, insideToScreenPositions, makeSurfaceTextureLayout, normalizeSurfaceTexture, surfaceFalloff, surfaceTexturePositions, surfaceTextureValueAt } from "@/lib/surfaceTexture";
import { prepareSurfaceBase, surfaceMeshReport } from "@/lib/surfaceTextureMesh";
import { nearestOnOutline, outlineAngle, outlineRing, prismOutline } from "@/lib/surfaceTextureOutline";

type Vec3 = [number, number, number];

/** A closed box standing on the plate, inside frame (y up), faces wound outward. */
function box(w: number, h: number, d: number): number[] {
  const [x0, x1, y0, y1, z0, z1] = [-w / 2, w / 2, 0, h, -d / 2, d / 2];
  const p: Vec3[] = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
  const faces = [[0, 1, 2], [0, 2, 3], [4, 6, 5], [4, 7, 6], [0, 4, 5], [0, 5, 1], [3, 2, 6], [3, 6, 7], [0, 3, 7], [0, 7, 4], [1, 5, 6], [1, 6, 2]];
  return faces.flatMap((face) => face.flatMap((i) => p[i]));
}

/** A prism of `sides` sides standing on the plate, inside frame, top and bottom fans round a middle point. */
function prism(radius: number, height: number, sides: number): number[] {
  const out: number[] = [];
  const tri = (a: Vec3, b: Vec3, c: Vec3) => out.push(...a, ...b, ...c);
  const at = (k: number, y: number): Vec3 => [radius * Math.cos((2 * Math.PI * k) / sides), y, radius * Math.sin((2 * Math.PI * k) / sides)];
  for (let k = 0; k < sides; k += 1) {
    tri(at(k, 0), at(k, height), at(k + 1, height));
    tri(at(k, 0), at(k + 1, height), at(k + 1, 0));
    tri([0, height, 0], at(k + 1, height), at(k, height));
    tri([0, 0, 0], at(k, 0), at(k + 1, 0));
  }
  return out;
}

/** The body as the texture sees it: welded, in the screen frame (z up), and its outline round z. */
function outlineOf(soup: number[]) {
  const base = prepareSurfaceBase(insideToScreenPositions(soup));
  return prismOutline(base, 2, 0, 1, 30);
}

function usedPoints(result: { vertices: ArrayLike<number>; indices: Uint32Array }) {
  return [...new Set(result.indices)].map((i): Vec3 => [result.vertices[i * 3], result.vertices[i * 3 + 1], result.vertices[i * 3 + 2]]);
}

describe("the outline of an angular body", () => {
  it("find a box's and a prism's outline, but not one of a body that is no prism", () => {
    const square = outlineOf(box(40, 30, 20))!;
    expect(square.loops).toHaveLength(1);
    expect(square.loops[0].length).toBeCloseTo(120, 6);
    expect(square.corners).toHaveLength(4);
    expect(square.ringable).toBe(true);
    const hexagon = outlineOf(prism(20, 30, 6))!;
    expect(hexagon.corners).toHaveLength(6);
    expect(hexagon.loops[0].length).toBeCloseTo(120, 6);
    // A pyramid's sides lean: no prism.
    const pyramid: number[] = [];
    const tip: Vec3 = [0, 30, 0];
    const corners: Vec3[] = [[-20, 0, -20], [20, 0, -20], [20, 0, 20], [-20, 0, 20]];
    for (let k = 0; k < 4; k += 1) pyramid.push(...corners[k], ...tip, ...corners[(k + 1) % 4]);
    pyramid.push(...corners[0], ...corners[1], ...corners[2], ...corners[0], ...corners[2], ...corners[3]);
    expect(outlineOf(pyramid)).toBeNull();
  });

  it("measure round the outline without a jump at the corners", () => {
    const outline = outlineOf(box(40, 30, 40))!;
    // Screen frame: x across, y back; the box's corners at ±20.
    for (const [cx, cy] of [[20, 20], [-20, 20], [-20, -20], [20, -20]]) {
      const before = outlineAngle(outline, cx, cy - Math.sign(cy) * 1e-6);
      const after = outlineAngle(outline, cx - Math.sign(cx) * 1e-6, cy);
      const d = Math.abs(before - after);
      expect(Math.min(d, 2 * Math.PI - d)).toBeLessThan(1e-6);
    }
    // From the middle of one side to the middle of the next: a quarter of the way round, a quarter turn.
    expect(Math.abs(outlineAngle(outline, 20, 0) - outlineAngle(outline, 0, 20))).toBeCloseTo(Math.PI / 2, 6);
  });

  it("lay rings inside a convex outline that run on across the corners' bisectors", () => {
    const outline = outlineOf(box(40, 30, 30))!;
    expect(nearestOnOutline(outline, 0, 0).distance).toBeCloseTo(15, 9);
    for (const depth of [2, 5, 9]) {
      // Either side of a corner's bisector at the same depth: the same place round the ring.
      const a = outlineRing(outline, 20 - depth + 1e-7, 15 - depth - 1e-4);
      const b = outlineRing(outline, 20 - depth - 1e-4, 15 - depth + 1e-7);
      expect(a.depth).toBeCloseTo(depth, 3);
      const d = Math.abs(a.turn - b.turn);
      expect(Math.min(d, 1 - d)).toBeLessThan(1e-4);
      // A rectangle's ring is shorter by eight times its depth.
      expect(a.lengthAt(depth)).toBeCloseTo(140 - 8 * depth, 6);
    }
  });
});

describe("a pattern laid round an angular body", () => {
  it("run round a box's upright edges instead of stopping there", () => {
    const result = applySurfaceTexture(box(40, 30, 40), { pattern: "rope", spacing: 5, depth: 2 });
    expect(result.stats.projection).toBe("cylinder");
    expect(surfaceMeshReport(result.indices, result.vertices.length / 3)).toMatchObject({ openEdges: 0, nonManifoldEdges: 0, shells: 1 });
    // Points that started on the upright edges (in the middle of the height) moved out: the edge is not kept smooth.
    let onEdge = 0;
    for (const [x, y, z] of usedPoints(result)) {
      if (y < 8 || y > 22) continue;
      // Out along the bisector, so the point stays on the diagonal through the corner.
      if (Math.abs(Math.abs(x) - Math.abs(z)) < 1e-6 && Math.abs(x) > 20 + 0.3) onEdge += 1;
    }
    expect(onEdge).toBeGreaterThan(20);
    // All the way round, a whole number of strands: none breaks off at a seam.
    expect(result.stats.around).toBeGreaterThan(0);
  }, 120_000);

  it("bend a raised pattern round a convex corner in an arc, not in a mitre", () => {
    const depth = 2;
    const result = applySurfaceTexture(box(40, 30, 40), { pattern: "rope", spacing: 5, depth });
    let checked = 0;
    for (const [x, y, z] of usedPoints(result)) {
      if (y < 8 || y > 22 || Math.abs(x) < 17 || Math.abs(z) < 17) continue;
      // Beyond both faces of a corner: at most the depth from the corner line (a mitre reaches 1.41 times as far).
      if (Math.abs(x) > 20 && Math.abs(z) > 20) {
        expect(Math.hypot(Math.abs(x) - 20, Math.abs(z) - 20)).toBeLessThan(depth + 0.02);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(50);
  }, 120_000);

  it("lay grooves on a box's top in rings following its outline, or in rows", () => {
    const rings = applySurfaceTexture(box(40, 30, 30), { pattern: "grooves", faces: ["top"], capStyle: "rings" });
    expect(surfaceMeshReport(rings.indices, rings.vertices.length / 3)).toMatchObject({ openEdges: 0, nonManifoldEdges: 0, shells: 1 });
    const P = rings.stats.spacing;
    let inGroove = 0;
    for (const [x, y, z] of usedPoints(rings)) {
      if (y < 25) continue;
      const fromEdge = Math.min(20 - Math.abs(x), 15 - Math.abs(z));
      if (fromEdge < 2) continue;
      const t = fromEdge / P;
      const expected = 0.6 * surfaceFalloff(Math.abs(t - Math.floor(t) - 0.5) / 0.3, "pointed");
      expect(30 - y).toBeCloseTo(expected, 2);
      if (expected > 0.5) inGroove += 1;
    }
    // The rings are straight between the corners' bisectors: cut, they need points only where they bend.
    expect(inGroove).toBeGreaterThan(3);
    // By default an angular top takes rows: straight across, not following the outline.
    const rows = applySurfaceTexture(box(40, 30, 30), { pattern: "grooves", faces: ["top"] });
    let off = 0;
    for (const [x, y, z] of usedPoints(rows)) {
      if (y < 25 || Math.min(20 - Math.abs(x), 15 - Math.abs(z)) < 2) continue;
      const t = Math.min(20 - Math.abs(x), 15 - Math.abs(z)) / P;
      if (Math.abs(30 - y - 0.6 * surfaceFalloff(Math.abs(t - Math.floor(t) - 0.5) / 0.3, "pointed")) > 0.05) off += 1;
    }
    expect(off).toBeGreaterThan(3);
  }, 120_000);

  it("keep rope round a hexagonal prism closed, with rings on its top", () => {
    const result = applySurfaceTexture(prism(22, 30, 6), { pattern: "rope", topFree: 0, capStyle: "rings" });
    expect(result.stats.projection).toBe("cylinder");
    expect(surfaceMeshReport(result.indices, result.vertices.length / 3)).toMatchObject({ openEdges: 0, nonManifoldEdges: 0, shells: 1 });
    expect(usedPoints(result).filter(([, y]) => y > 30.5).length).toBeGreaterThan(1000);
  }, 120_000);
});

/** A cylinder standing on the plate, inside frame, top and bottom fans round the middle. */
function cylinder(radius: number, height: number, sides: number): number[] {
  return prism(radius, height, sides);
}

describe("the edge where the side meets a patterned top", () => {
  it("run the side's rope rows round a box's top edge in an arc and on as rings", () => {
    const depth = 1.5;
    const result = applySurfaceTexture(box(40, 30, 40), { pattern: "rope", spacing: 4, depth, topFree: 0, capStyle: "rings", capEdge: "over" });
    expect(surfaceMeshReport(result.indices, result.vertices.length / 3)).toMatchObject({ openEdges: 0, nonManifoldEdges: 0, shells: 1 });
    // Beyond both the side and the top (a box's front edge, away from the corners): on an arc round the edge, not a mitre.
    let beyond = 0;
    for (const [x, y, z] of usedPoints(result)) {
      if (Math.abs(x) > 12 || z < 20 || y < 30) continue;
      beyond += 1;
      expect(Math.hypot(z - 20, y - 30)).toBeLessThan(depth + 0.02);
    }
    expect(beyond).toBeGreaterThan(50);
  }, 120_000);

  it("go on from the side's rows to the top's rings without a jump", () => {
    const base = prepareSurfaceBase(insideToScreenPositions(box(40, 30, 40)));
    const outline = prismOutline(base, 2, 0, 1, 30)!;
    const s = { ...normalizeSurfaceTexture({ pattern: "rope", spacing: 4, depth: 1.5, topFree: 0, capStyle: "rings" }), projection: "cylinder" as const };
    const layout = makeSurfaceTextureLayout(base, s, null, outline);
    layout.flatCaps = true;
    layout.capEdge = "over";
    layout.rims = [{ level: 30, sign: 1, radius: 0, reach: 1.5 }];
    // Screen frame: the front face at y = -20, the top at z = 30.
    for (let x = -10; x <= 10; x += 0.7) {
      const side = surfaceTextureValueAt(x, -20, 30 - 1e-6, 0, -1, 0, s, layout);
      const top = surfaceTextureValueAt(x, -20 + 1e-6, 30, 0, 0, 1, s, layout);
      expect(Math.abs(side - top)).toBeLessThan(1e-3);
    }
    // A row on the side two spacings below the rim is a ring two spacings in on the top.
    for (let x = -10; x <= 10; x += 0.7) {
      const side = surfaceTextureValueAt(x, -20, 30 - 2 * 4 + 0.6, 0, -1, 0, s, layout);
      const top = surfaceTextureValueAt(x, -20 + 2 * 4 - 0.6, 30, 0, 0, 1, s, layout);
      // Not the same strands (the inner ring is shorter), but the same place across the row.
      expect(Math.abs(side - top)).toBeLessThan(0.75);
    }
  });

  it("lay a cord round the rim, the side's and the top's pattern ending under it", () => {
    const base = prepareSurfaceBase(insideToScreenPositions(box(40, 30, 40)));
    const outline = prismOutline(base, 2, 0, 1, 30)!;
    const s = { ...normalizeSurfaceTexture({ pattern: "rope", spacing: 4, depth: 1.5, topFree: 0, capEdge: "bead" }), projection: "cylinder" as const };
    const layout = makeSurfaceTextureLayout(base, s, null, outline);
    layout.flatCaps = true;
    layout.capEdge = "bead";
    layout.rims = [{ level: 30, sign: 1, radius: 0, reach: 1.5 }];
    // Along the edge: the cord's strands, high and low; the same just either side of the edge.
    const along: number[] = [];
    for (let x = -10; x <= 10; x += 0.25) {
      const side = surfaceTextureValueAt(x, -20, 30 - 1e-6, 0, -1, 0, s, layout);
      const top = surfaceTextureValueAt(x, -20 + 1e-6, 30, 0, 0, 1, s, layout);
      expect(Math.abs(side - top)).toBeLessThan(1e-3);
      along.push(side);
    }
    expect(Math.max(...along)).toBeGreaterThan(0.95);
    expect(Math.min(...along)).toBeLessThan(0.6);
    // Under the cord's middle the side's rows are gone: a row centred right under it does not show.
    const plain = { ...layout, capEdge: null };
    const under = [0, 1, 2, 3].map((k) => surfaceTextureValueAt(-10 + k, -20, 30 - 0.5, 0, -1, 0, s, layout));
    const rows = [0, 1, 2, 3].map((k) => surfaceTextureValueAt(-10 + k, -20, 30 - 0.5, 0, -1, 0, s, plain));
    expect(under).not.toEqual(rows);
    // Far from the rim nothing changes.
    expect(surfaceTextureValueAt(3, -20, 15, 0, -1, 0, s, layout)).toBeCloseTo(surfaceTextureValueAt(3, -20, 15, 0, -1, 0, s, plain), 9);
  });

  it("keep a cord round a box's top and a round top closed", () => {
    for (const soup of [box(40, 30, 40), cylinder(20, 30, 96)]) {
      const result = applySurfaceTexture(soup, { pattern: "rope", spacing: 4, depth: 1.5, topFree: 0, capEdge: "bead" }, { preview: true });
      expect(surfaceMeshReport(result.indices, result.vertices.length / 3)).toMatchObject({ openEdges: 0, nonManifoldEdges: 0, shells: 1 });
      // The cord stands out over the edge itself.
      expect(usedPoints(result).some(([x, y, z]) => y > 30.5 && Math.hypot(x, z) > 20)).toBe(true);
    }
  }, 120_000);

  it("run upright grooves on over the top as rays, to near the middle or folded over as a rim", () => {
    const base = prepareSurfaceBase(insideToScreenPositions(box(40, 30, 40)));
    const outline = prismOutline(base, 2, 0, 1, 30)!;
    for (const [capEdge, capStyle] of [["over", "rings"], ["fold", "rows"]] as const) {
      const s = { ...normalizeSurfaceTexture({ pattern: "grooves", angle: 0, topFree: 0, capStyle }), projection: "cylinder" as const };
      const layout = makeSurfaceTextureLayout(base, s, null, outline);
      layout.flatCaps = true;
      layout.capEdge = capEdge;
      layout.rims = [{ level: 30, sign: 1, radius: 0, reach: 1 }];
      // Either side of the front edge the same groove: it goes on over the edge.
      for (let x = -10; x <= 10; x += 0.37) {
        const side = surfaceTextureValueAt(x, -20, 30 - 1e-6, 0, -1, 0, s, layout);
        const top = surfaceTextureValueAt(x, -20 + 1e-6, 30, 0, 0, 1, s, layout);
        expect(Math.abs(side - top), `${capEdge} at ${x}`).toBeLessThan(1e-3);
      }
      // A little way in, still grooves (drawing together towards the middle).
      const P = layout.period;
      const inside = Array.from({ length: 60 }, (_, k) => surfaceTextureValueAt(-10 + k / 3, -20 + 0.5 * P, 30, 0, 0, 1, s, layout));
      expect(Math.max(...inside)).toBeGreaterThan(0.9);
      expect(Math.min(...inside)).toBeLessThan(0.1);
      const plain = { ...layout, capEdge: null };
      if (capEdge === "over") {
        // Towards the middle they fade out: it stays smooth there.
        for (const [x, y] of [[0, 0], [3, -2], [-4, 5]]) expect(surfaceTextureValueAt(x, y, 30, 0, 0, 1, s, layout)).toBe(0);
      } else {
        // Inside the rim the top's own rows.
        for (const [x, y] of [[0, 0], [3.3, -2.1], [-4.4, 5.5]]) expect(surfaceTextureValueAt(x, y, 30, 0, 0, 1, s, layout)).toBeCloseTo(surfaceTextureValueAt(x, y, 30, 0, 0, 1, s, plain), 9);
      }
    }
  });

  it("let the side's rows run over the whole top or fold over as a rim, whatever the top has of its own", () => {
    const base = prepareSurfaceBase(insideToScreenPositions(box(40, 30, 40)));
    const outline = prismOutline(base, 2, 0, 1, 30)!;
    for (const capStyle of ["rows", "rings"] as const) {
      const s = { ...normalizeSurfaceTexture({ pattern: "rope", spacing: 4, topFree: 0, capStyle }), projection: "cylinder" as const };
      const layout = makeSurfaceTextureLayout(base, s, null, outline);
      layout.flatCaps = true;
      layout.rims = [{ level: 30, sign: 1, radius: 0, reach: 1 }];
      const at = (capEdge: "over" | "fold" | null, x: number, y: number) => surfaceTextureValueAt(x, y, 30, 0, 0, 1, s, { ...layout, capEdge });
      // Inside the rim folded over, the top's own pattern; run over, the side's rings all the way in.
      const points = [[0.3, 0.7], [2.9, -3.1], [-5.3, 4.4], [6.1, 1.2]];
      expect(points.every(([x, y]) => at("fold", x, y) === at(null, x, y)), capStyle).toBe(true);
      const ringsIn = points.map(([x, y]) => at("over", x, y));
      expect(ringsIn.some((v, k) => Math.abs(v - at(null, points[k][0], points[k][1])) > 0.05), capStyle).toBe(true);
    }
  });

  it("keep upright and slanted grooves running over closed", () => {
    for (const [soup, capStyle] of [[box(40, 30, 40), "rows"], [box(40, 30, 40), "rings"], [cylinder(20, 30, 96), "auto"]] as const) {
      for (const angle of [0, 40]) {
        for (const capEdge of ["over", "fold"]) {
          const result = applySurfaceTexture(soup, { pattern: "grooves", angle, capStyle, capEdge, topFree: 0 }, { preview: true });
          expect(surfaceMeshReport(result.indices, result.vertices.length / 3), `${capStyle} ${capEdge} ${angle}`).toMatchObject({ openEdges: 0, nonManifoldEdges: 0, shells: 1 });
        }
      }
    }
  }, 120_000);

  it("leave the edge sharp for a pattern that cannot run over, or when asked", () => {
    for (const settings of [{ pattern: "honeycomb" }, { pattern: "rope", capEdge: "sharp" }]) {
      const result = applySurfaceTexture(box(40, 30, 40), { ...settings, topFree: 0, depth: 1, direction: "outward" }, { preview: true });
      // The edge itself stays where it was: no point beyond both the side and the top.
      expect(usedPoints(result).some(([x, y, z]) => Math.abs(x) < 15 && z > 20.01 && y > 30.01)).toBe(false);
    }
  }, 120_000);
});

describe("every face of an angular body cut alike", () => {
  /** Triangles per side of a box 40 wide and deep (inside frame), by which side their middle lies nearest. */
  function perSide(result: { vertices: ArrayLike<number>; indices: Uint32Array }) {
    const count = { "+x": 0, "-x": 0, "+z": 0, "-z": 0 };
    const v = result.vertices, I = result.indices;
    for (let t = 0; t < I.length; t += 3) {
      const c = [0, 1, 2].map((a) => (v[I[t] * 3 + a] + v[I[t + 1] * 3 + a] + v[I[t + 2] * 3 + a]) / 3);
      if (c[1] < 2 || c[1] > 28) continue;
      if (Math.abs(c[0]) > 19) count[c[0] > 0 ? "+x" : "-x"] += 1;
      else if (Math.abs(c[2]) > 19) count[c[2] > 0 ? "+z" : "-z"] += 1;
    }
    return Object.values(count);
  }

  it("lay every bump anew, on the sides past half way round too", () => {
    // Round an outline u runs from 0 to the whole way round; the bumps on the far half once kept their coarse grid.
    const counts = perSide(applySurfaceTexture(box(40, 30, 40), { pattern: "bumps", spacing: 4, depth: 0.6 }));
    expect(Math.min(...counts)).toBeGreaterThan(0.9 * Math.max(...counts));
  }, 120_000);

  it("cut a top's cells where its values put them, on both halves", () => {
    const depth = 0.8;
    const result = applySurfaceTexture(box(40, 30, 40), { pattern: "cells", topFree: 0, depth });
    const base = prepareSurfaceBase(insideToScreenPositions(box(40, 30, 40)));
    const s = { ...normalizeSurfaceTexture({ pattern: "cells", topFree: 0, depth }), projection: "cylinder" as const };
    const layout = makeSurfaceTextureLayout(base, s, null, prismOutline(base, 2, 0, 1, 30));
    layout.flatCaps = true;
    // Each triangle of the top, away from the rims, as deep in its middle as the pattern says: one reaching across a
    // joint that was not cut where the values have it is not.
    const v = result.vertices, I = result.indices;
    let checked = 0, off = 0;
    for (let t = 0; t < I.length; t += 3) {
      const ps = [0, 1, 2].map((k) => [v[I[t + k] * 3], v[I[t + k] * 3 + 1], v[I[t + k] * 3 + 2]]);
      if (ps.some((p) => p[1] < 30 - depth - 0.01)) continue;
      const c = [0, 1, 2].map((a) => (ps[0][a] + ps[1][a] + ps[2][a]) / 3);
      if (Math.abs(c[0]) > 15 || Math.abs(c[2]) > 15) continue;
      checked += 1;
      if (Math.abs(c[1] - (30 - depth * surfaceTextureValueAt(c[0], -c[2], 30, 0, 0, 1, s, layout))) > 0.3 * depth) off += 1;
    }
    expect(checked).toBeGreaterThan(1000);
    expect(off).toBe(0);
  }, 120_000);

  it("cut knurling in round a corner without folding it over", () => {
    // Moved in along its own face alone, a point by the corner stood out of the other face moved in: little triangles
    // turned over along the corner. Facing the way out from a core 3 mm in, almost none is turned over.
    const result = applySurfaceTexture(box(40, 30, 40), { pattern: "knurl" });
    const v = result.vertices, I = result.indices;
    let near = 0, turned = 0;
    for (let t = 0; t < I.length; t += 3) {
      const ps = [0, 1, 2].map((k) => [v[I[t + k] * 3], v[I[t + k] * 3 + 1], v[I[t + k] * 3 + 2]]);
      const c = [0, 1, 2].map((a) => (ps[0][a] + ps[1][a] + ps[2][a]) / 3);
      if (Math.abs(c[0]) < 17 || Math.abs(c[2]) < 17 || c[1] < 3 || c[1] > 27) continue;
      near += 1;
      const u = [0, 1, 2].map((a) => ps[1][a] - ps[0][a]), w = [0, 1, 2].map((a) => ps[2][a] - ps[0][a]);
      const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      const out = [c[0] - Math.sign(c[0]) * 17, 0, c[2] - Math.sign(c[2]) * 17];
      if (n[0] * out[0] + n[2] * out[2] < -0.2 * Math.hypot(...n) * Math.hypot(...out)) turned += 1;
    }
    expect(near).toBeGreaterThan(200);
    expect(turned).toBeLessThan(0.01 * near);
  }, 120_000);

  it("leave a bump the rim would cut off whole, round an angular body too", () => {
    // Cut off by the wall under a top kept smooth, the top row of holes on a hexagonal prism came out as half holes along
    // the rim (issue #955). Every point cut in lies in a whole bump now, a fade's width or more under the rim.
    const [radius, height, sides, fade] = [20, 45, 6, 1];
    const result = applySurfaceTexture(prism(radius, height, sides), { pattern: "bumps", spacing: 7, depth: 1, fade });
    const apothem = radius * Math.cos(Math.PI / sides);
    let cutIn = 0, inBand = 0;
    for (const [x, y, z] of usedPoints(result)) {
      if (y > height - 1e-6 || y < 1e-6) continue;
      let out = -Infinity;
      for (let k = 0; k < sides; k += 1) {
        const a = ((2 * k + 1) * Math.PI) / sides;
        out = Math.max(out, x * Math.cos(a) + z * Math.sin(a));
      }
      if (out > apothem - 1e-3) continue;
      cutIn += 1;
      if (y > height - fade + 1e-6 || y < fade - 1e-6) inBand += 1;
    }
    expect(cutIn).toBeGreaterThan(1000);
    expect(inBand).toBe(0);
  }, 120_000);

  it("end grooves round the body at a border with a short wall, not in a twisted ramp", () => {
    // The top stays smooth (30 degrees): the grooves end a fade's width under its rim, flat above.
    const result = applySurfaceTexture(box(40, 30, 40), { pattern: "grooves", spacing: 3, depth: 0.6, fade: 1 });
    let above = 0, full = 0;
    for (const [x, y, z] of usedPoints(result)) {
      if (Math.abs(x) > 15 || z < 19) continue;
      const depth = 20 - z, down = 30 - y;
      // Above the wall's foot nothing is cut in; at its top, a fade's width under the rim, the grooves are full deep.
      if (down >= 0 && down < 0.86) {
        above += 1;
        expect(depth).toBeLessThan(0.01);
      }
      if (Math.abs(down - 1) < 0.01 && depth > 0.59) full += 1;
    }
    expect(above).toBeGreaterThan(10);
    expect(full).toBeGreaterThan(5);
  });
});

describe("a texture made again on the same body", () => {
  it("comes out as made anew when the pattern turns inward or stands out further round the corners", () => {
    const soup = box(30, 30, 30);
    const session = createSurfaceTextureSession(soup);
    session.apply({ pattern: "rope", depth: 0.6 });
    for (const change of [{ depth: 0.6, direction: "in" }, { depth: 2 }]) {
      const kept = surfaceTexturePositions(session.apply({ pattern: "rope", ...change }));
      const fresh = surfaceTexturePositions(applySurfaceTexture(soup, { pattern: "rope", ...change }));
      // Counted rather than compared whole: a list this long would take minutes to show where it differs.
      const differing = kept.length === fresh.length ? kept.filter((value, i) => value !== fresh[i]).length : -1;
      expect(differing).toBe(0);
    }
  }, 120_000);
});
