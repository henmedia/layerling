import { describe, expect, it } from "vitest";
import { buildVase, normalizeParams, vaseChecks } from "@/lib/vase/vase-geometry.mjs";
import { buildParts } from "@/lib/vase/vase-parts.mjs";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { normalizeVaseSettings } from "@/lib/vaseSettings";
import { fittedVaseMesh, vaseAccessories } from "@/lib/vaseShape";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import { setLanguage } from "@/lib/i18n";
import { vaseNote } from "@/lib/vaseNotes";
import type { WorkplaneShape } from "@/types/layerling";

/** A hollow vase with a teapot lid: 120 mm tall, the top 30 mm the lid. */
const TEAPOT = { body: "hohl", wall: 2, bottom: 2, height: 120, diameter: 90, profile: "bauchig", quality: "entwurf", lidMode: "kanne", lidHeight: 30 };
const CUT = 90;

/** Every edge used once each way: a closed mesh with its triangles facing out together. */
function openEdges(mesh: { indices: ArrayLike<number> }) {
  const edges = new Set<string>();
  for (let t = 0; t < mesh.indices.length; t += 3) {
    for (let e = 0; e < 3; e += 1) edges.add(`${mesh.indices[t + e]},${mesh.indices[t + ((e + 1) % 3)]}`);
  }
  let open = 0;
  for (const edge of edges) {
    const [a, b] = edge.split(",");
    if (!edges.has(`${b},${a}`)) open += 1;
  }
  return open;
}

function volume(mesh: { vertices: ArrayLike<number>; indices: ArrayLike<number> }) {
  const v = mesh.vertices, f = mesh.indices;
  let sum = 0;
  for (let t = 0; t < f.length; t += 3) {
    const [a, b, c] = [f[t] * 3, f[t + 1] * 3, f[t + 2] * 3];
    sum += (v[a] * (v[b + 1] * v[c + 2] - v[b + 2] * v[c + 1]) - v[a + 1] * (v[b] * v[c + 2] - v[b + 2] * v[c]) + v[a + 2] * (v[b] * v[c + 1] - v[b + 1] * v[c])) / 6;
  }
  return sum;
}

function zRange(vertices: ArrayLike<number>) {
  let min = Infinity, max = -Infinity;
  for (let i = 2; i < vertices.length; i += 3) {
    min = Math.min(min, vertices[i]);
    max = Math.max(max, vertices[i]);
  }
  return [min, max];
}

/** The points of a mesh at height z, as "x,y" rounded to a thousandth. */
function ringAt(vertices: ArrayLike<number>, z: number) {
  const points = new Set<string>();
  for (let i = 0; i < vertices.length; i += 3) {
    if (Math.abs(vertices[i + 2] - z) < 1e-6) points.add(`${vertices[i].toFixed(3)},${vertices[i + 1].toFixed(3)}`);
  }
  return points;
}

describe("the vase's teapot lid", () => {
  it("ends the body open at the cut and makes the top the lid, both closed meshes", () => {
    const body = buildVase(TEAPOT);
    const { parts, notes } = buildParts(TEAPOT);
    const lid = parts.find((part) => part.id === "deckel")!;
    expect(notes).toEqual([]);
    expect(zRange(body.vertices)).toEqual([0, CUT]);
    // The lid reaches from its lip's lower end (12 mm, the lip's default) up to the rim.
    expect(zRange(lid.mesh.vertices)).toEqual([CUT - 12, 120]);
    for (const mesh of [body, lid.mesh]) {
      expect(openEdges(mesh)).toBe(0);
      expect(volume(mesh)).toBeGreaterThan(0);
    }
    expect(lid.flip).toBe(true);
    // The frame is the whole vase's: as tall as the vase, the body lower.
    expect(body.extent?.max[2]).toBe(120);
  });

  it("meets the body at the joint point for point, so the pattern runs on across it", () => {
    const settings = { ...TEAPOT, effect: "rillen", ribCount: 24, ribDepth: 1.5, twist: 120 };
    const body = buildVase(settings);
    const lid = buildParts(settings).parts.find((part) => part.id === "deckel")!;
    const bodyRim = ringAt(body.vertices, CUT);
    const lidRim = ringAt(lid.mesh.vertices, CUT);
    // The body's rim at the cut is its outer and inner wall; the lid's seat there is its outer wall and its lip.
    // The outer wall's points are the same on both: every lid point that is not the lip's is one of the body's.
    const outer = [...lidRim].filter((point) => bodyRim.has(point));
    expect(outer.length).toBeGreaterThanOrEqual(lidRim.size / 2);
  });

  it("keeps the lip off the inner wall by the clearance all round", () => {
    const p = normalizeParams(TEAPOT);
    const lid = buildParts(TEAPOT).parts.find((part) => part.id === "deckel")!;
    const v = lid.mesh.vertices;
    let widest = 0;
    for (let i = 0; i < v.length; i += 3) {
      if (v[i + 2] < CUT - 1e-6) widest = Math.max(widest, Math.hypot(v[i], v[i + 1]));
    }
    // A round vase: the opening below the cut is no wider than the narrowest place there, less the clearance.
    const inner = buildVase({ ...TEAPOT, lidMode: "keiner" });
    let narrowest = Infinity;
    const iv = inner.vertices;
    for (let i = 0; i < iv.length; i += 3) {
      const z = iv[i + 2], r = Math.hypot(iv[i], iv[i + 1]);
      if (z > CUT - 12 && z < CUT && r < 40) narrowest = Math.min(narrowest, r);
    }
    expect(widest).toBeLessThanOrEqual(narrowest - p.lidClearance + 0.05);
  });

  it("makes a knob apart, with its peg in a hole on top, or none", () => {
    const knob = buildParts(TEAPOT).parts.find((part) => part.id === "knauf")!;
    expect(openEdges(knob.mesh)).toBe(0);
    expect(volume(knob.mesh)).toBeGreaterThan(0);
    // The peg reaches into the lid's top, the knob stands on it.
    const [low, high] = zRange(knob.mesh.vertices);
    expect(low).toBeLessThan(120);
    expect(high).toBeGreaterThan(130);
    expect(buildParts({ ...TEAPOT, lidKnob: "nein" }).parts.map((part) => part.id)).toEqual(["deckel"]);
  });

  it("needs a hollow vase, and no facets", () => {
    expect(buildParts({ ...TEAPOT, body: "voll" }).parts).toEqual([]);
    expect(vaseChecks({ ...TEAPOT, body: "voll" }).some((note) => note.startsWith("Der Teekannendeckel braucht eine hohle Vase"))).toBe(true);
    const faceted = buildVase({ ...TEAPOT, effect: "lowpoly" });
    expect(faceted.notes).toContain("Der Teekannendeckel geht nicht zusammen mit Facetten.");
    expect(zRange(faceted.vertices)[1]).toBe(120);
  });

  it("keeps the lid within reach: never more than seven tenths of the vase", () => {
    const tall = buildVase({ ...TEAPOT, lidHeight: 200 });
    expect(zRange(tall.vertices)[1]).toBeCloseTo(120 * 0.3, 6);
  });

  it("fits the body into the vase's frame without stretching it, and lays out lid and knob", () => {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "vase")!;
    const shape = makeShapeFromAsset(asset, { x: 0, z: 0 });
    const vase = canonicalizeShape({ ...shape, height: 120, vase: normalizeVaseSettings({ ...shape.vase, ...TEAPOT }) } as WorkplaneShape);
    const fitted = fittedVaseMesh(vase);
    let top = 0;
    for (let i = 1; i < fitted.vertices.length; i += 3) top = Math.max(top, fitted.vertices[i]);
    expect(top).toBeCloseTo(CUT, 3);
    expect(vaseAccessories(vase).map((accessory) => accessory.kind)).toEqual(["lid", "knob"]);
  });
});

describe("the teapot lid's overhang, as it prints upside down", () => {
  const overhangs = (settings: Record<string, unknown>) => vaseChecks(settings).filter((note: string) => note.includes("Überhang"));
  const BOTTLE = { ...TEAPOT, profile: "flasche", lidHeight: 50 };

  it("finds the bottle's shoulder, which leans out once the lid is turned over, in the vase's heights", async () => {
    // Standing, the bottle prints without supports; its lid, the top 50 mm turned over, has the shoulder overhanging.
    expect(overhangs({ ...BOTTLE, lidMode: "keiner" })).toEqual([]);
    const notes = overhangs(BOTTLE);
    expect(notes).toEqual(["Teekannendeckel, umgedreht gedruckt: Überhang bis 52° zwischen 77,5 und 91,5 mm Höhe der Vase (mehr als 45°) – dort braucht er Stützen, oder die Form dort steiler machen."]);
    await setLanguage("en", false);
    expect(vaseNote(notes[0])).toBe("Teapot lid, printed upside down: overhang of up to 52° between 77.5 and 91.5 mm of the vase's height (more than 45°) – it needs supports there, or make the form steeper there.");
  });

  it("has nothing to say about a lid that prints without supports", () => {
    for (const profile of ["bauchig", "zylinder", "fass"]) expect(overhangs({ ...TEAPOT, profile }), profile).toEqual([]);
  });

  it("checks the body only up to the joint, and the lid's inside, which leans in where the vase flares", () => {
    // Narrow below, flaring out between 84 and 102 mm: standing, that is an overhang of 62°.
    const flared = { ...TEAPOT, profile: "gezeichnet", profilePoints: [[0, 0.5], [0.7, 0.5], [0.85, 1], [1, 1]] };
    expect(overhangs({ ...flared, lidMode: "keiner" })).toEqual(["Überhang bis 62° zwischen 87,5 und 98,5 mm Höhe (mehr als 45°) – dort braucht es Stützen, oder die Form steiler machen."]);
    // With the joint at 90 mm the body's overhang ends there; above it the lid, turned over, has the flare inside.
    const notes = overhangs(flared);
    expect(notes[0]).toBe("Überhang bis 55° zwischen 87,5 und 88,5 mm Höhe (mehr als 45°) – dort braucht es Stützen, oder die Form steiler machen.");
    expect(notes[1]).toMatch(/^Teekannendeckel, umgedreht gedruckt: Überhang bis 90° zwischen 91,6 und 99,5 mm Höhe der Vase/);
    expect(notes).toHaveLength(2);
  });

  it("counts the flange under the lip as a ledge once it is wider than a printer lays without supports", async () => {
    // A funnel widens inside above the joint, so the flange that carries the lip is a wide ledge facing down.
    const notes = overhangs({ ...TEAPOT, profile: "trichter" });
    expect(notes).toEqual(["Teekannendeckel, umgedreht gedruckt: Überhang bis 90° bei 91,6 mm Höhe der Vase (mehr als 45°) – dort braucht er Stützen, oder die Form dort steiler machen."]);
    await setLanguage("en", false);
    expect(vaseNote(notes[0])).toBe("Teapot lid, printed upside down: overhang of up to 90° at 91.6 mm of the vase's height (more than 45°) – it needs supports there, or make the form steeper there.");
  });
});
