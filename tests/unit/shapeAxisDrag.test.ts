import { describe, expect, it } from "vitest";
import { objectSnapOffset, shiftSnapBox } from "@/lib/objectSnap";
import { horizontalPlacementWorkplane, placementWorkplaneCoordinates, placementWorkplanePoint } from "@/lib/placementWorkplane";
import {
  dragAxisLock,
  frameBox,
  frameCoordinates,
  framePointInWorld,
  shapeDragFrame,
  shapeDragPlaneFacesView,
  shapeWorkplanePreview,
  showsShapeWorkplane,
  snappedFrameMove,
  turnedAlike,
  turnedBoxCorners,
} from "@/lib/shapeAxisDrag";

const plate = horizontalPlacementWorkplane();
const S = Math.SQRT1_2;
const fromAbove = { x: 0, y: -1, z: 0 };

describe("the plane a shape is dragged on along its own axes", () => {
  it("lies across the shape's up, through where the drag began", () => {
    const start = { x: 12, y: 4, z: -3 };
    const frame = shapeDragFrame({ rotation: 0, rotationX: 30 }, plate, start, { x: 0, y: -0.7, z: -0.7 });
    expect(frame).not.toBeNull();
    expect(frame!.origin).toEqual(start);
    expect(frame!.normal.y).toBeCloseTo(Math.cos(Math.PI / 6), 9);
    expect(frame!.normal.z).toBeCloseTo(0.5, 9);
  });

  it("falls back to the workplane when seen nearly edge-on (beyond 75°)", () => {
    const tilt = (degrees: number) => ({ x: 0, y: -Math.cos((degrees * Math.PI) / 180), z: -Math.sin((degrees * Math.PI) / 180) });
    expect(shapeDragPlaneFacesView({ x: 0, y: 1, z: 0 }, tilt(74))).toBe(true);
    expect(shapeDragPlaneFacesView({ x: 0, y: 1, z: 0 }, tilt(76))).toBe(false);
    // The view from below counts as well: the plane faces it the other way.
    expect(shapeDragPlaneFacesView({ x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 0 })).toBe(true);
    // Tilted 89°, its Z becomes its up, so seen from above its plane still faces the view.
    expect(shapeDragFrame({ rotation: 0, rotationX: 89 }, horizontalPlacementWorkplane(), { x: 0, y: 0, z: 0 }, fromAbove)).not.toBeNull();
    // On a side wall the plane stands upright: seen from straight above it is edge-on.
    expect(shapeDragFrame({ rotation: 0, rotationZ: 90 }, { ...plate, normal: { x: 1, y: 0, z: 0 }, xAxis: { x: 0, y: 0, z: -1 }, zAxis: { x: 0, y: -1, z: 0 } }, { x: 0, y: 0, z: 0 }, fromAbove)).toBeNull();
  });

  it("snaps to whole grid steps along the shape's axes, counted from the start", () => {
    const start = { x: 0.37, y: 0, z: 1.21 };
    const frame = shapeDragFrame({ rotation: 45 }, plate, start, fromAbove)!;
    // The pointer 2.6 steps along the shape's X and 0.4 along its Z: as the drag snaps it, 3 and 0 steps.
    const pointer = framePointInWorld(frame, 2.6, 0, 0.4);
    const local = placementWorkplaneCoordinates(frame, pointer);
    const snapped = placementWorkplanePoint(frame, Math.round(local.x), Math.round(local.z));
    const moved = { x: snapped.x - start.x, y: snapped.y - start.y, z: snapped.z - start.z };
    expect(moved.x).toBeCloseTo(3 * S, 9);
    expect(moved.z).toBeCloseTo(-3 * S, 9);
    expect(moved.y).toBeCloseTo(0, 9);
  });

  it("holds Shift to whichever of the shape's two axes is closer to the drag", () => {
    const frame = shapeDragFrame({ rotation: 45 }, plate, { x: 0, y: 0, z: 0 }, fromAbove)!;
    // Dragged straight to the right: a little more along the shape's X (right and back) once it leans back.
    const lock = dragAxisLock(frame, 1, 0, -0.1);
    expect(lock.along).toBe("x");
    expect(lock.delta.x).toBeCloseTo(lock.delta.z * -1, 9);
    const other = dragAxisLock(frame, 1, 0, 0.1);
    expect(other.along).toBe("z");
    expect(other.delta.x).toBeCloseTo(other.delta.z, 9);
  });
});

describe("pink guides along the shape's own axes", () => {
  it("counts quarter turns as parallel", () => {
    expect(turnedAlike({ rotation: 45 }, { rotation: 135 })).toBe(true);
    expect(turnedAlike({ rotation: 45 }, { rotation: -45 })).toBe(true);
    expect(turnedAlike({ rotation: 45 }, { rotation: 45.005 })).toBe(true);
    expect(turnedAlike({ rotation: 45 }, { rotation: 45.02 })).toBe(false);
    expect(turnedAlike({ rotation: 45 }, { rotation: 30 })).toBe(false);
  });

  it("matches tilted shapes only when all three axes line up, swapped or flipped", () => {
    expect(turnedAlike({ rotation: 0, rotationX: 30 }, { rotation: 0, rotationX: 30 })).toBe(true);
    expect(turnedAlike({ rotation: 0, rotationX: 30 }, { rotation: 0, rotationX: 120 })).toBe(true);
    expect(turnedAlike({ rotation: 0, rotationX: 30 }, { rotation: 180, rotationX: 30 })).toBe(true);
    expect(turnedAlike({ rotation: 0, rotationX: 30 }, { rotation: 180, rotationX: -30 })).toBe(false);
    // Same tilt, but spun differently on the plate: the axes no longer line up.
    expect(turnedAlike({ rotation: 0, rotationX: 30 }, { rotation: 45, rotationX: 30 })).toBe(false);
    // A turn baked into the mesh is stored as 0°: it does not match.
    expect(turnedAlike({ rotation: 0 }, { rotation: 45 })).toBe(false);
  });

  it("measures a shape turned alike exactly in the dragged shape's frame", () => {
    const frame = shapeDragFrame({ rotation: 45 }, plate, { x: 0, y: 0, z: 0 }, fromAbove)!;
    // A 20 × 10 × 6 box turned 135° (parallel sides), standing 30 along the dragged shape's X.
    const center = framePointInWorld(frame, 30, 3, 0);
    const box = frameBox(frame, turnedBoxCorners(center, { x: 10, y: 3, z: 5 }, { rotation: 135 }))!;
    // Turned a quarter more, its 20 runs along the frame's Z.
    expect(box.minX).toBeCloseTo(25, 9);
    expect(box.maxX).toBeCloseTo(35, 9);
    expect(box.minZ).toBeCloseTo(-10, 9);
    expect(box.maxZ).toBeCloseTo(10, 9);
    expect(box.minUp).toBeCloseTo(0, 9);
    expect(box.maxUp).toBeCloseTo(6, 9);
  });

  it("pulls the dragged box onto a neighbour's edge along the shape's axes and keeps the other axis", () => {
    const frame = shapeDragFrame({ rotation: 45 }, plate, { x: 0, y: 0, z: 0 }, fromAbove)!;
    const moving = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
    const target = { minX: 15.2, maxX: 30, minZ: 40, maxZ: 60 };
    const raw = { x: 10.1, z: 3.3 };
    const pull = objectSnapOffset(shiftSnapBox(moving, raw.x, raw.z), [target], 0.5);
    const moved = snappedFrameMove(raw, { x: 10, z: 3 }, pull, null);
    expect(moved.snapped).toBe(true);
    expect(moved.x).toBeCloseTo(10.2, 9);
    expect(moved.z).toBe(3);
    // Held to Z by Shift, the X pull is not taken.
    expect(snappedFrameMove(raw, { x: 10, z: 3 }, pull, "z")).toEqual({ x: 10, z: 3, snapped: false });
    // Back in the scene, the move runs along the shape's X.
    const world = framePointInWorld(frame, moved.x, 0, 0);
    expect(world.x).toBeCloseTo(10.2 * S, 9);
    expect(world.z).toBeCloseTo(-10.2 * S, 9);
  });

  it("turns a reference point into a box with no size", () => {
    const frame = shapeDragFrame({ rotation: 45 }, plate, { x: 1, y: 0, z: 1 }, fromAbove)!;
    const point = framePointInWorld(frame, 7, 2, -4);
    const box = frameBox(frame, [point])!;
    expect(box.minX).toBeCloseTo(7, 9);
    expect(box.maxX).toBeCloseTo(7, 9);
    expect(box.minZ).toBeCloseTo(-4, 9);
    expect(frameCoordinates(frame, point).y).toBeCloseTo(2, 9);
  });
});

describe("the shape's workplane while moving", () => {
  it("lies on the bottom, centred, three footprints wide with lines a snap step apart", () => {
    const frame = shapeDragFrame({ rotation: 45 }, plate, { x: 0, y: 0, z: 0 }, fromAbove)!;
    const preview = shapeWorkplanePreview(frame, { minX: -10, maxX: 30, minZ: -5, maxZ: 5, minUp: 2, maxUp: 8 }, 10, 1);
    expect(preview.size).toBe(120);
    expect(preview.spacing).toBe(1);
    const origin = frameCoordinates(frame, preview.workplane.origin);
    expect(origin.x).toBeCloseTo(10, 9);
    expect(origin.y).toBeCloseTo(2, 9);
    expect(origin.z).toBeCloseTo(0, 9);
    expect(preview.workplane.normal).toEqual(frame.normal);
  });

  it("is at least six grid blocks wide and thins out a fine snap step", () => {
    const preview = shapeWorkplanePreview(plate, { minX: 0, maxX: 2, minZ: 0, maxZ: 2, minUp: 0, maxUp: 1 }, 10, 0.1);
    expect(preview.size).toBe(60);
    // 30 mm each way in 0.1 mm steps would be 300 lines: every 5th step.
    expect(preview.spacing).toBeCloseTo(0.5, 9);
  });

  it("shows only with its setting, while a move along the shape goes on", () => {
    const base = { setting: true, alongShapeNormally: false, keyHeld: false, arrowHeld: false, dragAlongShape: false };
    expect(showsShapeWorkplane(base)).toBe(false);
    expect(showsShapeWorkplane({ ...base, keyHeld: true })).toBe(true);
    expect(showsShapeWorkplane({ ...base, keyHeld: true, setting: false })).toBe(false);
    // Setting off, an arrow alone moves along the grid.
    expect(showsShapeWorkplane({ ...base, arrowHeld: true })).toBe(false);
    // Along the shape normally: an arrow held or a drag; J then means the grid.
    const normally = { ...base, alongShapeNormally: true };
    expect(showsShapeWorkplane(normally)).toBe(false);
    expect(showsShapeWorkplane({ ...normally, arrowHeld: true })).toBe(true);
    expect(showsShapeWorkplane({ ...normally, dragAlongShape: true })).toBe(true);
    expect(showsShapeWorkplane({ ...normally, arrowHeld: true, keyHeld: true })).toBe(false);
  });
});
