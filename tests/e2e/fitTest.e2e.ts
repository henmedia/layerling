import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
// The exact kernel (Manifold) loads its files relative to the page; in node they are the public folder.
(globalThis as unknown as { window: unknown }).window = { location: { href: pathToFileURL(resolve("apps/web/public") + "/").href } };
import { BREAKAWAY_BASE, breakawayNubSize, breakawayPlateSize, breakawaySocketDiameter } from "@/lib/breakawayBase";
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

/** How many separate pieces a mesh falls into: triangles that share a corner (by position) belong to one piece. */
function pieces(shape: WorkplaneShape) {
  const mesh = meshForShape(shape);
  const key = (index: number) => mesh.vertices[index].map((value) => value.toFixed(4)).join(",");
  const parent = new Map<string, string>();
  const find = (node: string): string => {
    const up = parent.get(node) ?? node;
    if (up === node) return node;
    const top = find(up);
    parent.set(node, top);
    return top;
  };
  for (const face of mesh.faces) {
    const [first, ...rest] = face.map(key);
    for (const other of rest) parent.set(find(other), find(first));
  }
  return new Set(mesh.faces.map((face) => find(key(face[0])))).size;
}

describe("the fit test with the pin on a breakaway base", () => {
  let based: WorkplaneShape;
  beforeAll(async () => {
    based = await fitTestShape(LIMIT, "en-US", { base: true });
  });

  it("raises the pin onto the base, one body with it, and keeps the hole plate as it was", () => {
    const [plate, pin] = based.groupedShapes ?? [];
    expect(pin.name).toBe("Test pin 5 mm");
    // The base's 1.3 mm plate and socket, the pin 0.5 mm up on its nub: 15.5 mm in all.
    expect(pin.height).toBeCloseTo(BREAKAWAY_BASE.lift + FIT_TEST_PIN_LENGTH, 6);
    expect(shapeWidth(pin)).toBeCloseTo(breakawayPlateSize(FIT_TEST_PIN_DIAMETER), 6);
    expect(shapeDepth(pin)).toBeCloseTo(breakawayPlateSize(FIT_TEST_PIN_DIAMETER), 6);
    expect(pieces(pin)).toBe(1);
    expect(pieces(shape.groupedShapes![1])).toBe(1);
    // The base stays clear of the hole plate.
    expect(pin.x - shapeWidth(pin) / 2).toBeGreaterThan(plate.x + shapeWidth(plate) / 2 + 2);
    expect(plate.height).toBeCloseTo(shape.groupedShapes![0].height, 6);
  });

  it("leaves the pin free of the socket's wall: the base only holds it by the nub", () => {
    const pin = based.groupedShapes![1];
    const plain = shape.groupedShapes![1];
    const plainVolume = meshVolume(triangleCorners(plain));
    const volume = meshVolume(triangleCorners(pin));
    const { height, floor, lift } = BREAKAWAY_BASE;
    const plateSize = breakawayPlateSize(FIT_TEST_PIN_DIAMETER);
    const socket = breakawaySocketDiameter(FIT_TEST_PIN_DIAMETER);
    const nub = breakawayNubSize(FIT_TEST_PIN_DIAMETER);
    // The plate less its socket, the nub between floor and pin, and the pin as before.
    const base = plateSize ** 2 * height - Math.PI * (socket / 2) ** 2 * (height - floor) + nub ** 2 * (lift - floor);
    expect(volume).toBeCloseTo(plainVolume + base, 0);
  });
});
