import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import { LID_DEFAULTS, LID_LABEL_DEPTH, lidForSolid, lidLabelsFit, lidLabelsMoved, lidRooms, normalizeLidOptions, type LidOptions } from "@/lib/lidTool";

async function runtime() {
  const manifold = await Module();
  manifold.setup();
  return manifold;
}

type Kernel = Awaited<ReturnType<typeof runtime>>;
type Body = ReturnType<Kernel["Manifold"]["cube"]>;

const WIDTH = 100;
const HEIGHT = 35;
const DEPTH = 70;
const WALL = 2;

/** A box 100 wide (x), 35 high (y, the scene's up) and 70 deep (z), open at the top, with dividers across at `xs` and along at `zs`. */
function box(kernel: Kernel, xs: number[] = [], zs: number[] = []): Body {
  const outer = kernel.Manifold.cube([WIDTH, HEIGHT, DEPTH], true).translate([0, HEIGHT / 2, 0]);
  const inner = kernel.Manifold.cube([WIDTH - 2 * WALL, HEIGHT, DEPTH - 2 * WALL], true).translate([0, HEIGHT / 2 + WALL, 0]);
  let body = outer.subtract(inner);
  for (const x of xs) body = body.add(kernel.Manifold.cube([1.2, HEIGHT - WALL, DEPTH - 2 * WALL], true).translate([x, WALL + (HEIGHT - WALL) / 2, 0]));
  for (const z of zs) body = body.add(kernel.Manifold.cube([WIDTH - 2 * WALL, HEIGHT - WALL, 1.2], true).translate([0, WALL + (HEIGHT - WALL) / 2, z]));
  return body;
}

const lidOf = (kernel: Kernel, body: Body, options: Partial<LidOptions>) => {
  const result = lidForSolid(kernel, body, { ...LID_DEFAULTS, ...options });
  if ("error" in result) throw new Error(result.error.code);
  return result;
};

/** A point on the lid as it lies, where it is once the lid is turned back over and closes the body `lid` was made for. */
function closed(body: Body, lid: Body, thickness: number, point: readonly number[]) {
  const of = body.boundingBox();
  const box = lid.rotate([180, 0, 0]).boundingBox();
  const middle = (axis: number) => (of.min[axis] + of.max[axis]) / 2 - (box.min[axis] + box.max[axis]) / 2;
  return [point[0] + middle(0), -point[1] + of.max[1] + thickness - box.max[1], -point[2] + middle(2)];
}

describe("labels for the compartments, cut into the lid (real Manifold kernel)", () => {
  it("numbers the compartments in rows from the back, each from the left", () => {
    const square = (x: number, y: number, w: number, d: number): [number, number][] => [[x, y], [x + w, y], [x + w, y + d], [x, y + d]];
    // y to the back: the row at y 40 comes first, its left compartment before its right one.
    const rooms = lidRooms([square(50, 0, 40, 30), square(0, 40, 40, 30), square(0, 0, 40, 30), square(50, 41, 40, 29)]);
    expect(rooms.map((room) => room.centre.map(Math.round))).toEqual([[20, 55], [70, 56], [20, 15], [70, 15]]);
    expect(rooms[0]).toMatchObject({ width: 40, depth: 30 });
    // A hole in the opening (clockwise) and a sliver are no compartments.
    expect(lidRooms([square(0, 0, 40, 30), [...square(10, 10, 5, 5)].reverse(), square(60, 0, 1, 1)])).toHaveLength(1);
    // An L: the label's middle lies inside it.
    const [l] = lidRooms([[[0, 0], [40, 0], [40, 10], [10, 10], [10, 40], [0, 40]]]);
    expect(l.centre[0]).toBeGreaterThan(0);
    expect(l.centre[0]).toBeLessThan(40);
    expect(l.width).toBeGreaterThan(5);
    expect(l.depth).toBeGreaterThan(5);
  });

  it("knows its options: no labels unless asked for, texts tidied, the empty ones at the end dropped", () => {
    expect(normalizeLidOptions()).toMatchObject({ labelSide: "none", labels: [] });
    expect(normalizeLidOptions({ labelSide: "Inside", labels: [" M3 ", "", "a  b", 7, null, ""] })).toMatchObject({ labelSide: "inside", labels: ["M3", "", "a b", "7"] });
    expect(normalizeLidOptions({ labels: ["x".repeat(60)] }).labels[0]).toHaveLength(24);
    expect(normalizeLidOptions({ labelSide: "raised" }).labelSide).toBe("none");
    // The defaults' own list is never handed out to be changed.
    expect(normalizeLidOptions().labels).not.toBe(LID_DEFAULTS.labels);
    expect(["plug", "cap", "both", "flat"].every((type) => lidLabelsFit({ type } as LidOptions))).toBe(true);
    expect(["screw", "screwIn", "bayonet", "slide"].some((type) => lidLabelsFit({ type } as LidOptions))).toBe(false);
  });

  it("puts each label over its compartment: outside on the plate's top, inside on its underside", async () => {
    const kernel = await runtime();
    const body = box(kernel, [-10], [5]);
    // Compartments, back row first: (-30, -16), (20, -16), (-30, 20), (20, 20) about; the third is left without a label.
    const middles = [[-29.3, -14.7], [19.7, -14.7], [-29.3, 19.3], [19.7, 19.3]];
    const texts = ["M3", "M4", "", "Nuts"];
    for (const type of ["plug", "cap", "both", "flat"] as const) {
      const outside = lidOf(kernel, body, { type, labelSide: "outside", labels: texts });
      const inside = lidOf(kernel, body, { type, labelSide: "inside", labels: texts });
      expect(outside.labels!.map((label) => [label.index, label.text])).toEqual([[0, "M3"], [1, "M4"], [3, "Nuts"]]);
      expect(inside.labels!.map((label) => label.index)).toEqual([0, 1, 3]);
      const lying = (outside.lid as Body).boundingBox();
      for (const label of outside.labels!) {
        // On the plate as it prints: at the lid's lowest face, cut mirrored.
        expect(label.up).toBe(false);
        expect(label.point[1]).toBeCloseTo(lying.min[1], 6);
        expect(label.depth).toBe(LID_LABEL_DEPTH);
        const [x, y, z] = closed(body, outside.lid as Body, LID_DEFAULTS.thickness, label.point);
        expect(x).toBeCloseTo(middles[label.index][0], 0);
        expect(z).toBeCloseTo(middles[label.index][1], 0);
        expect(y).toBeCloseTo(HEIGHT + LID_DEFAULTS.thickness, 6);
        expect(label.width).toBeGreaterThan(20);
        expect(label.height).toBeGreaterThan(15);
      }
      for (const label of inside.labels!) {
        // The plate's underside looks up as the lid lies.
        expect(label.up).toBe(true);
        expect(label.point[1]).toBeCloseTo(lying.min[1] + LID_DEFAULTS.thickness, 6);
        const [x, y, z] = closed(body, inside.lid as Body, LID_DEFAULTS.thickness, label.point);
        expect(x).toBeCloseTo(middles[label.index][0], 0);
        expect(z).toBeCloseTo(middles[label.index][1], 0);
        expect(y).toBeCloseTo(HEIGHT, 6);
      }
      // Inside a lip, the label has the lip's ring less room.
      if (type === "plug") expect(inside.labels![0].width).toBeLessThan(outside.labels![0].width - 2 * LID_DEFAULTS.wall);
      // The lid itself is the same with labels as without: they are cut in afterwards, as texts.
      expect((outside.lid as Body).volume()).toBeCloseTo((lidOf(kernel, body, { type }).lid as Body).volume(), 3);
    }
    expect(lidOf(kernel, body, { labelSide: "outside", labels: [] }).labels).toBeUndefined();
    expect(lidOf(kernel, body, { labelSide: "none", labels: texts }).labels).toBeUndefined();
  }, 60000);

  it("cuts less deep into a thin plate, and puts an inside label on a lip that is solid", async () => {
    const kernel = await runtime();
    expect(lidOf(kernel, box(kernel), { thickness: 0.8, labelSide: "outside", labels: ["A"] }).labels![0].depth).toBeCloseTo(0.4, 6);
    // Two dividers 4 mm apart: the lip between them has no room inside it, and its end is where the label goes.
    const body = box(kernel, [0, 5.2]);
    const made = lidOf(kernel, body, { labelSide: "inside", labels: ["L", "x", "R"] });
    const lying = (made.lid as Body).boundingBox();
    expect(made.labels!.map((label) => Math.round((label.point[1] - lying.min[1]) * 100) / 100)).toEqual([2, 2 + LID_DEFAULTS.depth, 2]);
  }, 60000);

  it("turns the labels with a box that stands turned, and puts a stacking lid's in its tray", async () => {
    const kernel = await runtime();
    const square = box(kernel, [-10]);
    const there = lidOf(kernel, square.rotate([0, 30, 0]), { labelSide: "outside", labels: ["A", "B"] });
    const here = lidOf(kernel, square, { labelSide: "outside", labels: ["A", "B"] });
    const rad = (30 * Math.PI) / 180;
    here.labels!.forEach((label, index) => {
      const [x, y, z] = label.point;
      const spun = [x * Math.cos(rad) + z * Math.sin(rad), y, -x * Math.sin(rad) + z * Math.cos(rad)];
      spun.forEach((value, axis) => expect(there.labels![index].point[axis]).toBeCloseTo(value, 5));
      expect(there.labels![index].turn).toBeCloseTo(30, 5);
      expect(label.turn).toBeUndefined();
    });
    const stack = lidOf(kernel, square, { stackTop: true, labelSide: "inside", labels: ["A", "B"] });
    const upright = (stack.lid as Body).boundingBox();
    for (const label of stack.labels!) {
      expect(label.up).toBe(true);
      // In the tray's floor, below the rim round it.
      expect(label.point[1]).toBeGreaterThan(upright.min[1] + LID_DEFAULTS.depth);
      expect(label.point[1]).toBeLessThan(upright.max[1] - 0.5);
    }
  }, 60000);

  it("hands out the compartments' middles with a labelled lid, and finds each label's compartment again when they change", async () => {
    const kernel = await runtime();
    // Two compartments, left and right of a divider at x -10.
    const made = lidOf(kernel, box(kernel, [-10]), { labelSide: "outside", labels: ["Left", "Right"] });
    expect(made.rooms).toHaveLength(2);
    expect(made.rooms![0][0]).toBeCloseTo(-29.3, 1);
    expect(made.rooms![1][0]).toBeCloseTo(19.3, 1);
    expect(made.rooms![0][1]).toBeCloseTo(0, 1);
    expect(lidOf(kernel, box(kernel, [-10]), {}).rooms).toBeUndefined();
    const square = (x: number, z: number, w: number, d: number): [number, number][] => [[x, z], [x + w, z], [x + w, z + d], [x, z + d]];
    const rooms = (list: [number, number][][]) => ({ outline: [square(-50, -35, 100, 70)], rooms: list.map((points) => ({ points, centre: [(points[0][0] + points[2][0]) / 2, (points[0][1] + points[2][1]) / 2] as [number, number] })) });
    // A wall along the middle: four compartments, rows from the back. Each label stays on its side, in the half its old middle is nearest to.
    const four = rooms([square(-48, -33, 37, 32), square(-9, -33, 57, 32), square(-48, 1, 37, 32), square(-9, 1, 57, 32)]);
    const moved = lidLabelsMoved(["Left", "Right"], made.rooms!, four);
    expect(moved.filter(Boolean).sort()).toEqual(["Left", "Right"]);
    expect([0, 2]).toContain(moved.indexOf("Left"));
    expect([1, 3]).toContain(moved.indexOf("Right"));
    // The right compartment split in two by a wall across: the left one keeps its label and its number.
    const three = rooms([square(-48, -33, 37, 66), square(-9, -33, 27, 66), square(20, -33, 28, 66)]);
    expect(lidLabelsMoved(["Left", "Right"], made.rooms!, three)[0]).toBe("Left");
    expect(lidLabelsMoved(["Left", "Right"], made.rooms!, three).filter(Boolean)).toHaveLength(2);
    // The divider taken out: one compartment, and the first label is the one that stays.
    expect(lidLabelsMoved(["Left", "Right"], made.rooms!, rooms([square(-48, -33, 96, 66)]))).toEqual(["Left"]);
    // The box moved on the workplane: the middles are measured from the box's own middle.
    const away = { outline: [square(150, 65, 100, 70)], rooms: three.rooms.map((room) => ({ points: room.points.map(([x, z]): [number, number] => [x + 200, z + 100]), centre: [room.centre[0] + 200, room.centre[1] + 100] as [number, number] })) };
    expect(lidLabelsMoved(["Left", "Right"], made.rooms!, away)).toEqual(lidLabelsMoved(["Left", "Right"], made.rooms!, three));
    // Nothing to go by: the labels stay as they are.
    expect(lidLabelsMoved(["a", "b"], [], three)).toEqual([]);
    expect(lidLabelsMoved(["a", "b"], made.rooms!, { outline: [], rooms: [] })).toEqual(["a", "b"]);
  }, 60000);
});
