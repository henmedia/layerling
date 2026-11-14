import { describe, expect, it } from "vitest";
import { applySurfaceTexture, lettersWhole, normalizeSurfaceTexture, surfaceTexturePositions, type SurfaceTextureResult } from "@/lib/surfaceTexture";
import { prepareSurfaceBase, surfaceMeshReport } from "@/lib/surfaceTextureMesh";
import { analyzeTriangleSoup } from "@/lib/svgImport";
import { surfaceTextOutline } from "@/lib/surfaceTextOutline";
import { unfoldSurface } from "@/lib/surfaceTextureUnfold";
import { createStarGeometry } from "@/lib/starGeometry";

type Vec3 = [number, number, number];

/** A closed cylinder standing on the plate (inside frame, y up), faces wound outward, `rings` rows of points up the wall. */
function cylinder(radius: number, height: number, segments = 96, rings = 8): number[] {
  const out: number[] = [];
  const tri = (a: Vec3, b: Vec3, c: Vec3) => out.push(...a, ...b, ...c);
  const at = (k: number, y: number): Vec3 => {
    const a = (2 * Math.PI * k) / segments;
    return [radius * Math.cos(a), y, radius * Math.sin(a)];
  };
  for (let k = 0; k < segments; k += 1) {
    for (let j = 0; j < rings - 1; j += 1) {
      const y0 = (height * j) / (rings - 1), y1 = (height * (j + 1)) / (rings - 1);
      tri(at(k, y0), at(k, y1), at(k + 1, y1));
      tri(at(k, y0), at(k + 1, y1), at(k + 1, y0));
    }
    tri([0, height, 0], at(k + 1, height), at(k, height));
    tri([0, 0, 0], at(k, 0), at(k + 1, 0));
  }
  return out;
}

/** A closed capsule standing on the plate (inside frame, y up), half spheres on a cylinder `straight` mm long, wound outward. */
function capsule(radius: number, straight: number, segments = 64, rings = 16): number[] {
  const out: number[] = [];
  const tri = (a: Vec3, b: Vec3, c: Vec3) => out.push(...a, ...b, ...c);
  const profile: Array<[number, number]> = [];
  for (let j = 0; j <= rings; j += 1) profile.push([radius * Math.cos((Math.PI / 2) * (j / rings - 1)), radius + radius * Math.sin((Math.PI / 2) * (j / rings - 1))]);
  for (let j = 1; j <= 4; j += 1) profile.push([radius, radius + (straight * j) / 4]);
  for (let j = 1; j <= rings; j += 1) profile.push([radius * Math.cos((Math.PI / 2) * (j / rings)), radius + straight + radius * Math.sin((Math.PI / 2) * (j / rings))]);
  // The poles lie on the axis exactly, so the triangles round each meet in one point.
  profile[0][0] = profile[profile.length - 1][0] = 0;
  const at = (k: number, [r, y]: [number, number]): Vec3 => [r * Math.cos((2 * Math.PI * k) / segments), y, r * Math.sin((2 * Math.PI * k) / segments)];
  for (let k = 0; k < segments; k += 1) {
    for (let j = 0; j < profile.length - 1; j += 1) {
      // At a pole the two triangles of a quad shrink to one.
      if (profile[j + 1][0] > 0) tri(at(k, profile[j]), at(k, profile[j + 1]), at(k + 1, profile[j + 1]));
      if (profile[j][0] > 0) tri(at(k, profile[j]), at(k + 1, profile[j + 1]), at(k + 1, profile[j]));
    }
  }
  return out;
}

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
 * A star standing on the plate (inside frame, y up), its first point at the front (+z), its sides in six rows. With a
 * chamfer `c` its top edge is cut back, the points 2c mm in and down c; with `slivers` each top edge is split at its
 * middle by a triangle without area, as exported meshes often are (cleaned to a split edge before unrolling).
 */
function star(points: number, outer: number, inner: number, height: number, c = 0, slivers = false): number[] {
  const out: number[] = [];
  const tri = (a: Vec3, b: Vec3, d: Vec3) => out.push(...a, ...b, ...d);
  const at = (k: number, y: number, inset = 0): Vec3 => {
    const a = (Math.PI * k) / points, r = (k % 2 ? inner : outer) * (1 - inset);
    return [r * Math.sin(a), y, r * Math.cos(a)];
  };
  const wall = height - c, inset = (2 * c) / outer;
  for (let k = 0; k < points * 2; k += 1) {
    for (let j = 0; j < 6; j += 1) {
      const y0 = (wall * j) / 6, y1 = (wall * (j + 1)) / 6;
      tri(at(k, y0), at(k + 1, y0), at(k + 1, y1));
      tri(at(k, y0), at(k + 1, y1), at(k, y1));
    }
    if (c) {
      tri(at(k, wall), at(k + 1, wall), at(k + 1, height, inset));
      tri(at(k, wall), at(k + 1, height, inset), at(k, height, inset));
    }
    const [a, b] = [at(k, height, inset), at(k + 1, height, inset)];
    if (slivers) {
      const m: Vec3 = [(a[0] + b[0]) / 2, height, (a[2] + b[2]) / 2];
      tri(a, m, b);
      tri([0, height, 0], a, m);
      tri([0, height, 0], m, b);
    } else tri([0, height, 0], a, b);
    tri([0, 0, 0], at(k + 1, 0), at(k, 0));
  }
  return out;
}

/** A star like `star`, its top `scale` times its bottom: the sides lean in (or out), each a flat trapezoid in a 6 x 6 grid. */
function taperedStar(points: number, outer: number, inner: number, height: number, scale: number) {
  const out: number[] = [];
  const tri = (a: Vec3, b: Vec3, d: Vec3) => out.push(...a, ...b, ...d);
  const corner = (k: number, t: number): Vec3 => {
    const a = (Math.PI * k) / points, r = (k % 2 ? inner : outer) * (1 + (scale - 1) * t);
    return [r * Math.sin(a), height * t, r * Math.cos(a)];
  };
  const at = (k: number, w: number, t: number): Vec3 => {
    const [p, q] = [corner(k, t), corner(k + 1, t)];
    return [p[0] + (q[0] - p[0]) * w, p[1], p[2] + (q[2] - p[2]) * w];
  };
  for (let k = 0; k < points * 2; k += 1) {
    for (let j = 0; j < 6; j += 1) {
      for (let i = 0; i < 6; i += 1) {
        tri(at(k, i / 6, j / 6), at(k, (i + 1) / 6, j / 6), at(k, (i + 1) / 6, (j + 1) / 6));
        tri(at(k, i / 6, j / 6), at(k, (i + 1) / 6, (j + 1) / 6), at(k, i / 6, (j + 1) / 6));
      }
      tri([0, height, 0], at(k, j / 6, 1), at(k, (j + 1) / 6, 1));
      tri([0, 0, 0], at(k, (j + 1) / 6, 0), at(k, j / 6, 0));
    }
  }
  return { positions: out, corner };
}

/**
 * A star (5 points, 20 and 10 from the middle) with its top edge rounded off (radius `round`, in `steps` facets: the
 * outline offset evenly inwards at each) or its top cut off at `slant` degrees; its walls in six rows.
 */
function shapedStar(round: number, steps: number, slant = 0): number[] {
  const out: number[] = [];
  const tri = (a: Vec3, b: Vec3, d: Vec3) => out.push(...a, ...b, ...d);
  const base = Array.from({ length: 10 }, (_, k) => [(k % 2 ? 10 : 20) * Math.sin((Math.PI * k) / 5), (k % 2 ? 10 : 20) * Math.cos((Math.PI * k) / 5)]);
  const inwards = (d: number) => base.map((p, k) => {
    const [prev, next] = [base[(k + 9) % 10], base[(k + 1) % 10]];
    const normal = (a: number[], b: number[]) => {
      const [ex, ez] = [b[0] - a[0], b[1] - a[1]];
      return [ez / Math.hypot(ex, ez), -ex / Math.hypot(ex, ez)].map((x) => -x);
    };
    const [n1, n2] = [normal(prev, p), normal(p, next)];
    const [bx, bz] = [n1[0] + n2[0], n1[1] + n2[1]];
    const scale = d / ((n1[0] * bx + n1[1] * bz) / Math.hypot(bx, bz)) / Math.hypot(bx, bz);
    return [p[0] + bx * scale, p[1] + bz * scale];
  });
  const top = (x: number) => 10 + x * Math.tan((slant * Math.PI) / 180);
  const rings: Array<[number[][], (x: number) => number]> = [];
  for (let j = 0; j <= 6; j += 1) rings.push([base, (x) => ((top(x) - round) * j) / 6]);
  for (let j = 1; j <= steps; j += 1) {
    const t = (Math.PI / 2) * (j / steps);
    rings.push([inwards(round - round * Math.cos(t)), (x) => top(x) - round + round * Math.sin(t)]);
  }
  const at = ([ring, y]: [number[][], (x: number) => number], k: number): Vec3 => {
    const p = ring[k % 10];
    return [p[0], y(p[0]), p[1]];
  };
  for (let k = 0; k < 10; k += 1) {
    for (let j = 0; j + 1 < rings.length; j += 1) {
      tri(at(rings[j], k), at(rings[j], k + 1), at(rings[j + 1], k + 1));
      tri(at(rings[j], k), at(rings[j + 1], k + 1), at(rings[j + 1], k));
    }
    const last = rings[rings.length - 1];
    tri([0, last[1](0), 0], at(last, k), at(last, k + 1));
    tri([0, 0, 0], at(rings[0], k + 1), at(rings[0], k));
  }
  return out;
}

function signedVolume(positions: ArrayLike<number>) {
  let volume = 0;
  for (let i = 0; i < positions.length; i += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = Array.from({ length: 9 }, (_, k) => positions[i + k]);
    volume += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  return volume;
}

function expectClosed(result: Pick<SurfaceTextureResult, "vertices" | "indices">) {
  expect(surfaceMeshReport(result.indices, result.vertices.length / 3)).toMatchObject({ openEdges: 0, nonManifoldEdges: 0 });
  const positions = surfaceTexturePositions(result);
  const analysis = analyzeTriangleSoup(positions);
  expect(analysis.boundaryEdges).toBe(0);
  expect(analysis.nonManifoldEdges).toBe(0);
  expect(signedVolume(positions)).toBeGreaterThan(0);
}

/** A square ring - an "O" of straight strokes, 10 mm high, 2 mm strokes - centred on 0, 0, plus an "I" beside it. */
const OI = [
  [-8, -5, 2, -5, 2, 5, -8, 5],
  [-6, -3, 0, -3, 0, 3, -6, 3],
  [4, -5, 6, -5, 6, 5, 4, 5],
];

const TEXT = { pattern: "text", depth: 0.6, direction: "outward", textOutline: OI, detail: "coarse" };

describe("text stuck on", () => {
  it("knows its settings and keeps them within their limits", () => {
    const s = normalizeSurfaceTexture({ pattern: "text", textContent: "x".repeat(300), textFont: 7, textSize: 1000, textTurn: "45", textOutline: [[0, 0, 1, 0, 1, 1], [0, 0, NaN, 1, 1, 1], [1, 2], "no"] });
    expect(s).toMatchObject({ pattern: "text", textFont: "Multilanguage", textSize: 200, textTurn: 45 });
    expect(s.textContent).toHaveLength(200);
    expect(s.textOutline).toEqual([[0, 0, 1, 0, 1, 1]]);
  });

  it("raises the letters on the front of a cylinder, closed, readable from outside and nowhere else", () => {
    const result = applySurfaceTexture(cylinder(30, 60), TEXT);
    expect(result.stats.text).toEqual({ placed: true, torn: 0 });
    expectClosed(result);
    // Front (inside frame +z), half way up: out by the depth inside the strokes, smooth outside the window.
    let strayed = 0;
    const raisedAt: number[] = [];
    const v = result.vertices;
    for (let i = 0; i < v.length; i += 3) {
      const [x, y, z] = [v[i], v[i + 1], v[i + 2]];
      if (y < 0.5 || y > 59.5) continue;
      const out = Math.hypot(x, z) - 30;
      // Along the wall to the right, seen from the front.
      const along = Math.atan2(x, z) * 30;
      if (out > 0.55) raisedAt.push(along);
      if (out > 0.01 && (Math.abs(y - 30) > 7 || Math.abs(along + 1) > 10)) strayed += 1;
    }
    expect(strayed).toBe(0);
    // The "O" on the left, the "I" on the right - not mirrored - and their length and the gap kept round the wall.
    expect(raisedAt.some((along) => along < -6)).toBe(true);
    expect(raisedAt.some((along) => along > 4.5 && along < 5.5)).toBe(true);
    expect(Math.min(...raisedAt)).toBeGreaterThan(-8.3);
    expect(Math.max(...raisedAt)).toBeLessThan(6.3);
    expect(raisedAt.some((along) => along > 2.3 && along < 3.7)).toBe(false);
  });

  it("goes round the edge of a box unbroken, engraved into both faces", () => {
    const result = applySurfaceTexture(box(40, 40, 40), { ...TEXT, direction: "inward", textAround: 45 });
    expect(result.stats.text).toEqual({ placed: true, torn: 0 });
    expectClosed(result);
    let front = 0, right = 0;
    const v = result.vertices;
    for (let i = 0; i < v.length; i += 3) {
      // At the full depth, 0.6 mm in.
      if (Math.abs(v[i + 2] - 19.4) < 0.01 && Math.abs(v[i]) < 19.3) front += 1;
      if (Math.abs(v[i] - 19.4) < 0.01 && Math.abs(v[i + 2]) < 19.3) right += 1;
    }
    expect(front).toBeGreaterThan(10);
    expect(right).toBeGreaterThan(10);
  });

  it("engraves over the edge of a box without folding: the floors of both faces meet in the corner", () => {
    // The "O" right on the edge between the front and the right face.
    const result = applySurfaceTexture(box(40, 40, 40), { ...TEXT, direction: "inward", textAround: 45, textOutline: [OI[0].map((value, k) => (k % 2 ? value : value + 3)), OI[1].map((value, k) => (k % 2 ? value : value + 3))] });
    expectClosed(result);
    // Points on the edge go in along both faces alike; in the letter as deep as each floor, 0.6 mm, and never further,
    // or past their neighbours on either face, which lie closer to the edge (they went in by 0.42 mm on a slant).
    let corner = 0;
    const v = result.vertices;
    for (let i = 0; i < v.length; i += 3) {
      const dx = 20 - v[i], dz = 20 - v[i + 2];
      if (Math.abs(dx - dz) > 1e-6 || dx < 0.01 || dx > 1) continue;
      expect(dx).toBeLessThan(0.6 + 1e-6);
      if (dx > 0.6 - 1e-6) corner += 1;
    }
    expect(corner).toBeGreaterThan(3);
  });

  it("lies on top of a plate with the axis lying, readable from the front", () => {
    const result = applySurfaceTexture(box(60, 3, 40), { ...TEXT, axis: "y" });
    expect(result.stats.text?.placed).toBe(true);
    expectClosed(result);
    const raised: number[] = [];
    const v = result.vertices;
    for (let i = 0; i < v.length; i += 3) {
      expect(v[i + 1]).toBeGreaterThan(-1e-9);
      if (v[i + 1] > 3.55) raised.push(v[i]);
    }
    // The "O" left of the middle, the "I" right of it.
    expect(raised.some((x) => x < -6)).toBe(true);
    expect(raised.some((x) => x > 4.5 && x < 5.5)).toBe(true);
  });

  it("cuts the letters' edges along their outlines, not in steps on the grid", () => {
    // A slanted stroke, "/", raised on top of a plate.
    const stroke = [-6, -5, -2, -5, 6, 5, 2, 5];
    const result = applySurfaceTexture(box(60, 3, 40), { ...TEXT, axis: "y", textOutline: [stroke] });
    expectClosed(result);
    // Signed distance to the stroke in the text's plane (x to the right, y to the back: minus z here).
    const distance = (x: number, y: number) => {
      let inside = false, d = Infinity;
      for (let k = 0; k < 4; k += 1) {
        const [ax, ay, bx, by] = [stroke[k * 2], stroke[k * 2 + 1], stroke[((k + 1) % 4) * 2], stroke[((k + 1) % 4) * 2 + 1]];
        if (ay > y !== by > y && x < ax + ((y - ay) * (bx - ax)) / (by - ay)) inside = !inside;
        const dx = bx - ax, dy = by - ay, t = Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
        d = Math.min(d, Math.hypot(ax + t * dx - x, ay + t * dy - y));
      }
      return inside ? -d : d;
    };
    let wall = 0;
    const v = result.vertices;
    for (let i = 0; i < v.length; i += 3) {
      const [x, y, z] = [v[i], v[i + 1], v[i + 2]];
      if (y < 3 - 1e-6 || Math.abs(x) > 12 || Math.abs(z) > 12) continue;
      const F = distance(x, -z);
      const up = y - 3;
      // On top only inside the stroke, on the plate only outside it, and the wall between no wider than 0.1 mm.
      if (up > 0.6 - 1e-6) expect(F).toBeLessThan(0.051);
      else if (up < 1e-6) expect(F).toBeGreaterThan(-0.051);
      else {
        expect(Math.abs(F)).toBeLessThan(0.051);
        wall += 1;
      }
    }
    expect(wall).toBeGreaterThan(10);
  });

  it("turns on the surface", () => {
    const result = applySurfaceTexture(box(60, 3, 40), { ...TEXT, axis: "y", textTurn: 90 });
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    const v = result.vertices;
    for (let i = 0; i < v.length; i += 3) {
      if (v[i + 1] < 3.55) continue;
      minX = Math.min(minX, v[i]);
      maxX = Math.max(maxX, v[i]);
      minZ = Math.min(minZ, v[i + 2]);
      maxZ = Math.max(maxZ, v[i + 2]);
    }
    // 14 mm long and 10 mm high, turned a quarter: now 10 across and 14 along the plate's depth.
    expect(maxX - minX).toBeLessThan(10.6);
    expect(maxZ - minZ).toBeGreaterThan(13.4);
  });

  it("keeps the letters upright round a star's points: sharp, chamfered, rounded off, cut off at a slant or with its top edges split in two", () => {
    // Each facet of a rounding turns a little; together they turn the label over the top just as one edge does.
    const stars: [string, number[], number, number, number][] = [];
    for (const [points, inner, chamfer, slivers] of [[5, 10, 0, false], [5, 10, 2, false], [5, 4, 0, false], [10, 8, 0, true]] as const) {
      stars.push([`${points} points, inner ${inner}, chamfer ${chamfer}, slivers ${slivers}`, star(points, 20, inner, 10, chamfer, slivers), points, (20 + inner) / 2, 4.5]);
    }
    for (const [round, steps, slant] of [[1.5, 2, 0], [3, 6, 0], [2, 8, 0], [0, 0, 20]]) stars.push([`round ${round} in ${steps}, slant ${slant}`, shapedStar(round, steps, slant), 5, 15, 4]);
    for (const [name, positions, points, r, y] of stars) {
      const mesh = prepareSurfaceBase(positions);
      const v = mesh.vertices, I = mesh.indices;
      let sides = 0;
      // On a side at four places along the star; the window reaches over the top and round the points.
      for (let place = 0; place < 4; place += 1) {
        const a = (Math.PI * (place / 2 + 0.5)) / points;
        for (const halfW of [18, 30]) {
          const { U, V } = unfoldSurface(mesh, [r * Math.sin(a), y, r * Math.cos(a)], { axis: "y", window: { halfW, halfH: 8, turn: 0 }, fold: true });
          for (let f = 0; f < I.length; f += 3) {
            // A side's upright edge (two points one above the other) where letters go (the window without its 3 mm margin)
            // runs straight up the unrolled text, as long as it is.
            const [p, q] = [[I[f], I[f + 1]], [I[f + 1], I[f + 2]], [I[f], I[f + 2]]].find(([p, q]) => v[p * 3] === v[q * 3] && v[p * 3 + 2] === v[q * 3 + 2] && v[p * 3 + 1] !== v[q * 3 + 1]) ?? [];
            if (p === undefined || ![p, q].every((i) => Math.abs(U[i]) < halfW - 3 && Math.abs(V[i]) < 5)) continue;
            sides += 1;
            const at = `${name}, place ${place}, halfW ${halfW}`;
            expect(U[q] - U[p], at).toBeCloseTo(0, 6);
            expect(V[q] - V[p], at).toBeCloseTo(v[q * 3 + 1] - v[p * 3 + 1], 6);
          }
        }
      }
      expect(sides, name).toBeGreaterThan(100);
    }
  });

  it("takes a rounding in facets of under 2 degrees as one face, and a top sloping 10 degrees as a crease", () => {
    // Either way wrong, the label tears over the top: taken as creases, a rounding in 120 facets tears at about 50 points;
    // taken as none, a top 10 degrees off level at 7 or 8.
    for (const [round, steps, slant, most] of [[3, 120, 0, 20], [0, 0, 10, 4]]) {
      const mesh = prepareSurfaceBase(shapedStar(round, steps, slant));
      for (let place = 0; place < 4; place += 1) {
        const a = (Math.PI * (place / 2 + 0.5)) / 5;
        const { torn } = unfoldSurface(mesh, [15 * Math.sin(a), 4, 15 * Math.cos(a)], { axis: "y", window: { halfW: 30, halfH: 8, turn: 0 }, fold: true });
        expect(torn, `round ${round} in ${steps}, slant ${slant}, place ${place}`).toBeLessThanOrEqual(most);
      }
    }
  });

  it("goes round a star's point whole: no tears, nothing on the top", () => {
    // 8 mm letters on a star 12 mm high: the window reaches its top, the letters do not. Rolled over the top, the
    // letters would tear and some land on it.
    const small = OI.map((ring) => ring.map((value) => value * 0.8));
    for (const around of [18, 36]) {
      const result = applySurfaceTexture(star(5, 20, 10, 12), { ...TEXT, textOutline: small, textAround: around });
      expect(result.stats.text).toEqual({ placed: true, torn: 0 });
      expectClosed(result);
      let raised = 0;
      const v = result.vertices;
      for (let i = 0; i < v.length; i += 3) {
        const [x, y, z] = [v[i], v[i + 1], v[i + 2]];
        expect(y).toBeLessThan(12 + 1e-6);
        if (y < 0.01 || y > 11.99) continue;
        // Out from the star's side there: beyond the line between its two corners.
        const sector = Math.PI / 5, k = Math.floor(Math.atan2(x, z) / sector);
        const [r0, r1] = k % 2 ? [10, 20] : [20, 10];
        const [ax, az, bx, bz] = [r0 * Math.sin(k * sector), r0 * Math.cos(k * sector), r1 * Math.sin((k + 1) * sector), r1 * Math.cos((k + 1) * sector)];
        if (((bx - ax) * (z - az) - (bz - az) * (x - ax)) / Math.hypot(bx - ax, bz - az) > 0.55) raised += 1;
      }
      expect(raised).toBeGreaterThan(1000);
    }
  }, 30000);

  it("lays a text on the editor's star exactly as rolled out round its sides", () => {
    // The default star: points 20 from the middle, valleys 10, 10 high, a point at -z. Rolled out round its sides, a
    // side point lies as far from the anchor as its way round the outline and as high above it as it is.
    const geometry = createStarGeometry({ width: 40, depth: 40, height: 10 });
    const mesh = prepareSurfaceBase(Array.from(geometry.getAttribute("position").array));
    const v = mesh.vertices;
    const outline = Array.from({ length: 10 }, (_, k) => [(k % 2 ? 10 : 20) * Math.sin((k * Math.PI) / 5), -(k % 2 ? 10 : 20) * Math.cos((k * Math.PI) / 5)]);
    const side = (k: number) => Math.hypot(outline[(k + 1) % 10][0] - outline[k][0], outline[(k + 1) % 10][1] - outline[k][1]);
    // The length round the outline to a point on it (NaN off it).
    const along = (x: number, z: number) => {
      let length = 0;
      for (let k = 0; k < 10; k += 1) {
        const [[px, pz], [qx, qz]] = [outline[k], outline[(k + 1) % 10]];
        const t = ((x - px) * (qx - px) + (z - pz) * (qz - pz)) / side(k) ** 2;
        if (t > -1e-9 && t < 1 + 1e-9 && Math.abs((x - px) * (qz - pz) - (z - pz) * (qx - px)) / side(k) < 1e-4) return length + t * side(k);
        length += side(k);
      }
      return NaN;
    };
    // Half way up, a little along the first side and half way along the second: the window of "Layerling" reaches two
    // points on.
    const on = (k: number, t: number) => [outline[k][0] + (outline[k + 1][0] - outline[k][0]) * t, 5, outline[k][1] + (outline[k + 1][1] - outline[k][1]) * t];
    for (const at of [on(0, 0.15), on(1, 0.5)]) {
      const { U, V } = unfoldSurface(mesh, at, { axis: "y", window: { halfW: 33, halfH: 10.4, turn: 0 }, fold: true });
      const start = along(at[0], at[2]), perimeter = 10 * side(0);
      let checked = 0;
      for (let i = 0; i < v.length / 3; i += 1) {
        let round = along(v[i * 3], v[i * 3 + 2]) - start;
        if (Number.isNaN(round)) continue;
        round -= Math.round(round / perimeter) * perimeter;
        if (Math.abs(round) > 30) continue;
        checked += 1;
        // The editor's mesh holds its points in single precision: to 0.005 mm.
        expect(Math.hypot(U[i], V[i]), `${at} ${i}`).toBeCloseTo(Math.hypot(round, v[i * 3 + 1] - 5), 2);
        expect(V[i], `${at} ${i}`).toBeCloseTo(v[i * 3 + 1] - 5, 2);
      }
      expect(checked).toBeGreaterThan(5);
    }
  });

  it("tears little on the editor's star when the margin round the letters reaches over its top edge", async () => {
    // 8 mm letters on a star 12 mm high stay on its sides; what tears is where the window's margin meets the top: now 44
    // and 23 points, laid straight on 247 and 171.
    const geometry = createStarGeometry({ width: 40, depth: 40, height: 12 });
    const positions = Array.from(geometry.getAttribute("position").array);
    const textOutline = await surfaceTextOutline({ content: "Layerling", font: "Multilanguage", size: 8 });
    for (const textAround of [0, 18]) {
      const result = applySurfaceTexture(positions, { ...TEXT, textOutline, textAround });
      expect(result.stats.text?.torn, `Around ${textAround}`).toBeLessThan(60);
    }
  }, 30000);

  it("keeps the way whose letters lie clearly more whole, and within the margin the way that tears less", async () => {
    const starOf = (height: number) => Array.from(createStarGeometry({ width: 40, depth: 40, height }).getAttribute("position").array);
    // "Hi" low on a star 20 mm high: whole both ways, but laid straight on its window tears over the top (36 points).
    const hi = await surfaceTextOutline({ content: "Hi", font: "Multilanguage", size: 8 });
    expect(applySurfaceTexture(starOf(20), { ...TEXT, textOutline: hi, textHeight: 30 }).stats.text).toEqual({ placed: true, torn: 0 });
    // "OI" turned upright on a star 12 mm high, half way up: whole either way (0.968 over the creases, 0.972 straight on,
    // within the margin), but straight on it tears at 49 points, so the way over the creases is kept. Low down it was
    // clearly more whole straight on (0.985 to 0.918) and its window tore at 136; the star's far sides are now cut as fine
    // as the middle (#1665), and laid over the creases it tears at none.
    const oi = await surfaceTextOutline({ content: "OI", font: "Multilanguage", size: 10 });
    expect(applySurfaceTexture(starOf(12), { ...TEXT, textOutline: oi, textAround: 9, textTurn: 90 }).stats.text?.torn).toBe(0);
    expect(applySurfaceTexture(starOf(12), { ...TEXT, textOutline: oi, textAround: 9, textTurn: 90, textHeight: 30 }).stats.text?.torn).toBe(0);
  }, 30000);

  it("lays a text straight on along a rod lying across the axis, where folding at its creases would tear it", async () => {
    // The rod's round runs across the axis all the way: every edge is a crease, and laid over them the letters tear.
    const upright = cylinder(10, 40, 48, 2);
    const rod: number[] = [];
    for (let t = 0; t < upright.length; t += 9) {
      for (const k of [0, 2, 1]) rod.push(upright[t + k * 3 + 1] - 20, upright[t + k * 3] + 10, upright[t + k * 3 + 2]);
    }
    const textOutline = await surfaceTextOutline({ content: "Layerling", font: "Multilanguage", size: 8 });
    const result = applySurfaceTexture(rod, { ...TEXT, textOutline });
    expect(result.stats.text).toEqual({ placed: true, torn: 0 });
    expectClosed(result);
  }, 30000);

  it("lays a text straight on over a capsule's round top, where folding at its creases would tear it", async () => {
    // Turned on end near the top: as whole either way (0.718), but over the creases the letters tear at 36 points, straight
    // on at none, so the way that tears less is kept.
    const textOutline = await surfaceTextOutline({ content: "Layerling", font: "Multilanguage", size: 8 });
    const result = applySurfaceTexture(capsule(10, 20), { ...TEXT, textOutline, textHeight: 95, textTurn: 90 });
    expect(result.stats.text).toEqual({ placed: true, torn: 0 });
    expectClosed(result);
  }, 30000);

  it("measures how whole the letters lie: torn apart or laid twice counts against them", () => {
    // A flat sheet 20 x 10 mm in 1 mm squares, unrolled as it lies (U = x, V = y); a bar 10 x 4 mm across its middle.
    const vertices: number[] = [], indices: number[] = [];
    for (let j = 0; j <= 10; j += 1) for (let i = 0; i <= 20; i += 1) vertices.push(i - 10, j - 5, 0);
    for (let j = 0; j < 10; j += 1) {
      for (let i = 0; i < 20; i += 1) {
        const p = j * 21 + i;
        indices.push(p, p + 1, p + 22, p, p + 22, p + 21);
      }
    }
    const bar = [[-5, -2, 5, -2, 5, 2, -5, 2]];
    const U = Float64Array.from({ length: vertices.length / 3 }, (_, i) => vertices[i * 3]);
    const V = Float64Array.from({ length: vertices.length / 3 }, (_, i) => vertices[i * 3 + 1]);
    expect(lettersWhole({ vertices, indices }, U, V, bar, 0)).toBeCloseTo(1, 6);
    // Torn 3 mm apart at x = 0: the column of squares across the tear is laid out of its shape and carries nothing, so
    // 4 of the bar's 10 mm (the tear and the column across it) land nowhere.
    const torn = U.map((u) => (u > 0 ? u + 3 : u));
    expect(lettersWhole({ vertices, indices }, torn, V, bar, 0)).toBeCloseTo(0.6, 1);
    // The same sheet twice, 5 mm apart: every point lands on two places.
    const twice = { vertices: [...vertices, ...vertices.map((x, i) => (i % 3 === 2 ? 5 : x))], indices: [...indices, ...indices.map((i) => i + vertices.length / 3)] };
    expect(lettersWhole(twice, Float64Array.from([...U, ...U]), Float64Array.from([...V, ...V]), bar, 0)).toBeCloseTo(0, 6);
    // Turned a quarter, a bar 6 x 2 mm off to the right and below lies upright on the sheet's upper part (V 0 to 10).
    expect(lettersWhole({ vertices, indices }, U, V.map((y) => y + 5), [[2, -3, 8, -3, 8, -1, 2, -1]], 90)).toBeCloseTo(1, 6);
  });

  it("goes round a star whose sides lean, unrolled panel by panel", () => {
    for (const [points, outer, inner, scale] of [[5, 20, 10, 0.6], [8, 25, 18, 0.4], [8, 25, 18, 1.3]]) {
      const { positions, corner } = taperedStar(points, outer, inner, 10, scale);
      const mesh = prepareSurfaceBase(positions);
      const v = mesh.vertices;
      // Rolled out panel by panel round their slanted edges from panel 0: each panel's plane frame in the unrolled plane.
      const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
      const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      const unit = (a: number[]) => a.map((x) => x / Math.hypot(a[0], a[1], a[2]));
      const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
      const normalOf = (k: number) => unit(cross(sub(corner(k + 1, 0), corner(k, 0)), sub(corner(k, 1), corner(k, 0))));
      const [m0, m1] = [corner(0, 0.5), corner(1, 0.5)];
      const at = [(m0[0] + m1[0]) / 2, 5, (m0[2] + m1[2]) / 2];
      const up0 = unit(sub([0, 1, 0], normalOf(0).map((x) => x * normalOf(0)[1])));
      const frames = new Map([[0, { origin: at, ex: cross(up0, normalOf(0)), ey: up0, o: [0, 0], x: [1, 0], y: [0, 1] }]]);
      const flat = (k: number, p: number[]) => {
        const f = frames.get(k)!;
        const [a, b] = [dot(sub(p, f.origin), f.ex), dot(sub(p, f.origin), f.ey)];
        return [f.o[0] + a * f.x[0] + b * f.y[0], f.o[1] + a * f.x[1] + b * f.y[1]];
      };
      for (const dir of [1, -1]) {
        for (let step = 1; step < points; step += 1) {
          const [before, k] = [dir * (step - 1), dir * step];
          const edge = dir > 0 ? k : before;
          const [e0, e1] = [corner(edge, 0), corner(edge, 1)];
          const [p0, p1] = [flat(before, e0), flat(before, e1)];
          const ex = unit(sub(e1, e0));
          const ey0 = cross(normalOf(k), ex);
          const ey = dot(sub(corner(dir > 0 ? edge + 1 : edge - 1, 0), e0), ey0) > 0 ? ey0 : ey0.map((x) => -x);
          const length = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
          const x = [(p1[0] - p0[0]) / length, (p1[1] - p0[1]) / length];
          const back = flat(before, corner(dir > 0 ? edge - 1 : edge + 1, 0));
          const y = (back[0] - p0[0]) * -x[1] + (back[1] - p0[1]) * x[0] > 0 ? [x[1], -x[0]] : [-x[1], x[0]];
          frames.set(k, { origin: e0, ex, ey, o: p0, x, y });
        }
      }
      const { U, V } = unfoldSurface(mesh, at, { axis: "y", window: { halfW: 30, halfH: 8, turn: 0 }, fold: true });
      let checked = 0;
      for (let i = 0; i < v.length / 3; i += 1) {
        const p = [v[i * 3], v[i * 3 + 1], v[i * 3 + 2]];
        if (p[1] < 1e-6 || p[1] > 10 - 1e-6) continue;
        for (const [k] of frames) {
          if (Math.abs(dot(sub(p, corner(k, 0)), normalOf(k))) > 1e-6) continue;
          const [pk, qk] = [corner(k, p[1] / 10), corner(k + 1, p[1] / 10)];
          const w = dot(sub(p, pk), sub(qk, pk)) / dot(sub(qk, pk), sub(qk, pk));
          if (w < -1e-6 || w > 1 + 1e-6) continue;
          const [u, h] = flat(k, p);
          if (Math.abs(u) > 27 || Math.abs(h) > 5) break;
          checked += 1;
          expect([U[i], V[i]], `${points} points, top ${scale}: ${p}`).toEqual([expect.closeTo(u, 4), expect.closeTo(h, 4)]);
          break;
        }
      }
      expect(checked, `${points} points, top ${scale}`).toBeGreaterThan(60);
    }
  });

  it("lays flat a text that starts on a flat top, round an inner corner and round a hole", () => {
    // An L of two 30 x 10 arms and a washer (20 round, a hole of 10), 2 and 3 thick, their tops in small squares.
    const quad = (out: number[], a: Vec3, b: Vec3, c: Vec3, d: Vec3) => out.push(...a, ...b, ...c, ...a, ...c, ...d);
    const plate: number[] = [];
    const inL = (x: number, z: number) => x >= 0 && z >= 0 && ((x < 30 && z < 10) || (x < 10 && z < 30));
    for (let x = 0; x < 30; x += 2) {
      for (let z = 0; z < 30; z += 2) {
        if (!inL(x + 1, z + 1)) continue;
        quad(plate, [x, 2, z], [x, 2, z + 2], [x + 2, 2, z + 2], [x + 2, 2, z]);
        quad(plate, [x, 0, z], [x + 2, 0, z], [x + 2, 0, z + 2], [x, 0, z + 2]);
        if (!inL(x - 1, z + 1)) quad(plate, [x, 0, z], [x, 0, z + 2], [x, 2, z + 2], [x, 2, z]);
        if (!inL(x + 3, z + 1)) quad(plate, [x + 2, 0, z + 2], [x + 2, 0, z], [x + 2, 2, z], [x + 2, 2, z + 2]);
        if (!inL(x + 1, z - 1)) quad(plate, [x + 2, 0, z], [x, 0, z], [x, 2, z], [x + 2, 2, z]);
        if (!inL(x + 1, z + 3)) quad(plate, [x, 0, z + 2], [x + 2, 0, z + 2], [x + 2, 2, z + 2], [x, 2, z + 2]);
      }
    }
    const washer: number[] = [];
    const ring = (r: number, k: number, y: number): Vec3 => [r * Math.cos((Math.PI * k) / 24), y, r * Math.sin((Math.PI * k) / 24)];
    for (let k = 0; k < 48; k += 1) {
      quad(washer, ring(20, k, 0), ring(20, k, 3), ring(20, k + 1, 3), ring(20, k + 1, 0));
      quad(washer, ring(10, k, 0), ring(10, k + 1, 0), ring(10, k + 1, 3), ring(10, k, 3));
      for (const [r0, r1] of [[10, 15], [15, 20]]) {
        quad(washer, ring(r0, k, 3), ring(r0, k + 1, 3), ring(r1, k + 1, 3), ring(r1, k, 3));
        quad(washer, ring(r0, k, 0), ring(r1, k, 0), ring(r1, k + 1, 0), ring(r0, k + 1, 0));
      }
    }
    for (const [positions, top, at] of [[plate, 2, [20, 2, 5]], [plate, 2, [5, 2, 20]], [washer, 3, [15, 3, 0.3]]] as const) {
      const mesh = prepareSurfaceBase(positions);
      const v = mesh.vertices;
      const { U, V } = unfoldSurface(mesh, [...at], { axis: "y", window: { halfW: 25, halfH: 25, turn: 0 }, fold: true });
      let checked = 0;
      for (let i = 0; i < v.length / 3; i += 1) {
        const [dx, dz] = [v[i * 3] - at[0], v[i * 3 + 2] - at[2]];
        if (Math.abs(v[i * 3 + 1] - top) > 1e-9 || Math.max(Math.abs(dx), Math.abs(dz)) > 22) continue;
        // A flat top is its own unrolling: every point as far from the anchor as it is.
        checked += 1;
        expect(Math.hypot(U[i], V[i]), `${at}: ${dx}, ${dz}`).toBeCloseTo(Math.hypot(dx, dz), 4);
      }
      expect(checked).toBeGreaterThan(80);
    }
  });

  it("carries a turned text over a can's lid and down its back: the first crease does not hold back the far side", () => {
    // Up the front, over the lid's edge (a crease), across the lid and over its far edge down the back.
    const mesh = prepareSurfaceBase(cylinder(8, 10, 32)), v = mesh.vertices;
    const { U } = unfoldSurface(mesh, [0, 5, 8], { axis: "y", window: { halfW: 35, halfH: 3, turn: 90 }, fold: true });
    let back = 0;
    for (let i = 0; i < v.length / 3; i += 1) if (v[i * 3 + 2] < -1 && v[i * 3 + 1] < 9.9 && Number.isFinite(U[i])) back += 1;
    expect(back).toBeGreaterThan(50);
  });

  it("tears over a real corner, as a sticker would, and says so", () => {
    const big = OI.map((ring) => ring.map((value) => value * 1.5));
    const result = applySurfaceTexture(box(20, 20, 20), { ...TEXT, direction: "inward", textOutline: big, textAround: 45, textHeight: 95 });
    expect(result.stats.text?.placed).toBe(true);
    expect(result.stats.text?.torn).toBeGreaterThan(0);
    expectClosed(result);
  });

  it("leaves the body as it was without letters", () => {
    const result = applySurfaceTexture(cylinder(30, 60), { ...TEXT, textOutline: [] });
    expect(result.stats.text).toEqual({ placed: false, torn: 0 });
    const v = result.vertices;
    for (let i = 0; i < v.length; i += 3) if (v[i + 1] > 0.5 && v[i + 1] < 59.5) expect(Math.hypot(v[i], v[i + 2])).toBeCloseTo(30, 6);
  });

  it("draws the outlines from the words and the font, a capital as high as the letter size", async () => {
    const rings = await surfaceTextOutline({ content: "Hi", font: "Multilanguage", size: 10 });
    expect(rings.length).toBeGreaterThanOrEqual(3);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const ring of rings) {
      for (let k = 0; k < ring.length; k += 2) {
        minX = Math.min(minX, ring[k]);
        maxX = Math.max(maxX, ring[k]);
        minY = Math.min(minY, ring[k + 1]);
        maxY = Math.max(maxY, ring[k + 1]);
      }
    }
    // Centred, the "H" 10 mm high.
    expect(maxY - minY).toBeCloseTo(10, 1);
    expect(minX + maxX).toBeCloseTo(0, 6);
    expect(minY + maxY).toBeCloseTo(0, 6);
    expect(await surfaceTextOutline({ content: "   ", font: "Sans", size: 10 })).toEqual([]);
    const result = applySurfaceTexture(cylinder(30, 60), { ...TEXT, textOutline: rings });
    expect(result.stats.text?.placed).toBe(true);
  });
});


/** The body of #1665 (Eating Crow): a crow's outline of 21 corners as a plate 30 high; every triangle 9 numbers, y up. Its caps are fans of long slivers. */
const CROW_PLATE = [
  -79.5, 0, -14.5, -91.5, 0, -0.5, -79.5, 30, -14.5,
  -79.5, 30, -14.5, -91.5, 0, -0.5, -91.5, 30, -0.5,
  -91.5, 0, -0.5, -77.5, 0, 11.5, -91.5, 30, -0.5,
  -91.5, 30, -0.5, -77.5, 0, 11.5, -77.5, 30, 11.5,
  -77.5, 0, 11.5, -71.5, 0, -1.5, -77.5, 30, 11.5,
  -77.5, 30, 11.5, -71.5, 0, -1.5, -71.5, 30, -1.5,
  -71.5, 0, -1.5, -64.5, 0, -9.5, -71.5, 30, -1.5,
  -71.5, 30, -1.5, -64.5, 0, -9.5, -64.5, 30, -9.5,
  -64.5, 0, -9.5, -51.5, 0, -0.5, -64.5, 30, -9.5,
  -64.5, 30, -9.5, -51.5, 0, -0.5, -51.5, 30, -0.5,
  -51.5, 0, -0.5, -52.5, 0, 22.5, -51.5, 30, -0.5,
  -51.5, 30, -0.5, -52.5, 0, 22.5, -52.5, 30, 22.5,
  -52.5, 0, 22.5, -26.5, 0, 29.5, -52.5, 30, 22.5,
  -52.5, 30, 22.5, -26.5, 0, 29.5, -26.5, 30, 29.5,
  -26.5, 0, 29.5, -28.5, 0, 18.5, -26.5, 30, 29.5,
  -26.5, 30, 29.5, -28.5, 0, 18.5, -28.5, 30, 18.5,
  -28.5, 0, 18.5, -42.5, 0, 8.5, -28.5, 30, 18.5,
  -28.5, 30, 18.5, -42.5, 0, 8.5, -42.5, 30, 8.5,
  -42.5, 0, 8.5, -30.5, 0, -3.5, -42.5, 30, 8.5,
  -42.5, 30, 8.5, -30.5, 0, -3.5, -30.5, 30, -3.5,
  -30.5, 30, -3.5, -30.5, 0, -3.5, -10.5, 30, 3.5,
  -30.5, 0, -3.5, -10.5, 0, 3.5, -10.5, 30, 3.5,
  -10.5, 0, 3.5, -10.5, 0, 17.5, -10.5, 30, 3.5,
  -10.5, 30, 3.5, -10.5, 0, 17.5, -10.5, 30, 17.5,
  -10.5, 30, 17.5, -10.5, 0, 17.5, 5.5, 30, 28.5,
  -10.5, 0, 17.5, 5.5, 0, 28.5, 5.5, 30, 28.5,
  5.5, 30, 28.5, 5.5, 0, 28.5, 19.5, 30, 22.5,
  5.5, 0, 28.5, 19.5, 0, 22.5, 19.5, 30, 22.5,
  19.5, 0, 22.5, 34.5, 0, 10.5, 19.5, 30, 22.5,
  19.5, 30, 22.5, 34.5, 0, 10.5, 34.5, 30, 10.5,
  34.5, 30, 10.5, 34.5, 0, 10.5, 18.5, 30, -2.5,
  34.5, 0, 10.5, 18.5, 0, -2.5, 18.5, 30, -2.5,
  18.5, 0, -2.5, 54.5, 0, -4.5, 18.5, 30, -2.5,
  18.5, 30, -2.5, 54.5, 0, -4.5, 54.5, 30, -4.5,
  54.5, 0, -4.5, 85.5, 0, 1.5, 54.5, 30, -4.5,
  54.5, 30, -4.5, 85.5, 0, 1.5, 85.5, 30, 1.5,
  85.5, 0, 1.5, 91.5, 0, -18.5, 85.5, 30, 1.5,
  85.5, 30, 1.5, 91.5, 0, -18.5, 91.5, 30, -18.5,
  91.5, 0, -18.5, 75.5, 0, -29.5, 91.5, 30, -18.5,
  91.5, 30, -18.5, 75.5, 0, -29.5, 75.5, 30, -29.5,
  75.5, 0, -29.5, -79.5, 30, -14.5, 75.5, 30, -29.5,
  75.5, 0, -29.5, -79.5, 0, -14.5, -79.5, 30, -14.5,
  -79.5, 0, -14.5, -71.5, 0, -1.5, -91.5, 0, -0.5,
  -64.5, 0, -9.5, -71.5, 0, -1.5, -79.5, 0, -14.5,
  -71.5, 0, -1.5, -77.5, 0, 11.5, -91.5, 0, -0.5,
  -64.5, 0, -9.5, -30.5, 0, -3.5, -51.5, 0, -0.5,
  -30.5, 0, -3.5, -42.5, 0, 8.5, -51.5, 0, -0.5,
  -42.5, 0, 8.5, -52.5, 0, 22.5, -51.5, 0, -0.5,
  -42.5, 0, 8.5, -28.5, 0, 18.5, -52.5, 0, 22.5,
  -28.5, 0, 18.5, -26.5, 0, 29.5, -52.5, 0, 22.5,
  -30.5, 0, -3.5, 18.5, 0, -2.5, -10.5, 0, 3.5,
  -10.5, 0, 3.5, 18.5, 0, -2.5, -10.5, 0, 17.5,
  -10.5, 0, 17.5, 19.5, 0, 22.5, 5.5, 0, 28.5,
  18.5, 0, -2.5, 19.5, 0, 22.5, -10.5, 0, 17.5,
  18.5, 0, -2.5, 34.5, 0, 10.5, 19.5, 0, 22.5,
  -30.5, 0, -3.5, 75.5, 0, -29.5, 18.5, 0, -2.5,
  75.5, 0, -29.5, 54.5, 0, -4.5, 18.5, 0, -2.5,
  91.5, 0, -18.5, 85.5, 0, 1.5, 75.5, 0, -29.5,
  75.5, 0, -29.5, 85.5, 0, 1.5, 54.5, 0, -4.5,
  -79.5, 0, -14.5, 75.5, 0, -29.5, -64.5, 0, -9.5,
  -64.5, 0, -9.5, 75.5, 0, -29.5, -30.5, 0, -3.5,
  -71.5, 30, -1.5, -79.5, 30, -14.5, -91.5, 30, -0.5,
  -71.5, 30, -1.5, -64.5, 30, -9.5, -79.5, 30, -14.5,
  -77.5, 30, 11.5, -71.5, 30, -1.5, -91.5, 30, -0.5,
  -30.5, 30, -3.5, -64.5, 30, -9.5, -51.5, 30, -0.5,
  -42.5, 30, 8.5, -30.5, 30, -3.5, -51.5, 30, -0.5,
  -52.5, 30, 22.5, -42.5, 30, 8.5, -51.5, 30, -0.5,
  -28.5, 30, 18.5, -42.5, 30, 8.5, -52.5, 30, 22.5,
  -26.5, 30, 29.5, -28.5, 30, 18.5, -52.5, 30, 22.5,
  18.5, 30, -2.5, -30.5, 30, -3.5, -10.5, 30, 3.5,
  18.5, 30, -2.5, -10.5, 30, 3.5, -10.5, 30, 17.5,
  19.5, 30, 22.5, -10.5, 30, 17.5, 5.5, 30, 28.5,
  19.5, 30, 22.5, 18.5, 30, -2.5, -10.5, 30, 17.5,
  34.5, 30, 10.5, 18.5, 30, -2.5, 19.5, 30, 22.5,
  75.5, 30, -29.5, -30.5, 30, -3.5, 18.5, 30, -2.5,
  54.5, 30, -4.5, 75.5, 30, -29.5, 18.5, 30, -2.5,
  85.5, 30, 1.5, 91.5, 30, -18.5, 75.5, 30, -29.5,
  85.5, 30, 1.5, 75.5, 30, -29.5, 54.5, 30, -4.5,
  75.5, 30, -29.5, -79.5, 30, -14.5, -64.5, 30, -9.5,
  75.5, 30, -29.5, -64.5, 30, -9.5, -30.5, 30, -3.5,
];

describe("a text wider than the sides it lies round (#1665)", () => {
  // 25 strokes of a letter's height, 295 mm across: the window of the unrolling reaches round the whole outline.
  const strokes = Array.from({ length: 25 }, (_, k) => {
    const x = -144 + k * 12;
    return [x, -1, x + 2, -1, x + 2, 9, x, 9];
  });
  const wide = { pattern: "text", depth: 0.6, direction: "inward", axis: "z", projection: "auto", textOutline: strokes, textHeight: 50, detail: "medium", patternPart: false, bottomFree: 30, topFree: 30 };

  it("cuts the strokes into the sides far from the middle as well", () => {
    const result = applySurfaceTexture(CROW_PLATE, wide, { maxTriangles: 400000 });
    const v = result.vertices;
    // The far left side (x below -50) in the middle of the height: the points at the strokes' floor, 0.6 mm in from the wall.
    const planes: number[][] = [];
    for (let t = 0; t < CROW_PLATE.length; t += 9) {
      const a = CROW_PLATE.slice(t, t + 9);
      const u = [a[3] - a[0], a[4] - a[1], a[5] - a[2]], w = [a[6] - a[0], a[7] - a[1], a[8] - a[2]];
      const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      const l = Math.hypot(n[0], n[1], n[2]);
      if (Math.abs(n[1]) / l < 0.5 && (a[0] + a[3] + a[6]) / 3 < -45) planes.push([n[0] / l, n[1] / l, n[2] / l, (n[0] * a[0] + n[1] * a[1] + n[2] * a[2]) / l]);
    }
    let floor = 0;
    for (let i = 0; i < v.length; i += 3) {
      if (v[i] > -50 || v[i + 1] < 8 || v[i + 1] > 22) continue;
      const d = Math.min(...planes.map((p) => Math.abs(p[0] * v[i] + p[1] * v[i + 1] + p[2] * v[i + 2] - p[3])));
      if (Math.abs(d - 0.6) < 0.05) floor += 1;
    }
    expect(floor).toBeGreaterThan(200);
  }, 60000);
});
