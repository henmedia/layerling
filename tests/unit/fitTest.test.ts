import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { FIT_TEST_HOLE_PITCH, FIT_TEST_LABEL_HEIGHT, FIT_TEST_PIN_CHAMFER, FIT_TEST_PIN_DIAMETER, FIT_TEST_PIN_LENGTH, FIT_TEST_PLATE, fitTestHoles, fitTestLabel, fitTestParts, fitTestSpot } from "@/lib/fitTest";
import { setLanguage } from "@/lib/i18n";
import { FIT_TEST_CLEARANCES } from "@/lib/printerPlay";
import { loadTextFonts } from "@/lib/textFonts";
import { shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * The fit test (fitTest.ts) laid out before it is cut: a hole for each tested play, drawn exactly 5 mm plus twice it,
 * the play written beside it in the reader's numbers, and the 5 mm pin.
 */

beforeAll(async () => {
  await loadTextFonts();
});

beforeEach(async () => {
  await setLanguage("en", false);
});

/** A shape's footprint seen from above, from its middle and its box. */
function footprint(shape: WorkplaneShape) {
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  return { minX: shape.x - width / 2, maxX: shape.x + width / 2, minZ: shape.z - depth / 2, maxZ: shape.z + depth / 2 };
}

function apart(a: ReturnType<typeof footprint>, b: ReturnType<typeof footprint>) {
  return a.maxX <= b.minX || b.maxX <= a.minX || a.maxZ <= b.minZ || b.maxZ <= a.minZ;
}

describe("the holes of the fit test", () => {
  it("has a hole for every tested play, exactly the 5 mm pin plus twice the play", () => {
    const holes = fitTestHoles("en-US");
    expect(holes.map((hole) => hole.clearance)).toEqual([...FIT_TEST_CLEARANCES]);
    for (const hole of holes) expect(hole.diameter).toBe(Number((FIT_TEST_PIN_DIAMETER + 2 * hole.clearance).toFixed(6)));
    expect(holes.map((hole) => hole.diameter)).toEqual([5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.8]);
  });

  it("lies in a row along the plate, the tightest on the left, each well inside it", () => {
    const holes = fitTestHoles("en-US");
    expect(holes.map((hole) => hole.x)).toEqual([-24, -16, -8, 0, 8, 16, 24]);
    holes.slice(1).forEach((hole, index) => expect(hole.x - holes[index].x).toBe(FIT_TEST_HOLE_PITCH));
    for (const hole of holes) {
      expect(Math.abs(hole.x) + hole.diameter / 2).toBeLessThan(FIT_TEST_PLATE.width / 2 - 2);
      // Between two holes at least two millimetres of plate are left.
    }
    holes.slice(1).forEach((hole, index) => expect(hole.x - holes[index].x - (hole.diameter + holes[index].diameter) / 2).toBeGreaterThanOrEqual(2));
  });

  it("writes each play with two decimals in the reader's numbers", () => {
    expect(fitTestHoles("en-US").map((hole) => hole.label)).toEqual(["0.05", "0.10", "0.15", "0.20", "0.25", "0.30", "0.40"]);
    expect(fitTestHoles("de-DE").map((hole) => hole.label)).toEqual(["0,05", "0,10", "0,15", "0,20", "0,25", "0,30", "0,40"]);
    expect(fitTestLabel(0.05, "zh-CN")).toBe("0.05");
    // Latin digits, which the typeface of the numbers has, also where the language would write others.
    expect(fitTestLabel(0.05, "ar-AE")).toMatch(/^0[.,٫]05$/);
  });

  it("puts the numbers in front of and behind the holes by turns", () => {
    expect(fitTestHoles("en-US").map((hole) => hole.front)).toEqual([true, false, true, false, true, false, true]);
  });
});

describe("the shapes the fit test is made of", () => {
  it("is a 60 x 20 x 4 mm plate with the holes through it and a little past it", () => {
    const parts = fitTestParts("en-US");
    expect([shapeWidth(parts.plate), shapeDepth(parts.plate), parts.plate.height]).toEqual([60, 20, 4]);
    expect(parts.plate.elevation).toBe(0);
    expect(parts.holes).toHaveLength(FIT_TEST_CLEARANCES.length);
    parts.holes.forEach((hole, index) => {
      const drawn = FIT_TEST_PIN_DIAMETER + 2 * FIT_TEST_CLEARANCES[index];
      expect(hole.kind).toBe("cylinder");
      expect(hole.hole).toBe(true);
      expect(shapeWidth(hole)).toBeCloseTo(drawn, 9);
      expect(shapeDepth(hole)).toBeCloseTo(drawn, 9);
      // So many sides that the flats lie within a thousandth of a millimetre of the drawn circle.
      expect((drawn / 2) * (1 - Math.cos(Math.PI / (hole.sides ?? 0)))).toBeLessThan(0.001);
      expect(hole.elevation).toBeLessThan(0);
      expect((hole.elevation ?? 0) + hole.height).toBeGreaterThan(FIT_TEST_PLATE.height);
    });
  });

  it("raises each play beside its hole, on the plate's top, clear of the holes and of each other", () => {
    const parts = fitTestParts("de-DE");
    const holes = fitTestHoles("de-DE");
    expect(parts.labels.map((label) => label.text)).toEqual(holes.map((hole) => hole.label));
    const plate = footprint(parts.plate);
    parts.labels.forEach((label, index) => {
      expect(label.kind).toBe("text");
      expect(label.hole).toBeFalsy();
      expect(label.elevation).toBe(FIT_TEST_PLATE.height);
      expect(label.height).toBe(FIT_TEST_LABEL_HEIGHT);
      expect(label.x).toBeCloseTo(holes[index].x, 9);
      expect(Math.sign(label.z)).toBe(holes[index].front ? 1 : -1);
      const box = footprint(label);
      expect(box.minX).toBeGreaterThan(plate.minX);
      expect(box.maxX).toBeLessThan(plate.maxX);
      expect(box.minZ).toBeGreaterThan(plate.minZ);
      expect(box.maxZ).toBeLessThan(plate.maxZ);
      for (const hole of parts.holes) expect(apart(box, footprint(hole))).toBe(true);
      parts.labels.slice(index + 1).forEach((other) => expect(apart(box, footprint(other))).toBe(true));
    });
  });

  it("stands the 5 mm pin beside the plate, its top end chamfered", () => {
    const { pin, chamfer, plate } = fitTestParts("en-US");
    expect(pin.kind).toBe("cylinder");
    expect(shapeWidth(pin)).toBe(FIT_TEST_PIN_DIAMETER);
    expect(shapeDepth(pin)).toBe(FIT_TEST_PIN_DIAMETER);
    expect(pin.elevation).toBe(0);
    expect(chamfer.kind).toBe("cone");
    expect(chamfer.baseRadius).toBe(FIT_TEST_PIN_DIAMETER / 2);
    expect(chamfer.topRadius).toBe(FIT_TEST_PIN_DIAMETER / 2 - FIT_TEST_PIN_CHAMFER);
    expect(chamfer.x).toBe(pin.x);
    expect(chamfer.elevation).toBe(pin.height);
    expect(pin.height + chamfer.height).toBe(FIT_TEST_PIN_LENGTH);
    expect(apart(footprint(pin), footprint(plate))).toBe(true);
    expect(pin.sides).toBe(chamfer.sides);
  });
});

describe("where the fit test goes on the plate", () => {
  const size = { width: 70, depth: 20 };

  it("goes to the plate's middle when nothing stands there", () => {
    expect(fitTestSpot(size, { x: 0, z: 0 }, [])).toEqual({ x: 0, z: 0 });
    // A body off to the side, past the fit test's width, is no reason to move.
    expect(fitTestSpot(size, { x: 0, z: 0 }, [{ minX: 40, maxX: 60, minZ: -10, maxZ: 10 }])).toEqual({ x: 0, z: 0 });
  });

  it("goes in front of what it would land in, 10 mm clear of the frontmost of it", () => {
    const taken = [
      { minX: -20, maxX: 20, minZ: -20, maxZ: 15 },
      { minX: -30, maxX: -10, minZ: 20, maxZ: 30 },
    ];
    expect(fitTestSpot(size, { x: 0, z: 0 }, taken)).toEqual({ x: 0, z: 50 });
  });

  it("keeps to the plate it was asked for", () => {
    expect(fitTestSpot(size, { x: 220, z: 0 }, [{ minX: -20, maxX: 20, minZ: -10, maxZ: 10 }])).toEqual({ x: 220, z: 0 });
  });
});
