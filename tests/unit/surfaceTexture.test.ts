import { describe, expect, it } from "vitest";
import {
  applySurfaceTexture,
  createSurfaceTextureSession,
  insideToScreenPositions,
  makeSurfaceTextureLayout,
  normalizeSurfaceTexture,
  screenToInsidePositions,
  SURFACE_TEXTURE_DEFAULTS,
  surfaceTexturePositions,
  surfaceTextureValueAt,
  type SurfaceTextureResult,
} from "@/lib/surfaceTexture";
import { prepareSurfaceBase, surfaceMeshReport } from "@/lib/surfaceTextureMesh";
import { analyzeTriangleSoup } from "@/lib/svgImport";

type Vec3 = [number, number, number];

/**
 * A closed tube standing on the plate in the editor's inside frame (y up), faces wound outward:
 * outer radius `outer`, a hole of radius `inner` (0 for a solid cylinder with a point in the
 * middle of top and bottom), `rings` rows of points up the wall.
 */
function tube(outer: number, inner: number, height: number, segments = 96, rings = 2): number[] {
  const out: number[] = [];
  const tri = (a: Vec3, b: Vec3, c: Vec3) => out.push(...a, ...b, ...c);
  const at = (r: number, k: number, y: number): Vec3 => {
    const a = (2 * Math.PI * k) / segments;
    return [r * Math.cos(a), y, r * Math.sin(a)];
  };
  for (let k = 0; k < segments; k += 1) {
    for (let j = 0; j < rings - 1; j += 1) {
      const y0 = (height * j) / (rings - 1), y1 = (height * (j + 1)) / (rings - 1);
      // Outer wall, normal outward.
      tri(at(outer, k, y0), at(outer, k, y1), at(outer, k + 1, y1));
      tri(at(outer, k, y0), at(outer, k + 1, y1), at(outer, k + 1, y0));
      if (inner > 0) {
        tri(at(inner, k, y0), at(inner, k + 1, y1), at(inner, k, y1));
        tri(at(inner, k, y0), at(inner, k + 1, y0), at(inner, k + 1, y1));
      }
    }
    if (inner > 0) {
      tri(at(inner, k, height), at(inner, k + 1, height), at(outer, k + 1, height));
      tri(at(inner, k, height), at(outer, k + 1, height), at(outer, k, height));
      tri(at(inner, k, 0), at(outer, k + 1, 0), at(inner, k + 1, 0));
      tri(at(inner, k, 0), at(outer, k, 0), at(outer, k + 1, 0));
    } else {
      tri([0, height, 0], at(outer, k + 1, height), at(outer, k, height));
      tri([0, 0, 0], at(outer, k, 0), at(outer, k + 1, 0));
    }
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

function signedVolume(positions: number[]) {
  let volume = 0;
  for (let i = 0; i < positions.length; i += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = positions.slice(i, i + 9);
    volume += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  return volume;
}

/** Radius about the vertical axis (inside frame: y up) and height of every point a triangle uses. */
function usedPoints(result: SurfaceTextureResult) {
  const used = new Set<number>(Array.from(result.indices));
  return Array.from(used, (i) => {
    const [x, y, z] = [result.vertices[i * 3], result.vertices[i * 3 + 1], result.vertices[i * 3 + 2]];
    return { r: Math.hypot(x, z), y, angle: Math.atan2(z, x) };
  });
}

function expectClosed(result: SurfaceTextureResult) {
  const report = surfaceMeshReport(result.indices, result.vertices.length / 3);
  expect(report).toEqual({ shells: 1, openEdges: 0, nonManifoldEdges: 0 });
  // The editor's own check of a body (the one imports go through), without its limit on triangles.
  const positions = surfaceTexturePositions(result);
  const analysis = analyzeTriangleSoup(positions);
  expect(analysis.degenerateTriangles).toBe(0);
  expect(analysis.boundaryEdges).toBe(0);
  expect(analysis.nonManifoldEdges).toBe(0);
  expect(signedVolume(positions)).toBeGreaterThan(0);
}

const SMALL = { maxTriangles: 250_000 };

describe("surface texture settings", () => {
  it("fills in defaults and keeps values within their limits", () => {
    expect(normalizeSurfaceTexture(undefined)).toEqual(SURFACE_TEXTURE_DEFAULTS);
    const s = normalizeSurfaceTexture({ pattern: "grooves", spacing: 0.01, depth: 99, width: "0.5", angle: -400, profile: "wobbly", keepEdges: "false", zoneFrom: 80, zoneTo: 20 });
    expect(s.pattern).toBe("grooves");
    expect(s.spacing).toBe(0.5);
    expect(s.depth).toBe(5);
    expect(s.width).toBe(0.5);
    expect(s.angle).toBe(-90);
    expect(s.profile).toBe(SURFACE_TEXTURE_DEFAULTS.profile);
    expect(s.keepEdges).toBe(false);
    expect([s.zoneFrom, s.zoneTo]).toEqual([20, 80]);
  });

  it("ignores values that are no plain numbers, words or switches", () => {
    const s = normalizeSurfaceTexture({ spacing: [4], depth: "", pattern: { toString: () => "grooves" }, outside: 1 });
    expect(s.spacing).toBe(SURFACE_TEXTURE_DEFAULTS.spacing);
    expect(s.depth).toBe(SURFACE_TEXTURE_DEFAULTS.depth);
    expect(s.pattern).toBe(SURFACE_TEXTURE_DEFAULTS.pattern);
    expect(s.outside).toBe(true);
  });

  it("turns the inside frame into the screen frame and back without changing a point", () => {
    const inside = [1, 2, 3, -4, 5, -6];
    const screen = insideToScreenPositions(inside);
    expect(Array.from(screen)).toEqual([1, -3, 2, -4, 6, 5]);
    expect(Array.from(screenToInsidePositions(screen))).toEqual(inside);
  });
});

describe("laying out the pattern", () => {
  it("finds the axis of a round body and rounds the spacing so the pattern closes at the seam", () => {
    const shifted = tube(10, 0, 20).map((value, index) => (index % 3 === 0 ? value + 7 : index % 3 === 2 ? value - 3 : value));
    const base = prepareSurfaceBase(insideToScreenPositions(shifted));
    const s = normalizeSurfaceTexture({ pattern: "grooves", angle: 0, spacing: 3 });
    const layout = makeSurfaceTextureLayout(base, s);
    // Screen frame: x stays, the inside z is minus y.
    expect(layout.center[0]).toBeCloseTo(7, 3);
    expect(layout.center[1]).toBeCloseTo(3, 3);
    expect(layout.radius).toBeGreaterThan(9.99);
    expect(layout.radius).toBeLessThanOrEqual(10);
    expect(layout.around).toBe(Math.round((2 * Math.PI * layout.radius) / 3));
    expect(layout.period * layout.around!).toBeCloseTo(2 * Math.PI * layout.radius, 9);
    // The same value just before and just after the seam.
    const near = (angle: number) => {
      const [x, y] = [7 + 10 * Math.cos(angle), 3 + 10 * Math.sin(angle)];
      return surfaceTextureValueAt(x, y, 5, Math.cos(angle), Math.sin(angle), 0, s, layout);
    };
    for (const pattern of ["knurl", "honeycomb", "bumps"] as const) {
      const sp = normalizeSurfaceTexture({ pattern, spacing: 3.3 });
      const lp = makeSurfaceTextureLayout(base, sp);
      const at = (angle: number) => surfaceTextureValueAt(7 + 10 * Math.cos(angle), 3 + 10 * Math.sin(angle), 5, 1, 0, 0, sp, lp);
      expect(Math.abs(at(Math.PI - 1e-7) - at(-Math.PI + 1e-7))).toBeLessThan(1e-3);
    }
    expect(Math.abs(near(Math.PI - 1e-7) - near(-Math.PI + 1e-7))).toBeLessThan(1e-3);
  });
});

describe("texturing a body", () => {
  it("knurls a cylinder: closed, as deep as set, the bottom on the bed and the top smooth", () => {
    const result = applySurfaceTexture(tube(10, 0, 20), { pattern: "knurl", spacing: 3, depth: 0.6 }, SMALL);
    expectClosed(result);
    const points = usedPoints(result);
    const wall = points.filter((p) => p.y > 3 && p.y < 17);
    const radii = wall.map((p) => p.r);
    expect(Math.min(...radii)).toBeGreaterThan(10 - 0.6 - 0.01);
    expect(Math.min(...radii)).toBeLessThan(10 - 0.6 + 0.02);
    expect(Math.max(...radii)).toBeLessThanOrEqual(10 + 1e-6);
    expect(Math.min(...points.map((p) => p.y))).toBeCloseTo(0, 6);
    expect(Math.max(...points.map((p) => p.y))).toBeCloseTo(20, 6);
    expect(result.stats.around).toBe(Math.round((2 * Math.PI * 10 * Math.cos(Math.PI / 6)) / 3));
    expect(result.stats.nothing).toBe(false);
    expect(result.stats.tooDeep).toBe(false);
  });

  it("cuts grooves into strips so every groove is equally deep all round", () => {
    const result = applySurfaceTexture(tube(12, 0, 16), { pattern: "grooves", angle: 0, spacing: 4, depth: 0.8, width: 0.5, profile: "round" }, SMALL);
    expectClosed(result);
    const around = result.stats.around!;
    expect(around).toBe(Math.round((2 * Math.PI * 12) / 4));
    // Mid height: the deepest point of every groove reaches the full depth, the band between them stays on the wall.
    const wall = usedPoints(result).filter((p) => p.y > 4 && p.y < 12);
    const bottoms = new Array(around).fill(Infinity);
    const period = (2 * Math.PI) / around;
    // Seen from the layout, a groove's middle sits half a period after angle 0.
    wall.forEach((p) => {
      const k = Math.floor((p.angle + 2 * Math.PI) / period) % around;
      bottoms[k] = Math.min(bottoms[k], p.r);
    });
    bottoms.forEach((r) => expect(Math.abs(r - (12 - 0.8))).toBeLessThan(0.02));
    expect(Math.max(...wall.map((p) => p.r))).toBeGreaterThan(12 - 0.005);
  });

  it("raises bumps outward and leaves the inner wall of a cup alone", () => {
    const result = applySurfaceTexture(tube(15, 12, 18), { pattern: "bumps", spacing: 4, depth: 0.7, direction: "outward" }, SMALL);
    expectClosed(result);
    const points = usedPoints(result);
    const outer = points.filter((p) => p.r > 13.5 && p.y > 3 && p.y < 15);
    expect(Math.max(...outer.map((p) => p.r))).toBeGreaterThan(15 + 0.7 - 0.05);
    expect(Math.max(...outer.map((p) => p.r))).toBeLessThan(15 + 0.7 + 0.01);
    // The inner wall (not its rims on top and bottom) keeps its radius.
    points.filter((p) => p.r < 13.5 && p.y > 0.01 && p.y < 17.99).forEach((p) => expect(Math.abs(p.r - 12)).toBeLessThan(0.01));
  });

  it("cuts honeycomb along its joints: closed, and every joint reaches the full depth", () => {
    const result = applySurfaceTexture(tube(12, 0, 20), { pattern: "honeycomb", spacing: 5, depth: 0.5, width: 0.3, profile: "flat" }, SMALL);
    expectClosed(result);
    const wall = usedPoints(result).filter((p) => p.y > 4 && p.y < 16);
    const radii = wall.map((p) => p.r);
    expect(Math.min(...radii)).toBeGreaterThan(12 - 0.5 - 0.01);
    expect(Math.min(...radii)).toBeLessThan(12 - 0.5 + 0.01);
    // A flat profile: most of each cell stays on the wall.
    const onWall = radii.filter((r) => r > 12 - 0.01).length;
    expect(onWall).toBeGreaterThan(radii.length * 0.2);
  });

  it("keeps a height band only", () => {
    const result = applySurfaceTexture(tube(10, 0, 20), { pattern: "knurl", spacing: 3, depth: 0.5, zoneFrom: 50, fade: 0 }, SMALL);
    expectClosed(result);
    usedPoints(result).filter((p) => p.y > 0.01 && p.y < 9.99).forEach((p) => expect(p.r).toBeGreaterThan(10 * Math.cos(Math.PI / 96) - 1e-6));
    expect(Math.min(...usedPoints(result).filter((p) => p.y > 12 && p.y < 18).map((p) => p.r))).toBeLessThan(9.6);
  });

  it("textures a box all round and keeps its edges sharp", () => {
    const result = applySurfaceTexture(box(20, 20, 20), { pattern: "bumps", projection: "allRound", spacing: 4, depth: 0.5, bottomFree: 0, topFree: 0 }, SMALL);
    expectClosed(result);
    // The corners stay where they were.
    const corners = new Set<string>();
    for (let i = 0; i < result.vertices.length; i += 3) {
      const [x, y, z] = [result.vertices[i], result.vertices[i + 1], result.vertices[i + 2]];
      if (Math.abs(Math.abs(x) - 10) < 1e-9 && Math.abs(Math.abs(z) - 10) < 1e-9 && (Math.abs(y) < 1e-9 || Math.abs(y - 20) < 1e-9)) corners.add(`${x},${y},${z}`);
    }
    expect(corners.size).toBe(8);
    // Inward from both sides, a 20 mm box is far from pierced.
    expect(result.stats.tooDeep).toBe(false);
  }, 30000);

  it("warns when the depth inward from both sides would pierce a thin plate", () => {
    const result = applySurfaceTexture(box(30, 1, 30), { pattern: "bumps", projection: "flat", axis: "z", spacing: 5, depth: 0.6, bottomFree: 0, topFree: 0, keepEdges: false }, SMALL);
    expect(result.stats.tooDeep).toBe(true);
  });

  it("says when nothing gets the pattern", () => {
    const result = applySurfaceTexture(tube(10, 0, 20), { pattern: "knurl", outside: false }, SMALL);
    expect(result.stats.nothing).toBe(true);
  });

  it("keeps the texture out of a mask, or only in it", () => {
    // A box over the upper half of the cylinder (inside frame: y up), as the planes of its faces.
    const upperHalf = { planes: [1, 0, 0, 20, -1, 0, 0, 20, 0, 1, 0, 30, 0, -1, 0, -10, 0, 0, 1, 20, 0, 0, -1, 20] };
    const settings = { pattern: "knurl", spacing: 3, depth: 0.5, fade: 0.5 };
    const wall = (result: SurfaceTextureResult) => usedPoints(result).filter((p) => p.r > 5);
    const plain = 10 * Math.cos(Math.PI / 96) - 1e-6;
    const kept = applySurfaceTexture(tube(10, 0, 20), { ...settings, masks: [{ mode: "exclude", ...upperHalf }] }, SMALL);
    expectClosed(kept);
    wall(kept).filter((p) => p.y > 10.6).forEach((p) => expect(p.r).toBeGreaterThan(plain));
    expect(Math.min(...wall(kept).filter((p) => p.y > 3 && p.y < 9).map((p) => p.r))).toBeLessThan(9.6);
    const only = applySurfaceTexture(tube(10, 0, 20), { ...settings, masks: [{ mode: "only", ...upperHalf }] }, SMALL);
    expectClosed(only);
    wall(only).filter((p) => p.y < 9.4).forEach((p) => expect(p.r).toBeGreaterThan(plain));
    expect(Math.min(...wall(only).filter((p) => p.y > 11 && p.y < 17).map((p) => p.r))).toBeLessThan(9.6);
  });

  it("keeps only masks it can use", () => {
    const masks = normalizeSurfaceTexture({
      masks: [
        { mode: "exclude", planes: [0, 2, 0, 4] },
        { mode: "sometimes", planes: [1, 0, 0, 1] },
        { mode: "only", planes: [1, 0, 0] },
        { mode: "only", planes: [0, 0, 0, 1] },
        { mode: "only", planes: [1, 0, Number.NaN, 1] },
        "box",
      ],
    }).masks;
    expect(masks).toEqual([{ mode: "exclude", planes: [0, 1, 0, 2] }]);
  });

  it("refines once and reuses it when only the depth changes", () => {
    const session = createSurfaceTextureSession(tube(10, 0, 20));
    const first = session.apply({ pattern: "honeycomb", spacing: 4, depth: 0.3 }, SMALL);
    const second = session.apply({ pattern: "honeycomb", spacing: 4, depth: 0.9 }, SMALL);
    expect(second.vertices.length).toBe(first.vertices.length);
    const deepest = (r: SurfaceTextureResult) => Math.min(...usedPoints(r).filter((p) => p.y > 4 && p.y < 16).map((p) => p.r));
    expect(deepest(first)).toBeCloseTo(10 - 0.3, 1);
    expect(deepest(second)).toBeCloseTo(10 - 0.9, 1);
  });

  it("ends an image cut in round a cylinder in a short wall below the rim, not in notches running out at it", () => {
    const result = applySurfaceTexture(tube(12, 0, 20, 96, 2), { pattern: "image", projection: "cylinder" });
    const side = usedPoints(result).filter((p) => p.r > 6);
    // Up to the wall's foot the side stays whole (fade 1 mm, wall 0.15 mm); below the wall the picture is cut in.
    side.filter((p) => 20 - p.y < 0.84).forEach((p) => expect(p.r).toBeGreaterThan(12 - 1e-6));
    expect(Math.min(...side.filter((p) => 20 - p.y > 1.05 && 20 - p.y < 2).map((p) => p.r))).toBeLessThan(12 - 0.1);
  });

  it("leaves bumps cut in right on a box's corner off whole, not folded round it into a heart", () => {
    const result = applySurfaceTexture(box(40, 30, 30), { pattern: "bumps" });
    expect(result.stats.projection).toBe("cylinder");
    // No point of the four upright edges is cut in (a bump folded round the corner pulled them in), while the faces have
    // their bumps elsewhere.
    const v = result.vertices;
    let byCorner = 0, cutIn = 0;
    for (const i of new Set(result.indices)) {
      const [x, y, z] = [v[i * 3], v[i * 3 + 1], v[i * 3 + 2]];
      if (y < 3 || y > 27) continue;
      const fromX = 20 - Math.abs(x), fromZ = 15 - Math.abs(z);
      if (fromX < -1e-6 || fromZ < -1e-6) continue;
      if (Math.max(fromX, fromZ) > 0.6) continue;
      // A point of an upright edge itself, cut in (it moves in between both faces).
      if (Math.abs(fromX - fromZ) < 0.02 && Math.min(fromX, fromZ) > 0.1) byCorner += 1;
      if (Math.min(fromX, fromZ) < 1e-6 && Math.max(fromX, fromZ) > 0.3) cutIn += 1;
    }
    expect(byCorner).toBe(0);
    expect(cutIn).toBeGreaterThan(20);
  }, 30000);

  it("cuts a weave along its stakes and rows on a box: their sides straight, not in a sawtooth", () => {
    const result = applySurfaceTexture(box(40, 30, 30), { pattern: "weave" });
    expect(surfaceMeshReport(result.indices, result.vertices.length / 3)).toEqual({ shells: 1, openEdges: 0, nonManifoldEdges: 0 });
    // On the front face, away from its edges: a stake's side faces sideways, a row's joint up or down. A sawtooth along
    // them turned its teeth both ways at once.
    const v = result.vertices, I = result.indices;
    let teeth = 0, sides = 0;
    for (let t = 0; t < I.length / 3; t += 1) {
      const [a, b, c] = [I[t * 3], I[t * 3 + 1], I[t * 3 + 2]];
      const [x, y, z] = [0, 1, 2].map((k) => (v[a * 3 + k] + v[b * 3 + k] + v[c * 3 + k]) / 3);
      if (z < 14 || Math.abs(x) > 17 || y < 3 || y > 27) continue;
      const u = [v[b * 3] - v[a * 3], v[b * 3 + 1] - v[a * 3 + 1], v[b * 3 + 2] - v[a * 3 + 2]];
      const w = [v[c * 3] - v[a * 3], v[c * 3 + 1] - v[a * 3 + 1], v[c * 3 + 2] - v[a * 3 + 2]];
      const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      const l = Math.hypot(n[0], n[1], n[2]) || 1;
      if (Math.abs(n[0] / l) > 0.4) sides += 1;
      if (Math.abs(n[0] / l) > 0.4 && Math.abs(n[1] / l) > 0.4) teeth += 1;
    }
    expect(sides).toBeGreaterThan(100);
    // (About one in seven before, one in thirty now.)
    expect(teeth).toBeLessThan(0.1 * sides);
    // Round the upright edges it bends in an arc, cut upright: no column of teeth tilted up and down along them.
    let byEdges = 0, tilted = 0;
    for (let t = 0; t < I.length / 3; t += 1) {
      const [a, b, c] = [I[t * 3], I[t * 3 + 1], I[t * 3 + 2]];
      const [x, y, z] = [0, 1, 2].map((k) => (v[a * 3 + k] + v[b * 3 + k] + v[c * 3 + k]) / 3);
      if (Math.abs(x) < 19 || Math.abs(z) < 14 || y < 3 || y > 27) continue;
      const u = [v[b * 3] - v[a * 3], v[b * 3 + 1] - v[a * 3 + 1], v[b * 3 + 2] - v[a * 3 + 2]];
      const w = [v[c * 3] - v[a * 3], v[c * 3 + 1] - v[a * 3 + 1], v[c * 3 + 2] - v[a * 3 + 2]];
      const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      byEdges += 1;
      if (Math.abs(n[1]) > 0.5 * (Math.hypot(n[0], n[1], n[2]) || 1)) tilted += 1;
    }
    expect(byEdges).toBeGreaterThan(500);
    expect(tilted).toBeLessThan(0.015 * byEdges);
  }, 30000);

  it("runs rope out at a cylinder's rim on rows cut at its steps, not over halved triangles", () => {
    const result = applySurfaceTexture(tube(12, 0, 20, 96, 2), { pattern: "rope", projection: "cylinder" });
    expect(surfaceMeshReport(result.indices, result.vertices.length / 3)).toEqual({ shells: 1, openEdges: 0, nonManifoldEdges: 0 });
    // Fade 1 mm in four steps: rows of points all round, a quarter mm apart below the rim.
    const side = usedPoints(result).filter((p) => Math.abs(p.r) > 6);
    for (const step of [0.25, 0.5, 0.75]) expect(side.filter((p) => Math.abs(20 - p.y - step) < 1e-6).length).toBeGreaterThan(90);
  }, 30000);
});
