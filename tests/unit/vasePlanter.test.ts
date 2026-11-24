import { describe, expect, it } from "vitest";
import { buildVase, dockLayout, floorLayout, vaseShape } from "@/lib/vase/vase-geometry.mjs";
import { buildParts } from "@/lib/vase/vase-parts.mjs";
import { buildVaseBody } from "@/lib/vaseBody";
import { vaseNote } from "@/lib/vaseNotes";
import { normalizeVaseSettings } from "@/lib/vaseSettings";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { sceneWithVaseAccessories, vaseAccessories, vaseAssemblyRaise, vaseNaturalFrame } from "@/lib/vaseShape";
import { canonicalizeShape, workplaneShapesEqual } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * What a plant pot has beyond a vase: a saucer that hugs the pot or has a slanted rim, a bowl docked flush under the
 * pot (on pins or magnets), and a rail on a flat back that hangs the pot in a holder on the wall.
 */

type Mesh = { vertices: Float64Array; indices: Uint32Array };

/** Every edge walked once each way: the body is closed and oriented. */
function openEdges(mesh: Mesh) {
  const edges = new Map<string, number>();
  for (let t = 0; t < mesh.indices.length; t += 3) {
    for (let k = 0; k < 3; k += 1) {
      const edge = `${mesh.indices[t + k]}>${mesh.indices[t + ((k + 1) % 3)]}`;
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

/** A closed mesh's volume, positive where its faces look outwards. */
function volume(mesh: Mesh) {
  let sum = 0;
  const p = mesh.vertices;
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const [a, b, c] = [mesh.indices[t] * 3, mesh.indices[t + 1] * 3, mesh.indices[t + 2] * 3];
    sum += (p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c])) / 6;
  }
  return sum;
}

const reach = (mesh: Mesh, axis: number) => {
  let low = Infinity, high = -Infinity;
  for (let i = axis; i < mesh.vertices.length; i += 3) {
    low = Math.min(low, mesh.vertices[i]);
    high = Math.max(high, mesh.vertices[i]);
  }
  return { low, high };
};

/**
 * How fast a part's outline grows with the height, seen from the side (mm outwards per mm up, the steepest between two
 * neighbouring heights): at most 1 is a lean of 45 degrees, which prints without supports. `band` takes the heights
 * together in bands that wide, for a part whose outer wall has fewer rows than its inside.
 */
function steepestLean(mesh: Mesh, axis = 0, band = 0) {
  const widest = new Map<number, { out: number; z: number }>();
  for (let i = 0; i < mesh.vertices.length; i += 3) {
    const z = mesh.vertices[i + 2];
    const level = band ? Math.floor(z / band) : Math.round(z * 1000);
    if (!widest.has(level) || mesh.vertices[i + axis] > widest.get(level)!.out) widest.set(level, { out: mesh.vertices[i + axis], z });
  }
  const levels = [...widest.values()].sort((a, b) => a.z - b.z);
  let lean = 0;
  for (let k = 1; k < levels.length; k += 1) {
    if (levels[k].z - levels[k - 1].z < 0.2) continue;
    lean = Math.max(lean, (levels[k].out - levels[k - 1].out) / (levels[k].z - levels[k - 1].z));
  }
  return lean;
}

const pot = { height: 120, diameter: 140, profile: "topfKlassik", body: "hohl", purpose: "topf", drainHoles: 3, quality: "entwurf" };
const part = (settings: Record<string, unknown>, id: string) => buildParts(settings).parts.find((entry) => entry.id === id);

describe("a plant pot's saucer", () => {
  it("hugs the pot: its wall follows the pot's outline at the gap's distance, where a plate's stays straight", () => {
    const bellied = { ...pot, profile: "bauchig", saucerMode: "schale", saucerHeight: 40, saucerGap: 4 };
    const plate = part({ ...bellied, saucerForm: "teller" }, "untersetzer")!;
    const hug = part({ ...bellied, saucerForm: "huelle" }, "untersetzer")!;
    for (const dish of [plate, hug]) {
      expect(openEdges(dish.mesh)).toBe(0);
      expect(volume(dish.mesh)).toBeGreaterThan(0);
    }
    // The pot stands 4.5 mm above the table on the dish's ribs; at the dish's floor the hugging one is as wide as the
    // pot's bottom and the gap, the plate as wide as the pot's widest point in the dish.
    const shape = vaseShape(bellied);
    const widthAt = (mesh: Mesh, z: number) => {
      let widest = 0;
      for (let i = 0; i < mesh.vertices.length; i += 3) if (Math.abs(mesh.vertices[i + 2] - z) < 0.01) widest = Math.max(widest, Math.hypot(mesh.vertices[i], mesh.vertices[i + 1]));
      return widest;
    };
    const bottom = shape.outerAt(0, 0), widest = Math.max(...Array.from({ length: 36 }, (_, k) => shape.outerAt(0, k)));
    expect(widest).toBeGreaterThan(bottom + 6);
    expect(widthAt(hug.mesh, 0)).toBeLessThan(widthAt(plate.mesh, 0) - 4);
    // It never leans out by more than 45 degrees, so it prints without supports (seen from the side without the spout).
    expect(steepestLean(hug.mesh, 1, 2.6)).toBeLessThanOrEqual(1.01);
    // The pot still lifts out: at every height the dish's wall stands outside the pot's widest point below it, by the
    // gap (the wall's outside: gap and wall beyond the pot).
    for (let z = 5; z <= 40; z += 5) {
      let potWidest = 0;
      for (let h = 0; h <= z - 4.5; h += 0.5) potWidest = Math.max(potWidest, shape.outerAt(Math.PI / 2, h));
      let outside = 0;
      for (let i = 0; i < hug.mesh.vertices.length; i += 3) {
        if (Math.abs(hug.mesh.vertices[i + 2] - z) < 1.3 && Math.abs(hug.mesh.vertices[i]) < 3) outside = Math.max(outside, hug.mesh.vertices[i + 1]);
      }
      expect(outside, `at ${z} mm`).toBeGreaterThan(potWidest + 4 + 2 - 1.4);
    }
  });

  it("has a slanted rim that stands higher on one side than on the other", () => {
    const level = part({ ...pot, saucerMode: "schale", saucerHeight: 20, saucerSpout: "nein", saucerGrip: "nein" }, "untersetzer")!;
    const slanted = part({ ...pot, saucerMode: "schale", saucerForm: "huelle", saucerHeight: 20, saucerRise: 40, saucerSpout: "nein" }, "untersetzer")!;
    expect(openEdges(slanted.mesh)).toBe(0);
    expect(reach(level.mesh, 2).high).toBeCloseTo(20, 5);
    expect(reach(slanted.mesh, 2).high).toBeCloseTo(60, 5);
    // The low side is where a spout would be (+x), the high side opposite.
    const topAt = (mesh: Mesh, side: number) => {
      let top = 0;
      for (let i = 0; i < mesh.vertices.length; i += 3) if (side * mesh.vertices[i] > 30 && Math.abs(mesh.vertices[i + 1]) < 4) top = Math.max(top, mesh.vertices[i + 2]);
      return top;
    };
    expect(topAt(slanted.mesh, 1)).toBeCloseTo(20, 0);
    expect(topAt(slanted.mesh, -1)).toBeCloseTo(60, 0);
    expect(slanted.info).toMatch(/fasst etwa \d+ ml/);
    // Higher than three quarters up the pot it does not go.
    const capped = buildParts({ ...pot, height: 60, saucerMode: "schale", saucerHeight: 20, saucerRise: 80 });
    expect(reach(capped.parts.find((entry) => entry.id === "untersetzer")!.mesh, 2).high).toBeLessThanOrEqual(4.5 + 45 + 0.01);
    expect(capped.notes.some((note) => note.startsWith("Der schräge Rand des Untersetzers ist auf"))).toBe(true);
  });
});

/**
 * The least air between an insert and the pot's inner wall (mm), over the insert's whole outer wall - its ring points
 * and the faces between them: put together (`air`), and standing a bottom's thickness lower, as it does when it is
 * laid into the pot on the plate in the editor (`lower`). Null where the pot takes no insert.
 */
function insertAir(settings: Record<string, unknown>) {
  const inner = part(settings, "einsatz");
  if (!inner) return null;
  const shape = vaseShape(settings), drop = floorLayout(settings).floor;
  const v = inner.mesh.vertices;
  // The outer wall's rings come first: as many points as lie at the first one's height, row upon row upwards.
  let n = 1;
  while (v[n * 3 + 2] === v[2]) n += 1;
  let rows = 1;
  while (v[rows * n * 3 + 2] > v[(rows - 1) * n * 3 + 2]) rows += 1;
  const point = (i: number, j: number) => {
    const k = (i * n + (j % n)) * 3;
    return [v[k], v[k + 1], v[k + 2]];
  };
  let air = Infinity, lower = Infinity;
  for (let i = 0; i + 1 < rows; i += 1) {
    for (let j = 0; j < n; j += 1) {
      const [a, b, c, d] = [point(i, j), point(i, j + 1), point(i + 1, j), point(i + 1, j + 1)];
      for (const u of [0, 0.5]) {
        for (const w of [0, 0.34, 0.67]) {
          const x = (a[0] * (1 - u) + b[0] * u) * (1 - w) + (c[0] * (1 - u) + d[0] * u) * w;
          const y = (a[1] * (1 - u) + b[1] * u) * (1 - w) + (c[1] * (1 - u) + d[1] * u) * w;
          const z = a[2] * (1 - w) + c[2] * w;
          const r = Math.hypot(x, y), theta = Math.atan2(y, x);
          air = Math.min(air, shape.innerAt(theta, z) - r);
          lower = Math.min(lower, shape.innerAt(theta, z - drop) - r);
        }
      }
    }
  }
  return { air, lower };
}

/** The least air between a dish's inner wall and the pot standing in it (mm): on the dish's ribs, and on the table. */
function dishAir(settings: Record<string, unknown>) {
  const built = buildParts(settings);
  const dish = built.parts.find((entry) => entry.id === "untersetzer")!;
  const shape = vaseShape(settings);
  const v = dish.mesh.vertices;
  // The outer wall's rings come first (the first at the table), the inner wall's after them.
  let n = 1;
  while (v[n * 3 + 2] === 0 && Math.hypot(v[n * 3], v[n * 3 + 1]) > 1) n += 1;
  let rows = 1;
  while (v[rows * n * 3 + 2] > 0 && v[rows * n * 3 + 2] >= v[(rows - 1) * n * 3 + 2]) rows += 1;
  let onRibs = Infinity, onTable = Infinity;
  for (let k = rows * n * 3; k < 2 * rows * n * 3; k += 3) {
    const r = Math.hypot(v[k], v[k + 1]), theta = Math.atan2(v[k + 1], v[k]), z = v[k + 2];
    if (z >= built.lift) onRibs = Math.min(onRibs, r - shape.outerAt(theta, z - built.lift));
    if (z >= 2.5) onTable = Math.min(onTable, r - shape.outerAt(theta, z));
  }
  return { onRibs, onTable };
}

const BODY_FORMS = ["flasche", "bauchig", "schale", "fass", "zylinder", "trichter", "topfKlassik", "topfKuebel", "topfSchale"];

describe("a plant pot's inner pot", () => {
  it("stays clear of the pot's inner wall, also between the points of narrow fins and pointed arches", () => {
    for (const more of [{}, { section: "welle", sectionWaves: 30, sectionWaveStyle: "lamellen" }, { section: "welle", sectionWaves: 24, sectionWaveStyle: "bogen", sectionZoneFrom: 25, sectionZoneTo: 85 }, { profile: "bauchig", section: "welle", sectionWaves: 30, sectionWaveStyle: "lamellen" }]) {
      const settings = { ...pot, insertMode: "pflanze", ...more };
      expect(openEdges(part(settings, "einsatz")!.mesh), JSON.stringify(more)).toBe(0);
      expect(insertAir(settings)!.air, JSON.stringify(more)).toBeGreaterThan(0.3);
    }
  });

  it("is round inside a pot with fins, as wide as the core between them", () => {
    const finned = { ...pot, insertMode: "pflanze", section: "welle", sectionWaves: 24, sectionWaveStyle: "lamellen", twist: 60 };
    const inner = part(finned, "einsatz")!;
    let low = Infinity, high = 0;
    for (let i = 0; i < inner.mesh.vertices.length; i += 3) {
      if (Math.abs(inner.mesh.vertices[i + 2] - 60) > 3) continue;
      const r = Math.hypot(inner.mesh.vertices[i], inner.mesh.vertices[i + 1]);
      if (r < 15) continue;
      low = Math.min(low, r);
      high = Math.max(high, r);
    }
    // (Outer and inner wall of the insert: its wall's thickness apart, no more.)
    expect(high - low).toBeLessThan(1.7);
    expect(insertAir(finned)!.air).toBeGreaterThan(0.3);
  });

  // Every body form with every kind of cross-section, both inserts in turn, in changing sizes and walls.
  it.each(BODY_FORMS)("fits into every pot: %s", (profile) => {
    const sections = [{}, { section: "vieleck", polySides: 5 }, { section: "welle", sectionWaves: 12, twist: 60 }, { section: "welle", sectionWaves: 16, sectionWaveStyle: "spitz" }, { section: "welle", sectionWaves: 24, sectionWaveStyle: "lamellen", twist: 60 }, { effect: "rillen", ribDepth: 3 }, { wallMount: "schiene" }];
    const sizes = [[120, 140], [200, 90], [70, 160], [300, 200]];
    let fitted = 0;
    sections.forEach((section, k) => {
      const turn = BODY_FORMS.indexOf(profile) + k;
      const [height, diameter] = sizes[turn % sizes.length];
      const settings = { height, diameter, body: "hohl", purpose: "topf", profile, wall: [1.2, 2, 3][turn % 3], insertMode: turn % 2 ? "bewaesserung" : "pflanze", ...section };
      const fit = insertAir(settings);
      // (A pot too low or too narrow for an insert gets none, with a note.)
      if (!fit) return;
      fitted += 1;
      expect(fit.air, JSON.stringify(settings)).toBeGreaterThan(0.3);
      expect(fit.lower, JSON.stringify(settings)).toBeGreaterThan(0.15);
    });
    expect(fitted).toBeGreaterThan(2);
  }, 60_000);
});

describe("a saucer under every pot", () => {
  it.each(BODY_FORMS)("leaves room round the pot: %s", (profile) => {
    const dishes = [{ saucerForm: "teller" }, { saucerForm: "huelle" }, { saucerForm: "huelle", saucerRise: 40, saucerHeight: 20 }, { saucerForm: "huelle", saucerHeight: 40, saucerGap: 2, section: "welle", sectionWaves: 12 }, { saucerForm: "teller", saucerRise: 30, section: "vieleck", polySides: 5 }];
    const sizes = [[120, 140], [200, 90], [70, 160]];
    dishes.forEach((dish, k) => {
      const [height, diameter] = sizes[(BODY_FORMS.indexOf(profile) + k) % sizes.length];
      const settings = { height, diameter, body: "hohl", purpose: "topf", profile, saucerMode: "schale", quality: "entwurf", ...dish };
      const fit = dishAir(settings);
      expect(fit.onRibs, JSON.stringify(settings)).toBeGreaterThan(1.5);
      // A dish that hugs the pot clears it as well where the pot stands on the table in it, not on the ribs.
      if (dish.saucerForm === "huelle") expect(fit.onTable, JSON.stringify(settings)).toBeGreaterThan(1.2);
    });
  }, 30_000);
});

describe("a bowl docked under the pot", () => {
  const docked = { ...pot, saucerMode: "andock", saucerHeight: 20 };

  it("carries the pot's bottom outline on downwards and stands on a flat base", () => {
    const bowl = part(docked, "andockschale")!;
    expect(openEdges(bowl.mesh)).toBe(0);
    expect(volume(bowl.mesh)).toBeGreaterThan(0);
    const rim = vaseShape(docked).rimAt(0);
    // Flush with the pot at its rim, drawn in towards the table; no wider anywhere.
    expect(reach(bowl.mesh, 0).high).toBeCloseTo(rim, 1);
    let base = 0;
    for (let i = 0; i < bowl.mesh.vertices.length; i += 3) if (bowl.mesh.vertices[i + 2] < 0.01) base = Math.max(base, Math.hypot(bowl.mesh.vertices[i], bowl.mesh.vertices[i + 1]));
    expect(base).toBeLessThan(rim - 5);
    expect(base).toBeGreaterThan(rim * 0.55);
    // Its wall leans out by 45 degrees at most (the bosses stand upright inside it).
    expect(steepestLean(bowl.mesh, 0, 1.3)).toBeLessThanOrEqual(1.01);
    expect(bowl.info).toMatch(/fasst etwa \d+ ml; der Topf steht auf 3 Zapfen/);
    // The pot is lifted by the bowl's height.
    expect(buildParts(docked).lift).toBe(20);
  });

  it("holds the pot on three bosses whose pins sit in recesses in the pot's bottom", () => {
    const layout = floorLayout(docked);
    expect(layout.dock.points).toHaveLength(3);
    const recesses = layout.blind.filter((hole: { kind: string }) => hole.kind === "andock");
    expect(recesses).toHaveLength(3);
    recesses.forEach((hole: { cx: number; cy: number; r: number; depth: number }, k: number) => {
      expect(hole.cx).toBeCloseTo(layout.dock.points[k].cx, 9);
      expect(hole.cy).toBeCloseTo(layout.dock.points[k].cy, 9);
      // A pin of 2.5 mm with the fit's clearance, 3 mm deep; the bottom is thick enough for it.
      expect(hole.r).toBeCloseTo(2.7, 9);
      expect(hole.depth).toBe(3);
    });
    expect(layout.floor).toBeGreaterThanOrEqual(4.2);
    // The drain holes keep clear of the recesses.
    for (const drain of layout.drains) for (const hole of recesses) expect(Math.hypot(drain.cx - hole.cx, drain.cy - hole.cy)).toBeGreaterThan(drain.r + hole.r + 1.9);
    // The pins rise 2.6 mm above the bosses, which end level with the pot's underside.
    const bowl = part(docked, "andockschale")!;
    expect(reach(bowl.mesh, 2).high).toBeCloseTo(22.6, 5);
    expect(openEdges(buildVase(docked))).toBe(0);
  });

  it("holds by magnets of the size set, glued into bowl and pot", () => {
    const magnets = { ...docked, saucerHold: "magnet", magnetDiameter: 8, magnetHeight: 2 };
    const layout = floorLayout(magnets);
    for (const hole of layout.blind) {
      expect(hole.r).toBeCloseTo(4.1, 9);
      expect(hole.depth).toBeCloseTo(2.2, 9);
    }
    const bowl = part(magnets, "andockschale")!;
    expect(openEdges(bowl.mesh)).toBe(0);
    // Pockets, not pins: nothing stands above the bosses.
    expect(reach(bowl.mesh, 2).high).toBeCloseTo(20, 5);
    expect(bowl.info).toContain("3 Magneten Ø 8 × 2 mm");
  });

  it("is left out, with a note, where it has no place", () => {
    const note = (settings: Record<string, unknown>) => floorLayout(settings).notes.join(" | ");
    expect(note({ ...docked, footHeight: 12 })).toContain("ohne hohlen Fuß und ohne Beine");
    expect(note({ ...docked, legMode: "stecken" })).toContain("ohne hohlen Fuß und ohne Beine");
    expect(note({ ...docked, bottom: 0 })).toContain("Ohne Boden gibt es keine angedockte Schale.");
    expect(note({ ...docked, diameter: 30, profile: "trichter" })).toContain("Der Boden ist zu klein für eine angedockte Schale");
    expect(part({ ...docked, footHeight: 12 }, "andockschale")).toBeUndefined();
    expect(dockLayout(normalizeVaseSettings({ ...docked, saucerHeight: 20 }), () => 8)).toBeNull();
    // Recesses for rubber feet give way to the bowl's.
    const feet = floorLayout({ ...docked, rubberFeet: 4 });
    expect(feet.blind.every((hole: { kind: string }) => hole.kind === "andock")).toBe(true);
    expect(feet.notes).toContain("Mit angedockter Schale gibt es keine Mulden für Gummifüße.");
  });
});

describe("a pot for the wall", () => {
  const hung = { ...pot, wallMount: "schiene", drainHoles: 0 };

  it("has a flat back, 7 mm in from its hindmost point, and stays inside the pot's own box", () => {
    const free = vaseShape(pot), cut = vaseShape(hung);
    const back = Math.max(...Array.from({ length: 121 }, (_, z) => free.outerAt(Math.PI / 2, z)));
    expect(cut.wall.back).toBeCloseTo(back, 1);
    expect(cut.wall.flat).toBeCloseTo(back - 7, 1);
    // At the rim's height the back is a plane: the same y across the flat.
    for (const x of [-15, 0, 15]) {
      const theta = Math.atan2(cut.wall.flat, x);
      expect(cut.outerAt(theta, 116) * Math.sin(theta)).toBeCloseTo(cut.wall.flat, 6);
    }
    // The front is the free pot's.
    expect(cut.outerAt(-Math.PI / 2, 60)).toBe(free.outerAt(-Math.PI / 2, 60));
    const body = buildVaseBody(normalizeVaseSettings(hung));
    expect(reach(body, 1).high).toBeCloseTo(back, 1);
    expect(reach(body, 1).low).toBeCloseTo(-back, 1);
    // So the frame keeps the pot's size: as wide as deep.
    const frame = vaseNaturalFrame(hung, 140, 140, 120);
    expect(frame.width).toBeCloseTo(140, 1);
    expect(frame.depth).toBeCloseTo(140, 1);
  });

  it("carries a dovetail rail on its back that reaches the wall plane and starts as a wedge", () => {
    const rail = part(hung, "wandschiene")!;
    const { wall } = vaseShape(hung);
    expect(rail.merge).toBe(true);
    expect(openEdges(rail.mesh)).toBe(0);
    expect(volume(rail.mesh)).toBeGreaterThan(0);
    expect(reach(rail.mesh, 1).high).toBeCloseTo(wall.back, 6);
    expect(reach(rail.mesh, 2).high).toBeCloseTo(wall.top, 6);
    // 22 mm across at the wall, 14 mm at the pot: a dovetail.
    expect(reach(rail.mesh, 0).high).toBeCloseTo(11, 6);
    let neck = 0;
    for (let i = 0; i < rail.mesh.vertices.length; i += 3) if (rail.mesh.vertices[i + 1] < wall.flat - 0.1 && rail.mesh.vertices[i + 2] > wall.top - 5) neck = Math.max(neck, Math.abs(rail.mesh.vertices[i]));
    expect(neck).toBeCloseTo(7, 6);
    // Its back grows out of the pot at 45 degrees: it prints with the pot, without supports.
    expect(steepestLean(rail.mesh, 1)).toBeLessThanOrEqual(1.01);
    const lowest = reach(rail.mesh, 2).low;
    let firstDepth = 0;
    for (let i = 0; i < rail.mesh.vertices.length; i += 3) if (rail.mesh.vertices[i + 2] < lowest + 1e-6) firstDepth = Math.max(firstDepth, rail.mesh.vertices[i + 1]);
    expect(firstDepth).toBeLessThan(wall.flat + 1.5);
    // It reaches into the pot's wall, but not through it.
    const shape = vaseShape(hung);
    for (let i = 0; i < rail.mesh.vertices.length; i += 3) {
      const [x, y, z] = [rail.mesh.vertices[i], rail.mesh.vertices[i + 1], rail.mesh.vertices[i + 2]];
      const theta = Math.atan2(y, x);
      expect(Math.hypot(x, y)).toBeGreaterThan(shape.innerAt(theta, z) + 0.5);
    }
    // The body the editor draws and exports has the rail on it.
    const body = buildVaseBody(normalizeVaseSettings(hung));
    expect(body.triangleCount).toBe(buildVase(hung).triangleCount + rail.mesh.indices.length / 3);
  });

  it("keeps the wall plain under the rail, whatever the pattern", () => {
    const patterned = { ...hung, effect: "rillen", ribCount: 40, ribDepth: 2 };
    const { wall } = vaseShape(patterned);
    const body = buildVase(patterned);
    let deepest = 0, elsewhere = 0;
    const shape = vaseShape(patterned);
    for (let i = 0; i < body.vertices.length; i += 3) {
      const [x, y, z] = [body.vertices[i], body.vertices[i + 1], body.vertices[i + 2]];
      const r = Math.hypot(x, y), theta = Math.atan2(y, x);
      const sunk = shape.outerAt(theta, z) - r;
      // (The outer wall only: the inner one lies behind the grooves.)
      if (sunk > 2.5 || z < 2 || z > 118) continue;
      if (y > 0 && Math.abs(x) < 11 && z > wall.bottom && z < wall.top) deepest = Math.max(deepest, sunk);
      else if (y < 0) elsewhere = Math.max(elsewhere, sunk);
    }
    expect(elsewhere).toBeGreaterThan(1.5);
    expect(deepest).toBeLessThan(0.05);
  });

  it("comes with a holder for the wall: a plate with two rails, a ramp and countersunk screw holes", () => {
    const holder = part(hung, "wandhalter")!;
    expect(holder.merge).toBe(false);
    expect(openEdges(holder.mesh)).toBe(0);
    expect(volume(holder.mesh)).toBeGreaterThan(0);
    // Lying on its back: 4 mm of plate, the rails 5.5 mm above it.
    expect(reach(holder.mesh, 2).low).toBe(0);
    expect(reach(holder.mesh, 2).high).toBeCloseTo(9.5, 6);
    expect(holder.info).toContain("2 Löcher für Senkkopfschrauben Ø 4,5 mm");
    // The pocket takes the rail with play: 22 mm of rail; at the plate the pocket is 23.2 mm - the fit's 0.3 mm to
    // each side, and as much again for the 0.3 mm the plate stays behind the rail (the slanted faces would lie on
    // one another otherwise).
    let pocket = Infinity;
    for (let i = 0; i < holder.mesh.vertices.length; i += 3) {
      const [x, y, z] = [holder.mesh.vertices[i], holder.mesh.vertices[i + 1], holder.mesh.vertices[i + 2]];
      if (Math.abs(z - 4) < 1e-6 && y > 20 && x > 5 && x < 15) pocket = Math.min(pocket, x);
    }
    expect(pocket).toBeCloseTo(11.6, 6);
    // The rails lean in over the pocket at 45 degrees: 4.3 mm narrower on each side, 4.3 mm up.
    let lip = Infinity;
    for (let i = 0; i < holder.mesh.vertices.length; i += 3) {
      const [x, y, z] = [holder.mesh.vertices[i], holder.mesh.vertices[i + 1], holder.mesh.vertices[i + 2]];
      if (Math.abs(z - 8.3) < 1e-6 && y > 20 && x > 0) lip = Math.min(lip, x);
    }
    expect(lip).toBeCloseTo(7.3, 6);
    // Wider screws, wider holes.
    expect(part({ ...hung, lampWallScrew: 6 }, "wandhalter")!.info).toContain("Ø 6 mm");
    // The editor lays it out as a part of its own; the rail is not among the parts.
    const laid = vaseAccessories({ width: 140, depth: 140, height: 120, vase: hung });
    expect(laid.map((entry) => entry.kind)).toEqual(["wallHolder"]);
  });

  it("sits where the back lies nearest the wall: under the rim of a pot, at the belly of a bellied vase", () => {
    expect(vaseShape(hung).wall.top).toBeCloseTo(108, 6);
    const bellied = vaseShape({ ...hung, profile: "bauchig", height: 200 });
    expect(bellied.wall.top).toBeLessThan(150);
    expect(openEdges(part({ ...hung, profile: "bauchig", height: 200 }, "wandschiene")!.mesh)).toBe(0);
    // Corners, waves and a twist work as well.
    for (const more of [{ section: "vieleck", polySides: 6 }, { section: "welle", twist: 40 }, { profile: "topfSchale", height: 70, diameter: 160 }]) {
      const parts = buildParts({ ...hung, ...more });
      expect(parts.notes.filter((note) => note.includes("ließ sich nicht bauen")), JSON.stringify(more)).toEqual([]);
      for (const id of ["wandschiene", "wandhalter"]) expect(openEdges(parts.parts.find((entry) => entry.id === id)!.mesh), `${id} ${JSON.stringify(more)}`).toBe(0);
      expect(openEdges(buildVase({ ...hung, ...more }))).toBe(0);
    }
  });

  it("says what does not go together, in the language of the editor", () => {
    const notes = (settings: Record<string, unknown>) => floorLayout(settings).notes;
    expect(notes({ ...hung, body: "voll" })).toContain("Die Wandschiene gibt es für einen hohlen Topf (kein Lampenschirm, nicht im Vasenmodus).");
    expect(notes({ ...hung, effect: "lowpoly" })).toContain("Mit Low Poly gibt es keine Wandschiene – ein anderes Muster wählen.");
    expect(notes({ ...hung, height: 40 })).toContain("Für die Wandschiene ist der Topf zu klein (mindestens 50 mm hoch und etwa 45 mm breit).");
    expect(notes({ ...hung, saucerMode: "schale" }).some((note: string) => note.startsWith("An der Wand hängt ein loser Untersetzer nicht mit"))).toBe(true);
    expect(notes({ ...hung, saucerMode: "andock" })).toContain("An der Wand hält die angedockte Schale nur mit Magneten – „Magnete“ wählen.");
    expect(notes({ ...hung, drainHoles: 3 }).some((note: string) => note.startsWith("An der Wand tropft Wasser aus den Ablauflöchern"))).toBe(true);
    expect(notes({ ...hung, saucerMode: "andock", saucerHold: "magnet", drainHoles: 3 }).filter((note: string) => note.startsWith("An der Wand"))).toEqual([]);
    expect(notes({ ...hung, legMode: "stecken" })).toContain("An der Wand braucht der Topf keine Beine.");
    // No rail, no holder.
    expect(part({ ...hung, effect: "lowpoly" }, "wandhalter")).toBeUndefined();
    for (const settings of [{ ...hung, body: "voll" }, { ...hung, effect: "lowpoly" }, { ...hung, height: 40 }, { ...hung, saucerMode: "schale" }, { ...hung, saucerMode: "andock" }, { ...hung, drainHoles: 3 }, { ...hung, legMode: "stecken" }, { ...pot, saucerMode: "andock", footHeight: 12 }, { ...pot, saucerMode: "andock", bottom: 0 }, { ...pot, saucerMode: "andock", rubberFeet: 4 }, { ...pot, saucerMode: "andock", diameter: 30, profile: "trichter" }]) {
      for (const note of notes(settings)) expect(vaseNote(note), note).not.toMatch(/[äöüß]|Wand|Schale|Topf/);
    }
  });

  it("with a docked bowl on magnets, the bowl has the pot's flat back as well", () => {
    const both = { ...hung, drainHoles: 3, saucerMode: "andock", saucerHold: "magnet" };
    const bowl = part(both, "andockschale")!;
    const { wall } = vaseShape(both);
    expect(openEdges(bowl.mesh)).toBe(0);
    expect(reach(bowl.mesh, 1).high).toBeLessThanOrEqual(wall.flat + 1e-6);
    const laid = vaseAccessories({ width: 140, depth: 140, height: 120, vase: both });
    expect(laid.map((entry) => entry.kind).sort()).toEqual(["dockedSaucer", "wallHolder"]);
    // The body: the pot with its recesses and the rail, one object.
    const body = buildVaseBody(normalizeVaseSettings(both));
    expect(body.triangleCount).toBe(buildVase(both).triangleCount + part(both, "wandschiene")!.mesh.indices.length / 3);
  });
});

describe("a vase's accessories put together round it", () => {
  /** A pot in the scene, 140 mm across and 120 mm high, standing on the plate. */
  function potShape(settings: Record<string, unknown>): WorkplaneShape {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "vase")!;
    const shape = makeShapeFromAsset(asset, { x: 30, z: -40 });
    return canonicalizeShape({ ...shape, width: 140, depth: 140, size: 140, height: 120, vase: normalizeVaseSettings({ ...shape.vase, ...pot, ...settings }) });
  }
  const name = () => "part";
  const partNamed = (parts: WorkplaneShape[], scene: WorkplaneShape[], kind: string) => {
    const vase = scene.find((entry) => entry.kind === "vase")!;
    const kinds = vaseAccessories({ width: 140, depth: 140, height: 120, vase: vase.vase }).map((entry) => entry.kind);
    return parts[kinds.indexOf(kind as never)];
  };

  it("raises the pot onto its saucer and sets the saucer under it and the inner pot in it", () => {
    const shape = potShape({ saucerMode: "schale", saucerSpout: "nein", saucerGrip: "nein", insertMode: "pflanze" });
    const together = sceneWithVaseAccessories([shape], shape.id, name, true);
    const lifted = together.shapes.find((entry) => entry.id === shape.id)!;
    // The saucer's floor is 2 mm, its ribs 2.5 mm: the pot stands 4.5 mm up, and remembers it.
    expect(lifted.elevation).toBeCloseTo(4.5, 6);
    expect(lifted.vaseAssembled).toBeCloseTo(4.5, 6);
    expect(vaseAssemblyRaise({ width: 140, depth: 140, height: 120, vase: shape.vase })).toBeCloseTo(4.5, 6);
    const saucer = partNamed(together.parts, together.shapes, "saucer"), inner = partNamed(together.parts, together.shapes, "plantInsert");
    // The saucer on the plate, round the pot's middle; the inner pot on the pot's inner floor (2 mm), in the middle.
    expect(saucer.elevation ?? 0).toBeCloseTo(0, 6);
    expect(inner.elevation).toBeCloseTo(4.5 + 2, 6);
    for (const laid of [saucer, inner]) {
      expect(laid.x).toBeCloseTo(shape.x, 3);
      expect(laid.z).toBeCloseTo(shape.z, 3);
      expect(laid.vasePartOf).toBe(shape.id);
    }
    // The inner pot ends 1.5 mm under the pot's rim.
    expect((inner.elevation ?? 0) + inner.height).toBeCloseTo(4.5 + 118.5, 6);
    // Asked again, nothing moves on.
    const again = sceneWithVaseAccessories(together.shapes, shape.id, name, true);
    expect(again.shapes.find((entry) => entry.id === shape.id)!.elevation).toBeCloseTo(4.5, 6);
    expect(again.shapes).toHaveLength(3);
  });

  it("sets the pot down again when the parts are laid out for printing", () => {
    const shape = potShape({ saucerMode: "schale", insertMode: "pflanze" });
    const together = sceneWithVaseAccessories([shape], shape.id, name, true);
    const printing = sceneWithVaseAccessories(together.shapes, shape.id, name);
    const down = printing.shapes.find((entry) => entry.id === shape.id)!;
    expect(down.elevation ?? 0).toBeCloseTo(0, 6);
    expect(down.vaseAssembled).toBeUndefined();
    expect(workplaneShapesEqual([down], [shape])).toBe(true);
    // Beside the pot, on the plate, as before.
    for (const laid of printing.parts) {
      expect(laid.elevation ?? 0).toBeCloseTo(0, 6);
      expect(laid.x).toBeGreaterThan(shape.x + 70);
    }
    // A pot one has moved up oneself keeps that: it is raised from where it stands, and set down there again.
    const shelf = { ...shape, elevation: 30 };
    const up = sceneWithVaseAccessories([shelf], shelf.id, name, true);
    expect(up.shapes[0].elevation).toBeCloseTo(34.5, 6);
    expect(sceneWithVaseAccessories(up.shapes, shelf.id, name).shapes[0].elevation).toBeCloseTo(30, 6);
    // With its parts switched off while put together, it comes down as well, and the old parts go.
    const bare = together.shapes.map((entry) => (entry.id === shape.id ? { ...entry, vase: normalizeVaseSettings({ ...entry.vase, saucerMode: "keine", insertMode: "keine" }) } : entry));
    const cleared = sceneWithVaseAccessories(bare, shape.id, name, true);
    expect(cleared.parts).toEqual([]);
    expect(cleared.shapes).toHaveLength(1);
    expect(cleared.shapes[0].elevation ?? 0).toBeCloseTo(0, 6);
    expect(cleared.shapes[0].vaseAssembled).toBeUndefined();
    // A vase without parts is left as it is.
    const plain = [potShape({ saucerMode: "keine" })];
    expect(sceneWithVaseAccessories(plain, plain[0].id, name, true).shapes).toBe(plain);
  });

  it("stands a docked bowl under the pot and the wall holder upright behind it", () => {
    const shape = potShape({ saucerMode: "andock", saucerHold: "magnet", saucerHeight: 20, wallMount: "schiene" });
    const together = sceneWithVaseAccessories([shape], shape.id, name, true);
    const lifted = together.shapes.find((entry) => entry.id === shape.id)!;
    expect(lifted.elevation).toBeCloseTo(20, 6);
    const bowl = partNamed(together.parts, together.shapes, "dockedSaucer"), holder = partNamed(together.parts, together.shapes, "wallHolder");
    // The bowl from the plate up to the pot's bottom, flush with it.
    expect(bowl.elevation ?? 0).toBeCloseTo(0, 6);
    expect(bowl.height).toBeCloseTo(20, 6);
    expect(bowl.width).toBeLessThanOrEqual(140);
    // The holder stands: as tall as it is long when printed, 9.5 mm thick, behind the pot's back (the editor's -z)
    // with its plate against the wall, 4.3 mm behind the rail.
    const { wall } = vaseShape(normalizeVaseSettings({ ...shape.vase, height: 120, diameter: 140 }));
    const railLength = 6 + (wall.top - wall.bottom) - 4;
    expect(holder.height).toBeCloseTo(railLength, 6);
    expect(holder.depth).toBeCloseTo(9.5, 6);
    expect(holder.x).toBeCloseTo(shape.x, 6);
    expect(holder.elevation).toBeCloseTo(20 + wall.bottom - 6 + 0.3, 6);
    // (The rail reaches as far back as the pot did before its back was cut flat: the pot's box is still round its axis.)
    const axis = shape.z;
    expect(holder.z - holder.depth / 2).toBeCloseTo(axis - (wall.back + 4.3), 3);
    expect(holder.z + holder.depth / 2).toBeLessThan(axis - wall.flat + 2);
  });

  it("puts legs, a lid and a lampshade's base where they belong", () => {
    const legged = potShape({ legMode: "stecken", legHeight: 35, saucerMode: "keine", lidMode: "stuelp", drainHoles: 0, profile: "fass" });
    const together = sceneWithVaseAccessories([legged], legged.id, name, true);
    expect(together.shapes.find((entry) => entry.id === legged.id)!.elevation).toBeCloseTo(35, 6);
    const tops = together.parts.map((entry) => (entry.elevation ?? 0) + entry.height);
    // Three legs from the plate into the bottom's sockets, and the lid on the rim.
    expect(together.parts.filter((entry) => (entry.elevation ?? 0) < 0.001)).toHaveLength(3);
    expect(Math.max(...tops)).toBeGreaterThan(35 + 120);
    const lamp = potShape({ purpose: "lampe", profile: "schirmTrommel", lamp: "sockel", drainHoles: 0, wall: 1.6 });
    const standing = sceneWithVaseAccessories([lamp], lamp.id, name, true);
    const shade = standing.shapes.find((entry) => entry.id === lamp.id)!;
    expect(shade.elevation).toBeGreaterThan(40);
    expect(standing.parts[0].elevation ?? 0).toBeCloseTo(0, 6);
    // The base reaches a little into the shade: its seat.
    expect((standing.parts[0].elevation ?? 0) + standing.parts[0].height).toBeGreaterThan(shade.elevation!);
    expect((standing.parts[0].elevation ?? 0) + standing.parts[0].height).toBeLessThan(shade.elevation! + 3);
  });
});
