import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { selectionFrameForShapes } from "@/components/workplane/viewportShapeObjects";
import { cornerKeepsBothSides, snapResizeSides, type ResizeSnapSide, resizeAnchorPointForFrame, resizeSelectionFromHandle, resizeShapeFromFrameHandle, resizeSignsForHandle, type TransformDragState } from "@/components/workplane/viewportResize";
import { shapeCenter } from "@/components/workplane/ViewportOverlays";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * A corner handle snaps both of its sides, each to the edge or wall it comes near, as a side handle does since
 * Discussion #1647: each snapped side keeps its size off the grid, the other stays on it.
 */

function box(id: string, width: number, depth: number, x = 0, z = 0, rotation = 0): WorkplaneShape {
  return { id, name: id, kind: "box", color: "#d41721", x, z, elevation: 0, size: Math.max(width, depth), width, depth, height: 10, rotation, rotationX: 0, rotationZ: 0 } as WorkplaneShape;
}

/** The near-right corner pulled so that the frame's own x and z sizes would come out at `size.x` and `size.z`. */
function pull(shapes: WorkplaneShape[], size: { x: number; z: number }) {
  const ids = shapes.map((shape) => shape.id);
  const frame = selectionFrameForShapes(shapes, ids)!;
  const signs = resizeSignsForHandle("near-right");
  const start = frame.center.clone().addScaledVector(frame.xAxis, frame.width / 2).addScaledVector(frame.zAxis, frame.depth / 2);
  const point = start.clone().addScaledVector(frame.xAxis, size.x - frame.width).addScaledVector(frame.zAxis, size.z - frame.depth);
  const transform = {
    startShape: shapes[0],
    items: shapes.map((shape) => ({ id: shape.id, startShape: shape, startCenter: shapeCenter(shape), startQuaternion: new THREE.Quaternion() })),
    selectionFrame: frame,
    scaleStartPoint: start,
    scaleSigns: signs,
    scaleAnchorPoint: resizeAnchorPointForFrame(frame, signs),
  } as unknown as TransformDragState;
  return { transform, point };
}

describe("a corner handle keeps each snapped side off the grid", () => {
  const wanted = { x: 36.003, z: 26.4 };

  it("keeps both sizes, one of them or neither off the grid on one body, as its free sides say", () => {
    const { transform, point } = pull([box("a", 20, 20)], wanted);
    const resize = (free?: readonly ("x" | "z")[]) => resizeShapeFromFrameHandle(transform, point, "near-right", false, false, 1, 220, free);
    expect(resize(["x", "z"])).toMatchObject({ width: 36.003, depth: 26.4 });
    expect(resize(["x"])).toMatchObject({ width: 36.003, depth: 26 });
    expect(resize(["z"])).toMatchObject({ width: 36, depth: 26.4 });
    expect(resize()).toMatchObject({ width: 36, depth: 26 });
  });

  it("frees the body's own size along the frame's axis on a body turned a quarter turn", () => {
    const { transform, point } = pull([box("a", 20, 12, 0, 0, 90)], wanted);
    expect(transform.selectionFrame.xAxis.z).toBeCloseTo(-1, 6);
    const free = resizeShapeFromFrameHandle(transform, point, "near-right", false, false, 1, 220, ["x"]);
    // The frame's x is the body's own width: that one keeps the snapped size, the depth goes to the grid.
    expect(free.width).toBeCloseTo(36.003, 9);
    expect(free.depth).toBeCloseTo(26, 9);
  });

  it("keeps the snapped sizes off the grid on several bodies scaled together", () => {
    const shapes = [box("a", 10, 10, -5, -5), box("b", 10, 10, 5, 5)];
    const { transform, point } = pull(shapes, wanted);
    const resize = (free?: readonly ("x" | "z")[]) => resizeSelectionFromHandle(transform, point, "near-right", false, false, 1, 220, free);
    const both = resize(["x", "z"]);
    expect(both[0].patch.width).toBeCloseTo((10 * 36.003) / 20, 9);
    expect(both[0].patch.depth).toBeCloseTo((10 * 26.4) / 20, 9);
    const x = resize(["x"]);
    expect(x[0].patch.width).toBeCloseTo((10 * 36.003) / 20, 9);
    expect(x[0].patch.depth).toBeCloseTo((10 * 26) / 20, 9);
    const grid = resize();
    expect(grid[0].patch.width).toBeCloseTo((10 * 36) / 20, 9);
    expect(grid[0].patch.depth).toBeCloseTo((10 * 26) / 20, 9);
  });
});

describe("a corner snaps each of its sides to the edge or wall it comes near", () => {
  // A part 10.3 square at (10, 5): its near-right corner pulled out, its far-left corner at (4.85, -0.15) staying.
  const part = box("a", 10.3, 10.3, 10, 5);
  const frame = selectionFrameForShapes([part], ["a"])!;
  const signs = resizeSignsForHandle("near-right");
  const anchor = resizeAnchorPointForFrame(frame, signs);
  // Narrow walls, so each guide shows how far it reaches over the dragged side.
  const right: ResizeSnapSide = { frameAxis: "x", worldAxis: "x", worldDirection: 1, targets: [{ value: 36, from: 2, to: 3 }], movingFrom: -0.15, movingTo: 10.15 };
  const front: ResizeSnapSide = { frameAxis: "z", worldAxis: "z", worldDirection: 1, targets: [{ value: 26, from: 30, to: 31 }], movingFrom: 4.85, movingTo: 15.15 };
  const snap = (pull: THREE.Vector3, altKey = false, maxSize = 220) => snapResizeSides([right, front], frame, signs, pull, altKey ? frame.center : anchor, altKey, 1, maxSize, 1);
  const expectGuides = (guides: { axis: string; value: number; from: number; to: number }[], wanted: [string, number, number, number][]) => {
    expect(guides).toHaveLength(wanted.length);
    wanted.forEach(([axis, value, from, to], index) => {
      expect(guides[index].axis).toBe(axis);
      expect(guides[index].value).toBe(value);
      expect(guides[index].from).toBeCloseTo(from, 9);
      expect(guides[index].to).toBeCloseTo(to, 9);
    });
  };

  it("pulls both sides onto their walls, frees both sizes and draws a guide for each over the other side's new length", () => {
    // The pull takes the right side to 35.75 and the front to 25.65, each within 1 of its wall.
    const result = snap(new THREE.Vector3(20.6, 0, 15.5));
    expect(result.shift.x).toBeCloseTo(0.25, 9);
    expect(result.shift.z).toBeCloseTo(0.35, 9);
    expect(result.freeAxes).toEqual(["x", "z"]);
    expectGuides(result.guides, [["x", 36, -0.15, 26], ["z", 26, 4.85, 36]]);
  });

  it("leaves a side that is not near anything on the grid, and the snapped side's guide over where it lands there", () => {
    // The front is pulled 12.3 deep from the far side at -0.15, which the 1 mm grid makes 12: it lands at 11.85.
    const result = snap(new THREE.Vector3(20.6, 0, 2));
    expect(result.shift.x).toBeCloseTo(0.25, 9);
    expect(result.shift.z).toBe(0);
    expect(result.freeAxes).toEqual(["x"]);
    expectGuides(result.guides, [["x", 36, -0.15, 11.85]]);
  });

  it("with Alt grows from the middle, twice as fast, and still lands each side on its wall", () => {
    // From the middle (10, 5) the right side moves twice the pull: 20.75 makes it 51.8 wide, its side at 35.9, 0.1 short of 36.
    const result = snap(new THREE.Vector3(20.75, 0, 0), true);
    expect(result.shift.x).toBeCloseTo(0.1, 9);
    expect(result.freeAxes).toEqual(["x"]);
    // The front side, not snapped, keeps its 10.3, which the grid makes 10 deep about the middle at 5.
    expectGuides(result.guides, [["x", 36, 0, 10]]);
  });

  it("ends the snapped side's guide where the size limit stops the other side", () => {
    // The front is pulled 50.3 deep, which a limit of 40 cuts to 40: it stops at 39.85.
    const result = snap(new THREE.Vector3(20.6, 0, 40), false, 40);
    expect(result.freeAxes).toEqual(["x"]);
    expectGuides(result.guides, [["x", 36, -0.15, 39.85]]);
  });

  // A tray 20 square at the origin, its far-left corner at (-10, -10) staying, its front pulled 15 back to 5 deep.
  const tray = { ...box("t", 20, 20), kind: "gridfinity", gridfinityType: "tray" } as WorkplaneShape;
  const trayFrame = selectionFrameForShapes([tray], ["t"])!;
  const trayRight: ResizeSnapSide = { ...right, targets: [{ value: 36, from: -9, to: -8 }], movingFrom: -10, movingTo: 10 };
  const snapTray = (trayFront: ResizeSnapSide) => snapResizeSides([trayRight, trayFront], trayFrame, signs, new THREE.Vector3(25.8, 0, -15), resizeAnchorPointForFrame(trayFrame, signs), false, 1, 220, 1, tray);

  it("ends the snapped side's guide where a Gridfinity tray on its own keeps the other side, at least 10 deep", () => {
    // The front is 5 deep on the grid, which the tray keeps at 10, so it ends at 0. The wall's short stretch lies inside that.
    const result = snapTray(front);
    expect(result.freeAxes).toEqual(["x"]);
    expectGuides(result.guides, [["x", 36, -10, 0]]);
  });

  it("ends the snapped side's guide where a Gridfinity tray on its own keeps the other side when that one snaps too", () => {
    // The front snaps to a wall at -4, 6 deep, which the tray keeps at 10 as well: the right side's guide still ends at 0.
    const result = snapTray({ ...front, targets: [{ value: -4, from: 30, to: 31 }] });
    expect(result.freeAxes).toEqual(["x", "z"]);
    expectGuides(result.guides, [["x", 36, -10, 0], ["z", -4, -10, 36]]);
  });

  it("draws the guide past the anchor when the other side is pulled over it", () => {
    // The front side pulled 15 back, past the far side: 4.7 deep there, 5 on the grid, from -0.15 back to -5.15.
    const result = snap(new THREE.Vector3(20.6, 0, -15));
    expectGuides(result.guides, [["x", 36, -5.15, 3]]);
  });

  it("takes each side's own sign and size, on a part longer one way pulled by its near-left corner", () => {
    // 10.3 wide and 14.3 deep at (10, 5): the near-left corner moves left and forward, the far-right one (15.15, -2.15) stays.
    const long = box("b", 10.3, 14.3, 10, 5);
    const longFrame = selectionFrameForShapes([long], ["b"])!;
    const nearLeft = resizeSignsForHandle("near-left");
    const leftWall: ResizeSnapSide = { frameAxis: "x", worldAxis: "x", worldDirection: -1, targets: [{ value: -36, from: 2, to: 3 }], movingFrom: -2.15, movingTo: 12.15 };
    const frontWall: ResizeSnapSide = { frameAxis: "z", worldAxis: "z", worldDirection: 1, targets: [{ value: 26, from: 30, to: 31 }], movingFrom: 4.85, movingTo: 15.15 };
    // The pull takes the left side to -35.75 (50.9 wide) and the front to 25.75 (27.9 deep), each within 1 of its wall.
    const longAnchor = resizeAnchorPointForFrame(longFrame, nearLeft);
    const result = snapResizeSides([leftWall, frontWall], longFrame, nearLeft, new THREE.Vector3(-40.6, 0, 13.6), longAnchor, false, 1, 220, 1);
    expect(result.shift.x).toBeCloseTo(-0.25, 9);
    expect(result.shift.z).toBeCloseTo(0.25, 9);
    expect(result.freeAxes).toEqual(["x", "z"]);
    expectGuides(result.guides, [["x", -36, -2.15, 26], ["z", 26, -36, 31]]);
    // Pulled 20 left, the left side is 30.3 wide, far from its wall: 30 on the grid, so the front's guide reaches left from 15.15 to -14.85.
    const frontOnly = snapResizeSides([leftWall, frontWall], longFrame, nearLeft, new THREE.Vector3(-20, 0, 13.6), longAnchor, false, 1, 220, 1);
    expect(frontOnly.freeAxes).toEqual(["z"]);
    expectGuides(frontOnly.guides, [["z", 26, -14.85, 31]]);
  });

  it("does nothing for a side dragged past its anchor, nor without targets near", () => {
    expect(snap(new THREE.Vector3(-30, 0, 0)).freeAxes).toEqual([]);
    expect(snap(new THREE.Vector3(5, 0, 5)).guides).toEqual([]);
  });
});

describe("which bodies keep both sizes a corner pulls them to", () => {
  const shape = (extra: Partial<WorkplaneShape>) => ({ ...box("a", 10, 10), ...extra }) as WorkplaneShape;

  it("boxes, racks, trays, outlined baseplates and stretched text do", () => {
    for (const extra of [{}, { kind: "gear", gearType: "rack", gearProfile: "involute" }, { kind: "gridfinity", gridfinityType: "tray" }, { kind: "gridfinity", gridfinityType: "baseplate", gridfinityOutline: [{ x: 0, z: 0 }, { x: 2, z: 0 }, { x: 2, z: 2 }] }, { kind: "text", textStretch: true }] as Partial<WorkplaneShape>[]) {
      expect(cornerKeepsBothSides(shape(extra)), JSON.stringify(extra)).toBe(true);
    }
  });

  it("round bodies, threads, Gridfinity bins and plain baseplates, and text that is not stretched or is curved do not", () => {
    const round = ["cylinder", "star", "knurl", "hirth", "pulley", "finishingWasher", "thread"].map((kind) => ({ kind }));
    for (const extra of [...round, { kind: "gear", gearType: "spur", gearProfile: "involute" }, { kind: "gridfinity", gridfinityType: "bin" }, { kind: "gridfinity", gridfinityType: "baseplate" }, { kind: "text" }, { kind: "text", textStretch: true, textCurved: true }] as Partial<WorkplaneShape>[]) {
      expect(cornerKeepsBothSides(shape(extra)), JSON.stringify(extra)).toBe(false);
    }
  });
});
