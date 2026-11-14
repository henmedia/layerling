import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import { lidForSolid, lidLatchPlaces, normalizeLidOptions } from "@/lib/lidTool";
import { lidLatchClipProfile, lidLatchMeasures } from "@/lib/lidLatch";

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
});
