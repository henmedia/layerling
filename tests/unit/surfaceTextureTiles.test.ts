import { describe, expect, it } from "vitest";
import {
  applySurfaceTexture,
  createSurfaceTextureSession,
  insideToScreenPositions,
  makeSurfaceTextureLayout,
  normalizeSurfaceTexture,
  SURFACE_TEXTURE_PROFILES,
  surfaceTexturePositions,
  surfaceTextureValueAt,
  type SurfaceTextureResult,
} from "@/lib/surfaceTexture";
import { prepareSurfaceBase, surfaceMeshReport } from "@/lib/surfaceTextureMesh";
import { analyzeTriangleSoup } from "@/lib/svgImport";

/**
 * Squares and triangles (Discussion #1302): tiles of one size with one gap, raised or pressed in, their walls cut along
 * straight lines; centred on a box's faces or starting at the bottom edge, down onto the bed for a brim; round a
 * cylinder a whole number of them, the gap rounded.
 */

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

/** A closed frustum standing on the plate (inside frame, y up), `bottom` and `top` its radii, wound outward. */
function frustum(bottom: number, top: number, height: number, segments = 96): number[] {
  const out: number[] = [];
  const tri = (a: Vec3, b: Vec3, c: Vec3) => out.push(...a, ...b, ...c);
  const at = (r: number, k: number, y: number): Vec3 => {
    const a = (2 * Math.PI * k) / segments;
    return [r * Math.cos(a), y, r * Math.sin(a)];
  };
  for (let k = 0; k < segments; k += 1) {
    tri(at(bottom, k, 0), at(top, k, height), at(top, k + 1, height));
    tri(at(bottom, k, 0), at(top, k + 1, height), at(bottom, k + 1, 0));
    tri([0, height, 0], at(top, k + 1, height), at(top, k, height));
    tri([0, 0, 0], at(bottom, k, 0), at(bottom, k + 1, 0));
  }
  return out;
}

/** A closed box standing on the plate, inside frame (y up, the front at z = d / 2), faces wound outward. */
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

/** Every point a triangle uses. */
function usedPoints(result: SurfaceTextureResult) {
  return Array.from(new Set(result.indices), (i) => [result.vertices[i * 3], result.vertices[i * 3 + 1], result.vertices[i * 3 + 2]] as Vec3);
}

/** Where `x` lies in a row of tiles `period` apart beginning at `origin`: 0 to period. */
const inRow = (x: number, origin: number, period: number) => ((((x - origin) % period) + period) % period);

const BOX = { w: 40, h: 30, d: 25 };
const FRONT = BOX.d / 2;

/**
 * Squares `size` wide, `gap` apart, beginning at (ox, oy) on the box's front: their height there, 0 to 1, worked out
 * here on its own - flat with a wall of 0.1 mm in the gap, or pointed (a pyramid).
 */
function squareRise(x: number, y: number, ox: number, oy: number, size: number, gap: number, profile: "flat" | "pointed") {
  const P = size + gap;
  const inside = (w: number) => {
    const m = inRow(w, 0, P);
    return m <= size ? Math.min(m, size - m) : -Math.min(m - size, P - m);
  };
  const d = Math.min(inside(x - ox), inside(y - oy));
  return profile === "flat" ? Math.min(1, Math.max(0, 1 + d / 0.1)) : Math.max(0, d / (size / 2));
}

/**
 * How far the triangles on the box's front lie off a pattern `rise` (0 to 1, at a depth of 0.6), measured in their
 * middles: away from the front's edges, where the pattern runs out. Cut along their walls and creases, every triangle is
 * flat as the pattern is, but for points left closer to a line than the cuts come (0.025 mm), which lie on it.
 */
function worstOnFront(result: SurfaceTextureResult, rise: (x: number, y: number) => number) {
  const v = result.vertices, I = result.indices;
  let checked = 0, worst = 0;
  for (let t = 0; t < I.length; t += 3) {
    const ids = [I[t], I[t + 1], I[t + 2]];
    if (ids.some((k) => v[k * 3 + 2] < FRONT - 1e-6)) continue;
    const c = [0, 1, 2].map((e) => ids.reduce((sum, k) => sum + v[k * 3 + e], 0) / 3);
    if (Math.abs(c[0]) > BOX.w / 2 - 1.5 || c[1] < 1.5 || c[1] > BOX.h - 1.5) continue;
    checked += 1;
    worst = Math.max(worst, Math.abs(c[2] - FRONT - 0.6 * rise(c[0], c[1])));
  }
  expect(checked).toBeGreaterThan(200);
  return worst;
}

describe("squares and triangles", () => {
  it("know their settings: raised tiles with steep walls, the gap in mm, from the bottom edge if asked", () => {
    expect(normalizeSurfaceTexture({ pattern: "squares" })).toMatchObject({ spacing: 4, tileGap: 2, depth: 0.6, profile: "flat", direction: "outward", tileFromBottom: false });
    expect(normalizeSurfaceTexture({ pattern: "triangles" })).toMatchObject({ spacing: 6, tileGap: 2, profile: "flat", direction: "outward" });
    expect(normalizeSurfaceTexture({ pattern: "squares", spacing: 3.2, tileGap: "3.2", tileFromBottom: "true", direction: "inward" })).toMatchObject({ spacing: 3.2, tileGap: 3.2, tileFromBottom: true, direction: "inward" });
    expect(normalizeSurfaceTexture({ pattern: "triangles", tileGap: 0, tileFromBottom: 1 })).toMatchObject({ tileGap: 0.2, tileFromBottom: false });
    // Leaving them, the gap stays as it is for the next time; the others do not use it.
    expect(normalizeSurfaceTexture({ pattern: "knurl", tileGap: 5 })).toMatchObject({ spacing: 3, tileGap: 5 });
  });

  it("lays squares of the set size and gap on a box's front, centred, their walls steep and cut cleanly", () => {
    const asked = { pattern: "squares", spacing: 3.2, tileGap: 3.2 } as const;
    const session = createSurfaceTextureSession(box(BOX.w, BOX.h, BOX.d));
    const result = session.apply(asked);
    expectClosed(result);
    expect(result.stats.projection).toBe("allRound");
    expect(result.stats.tiles).toEqual({ size: 3.2, gap: 3.2 });
    const s = normalizeSurfaceTexture(asked);
    // On the front, away from its edges (the pattern runs out over the fade there): raised by the full depth exactly on
    // the squares, from -1.6 to 1.6 across the middle and then every 6.4 mm; up its height centred too.
    const front = usedPoints(result).filter(([x, y, z]) => z > FRONT - 1e-6 && Math.abs(x) < BOX.w / 2 - 1.5 && y > 1.5 && y < BOX.h - 1.5);
    const ox = -1.6, oy = BOX.h / 2 - 1.6;
    const raised = front.filter(([, , z]) => Math.abs(z - FRONT - s.depth) < 1e-6);
    expect(raised.length).toBeGreaterThan(100);
    // (A point closer to a square's side than 0.025 mm lies on it: the cuts come no closer to a point.)
    const onSquare = (w: number, o: number) => inRow(w, o, 6.4) < 3.2 + 0.025 || inRow(w, o, 6.4) > 6.4 - 0.025;
    for (const [x, y] of raised) expect(onSquare(x, ox) && onSquare(y, oy)).toBe(true);
    // The squares' corners are points of the mesh at the full height: their faces exactly 3.2 mm, 3.2 mm apart.
    const at = (x: number, y: number) => raised.some((p) => Math.hypot(p[0] - x, p[1] - y) < 1e-6);
    for (const [x, y] of [[-1.6, oy], [1.6, oy], [-1.6, oy + 3.2], [1.6, oy + 3.2], [4.8, oy], [8, oy + 3.2], [-8, oy - 6.4 + 3.2]]) expect(at(x, y)).toBe(true);
    // In the gap the surface stays: the wall's foot 0.1 mm beside a square's side, nothing raised between.
    const between = front.filter(([, , z]) => z > FRONT + 1e-6 && z < FRONT + s.depth - 1e-6);
    for (const [x, y] of between) {
      const across = (w: number, o: number) => Math.min(Math.abs(inRow(w, o, 6.4) - 3.2), Math.abs(inRow(w, o, 6.4) - 6.4), inRow(w, o, 6.4));
      expect(Math.min(across(x, ox), across(y, oy))).toBeLessThan(0.1 + 1e-6);
    }
    // Every triangle on the front lies as the squares do: the walls and their mitred corners are cut.
    expect(worstOnFront(result, (x, y) => squareRise(x, y, ox, oy, 3.2, 3.2, "flat"))).toBeLessThan(0.05);
    // And the core says so too.
    const layout = makeSurfaceTextureLayout(session.base, { ...s, projection: "allRound" });
    const value = (x: number, y: number) => surfaceTextureValueAt(x, -FRONT, y, 0, -1, 0, s, layout);
    expect([value(0, oy + 1.6), value(1.6, oy), value(1.65, oy + 1), value(1.75, oy + 1), value(3.2, oy + 1), value(0, oy - 1.6)].map((x) => +x.toFixed(9))).toEqual([1, 1, 0.5, 0, 0, 0]);
  }, 60_000);

  it("starts a row at the bottom edge with tileFromBottom, the squares reaching down onto the bed, the bottom flat", () => {
    for (const direction of ["outward", "inward"] as const) {
      const result = applySurfaceTexture(box(BOX.w, BOX.h, BOX.d), { pattern: "squares", spacing: 3.2, tileGap: 3.2, tileFromBottom: true, faces: ["front", "right"], direction });
      expectClosed(result);
      const sign = direction === "outward" ? 1 : -1;
      const full = FRONT + sign * 0.6;
      const points = usedPoints(result);
      // The bottom stays on the bed.
      expect(Math.min(...points.map(([, y]) => y))).toBeCloseTo(0, 9);
      // The rows from the bottom up: 0 to 3.2, 6.4 to 9.6 ...; the squares' corners on the bed itself at the full depth.
      const front = points.filter(([x, , z]) => Math.abs(z - full) < 1e-6 && Math.abs(x) < BOX.w / 2 - 1.5);
      for (const [, y] of front) expect(inRow(y, 0, 6.4) < 3.2 + 0.025 || inRow(y, 0, 6.4) > 6.4 - 0.025).toBe(true);
      for (const [x, y] of [[-1.6, 0], [1.6, 0], [-1.6, 3.2], [4.8, 6.4], [8, 9.6]]) expect(front.some((p) => Math.hypot(p[0] - x, p[1] - y) < 1e-6)).toBe(true);
      // On the bed a raised square widens the bottom (a pressed one notches it), straight under the square.
      const bed = points.filter(([x, y, z]) => y < 1e-9 && Math.abs(z - full) < 1e-6 && Math.abs(x) < BOX.w / 2 - 1.5);
      expect(bed.length).toBeGreaterThan(5);
      for (const [x] of bed) expect(inRow(x, -1.6, 6.4) < 3.2 + 0.025 || inRow(x, -1.6, 6.4) > 6.4 - 0.025).toBe(true);
      // The right side as well, with its own grid along its width.
      expect(points.some(([x, y]) => y < 1e-9 && Math.abs(x - BOX.w / 2 - sign * 0.6) < 1e-6)).toBe(true);
      // The faces not picked stay as they were.
      expect(points.every(([x, , z]) => x > -BOX.w / 2 - 1e-6 && z > -FRONT - 1e-6)).toBe(true);
    }
  }, 60_000);

  it("moves the bed's rim under a slanted side along the bed, as far as the side stands out there", () => {
    // A frustum narrowing upwards, 14 degrees off upright: the side moved out by 0.6 meets the bed 0.6 / cos further out.
    const result = applySurfaceTexture(frustum(15, 10, 20), { pattern: "squares", spacing: 3.2, tileGap: 3.2, tileFromBottom: true });
    expectClosed(result);
    expect(result.stats.projection).toBe("cylinder");
    const slant = Math.atan(5 / 20);
    const bed = usedPoints(result).filter(([, y]) => y < 1e-9).map(([x, , z]) => Math.hypot(x, z));
    expect(Math.max(...bed)).toBeCloseTo(15 + 0.6 / Math.cos(slant), 2);
    expect(Math.min(...usedPoints(result).map(([, y]) => y))).toBeCloseTo(0, 9);
  }, 60_000);

  it("makes the bathroom set of Discussion #1302: 3.2 mm squares 3.2 mm apart on two sides, from the bed to half the height", () => {
    // A box 60 wide, 50 high and 40 deep; a helper body over its upper half keeps the texture away there (a mask: the
    // planes of its faces, inside frame, inside where normal · point <= d).
    const upperHalf = { mode: "exclude", planes: [0, -1, 0, -25, 0, 1, 0, 60, 1, 0, 0, 40, -1, 0, 0, 40, 0, 0, 1, 30, 0, 0, -1, 30], box: [-40, 25, -30, 40, 60, 30] };
    const result = applySurfaceTexture(box(60, 50, 40), { pattern: "squares", spacing: 3.2, tileGap: 3.2, tileFromBottom: true, faces: ["front", "right"], masks: [upperHalf] });
    expectClosed(result);
    const points = usedPoints(result);
    const front = points.filter(([x, , z]) => Math.abs(z - 20.6) < 1e-6 && Math.abs(x) < 28.5);
    // Four whole rows from the bed up, the last from 19.2 to 22.4 mm; nothing raised above the mask's edge at 25 mm.
    expect(Math.min(...front.map(([, y]) => y))).toBeCloseTo(0, 9);
    expect(Math.max(...front.map(([, y]) => y))).toBeCloseTo(22.4, 6);
    expect(points.some(([x, y, z]) => y > 24 && (z > 20 + 1e-6 || x > 30 + 1e-6))).toBe(false);
    // The squares stand on the bed on both sides.
    expect(points.some(([x, y, z]) => y < 1e-9 && Math.abs(x) < 28 && Math.abs(z - 20.6) < 1e-6)).toBe(true);
    expect(points.some(([x, y, z]) => y < 1e-9 && Math.abs(z) < 18 && Math.abs(x - 30.6) < 1e-6)).toBe(true);
  }, 60_000);

  it("keeps the bed's rim where it was without tileFromBottom, a row centred across it", () => {
    // 26 mm high: centred, a row of squares lies from 1.4 mm below the bottom edge to 1.8 mm above it.
    const result = applySurfaceTexture(box(BOX.w, 26, BOX.d), { pattern: "squares", spacing: 3.2, tileGap: 3.2, faces: ["front"] });
    expectClosed(result);
    const points = usedPoints(result);
    expect(points.some(([x, y, z]) => Math.abs(x) < 2 && Math.abs(y - 1.3) < 0.55 && Math.abs(z - FRONT - 0.6) < 1e-6)).toBe(true);
    expect(points.some(([x, y, z]) => y < 1e-9 && Math.abs(x) < 18 && z > FRONT + 1e-6)).toBe(false);
  }, 60_000);

  it("lays triangles in rows, pointing up and down in turn, of the set side and with the gap between their sides", () => {
    const result = applySurfaceTexture(box(BOX.w, BOX.h, BOX.d), { pattern: "triangles", spacing: 3.2, tileGap: 3.2, tileFromBottom: true, faces: ["front"] });
    expectClosed(result);
    const front = usedPoints(result).filter(([, , z]) => Math.abs(z - FRONT - 0.6) < 1e-6);
    const at = (x: number, y: number) => front.some((p) => Math.hypot(p[0] - x, p[1] - y) < 1e-4);
    const h = (3.2 * Math.sqrt(3)) / 2;
    // An upward triangle in the middle with its side on the bed, 3.2 mm wide and 2.77 mm high.
    expect(at(-1.6, 0) && at(1.6, 0) && at(0, h)).toBe(true);
    // A downward one beside it, its side parallel to the upward one's 3.2 mm away: its tip half a gap up, its top a gap
    // above the upward one's tip.
    const tip: Vec3 = [-1.6 - 3.2 / Math.sqrt(3) * 1.5, 1.6, 0];
    expect(at(tip[0], tip[1])).toBe(true);
    expect(at(tip[0] - 1.6, 1.6 + h) && at(tip[0] + 1.6, 1.6 + h)).toBe(true);
    const normal = [Math.sqrt(3) / 2, -0.5];
    expect(normal[0] * (-1.6 - (tip[0] + 1.6)) + normal[1] * (0 - (1.6 + h))).toBeCloseTo(3.2, 3);
    // The next row's upward triangles a gap above the downward ones' tops, half a row along.
    expect(at(tip[0] - 1.6, 1.6 + h + 3.2) && at(tip[0] + 1.6, 1.6 + h + 3.2)).toBe(true);
    // Between them the front stays where it was.
    expect(front.some(([x, y]) => Math.abs(x) < 0.5 && y > h + 0.2 && y < 1.6 + h + 3.2 - 0.2)).toBe(false);
  }, 60_000);

  it("makes pyramids and cushions with the other profiles, cut along their ridges", () => {
    const s = normalizeSurfaceTexture({ pattern: "squares", spacing: 4, tileGap: 2, profile: "pointed", projection: "allRound" });
    const session = createSurfaceTextureSession(box(BOX.w, BOX.h, BOX.d));
    const layout = makeSurfaceTextureLayout(session.base, s);
    const value = (x: number, y: number) => surfaceTextureValueAt(x, -FRONT, y, 0, -1, 0, s, layout);
    const oy = BOX.h / 2;
    // A pyramid: its tip in the middle, half way up a quarter in, nothing on its border or in the gap.
    expect(value(0, oy)).toBeCloseTo(1, 9);
    expect(value(1, oy)).toBeCloseTo(0.5, 9);
    expect(value(1, oy + 1)).toBeCloseTo(0.5, 9);
    expect(value(2, oy)).toBe(0);
    expect(value(3, oy)).toBe(0);
    const result = session.apply(s);
    expectClosed(result);
    // The tip is a point of the mesh, and every triangle on the front lies as the pyramids do: the ridges from the tip
    // to the corners are cut.
    expect(usedPoints(result).some(([x, y, z]) => Math.hypot(x, y - oy) < 1e-6 && Math.abs(z - FRONT - 0.6) < 1e-6)).toBe(true);
    expect(worstOnFront(result, (x, y) => squareRise(x, y, -2, oy - 2, 4, 2, "pointed"))).toBeLessThan(0.02);
    for (const profile of SURFACE_TEXTURE_PROFILES) {
      for (const pattern of ["squares", "triangles"] as const) expectClosed(session.apply({ pattern, profile, spacing: 4, tileGap: 1.5, direction: "both" }));
    }
  }, 120_000);

  it("goes round a cylinder with a whole number of tiles, the size kept and the gap rounded, raised or pressed in", () => {
    for (const pattern of ["squares", "triangles"] as const) {
      for (const direction of ["outward", "inward"] as const) {
        const result = applySurfaceTexture(cylinder(12, 20), { pattern, spacing: 3.2, tileGap: 3.2, direction, tileFromBottom: true });
        expectClosed(result);
        expect(result.stats.projection).toBe("cylinder");
        const C = 2 * Math.PI * 12;
        const period = (gap: number) => (pattern === "squares" ? 3.2 + gap : 3.2 + Math.sqrt(3) * gap);
        const k = result.stats.around!;
        expect(k).toBe(Math.round(C / period(3.2)));
        expect(result.stats.tiles!.size).toBe(3.2);
        // Round the mean radius of the walls (a little less than 12 on 96 sides).
        expect(period(result.stats.tiles!.gap) * k).toBeCloseTo(C, 1);
        expect(Math.abs(result.stats.tiles!.gap - 3.2)).toBeLessThan(0.4);
        expect(result.stats.spacing).toBe(3.2);
        // Raised to the full depth (pressed in as deep) and down onto the bed.
        const radii = usedPoints(result).map(([x, y, z]) => ({ r: Math.hypot(x, z), y })).filter((p) => p.r > 11 && p.y < 19);
        const full = direction === "outward" ? 12.6 : 11.4;
        const deepest = direction === "outward" ? Math.max(...radii.map((p) => p.r)) : Math.min(...radii.map((p) => p.r));
        expect(deepest).toBeCloseTo(full, 1);
        expect(radii.some((p) => p.y < 1e-9 && Math.abs(p.r - full) < 0.01)).toBe(true);
      }
    }
  }, 120_000);

  it("centres a square in front of a cylinder, along the axis on the faces that get it", () => {
    const s = normalizeSurfaceTexture({ pattern: "squares", spacing: 3, tileGap: 2, projection: "cylinder" });
    const layout = makeSurfaceTextureLayout(prepareSurfaceBase(insideToScreenPositions(cylinder(12, 20))), s);
    const R = layout.radius;
    // The front is -y in the core's frame; the middle of the height 10 mm up.
    const value = (around: number, z: number) => {
      const a = -Math.PI / 2 + around / R;
      return surfaceTextureValueAt(R * Math.cos(a), R * Math.sin(a), z, Math.cos(a), Math.sin(a), 0, s, layout);
    };
    expect(value(0, 10)).toBe(1);
    expect(value(1.45, 11.45)).toBe(1);
    expect(value(-1.45, 8.55)).toBe(1);
    expect(value(2.4, 10)).toBe(0);
    expect(value(0, 12.4)).toBe(0);
  });
});
