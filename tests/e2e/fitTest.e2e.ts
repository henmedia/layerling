import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
// The exact kernel (Manifold) loads its files relative to the page; in node they are the public folder.
(globalThis as unknown as { window: unknown }).window = { location: { href: pathToFileURL(resolve("apps/web/public") + "/").href } };
import { FIT_TEST_LABEL_HEIGHT, FIT_TEST_PIN_DIAMETER, FIT_TEST_PIN_LENGTH, FIT_TEST_PLATE, fitTestHoles, fitTestShape } from "@/lib/fitTest";
import { meshForShape } from "@/lib/editorMeshCore";
import { setLanguage } from "@/lib/i18n";
import { FIT_TEST_CLEARANCES } from "@/lib/printerPlay";
import { shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * The fit test (fitTest.ts) built as the editor builds it, with the real Manifold kernel: a bundle of the plate, its
 * seven holes cut and its numbers joined, and the 5 mm pin with its chamfer, two bodies side by side.
 */

const LIMIT = 250_000;

/** The volume of a closed triangle soup, from the signed tetrahedra to the origin. */
function meshVolume(positions: ArrayLike<number>) {
  let volume = 0;
  for (let i = 0; i < positions.length; i += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = Array.from({ length: 9 }, (_, k) => positions[i + k]);
    volume += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  return Math.abs(volume);
}

/** The triangles of a mesh as a flat list of corners. */
function triangleCorners(shape: WorkplaneShape) {
  const mesh = meshForShape(shape);
  return mesh.faces.flatMap((face) => face.flatMap((index) => mesh.vertices[index]));
}

/** The area of a regular polygon with its corners on a circle of this diameter. */
function polygonArea(diameter: number, sides: number) {
  return (sides / 2) * (diameter / 2) ** 2 * Math.sin((2 * Math.PI) / sides);
}

let shape: WorkplaneShape;

beforeAll(async () => {
  await setLanguage("en", false);
  shape = await fitTestShape(LIMIT, "en-US");
});

describe("the fit test as the editor makes it", () => {
  it("is a bundle of the plate and the pin, standing on the plate", () => {
    expect(shape.groupOperation).toBe("bundle");
    expect(shape.name).toBe("Fit test");
    expect(shape.elevation).toBe(0);
    expect(shape.hole).toBeFalsy();
    const [plate, pin] = shape.groupedShapes ?? [];
    expect(shape.groupedShapes).toHaveLength(2);
    expect(plate.name).toBe("Hole plate");
    expect(plate.groupOperation).toBe("group");
    expect(pin.name).toBe("Test pin 5 mm");
    // The pin stands beside the plate: the bundle is the plate and the pin side by side.
    expect(shapeDepth(shape)).toBeCloseTo(FIT_TEST_PLATE.depth, 6);
    expect(shapeWidth(shape)).toBeGreaterThan(FIT_TEST_PLATE.width + FIT_TEST_PIN_DIAMETER);
    expect(shape.height).toBeCloseTo(FIT_TEST_PIN_LENGTH, 6);
  });

  it("keeps every hole as a hole of the drawn size, 5 mm plus twice its play, and every number", () => {
    const plate = shape.groupedShapes![0];
    const children = plate.groupedShapes ?? [];
    const holes = children.filter((child) => child.hole);
    expect(holes.map((hole) => Number(shapeWidth(hole).toFixed(9)))).toEqual(FIT_TEST_CLEARANCES.map((clearance) => Number((FIT_TEST_PIN_DIAMETER + 2 * clearance).toFixed(9))));
    const labels = children.filter((child) => child.kind === "text");
    expect(labels.map((label) => label.text)).toEqual(fitTestHoles("en-US").map((hole) => hole.label));
  });

  it("cuts the holes out of the plate and raises the numbers on it", () => {
    const plate = shape.groupedShapes![0];
    const volume = meshVolume(triangleCorners(plate));
    const holes = (plate.groupedShapes ?? []).filter((child) => child.hole);
    const box = FIT_TEST_PLATE.width * FIT_TEST_PLATE.depth * FIT_TEST_PLATE.height;
    const drilled = box - holes.reduce((sum, hole) => sum + polygonArea(shapeWidth(hole), hole.sides ?? 0) * FIT_TEST_PLATE.height, 0);
    // The numbers add a little on top: more than nothing, much less than a millimetre over the whole plate.
    expect(volume).toBeGreaterThan(drilled + 1);
    expect(volume).toBeLessThan(drilled + FIT_TEST_PLATE.width * FIT_TEST_PLATE.depth * FIT_TEST_LABEL_HEIGHT * 0.5);
    expect(plate.height).toBeCloseTo(FIT_TEST_PLATE.height + FIT_TEST_LABEL_HEIGHT, 6);
  });

  it("makes the pin 5 mm thick and 15 mm long", () => {
    const pin = shape.groupedShapes![1];
    expect(shapeWidth(pin)).toBeCloseTo(FIT_TEST_PIN_DIAMETER, 6);
    expect(shapeDepth(pin)).toBeCloseTo(FIT_TEST_PIN_DIAMETER, 6);
    expect(pin.height).toBeCloseTo(FIT_TEST_PIN_LENGTH, 6);
    expect(pin.elevation ?? 0).toBeCloseTo(0, 6);
  });

  it("writes the numbers with the reader's decimal separator", async () => {
    await setLanguage("de", false);
    const german = await fitTestShape(LIMIT, "de-DE");
    expect(german.name).toBe("Passprobe");
    const labels = (german.groupedShapes![0].groupedShapes ?? []).filter((child) => child.kind === "text");
    expect(labels.map((label) => label.text)).toEqual(["0,05", "0,10", "0,15", "0,20", "0,25", "0,30", "0,40"]);
    await setLanguage("en", false);
  });
});
