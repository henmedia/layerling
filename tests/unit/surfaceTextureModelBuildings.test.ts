import { describe, expect, it } from "vitest";
import {
  applySurfaceTexture,
  insideToScreenPositions,
  makeSurfaceTextureLayout,
  normalizeSurfaceTexture,
  SURFACE_TEXTURE_TIMBER_BRACINGS,
  surfaceTexturePositions,
  surfaceTextureValueAt,
  type SurfaceTextureResult,
} from "@/lib/surfaceTexture";
import { prepareSurfaceBase, surfaceMeshReport } from "@/lib/surfaceTextureMesh";
import { analyzeTriangleSoup } from "@/lib/svgImport";

/**
 * Half-timbering and a natural stone wall, for model buildings: beams standing out of plaster in the fields the bracing
 * asks for, and stones of rough sizes in rough courses standing out of their mortar - broken stone to field stone.
 */

type Vec3 = [number, number, number];

/** A closed box standing on the plate, inside frame (y up), faces wound outward. */
function box(w: number, h: number, d: number): number[] {
  const [x0, x1, y0, y1, z0, z1] = [-w / 2, w / 2, 0, h, -d / 2, d / 2];
  const p: Vec3[] = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
  const faces = [[0, 1, 2], [0, 2, 3], [4, 6, 5], [4, 7, 6], [0, 4, 5], [0, 5, 1], [3, 2, 6], [3, 6, 7], [0, 3, 7], [0, 7, 4], [1, 5, 6], [1, 6, 2]];
  return faces.flatMap((face) => face.flatMap((i) => p[i]));
}

/** A closed cylinder standing on the plate (inside frame, y up), one row of tall triangles up the wall. */
function cylinder(radius: number, height: number, segments = 96): number[] {
  const out: number[] = [];
  const tri = (a: Vec3, b: Vec3, c: Vec3) => out.push(...a, ...b, ...c);
  const at = (k: number, y: number): Vec3 => {
    const a = (2 * Math.PI * k) / segments;
    return [radius * Math.cos(a), y, radius * Math.sin(a)];
  };
  for (let k = 0; k < segments; k += 1) {
    tri(at(k, 0), at(k, height), at(k + 1, height));
    tri(at(k, 0), at(k + 1, height), at(k + 1, 0));
    tri([0, height, 0], at(k + 1, height), at(k, height));
    tri([0, 0, 0], at(k, 0), at(k + 1, 0));
  }
  return out;
}

function volume(positions: ArrayLike<number>) {
  let sum = 0;
  for (let i = 0; i < positions.length; i += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = Array.from({ length: 9 }, (_, k) => positions[i + k]);
    sum += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  return sum;
}

/** Closed, every edge between two faces of opposite ways; the textured body also without triangles of no area. */
function expectClosed(body: Pick<SurfaceTextureResult, "vertices" | "indices">, part = false) {
  expect(surfaceMeshReport(body.indices, body.vertices.length / 3)).toMatchObject({ openEdges: 0, nonManifoldEdges: 0 });
  const soup = analyzeTriangleSoup(surfaceTexturePositions(body));
  expect(soup.boundaryEdges).toBe(0);
  expect(soup.nonManifoldEdges).toBe(0);
  if (!part) expect(soup.degenerateTriangles).toBe(0);
  expect(volume(surfaceTexturePositions(body))).toBeGreaterThan(0);
}

/** The pattern's value on the front of a 72 x 45 x 10 box (screen frame: x across, z up, the front facing -y). */
function onFront(settings: Record<string, unknown>, size: Vec3 = [72, 45, 10]) {
  const s = normalizeSurfaceTexture({ projection: "allRound", ...settings });
  const layout = makeSurfaceTextureLayout(prepareSurfaceBase(insideToScreenPositions(box(...size))), s);
  return { s, layout, at: (x: number, z: number) => surfaceTextureValueAt(x, -size[2] / 2, z, 0, -1, 0, s, layout) };
}

/** The pattern's value round a cylinder standing on the plate, at `u` mm round from the +x side and `z` mm up. */
function roundCylinder(settings: Record<string, unknown>, radius = 20, height = 40) {
  const s = normalizeSurfaceTexture({ projection: "cylinder", ...settings });
  const layout = makeSurfaceTextureLayout(prepareSurfaceBase(insideToScreenPositions(cylinder(radius, height))), s);
  const R = layout.radius;
  return { s, layout, R, at: (u: number, z: number) => surfaceTextureValueAt(R * Math.cos(u / R), R * Math.sin(u / R), z, Math.cos(u / R), Math.sin(u / R), 0, s, layout) };
}

/** Per point of a textured body the points it shares an edge with. */
function neighbours(body: Pick<SurfaceTextureResult, "vertices" | "indices">) {
  const out: Set<number>[] = Array.from({ length: body.vertices.length / 3 }, () => new Set());
  const I = body.indices;
  for (let t = 0; t < I.length; t += 3) {
    for (let k = 0; k < 3; k += 1) {
      out[I[t + k]].add(I[t + ((k + 1) % 3)]);
      out[I[t + k]].add(I[t + ((k + 2) % 3)]);
    }
  }
  return out;
}

/**
 * Points of a textured body standing out from all the points round them, or sunk below them, by more than `limit` mm as
 * `offset` measures how far each lies outside the body as it was: spikes a beam's or a stone's face does not have. Only
 * the points `where` says.
 */
function spikes(body: Pick<SurfaceTextureResult, "vertices" | "indices">, offset: (x: number, y: number, z: number) => number, limit: number, where: (x: number, y: number, z: number) => boolean = () => true) {
  const v = body.vertices;
  const off = Array.from({ length: v.length / 3 }, (_, i) => offset(v[i * 3], v[i * 3 + 1], v[i * 3 + 2]));
  return neighbours(body).filter((around, i) => {
    if (!around.size || !where(v[i * 3], v[i * 3 + 1], v[i * 3 + 2])) return false;
    const near = [...around].map((j) => off[j]);
    return off[i] - Math.max(...near) > limit || Math.min(...near) - off[i] > limit;
  }).length;
}

describe("half-timbering", () => {
  it("knows its settings, starts standing out at model-building sizes, and keeps them within their limits", () => {
    expect(normalizeSurfaceTexture({ pattern: "timber" })).toMatchObject({
      spacing: 12, depth: 0.8, direction: "outward", keepEdges: false, timberHeight: 30, timberBeam: 2.4, timberRails: 1, timberBracing: "mixed", timberGrain: true,
    });
    expect(normalizeSurfaceTexture({ pattern: "timber", timberRails: 3.7, timberBracing: "diagonal", timberBeam: 0, timberHeight: 1000, timberGrain: "false" }))
      .toMatchObject({ timberRails: 2, timberBracing: "mixed", timberBeam: 0.3, timberHeight: 300, timberGrain: false });
    expect(normalizeSurfaceTexture({ pattern: "timber", timberRails: 1.4 }).timberRails).toBe(1);
    expect(normalizeSurfaceTexture({ pattern: "timber", timberRails: -2 }).timberRails).toBe(0);
    expect(SURFACE_TEXTURE_TIMBER_BRACINGS.map((bracing) => normalizeSurfaceTexture({ pattern: "timber", timberBracing: bracing }).timberBracing)).toEqual([...SURFACE_TEXTURE_TIMBER_BRACINGS]);
    // Leaving it, a pattern is told nothing of it: knurling's own values.
    expect(normalizeSurfaceTexture({ pattern: "knurl" })).toMatchObject({ spacing: 3, depth: 0.6, direction: "inward", keepEdges: true });
  });

  it("fits whole panels from edge to edge and whole storeys from the bottom edge up, the beams on the edges", () => {
    const { layout } = onFront({ pattern: "timber" });
    const t = layout.timber!;
    // 72 mm across: six panels of 11.6 mm between the posts' middles, the outer posts' faces on the edges.
    expect(t.posts[0].count).toBe(6);
    expect(t.posts[0].cell).toBeCloseTo((72 - 2.4) / 6, 9);
    expect(t.posts[0].origin).toBeCloseTo(-36 + 1.2, 9);
    // 45 mm up, the top and bottom kept smooth: the sill and the plate a fade (1 mm) in from them, one storey.
    expect(t.storeys[2].count).toBe(1);
    expect(t.storeys[2].origin).toBeCloseTo(1 + 1.2, 9);
    expect(t.storeys[2].height).toBeCloseTo(45 - 2 - 2.4, 9);
    // 100 mm high: three storeys of 31.9 mm rather than two of 47.8.
    const tall = onFront({ pattern: "timber" }, [72, 100, 10]).layout.timber!;
    expect(tall.storeys[2].count).toBe(3);
  });

  it("raises the beams over the plaster: posts, sill, plate and rails", () => {
    const { at, layout } = onFront({ pattern: "timber", timberBracing: "none", timberGrain: false });
    const { origin: x0, cell: W } = layout.timber!.posts[0];
    const { origin: z0, height: H } = layout.timber!.storeys[2];
    for (const k of [0, 3, 6]) {
      expect(at(x0 + k * W, z0 + 0.3 * H)).toBe(1);
      // Half a beam from a post's middle line the face ends, its wall a tenth of a millimetre further.
      expect(at(x0 + k * W + (k === 6 ? -1.15 : 1.15), z0 + 0.3 * H)).toBe(1);
    }
    expect(at(x0 + 1.5 * W, z0)).toBe(1);
    expect(at(x0 + 1.5 * W, z0 + H)).toBe(1);
    expect(at(x0 + 1.5 * W, z0 + H / 2)).toBe(1);
    // The plaster lies lower: a little rough, never more than 8 % of the beams' height.
    const plaster: number[] = [];
    for (let k = 0; k < 6; k += 1) for (const f of [0.25, 0.75]) plaster.push(at(x0 + (k + 0.5) * W, z0 + f * H));
    plaster.forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(0.08);
    });
    expect(new Set(plaster.map((value) => value.toFixed(5))).size).toBeGreaterThan(3);
    // As a part of its own the plaster is the body's face, as it was: flat.
    const part = onFront({ pattern: "timber", timberBracing: "none", patternPart: true });
    expect(part.at(x0 + 0.5 * W, z0 + 0.25 * H)).toBe(0);
    // No rails: the middle of a storey is plaster; two: at a third and two thirds of it.
    expect(onFront({ pattern: "timber", timberBracing: "none", timberRails: 0 }).at(x0 + 0.5 * W, z0 + H / 2)).toBeLessThan(0.1);
    const two = onFront({ pattern: "timber", timberBracing: "none", timberRails: 2 });
    expect(two.at(x0 + 0.5 * W, z0 + H / 3)).toBe(1);
    expect(two.at(x0 + 0.5 * W, z0 + (2 * H) / 3)).toBe(1);
    expect(two.at(x0 + 0.5 * W, z0 + H / 2)).toBeLessThan(0.1);
  });

  it("braces its fields as the bracing says, braces leaning towards the middle from both ends", () => {
    const fields = (bracing: string) => {
      const { at, layout } = onFront({ pattern: "timber", timberBracing: bracing, timberGrain: false });
      const { origin: x0, cell: W } = layout.timber!.posts[0];
      const { origin: z0, height: H } = layout.timber!.storeys[2];
      const h = H / 2;
      // In field i, in the part q (0 under the rail): on the rising and the falling diagonal, and on the knee braces.
      return Array.from({ length: 6 }, (_, i) => {
        const x = (f: number) => x0 + (i + f) * W;
        const on = (f: number, part: number) => at(x(f), z0 + part * h) > 0.9;
        // A quarter along a field: the rising diagonal a quarter up its part, the falling one three quarters up.
        const rising = on(0.25, 0.25) && on(0.25, 1.25);
        const falling = on(0.25, 0.75) && on(0.25, 1.75);
        const cross = on(0.25, 0.25) && on(0.25, 0.75) && !on(0.25, 1.25) && !on(0.25, 1.75);
        const knees = on(0.175, 1.825) && on(0.825, 1.825) && !on(0.5, 1.5);
        return cross ? "x" : knees ? "k" : rising ? "/" : falling ? "\\" : !on(0.25, 0.25) && !on(0.25, 0.75) ? "-" : "?";
      }).join("");
    };
    expect(fields("none")).toBe("------");
    expect(fields("braces")).toBe("///\\\\\\");
    expect(fields("cross")).toBe("xxxxxx");
    expect(fields("knee")).toBe("kkkkkk");
    // Mixed, as the concept: braces at the ends, then crosses and knee braces in turn towards the middle.
    expect(fields("mixed")).toBe("/xkkx\\");
    // An odd number of fields: the middle one stays open with braces, five fields mixed as the concept picture.
    const five = onFront({ pattern: "timber", timberBracing: "braces", timberGrain: false }, [60, 45, 10]);
    expect(five.layout.timber!.posts[0].count).toBe(5);
    const { origin: x0, cell: W } = five.layout.timber!.posts[0];
    const { origin: z0, height: H } = five.layout.timber!.storeys[2];
    expect(five.at(x0 + 2.5 * W, z0 + H / 4)).toBeLessThan(0.1);
    expect(five.at(x0 + 0.5 * W, z0 + H / 4)).toBe(1);
    expect(five.at(x0 + 4.25 * W, z0 + (3 * H) / 8)).toBe(1);
  });

  it("gives the beams a faint grain that comes and goes, or none", () => {
    const grained = onFront({ pattern: "timber", timberBracing: "none" });
    const plain = onFront({ pattern: "timber", timberBracing: "none", timberGrain: false });
    const { origin: x0 } = grained.layout.timber!.posts[0];
    // Along a post at the grain's groove, 0.45 of half a beam from its middle.
    const along = (at: (x: number, z: number) => number) => Array.from({ length: 300 }, (_, k) => at(x0 + 0.54, 3 + k * 0.12));
    const lowest = Math.min(...along(grained.at));
    expect(lowest).toBeLessThan(0.97);
    expect(lowest).toBeGreaterThanOrEqual(1 - 0.08 - 1e-9);
    expect(along(grained.at).filter((value) => value === 1).length).toBeGreaterThan(30);
    expect(along(plain.at).every((value) => value === 1)).toBe(true);
  });

  it("goes round a cylinder in whole fields, as many as the bracing needs, with nothing jumping at the seam", () => {
    // 21 mm round, crosses: eleven fields, so the seam runs through one's plaster and across its sill, rail and plate.
    for (const [bracing, step, radius] of [["mixed", 4, 20], ["braces", 2, 20], ["cross", 1, 21]] as const) {
      const { layout, R, at } = roundCylinder({ pattern: "timber", timberBracing: bracing }, radius);
      const t = layout.timber!;
      expect(t.around.count % step).toBe(0);
      if (step === 1) expect(t.around.count % 2).toBe(1);
      expect(t.around.cell * t.around.count).toBeCloseTo(2 * Math.PI * R, 9);
      expect(layout.around).toBe(t.around.count);
      // Just before and just after the seam (at u = ±πR), all the way up, grain and plaster as well.
      for (let z = 2; z < 38; z += 0.37) expect(Math.abs(at(Math.PI * R - 1e-7, z) - at(-Math.PI * R + 1e-7, z))).toBeLessThan(1e-5);
    }
  });

  it("frames a box's corners whole: a corner post meets the sill and the plate, beside it and beyond their middle lines", () => {
    // The front's frame, the top and bottom kept smooth (as they start) and with them patterned, no fade: at its four
    // corners the end post and the sill or plate overlap in a square beyond both their middle lines. It belongs to both.
    // Without grain, and as a part of its own the plaster is flat: the beams' faces and walls alone.
    for (const settings of [{}, { topFree: 0, bottomFree: 0, fade: 0 }]) {
      const { at, layout } = onFront({ pattern: "timber", timberGrain: false, patternPart: true, ...settings }, [78.8, 58.6, 42.9]);
      const { origin: x0, cell: W, count: fields } = layout.timber!.posts[0];
      const { origin: z0, height: H, count: storeys } = layout.timber!.storeys[2];
      const x1 = x0 + fields * W, z1 = z0 + storeys * H;
      for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
        const outX = Math.sign(x - (x0 + x1) / 2), outZ = Math.sign(z - (z0 + z1) / 2);
        for (const f of [0.05, 0.5, 0.95]) for (const g of [0.05, 0.5, 0.95]) expect(at(x + outX * f * 1.2, z + outZ * g * 1.2)).toBe(1);
        // Beyond the post's or the plate's outer face their walls run on round the corner, as beside it.
        expect(at(x + outX * 1.25, z + outZ * 0.6)).toBeCloseTo(0.5, 9);
        expect(at(x - outX * 0.6, z + outZ * 1.25)).toBeCloseTo(0.5, 9);
        expect(at(x + outX * 1.25, z + outZ * 1.25)).toBeCloseTo(0.5, 9);
        expect(at(x + outX * 1.26, z + outZ * 1.25)).toBeCloseTo(0.4, 9);
      }
    }
  });

  it("stands out by the beams' height all along a box's edges, its corners too (reported on a 78.8 x 42.9 x 58.6 box)", () => {
    // In the inside frame (y up): 78.8 long, 58.6 high, 42.9 deep. Every point within a millimetre of an edge lies on a
    // corner post, a sill or a plate (a beam is 2.4 mm wide): it stands out by the depth, less the grain's 8 % at most.
    const [w, h, d] = [78.8, 58.6, 42.9];
    const outside = (x: number, y: number, z: number) => Math.max(Math.abs(x) - w / 2, y - h, -y, Math.abs(z) - d / 2);
    for (const [settings, smooth] of [[{ topFree: 0, bottomFree: 0, fade: 0 }, 0], [{}, 1.05]] as const) {
      const result = applySurfaceTexture(box(w, h, d), { pattern: "timber", ...settings });
      expectClosed(result);
      const v = result.vertices;
      const used = new Uint8Array(v.length / 3);
      for (const i of result.indices) used[i] = 1;
      const heights: number[] = [];
      for (let i = 0; i < v.length / 3; i += 1) {
        if (!used[i]) continue;
        const [x, y, z] = [v[i * 3], v[i * 3 + 1], v[i * 3 + 2]];
        const near = [Math.abs(x) > w / 2 - 1, y < 1 || y > h - 1, Math.abs(z) > d / 2 - 1];
        // Kept smooth, the top and bottom have no frame: there the upright edges between the sill and the plate.
        const counts = smooth ? near[0] && near[2] && y > smooth && y < h - smooth : near.filter(Boolean).length >= 2;
        if (counts) heights.push(outside(x, y, z));
      }
      expect(heights.length).toBeGreaterThan(1000);
      expect(Math.min(...heights)).toBeGreaterThan(0.8 * (1 - 0.08) - 1e-6);
      expect(Math.max(...heights)).toBeLessThan(0.8 + 1e-6);
    }
  }, 60_000);

  it("ends its sill and plate in a steep wall at a smooth top or bottom with no fade, not in a saw-tooth fringe", () => {
    // Reported round a cylinder 32.9 mm across and 45.5 mm high, the top and bottom smooth, no fade: the plate's top came
    // out ragged all round the rim. The frame ends a beam's wall (0.1 mm) short of the rim: the plate's face begins there.
    const R = 16.45, H = 45.5;
    const { layout } = roundCylinder({ pattern: "timber", fade: 0 }, R, H);
    const { origin, height, count } = layout.timber!.storeys[2];
    expect(origin).toBeCloseTo(0.1 + 1.2, 9);
    expect(origin + count * height).toBeCloseTo(H - 0.1 - 1.2, 9);
    // Patterned top and bottom: the frame's edges are the rims, sill and plate on them (see the box's corners).
    const patterned = roundCylinder({ pattern: "timber", fade: 0, topFree: 0, bottomFree: 0 }, R, H).layout.timber!.storeys[2];
    expect(patterned.origin).toBeCloseTo(1.2, 9);
    // Round the cylinder and along a box's top edge: within the wall's width of the rim a point stands out no more than
    // the wall rises there (and the plaster's roughness), from the wall's top down the plate's face stands out whole -
    // less the grain, and round the cylinder the hundredth of a millimetre its flat segments lie inside the circle.
    const walls = [
      { input: cylinder(R, H), height: H, out: (x: number, z: number) => Math.hypot(x, z) - R, side: (x: number, z: number) => Math.hypot(x, z) > R - 0.05 },
      { input: box(78.8, 58.6, 42.9), height: 58.6, out: (_x: number, z: number) => Math.abs(z) - 42.9 / 2, side: (x: number, z: number) => Math.abs(z) > 42.9 / 2 - 0.05 && Math.abs(x) < 36 },
    ];
    for (const { input, height: top, out, side } of walls) {
      const result = applySurfaceTexture(input, { pattern: "timber", fade: 0 });
      expectClosed(result);
      const v = result.vertices;
      const used = new Uint8Array(v.length / 3);
      for (const i of result.indices) used[i] = 1;
      let face = 0;
      for (let i = 0; i < v.length / 3; i += 1) {
        const [x, y, z] = [v[i * 3], v[i * 3 + 1], v[i * 3 + 2]];
        if (!used[i] || !side(x, z)) continue;
        for (const below of [top - y, y]) {
          if (below < 0.1 - 0.03) expect(out(x, z)).toBeLessThanOrEqual(0.8 * (below / 0.1) + 0.08 * 0.8 + 1e-6);
          else if (below > 0.1 + 0.03 && below < 2.3) {
            expect(out(x, z)).toBeGreaterThan(0.8 * (1 - 0.08) - 0.01);
            face += 1;
          }
        }
      }
      expect(face).toBeGreaterThan(100);
      expect(spikes(result, (x, y, z) => (y > 0.5 && y < top - 0.5 ? out(x, z) : 0), 0.15)).toBe(0);
    }
  }, 60_000);

  it("makes a closed body with the beams standing out by the depth, and a part of its own of them", () => {
    const input = box(72, 45, 10);
    const result = applySurfaceTexture(input, { pattern: "timber" });
    expectClosed(result);
    expect(result.stats.timber).toMatchObject({ storeys: 1, panel: (72 - 2.4) / 6 });
    expect(result.stats.timber!.height).toBeCloseTo(40.6, 9);
    let front = -Infinity;
    for (let i = 0; i < result.vertices.length; i += 3) if (Math.abs(result.vertices[i]) < 30 && result.vertices[i + 1] > 3 && result.vertices[i + 1] < 42) front = Math.max(front, result.vertices[i + 2]);
    expect(front).toBeCloseTo(5 + 0.8, 6);
    // The beams as a part of its own: closed, standing out of the body, as large as what the texture added.
    const withPart = applySurfaceTexture(input, { pattern: "timber", patternPart: true });
    expect(withPart.part).not.toBeNull();
    expectClosed(withPart.part!, true);
    const beams = volume(surfaceTexturePositions(withPart.part!));
    expect(beams).toBeGreaterThan(100);
    expect(Math.abs(volume(input) + beams - volume(surfaceTexturePositions(withPart)))).toBeLessThan(2e-3 * beams);
  }, 60_000);
});

describe("a natural stone wall", () => {
  it("knows its settings, starts standing out, and keeps them within their limits", () => {
    expect(normalizeSurfaceTexture({ pattern: "stones" })).toMatchObject({ spacing: 8, depth: 0.8, direction: "outward", keepEdges: false, stoneVary: 0.5, stoneRound: 0.5, stoneJoint: 0.8, seed: 1 });
    expect(normalizeSurfaceTexture({ pattern: "stones", stoneVary: 2, stoneRound: -1, stoneJoint: 0, seed: 3.6 })).toMatchObject({ stoneVary: 1, stoneRound: 0, stoneJoint: 0.1, seed: 4 });
  });

  /** Values over the front of a 60 x 40 x 10 box, every 0.25 mm. */
  const grid = (settings: Record<string, unknown>) => {
    const { at } = onFront({ pattern: "stones", ...settings }, [60, 40, 10]);
    const out: number[] = [];
    for (let z = 2; z < 38; z += 0.25) for (let x = -28; x < 28; x += 0.25) out.push(at(x, z));
    return out;
  };

  it("raises stones over lower mortar joints, each by its own height, the same for the same arrangement", () => {
    const values = grid({});
    values.forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    });
    const mortar = values.filter((value) => value === 0).length / values.length;
    expect(mortar).toBeGreaterThan(0.08);
    expect(mortar).toBeLessThan(0.45);
    expect(values.filter((value) => value > 0.55).length / values.length).toBeGreaterThan(0.3);
    expect(grid({})).toEqual(values);
    const other = grid({ seed: 2 });
    expect(other).not.toEqual(values);
    expect(other.filter((value, k) => Math.abs(value - values[k]) > 0.2).length).toBeGreaterThan(values.length / 10);
  });

  it("lays stones of different heights in rough courses, the joints at least as wide as asked", () => {
    const { at } = onFront({ pattern: "stones", stoneRound: 0 }, [60, 40, 10]);
    // Up a line: runs of stone and mortar; the courses' heights differ.
    const runs: number[] = [];
    let start = 2, inStone = at(0, 2) > 0;
    for (let z = 2; z <= 38; z += 0.02) {
      const now = at(0, z) > 0;
      if (now !== inStone) {
        if (inStone) runs.push(z - start);
        start = z;
        inStone = now;
      }
    }
    expect(runs.length).toBeGreaterThan(3);
    expect(Math.max(...runs) - Math.min(...runs)).toBeGreaterThan(1);
    // Across a line, the mortar between two stones is at least the joint's width (0.8 mm) wide.
    const gaps: number[] = [];
    let gap = 0;
    for (let x = -28; x <= 28; x += 0.01) {
      if (at(x, 20) === 0) gap += 0.01;
      else if (gap > 0) {
        gaps.push(gap);
        gap = 0;
      }
    }
    expect(gaps.length).toBeGreaterThan(2);
    expect(Math.min(...gaps)).toBeGreaterThan(0.8 - 0.02);
  });

  it("rounds the stones' edges with the roundness: sharp broken stone at 0 %, a soft rise at 100 %", () => {
    /** From the middle of a stone out to its outline: how high it stands 0.3 mm inside it, as a share of its middle. */
    const shoulder = (stoneRound: number) => {
      const { at } = onFront({ pattern: "stones", stoneRound }, [60, 40, 10]);
      const shares: number[] = [];
      for (let z = 4; z < 36; z += 1.7) {
        // A stone's middle: the highest point along the line in a window; then out to the right until the mortar.
        let x = -20;
        while (x < 20 && at(x, z) < 0.5) x += 0.05;
        if (x >= 20) continue;
        const middle = at(x + 1, z);
        if (!(middle > 0.5)) continue;
        let edge = x + 1;
        while (at(edge, z) > 0) edge += 0.005;
        shares.push(at(edge - 0.3, z) / middle);
      }
      return shares.reduce((sum, value) => sum + value, 0) / shares.length;
    };
    const broken = shoulder(0), field = shoulder(1);
    expect(broken).toBeGreaterThan(0.85);
    expect(field).toBeLessThan(0.6);
    expect(shoulder(0.5)).toBeGreaterThan(field);
    expect(shoulder(0.5)).toBeLessThan(broken);
  });

  it("goes round a cylinder without a seam", () => {
    for (const settings of [{ stoneRound: 0 }, { stoneRound: 1, stoneVary: 1 }]) {
      const { R, at } = roundCylinder({ pattern: "stones", ...settings });
      let stone = 0;
      for (let z = 2; z < 38; z += 0.11) {
        const before = at(Math.PI * R - 1e-7, z), after = at(-Math.PI * R + 1e-7, z);
        expect(Math.abs(before - after)).toBeLessThan(1e-5);
        if (before > 0) stone += 1;
      }
      expect(stone).toBeGreaterThan(50);
    }
  });

  it("lays no stones beyond the wall's height or a flat face's length: no pieces of its other end in the fade", () => {
    // Up to half the height of a cylinder, as the height band says: above it the wall had begun again with its first
    // courses, and by a smooth top their pieces stood in the fade as splinters. Now mortar, as between the stones.
    const R = 16.45, H = 45.5;
    for (const stoneRound of [0, 0.5]) {
      const { at } = roundCylinder({ pattern: "stones", stoneRound, zoneTo: 50 }, R, H);
      const below: number[] = [], above: number[] = [];
      for (let z = 2; z < H; z += 0.3) for (let u = -Math.PI * R; u < Math.PI * R; u += 0.7) (z < H / 2 - 3 ? below : z > H / 2 + 2 ? above : []).push(at(u, z));
      expect(below.filter((value) => value > 0.3).length / below.length).toBeGreaterThan(0.3);
      expect(Math.max(...above)).toBe(0);
    }
    // Beyond the ends of a flat face's courses as well (a point past the box's edge).
    const { at } = onFront({ pattern: "stones" }, [60, 40, 10]);
    for (let z = 2; z < 38; z += 0.3) for (const x of [-40, -36, 36, 40]) expect(at(x, z)).toBe(0);
  });

  it("keeps a stone's edge by a smooth top or bottom as it was cut, without spikes where the fade is refined", () => {
    // Round a cylinder 32.9 mm across and 45.5 mm high, as the half-timbering was reported on, broken stones with sharp
    // corners and the stones as they start: where a stone reaches into the fade by the rims, the points refining the fade
    // adds there take the heights of the cuts round them, and none stands up alone from the mortar. (Far from the rims a
    // broken stone's sharp corner may still end in one point of the grid: only the bands by the rims count here.)
    const R = 16.45, H = 45.5;
    for (const settings of [{}, { seed: 2, stoneRound: 0 }, { seed: 7, stoneRound: 0 }]) {
      const result = applySurfaceTexture(cylinder(R, H), { pattern: "stones", ...settings });
      expectClosed(result);
      expect(spikes(result, (x, y, z) => (y > 0.02 && y < H - 0.02 ? Math.hypot(x, z) - R : 0), 0.15, (_x, y) => y < 1.5 || y > H - 1.5)).toBe(0);
    }
  }, 60_000);

  it("makes a closed body, and a part of its own of the stones", () => {
    const input = box(40, 30, 10);
    for (const stoneRound of [0, 1]) {
      const result = applySurfaceTexture(input, { pattern: "stones", stoneRound, detail: "coarse" });
      expectClosed(result);
      expect(result.stats.limited).toBe(false);
    }
    const withPart = applySurfaceTexture(input, { pattern: "stones", patternPart: true, detail: "coarse" });
    expect(withPart.part).not.toBeNull();
    expectClosed(withPart.part!, true);
    const stones = volume(surfaceTexturePositions(withPart.part!));
    expect(stones).toBeGreaterThan(100);
    expect(Math.abs(volume(input) + stones - volume(surfaceTexturePositions(withPart)))).toBeLessThan(2e-3 * stones);
  }, 60_000);
});
