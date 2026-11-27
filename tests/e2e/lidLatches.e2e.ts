import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import { lidForSolid, lidLatchPlaces, normalizeLidOptions } from "@/lib/lidTool";
import { LID_LATCH_IN_PLACE_PLAY, lidLatchClipProfile, lidLatchInPlaceMeasures, lidLatchMeasures } from "@/lib/lidLatch";

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
 * A box `width` wide (x), `height` high (y, the scene's up) and `depth` deep (z), with 2 mm walls and floor, open at the
 * top; its back is -z, its front +z.
 */
function openBox(kernel: Kernel, created: Solid[], width = 60, depth = 40, height = 30) {
  const outer = kernel.Manifold.cube([width, height, depth], true).translate([0, height / 2, 0]);
  const inner = kernel.Manifold.cube([width - 4, height, depth - 4], true).translate([0, height / 2 + 2, 0]);
  const body = outer.subtract(inner);
  created.push(outer, inner, body);
  return body;
}

/** The lid turned back over and set on the body: its plate on the rim, flush with the body's sides and back (its latches stand out at the front). */
function closing(body: Body, lid: Body, thickness: number, created: Solid[]) {
  const turned = lid.rotate([180, 0, 0]);
  const bodyBox = body.boundingBox();
  const box = turned.boundingBox();
  const placed = turned.translate([bodyBox.min[0] - box.min[0], bodyBox.max[1] + thickness - box.max[1], bodyBox.min[2] - box.min[2]]);
  created.push(turned, placed);
  return placed;
}

const PLUG = { type: "plug", thickness: 2, gap: 0.2, depth: 4, wall: 1.6 };

describe("latches that clip the lid onto the body (real Manifold kernel)", () => {
  it("are off unless asked for, and keep their settings within limits", () => {
    expect(normalizeLidOptions().latches).toBe(0);
    const wild = normalizeLidOptions({ latches: 9, latchWidth: 100, latchGrip: -1, latchBack: "true" });
    expect(wild.latches).toBe(4);
    expect(wild.latchWidth).toBe(30);
    expect(wild.latchGrip).toBe(0.05);
    expect(wild.latchBack).toBe(true);
  });

  it("spread along the straight front, and are refused where the front is too short for them", () => {
    const square: [number, number][] = [[-30, -20], [30, -20], [30, 20], [-30, 20]];
    const span = lidLatchMeasures(12, 0.3).span;
    expect(lidLatchPlaces([square], 2, span)).toEqual({ front: -20, places: [-15, 15] });
    expect(lidLatchPlaces([square], 3, span)?.places).toEqual([-20, 0, 20]);
    expect(lidLatchPlaces([square], 4, span)).toBeNull();
  });

  it("give the body cheeks and pins below its rim and the lid its own, the clip fits both pins, and nothing overlaps when closed", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions({ ...PLUG, latches: 2 }));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      const latch = result.latch!;
      created.push(result.lid, latch.body, latch.clips);
      expect(latch.count).toBe(2);
      expect(latch.pin).toBeCloseTo(3, 6);
      for (const solid of [result.lid, latch.body, latch.clips]) expect(solid.status()).toBe("NoError");
      const measures = lidLatchMeasures(12, 0.3);
      // The body's cheeks stand out at its front (+z), below the rim, and nowhere else.
      const cheeks = latch.body.boundingBox();
      expect(cheeks.max[2]).toBeCloseTo(20 + measures.reach + measures.cheekRadius, 2);
      expect(cheeks.min[2]).toBeGreaterThan(20 - 1);
      expect(cheeks.max[1]).toBeLessThan(30);
      expect(latch.body.decompose().length).toBe(2);
      // Two clips, each the profile drawn out by the clip's width.
      const profile = kernel.CrossSection.ofPolygons([lidLatchClipProfile(measures)], "NonZero");
      created.push(profile);
      expect(latch.clips.volume()).toBeCloseTo(2 * profile.area() * 12, 0);

      // Closed: the lid on the rim, the body with its cheeks, and a clip on each latch where it snaps on, touching nothing.
      const closed = closing(body, result.lid, 2, created);
      const whole = body.add(latch.body);
      created.push(whole);
      const lidOnBody = closed.intersect(whole);
      created.push(lidOnBody);
      expect(lidOnBody.volume()).toBeLessThan(0.01);
      const lidPin = 30 + 2 - measures.rim;
      const bodyPin = lidPin - measures.spacing;
      const clip = profile.extrude(12);
      created.push(clip);
      for (const middle of [-15, 15]) {
        // The profile's v up the wall, its n out of the front (+z), drawn out along x.
        const placed = clip.transform([0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, middle - 6, bodyPin, 20, 1]);
        created.push(placed);
        const onBody = placed.intersect(whole);
        const onLid = placed.intersect(closed);
        created.push(onBody, onLid);
        expect(onBody.volume()).toBeLessThan(0.01);
        expect(onLid.volume()).toBeLessThan(0.01);
        // The clip holds by its shape (Discussion #2047): drawn straight off the wall it would have to go through both pins.
        const pulled = placed.translate([0, 0, measures.pin]);
        const pulledOnBody = pulled.intersect(whole);
        const pulledOnLid = pulled.intersect(closed);
        created.push(pulled, pulledOnBody, pulledOnLid);
        expect(pulledOnBody.volume()).toBeGreaterThan(1);
        expect(pulledOnLid.volume()).toBeGreaterThan(pulledOnBody.volume());
        // The sockets hold the pins: the clip with sockets as narrow as the pins would overlap both.
        const tight = kernel.CrossSection.ofPolygons([lidLatchClipProfile({ ...measures, socket: measures.pin - 0.1 })], "NonZero");
        const tightClip = tight.extrude(12).transform([0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, middle - 6, bodyPin, 20, 1]);
        const tightOnBody = tightClip.intersect(whole);
        const tightOnLid = tightClip.intersect(closed);
        created.push(tight, tightClip, tightOnBody, tightOnLid);
        expect(tightOnBody.volume()).toBeGreaterThan(0.1);
        expect(tightOnLid.volume()).toBeGreaterThan(0.1);
      }
    } finally {
      dispose(created);
    }
  });

  it("go opposite the hinge, on the back too without one, and say why when they cannot be made", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      const hinged = lidForSolid(kernel, body, normalizeLidOptions({ ...PLUG, latches: 1, hinge: true, latchBack: true }));
      if ("error" in hinged) throw new Error(JSON.stringify(hinged.error));
      created.push(hinged.lid, hinged.latch!.body, hinged.latch!.clips, hinged.hinge!.knuckles);
      // With the hinge at the back the latch is at the front only, whatever latchBack says.
      expect(hinged.latch!.count).toBe(1);
      expect(hinged.latch!.body.boundingBox().min[2]).toBeGreaterThan(19);
      // The clips lie apart from the lid and its knuckles, on the plate.
      const clipsOnLid = hinged.latch!.clips.intersect(hinged.lid);
      created.push(clipsOnLid);
      expect(clipsOnLid.volume()).toBe(0);
      const lidBox = hinged.lid.boundingBox();
      const clipsBox = hinged.latch!.clips.boundingBox();
      expect(clipsBox.min[1]).toBeCloseTo(lidBox.min[1], 6);
      expect(clipsBox.min[2] > lidBox.max[2] || clipsBox.max[2] < lidBox.min[2]).toBe(true);
      const both = lidForSolid(kernel, body, normalizeLidOptions({ ...PLUG, type: "flat", latches: 1, latchBack: true }));
      if ("error" in both) throw new Error(JSON.stringify(both.error));
      created.push(both.lid, both.latch!.body, both.latch!.clips);
      expect(both.latch!.count).toBe(2);
      expect(both.latch!.body.boundingBox().min[2]).toBeLessThan(-20);

      const fail = (options: Record<string, unknown>, box = body) => {
        const result = lidForSolid(kernel, box, normalizeLidOptions({ ...PLUG, ...options }));
        if (!("error" in result)) {
          created.push(result.lid);
          return null;
        }
        return result.error;
      };
      expect(fail({ type: "cap", latches: 1 })).toEqual({ code: "latchLidType" });
      expect(fail({ latches: 1, hinge: true, hingeStyle: "pivot" })).toEqual({ code: "latchLidType" });
      expect(fail({ latches: 1, handle: "tab" })).toEqual({ code: "latchHandle" });
      expect(fail({ latches: 4 })).toEqual({ code: "latchSideShort" });
      expect(fail({ latches: 1 }, openBox(kernel, created, 60, 40, 12))).toEqual({ code: "latchBodyLow", height: 20 });
    } finally {
      dispose(created);
    }
  });

  it("print the clips in place on the lid's pins when asked, closed rings loose round them and clear of the lid (Discussion #2047)", async () => {
    expect(normalizeLidOptions().latchInPlace).toBe(false);
    expect(normalizeLidOptions({ latchInPlace: "true" }).latchInPlace).toBe(true);
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions({ ...PLUG, latches: 2, latchInPlace: true }));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      const latch = result.latch!;
      created.push(result.lid, latch.body, latch.clips);
      expect(latch.inPlace).toBe(true);
      expect(latch.count).toBe(2);
      expect(latch.clips.status()).toBe("NoError");
      expect(latch.clips.decompose().length).toBe(2);
      const lidBox = result.lid.boundingBox();
      const clipsBox = latch.clips.boundingBox();
      // The clips stand on the bed with the lid, on its pins at its front edge, and reach up from it.
      expect(clipsBox.min[1]).toBeCloseTo(lidBox.min[1], 6);
      expect(clipsBox.max[1]).toBeGreaterThan(lidBox.max[1]);
      expect(clipsBox.min[0]).toBeGreaterThan(lidBox.min[0]);
      expect(clipsBox.max[0]).toBeLessThan(lidBox.max[0]);
      // Loose: moved a little less than their play any way, they still touch nothing of the lid.
      const step = LID_LATCH_IN_PLACE_PLAY - 0.1;
      for (const shift of [[step, 0, 0], [-step, 0, 0], [0, step, 0], [0, 0, step], [0, 0, -step]] as [number, number, number][]) {
        const moved = latch.clips.translate(shift);
        const touching = moved.intersect(result.lid);
        created.push(moved, touching);
        expect(touching.volume()).toBeLessThan(1e-6);
      }
      // They cannot come off: drawn off the wall by the pin's thickness, each would go through its pin.
      const pulled = latch.clips.translate([0, 0, latch.pin]);
      const pulledOnLid = pulled.intersect(result.lid);
      created.push(pulled, pulledOnLid);
      expect(pulledOnLid.volume()).toBeGreaterThan(1);
      // Their sockets on the lid's pins are closed rings, not a C: each clip has one hole right through it.
      for (const clip of latch.clips.decompose()) {
        created.push(clip);
        expect(clip.genus()).toBe(1);
      }
      // Pushed towards the wall, where a C opens, by the pin's thickness, a clip still goes through its pin.
      const pushed = latch.clips.translate([0, 0, -latch.pin]);
      const pushedOnLid = pushed.intersect(result.lid);
      created.push(pushed, pushedOnLid);
      expect(pushedOnLid.volume()).toBeGreaterThan(1);

      // Closed, with the lid on the rim, the clips hang over the body's pins and touch neither body nor cheeks.
      const turned = result.lid.rotate([180, 0, 0]);
      const bodyBox = body.boundingBox();
      const box = turned.boundingBox();
      const move: [number, number, number] = [bodyBox.min[0] - box.min[0], bodyBox.max[1] + 2 - box.max[1], bodyBox.min[2] - box.min[2]];
      const clipsClosed = latch.clips.rotate([180, 0, 0]).translate(move);
      const whole = body.add(latch.body);
      const onBody = clipsClosed.intersect(whole);
      created.push(turned, clipsClosed, whole, onBody);
      expect(onBody.volume()).toBeLessThan(0.01);

      // The narrowest and the widest clip, on a flat lid, print loose on their pins too.
      for (const latchWidth of [6, 30]) {
        const flat = lidForSolid(kernel, body, normalizeLidOptions({ ...PLUG, type: "flat", latches: 1, latchWidth, latchInPlace: true }));
        if ("error" in flat) throw new Error(JSON.stringify(flat.error));
        created.push(flat.lid, flat.latch!.body, flat.latch!.clips);
        expect(flat.latch!.inPlace).toBe(true);
        expect(flat.latch!.clips.status()).toBe("NoError");
        const near = flat.latch!.clips.translate([0, -step, 0]);
        const touching = near.intersect(flat.lid);
        created.push(near, touching);
        expect(touching.volume()).toBeLessThan(1e-6);
        for (const clip of flat.latch!.clips.decompose()) {
          created.push(clip);
          expect(clip.genus()).toBe(1);
        }
      }
    } finally {
      dispose(created);
    }
  });

  it("swing the clips printed on the lid about its pin from open to closed without touching the wall or the lid, and snap them over the body's pin (Discussion #2047)", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      // Darryl's grip of 0.15 on the usual clip, the narrowest and the widest, and the most grip.
      for (const [type, latchWidth, latchGrip] of [["plug", 12, 0.15], ["plug", 12, 0.3], ["flat", 6, 0.15], ["plug", 20, 0.15], ["plug", 30, 1]] as const) {
        const result = lidForSolid(kernel, body, normalizeLidOptions({ ...PLUG, type, latches: 1, latchWidth, latchGrip, latchInPlace: true }));
        if ("error" in result) throw new Error(JSON.stringify(result.error));
        const latch = result.latch!;
        created.push(result.lid, latch.body, latch.clips);
        const measures = lidLatchInPlaceMeasures(lidLatchMeasures(latchWidth, latchGrip));
        // The lid turned back over onto the rim, its clips with it, closed over the body's pins.
        const lid = closing(body, result.lid, 2, created);
        const lidBox = lid.boundingBox();
        const turned = result.lid.rotate([180, 0, 0]);
        const box = turned.boundingBox();
        const clips = latch.clips.rotate([180, 0, 0]).translate([lidBox.min[0] - box.min[0], lidBox.min[1] - box.min[1], lidBox.min[2] - box.min[2]]);
        created.push(turned, clips);
        // The lid's pin runs along x, rim less from the plate's top, reach in front of the front (+z).
        const pin: [number, number, number] = [0, 30 + 2 - measures.rim, 20 + measures.reach];
        const swing = (degrees: number) => {
          const swung = clips.translate([0, -pin[1], -pin[2]]).rotate([-degrees, 0, 0]).translate([0, pin[1], pin[2]]);
          created.push(swung);
          return swung;
        };
        const overlap = (a: Body, b: Body) => {
          const both = a.intersect(b);
          const volume = both.volume();
          both.delete();
          return volume;
        };
        for (let degrees = 0; degrees <= 180; degrees += 10) {
          const swung = swing(degrees);
          // Lower end out and up: it never runs into the body's wall or the lid, and keeps the play off them.
          expect(overlap(swung, body)).toBeLessThan(1e-6);
          expect(overlap(swung, lid)).toBeLessThan(1e-6);
          expect(swung.minGap(body, 1)).toBeGreaterThan(LID_LATCH_IN_PLACE_PLAY - 0.05);
          expect(swung.minGap(lid, 1)).toBeGreaterThan(LID_LATCH_IN_PLACE_PLAY - 0.05);
          // Clear of the body's pin and cheeks, but where it snaps over the pin.
          if (degrees === 0 || degrees >= 30) expect(overlap(swung, latch.body)).toBeLessThan(1e-6);
        }
        // The grip: a little way open the socket's jaws are on the body's pin, so they have to spread to come off it.
        expect(overlap(swing(10), latch.body)).toBeGreaterThan(0.5);
      }
    } finally {
      dispose(created);
    }
  });
});
