import { beforeAll, describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { WorkplaneShape } from "@/types/layerling";

// Manifold loads its files relative to the page; in node they are the public folder.
(globalThis as unknown as { window: unknown }).window = { location: { href: pathToFileURL(resolve("apps/web/public") + "/").href } };

let lidTool: typeof import("@/lib/lidTool");
let canonicalizeShape: typeof import("@/lib/workplaneShapes").canonicalizeShape;

beforeAll(async () => {
  lidTool = await import("@/lib/lidTool");
  ({ canonicalizeShape } = await import("@/lib/workplaneShapes"));
});

function shape(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return canonicalizeShape({ id: "box", name: "Box", kind: "box", color: "#d97813", x: 0, z: 0, elevation: 0, size: 100, width: 100, depth: 70, height: 35, rotation: 0, ...overrides } as WorkplaneShape);
}

/** A box 100 x 70 x 35 built of a floor, four walls 2 mm thick and a divider across at x -10, all turned `turn` degrees. */
function dividedBox(turn = 0) {
  const rad = (turn * Math.PI) / 180;
  const part = (id: string, x: number, z: number, width: number, depth: number, height: number, elevation: number) =>
    shape({ id, x: x * Math.cos(rad) + z * Math.sin(rad), z: -x * Math.sin(rad) + z * Math.cos(rad), rotation: turn, width, depth, height, elevation, size: Math.max(width, depth) });
  return [
    part("floor", 0, 0, 100, 70, 2, 0),
    part("left", -49, 0, 2, 70, 33, 2),
    part("right", 49, 0, 2, 70, 33, 2),
    part("back", 0, -34, 100, 2, 33, 2),
    part("front", 0, 34, 100, 2, 33, 2),
    part("wall", -10, 0, 1.2, 70, 33, 2),
  ];
}

describe("the compartments the lid panel numbers for the labels (real Manifold kernel)", () => {
  it("finds a box's compartments from above, numbered from the left", async () => {
    const measured = await lidTool.lidRoomsForShapes(dividedBox());
    expect(measured!.rooms).toHaveLength(2);
    expect(measured!.rooms[0].centre[0]).toBeCloseTo(-29.3, 1);
    expect(measured!.rooms[1].centre[0]).toBeCloseTo(19.3, 1);
    expect(measured!.outline).toHaveLength(1);
    const xs = measured!.outline[0].map(([x]) => x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(100, 2);
  });

  it("draws a box that stands turned square, with the same compartments in the same order", async () => {
    const square = await lidTool.lidRoomsForShapes(dividedBox());
    const turned = await lidTool.lidRoomsForShapes(dividedBox(30));
    expect(turned!.rooms).toHaveLength(2);
    const size = (points: [number, number][]) => [Math.max(...points.map(([x]) => x)) - Math.min(...points.map(([x]) => x)), Math.max(...points.map(([, z]) => z)) - Math.min(...points.map(([, z]) => z))];
    turned!.rooms.forEach((room, index) => size(room.points).forEach((value, axis) => expect(value).toBeCloseTo(size(square!.rooms[index].points)[axis], 1)));
    expect(size(turned!.outline[0])[0]).toBeCloseTo(100, 1);
  });

  it("has nothing for a body without an opening at the top, or for holes alone", async () => {
    expect(await lidTool.lidRoomsForShapes([shape()])).toBeNull();
    expect(await lidTool.lidRoomsForShapes([shape({ hole: true })])).toBeNull();
  });

  it("gives the labels' places with the lid for shapes, and the compartments' middles", async () => {
    const result = await lidTool.lidForShapes(dividedBox(), lidTool.normalizeLidOptions({ labelSide: "inside", labels: ["A", "B"] }));
    if (!result.lid) throw new Error(result.error);
    expect(result.labels!.map((label) => label.text)).toEqual(["A", "B"]);
    expect(result.rooms).toHaveLength(2);
  });
});
