import { describe, expect, it } from "vitest";
import {
  applySurfaceTexture,
  insideToScreenPositions,
  makeSurfaceTextureLayout,
  normalizeSurfaceTexture,
  SURFACE_TEXTURE_BRICK_BONDS,
  surfaceTexturePositions,
  surfaceTextureValueAt,
  type SurfaceTextureResult,
} from "@/lib/surfaceTexture";
import { prepareSurfaceBase, surfaceMeshReport } from "@/lib/surfaceTextureMesh";
import { analyzeTriangleSoup } from "@/lib/svgImport";

type Vec3 = [number, number, number];

/** A closed cylinder standing on the plate (inside frame, y up), faces wound outward, one row of tall triangles up the wall. */
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

/** A closed box standing on the plate, inside frame, faces wound outward. */
function box(w: number, h: number, d: number): number[] {
  const [x0, x1, y0, y1, z0, z1] = [-w / 2, w / 2, 0, h, -d / 2, d / 2];
  const p: Vec3[] = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
  const faces = [[0, 1, 2], [0, 2, 3], [4, 6, 5], [4, 7, 6], [0, 4, 5], [0, 5, 1], [3, 2, 6], [3, 6, 7], [0, 3, 7], [0, 7, 4], [1, 5, 6], [1, 6, 2]];
  return faces.flatMap((face) => face.flatMap((i) => p[i]));
}

function signedVolume(positions: ArrayLike<number>) {
  let volume = 0;
  for (let i = 0; i < positions.length; i += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = Array.from({ length: 9 }, (_, k) => positions[i + k]);
    volume += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  return volume;
}

function expectClosed(result: SurfaceTextureResult) {
  expect(surfaceMeshReport(result.indices, result.vertices.length / 3)).toEqual({ shells: 1, openEdges: 0, nonManifoldEdges: 0 });
  const positions = surfaceTexturePositions(result);
  const analysis = analyzeTriangleSoup(positions);
  expect(analysis.degenerateTriangles).toBe(0);
  expect(analysis.boundaryEdges).toBe(0);
  expect(analysis.nonManifoldEdges).toBe(0);
  expect(signedVolume(positions)).toBeGreaterThan(0);
}

/** Radius about the vertical axis (inside frame: y up) and height of every point a triangle uses. */
function usedPoints(result: SurfaceTextureResult) {
  return Array.from(new Set(result.indices), (i) => ({ r: Math.hypot(result.vertices[i * 3], result.vertices[i * 3 + 2]), y: result.vertices[i * 3 + 1] }));
}

/** The pattern's value round a cylinder standing on the plate (screen frame, z up), at `u` mm round and `z` mm up. */
function aroundCylinder(settings: Record<string, unknown>, radius = 12, height = 20) {
  const s = normalizeSurfaceTexture({ pattern: "bricks", projection: "cylinder", ...settings });
  const layout = makeSurfaceTextureLayout(prepareSurfaceBase(insideToScreenPositions(cylinder(radius, height))), s);
  const R = layout.radius;
  const at = (u: number, z: number) => {
    const angle = u / R;
    return surfaceTextureValueAt(R * Math.cos(angle), R * Math.sin(angle), z, Math.cos(angle), Math.sin(angle), 0, s, layout);
  };
  return { s, layout, at, L: layout.cell, H: layout.rowHeight!, v0: layout.rowOrigin! };
}

/** Area (mm²) of the triangles above `from` (y up) that lean - neither level nor upright: a brick's faces and joints are either. */
function leaning(result: SurfaceTextureResult, from: number) {
  const v = result.vertices, I = result.indices;
  let area = 0;
  for (let t = 0; t < I.length; t += 3) {
    const p = [0, 1, 2].map((k) => [v[I[t + k] * 3], v[I[t + k] * 3 + 1], v[I[t + k] * 3 + 2]]);
    if (p.some(([, y]) => y < from)) continue;
    const a = [0, 1, 2].map((k) => p[1][k] - p[0][k]), b = [0, 1, 2].map((k) => p[2][k] - p[0][k]);
    const n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const l = Math.hypot(n[0], n[1], n[2]);
    if (l > 0 && Math.abs(n[1] / l) > 0.3 && Math.abs(n[1] / l) < 0.95) area += l / 2;
  }
  return area;
}

describe("bricks", () => {
  it("knows its settings and starts as a wall with mortar joints", () => {
    expect(normalizeSurfaceTexture({ pattern: "bricks" })).toMatchObject({ spacing: 12, depth: 0.6, profile: "flat", brickBond: "running", brickHeight: 4, brickJoint: 0.8, brickVary: 0 });
    expect(normalizeSurfaceTexture({ pattern: "bricks", brickBond: "herringbone", brickVary: 3, brickJoint: 0, brickHeight: "6.5" })).toMatchObject({ brickBond: "running", brickVary: 1, brickJoint: 0.1, brickHeight: 6.5 });
    expect(normalizeSurfaceTexture({ pattern: "bricks", brickBond: "flemish", spacing: 8 })).toMatchObject({ brickBond: "flemish", spacing: 8 });
  });

  it("goes round a cylinder with whole bricks and fits the courses to its height", () => {
    const { s, layout, at, L, H, v0 } = aroundCylinder({ spacing: 6, brickHeight: 4.2 });
    expect(layout.around).toBe(Math.round((2 * Math.PI * layout.radius) / 6));
    expect(L * layout.around!).toBeCloseTo(2 * Math.PI * layout.radius, 9);
    // A brick ends at the bottom and at the top, the joints half a joint beyond: five courses in 20 mm and a joint.
    expect(layout.rows).toBe(5);
    expect(v0).toBeCloseTo(-s.brickJoint / 2, 9);
    expect(H).toBeCloseTo((20 + s.brickJoint) / 5, 9);
    expect(at(L / 2, 0)).toBe(0);
    expect(at(L / 2, 20)).toBe(0);
    // A brick's middle is its face, a joint's middle the full depth: between the courses and between two bricks.
    expect(at(L / 2, v0 + H / 2)).toBe(0);
    expect(at(L / 2, v0 + H)).toBe(1);
    expect(at(0, v0 + H / 2)).toBe(1);
    // Running bond: the next course half a brick along. The same value just before and after the seam.
    expect(at(0, v0 + 1.5 * H)).toBe(0);
    expect(at(L / 2, v0 + 1.5 * H)).toBe(1);
    expect(Math.abs(at(Math.PI * layout.radius - 1e-6, v0 + 2.3 * H) - at(-Math.PI * layout.radius + 1e-6, v0 + 2.3 * H))).toBeLessThan(1e-3);
  });

  it("lays the bonds", () => {
    // Stack: the joints in one line.
    const stack = aroundCylinder({ spacing: 6, brickHeight: 4, brickBond: "stack" });
    expect(stack.at(0, 1.5 * stack.H)).toBe(1);
    // English: a course of headers, half as long, centred on the stretchers' joints and middles.
    const english = aroundCylinder({ spacing: 8, brickHeight: 4, brickBond: "english" });
    expect(english.at(0, 0.5 * english.H)).toBe(1);
    expect(english.at(0, 1.5 * english.H)).toBe(0);
    expect(english.at(english.L / 4, 1.5 * english.H)).toBe(1);
    expect(english.at(english.L / 2, 1.5 * english.H)).toBe(0);
    // English cross: every other course of stretchers half a brick along.
    const cross = aroundCylinder({ spacing: 8, brickHeight: 4, brickBond: "englishCross" });
    expect(cross.at(0, 0.5 * cross.H)).toBe(1);
    expect(cross.at(0, 2.5 * cross.H)).toBe(0);
    expect(cross.at(cross.L / 2, 2.5 * cross.H)).toBe(1);
    // Flemish: a stretcher and a header in turn; round the cylinder a whole number of the pair.
    const flemish = aroundCylinder({ spacing: 8, brickHeight: 4, brickBond: "flemish" });
    expect(flemish.L * 1.5 * flemish.layout.around!).toBeCloseTo(2 * Math.PI * flemish.layout.radius, 9);
    expect(flemish.at(flemish.L, 0.5 * flemish.H)).toBe(1);
    expect(flemish.at(1.25 * flemish.L, 0.5 * flemish.H)).toBe(0);
    expect(flemish.at(1.5 * flemish.L, 0.5 * flemish.H)).toBe(1);
    // The next course: each header over the middle of a stretcher below, each stretcher's middle over a header.
    expect(flemish.at(0.25 * flemish.L, 1.5 * flemish.H)).toBe(1);
    expect(flemish.at(0.5 * flemish.L, 1.5 * flemish.H)).toBe(0);
    expect(flemish.at(0.75 * flemish.L, 1.5 * flemish.H)).toBe(1);
    expect(flemish.at(1.25 * flemish.L, 1.5 * flemish.H)).toBe(0);
  });

  it("keeps a brick when the joint is wider than it", () => {
    const { at, L, H, v0 } = aroundCylinder({ spacing: 6, brickHeight: 3, brickJoint: 10 });
    expect(at(L / 2, v0 + H / 2)).toBe(0);
    expect(at(0, v0 + H / 2)).toBe(1);
  });

  it("lets every brick lie a little deeper, the same for the same number", () => {
    const one = aroundCylinder({ spacing: 6, brickHeight: 4, brickVary: 1, seed: 3 });
    const middles = Array.from({ length: 8 }, (_, k) => one.at((k + 0.5) * one.L, one.v0 + one.H / 2));
    middles.forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(0.5);
    });
    expect(new Set(middles.map((value) => value.toFixed(6))).size).toBeGreaterThan(4);
    // A brick's face stays flat: the same depth all over it.
    expect(one.at(one.L * 0.3, one.v0 + one.H * 0.4)).toBeCloseTo(one.at(one.L * 0.7, one.v0 + one.H * 0.6), 12);
    // The joint stays as deep as set.
    expect(one.at(0, one.v0 + one.H / 2)).toBe(1);
    const again = aroundCylinder({ spacing: 6, brickHeight: 4, brickVary: 1, seed: 3 });
    expect(again.at(2.5 * again.L, again.v0 + again.H / 2)).toBe(middles[2]);
    const other = aroundCylinder({ spacing: 6, brickHeight: 4, brickVary: 1, seed: 4 });
    expect(Array.from({ length: 8 }, (_, k) => other.at((k + 0.5) * other.L, other.v0 + other.H / 2))).not.toEqual(middles);
  });

  it("cuts a cylinder along its joints: closed, every joint the full depth, the faces flat and coarse", () => {
    const result = applySurfaceTexture(cylinder(12, 20), { pattern: "bricks", spacing: 6, brickHeight: 4 });
    expectClosed(result);
    expect(result.stats.around).toBe(Math.round((2 * Math.PI * 12) / 6));
    expect(result.stats.bricks!.courses).toBe(5);
    expect(result.stats.bricks!.height).toBeCloseTo(20.8 / 5, 9);
    const wall = usedPoints(result).filter((p) => p.y > 2 && p.y < 18);
    const radii = wall.map((p) => p.r);
    expect(Math.min(...radii)).toBeGreaterThan(12 - 0.6 - 0.01);
    expect(Math.min(...radii)).toBeLessThan(12 - 0.6 + 0.01);
    expect(Math.max(...radii)).toBeLessThanOrEqual(12 + 1e-6);
    // Only the joints are cut finely: far fewer triangles than an even grid as fine as a joint.
    expect(result.stats.triangles).toBeLessThan(40_000);
  });

  it("lays every bond as a closed body", () => {
    for (const brickBond of SURFACE_TEXTURE_BRICK_BONDS) {
      const result = applySurfaceTexture(cylinder(10, 16), { pattern: "bricks", spacing: 7, brickHeight: 3.5, brickBond, profile: "round", brickVary: 0.5 });
      expectClosed(result);
    }
  }, 30000);

  it("lays bricks on a box from edge to edge, a brick at every edge as at a wall's corner", () => {
    const s = normalizeSurfaceTexture({ pattern: "bricks", projection: "allRound" });
    const base = prepareSurfaceBase(insideToScreenPositions(box(40, 30, 25)));
    const layout = makeSurfaceTextureLayout(base, s);
    // The front (screen: facing -y) runs along x: three bricks across its 40 mm and a joint, the joints half a joint
    // beyond its edges; eight courses up its 30 mm, likewise.
    const half = s.brickJoint / 2;
    const along = layout.brickAxes![0];
    expect(along.cell).toBeCloseTo((40 + 2 * half) / 3, 9);
    expect(along.origin).toBeCloseTo(-20 - half, 9);
    expect(layout.rows).toBe(8);
    expect(layout.rowOrigin).toBeCloseTo(-half, 9);
    const front = (x: number, z: number) => surfaceTextureValueAt(x, -12.5, z, 0, -1, 0, s, layout);
    const H = layout.rowHeight!, v0 = layout.rowOrigin!;
    // At the edges brick faces, also at the bottom and the top.
    expect(front(-20, v0 + H / 2)).toBe(0);
    expect(front(20, v0 + H / 2)).toBe(0);
    expect(front(-20 + along.cell / 2, 0)).toBe(0);
    expect(front(-20 + along.cell / 2, 30)).toBe(0);
    expect(front(along.origin + along.cell, v0 + H / 2)).toBe(1);
    // The next course begins with half a brick.
    expect(front(along.origin + along.cell / 2, v0 + 1.5 * H)).toBe(1);
    const result = applySurfaceTexture(box(40, 30, 25), s);
    expectClosed(result);
    expect(result.stats.bricks!.courses).toBe(8);
    expect(result.stats.bricks!.height).toBeCloseTo((30 + 2 * half) / 8, 9);
    // The corners stay where they were.
    let corners = 0;
    for (let i = 0; i < result.vertices.length; i += 3) {
      const [x, y, z] = [result.vertices[i], result.vertices[i + 1], result.vertices[i + 2]];
      if (Math.abs(Math.abs(x) - 20) < 1e-9 && Math.abs(Math.abs(z) - 12.5) < 1e-9 && (Math.abs(y) < 1e-9 || Math.abs(y - 30) < 1e-9)) corners += 1;
    }
    expect(corners).toBe(8);
  }, 30000);

  it("ends the courses in a brick at a picked top, without splinters along its rim or on the top", () => {
    const mantle = { at: [1, 0.5, 0.5], normal: [1, 0, 0] };
    const s = normalizeSurfaceTexture({ pattern: "bricks", faces: ["top", mantle] });
    const layout = makeSurfaceTextureLayout(prepareSurfaceBase(insideToScreenPositions(cylinder(15, 30))), s);
    // The first course's joint just below the plate, the last one's just above the top's rim.
    expect(layout.rowOrigin).toBeCloseTo(-s.brickJoint / 2, 9);
    expect(layout.rowOrigin! + layout.rows! * layout.rowHeight!).toBeCloseTo(30 + s.brickJoint / 2, 9);
    const result = applySurfaceTexture(cylinder(15, 30), s);
    expectClosed(result);
    // Near the top's rim the faces are level (bricks, joint floors) or upright (the joints' walls): a joint along the rim
    // drew the top's coarse brick faces down into it in long leaning splinters.
    expect(leaning(result, 29)).toBeLessThan(5);
  }, 60000);

  it("meets on a box's edges where both sides' bricks lie, without fans on the top", () => {
    // The top's joints are its own, fitted to it; at an edge each side moved as deep as its own bricks lie there.
    const result = applySurfaceTexture(box(40, 30, 25), { pattern: "bricks", faces: ["top", "front", "back", "left", "right"] });
    expectClosed(result);
    expect(leaning(result, 28)).toBeLessThan(5);
  }, 30000);

  it("lays bricks round a hexagonal prism along its outline, its joints not cut in teeth", () => {
    const hexagon: number[] = [];
    const at = (k: number, y: number): Vec3 => [20 * Math.cos((Math.PI * k) / 3), y, 20 * Math.sin((Math.PI * k) / 3)];
    for (let k = 0; k < 6; k += 1) {
      hexagon.push(...at(k, 0), ...at(k, 30), ...at(k + 1, 30), ...at(k, 0), ...at(k + 1, 30), ...at(k + 1, 0));
      hexagon.push(0, 30, 0, ...at(k + 1, 30), ...at(k, 30), 0, 0, 0, ...at(k, 0), ...at(k + 1, 0));
    }
    const result = applySurfaceTexture(hexagon, { pattern: "bricks" });
    expectClosed(result);
    expect(result.stats.projection).toBe("cylinder");
    expect(leaning(result, -1)).toBeLessThan(20);
  }, 30000);

  it("stays within the triangle budget on a large vase", () => {
    const result = applySurfaceTexture(cylinder(50, 150), { pattern: "bricks" });
    expectClosed(result);
    expect(result.stats.limited).toBe(false);
  }, 60000);
});
