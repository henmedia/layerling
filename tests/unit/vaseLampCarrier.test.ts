import { describe, expect, it } from "vitest";
import { PROFILES, PURPOSES, buildVase, normalizeParams, profileFunction } from "@/lib/vase/vase-geometry.mjs";
import { vaseNote } from "@/lib/vaseNotes";

/*
 * A vase as a lampshade or a plant pot: the use the settings keep, the body shapes for it, and the lampshade's
 * carrier - the plate that holds the socket, opened into a ring with spokes.
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

/** The area of the body's underside (the faces lying on the bed), mm². */
function undersideArea(mesh: { vertices: Float64Array; indices: Uint32Array }) {
  let area = 0;
  const v = mesh.vertices;
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const [a, b, c] = [mesh.indices[t] * 3, mesh.indices[t + 1] * 3, mesh.indices[t + 2] * 3];
    if (v[a + 2] > 0.01 || v[b + 2] > 0.01 || v[c + 2] > 0.01) continue;
    area += Math.abs((v[b] - v[a]) * (v[c + 1] - v[a + 1]) - (v[c] - v[a]) * (v[b + 1] - v[a + 1])) / 2;
  }
  return area;
}

const shade = { height: 160, diameter: 180, profile: "schirmTrommel", body: "hohl", wall: 1.2, lamp: "haengend", quality: "entwurf" };

describe("a lampshade's carrier", () => {
  it("is a closed plate with the socket's hole, as before, where no spokes are asked for", () => {
    const mesh = buildVase(shade);
    expect(openEdges(mesh)).toBe(0);
    expect(mesh.params.lampSpokes).toBe(0);
    expect(mesh.floor.drains).toHaveLength(1);
    expect(mesh.floor.drains[0].r).toBeCloseTo(20.5);
  });

  it("with spokes is a ring round the socket held by that many spokes, open between them", () => {
    const closed = undersideArea(buildVase(shade));
    for (const spokes of [2, 3, 4, 6]) {
      const mesh = buildVase({ ...shade, lampSpokes: spokes });
      expect(openEdges(mesh), `${spokes} spokes`).toBe(0);
      // The hole and one opening per spoke.
      expect(mesh.floor.drains, `${spokes} spokes`).toHaveLength(1 + spokes);
      // Most of the plate is gone; more spokes leave more of it.
      const area = undersideArea(mesh);
      expect(area).toBeLessThan(closed * 0.45);
      expect(area).toBeGreaterThan(closed * 0.1);
    }
    expect(undersideArea(buildVase({ ...shade, lampSpokes: 6 }))).toBeGreaterThan(undersideArea(buildVase({ ...shade, lampSpokes: 2 })));
    // Wider spokes and a wider ring leave more plate.
    expect(undersideArea(buildVase({ ...shade, lampSpokes: 3, lampSpokeWidth: 14 }))).toBeGreaterThan(undersideArea(buildVase({ ...shade, lampSpokes: 3 })));
    expect(undersideArea(buildVase({ ...shade, lampSpokes: 3, lampRing: 20 }))).toBeGreaterThan(undersideArea(buildVase({ ...shade, lampSpokes: 3 })));
  }, 60000);

  it("follows a cross-section with corners, a standing lamp's hollow foot and a socket of one's own size", () => {
    expect(openEdges(buildVase({ ...shade, lampSpokes: 4, section: "vieleck", polySides: 6 }))).toBe(0);
    expect(openEdges(buildVase({ ...shade, lampSpokes: 3, lamp: "stehend", footHeight: 12 }))).toBe(0);
    const own = buildVase({ ...shade, lampSpokes: 3, lampSocket: "eigen", lampHole: 30 });
    expect(openEdges(own)).toBe(0);
    expect(own.floor.drains[0].r).toBeCloseTo(15);
  }, 60000);

  it("stays a closed plate, and says so, where there is no room for spokes or the bottom carries recesses", () => {
    // A dome's top is not much wider than the socket; with a broad ring round it nothing is left to open.
    const narrow = buildVase({ ...shade, profile: "schirmKuppel", lampSpokes: 3, lampRing: 18 });
    expect(openEdges(narrow)).toBe(0);
    expect(narrow.floor.drains).toHaveLength(1);
    expect(narrow.notes.some((note: string) => note.startsWith("Für 3 Streben ist zwischen Fassungsring und Wand zu wenig Platz"))).toBe(true);
    const feet = buildVase({ ...shade, lampSpokes: 3, rubberFeet: 3 });
    expect(openEdges(feet)).toBe(0);
    expect(feet.floor.drains).toHaveLength(1);
    expect(feet.notes.some((note: string) => note.startsWith("Mit Buchsen oder Mulden im Boden bleibt die Platte"))).toBe(true);
    // Both notes are said in the editor's language.
    const shown = [...narrow.notes, ...feet.notes].map((note: string) => vaseNote(note));
    expect(shown).toContain("There is too little room between the socket ring and the wall for 3 spokes – the plate stays closed.");
    expect(shown).toContain("With sockets or recesses in the bottom the plate round the socket stays closed (no spokes).");
  }, 60000);

  it("keeps the count of spokes whole and never one alone", () => {
    expect(normalizeParams({ lampSpokes: 1 }).lampSpokes).toBe(2);
    expect(normalizeParams({ lampSpokes: 3.4 }).lampSpokes).toBe(3);
    expect(normalizeParams({ lampSpokes: 40 }).lampSpokes).toBe(6);
    expect(normalizeParams({ lampSpokes: -2 }).lampSpokes).toBe(0);
    expect(normalizeParams({ lampRing: 1, lampSpokeWidth: 99 })).toMatchObject({ lampRing: 3, lampSpokeWidth: 30 });
  });
});

describe("what a vase is for", () => {
  it("is a vase, a plant pot or a lampshade; anything else is a vase", () => {
    expect(Object.keys(PURPOSES)).toEqual(["vase", "topf", "lampe"]);
    expect(normalizeParams({}).purpose).toBe("vase");
    expect(normalizeParams({ purpose: "lampe" }).purpose).toBe("lampe");
    expect(normalizeParams({ purpose: "topf" }).purpose).toBe("topf");
    expect(normalizeParams({ purpose: "eimer" }).purpose).toBe("vase");
  });

  it("has body shapes of its own, and a lampshade's lean out by 45 degrees at most at the size it comes with", () => {
    for (const name of ["schirmKegel", "schirmGlocke", "schirmKuppel", "schirmLaterne", "schirmTrommel", "topfKlassik", "topfKuebel", "topfSchale"]) {
      expect(PROFILES[name], name).toBeDefined();
      expect(normalizeParams({ profile: name }).profile).toBe(name);
    }
    // 180 mm wide, 160 mm high: the wall may go out by as much as it rises.
    for (const name of ["schirmKegel", "schirmGlocke", "schirmKuppel", "schirmLaterne", "schirmTrommel"]) {
      const radius = profileFunction(PROFILES[name].points);
      let steepest = 0;
      for (let k = 1; k <= 200; k += 1) steepest = Math.max(steepest, ((radius(k / 200) - radius((k - 1) / 200)) * 90) / (160 / 200));
      expect(steepest, name).toBeLessThanOrEqual(1.001);
    }
  });
});

describe("a plant pot and a lampshade in the shape library", () => {
  it("are vases with that use, in the size and with the settings the use starts with", async () => {
    const { libraryShapeAssets, makeShapeFromAsset, planterAsset, lampshadeAsset, shapeAssetLabel } = await import("@/lib/shapeCatalog");
    const ids = libraryShapeAssets.map((asset) => asset.id);
    // Right after the vase.
    expect(ids.slice(ids.indexOf("vase"), ids.indexOf("vase") + 3)).toEqual(["vase", "planter", "lampshade"]);
    expect(shapeAssetLabel(planterAsset)).toBe("Plant pot");
    expect(shapeAssetLabel(lampshadeAsset)).toBe("Lampshade");
    const pot = makeShapeFromAsset(planterAsset, { x: 0, z: 0 });
    expect(pot.kind).toBe("vase");
    expect(pot.vase).toMatchObject({ purpose: "topf", body: "hohl", profile: "topfKlassik", drainHoles: 3, saucerMode: "schale" });
    expect([pot.width, pot.height]).toEqual([140, 120]);
    const shade = makeShapeFromAsset(lampshadeAsset, { x: 0, z: 0 });
    expect(shade.kind).toBe("vase");
    expect(shade.vase).toMatchObject({ purpose: "lampe", body: "hohl", profile: "schirmKegel", lamp: "haengend", lampSpokes: 3, wall: 1.2 });
    expect([shade.width, shade.height]).toEqual([180, 160]);
    // The vase itself comes as it always did.
    const vase = makeShapeFromAsset(libraryShapeAssets.find((asset) => asset.id === "vase")!, { x: 0, z: 0 });
    expect(vase.vase).toMatchObject({ purpose: "vase", body: "voll", profile: "flasche", lamp: "keine" });
    expect([vase.width, vase.height]).toEqual([90, 180]);
  });
});

describe("the bulb a lampshade is checked against", () => {
  const notesOf = (over: Record<string, unknown>) => buildVase({ height: 160, diameter: 180, profile: "schirmTrommel", body: "hohl", wall: 1.2, lamp: "haengend", quality: "entwurf", ...over }).notes as string[];
  const bulb = (notes: string[]) => notes.filter((note) => note.startsWith("Die Birne"));

  it("is not checked unless asked, and has room in a wide shade", () => {
    expect(bulb(notesOf({}))).toEqual([]);
    expect(bulb(notesOf({ lampBulb: "a60" }))).toEqual([]);
    expect(normalizeParams({ lampBulb: "g95" })).toMatchObject({ lampBulbDiameter: 95, lampBulbLength: 140 });
    expect(normalizeParams({ lampBulb: "eigen", lampBulbDiameter: 70, lampBulbLength: 120 })).toMatchObject({ lampBulbDiameter: 70, lampBulbLength: 120 });
    expect(normalizeParams({ lampBulb: "riesig" }).lampBulb).toBe("keine");
  });

  it("says when the bulb comes too near the wall, does not fit, or reaches out of the shade", () => {
    // A globe of 125 mm in a shade 150 mm wide: a good 10 mm of room each side.
    const near = bulb(notesOf({ diameter: 150, height: 200, lampBulb: "g125" }));
    expect(near).toHaveLength(1);
    expect(near[0]).toMatch(/^Die Birne \(Ø 125 mm\) kommt der Wand bis auf \d+ mm nahe/);
    // In a shade 110 mm wide it does not fit.
    const tight = bulb(notesOf({ diameter: 110, height: 200, lampBulb: "g125" }));
    expect(tight.some((note) => note.startsWith("Die Birne (Ø 125 mm) passt nicht in den Schirm"))).toBe(true);
    // A short shade: the bulb (148 mm of glass below the socket) looks out of it.
    const short = bulb(notesOf({ height: 80, lampBulb: "g125" }));
    expect(short.some((note) => /^Die Birne ragt etwa \d+ mm aus dem Schirm heraus/.test(note))).toBe(true);
    // The notes are said in the editor's language.
    expect(vaseNote(near[0])).toMatch(/^The bulb \(Ø 125 mm\) comes as near as \d+ mm to the wall/);
    expect(vaseNote(tight.find((note) => note.includes("passt nicht"))!)).toMatch(/^The bulb \(Ø 125 mm\) does not fit into the shade – \d+ mm are missing/);
    expect(vaseNote(short.find((note) => note.includes("ragt"))!)).toMatch(/^The bulb reaches about \d+ mm out of the shade/);
  });

  it("is for a shade with a socket: not over an LED disc or a puck, but in a base with a screw socket", () => {
    expect(bulb(notesOf({ lamp: "puck", diameter: 110, lampBulb: "g125" }))).toEqual([]);
    expect(bulb(notesOf({ lamp: "sockel", diameter: 110, lampBulb: "g125" }))).toEqual([]);
    expect(bulb(notesOf({ lamp: "sockel", lampBaseLight: "fassung", diameter: 110, lampBulb: "g125" })).length).toBeGreaterThan(0);
    // A socket that stands in the shade lifts the bulb: sooner out of a shade than one that hangs.
    expect(bulb(notesOf({ height: 150, lampBulb: "a60" }))).toEqual([]);
    expect(bulb(notesOf({ height: 120, lamp: "stehend", lampBulb: "a60" })).some((note) => note.includes("ragt"))).toBe(true);
  });
});
