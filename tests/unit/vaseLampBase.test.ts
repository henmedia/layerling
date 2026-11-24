import { describe, expect, it } from "vitest";
import { LAMP_BASES, LAMP_BASE_LIGHTS, buildVase, normalizeParams } from "@/lib/vase/vase-geometry.mjs";
import { buildParts } from "@/lib/vase/vase-parts.mjs";
import { vaseAccessories } from "@/lib/vaseShape";

/*
 * The base a lampshade stands on (lamp "sockel"): a part of its own with a sloped seat for the shade, the light in
 * its middle - an LED disc laid in from above or a screw socket - and a slot for the cable at the back of its foot.
 */

type Mesh = { vertices: Float64Array; indices: Uint32Array };

/** Every edge walked once each way: the body is closed and oriented. */
function openEdges(mesh: Mesh) {
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

/** The steepest face of the wall when the base is printed turned over, in degrees from upright. */
function steepestWall(mesh: Mesh) {
  let worst = 0;
  const v = mesh.vertices;
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const [a, b, c] = [mesh.indices[t] * 3, mesh.indices[t + 1] * 3, mesh.indices[t + 2] * 3];
    const ux = v[b] - v[a], uy = v[b + 1] - v[a + 1], uz = v[b + 2] - v[a + 2], wx = v[c] - v[a], wy = v[c + 1] - v[a + 1], wz = v[c + 2] - v[a + 2];
    const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const length = Math.hypot(nx, ny, nz);
    if (length < 1e-9 || nz <= 0 || Math.max(v[a + 2], v[b + 2], v[c + 2]) > -2.4) continue;
    worst = Math.max(worst, (Math.asin(Math.min(1, nz / length)) * 180) / Math.PI);
  }
  return worst;
}

/** The radii of the base's points in a band of height, least and most. */
function radii(mesh: Mesh, from: number, to: number) {
  let least = Infinity, most = 0;
  for (let i = 0; i < mesh.vertices.length; i += 3) {
    if (mesh.vertices[i + 2] < from || mesh.vertices[i + 2] > to) continue;
    const r = Math.hypot(mesh.vertices[i], mesh.vertices[i + 1]);
    least = Math.min(least, r);
    most = Math.max(most, r);
  }
  return { least, most };
}

const shade = { height: 160, diameter: 140, profile: "zylinder", body: "hohl", wall: 1.2, lamp: "sockel" };
const baseOf = (over: Record<string, unknown> = {}) => {
  const built = buildParts(normalizeParams({ ...shade, ...over }));
  return { ...built, base: built.parts.find((part: { id: string }) => part.id === "sockel") as { mesh: Mesh; flip: boolean; info: string } | undefined };
};

describe("the base a lampshade stands on", () => {
  it("is a part of its own in six forms, closed, printed turned over, under a shade without a bottom", () => {
    expect(Object.keys(LAMP_BASES)).toEqual(["bauch", "zylinder", "kegel", "kelch", "glocke", "stufe"]);
    expect(Object.keys(LAMP_BASE_LIGHTS)).toEqual(["scheibe", "fassung"]);
    for (const form of Object.keys(LAMP_BASES)) {
      const { base, lift } = baseOf({ lampBaseShape: form });
      expect(base, form).toBeDefined();
      expect(openEdges(base!.mesh), form).toBe(0);
      expect(base!.flip, form).toBe(true);
      // The shade is lifted onto the base: by the base's height and the seat's drop.
      expect(lift, form).toBeGreaterThan(45);
    }
    // The shade itself is open below, and has no hole or plate of its own.
    const body = buildVase({ ...shade, quality: "entwurf" });
    expect(openEdges(body)).toBe(0);
    expect(body.floor.thickness).toBe(0);
    expect(body.floor.drains).toHaveLength(0);
    // No base for another kind of lamp.
    expect(baseOf({ lamp: "puck" }).base).toBeUndefined();
    expect(baseOf({ lamp: "keine" }).base).toBeUndefined();
  }, 60000);

  it("carries a shade printed in the slicer's vase mode as well: one line of wall, open below once printed", () => {
    // The solid body the vase mode asks for: no hole, no plate - and a note on the bottom layers.
    const body = buildVase({ ...shade, body: "voll", quality: "entwurf" });
    expect(openEdges(body)).toBe(0);
    expect(body.notes.some((note: string) => note.startsWith("Lampenschirm im Vasenmodus: im Slicer 0 Bodenschichten"))).toBe(true);
    expect(body.notes.some((note: string) => note.startsWith("Ein Lampenschirm braucht eine hohle Vase"))).toBe(false);
    // The seat fits the shade's one line of wall (0.45 mm), not the 1.2 mm of a real wall.
    const thin = baseOf({ body: "voll", lineWidth: 0.45 }).base!;
    expect(openEdges(thin.mesh)).toBe(0);
    const real = baseOf().base!;
    expect(radii(thin.mesh, 1.4, 1.6).most).toBeCloseTo(radii(real.mesh, 1.4, 1.6).most + 0.75, 2);
    // A shade with a plate of its own needs a real wall, and says so.
    const hanging = buildVase({ ...shade, body: "voll", lamp: "haengend", quality: "entwurf" });
    expect(hanging.notes.some((note: string) => note.startsWith("Ein Lampenschirm braucht eine hohle Vase"))).toBe(true);
  }, 60000);

  it("centres the shade on a sloped seat: narrower than the shade inside at the top, wider below", () => {
    const { base } = baseOf();
    // The shade is 140 mm across with a wall of 1.2 mm: 68.8 mm inside.
    expect(radii(base!.mesh, 1.4, 1.6).most).toBeLessThan(68.8);
    expect(radii(base!.mesh, 1.4, 1.6).most).toBeGreaterThan(66);
    expect(radii(base!.mesh, -2.6, -2.4).most).toBeGreaterThan(68.8);
  });

  it("holds an LED disc in a seat of its size, or a screw socket in its hole", () => {
    const disc = baseOf().base!;
    // The disc's hole at the top: the disc's 59 mm and a little play.
    expect(radii(disc.mesh, 1.4, 1.6).least).toBeCloseTo(29.8, 1);
    // Under the disc (8 mm high) a lip reaches in, for the disc to rest on; the middle stays open for the cable.
    const lip = radii(disc.mesh, -11, -9.5).least;
    expect(lip).toBeLessThan(27);
    expect(lip).toBeGreaterThan(20);
    expect(disc.info).toContain("LED-Scheibe Ø 59 mm");
    const larger = baseOf({ lampDisc: 80, lampDiscHeight: 12 }).base!;
    expect(radii(larger.mesh, 1.4, 1.6).least).toBeCloseTo(40.3, 1);
    const socket = baseOf({ lampBaseLight: "fassung" }).base!;
    expect(openEdges(socket.mesh)).toBe(0);
    // The plate round the E27 hole, 3 mm thick, and nothing below it but the wall.
    expect(radii(socket.mesh, 1.4, 1.6).least).toBeCloseTo(20.5, 1);
    expect(radii(socket.mesh, -20, -5).least).toBeGreaterThan(40);
    expect(socket.info).toContain("Fassung im Loch Ø 41 mm");
    expect(radii(baseOf({ lampBaseLight: "fassung", lampSocket: "e14" }).base!.mesh, 1.4, 1.6).least).toBeCloseTo(14.5, 1);
  });

  it("is as wide as asked, bellied or flared, but never flatter than it prints; and has fine grooves if asked", () => {
    for (const form of Object.keys(LAMP_BASES)) {
      for (const width of [60, 100, 160]) {
        const { base } = baseOf({ lampBaseShape: form, lampBaseWidth: width, lampNotch: 0 });
        expect(openEdges(base!.mesh), `${form} ${width}`).toBe(0);
        expect(steepestWall(base!.mesh), `${form} ${width}`).toBeLessThanOrEqual(46);
      }
    }
    // A foot wider than the height allows is held back, and the notes say so.
    const wide = baseOf({ lampBaseShape: "kegel", lampBaseWidth: 160, lampBaseHeight: 30 });
    expect(wide.notes.some((note: string) => note.startsWith("Sockel auf Ø"))).toBe(true);
    // A belly is widest half way down; a goblet drawn in is narrowest on the table.
    const belly = baseOf({ lampBaseShape: "bauch", lampNotch: 0 }).base!;
    expect(radii(belly.mesh, -26, -24).most).toBeGreaterThan(radii(belly.mesh, -47.6, -47.4).most + 4);
    const goblet = baseOf({ lampBaseShape: "kelch", lampBaseWidth: 60, lampBaseHeight: 70, lampNotch: 0 }).base!;
    expect(radii(goblet.mesh, -72.6, -72.4).most).toBeLessThan(55);
    // Grooves: the wall's outline goes in and out round the base, the seat stays a plain ring.
    const plain = baseOf({ lampBaseShape: "zylinder", lampNotch: 0 }).base!;
    const grooved = baseOf({ lampBaseShape: "zylinder", lampNotch: 0, lampBaseRibs: 48 }).base!;
    expect(openEdges(grooved.mesh)).toBe(0);
    const outline = (mesh: Mesh) => {
      let least = Infinity, most = 0;
      for (let i = 0; i < mesh.vertices.length; i += 3) {
        if (Math.abs(mesh.vertices[i + 2] + 30) > 1) continue;
        const r = Math.hypot(mesh.vertices[i], mesh.vertices[i + 1]);
        if (r < 60) continue;
        least = Math.min(least, r);
        most = Math.max(most, r);
      }
      return most - least;
    };
    expect(outline(grooved.mesh)).toBeGreaterThan(outline(plain.mesh) + 0.6);
    expect(radii(grooved.mesh, 1.4, 1.6).most).toBeCloseTo(radii(plain.mesh, 1.4, 1.6).most, 6);
  }, 120000);

  it("lets the cable out through a slot at the back of the foot, and nowhere else", () => {
    const { base } = baseOf({ lampBaseShape: "zylinder", lampNotch: 10, lampNotchHeight: 8 });
    // The table is at -47.5: at the back (+y) the wall's lower edge is lifted, at the front it stands on the table.
    let back = Infinity, front = Infinity;
    for (let i = 0; i < base!.mesh.vertices.length; i += 3) {
      const [x, y, z] = [base!.mesh.vertices[i], base!.mesh.vertices[i + 1], base!.mesh.vertices[i + 2]];
      if (Math.hypot(x, y) < 60) continue;
      if (Math.abs(x) < 1.5 && y > 0) back = Math.min(back, z);
      if (Math.abs(x) < 1.5 && y < 0) front = Math.min(front, z);
    }
    expect(front).toBeCloseTo(-47.5, 1);
    expect(back).toBeGreaterThan(front + 7);
    // Without a slot the foot stands on the table all round.
    const whole = baseOf({ lampBaseShape: "zylinder", lampNotch: 0 }).base!;
    expect(radii(whole.mesh, -47.6, -47.4).most).toBeGreaterThan(60);
  });

  it("is not built where the light does not fit into the shade, and raises itself for a tall LED disc", () => {
    const small = baseOf({ diameter: 60 });
    expect(small.base).toBeUndefined();
    expect(small.notes.some((note: string) => note.startsWith("Der Lampensockel ließ sich nicht bauen: die LED-Scheibe (Ø 59 mm) passt nicht in den Schirm"))).toBe(true);
    const tall = baseOf({ lampDiscHeight: 18, lampBaseHeight: 20 });
    expect(tall.base).toBeDefined();
    expect(tall.notes.some((note: string) => note.startsWith("Sockel auf 28,4 mm erhöht"))).toBe(true);
    // The lampshade forms take the common disc at the size a shade comes with.
    for (const form of ["schirmKegel", "schirmGlocke", "schirmKuppel", "schirmLaterne", "schirmTrommel"]) expect(baseOf({ profile: form, diameter: 180 }).base, form).toBeDefined();
  });

  it("is laid out beside the shade as an accessory of the vase", () => {
    const vase = normalizeParams({ ...shade, quality: "entwurf" });
    const accessories = vaseAccessories({ width: 140, depth: 140, height: 160, vase });
    expect(accessories.map((accessory) => accessory.kind)).toEqual(["lampBase"]);
    expect(accessories[0].positions.length).toBeGreaterThan(9000);
  }, 60000);
});
