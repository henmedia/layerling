import { describe, expect, it } from "vitest";
import { selectionFrameForShapes } from "@/components/workplane/viewportShapeObjects";
import { meshForShape } from "@/lib/editorMeshCore";
import { noteAnchorWorld } from "@/lib/noteAnchoring";
import { shapeIsTurned, shapePivotFromWorld, shapePivotWorld } from "@/lib/rotationPivot";
import { canTakeRotationAsZero, notesOnNewFrame, rotationTakenAsZero } from "@/lib/rotationZero";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { WorkplaneNote, WorkplaneShape } from "@/types/layerling";

/** A lopsided tetrahedron standing on y = 0, its box centred in x and z. */
const CORNERS = [[-5, 0, -10], [5, 0, -10], [-5, 0, 10], [2, 8, 3]];
const positions = [[0, 1, 2], [0, 3, 1], [1, 3, 2], [2, 3, 0]].flatMap((face) => face.flatMap((index) => CORNERS[index]));

function turnedMesh(patch: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return canonicalizeShape({
    id: "a", name: "Lightning", kind: "mesh", color: "#ffffff", x: 12, z: -7, elevation: 3, size: 20, width: 10, depth: 20, height: 8,
    rotation: 45, rotationX: 30, rotationZ: -20,
    importedMesh: { positions, baseWidth: 10, baseDepth: 20, baseHeight: 8, triangleCount: 4, sourceFormat: "stl", assetId: "file" },
    ...patch,
  } as WorkplaneShape);
}

function expectSameSpot(before: WorkplaneShape, after: WorkplaneShape) {
  const a = meshForShape(before);
  const b = meshForShape(after);
  expect(b.faces.length).toBe(a.faces.length);
  a.faces.forEach((face, f) => face.forEach((index, corner) => {
    const there = b.vertices[b.faces[f][corner]];
    a.vertices[index].forEach((value, axis) => expect(there[axis]).toBeCloseTo(value, 5));
  }));
}

describe("a mesh's rotation taken as zero (Discussion #2067)", () => {
  it("leaves the body where it stands, with its angles 0 and its handles along the plate", () => {
    const before = turnedMesh();
    const after = canonicalizeShape(rotationTakenAsZero(before)!);
    expect(shapeIsTurned(after)).toBe(false);
    expectSameSpot(before, after);
    const frame = selectionFrameForShapes([after], ["a"])!;
    [[frame.xAxis, [1, 0, 0]], [frame.yAxis, [0, 1, 0]], [frame.zAxis, [0, 0, 1]]].forEach(([axis, want]) =>
      (axis as { toArray(): number[] }).toArray().forEach((value, i) => expect(value).toBeCloseTo((want as number[])[i], 9)));
    // The file it came from is the unturned mesh, so it is no longer this body.
    expect(after.importedMesh?.assetId).toBeUndefined();
  });

  it("takes in a resize and a mirror", () => {
    const before = turnedMesh({ width: 25, height: 12, mirrorX: true });
    const after = canonicalizeShape(rotationTakenAsZero(before)!);
    expect(after.mirrorX).toBeFalsy();
    expectSameSpot(before, after);
  });

  it("turns the mesh's own normals with it", () => {
    const normals = positions.map((_, i) => (i % 3 === 1 ? 1 : 0));
    const before = turnedMesh({ rotation: 0, rotationX: 90, rotationZ: 0 });
    const after = rotationTakenAsZero({ ...before, importedMesh: { ...before.importedMesh!, normals } })!;
    [0, 0, 1].forEach((value, i) => expect(after.importedMesh!.normals![i]).toBeCloseTo(value, 9));
  });

  it("keeps the pivot and pinned notes on their spot", () => {
    const plain = turnedMesh();
    const before = { ...plain, rotationPivot: shapePivotFromWorld(plain, { x: 20, y: 5, z: 1 } as never) };
    const after = rotationTakenAsZero(before)!;
    const pivot = shapePivotWorld(after)!;
    [pivot.x, pivot.y, pivot.z].forEach((value, i) => expect(value).toBeCloseTo([20, 5, 1][i], 5));
    const note = { id: "n", text: "x", x: 0, y: 0, z: 0, anchor: { shapeId: "a", normalized: [0.3, 0.5, -0.2] } } as WorkplaneNote;
    const free = { id: "f", text: "y", x: 0, y: 0, z: 0 } as WorkplaneNote;
    const [moved, kept] = notesOnNewFrame([note, free], before, after);
    const was = noteAnchorWorld(before, note.anchor!.normalized);
    const now = noteAnchorWorld(after, moved.anchor!.normalized);
    (["x", "y", "z"] as const).forEach((axis) => expect(now[axis]).toBeCloseTo(was[axis], 5));
    expect(kept).toBe(free);
  });

  it("refuses what would lose something", () => {
    expect(canTakeRotationAsZero(turnedMesh())).toBe(true);
    expect(rotationTakenAsZero(turnedMesh({ rotation: 0, rotationX: 0, rotationZ: 0 }))).toBeNull();
    const box = turnedMesh({ kind: "box", importedMesh: undefined });
    const group = turnedMesh({ groupedShapes: [turnedMesh()] });
    const painted = { ...turnedMesh(), paint: [{}] } as unknown as WorkplaneShape;
    const textured = { ...turnedMesh(), surfaceTexture: {} } as unknown as WorkplaneShape;
    const exact = { ...turnedMesh(), cadBrep: "x" };
    const wrapped = { ...turnedMesh(), cylinderWrap: { diameter: 20 } };
    [box, group, painted, textured, exact, wrapped].forEach((shape) => {
      expect(canTakeRotationAsZero(shape)).toBe(false);
      expect(rotationTakenAsZero(shape)).toBeNull();
    });
  });
});
