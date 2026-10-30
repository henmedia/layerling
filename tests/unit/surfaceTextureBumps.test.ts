import { describe, expect, it } from "vitest";
import { applySurfaceTexture, insideToScreenPositions, isRoundBody, normalizeSurfaceTexture, surfaceFalloff } from "@/lib/surfaceTexture";
import { faceCross, prepareSurfaceBase } from "@/lib/surfaceTextureMesh";
import { analyzeTriangleSoup } from "@/lib/svgImport";

/** A box standing on the bed, as the editor hands it over (inside frame: y up). */
function box(w: number) {
  const h = w / 2;
  const P = [[-h, -h, 0], [h, -h, 0], [h, h, 0], [-h, h, 0], [-h, -h, w], [h, -h, w], [h, h, w], [-h, h, w]];
  const F = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7]];
  const out: number[] = [];
  for (const f of F) for (const k of f) out.push(P[k][0], P[k][2], -P[k][1]);
  return out;
}

/** A prism of `n` sides round the up axis (64: a cylinder). */
function prism(r: number, height: number, n: number) {
  const out: number[] = [];
  const at = (k: number, z: number) => [r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n), z];
  const push = (...points: number[][]) => points.forEach(([x, y, z]) => out.push(x, z, -y));
  for (let k = 0; k < n; k += 1) {
    const a0 = at(k, 0), a1 = at(k + 1, 0), b0 = at(k, height), b1 = at(k + 1, height);
    push(a0, a1, b1);
    push(a0, b1, b0);
    push([0, 0, 0], a1, a0);
    push([0, 0, height], b0, b1);
  }
  return out;
}

function closedness(r: { vertices: Float64Array; indices: Uint32Array }) {
  const soup: number[] = [];
  for (const i of r.indices) soup.push(r.vertices[i * 3], r.vertices[i * 3 + 1], r.vertices[i * 3 + 2]);
  const a = analyzeTriangleSoup(soup);
  return { open: a.boundaryEdges, nonManifold: a.nonManifoldEdges };
}

describe("bumps: half balls and cones, cut out and laid anew", () => {
  it("are half balls unless a profile is asked for", () => {
    expect(normalizeSurfaceTexture({ pattern: "bumps" }).profile).toBe("dome");
    expect(normalizeSurfaceTexture({ pattern: "bumps", profile: "pointed" }).profile).toBe("pointed");
    expect(normalizeSurfaceTexture({ pattern: "knurl" }).profile).toBe("pointed");
    expect(surfaceFalloff(0, "dome")).toBe(1);
    expect(surfaceFalloff(0.6, "dome")).toBeCloseTo(0.8, 9);
    expect(surfaceFalloff(1, "dome")).toBe(0);
  });

  it("stay closed on a cylinder and a cube, in every shape", () => {
    for (const [name, positions] of [["cylinder", prism(10, 20, 64)], ["cube", box(20)]] as const) {
      for (const profile of ["dome", "pointed", "round", "flat"]) {
        const r = applySurfaceTexture(positions, { pattern: "bumps", direction: "outward", profile });
        expect(closedness(r), `${name} ${profile}`).toEqual({ open: 0, nonManifold: 0 });
      }
    }
  }, 120_000);

  it("follow a half ball on a cylinder, and a cone ends in a point", () => {
    const depth = 0.6;
    for (const profile of ["dome", "pointed"] as const) {
      const r = applySurfaceTexture(prism(10, 20, 64), { pattern: "bumps", direction: "outward", profile, depth, projection: "cylinder" });
      const R = (r.stats.spacing * (r.stats.around ?? 1)) / (2 * Math.PI);
      const hw = (r.stats.spacing / 2) * normalizeSurfaceTexture({}).width;
      const cell = r.stats.spacing, sq3 = Math.sqrt(3), size = cell / sq3;
      // The middle of the bump at (u, v), as the pattern lays them out (pointy-top hexagons).
      const middle = (u: number, v: number) => {
        const q = ((sq3 / 3) * u - v / 3) / size, rr = ((2 / 3) * v) / size;
        let rx = Math.round(q), ry = Math.round(-q - rr), rz = Math.round(rr);
        const dx = Math.abs(rx - q), dy = Math.abs(ry + q + rr), dz = Math.abs(rz - rr);
        if (dx > dy && dx > dz) rx = -ry - rz;
        else if (dy > dz) ry = -rx - rz;
        else rz = -rx - ry;
        return [size * sq3 * (rx + rz / 2), size * 1.5 * rz];
      };
      // The body under a point: the 64-gon's side there.
      const side = (a: number) => {
        const seg = (2 * Math.PI) / 64;
        const t = ((a % seg) + seg) % seg;
        return (10 * Math.cos(seg / 2)) / Math.cos(t - seg / 2);
      };
      let sum = 0, count = 0, top = 0;
      for (const i of new Set(r.indices)) {
        const x = r.vertices[i * 3], v = r.vertices[i * 3 + 1], z = r.vertices[i * 3 + 2];
        if (v < 4 || v > 16) continue;
        const a = Math.atan2(-z, x);
        const u = a * R;
        const [mu, mv] = middle(u, v);
        const d = Math.hypot(u - mu, v - mv) / hw;
        if (d >= 0.999) continue;
        const height = Math.hypot(x, z) - side(a);
        sum += Math.abs(height - depth * surfaceFalloff(d, profile));
        count += 1;
        top = Math.max(top, height);
      }
      expect(sum / count, profile).toBeLessThan(0.02);
      expect(top, profile).toBeGreaterThan(depth * 0.99);
    }
  }, 120_000);
});

describe("bumps under a tight triangle budget", () => {
  // A 40 mm box away from the middle with room for few triangles: the bumps' rims get few points (see sliceBumps).
  const w = 40, at = [-25.8, -12.6];
  const moved = (positions: number[]) => positions.map((value, i) => value + (i % 3 === 0 ? at[0] : i % 3 === 2 ? at[1] : 0));
  const result = applySurfaceTexture(moved(box(w)), { pattern: "bumps" }, { maxTriangles: 80_000 });
  // The four sides: the axis across them, where they lie, which way they face.
  const sides = [[0, at[0] + w / 2, 1], [0, at[0] - w / 2, -1], [2, at[1] + w / 2, 1], [2, at[1] - w / 2, -1]] as const;

  it("turn no triangle over in a flat side", () => {
    const v = result.vertices, I = result.indices;
    let turned = 0, flat = 0;
    for (let t = 0; t < I.length; t += 3) {
      const n = faceCross(v, I[t], I[t + 1], I[t + 2]);
      for (const [axis, plane, sign] of sides) {
        if (![0, 1, 2].every((k) => Math.abs(v[I[t + k] * 3 + axis] - plane) < 1e-6)) continue;
        flat += 1;
        if (n[axis] * sign < 0) turned += 1;
      }
    }
    expect(flat).toBeGreaterThan(1000);
    expect(turned).toBe(0);
  });

  it("leave no bump out in the middle of a side", () => {
    // Bump middles: the points at the full depth. Each one away from the border has its six neighbours one spacing off.
    const spacing = result.stats.spacing, depth = 0.6;
    let checked = 0, lonely = 0;
    for (const [axis, plane, sign] of sides) {
      const across = axis === 0 ? 2 : 0;
      const middles: number[][] = [];
      for (const i of new Set(result.indices)) {
        const p = [result.vertices[i * 3], result.vertices[i * 3 + 1], result.vertices[i * 3 + 2]];
        if (Math.abs((plane - p[axis]) * sign - depth) < 1e-3) middles.push([p[across], p[1]]);
      }
      const lo = (across === 0 ? at[0] : at[1]) - w / 2;
      for (const [a, b] of middles) {
        // Away from the border (fade 1 mm, a bump's radius) by two spacings.
        if (Math.min(a - lo, lo + w - a, b, w - b) < 1 + 2 * spacing) continue;
        checked += 1;
        const neighbours = middles.filter(([c, d]) => Math.abs(Math.hypot(c - a, d - b) - spacing) < 0.05).length;
        if (neighbours < 6) lonely += 1;
      }
    }
    expect(checked).toBeGreaterThan(100);
    expect(lonely).toBe(0);
  });
});

describe("bumps round a cylinder (issue #1030)", () => {
  // A cylinder 30 mm wide and 60 high with half balls 3 mm deep: thin triangles across the mantle's gentle edges and
  // points a cut left a hair's breadth apart leant or turned their normals, and bumps here and there were left out; a
  // facet edge running just inside a rim left a sliver out of the bump, which kept its grid and looked broken.
  const radius = 15, depth = 3;
  const turn = 2 * Math.PI * radius;

  /** Each bump's middle (u round the cylinder, v up it) and how deep it goes, gathered round the seam too. */
  function bumpMiddles(settings: Record<string, unknown>) {
    const r = applySurfaceTexture(prism(radius, 60, 64), { pattern: "bumps", spacing: 5, depth, ...settings });
    // Points well inside a bump, on a grid of half millimetres: per cell the deepest.
    const cells = new Map<string, [number, number, number]>();
    for (let i = 0; i < r.vertices.length / 3; i += 1) {
      const x = r.vertices[i * 3], y = r.vertices[i * 3 + 1], z = r.vertices[i * 3 + 2];
      const off = radius - Math.hypot(x, z);
      if (off < depth * 0.7 || off > depth + 0.1) continue;
      const u = ((Math.atan2(z, x) * radius) % turn + turn) % turn;
      const key = `${Math.floor(u * 2)}|${Math.floor(y * 2)}`;
      if (off > (cells.get(key)?.[2] ?? 0)) cells.set(key, [u, y, off]);
    }
    const columns = Math.ceil(turn * 2);
    const seen = new Set<string>();
    const bumps: { u: number; v: number; deepest: number }[] = [];
    for (const key of cells.keys()) {
      if (seen.has(key)) continue;
      seen.add(key);
      const stack = [key];
      let bottom = cells.get(key)!;
      while (stack.length) {
        const [cu, cv] = stack.pop()!.split("|").map(Number);
        const here = cells.get(`${cu}|${cv}`)!;
        if (here[2] > bottom[2]) bottom = here;
        for (const [du, dv] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const next = `${(((cu + du) % columns) + columns) % columns}|${cv + dv}`;
          if (cells.has(next) && !seen.has(next)) {
            seen.add(next);
            stack.push(next);
          }
        }
      }
      bumps.push({ u: bottom[0], v: bottom[1], deepest: bottom[2] });
    }
    return { r, bumps };
  }

  /** The bumps by row, the rows `rise` apart. */
  function perRow(bumps: { v: number }[], rise: number) {
    const rows = new Map<number, number>();
    for (const bump of bumps) {
      const row = Math.round(bump.v / rise);
      rows.set(row, (rows.get(row) ?? 0) + 1);
    }
    return rows;
  }

  it("leave none out in any row, and every one goes to its full depth", () => {
    const { r, bumps } = bumpMiddles({});
    // Staggered, the rows lie spacing × √3/2 apart; each has as many as go round.
    const rows = perRow(bumps, r.stats.spacing * (Math.sqrt(3) / 2));
    expect(r.stats.around).toBe(19);
    expect(rows.size).toBeGreaterThan(10);
    for (const [row, count] of rows) expect(count, `row ${row}`).toBe(19);
    // A bump laid anew has its middle as a point at the full depth; one that kept its grid falls short of it.
    expect(bumps.filter((bump) => bump.deepest < depth - 1e-3)).toEqual([]);
  }, 120_000);

  it("line up in straight rows and columns when asked", () => {
    const { r, bumps } = bumpMiddles({ bumpGrid: "straight" });
    const spacing = r.stats.spacing;
    // Straight, the rows lie a whole spacing apart, and every bump sits on one of the 19 columns round (each a 19th of
    // the turn: the spacing is measured on the radius fitted to the 64 sides, a little short of the corners' 15 mm).
    const rows = perRow(bumps, spacing);
    expect(r.stats.around).toBe(19);
    expect(rows.size).toBeGreaterThan(9);
    for (const [row, count] of rows) expect(count, `row ${row}`).toBe(19);
    for (const { u, v } of bumps) {
      const k = ((u - bumps[0].u) / turn) * 19, m = (v - bumps[0].v) / spacing;
      // A middle on a flat side moves along that side's normal, a little off its angle; staggered would be half a spacing.
      expect(Math.abs(k - Math.round(k)) * spacing, `column at ${u}`).toBeLessThan(0.25);
      expect(Math.abs(m - Math.round(m)) * spacing, `row at ${v}`).toBeLessThan(1e-3);
    }
    expect(bumps.filter((bump) => bump.deepest < depth - 1e-3)).toEqual([]);
  }, 120_000);
});

describe("laid on as the body asks", () => {
  it("knows a round body from an angular one", () => {
    const round = (positions: number[]) => isRoundBody(prepareSurfaceBase(insideToScreenPositions(positions)), "z");
    expect(round(prism(10, 20, 64))).toBe(true);
    expect(round(prism(10, 20, 16))).toBe(true);
    expect(round(box(20))).toBe(false);
    expect(round(prism(10, 20, 6))).toBe(false);
  });

  it("chooses around the axis on a cylinder and a cube (along its outline), all round on a body that is no prism", () => {
    expect(applySurfaceTexture(prism(10, 20, 64), { pattern: "grooves" }).stats.projection).toBe("cylinder");
    expect(applySurfaceTexture(box(20), { pattern: "grooves" }).stats.projection).toBe("cylinder");
    expect(applySurfaceTexture(box(20), { pattern: "grooves", projection: "allRound" }).stats.projection).toBe("allRound");
    // A pyramid's sides lean: no outline to run along.
    const tip = [0, 20, 0], corners = [[-10, 0, -10], [10, 0, -10], [10, 0, 10], [-10, 0, 10]];
    const pyramid: number[] = [];
    for (let k = 0; k < 4; k += 1) pyramid.push(...corners[k], ...tip, ...corners[(k + 1) % 4]);
    pyramid.push(...corners[0], ...corners[1], ...corners[2], ...corners[0], ...corners[2], ...corners[3]);
    expect(applySurfaceTexture(pyramid, { pattern: "grooves" }).stats.projection).toBe("allRound");
  }, 60_000);

  it("cuts every pattern on a cube's flat sides and stays closed", () => {
    for (const pattern of ["grooves", "knurl", "honeycomb", "bumps"]) {
      const r = applySurfaceTexture(box(20), { pattern, projection: "allRound" });
      expect(closedness(r), pattern).toEqual({ open: 0, nonManifold: 0 });
      expect(r.stats.projection).toBe("allRound");
    }
  }, 120_000);
});
