import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import { lidForSolid, normalizeLidOptions } from "@/lib/lidTool";

type Solid = { delete?: () => void };

function dispose(values: Solid[]) {
  Array.from(new Set(values)).forEach((value) => value?.delete?.());
}

async function runtime() {
  const manifold = await Module();
  manifold.setup();
  return manifold;
}

type Kernel = Awaited<ReturnType<typeof runtime>>;
type Body = ReturnType<Kernel["Manifold"]["cube"]>;

/**
 * A box `width` wide (x), 30 high (y, the scene's up) and `depth` deep (z), with walls and floor `wall` thick, open at the
 * top; its back is -z, its front +z. 60 x 40 with 2 mm walls to begin with.
 */
function openBox(kernel: Kernel, created: Solid[], width = 60, depth = 40, wall = 2) {
  const outer = kernel.Manifold.cube([width, 30, depth], true).translate([0, 15, 0]);
  const inner = kernel.Manifold.cube([width - 2 * wall, 30, depth - 2 * wall], true).translate([0, 15 + wall, 0]);
  const body = outer.subtract(inner);
  created.push(outer, inner, body);
  return body;
}

/** A round pot 40 across, 30 high, with a 2 mm wall and floor, open at the top. */
function openPot(kernel: Kernel, created: Solid[]) {
  const outer = kernel.Manifold.cylinder(30, 20, 20, 96).rotate([-90, 0, 0]);
  const cavity = kernel.Manifold.cylinder(30, 18, 18, 96).rotate([-90, 0, 0]).translate([0, 2, 0]);
  const pot = outer.subtract(cavity);
  created.push(outer, cavity, pot);
  return pot;
}

/**
 * The lid turned back over and set on the body as it closes it: its plate on the rim (y = top), centred over the body
 * (nothing of these lids stands out on one side only).
 */
function closing(body: Body, lid: Body, thickness: number, created: Solid[]) {
  const turned = lid.rotate([180, 0, 0]);
  const bodyBox = body.boundingBox();
  const box = turned.boundingBox();
  const placed = turned.translate([
    (bodyBox.min[0] + bodyBox.max[0]) / 2 - (box.min[0] + box.max[0]) / 2,
    bodyBox.max[1] + thickness - box.max[1],
    (bodyBox.min[2] + bodyBox.max[2]) / 2 - (box.min[2] + box.max[2]) / 2,
  ]);
  created.push(turned, placed);
  return placed;
}

/** A hinged lid closed on its body: its plate on the rim, flush with the body's sides and front (its knuckles stand out at the back). */
function closingHinged(body: Body, lid: Body, thickness: number, created: Solid[]) {
  const turned = lid.rotate([180, 0, 0]);
  const bodyBox = body.boundingBox();
  const box = turned.boundingBox();
  const placed = turned.translate([bodyBox.min[0] - box.min[0], bodyBox.max[1] + thickness - box.max[1], bodyBox.max[2] - box.max[2]]);
  created.push(turned, placed);
  return placed;
}

/** Whether a tiny cube at (x, y, z) lies in the solid. */
function solidAt(kernel: Kernel, solid: Body, [x, y, z]: readonly [number, number, number], created: Solid[]) {
  const probe = kernel.Manifold.cube([0.1, 0.1, 0.1], true).translate([x, y, z]);
  const hit = solid.intersect(probe);
  created.push(probe, hit);
  return hit.volume() > 0.0005;
}

const PLUG = { type: "plug", thickness: 2, gap: 0.2, depth: 4, wall: 1.6 };
/** Halfway down the 4 mm lip, under the rim at 30: where the bumps' middles are. */
const MIDDLE = 30 - 2;

describe("click bumps that snap the lid in (real Manifold kernel, #1234)", () => {
  it("are off unless asked for", () => {
    expect(normalizeLidOptions().clickBumps).toBe(false);
    expect(normalizeLidOptions({ clickBumps: "true" }).clickBumps).toBe(true);
  });

  it("stand out of the middle of each side of a box's lip into the wall, which has a dimple there, and the closed lid overlaps nothing", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions({ ...PLUG, clickBumps: true }));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      expect(result.clickBumps).toBeDefined();
      const { count, dimples } = result.clickBumps!;
      created.push(result.lid, dimples);
      expect(count).toBe(4);
      expect(result.lid.status()).toBe("NoError");
      expect(dimples.status()).toBe("NoError");
      const closed = closing(body, result.lid, 2, created);
      expect(closed.decompose().length).toBe(1);
      const cut = body.subtract(dimples);
      created.push(cut);
      // The inner faces of the walls are at x = ±28 and z = ±18, the lip's outer faces 0.2 mm inside them. A bump stands
      // 0.6 mm out of the lip: 0.4 mm into the wall, where the body has its dimple, 0.5 mm deep.
      const sides: [number, number, number][] = [[0, MIDDLE, 18.2], [0, MIDDLE, -18.2], [28.2, MIDDLE, 0], [-28.2, MIDDLE, 0]];
      for (const at of sides) {
        expect(solidAt(kernel, closed, at, created), `bump at ${at}`).toBe(true);
        expect(solidAt(kernel, body, at, created)).toBe(true);
        expect(solidAt(kernel, cut, at, created), `dimple at ${at}`).toBe(false);
      }
      // Beyond the bump's reach, the dimple's: 0.5 mm into the wall, and the rest of the wall stays.
      expect(solidAt(kernel, cut, [0, MIDDLE, 18.45], created)).toBe(false);
      expect(solidAt(kernel, cut, [0, MIDDLE, 18.6], created)).toBe(true);
      expect(solidAt(kernel, closed, [0, MIDDLE, 18.5], created)).toBe(false);
      // Only there: along the side, past the bump, the lip keeps its gap.
      expect(solidAt(kernel, closed, [8, MIDDLE, 17.9], created)).toBe(false);
      expect(solidAt(kernel, cut, [8, MIDDLE, 18.2], created)).toBe(true);
      // The bumps reach into the wall: four caps of a 1.5 mm ball, 0.4 mm high, about 0.69 mm³ each.
      const into = closed.intersect(body);
      created.push(into);
      expect(into.volume()).toBeGreaterThan(4 * 0.6);
      expect(into.volume()).toBeLessThan(4 * 0.75);
      // With the dimples cut out of the body, the closed lid overlaps nothing.
      const overlap = closed.intersect(cut);
      created.push(overlap);
      expect(overlap.volume()).toBeLessThan(0.01);
      // Nothing of a bump pokes into the lid's inside or stands out of the plate.
      const plain = lidForSolid(kernel, body, normalizeLidOptions(PLUG));
      if ("error" in plain) throw new Error(JSON.stringify(plain.error));
      created.push(plain.lid);
      expect(result.lid.boundingBox()).toEqual(plain.lid.boundingBox());
      const added = result.lid.subtract(plain.lid);
      const pieces = added.decompose();
      created.push(added, ...pieces);
      // Four caps of the ball, 0.6 mm high beyond the lip's face, and nothing else.
      expect(pieces.length).toBe(4);
      for (const piece of pieces) expect(piece.volume()).toBeCloseTo(1.41, 1);
    } finally {
      dispose(created);
    }
  });

  it("puts two on a side longer than 80 mm, at a quarter and three quarters", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created, 100, 40);
      const result = lidForSolid(kernel, body, normalizeLidOptions({ ...PLUG, clickBumps: true }));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      created.push(result.lid, result.clickBumps!.dimples);
      // Front and back 95.6 mm along the lip: two each; the sides 35.6 mm: one each.
      expect(result.clickBumps!.count).toBe(6);
      const closed = closing(body, result.lid, 2, created);
      for (const x of [-23.9, 23.9]) {
        expect(solidAt(kernel, closed, [x, MIDDLE, 18.2], created)).toBe(true);
        expect(solidAt(kernel, closed, [x, MIDDLE, -18.2], created)).toBe(true);
      }
      expect(solidAt(kernel, closed, [0, MIDDLE, 18.2], created)).toBe(false);
      const cut = body.subtract(result.clickBumps!.dimples);
      const overlap = closed.intersect(cut);
      created.push(cut, overlap);
      expect(overlap.volume()).toBeLessThan(0.01);
    } finally {
      dispose(created);
    }
  });

  it("puts four evenly round a round pot, front, back and sides", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const pot = openPot(kernel, created);
      const result = lidForSolid(kernel, pot, normalizeLidOptions({ ...PLUG, clickBumps: true }));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      created.push(result.lid, result.clickBumps!.dimples);
      expect(result.clickBumps!.count).toBe(4);
      const closed = closing(pot, result.lid, 2, created);
      const cut = pot.subtract(result.clickBumps!.dimples);
      created.push(cut);
      for (const at of [[0, MIDDLE, 18.2], [0, MIDDLE, -18.2], [18.2, MIDDLE, 0], [-18.2, MIDDLE, 0]] as [number, number, number][]) {
        expect(solidAt(kernel, closed, at, created), `bump at ${at}`).toBe(true);
        expect(solidAt(kernel, cut, at, created), `dimple at ${at}`).toBe(false);
      }
      const overlap = closed.intersect(cut);
      created.push(overlap);
      expect(overlap.volume()).toBeLessThan(0.01);
    } finally {
      dispose(created);
    }
  });

  it("keep a wall between two parts of the opening whole, with dimples from both sides only where it is thick enough", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      for (const [thickness, count] of [[1, 6], [1.6, 8]] as const) {
        const divider = kernel.Manifold.cube([thickness, 30, 40], true).translate([0, 15, 0]);
        const body = openBox(kernel, created).add(divider);
        created.push(divider, body);
        const result = lidForSolid(kernel, body, normalizeLidOptions({ ...PLUG, clickBumps: true }));
        if ("error" in result) throw new Error(JSON.stringify(result.error));
        created.push(result.lid, result.clickBumps!.dimples);
        // Each part gets one at its front, back and outer side; a 1.6 mm wall between them one from each side too.
        expect(result.clickBumps!.count, `wall ${thickness}`).toBe(count);
        const cut = body.subtract(result.clickBumps!.dimples);
        created.push(cut);
        expect(cut.decompose().length).toBe(1);
        // The middle of the wall between them stays: with dimples from both sides, the 0.6 mm between them.
        for (const x of [-0.2, 0, 0.2]) expect(solidAt(kernel, cut, [x, MIDDLE, 0], created), `wall ${thickness} at ${x}`).toBe(true);
        const closed = closing(body, result.lid, 2, created);
        const overlap = closed.intersect(cut);
        created.push(overlap);
        expect(overlap.volume()).toBeLessThan(0.01);
      }
    } finally {
      dispose(created);
    }
  });

  it("on a lid over the top, stand out of the rim's inner face into the body's outer wall", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions({ ...PLUG, type: "cap", clickBumps: true }));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      created.push(result.lid, result.clickBumps!.dimples);
      expect(result.clickBumps!.count).toBe(4);
      const closed = closing(body, result.lid, 2, created);
      const cut = body.subtract(result.clickBumps!.dimples);
      created.push(cut);
      // The outer faces at x = ±30 and z = ±20, the rim's inner face 0.2 mm outside them: bumps 0.4 mm into the wall.
      for (const at of [[0, MIDDLE, 19.8], [0, MIDDLE, -19.8], [29.8, MIDDLE, 0], [-29.8, MIDDLE, 0]] as [number, number, number][]) {
        expect(solidAt(kernel, closed, at, created), `bump at ${at}`).toBe(true);
        expect(solidAt(kernel, cut, at, created), `dimple at ${at}`).toBe(false);
      }
      // The dimple is 0.5 mm deep; the rest of the wall stays.
      expect(solidAt(kernel, cut, [0, MIDDLE, 19.4], created)).toBe(true);
      const overlap = closed.intersect(cut);
      created.push(overlap);
      expect(overlap.volume()).toBeLessThan(0.01);
      // Nothing stands out of the rim's outside.
      const plain = lidForSolid(kernel, body, normalizeLidOptions({ ...PLUG, type: "cap" }));
      if ("error" in plain) throw new Error(JSON.stringify(plain.error));
      created.push(plain.lid);
      expect(result.lid.boundingBox()).toEqual(plain.lid.boundingBox());
    } finally {
      dispose(created);
    }
  });

  it("reach as far into the wall as asked, 0.2 to 0.8 mm, and the dimples follow, 0.1 mm deeper (#1220)", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      expect(normalizeLidOptions({ clickBumps: true }).clickBumpHeight).toBe(0.4);
      const body = openBox(kernel, created);
      const plain = lidForSolid(kernel, body, normalizeLidOptions(PLUG));
      if ("error" in plain) throw new Error(JSON.stringify(plain.error));
      created.push(plain.lid);
      let before = 0;
      for (const height of [0.2, 0.4, 0.6, 0.8]) {
        const result = lidForSolid(kernel, body, normalizeLidOptions({ ...PLUG, clickBumps: true, clickBumpHeight: height }));
        if ("error" in result) throw new Error(JSON.stringify(result.error));
        created.push(result.lid, result.clickBumps!.dimples);
        expect(result.clickBumps!.count).toBe(4);
        // Each bump stands out of the lip's face across the 0.2 mm gap and as far again as asked.
        const added = result.lid.subtract(plain.lid);
        const pieces = added.decompose();
        created.push(added, ...pieces);
        expect(pieces.length).toBe(4);
        for (const piece of pieces) {
          const { min, max } = piece.boundingBox();
          expect(Math.min(max[0] - min[0], max[2] - min[2]), `height ${height}`).toBeCloseTo(0.2 + height, 2);
        }
        // Closed, the front one reaches that far into the front wall (its inner face at z = 18), its dimple 0.1 mm further.
        const closed = closing(body, result.lid, 2, created);
        const cut = body.subtract(result.clickBumps!.dimples);
        created.push(cut);
        expect(solidAt(kernel, closed, [0, MIDDLE, 18 + height - 0.07], created), `bump, height ${height}`).toBe(true);
        expect(solidAt(kernel, closed, [0, MIDDLE, 18 + height + 0.07], created), `bump, height ${height}`).toBe(false);
        expect(solidAt(kernel, cut, [0, MIDDLE, 18 + height + 0.05], created), `dimple, height ${height}`).toBe(false);
        expect(solidAt(kernel, cut, [0, MIDDLE, 18 + height + 0.16], created), `dimple, height ${height}`).toBe(true);
        // The bumps sit in their dimples, and the higher they are, the more of them is in the wall.
        const overlap = closed.intersect(cut);
        const into = closed.intersect(body);
        created.push(overlap, into);
        expect(overlap.volume(), `height ${height}`).toBeLessThan(0.01);
        expect(into.volume(), `height ${height}`).toBeGreaterThan(before);
        before = into.volume();
      }
    } finally {
      dispose(created);
    }
  });

  it("keep a thin wall's skin and a divider whole at the lowest and the highest bumps", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      // 1.2 mm walls and bumps of 0.8 mm: the dimple, 0.9 mm deep, would leave 0.3 mm; it stops at 0.4 mm of the wall,
      // and the bump the play short of it, 0.7 mm into the wall (its inner face at z = 18.8).
      const thin = openBox(kernel, created, 60, 40, 1.2);
      const high = lidForSolid(kernel, thin, normalizeLidOptions({ ...PLUG, clickBumps: true, clickBumpHeight: 0.8 }));
      if ("error" in high) throw new Error(JSON.stringify(high.error));
      created.push(high.lid, high.clickBumps!.dimples);
      const closed = closing(thin, high.lid, 2, created);
      const cut = thin.subtract(high.clickBumps!.dimples);
      const overlap = closed.intersect(cut);
      created.push(cut, overlap);
      expect(solidAt(kernel, closed, [0, MIDDLE, 19.45], created)).toBe(true);
      expect(solidAt(kernel, closed, [0, MIDDLE, 19.55], created)).toBe(false);
      expect(solidAt(kernel, cut, [0, MIDDLE, 19.55], created)).toBe(false);
      expect(solidAt(kernel, cut, [0, MIDDLE, 19.65], created)).toBe(true);
      expect(overlap.volume()).toBeLessThan(0.01);
      // A wall between two parts of the opening takes dimples from both sides where it keeps 0.4 mm between them: a
      // 1.2 mm one with bumps of 0.2 mm (0.3 mm deep dimples), not a 1.6 mm one with bumps of 0.8 mm (0.9 mm deep).
      for (const [thickness, height, count] of [[1.2, 0.2, 8], [1.2, 0.4, 6], [1.6, 0.4, 8], [1.6, 0.8, 6]] as const) {
        const divider = kernel.Manifold.cube([thickness, 30, 40], true).translate([0, 15, 0]);
        const parted = openBox(kernel, created).add(divider);
        created.push(divider, parted);
        const result = lidForSolid(kernel, parted, normalizeLidOptions({ ...PLUG, clickBumps: true, clickBumpHeight: height }));
        if ("error" in result) throw new Error(JSON.stringify(result.error));
        created.push(result.lid, result.clickBumps!.dimples);
        expect(result.clickBumps!.count, `wall ${thickness}, height ${height}`).toBe(count);
        const partedCut = parted.subtract(result.clickBumps!.dimples);
        const partedClosed = closing(parted, result.lid, 2, created);
        const partedOverlap = partedClosed.intersect(partedCut);
        created.push(partedCut, partedOverlap);
        expect(partedCut.decompose().length).toBe(1);
        expect(solidAt(kernel, partedCut, [0, MIDDLE, 0], created), `wall ${thickness}, height ${height}`).toBe(true);
        expect(partedOverlap.volume()).toBeLessThan(0.01);
      }
    } finally {
      dispose(created);
    }
  });

  it("leaves out the hinge's side, where the lid turns", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions({ ...PLUG, hinge: true, clickBumps: true }));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      created.push(result.lid, result.hinge!.knuckles, result.clickBumps!.dimples);
      expect(result.clickBumps!.count).toBe(3);
      const closed = closingHinged(body, result.lid, 2, created);
      expect(solidAt(kernel, closed, [0, MIDDLE, -18.2], created)).toBe(false);
      for (const at of [[0, MIDDLE, 18.2], [28.2, MIDDLE, 0], [-28.2, MIDDLE, 0]] as [number, number, number][]) {
        expect(solidAt(kernel, closed, at, created), `bump at ${at}`).toBe(true);
      }
      const whole = body.add(result.hinge!.knuckles).subtract(result.clickBumps!.dimples);
      const overlap = closed.intersect(whole);
      created.push(whole, overlap);
      expect(overlap.volume()).toBeLessThan(0.01);
      // A hinge on the right leaves out the right.
      const right = lidForSolid(kernel, body, normalizeLidOptions({ ...PLUG, hinge: true, hingeSide: "right", clickBumps: true }));
      if ("error" in right) throw new Error(JSON.stringify(right.error));
      created.push(right.lid, right.hinge!.knuckles, right.clickBumps!.dimples);
      expect(right.clickBumps!.count).toBe(3);
      const dimpleBox = right.clickBumps!.dimples.boundingBox();
      expect(dimpleBox.max[0]).toBeLessThan(10);
      expect(dimpleBox.min[0]).toBeLessThan(-27);
    } finally {
      dispose(created);
    }
  });

  it("are refused without a lip or a rim, and where there is no room left", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      expect(lidForSolid(kernel, body, normalizeLidOptions({ ...PLUG, type: "flat", clickBumps: true }))).toEqual({ error: { code: "clickBumpsNoLip" } });
      expect(lidForSolid(kernel, body, normalizeLidOptions({ ...PLUG, hinge: true, hingeStyle: "pivot", clickBumps: true }))).toEqual({ error: { code: "clickBumpsNoLip" } });
      // A small box: its sides 9.6 mm along the lip are too short, the back is the hinge's and the front the notch's.
      const small = openBox(kernel, created, 22, 14);
      expect(lidForSolid(kernel, small, normalizeLidOptions({ ...PLUG, hinge: true, clickBumps: true, handle: "notch" }))).toEqual({ error: { code: "clickBumpsNoRoom" } });
    } finally {
      dispose(created);
    }
  });
});

describe("a handle: a pull tab or a finger notch (real Manifold kernel, #1230)", () => {
  it("has none unless asked for, and knows the two", () => {
    expect(normalizeLidOptions().handle).toBe("none");
    expect(normalizeLidOptions({ handle: " Tab " }).handle).toBe("tab");
    expect(normalizeLidOptions({ handle: "notch" }).handle).toBe("notch");
    expect(normalizeLidOptions({ handle: "knob" }).handle).toBe("none");
  });

  it("puts a pull tab on the plate's front edge: 20 mm wide, 6 mm further out, as thick as the plate and one with it", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      const plain = lidForSolid(kernel, body, normalizeLidOptions(PLUG));
      const tabbed = lidForSolid(kernel, body, normalizeLidOptions({ ...PLUG, handle: "tab" }));
      if ("error" in plain || "error" in tabbed) throw new Error("no lid");
      created.push(plain.lid, tabbed.lid);
      expect(tabbed.handle).toEqual({ style: "tab", notch: null });
      expect(tabbed.lid.decompose().length).toBe(1);
      const plainBox = plain.lid.boundingBox();
      const box = tabbed.lid.boundingBox();
      // 6 mm further out along z (the front), as wide and as high as before: it lies in the plate, on the bed as printed.
      expect(box.max[2] - box.min[2]).toBeCloseTo(plainBox.max[2] - plainBox.min[2] + 6, 3);
      expect(box.max[0] - box.min[0]).toBeCloseTo(plainBox.max[0] - plainBox.min[0], 3);
      expect(box.min[1]).toBeCloseTo(0, 3);
      expect(box.max[1]).toBeCloseTo(plainBox.max[1], 3);
      // Closed on the box: lined up with the plain lid at the back, the tab is all there is more, in front of the box.
      const closedPlain = closing(body, plain.lid, 2, created);
      const turned = tabbed.lid.rotate([180, 0, 0]);
      const turnedBox = turned.boundingBox();
      const closed = turned.translate([-30 - turnedBox.min[0], 32 - turnedBox.max[1], -20 - turnedBox.min[2]]);
      created.push(turned, closed);
      const tab = closed.subtract(closedPlain);
      const lost = closedPlain.subtract(closed);
      created.push(tab, lost);
      expect(lost.volume()).toBeLessThan(0.001);
      const tabBox = tab.boundingBox();
      expect(tabBox.min[2]).toBeCloseTo(20, 2);
      expect(tabBox.max[2]).toBeCloseTo(26, 2);
      expect(tabBox.max[0] - tabBox.min[0]).toBeCloseTo(20, 2);
      expect((tabBox.min[0] + tabBox.max[0]) / 2).toBeCloseTo(0, 2);
      // Within the plate's height (30 to 32), so the lid still prints turned over without support.
      expect(tabBox.min[1]).toBeCloseTo(30, 3);
      expect(tabBox.max[1]).toBeCloseTo(32, 3);
      // 20 x 6 mm with its two outer corners rounded by 3 mm: 2 mm thick.
      const area = 20 * 6 - 2 * (9 - (Math.PI * 9) / 4);
      expect(tab.volume()).toBeGreaterThan(2 * area * 0.99);
      expect(tab.volume()).toBeLessThan(2 * area * 1.01);
      expect(solidAt(kernel, closed, [9.5, 31, 22], created)).toBe(true);
      expect(solidAt(kernel, closed, [9.6, 31, 25.8], created)).toBe(false);
      // It touches nothing of the box.
      const overlap = closed.intersect(body);
      created.push(overlap);
      expect(overlap.volume()).toBeLessThan(0.01);
    } finally {
      dispose(created);
    }
  });

  it("puts the tab opposite the hinge, and on a lid over the top beyond its rim", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      // A hinge on the right: the tab goes on the left, so the lid grows along x and not along z.
      const plain = lidForSolid(kernel, body, normalizeLidOptions({ ...PLUG, hinge: true, hingeSide: "right" }));
      const tabbed = lidForSolid(kernel, body, normalizeLidOptions({ ...PLUG, hinge: true, hingeSide: "right", handle: "tab" }));
      if ("error" in plain || "error" in tabbed) throw new Error("no lid");
      created.push(plain.lid, plain.hinge!.knuckles, tabbed.lid, tabbed.hinge!.knuckles);
      const plainBox = plain.lid.boundingBox();
      const box = tabbed.lid.boundingBox();
      expect(box.max[0] - box.min[0]).toBeCloseTo(plainBox.max[0] - plainBox.min[0] + 6, 3);
      expect(box.max[2] - box.min[2]).toBeCloseTo(plainBox.max[2] - plainBox.min[2], 3);
      // Both lie from x = 40 on: the tab is where the plain lid's plate began, on its left (the hinge's knuckles on the right).
      const back = tabbed.lid.translate([-6, 0, 0]);
      const tab = back.subtract(plain.lid);
      created.push(back, tab);
      const tabBox = tab.boundingBox();
      expect(tabBox.max[0]).toBeCloseTo(40, 2);
      expect(tabBox.min[0]).toBeCloseTo(34, 2);
      expect(tabBox.max[1]).toBeCloseTo(2, 3);
      // A cap's plate is a wall and the gap wider than the box: the tab reaches 6 mm beyond that.
      const cap = lidForSolid(kernel, body, normalizeLidOptions({ ...PLUG, type: "cap", handle: "tab" }));
      if ("error" in cap) throw new Error(JSON.stringify(cap.error));
      created.push(cap.lid);
      const capBox = cap.lid.boundingBox();
      expect(capBox.max[2] - capBox.min[2]).toBeCloseTo(40 + 2 * 1.8 + 6, 3);
    } finally {
      dispose(created);
    }
  });

  it("cuts a finger notch into the front wall's outer face just below the rim, leaving 0.8 mm of the wall", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions({ ...PLUG, handle: "notch" }));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      expect(result.handle?.style).toBe("notch");
      const notch = result.handle!.notch!;
      created.push(result.lid, notch);
      expect(notch.status()).toBe("NoError");
      const cut = body.subtract(notch);
      created.push(cut);
      // The front wall runs from z = 18 (inside) to 20 (outside): the notch takes all but 0.8 mm of it.
      const box = notch.boundingBox();
      expect(box.min[2]).toBeGreaterThan(18.8 - 1e-3);
      expect(box.min[2]).toBeLessThan(18.8 + 1e-3);
      expect(box.max[0] - box.min[0]).toBeCloseTo(16, 2);
      expect(box.min[1]).toBeCloseTo(25, 2);
      const recess = body.intersect(notch);
      created.push(recess);
      expect(recess.boundingBox().max[1]).toBeCloseTo(30, 3);
      expect(solidAt(kernel, cut, [0, 29, 19.5], created)).toBe(false);
      expect(solidAt(kernel, cut, [0, 29, 18.9], created)).toBe(false);
      expect(solidAt(kernel, cut, [0, 29, 18.7], created)).toBe(true);
      expect(solidAt(kernel, cut, [0, 24.5, 19.5], created)).toBe(true);
      // Its ends are round: 16 mm wide, a 5 mm half round at each end.
      expect(solidAt(kernel, cut, [7, 28, 19.5], created)).toBe(false);
      expect(solidAt(kernel, cut, [7, 26, 19.5], created)).toBe(true);
      // Only at the front.
      expect(solidAt(kernel, cut, [0, 29, -19.5], created)).toBe(true);
      expect(cut.decompose().length).toBe(1);
      // The lid itself is as it was.
      const plain = lidForSolid(kernel, body, normalizeLidOptions(PLUG));
      if ("error" in plain) throw new Error(JSON.stringify(plain.error));
      created.push(plain.lid);
      expect(Math.abs(result.lid.volume() - plain.lid.volume())).toBeLessThan(1e-6);
    } finally {
      dispose(created);
    }
  });

  it("puts the notch below a cap's rim, opposite the hinge, and keeps the click bumps' dimples clear of it", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      // Over the top: the rim reaches 4 mm down, so the notch hangs from 26.
      const cap = lidForSolid(kernel, body, normalizeLidOptions({ ...PLUG, type: "cap", handle: "notch" }));
      if ("error" in cap) throw new Error(JSON.stringify(cap.error));
      created.push(cap.lid, cap.handle!.notch!);
      const capBox = cap.handle!.notch!.boundingBox();
      expect(capBox.max[1]).toBeCloseTo(26, 2);
      expect(capBox.min[1]).toBeCloseTo(21, 2);
      // A hinge on the front: the notch goes at the back.
      const hinged = lidForSolid(kernel, body, normalizeLidOptions({ ...PLUG, hinge: true, hingeSide: "front", handle: "notch" }));
      if ("error" in hinged) throw new Error(JSON.stringify(hinged.error));
      created.push(hinged.lid, hinged.hinge!.knuckles, hinged.handle!.notch!);
      expect(hinged.handle!.notch!.boundingBox().max[2]).toBeLessThan(-18.8 + 1e-3);
      // With click bumps, the front's is left out: its dimple would thin the wall the notch keeps.
      const both = lidForSolid(kernel, body, normalizeLidOptions({ ...PLUG, clickBumps: true, handle: "notch" }));
      if ("error" in both) throw new Error(JSON.stringify(both.error));
      created.push(both.lid, both.clickBumps!.dimples, both.handle!.notch!);
      expect(both.clickBumps!.count).toBe(3);
      expect(both.clickBumps!.dimples.boundingBox().max[2]).toBeLessThan(10);
    } finally {
      dispose(created);
    }
  });

  it("is refused for a pivot lid, a front too short and a wall too thin", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      for (const handle of ["tab", "notch"]) {
        expect(lidForSolid(kernel, body, normalizeLidOptions({ ...PLUG, hinge: true, hingeStyle: "pivot", handle }))).toEqual({ error: { code: "handlePivot" } });
      }
      // 14 mm across: half of it is less than the 8 mm a tab needs at least; a notch needs 2 mm beside its 10 mm.
      const narrow = openBox(kernel, created, 14, 40);
      expect(lidForSolid(kernel, narrow, normalizeLidOptions({ ...PLUG, handle: "tab" }))).toEqual({ error: { code: "handleSideShort" } });
      const narrower = openBox(kernel, created, 13, 40);
      expect(lidForSolid(kernel, narrower, normalizeLidOptions({ ...PLUG, handle: "notch" }))).toEqual({ error: { code: "handleSideShort" } });
      // A 1 mm wall keeps its 0.8 mm and has only 0.2 mm for a notch.
      const thin = openBox(kernel, created, 60, 40, 1);
      expect(lidForSolid(kernel, thin, normalizeLidOptions({ ...PLUG, handle: "notch" }))).toEqual({ error: { code: "handleNotchNoRoom" } });
      // A flat lid takes both.
      const flat = lidForSolid(kernel, body, normalizeLidOptions({ ...PLUG, type: "flat", handle: "notch" }));
      if ("error" in flat) throw new Error(JSON.stringify(flat.error));
      created.push(flat.lid, flat.handle!.notch!);
    } finally {
      dispose(created);
    }
  });
});
