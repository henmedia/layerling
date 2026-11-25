import { beforeAll, describe, expect, it, vi } from "vitest";
import manifoldModule from "manifold-3d";
import type { WorkplaneShape } from "@/types/layerling";
import { buildGroupedShapeFromSelection } from "@/lib/editorBooleans";
import { boundsForShapes } from "@/lib/editorMeshCore";
import { lidBodyUp, lidGroupBody, lidGroupBodyResized, lidGroupStretched, lidOnOtherEndOnly, lidOnTop, lidPlaceAgain, lidSitsOnTop, lidToChange, lidsAllOnTop } from "@/lib/lidGroup";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { sceneShape } from "@/lib/shapeCatalog";
import { canonicalizeShape, resizedShapeSize, shapeDepth, shapeWidth } from "@/lib/workplaneShapes";

/**
 * A box grouped with what a lid added to it, here a block behind its back wall as a hinge's knuckles stand there and a
 * hole in its rim as a magnet's pocket: resized as a group, the box inside takes the new size and the block stays as it is.
 */
const kernel = vi.hoisted(() => ({ runtime: null as Promise<unknown> | null }));
vi.mock("@/lib/editorMeshCore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/editorMeshCore")>()),
  getManifoldRuntime: () => kernel.runtime,
}));
beforeAll(async () => {
  kernel.runtime = manifoldModule().then((loaded) => { loaded.setup(); rememberManifoldRuntime(loaded); return loaded; });
  await kernel.runtime;
});

const part = (id: string, name: string, x: number, z: number, width: number, depth: number, height: number, elevation = 0, extra: Partial<WorkplaneShape> = {}) =>
  sceneShape({ id, name, kind: "box", color: "#c00", x, z, elevation, width, depth, height, ...extra });
const isBox = (child: WorkplaneShape) => child.name === "Box";

/** A box 100 x 70 x 35 at (200, 50) with a block 60 x 5 x 6 behind its back wall at the rim and a pocket in a corner of the rim. */
async function lidGroup(turn = 0) {
  const built = await buildGroupedShapeFromSelection([
    part("box", "Box", 200, 50, 100, 70, 35),
    part("knuckles", "Knuckles", 200, 50 - 35 - 2.5, 60, 5, 6, 29),
    part("pocket", "Pocket", 245, 80, 6, 6, 3, 33, { hole: true }),
  ], 2_000_000);
  if (!built.group) throw new Error("no group");
  const group = canonicalizeShape({ ...built.group, groupOperation: "group", name: "Box" });
  return turn ? canonicalizeShape({ ...group, rotation: turn }) : group;
}

const sized = (group: WorkplaneShape, width: number, depth: number, height = group.height) => canonicalizeShape({ ...group, width, depth, height, size: resizedShapeSize(width, depth) });

describe("a box grouped with its lid's parts (real Manifold kernel)", () => {
  it("finds the box in the group where it stands, under the group's id and name", async () => {
    const group = await lidGroup();
    expect(shapeWidth(group)).toBeCloseTo(100, 3);
    expect(shapeDepth(group)).toBeCloseTo(75, 3);
    const box = lidGroupBody(group, isBox)!;
    expect(box).toMatchObject({ id: group.id, name: "Box" });
    expect([box.x, box.z, box.elevation]).toEqual([expect.closeTo(200, 3), expect.closeTo(50, 3), expect.closeTo(0, 3)]);
    expect([shapeWidth(box), shapeDepth(box), box.height]).toEqual([expect.closeTo(100, 3), expect.closeTo(70, 3), expect.closeTo(35, 3)]);
    // By itself it looks for a box that was hollowed with the Hollow tool: there is none here.
    expect(lidGroupBody(group)).toBeNull();
    expect(lidGroupBody(part("solo", "Box", 0, 0, 10, 10, 10), isBox)).toBeNull();
  });

  it("knows a group that was resized from one that was only moved or turned", async () => {
    const group = await lidGroup();
    expect(lidGroupStretched(group)).toBe(false);
    expect(lidGroupStretched({ ...group, x: 10, z: -40, elevation: 5, rotation: 30 })).toBe(false);
    expect(lidGroupStretched(sized(group, 130, 75))).toBe(true);
    expect(lidGroupStretched(sized(group, 100, 75, 40))).toBe(true);
    expect(lidGroupStretched(sized(group, 100.004, 75))).toBe(false);
    expect(lidGroupStretched(part("solo", "Box", 0, 0, 10, 10, 10))).toBe(false);
  });

  it("gives the box the group's new size less what stood out of it, where the group's stretch would stretch that too", async () => {
    const group = await lidGroup();
    // 30 mm wider: the block behind the back does not reach past the box's sides, so the box is 30 mm wider.
    const wider = lidGroupBodyResized(sized(group, 130, 75), isBox)!;
    expect([shapeWidth(wider), shapeDepth(wider), wider.height]).toEqual([expect.closeTo(130, 3), expect.closeTo(70, 3), expect.closeTo(35, 3)]);
    expect(wider.x).toBeCloseTo(group.x, 3);
    expect(wider.id).toBe(group.id);
    // 20 mm deeper and 5 mm higher: the block still stands 5 mm behind the back wall, and the box is 90 deep, not 70 * 95 / 75.
    const deeper = lidGroupBodyResized(sized(group, 100, 95, 40), isBox)!;
    expect([shapeWidth(deeper), shapeDepth(deeper), deeper.height]).toEqual([expect.closeTo(100, 3), expect.closeTo(90, 3), expect.closeTo(40, 3)]);
    const box = boundsForShapes([deeper]);
    const all = sized(group, 100, 95, 40);
    expect(box.minZ - (all.z - 95 / 2)).toBeCloseTo(5, 3);
    expect(box.maxZ).toBeCloseTo(all.z + 95 / 2, 3);
    expect(box.minY).toBeCloseTo(all.elevation ?? 0, 3);
    // The stretched group alone would have made it 88.7 deep.
    expect(shapeDepth(lidGroupBody(all, isBox)!)).toBeCloseTo((70 * 95) / 75, 2);
  });

  it("does the same for a group that stands turned, in the group's own directions", async () => {
    const group = await lidGroup(30);
    const resized = lidGroupBodyResized(sized(group, 130, 95), isBox)!;
    expect([shapeWidth(resized), shapeDepth(resized), resized.height]).toEqual([expect.closeTo(130, 3), expect.closeTo(90, 3), expect.closeTo(35, 3)]);
    expect(resized.rotation).toBeCloseTo(30, 6);
    // Its middle lies 2.5 mm in front of the group's, along the group's own depth: half of what stands out behind it.
    const rad = (30 * Math.PI) / 180;
    expect(resized.x - group.x).toBeCloseTo(2.5 * Math.sin(rad), 3);
    expect(resized.z - group.z).toBeCloseTo(2.5 * Math.cos(rad), 3);
  });

  it("has no box where none would be left, or none is in the group", async () => {
    const group = await lidGroup();
    // 6 mm deep: 5 of them are the block's.
    expect(lidGroupBodyResized(sized(group, 100, 6), isBox)).toBeNull();
    expect(lidGroupBodyResized(sized(group, 130, 75), (child) => child.name === "Nothing")).toBeNull();
    expect(lidGroupBodyResized(part("solo", "Box", 0, 0, 10, 10, 10), isBox)).toBeNull();
  });
});

describe("where a lid made again lies", () => {
  const fresh = { x: 180, z: 0, elevation: 0, width: 100, depth: 70 };
  const box = { minX: -65, maxX: 65, minZ: -35, maxZ: 35 };

  it("stays where the old lid lay when the box only got other compartments", () => {
    expect(lidPlaceAgain({ x: 115, z: 0, elevation: 0 }, fresh, box, false)).toEqual({ x: 115, z: 0, elevation: 0 });
    expect(lidPlaceAgain({ x: 30, z: 200, elevation: 12, rotationX: 180 }, fresh, null, true)).toEqual({ x: 30, z: 200, elevation: 12 });
  });

  it("is laid beside the box again when the larger box now stands where the lid lay on the plate", () => {
    // The lid lay with its middle at 110, 10 mm beside a box that reached to 50; the box now reaches to 65.
    expect(lidPlaceAgain({ x: 110, z: 0, elevation: 0 }, fresh, box, true)).toEqual({ x: 180, z: 0, elevation: 0 });
    // Clear of the box, it stays.
    expect(lidPlaceAgain({ x: 116, z: 0, elevation: 0 }, { ...fresh, width: 100 }, { ...box, maxX: 66 }, true)).toEqual({ x: 116, z: 0, elevation: 0 });
    expect(lidPlaceAgain({ x: 0, z: 120, elevation: 0 }, fresh, box, true)).toEqual({ x: 0, z: 120, elevation: 0 });
  });

  it("leaves a lid that was set on the box or stood up where it is", () => {
    // Closed on the box, turned over: not lying on the plate.
    expect(lidPlaceAgain({ x: 0, z: 0, elevation: 31, rotationX: 180 }, fresh, box, true)).toEqual({ x: 0, z: 0, elevation: 31 });
    expect(lidPlaceAgain({ x: 0, z: 0, elevation: 35 }, fresh, box, true)).toEqual({ x: 0, z: 0, elevation: 35 });
    expect(lidPlaceAgain({ x: 20, z: 0, elevation: 0, rotationZ: 90 }, fresh, box, true)).toEqual({ x: 20, z: 0, elevation: 0 });
  });
});

/** A body that is turned over can get a lid on its other end (Discussion #2052): the lid remembers the end it was made for. */
describe("which end of its body a lid sits on", () => {
  const body = part("pot", "Pot", 0, 0, 60, 60, 40);
  const lidFor = (of: WorkplaneShape, id = "lid", up: [number, number, number] | null = lidBodyUp(of)) =>
    ({ ...part(id, "Lid", 80, 0, 60, 60, 3), lidFor: { body: of.id, options: {}, ...(up ? { up } : {}) } });

  it("says which way is up as the body sees it", () => {
    expect(lidBodyUp(body)).toEqual([0, 1, 0]);
    expect(lidBodyUp({ ...body, rotation: 135 })).toEqual([0, 1, 0]);
    expect(lidBodyUp({ ...body, mirrorX: true, mirrorZ: true })).toEqual([0, 1, 0]);
    expect(lidBodyUp({ ...body, rotationX: 180 })).toEqual([0, -1, 0]);
    expect(lidBodyUp({ ...body, rotationZ: 180, rotation: 30 })).toEqual([0, -1, 0]);
    expect(lidBodyUp({ ...body, mirrorY: true })).toEqual([0, -1, 0]);
    // Laid on its side, a third end is up.
    expect(Math.abs(lidBodyUp({ ...body, rotationX: 90 })[2])).toBe(1);
  });

  it("keeps a lid on its end while the body is turned about the vertical, moved or mirrored sideways", () => {
    const lid = lidFor(body);
    for (const stood of [body, { ...body, rotation: 90 }, { ...body, x: 40, mirrorX: true }, { ...body, rotationX: 180, mirrorY: true }]) {
      expect(lidSitsOnTop(lid, stood)).toBe(true);
    }
  });

  it("finds no lid on the end that is up once the body is turned over, so the Lid tool makes a second one", () => {
    const lid = lidFor(body);
    for (const turned of [{ ...body, rotationX: 180 }, { ...body, rotationZ: 180 }, { ...body, mirrorY: true }, { ...body, rotationX: 90 }]) {
      expect(lidSitsOnTop(lid, turned)).toBe(false);
      expect(lidOnTop([turned, lid], turned)).toBeUndefined();
      expect(lidToChange([turned, lid], turned)).toBeNull();
      expect(lidOnOtherEndOnly([turned, lid], turned)).toBe(true);
      expect(lidsAllOnTop([turned, lid], turned)).toBe(false);
    }
    expect(lidToChange([body, lid], body)).toEqual({ lid, bare: body });
    expect(lidOnOtherEndOnly([body, lid], body)).toBe(false);
    expect(lidOnOtherEndOnly([body], body)).toBe(false);
  });

  it("changes the lid of the end that is up where the body has one on each end", () => {
    const turned = { ...body, mirrorY: true };
    const first = lidFor(body, "first");
    const second = lidFor(turned, "second");
    expect(lidToChange([turned, first, second], turned)?.lid.id).toBe("second");
    expect(lidToChange([body, first, second], body)?.lid.id).toBe("first");
    // With a lid on the other end the lids no longer follow the body.
    expect(lidsAllOnTop([body, first, second], body)).toBe(false);
    expect(lidsAllOnTop([body, first], body)).toBe(true);
    expect(lidsAllOnTop([body], body)).toBe(false);
  });

  it("takes a lid from before the end was remembered to sit on the end that is up", () => {
    const old = lidFor(body, "old", null);
    const turned = { ...body, rotationX: 180 };
    expect(lidSitsOnTop(old, turned)).toBe(true);
    expect(lidToChange([turned, old], turned)?.lid.id).toBe("old");
  });

  it("leaves a box grouped with a lid's parts as it is when it is turned over", async () => {
    const group = await lidGroup();
    const lid = lidFor(group);
    expect(lidToChange([group, lid], group)).toBeNull();
    expect(lidToChange([group, lid], group, isBox)?.bare.id).toBe(group.id);
    const turned = canonicalizeShape({ ...group, mirrorY: true });
    expect(lidToChange([turned, lid], turned, isBox)).toBeNull();
    // A plain lid for the other end sits on the group as it stands; the group still holds the first lid's parts.
    const second = lidFor(turned, "second");
    expect(lidOnTop([turned, lid, second], turned)?.id).toBe("second");
    expect(lidToChange([turned, lid, second], turned, isBox)).toBeNull();
  });
});
