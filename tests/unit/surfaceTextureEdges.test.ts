import { describe, expect, it } from "vitest";
import { createSurfaceTextureSession, makeSurfaceTextureLayout, normalizeSurfaceTexture, surfaceTextureValueAt } from "@/lib/surfaceTexture";
import { adjacency, freeDistance, surfaceMeshReport } from "@/lib/surfaceTextureMesh";

type Vec3 = [number, number, number];

/** A closed box on the plate (inside frame, y up), two triangles a face, wound outward. */
function box(w: number, h: number, d: number): number[] {
  const p = (x: number, y: number, z: number): Vec3 => [(x - 0.5) * w, y * h, (z - 0.5) * d];
  const quads: Vec3[][] = [
    [p(0, 0, 1), p(1, 0, 1), p(1, 1, 1), p(0, 1, 1)],
    [p(1, 0, 0), p(0, 0, 0), p(0, 1, 0), p(1, 1, 0)],
    [p(1, 0, 1), p(1, 0, 0), p(1, 1, 0), p(1, 1, 1)],
    [p(0, 0, 0), p(0, 0, 1), p(0, 1, 1), p(0, 1, 0)],
    [p(0, 1, 1), p(1, 1, 1), p(1, 1, 0), p(0, 1, 0)],
    [p(0, 0, 0), p(1, 0, 0), p(1, 0, 1), p(0, 0, 1)],
  ];
  return quads.flatMap(([a, b, c, d]) => [...a, ...b, ...c, ...a, ...c, ...d]);
}

/**
 * Points of the right face (x = 10 before moving) as (across, up, how far in). Moved by at most 0.7 mm, so the front
 * and back faces' points (z beyond 9.3) and the bottom and top (y 0 and 20, smooth) are not taken for its own.
 */
function rightFace(vertices: Float32Array | Float64Array) {
  const out: [number, number, number][] = [];
  for (let i = 0; i < vertices.length; i += 3) {
    const [x, y, z] = [vertices[i], vertices[i + 1], vertices[i + 2]];
    if (x < 9.3 || Math.abs(z) > 9.3 || y < 1e-6 || y > 20 - 1e-6) continue;
    out.push([-z, y, 10 - x]);
  }
  return out;
}

// Each face on its own (all round): along the outline a box's upright edges are no border (see surfaceTextureOutline.test.ts).
describe("patterns on the flat sides of a box end at a border", () => {
  it("leave a frame as wide as the fade along every edge, and run at full depth inside it", () => {
    const session = createSurfaceTextureSession(box(20, 20, 20));
    const result = session.apply({ pattern: "grooves", projection: "allRound" });
    expect(surfaceMeshReport(result.indices, result.vertices.length / 3)).toMatchObject({ openEdges: 0, nonManifoldEdges: 0 });
    let deep = 0;
    for (const [across, up, inward] of rightFace(result.vertices)) {
      // Distance to the nearest edge of the face.
      const edge = Math.min(10 - Math.abs(across), up, 20 - up);
      // The frame (fade 1 mm, its wall 0.15 mm) stays as it was; the pattern goes no deeper than its depth.
      if (edge < 0.85 - 1e-6) expect(inward).toBeLessThan(1e-6);
      expect(inward).toBeLessThan(0.6 + 1e-6);
      if (edge > 1 && inward > 0.6 - 1e-6) deep += 1;
    }
    expect(deep).toBeGreaterThan(20);
  }, 60_000);

  it("cut knurling's diamonds cleanly: no triangle bends across a groove's middle or edge", () => {
    const asked = { pattern: "knurl", fade: 0, projection: "allRound" } as const;
    const session = createSurfaceTextureSession(box(20, 20, 20));
    const result = session.apply(asked);
    const s = { ...normalizeSurfaceTexture(asked), projection: "allRound" as const };
    const layout = makeSurfaceTextureLayout(session.base, s);
    const v = result.vertices, I = result.indices;
    let checked = 0, bent = 0;
    for (let t = 0; t < I.length; t += 3) {
      const ids = [I[t], I[t + 1], I[t + 2]];
      if (ids.some((k) => v[k * 3] < 9.3)) continue;
      const c = [0, 1, 2].map((e) => ids.reduce((sum, k) => sum + v[k * 3 + e], 0) / 3);
      if (Math.abs(c[2]) > 9 || c[1] < 1 || c[1] > 19) continue;
      checked += 1;
      // The surface in the middle of the triangle against the pattern there (the core's frame: x, -z, y).
      const want = s.depth * surfaceTextureValueAt(10, -c[2], c[1], 1, 0, 0, s, layout);
      if (Math.abs(10 - c[0] - want) > 0.05) bent += 1;
    }
    // The diamonds' flat flanks are merged into few triangles each (see mergeFlatPoints).
    expect(checked).toBeGreaterThan(200);
    expect(bent).toBe(0);
  }, 60_000);

  it("keep only whole bumps: none is cut by the frame", () => {
    const session = createSurfaceTextureSession(box(20, 20, 20));
    const result = session.apply({ pattern: "bumps", direction: "outward", depth: 0.6, projection: "allRound" });
    expect(surfaceMeshReport(result.indices, result.vertices.length / 3)).toMatchObject({ openEdges: 0, nonManifoldEdges: 0 });
    let raised = 0;
    for (const [across, up, inward] of rightFace(result.vertices)) {
      const edge = Math.min(10 - Math.abs(across), up, 20 - up);
      if (inward < -0.01) {
        raised += 1;
        // A bump's foot lies inside the frame: none of it reaches into the fade's width.
        expect(edge).toBeGreaterThan(1 - 1e-6);
      }
    }
    expect(raised).toBeGreaterThan(50);
  }, 60_000);
});

/** A closed cylinder standing on the plate (inside frame, y up), one row of tall triangles up the wall. */
function cylinder(radius: number, height: number, segments = 128): number[] {
  const out: number[] = [];
  const at = (k: number, y: number): Vec3 => [radius * Math.cos((2 * Math.PI * k) / segments), y, radius * Math.sin((2 * Math.PI * k) / segments)];
  for (let k = 0; k < segments; k += 1) {
    out.push(...at(k, 0), ...at(k, height), ...at(k + 1, height), ...at(k, 0), ...at(k + 1, height), ...at(k + 1, 0));
    out.push(0, height, 0, ...at(k + 1, height), ...at(k, height), 0, 0, 0, ...at(k, 0), ...at(k + 1, 0));
  }
  return out;
}

/**
 * Points of a textured body that lie on its sides near a rim, as (how far from the rim, how far in, where along it):
 * `inward` says how far a point lies inside the side as it was and where along the rim it lies, `rim` how far from the
 * nearest rim and which (mm, from its moved place).
 */
function nearRims(vertices: Float32Array | Float64Array, indices: Uint32Array, inward: (x: number, y: number, z: number) => [number, number] | null, rim: (y: number) => [number, number]) {
  const used = new Uint8Array(vertices.length / 3);
  for (const i of indices) used[i] = 1;
  const out: [number, number, string][] = [];
  for (let i = 0; i < used.length; i += 1) {
    if (!used[i]) continue;
    const [x, y, z] = [vertices[i * 3], vertices[i * 3 + 1], vertices[i * 3 + 2]];
    const side = inward(x, y, z);
    const [distance, which] = rim(y);
    if (side !== null && distance < 1) out.push([distance, side[0], `${which}|${Math.round(side[1] / 0.2)}`]);
  }
  return out;
}

// Reported round a cylinder of 32.9 x 45.5 mm and on a box with bricks, top and bottom patterned: with Fade in over at 0
// the grooves' ends hung from the rim in fans, knurling's in splinters and a brick's head joint in needles.
describe("with no fade, a pattern pressed in ends at the rim in a steep wall", () => {
  /**
   * No point within the wall's width (0.05 mm) of the rim sinks deeper than the wall there, and wherever the pattern lies
   * at its full depth by the rim (in strips 0.2 mm wide along it), it does so from the wall's foot on, not from wherever
   * the nearest points happened to be.
   */
  const expectWall = (points: [number, number, string][], depth: number, upright = true) => {
    const lowest = new Map<string, number>();
    for (const [rim, inward, along] of points) {
      if (rim < 0.05 - 0.02) expect(inward).toBeLessThanOrEqual(depth * (rim / 0.05) + 0.01);
      if (inward > depth - 1e-3) lowest.set(along, Math.min(lowest.get(along) ?? Infinity, rim));
    }
    // Knurling's grooves cross the rim aslant: their deepest line meets it in a point, not along a strip.
    if (!upright) return;
    expect(lowest.size).toBeGreaterThan(10);
    for (const rim of lowest.values()) expect(rim).toBeLessThan(0.12);
  };

  it("round a cylinder: grooves and knurling, at the top and at the bottom", () => {
    const R = 16.45, H = 45.5;
    for (const pattern of ["grooves", "knurl"]) {
      const result = createSurfaceTextureSession(cylinder(R, H)).apply({ pattern, fade: 0 });
      expect(surfaceMeshReport(result.indices, result.vertices.length / 3)).toMatchObject({ openEdges: 0, nonManifoldEdges: 0 });
      const depth = normalizeSurfaceTexture({ pattern }).depth;
      // The flat segments of the side lie up to a hundredth of a millimetre inside the circle.
      const side = (x: number, _y: number, z: number): [number, number] | null => (Math.hypot(x, z) > R - 2 ? [Math.max(0, R * Math.cos(Math.PI / 128) - Math.hypot(x, z)), Math.atan2(z, x) * R] : null);
      expectWall(nearRims(result.vertices, result.indices, side, (y) => (y < H / 2 ? [y, 0] : [H - y, 1])), depth - 0.01, pattern === "grooves");
    }
  }, 60_000);

  it("on a box: a brick's head joints at the bottom and top edges, the top and bottom patterned too", () => {
    const [w, h, d] = [78.8, 58.6, 42.9];
    const result = createSurfaceTextureSession(box(w, h, d)).apply({ pattern: "bricks", topFree: 0, bottomFree: 0, fade: 0 });
    expect(surfaceMeshReport(result.indices, result.vertices.length / 3)).toMatchObject({ openEdges: 0, nonManifoldEdges: 0 });
    // The front and the back, away from the upright edges; not the top's and bottom's own points (at their level).
    const side = (x: number, y: number, z: number): [number, number] | null => (Math.abs(x) < w / 2 - 2 && y > 1e-6 && y < h - 1e-6 && Math.abs(z) > d / 2 - 1 ? [d / 2 - Math.abs(z), Math.sign(z) * 1000 + x] : null);
    expectWall(nearRims(result.vertices, result.indices, side, (y) => (y < h / 2 ? [y, 0] : [h - y, 1])), 0.6);
  }, 60_000);
});

describe("distance to the part that stays smooth", () => {
  it("is measured straight, not along the zigzag of long slanted triangles", () => {
    // A 10 x 4 strip cut into slanted triangles; its bottom edge stays smooth.
    const vertices: number[] = [];
    const cols = 10;
    for (let k = 0; k <= cols; k += 1) vertices.push(k, 0, 0, k + 3, 4, 0);
    const indices: number[] = [];
    for (let k = 0; k < cols; k += 1) indices.push(k * 2, k * 2 + 2, k * 2 + 1, k * 2 + 1, k * 2 + 2, k * 2 + 3);
    const v = Float64Array.from(vertices);
    const I = Uint32Array.from(indices);
    const w0 = Uint8Array.from({ length: v.length / 3 }, (_, i) => (v[i * 3 + 1] === 0 ? 0 : 1));
    const distance = freeDistance(v, I, adjacency(v.length / 3, I), w0, 10);
    // Above the smooth edge (beyond its ends the nearest place is its end).
    for (let i = 0; i < v.length / 3; i += 1) {
      if (v[i * 3] > 10) continue;
      expect(distance[i]).toBeCloseTo(v[i * 3 + 1], 9);
    }
  });
});
