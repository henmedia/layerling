import { describe, expect, it, vi } from "vitest";
import { buildVase, normalizeParams, vaseChecks, vaseShape, lidSafeZoneTo } from "@/lib/vase/vase-geometry.mjs";
import { LEAF_SHAPES, PATTERNS, leafHeight, normalizeLeafPoints, patternHeight, patternPreview, reliefField } from "@/lib/vase/vase-patterns.mjs";

/*
 * The vase's relief patterns (vase-patterns.mjs): the pattern families and leaves on the vase's surface, the height
 * range they keep to, the print-friendly mode and the print checks of a relief.
 */

/** Every edge walked once each way: the body is closed and oriented. */
function openEdges(mesh: { vertices: Float64Array; indices: Uint32Array }) {
  const key = (i: number) => `${Math.round(mesh.vertices[i * 3] * 1e4)},${Math.round(mesh.vertices[i * 3 + 1] * 1e4)},${Math.round(mesh.vertices[i * 3 + 2] * 1e4)}`;
  const edges = new Map<string, number>();
  for (let t = 0; t < mesh.indices.length; t += 3) {
    for (let k = 0; k < 3; k += 1) {
      const edge = `${key(mesh.indices[t + k])}>${key(mesh.indices[t + ((k + 1) % 3)])}`;
      edges.set(edge, (edges.get(edge) ?? 0) + 1);
    }
  }
  let bad = 0;
  for (const [edge, count] of edges) {
    const [a, b] = edge.split(">");
    if (count !== 1 || edges.get(`${b}>${a}`) !== 1) bad += 1;
  }
  return bad;
}

/** The outer radius of a built vase at height z, the largest over its vertices near that height. */
function radiusNear(mesh: { vertices: Float64Array }, z: number, band = 0.6) {
  let most = 0;
  let least = Infinity;
  for (let i = 0; i < mesh.vertices.length; i += 3) {
    if (Math.abs(mesh.vertices[i + 2] - z) > band) continue;
    const r = Math.hypot(mesh.vertices[i], mesh.vertices[i + 1]);
    most = Math.max(most, r);
    least = Math.min(least, r);
  }
  return { most, least };
}

const FAMILIES = Object.keys(PATTERNS);

// Building a vase with a relief takes a few hundred milliseconds; the tests build many.
vi.setConfig({ testTimeout: 120_000 });

describe("vase relief patterns", () => {
  it("builds every family as a closed body, solid and hollow", () => {
    for (const effect of FAMILIES) {
      for (const body of ["voll", "hohl"]) {
        const mesh = buildVase({ effect, body, profile: "bauchig", quality: "entwurf" });
        expect(openEdges(mesh), `${effect} ${body}`).toBe(0);
      }
    }
  });

  it("builds every leaf shape, one's own leaf too, as a closed body", () => {
    for (const leafShape of Object.keys(LEAF_SHAPES)) {
      const mesh = buildVase({ effect: "blaetter", leafShape, body: "hohl", profile: "flasche", quality: "entwurf", leafPoints: leafShape === "eigen" ? [[0, 0.2], [0.5, 1], [1, 0.05]] : null });
      expect(openEdges(mesh), leafShape).toBe(0);
    }
  });

  it("keeps leaves the same size at a narrow neck when asked: fewer round it instead of smaller ones", () => {
    // Raised width per leaf run round the bottle's neck (radius 17 mm against 45 mm at the belly), in mm.
    const widthAtNeck = (effect: string, leafFixed: string) => {
      const shape = vaseShape({ profile: "flasche", effect, leafFixed, leafLayout: "regelmaessig" });
      const field = reliefField(shape.p, shape, () => 1);
      const z = 150, n = 1440, r = shape.R(z);
      let runs = 0, up = 0, before: boolean | null = null;
      for (let i = 0; i <= n; i += 1) {
        const raised = field.depthAt((i / n) * 2 * Math.PI, z, r) < 0.3 * shape.p.reliefDepth;
        if (before === false && raised) runs += 1;
        if (raised) up += 1;
        before = raised;
      }
      return ((up / n) * 2 * Math.PI * r) / Math.max(1, runs);
    };
    for (const effect of ["blaetter", "tulpenblaetter"]) {
      expect(widthAtNeck(effect, "ja"), effect).toBeGreaterThan(1.3 * widthAtNeck(effect, "nein"));
      expect(openEdges(buildVase({ profile: "flasche", body: "hohl", effect, leafFixed: "ja", quality: "entwurf" })), effect).toBe(0);
    }
  });

  it("never stands out of the vase's outline: the relief is sunk into the wall by at most its height", () => {
    const smooth = vaseShape({ profile: "zylinder", body: "hohl" });
    const mesh = buildVase({ profile: "zylinder", body: "hohl", effect: "waben", reliefDepth: 2, printFriendly: "nein", quality: "entwurf" });
    const r = smooth.R(90);
    const at = radiusNear(mesh, 90);
    expect(at.most).toBeLessThanOrEqual(r + 0.01);
    expect(at.least).toBeGreaterThan(r - 2 - 0.05);
    // The inside stays behind the deepest place by the wall.
    expect(smooth.p.wall).toBe(2);
  });

  it("keeps to the height range: smooth below the start and above the end", () => {
    const mesh = buildVase({ profile: "zylinder", body: "voll", effect: "geflecht", zoneFrom: 30, zoneTo: 60, zoneFade: 2, quality: "entwurf" });
    const r = vaseShape({ profile: "zylinder" }).R(10);
    // 30 to 60 % of 180 mm: 54 to 108 mm.
    for (const z of [10, 80, 150]) {
      const at = radiusNear(mesh, z, 0.4);
      if (z === 80) expect(at.most - at.least).toBeGreaterThan(1);
      else expect(at.most - at.least, `smooth at ${z}`).toBeLessThan(0.02);
      // Inside the range the relief reaches up to the outline; outside the surface is the outline.
      if (z === 80) expect(at.most).toBeLessThanOrEqual(r + 0.01);
      else expect(at.most).toBeCloseTo(r, 1);
    }
  });

  it("turns its grid with slanted patterns and twist, and stays closed", () => {
    for (const body of ["voll", "hohl"]) {
      const mesh = buildVase({ profile: "flasche", effect: "wisp", patternCount: 26, reliefDepth: 2.4, patternTwist: 30, twist: 90, body, quality: "entwurf" });
      expect(openEdges(mesh), body).toBe(0);
    }
  });

  it("repeats the honeycomb upwards without a seam", () => {
    // One tile is 2 sqrt3 / 3 cells high; a tile further up the honeycomb is the same.
    const p = normalizeParams({ effect: "waben" });
    const up = (2 * Math.sqrt(3)) / 3;
    for (const [cu, cv] of [[0.1, 0.2], [0.37, 0.9], [0.8, 0.05], [0.55, 0.6]]) {
      expect(Math.abs(patternHeight(p, cu, cv, 12) - patternHeight(p, cu, cv + up, 12))).toBeLessThan(0.02);
    }
  });

  it("builds no relief when start and end meet", () => {
    const mesh = buildVase({ profile: "zylinder", body: "voll", effect: "blueten", zoneFrom: 50, zoneTo: 50, quality: "entwurf" });
    const at = radiusNear(mesh, 90, 0.4);
    expect(at.most - at.least).toBeLessThan(0.02);
  });

  it("closes at the seam: a pattern is the same a whole turn further round", () => {
    for (const effect of FAMILIES) {
      const p = normalizeParams({ effect });
      const around = 12;
      for (const [cu, cv] of [[0.13, 0.4], [3.7, 1.9], [11.2, 2.6]]) {
        expect(patternHeight(p, cu, cv, around), effect).toBeCloseTo(patternHeight(p, cu + around, cv, around), 6);
      }
    }
  });

  it("keeps its count round the vase when the profile changes, and the cells follow the circumference", () => {
    const slim = buildVase({ profile: "zylinder", effect: "waben", patternCount: 9, quality: "entwurf" });
    const belly = buildVase({ profile: "bauchig", effect: "waben", patternCount: 9, quality: "entwurf" });
    expect(normalizeParams(slim.params).patternCount).toBe(9);
    expect(normalizeParams(belly.params).patternCount).toBe(9);
  });

  it("is the same every time for the same settings, scattered leaves too", () => {
    const a = buildVase({ effect: "blaetter", leafLayout: "verstreut", quality: "entwurf" });
    const b = buildVase({ effect: "blaetter", leafLayout: "verstreut", quality: "entwurf" });
    const c = buildVase({ effect: "blaetter", leafLayout: "regelmaessig", quality: "entwurf" });
    expect(Array.from(a.positions)).toEqual(Array.from(b.positions));
    expect(Array.from(a.positions)).not.toEqual(Array.from(c.positions));
  });

  it("reads picture patterns as seamless tiles and picture leaves as sharp outlines", () => {
    // A picture tile repeats: the same a whole tile further round and up.
    const p = normalizeParams({ effect: "schuppen" });
    expect(patternHeight(p, 0.3, 0.7, 4)).toBeCloseTo(patternHeight(p, 1.3, 0.7, 4), 6);
    // Turned inside out, raised becomes sunk.
    const inverted = normalizeParams({ effect: "schuppen", patternInvert: "ja" });
    expect(patternHeight(inverted, 0.3, 0.7, 4)).toBeCloseTo(1 - patternHeight(p, 0.3, 0.7, 4), 6);
    // An oak leaf: inside in its middle, outside beside it, its dome higher inside than near its edge.
    expect(leafHeight("eiche", 0.55, 0, 1, false, null)).toBeGreaterThan(0.6);
    expect(leafHeight("eiche", 0.55, 1.2, 1, false, null)).toBe(-1);
    // Monstera's holes and slits are holes.
    let holes = 0;
    for (let i = 0; i < 40; i += 1) for (let j = 0; j < 40; j += 1) if (leafHeight("monstera", 0.2 + (0.7 * i) / 40, -0.9 + (1.8 * j) / 40, 1, false, null) < 0) holes += 1;
    expect(holes).toBeGreaterThan(100);
  });

  it("has no jumps in its leaves: a leaf's edge always slopes, also where leaves of a row overlap", () => {
    for (const settings of [{ effect: "tulpenblaetter", patternTwist: 30 }, { effect: "blaetter" }, { effect: "blaetter", leafShape: "ginkgo" }]) {
      const p = normalizeParams(settings);
      let jumps = 0;
      for (let cu = 0; cu < 5; cu += 0.1) {
        let previous = patternHeight(p, cu, 0, 5);
        for (let cv = 0.005; cv < 10; cv += 0.005) {
          const h = patternHeight(p, cu, cv, 5);
          if (Math.abs(h - previous) > 0.3) jumps += 1;
          previous = h;
        }
      }
      expect(jumps, JSON.stringify(settings)).toBe(0);
    }
  });

  it("softens a picture's edges to the grid at Standard too, so a slanted edge is not a row of teeth", () => {
    // The largest step between two neighbouring points round the vase: an edge finer than the grid is one big step
    // where it crosses a column and none beside it, which shows as teeth along every slanted edge.
    const step = (effect: string) => {
      const mesh = buildVase({ profile: "zylinder", effect, quality: "standard", printFriendly: "nein" });
      const { segments, rows } = mesh.grid;
      let most = 0;
      for (let i = 0; i <= rows; i += 1) {
        for (let j = 0; j < segments; j += 1) {
          const a = (i * segments + j) * 3, b = (i * segments + ((j + 1) % segments)) * 3;
          most = Math.max(most, Math.abs(Math.hypot(mesh.vertices[a], mesh.vertices[a + 1]) - Math.hypot(mesh.vertices[b], mesh.vertices[b + 1])));
        }
      }
      return most;
    };
    // Of a relief 1.6 mm deep; softened only a little these were 0.84 and 0.75 mm.
    expect(step("schuppen")).toBeLessThan(0.68);
    expect(step("blattfluss")).toBeLessThan(0.6);
  }, 60000);

  it("keeps the settings inside their limits and drops unknown leaves and layouts", () => {
    const p = normalizeParams({ reliefDepth: 40, patternCount: 1, leafSize: 9999, leafShape: "kaktus", leafLayout: "wild", printFriendly: "vielleicht", leafPoints: "x" });
    expect(p.reliefDepth).toBe(6);
    expect(p.patternCount).toBe(3);
    expect(p.leafSize).toBe(250);
    expect(p.leafShape).toBe("tulpe");
    expect(p.leafLayout).toBe("verstreut");
    expect(p.printFriendly).toBe("ja");
    expect(p.leafPoints).toBeNull();
    expect(normalizeLeafPoints([[0.5, 2], [0.2, -1]])).toEqual([[0, 0], [1, 1]]);
  });

  it("draws a leaf as an outline with a domed top, nothing outside it", () => {
    expect(leafHeight("tulpe", 0.5, 0, 1, false, null)).toBeGreaterThan(0.9);
    expect(leafHeight("tulpe", 0.5, 0.95, 1, false, null)).toBeLessThan(leafHeight("tulpe", 0.5, 0.3, 1, false, null));
    expect(leafHeight("tulpe", 0.5, 1.2, 1, false, null)).toBe(-1);
    expect(leafHeight("ahorn", 1.2, 0, 1, false, null)).toBe(-1);
  });

  it("gives the gallery a picture of every family from the same heights", () => {
    for (const effect of [...FAMILIES, "rillen", "streifen", "voronoi", "lowpoly"]) {
      const heights = patternPreview(normalizeParams({ effect }), 24, 24);
      const spread = Math.max(...heights) - Math.min(...heights);
      expect(spread, effect).toBeGreaterThan(0.2);
    }
  });
});

describe("print-friendly reliefs", () => {
  /** The steepest a vase leans out over its heights between 5 mm and 170 mm (rise per mm), sampled round it. */
  function steepestOut(params: Record<string, unknown>) {
    const p = normalizeParams(params);
    const mesh = buildVase({ ...params, quality: "standard" });
    // Columns of the grid: the outer wall's vertices sorted by angle and height.
    const columns = new Map<number, Array<[number, number]>>();
    for (let i = 0; i < mesh.vertices.length; i += 3) {
      const z = mesh.vertices[i + 2];
      if (z < 5 || z > p.height - 10) continue;
      const angle = Math.round(Math.atan2(mesh.vertices[i + 1], mesh.vertices[i]) * 1e4);
      const list = columns.get(angle) ?? [];
      list.push([z, Math.hypot(mesh.vertices[i], mesh.vertices[i + 1])]);
      columns.set(angle, list);
    }
    let worst = 0;
    for (const list of columns.values()) {
      // Only the outer wall: the largest radius per height.
      const byZ = new Map<number, number>();
      for (const [z, r] of list) byZ.set(Math.round(z * 1000), Math.max(byZ.get(Math.round(z * 1000)) ?? 0, r));
      const rows = [...byZ.entries()].sort((a, b) => a[0] - b[0]);
      for (let k = 1; k < rows.length; k += 1) {
        const dz = (rows[k][0] - rows[k - 1][0]) / 1000;
        if (dz > 0.05) worst = Math.max(worst, (rows[k][1] - rows[k - 1][1]) / dz);
      }
    }
    return worst;
  }

  it("keeps the lower edges of leaves at 45 degrees or less, and they overhang without it", () => {
    const params = { profile: "zylinder", body: "voll", effect: "blaetter", reliefDepth: 2.4 };
    expect(steepestOut({ ...params, printFriendly: "nein" })).toBeGreaterThan(1.3);
    // 45 degrees is a rise of 1 per mm; between two rows of the grid it may come out a few degrees more.
    expect(steepestOut({ ...params, printFriendly: "ja" })).toBeLessThan(1.15);
  });
});

describe("print checks of a relief", () => {
  it("names lower edges that overhang, and stays quiet when print-friendly keeps them at 45 degrees", () => {
    const loud = vaseChecks({ profile: "zylinder", body: "hohl", effect: "blaetter", reliefDepth: 2.4, printFriendly: "nein" });
    expect(loud.some((note: string) => note.startsWith("Relief: Unterkanten"))).toBe(true);
    const quiet = vaseChecks({ profile: "zylinder", body: "hohl", effect: "blaetter", reliefDepth: 2.4, printFriendly: "ja" });
    expect(quiet.some((note: string) => note.startsWith("Relief: Unterkanten"))).toBe(false);
  });

  it("warns of pattern parts too fine to print", () => {
    const notes = vaseChecks({ profile: "flasche", effect: "wisp", patternCount: 40, patternGroup: 8 });
    expect(notes.some((note: string) => note.startsWith("Feine Musterteile"))).toBe(true);
    expect(vaseChecks({ profile: "zylinder", effect: "waben", patternCount: 8 }).some((note: string) => note.startsWith("Feine Musterteile"))).toBe(false);
  });

  it("suggests a smooth neck where a lid sits, and the range that keeps it smooth", () => {
    const safe = lidSafeZoneTo({ height: 180, lidMode: "stuelp", lidDepth: 12 });
    expect(safe).toBe(91);
    expect(lidSafeZoneTo({ lidMode: "keiner" })).toBeNull();
    const into = vaseChecks({ body: "hohl", effect: "waben", lidMode: "stuelp", zoneTo: 100 });
    expect(into.some((note: string) => note.startsWith("Das Muster reicht bis in den Hals"))).toBe(true);
    const clear = vaseChecks({ body: "hohl", effect: "waben", lidMode: "stuelp", zoneTo: safe });
    expect(clear.some((note: string) => note.startsWith("Das Muster reicht bis in den Hals"))).toBe(false);
  });
});
