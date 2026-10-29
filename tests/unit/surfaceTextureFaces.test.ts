import { describe, expect, it } from "vitest";
import {
  applySurfaceTexture,
  insideToScreenPositions,
  normalizeSurfaceTexture,
  surfaceFalloff,
  SURFACE_TEXTURE_MAX_FACES,
  surfaceTextureChosenTriangles,
  surfaceTextureFacePick,
  surfaceTexturePickedFaceIds,
  toggleSurfaceTexturePickedFace,
  surfaceTextureValueAt,
  type SurfaceTextureLayout,
} from "@/lib/surfaceTexture";
import { mergeFlatPoints, prepareSurfaceBase, subdivide, surfaceMeshReport } from "@/lib/surfaceTextureMesh";

type Vec3 = [number, number, number];

/** A closed box standing on the plate, inside frame (y up), faces wound outward. */
function box(w: number, h: number, d: number): number[] {
  const [x0, x1, y0, y1, z0, z1] = [-w / 2, w / 2, 0, h, -d / 2, d / 2];
  const p: Vec3[] = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
  const faces = [[0, 1, 2], [0, 2, 3], [4, 6, 5], [4, 7, 6], [0, 4, 5], [0, 5, 1], [3, 2, 6], [3, 6, 7], [0, 3, 7], [0, 7, 4], [1, 5, 6], [1, 6, 2]];
  return faces.flatMap((face) => face.flatMap((i) => p[i]));
}

/**
 * A closed cylinder standing on the plate, inside frame: top and bottom a fan round a point in the middle, or (`strips`)
 * long strips across as CAD gives them.
 */
function cylinder(radius: number, height: number, segments = 96, strips = false): number[] {
  const out: number[] = [];
  const tri = (a: Vec3, b: Vec3, c: Vec3) => out.push(...a, ...b, ...c);
  const at = (k: number, y: number): Vec3 => {
    const a = (2 * Math.PI * k) / segments;
    return [radius * Math.cos(a), y, radius * Math.sin(a)];
  };
  for (let k = 0; k < segments; k += 1) {
    tri(at(k, 0), at(k, height), at(k + 1, height));
    tri(at(k, 0), at(k + 1, height), at(k + 1, 0));
    if (strips) continue;
    tri([0, height, 0], at(k + 1, height), at(k, height));
    tri([0, 0, 0], at(k, 0), at(k + 1, 0));
  }
  if (strips) {
    // Zigzag between the two halves of the rim: every strip reaches across.
    let lo = 0, hi = segments - 1;
    for (let turn = true; hi - lo > 1; turn = !turn) {
      const [a, b, c] = turn ? [lo, lo + 1, hi] : [lo, hi - 1, hi];
      tri(at(a, height), at(c, height), at(b, height));
      tri(at(a, 0), at(b, 0), at(c, 0));
      if (turn) lo += 1;
      else hi -= 1;
    }
  }
  return out;
}

type Result = { vertices: Float32Array | Float64Array; indices: Uint32Array };

/** The points the triangles use (moving and merging leave others behind). */
function usedPoints(result: Result) {
  const used = new Set<number>(result.indices);
  return [...used].map((i): Vec3 => [result.vertices[i * 3], result.vertices[i * 3 + 1], result.vertices[i * 3 + 2]]);
}

function closed(result: Result) {
  return surfaceMeshReport(result.indices, result.vertices.length / 3);
}

/** How many points of a 40 mm box moved off each face (in or out), counted away from the edges. */
function boxMoves(result: Result) {
  const moved = { top: 0, bottom: 0, front: 0, back: 0, left: 0, right: 0 };
  const off = (a: number, plane: number) => (Math.abs(a - plane) > 1e-6 ? 1 : 0);
  // Away from the edges, so a point is plainly on one face.
  const inner = (a: number) => Math.abs(a) < 17;
  const middle = (y: number) => y > 3 && y < 37;
  for (const [x, y, z] of usedPoints(result)) {
    if (inner(x) && inner(z) && y > 37) moved.top += off(y, 40);
    else if (inner(x) && inner(z) && y < 3) moved.bottom += off(y, 0);
    else if (inner(x) && middle(y) && z > 17) moved.front += off(z, 20);
    else if (inner(x) && middle(y) && z < -17) moved.back += off(z, -20);
    else if (inner(z) && middle(y) && x > 17) moved.right += off(x, 20);
    else if (inner(z) && middle(y) && x < -17) moved.left += off(x, -20);
  }
  return moved;
}

describe("picked faces", () => {
  it("read faces by name or as a point with its normal, each once, and drop the rest", () => {
    const s = normalizeSurfaceTexture({
      faces: ["top", "front", "top", "nowhere", 7, { at: [0.5, 2, 0.5], normal: [0, 3, 0] }, { at: [0.5, 0.5], normal: [1, 0, 0] }, { at: [0.2, 0.5, 0.5], normal: [0, 0, 0] }],
    });
    expect(s.faces).toEqual([
      { at: [0.5, 1, 0.5], normal: [0, 1, 0] },
      { at: [0.5, 0.5, 1], normal: [0, 0, 1] },
      { at: [0.5, 1.05, 0.5], normal: [0, 1, 0] },
    ]);
    expect(normalizeSurfaceTexture({}).faces).toEqual([]);
    expect(normalizeSurfaceTexture({ faces: Array.from({ length: 100 }, (_, k) => ({ at: [k / 100, 0.5, 0.5], normal: [1, 0, 0] })) }).faces).toHaveLength(SURFACE_TEXTURE_MAX_FACES);
  });

  it("find a face as the region within the sharp edges round its point", () => {
    const base = prepareSurfaceBase(insideToScreenPositions(cylinder(15, 30)));
    const count = (faces: unknown) => surfaceTextureChosenTriangles(base, normalizeSurfaceTexture({ faces }).faces, 30).reduce((sum, c) => sum + c, 0);
    // 96 triangles in the top's fan, 192 round the mantle.
    expect(count(["top"])).toBe(96);
    expect(count([{ at: [1, 0.5, 0.5], normal: [1, 0, 0] }])).toBe(192);
    expect(count(["top", "bottom", "left"])).toBe(384);
  });

  it("toggle a face with a click: in, out again, and another one beside it", () => {
    const pick = surfaceTextureFacePick(box(40, 40, 40));
    // The face of the triangles facing a way (the pick's normals in the screen frame: z up).
    const facing = (axis: number) => pick.triangleFaces[Array.from(pick.triangleFaces.keys()).find((t) => pick.normals[t * 3 + axis] > 0.99)!];
    const top = facing(2), right = facing(0);
    expect(top).not.toBe(right);
    const once = toggleSurfaceTexturePickedFace(pick, [], top);
    expect(surfaceTexturePickedFaceIds(pick, once)).toEqual([top]);
    // The same face as given by name.
    expect(surfaceTexturePickedFaceIds(pick, normalizeSurfaceTexture({ faces: ["top", "right"] }).faces)).toEqual([top, right]);
    expect(toggleSurfaceTexturePickedFace(pick, once, top)).toEqual([]);
    const two = toggleSurfaceTexturePickedFace(pick, once, right);
    expect(surfaceTexturePickedFaceIds(pick, two)).toEqual([top, right]);
    expect(toggleSurfaceTexturePickedFace(pick, two, top)).toEqual([two[1]]);
  });

  it("texture only the top of a box, the other faces stay as they were", () => {
    const result = applySurfaceTexture(box(40, 40, 40), { faces: ["top"] });
    expect(closed(result)).toMatchObject({ openEdges: 0, nonManifoldEdges: 0, shells: 1 });
    const moved = boxMoves(result);
    expect(moved.top).toBeGreaterThan(100);
    expect([moved.bottom, moved.front, moved.back, moved.left, moved.right]).toEqual([0, 0, 0, 0, 0]);
    // The sides were not refined for nothing.
    expect(result.stats.triangles).toBeLessThan(10_000);
  }, 60_000);

  it("texture the top and the front of a box together", () => {
    const result = applySurfaceTexture(box(40, 40, 40), { pattern: "rope", faces: ["top", "front"] });
    expect(closed(result)).toMatchObject({ openEdges: 0, nonManifoldEdges: 0, shells: 1 });
    const moved = boxMoves(result);
    expect(moved.top).toBeGreaterThan(100);
    expect(moved.front).toBeGreaterThan(100);
    expect([moved.bottom, moved.back, moved.left, moved.right]).toEqual([0, 0, 0, 0]);
  }, 60_000);

  it("texture a cylinder's mantle alone: top and bottom stay flat", () => {
    const result = applySurfaceTexture(cylinder(15, 30), { pattern: "bumps", faces: [{ at: [1, 0.5, 0.5], normal: [1, 0, 0] }] });
    expect(closed(result)).toMatchObject({ openEdges: 0, nonManifoldEdges: 0, shells: 1 });
    let mantle = 0;
    for (const [x, y, z] of usedPoints(result)) {
      const r = Math.hypot(x, z);
      if (r < 13) expect(Math.min(Math.abs(y), Math.abs(y - 30))).toBeLessThan(1e-6);
      else if (y > 3 && y < 27 && Math.abs(r - 15) > 0.05) mantle += 1;
    }
    expect(mantle).toBeGreaterThan(1000);
  }, 60_000);

  it("texture a cylinder's top flat or in rings, not in rays round the axis, with a clean rim", () => {
    for (const pattern of ["knurl", "grooves", "honeycomb", "bumps"]) {
      const result = applySurfaceTexture(cylinder(15, 30), { pattern, faces: ["top"] });
      expect(closed(result)).toMatchObject({ openEdges: 0, nonManifoldEdges: 0, shells: 1 });
      let top = 0;
      for (const [x, y, z] of usedPoints(result)) {
        const r = Math.hypot(x, z);
        // The mantle stays as it was.
        if (y > 1 && y < 29) expect(Math.abs(r - 15)).toBeLessThan(1e-6);
        // Inside the fade at the rim the top stays at its height; further in the pattern goes down to its depth.
        if (y > 25 && r > 14.2 + 1e-6) expect(y).toBeCloseTo(30, 6);
        if (y > 25 && y < 30 - 1e-6) top += 1;
        if (y > 25) expect(y).toBeGreaterThan(30 - 0.6 - 1e-6);
      }
      expect(top, pattern).toBeGreaterThan(100);
      // Nothing goes round the axis: the status line does not count grooves round.
      expect(result.stats.around).toBeNull();
    }
  }, 120_000);

  it("give a picked bottom the pattern, also a raised one", () => {
    // Rope stands out of the body: on a picked bottom it reaches below the bed on purpose, as with the bottom not kept
    // smooth (before, it was pressed flat onto the bed again and the bottom stayed plain).
    const onBox = applySurfaceTexture(box(40, 40, 40), { pattern: "rope", faces: ["bottom"] });
    expect(closed(onBox)).toMatchObject({ openEdges: 0, nonManifoldEdges: 0, shells: 1 });
    expect(onBox.stats.bedClamped).toBe(0);
    expect(usedPoints(onBox).filter(([, y]) => y < -0.1).length).toBeGreaterThan(1000);
    const moved = boxMoves(onBox);
    expect([moved.top, moved.front, moved.back, moved.left, moved.right]).toEqual([0, 0, 0, 0, 0]);
    const onCylinder = applySurfaceTexture(cylinder(15, 30), { pattern: "rope", faces: ["bottom"] });
    expect(closed(onCylinder)).toMatchObject({ openEdges: 0, nonManifoldEdges: 0, shells: 1 });
    expect(usedPoints(onCylinder).filter(([, y]) => y < -0.1).length).toBeGreaterThan(1000);
    // The top stays as it was.
    for (const [x, y, z] of usedPoints(onCylinder)) if (y > 15 && Math.hypot(x, z) < 13) expect(y).toBeCloseTo(30, 9);
  }, 60_000);

  it("texture a cylinder's top and mantle together", () => {
    const result = applySurfaceTexture(cylinder(15, 30), { pattern: "bumps", faces: ["top", { at: [1, 0.5, 0.5], normal: [1, 0, 0] }] });
    expect(closed(result)).toMatchObject({ openEdges: 0, nonManifoldEdges: 0, shells: 1 });
    let top = 0, mantle = 0;
    for (const [x, y, z] of usedPoints(result)) {
      const r = Math.hypot(x, z);
      if (r < 13 && y > 15 && Math.abs(y - 30) > 0.05) top += 1;
      if (y > 3 && y < 27 && Math.abs(r - 15) > 0.05) mantle += 1;
    }
    expect(top).toBeGreaterThan(500);
    expect(mantle).toBeGreaterThan(1000);
  }, 60_000);

  it("end cells on a cylinder's mantle in a short wall at the rims too, with the top picked", () => {
    // Faded out over the mantle's long triangles from the rim down, the joints' ends crumpled there.
    const result = applySurfaceTexture(cylinder(15, 20), { pattern: "cells", fade: 1, margin: 0, faces: ["top", { at: [1, 0.5, 0.5], normal: [1, 0, 0] }] });
    expect(closed(result)).toMatchObject({ openEdges: 0, nonManifoldEdges: 0, shells: 1 });
    let still = 0;
    for (const [x, y, z] of usedPoints(result)) {
      const r = Math.hypot(x, z);
      // On the mantle (the top's own wall stays further in than 14.2).
      if (r < 14.2 || y < 1e-6 || y > 19.95) continue;
      if (Math.min(y, 20 - y) < 0.84) {
        still += 1;
        expect(15 - r, `${x} ${y} ${z}`).toBeLessThan(0.01);
      }
    }
    expect(still).toBeGreaterThan(100);
  }, 60_000);

  it("end knurling on a cylinder's mantle in a short wall at both rims, with the top picked too", () => {
    // A coin: knurled on its top and round its side. The side faded out in splinters at its rims, not in the wall it
    // ends in alone (see endsInWall).
    const result = applySurfaceTexture(cylinder(15, 6), { pattern: "knurl", depth: 0.6, fade: 1, margin: 0, faces: ["top", { at: [1, 0.5, 0.5], normal: [1, 0, 0] }] });
    expect(closed(result)).toMatchObject({ openEdges: 0, nonManifoldEdges: 0, shells: 1 });
    let still = 0, full = 0;
    for (const [x, y, z] of usedPoints(result)) {
      const r = Math.hypot(x, z);
      // On the mantle (the top's cut stays a fade's width inside the rim).
      if (r < 14.3 || y < 1e-6 || y > 6 - 1e-6) continue;
      const fromRim = Math.min(y, 6 - y);
      // Within the wall's foot of either rim nothing is cut in (the segments' chords lie up to 0.01 inside); at its
      // top, a fade's width from the rim, full deep.
      if (fromRim < 0.84) {
        still += 1;
        expect(15 - r, `${x} ${y} ${z}`).toBeLessThan(0.01);
      }
      if (Math.abs(fromRim - 1) < 0.01 && 15 - r > 0.5) full += 1;
    }
    expect(still).toBeGreaterThan(100);
    expect(full).toBeGreaterThan(20);
  }, 60_000);
});

describe("faces that stay smooth stay coarse", () => {
  it("keep the smooth top and bottom of a box with bumps at a few triangles", () => {
    // Each face on its own, bumps near the border are left off whole; along the outline they run up to the rims, whose
    // points the top and bottom take in.
    for (const [projection, most] of [["allRound", 200], ["auto", 1000]] as const) {
      const result = applySurfaceTexture(box(40, 40, 40), { pattern: "bumps", projection });
      expect(closed(result)).toMatchObject({ openEdges: 0, nonManifoldEdges: 0, shells: 1 });
      let flat = 0;
      for (let t = 0; t < result.indices.length; t += 3) {
        const ys = [0, 1, 2].map((k) => result.vertices[result.indices[t + k] * 3 + 1]);
        if (ys.every((y) => Math.abs(y - 40) < 1e-9) || ys.every((y) => Math.abs(y) < 1e-9)) flat += 1;
      }
      expect(flat, projection).toBeLessThan(most);
    }
  }, 60_000);

  it("merge points inside flat pieces and along straight creases, without moving any", () => {
    // A cylinder's mantle and caps cut into a fine grid: every facet flat, the creases between them straight.
    const base = prepareSurfaceBase(insideToScreenPositions(cylinder(15, 30, 32)));
    const fine = subdivide(base, 1, 1e6);
    const merged = mergeFlatPoints(fine.vertices, fine.indices);
    expect(merged.merged).toBeGreaterThan(0);
    expect(surfaceMeshReport(merged.indices, fine.vertices.length / 3)).toMatchObject({ openEdges: 0, nonManifoldEdges: 0, shells: 1 });
    // Back to about as coarse as it came in: 32 facets of two, two fans of 32 (each kept point of the rims adds a few).
    expect(merged.indices.length / 3).toBeLessThan(fine.indices.length / 3 / 20);
    // The same volume, so nothing moved out of its surface.
    const volume = (I: Uint32Array) => {
      let sum = 0;
      const v = fine.vertices;
      for (let t = 0; t < I.length; t += 3) {
        const [a, b, c] = [I[t] * 3, I[t + 1] * 3, I[t + 2] * 3];
        sum += v[a] * (v[b + 1] * v[c + 2] - v[b + 2] * v[c + 1]) - v[a + 1] * (v[b] * v[c + 2] - v[b + 2] * v[c]) + v[a + 2] * (v[b] * v[c + 1] - v[b + 1] * v[c]);
      }
      return sum / 6;
    };
    expect(volume(merged.indices)).toBeCloseTo(volume(fine.indices), 6);
  });
});

describe("round tops in rings, and the direction on top and bottom", () => {
  it("lay grooves on a round top in rings round the middle, picked or not kept smooth", () => {
    // With the mantle grooved too, the edge kept sharp: its slanted grooves would run on over the top (see capEdge).
    for (const settings of [{ faces: ["top"] }, { topFree: 0, capEdge: "sharp" }]) {
      const result = applySurfaceTexture(cylinder(15, 30, 96, true), { pattern: "grooves", ...settings });
      expect(closed(result)).toMatchObject({ openEdges: 0, nonManifoldEdges: 0, shells: 1 });
      const P = result.stats.spacing;
      let inGroove = 0;
      for (const [x, y, z] of usedPoints(result)) {
        const r = Math.hypot(x, z);
        if (y < 25 || r > 13) continue;
        // Pointed grooves 0.6 deep, the share 0.6 of the spacing wide, their middles half a spacing apart from the middle out.
        const t = r / P;
        const expected = 0.6 * surfaceFalloff(Math.abs(t - Math.floor(t) - 0.5) / 0.3, "pointed");
        expect(30 - y).toBeCloseTo(expected, 2);
        if (expected > 0.5) inGroove += 1;
      }
      expect(inGroove).toBeGreaterThan(100);
    }
  }, 120_000);

  it("close rope and knitting in rings round the middle, and leave the mantle as it was", () => {
    const layout: SurfaceTextureLayout = { projection: "cylinder", period: 3, cell: 6, around: 21, angle: 0, center: [0, 0], radius: 20, rMin: 20, rMax: 20, flatCaps: true };
    for (const pattern of ["rope", "knit"]) {
      const s = normalizeSurfaceTexture({ pattern, projection: "cylinder", axis: "z" });
      const top = (r: number, a: number) => surfaceTextureValueAt(r * Math.cos(a), r * Math.sin(a), 30, 0, 0, 1, s, layout);
      let across = 0, round = 0;
      for (let r = 0.5; r < 19; r += 0.37) {
        // No seam where the angle comes round.
        expect(top(r, Math.PI - 1e-9), `${pattern} at ${r}`).toBeCloseTo(top(r, -Math.PI + 1e-9), 6);
        across = Math.max(across, Math.abs(top(r + 0.5, 0.3) - top(r, 0.3)));
        round = Math.max(round, Math.abs(top(r, 0.3) - top(r, 0.3 + 2 / r)));
      }
      // It changes both outwards (the rings) and round (strands, stitches).
      expect(across).toBeGreaterThan(0.3);
      expect(round).toBeGreaterThan(0.3);
      const mantle = surfaceTextureValueAt(20, 0, 15, 1, 0, 0, s, layout);
      expect(mantle).toBeCloseTo(surfaceTextureValueAt(20, 0, 15, 1, 0, 0, s, { ...layout, flatCaps: false }), 12);
    }
  });

  it("refine a round top given in long strips into well-shaped triangles, not slivers", () => {
    // Halving alone kept the strips' shape: rope made 81 000 triangles on this top and knitting 259 000, frayed along them.
    for (const [pattern, most] of [["rope", 50_000], ["knit", 150_000]] as const) {
      const result = applySurfaceTexture(cylinder(20, 30, 96, true), { pattern, faces: ["top"] });
      expect(closed(result)).toMatchObject({ openEdges: 0, nonManifoldEdges: 0, shells: 1 });
      expect(result.indices.length / 3, pattern).toBeLessThan(most);
      expect(usedPoints(result).filter(([, y]) => y > 30.2).length, pattern).toBeGreaterThan(1000);
    }
  }, 120_000);

  it("turn the pattern on the faces seen along the axis, and only there", () => {
    const layout: SurfaceTextureLayout = { projection: "allRound", period: 6, cell: 6, around: null, angle: 30, center: [0, 0], radius: 20, rMin: 20, rMax: 20 };
    for (const pattern of ["rope", "knit", "bumps", "grooves", "weave"]) {
      for (const projection of ["allRound", "flat"]) {
        const s = normalizeSurfaceTexture({ pattern, projection, axis: "z" });
        const turned = { ...s, faceTurn: 90 };
        for (const [x, y] of [[1.3, 2.9], [-7.1, 4.4], [12.5, -3.3]]) {
          // A quarter turn counterclockwise seen from above: what lay at (y, -x) now lies at (x, y).
          expect(surfaceTextureValueAt(x, y, 30, 0, 0, 1, turned, layout), `${pattern} ${projection}`).toBeCloseTo(surfaceTextureValueAt(y, -x, 30, 0, 0, 1, s, layout), 9);
          if (projection === "allRound") expect(surfaceTextureValueAt(20, x, y, 1, 0, 0, turned, layout)).toBe(surfaceTextureValueAt(20, x, y, 1, 0, 0, s, layout));
        }
      }
    }
  });

  it("run a pattern standing out right up to the edge, over a finely refined run-out", () => {
    // Rope 3 mm high came down over a few long triangles at the edge, frayed; it runs out over the fade (1 mm) up to the
    // edge, which stays where it was.
    for (const [name, input, onTop] of [
      ["box", box(40, 30, 40), (x: number, z: number) => 20 - Math.max(Math.abs(x), Math.abs(z))],
      ["cylinder", cylinder(20, 30, 96, true), (x: number, z: number) => 20 - Math.hypot(x, z)],
    ] as const) {
      const result = applySurfaceTexture(input, { pattern: "rope", faces: ["top"] });
      expect(closed(result)).toMatchObject({ openEdges: 0, nonManifoldEdges: 0, shells: 1 });
      const v = result.vertices, I = result.indices;
      let nearEdge = 0;
      for (const [x, y, z] of usedPoints(result)) {
        if (y < 29.9) continue;
        const edge = onTop(x, z);
        if (edge < 0.02) expect(y - 30, `${name} on the edge`).toBeLessThan(0.05);
        // Just past the run-out the rope stands high (round a cylinder its rings lie as they fall at the rim).
        if (edge > 1 && edge < 2) nearEdge = Math.max(nearEdge, y - 30);
      }
      expect(nearEdge, name).toBeGreaterThan(2);
      // In the run-out the triangles are about a quarter of the fade across (the grid elsewhere: 0.8 mm).
      let inRunOut = 0;
      for (let t = 0; t < I.length; t += 3) {
        const p = [0, 1, 2].map((k) => [v[I[t + k] * 3], v[I[t + k] * 3 + 1], v[I[t + k] * 3 + 2]]);
        if (p.some(([, y]) => y < 29.9)) continue;
        const middle = onTop((p[0][0] + p[1][0] + p[2][0]) / 3, (p[0][2] + p[1][2] + p[2][2]) / 3);
        if (middle < 0.1 || middle > 0.9) continue;
        inRunOut += 1;
        for (let k = 0; k < 3; k += 1) {
          const [a, b] = [p[k], p[(k + 1) % 3]];
          expect(Math.hypot(a[0] - b[0], a[2] - b[2]), name).toBeLessThan(0.4);
        }
      }
      expect(inRunOut, name).toBeGreaterThan(500);
    }
  }, 120_000);

  it("run rope on a box's top along the front edge, and turned along the side edge", () => {
    /** How much the top's height changes from row to row of 1 mm across `axis` (0: x, 2: z), averaged along it. */
    const rowSpread = (result: Result, axis: 0 | 2) => {
      const rows = new Map<number, number[]>();
      for (const p of usedPoints(result)) {
        if (p[1] < 39 || Math.abs(p[0]) > 15 || Math.abs(p[2]) > 15) continue;
        const key = Math.floor(p[axis]);
        rows.set(key, [...(rows.get(key) ?? []), p[1]]);
      }
      const means = [...rows.values()].map((ys) => ys.reduce((a, b) => a + b, 0) / ys.length);
      const mean = means.reduce((a, b) => a + b, 0) / means.length;
      return Math.sqrt(means.reduce((a, b) => a + (b - mean) ** 2, 0) / means.length);
    };
    const along = applySurfaceTexture(box(40, 40, 40), { pattern: "rope", faces: ["top"] });
    const turned = applySurfaceTexture(box(40, 40, 40), { pattern: "rope", faces: ["top"], faceTurn: 90 });
    expect(closed(turned)).toMatchObject({ openEdges: 0, nonManifoldEdges: 0, shells: 1 });
    // The rings of rope lie along the front edge (x): rows across z differ, rows across x hardly.
    expect(rowSpread(along, 2)).toBeGreaterThan(2 * rowSpread(along, 0));
    expect(rowSpread(turned, 0)).toBeGreaterThan(2 * rowSpread(turned, 2));
  }, 120_000);
});
