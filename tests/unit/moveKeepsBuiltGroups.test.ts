import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import * as THREE from "three";
import { beforeAll, describe, expect, it } from "vitest";
import { getPartColoredMeshGeometry, rebuildShapes, shapeGeometrySignature } from "@/components/workplane/viewportShapeObjects";
import type { ThreeState } from "@/components/workplane/ViewportOverlays";
import { buildGroupedShapeFromSelection } from "@/lib/editorBooleans";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * Issue #1875: in a large design one tap on an arrow key took seconds, and so did undoing it, while dragging the same
 * body with the mouse was quick. A step of the history canonicalizes every body of the design, and that gave every
 * group a new array of parts; the view tells a group in its parts' colours by that array, so it took every such group
 * of the design down and built it again, coloured mesh included. These tests take the steps the editor takes for an
 * arrow key, an Undo and a Redo and ask the view which bodies it built again.
 */

let runtime: ManifoldToplevel;

beforeAll(async () => {
  runtime = await manifoldModule();
  runtime.setup();
  rememberManifoldRuntime(runtime);
});

function part(id: string, x: number, z: number, kind: string, color: string, more: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id, name: id, kind, color, x, z, elevation: 0, size: 12, width: 12, depth: 12, height: 10, rotation: 0, ...more } as unknown as WorkplaneShape;
}

/** Two solids of different colours with a hole through them, grouped and shown in the colours of the parts. */
async function cutGroup(name: string, x: number, z: number) {
  const built = await buildGroupedShapeFromSelection([
    part(`${name}-box`, x, z, "box", "#d41721"),
    part(`${name}-cylinder`, x + 8, z, "cylinder", "#0098c7", { sides: 48 }),
    part(`${name}-hole`, x + 4, z, "cylinder", "#888888", { hole: true, size: 4, width: 4, depth: 4, height: 30 }),
  ], 100_000);
  expect(built.group?.importedMesh).toBeTruthy();
  return { ...built.group!, id: name, name, multicolor: true };
}

/** A design of many groups: cut ones, one of solids only, one with a group inside it, and a single box to move. */
async function largeDesign() {
  const shapes: WorkplaneShape[] = [];
  for (let index = 0; index < 6; index += 1) shapes.push(await cutGroup(`cut-${index}`, index * 40, 0));
  const plain = await buildGroupedShapeFromSelection([part("plain-a", 0, 60, "box", "#f2cf10"), part("plain-b", 8, 60, "box", "#6e2786")], 100_000);
  shapes.push({ ...plain.group!, id: "plain", name: "plain", multicolor: true });
  // In one colour, or grouping would take its parts into the new group instead of the group itself.
  const inner = { ...await cutGroup("inner", 0, 120), multicolor: false };
  const nested = await buildGroupedShapeFromSelection([inner, part("outer-box", 6, 126, "box", "#78b96b"), part("outer-hole", 0, 120, "box", "#888888", { hole: true, size: 4, width: 4, depth: 4, height: 30 })], 100_000);
  shapes.push({ ...nested.group!, id: "nested", name: "nested", multicolor: true });
  shapes.push(part("lone", 200, 200, "box", "#d41721"));
  // As the editor holds a design: canonical.
  return shapes.map(canonicalizeShape);
}

function viewState() {
  return {
    scene: new THREE.Scene(),
    shapeLayer: new THREE.Group(),
    helperLayer: new THREE.Group(),
    shapeRecords: new Map(),
    sectionPlane: null,
    officialShapeLayerActive: false,
    needsRender: false,
  } as unknown as ThreeState;
}

/** What the arrow keys do to the selected bodies (translateSelectedShapes in the editor). */
function nudge(shapes: WorkplaneShape[], id: string, dx: number) {
  return shapes.map((shape) => (shape.id === id ? { ...shape, x: shape.x + dx } : shape));
}

/** What a step of the history does to the design before the view gets it (commitShapes in the editor). */
function commit(next: WorkplaneShape[]) {
  const canonical = next.map(canonicalizeShape);
  return { shapes: canonical, entry: editorHistoryEntry(canonical, []) };
}

/** What Undo and Redo hand the view: the bodies of a step of the history. */
function restore(entry: ReturnType<typeof editorHistoryEntry>) {
  return entry.shapes.map(canonicalizeShape);
}

function builtObjects(state: ThreeState) {
  return new Map([...state.shapeRecords].map(([id, record]) => [id, record.object]));
}

/** The ids of the bodies the view took down and built again between two drawings. */
function rebuilt(before: Map<string, THREE.Object3D>, state: ThreeState) {
  return [...state.shapeRecords].filter(([id, record]) => before.get(id) !== record.object).map(([id]) => id);
}

describe("a move by the arrow keys builds nothing again (Issue #1875)", () => {
  it("keeps every group of the design as built when one box is moved, undone and redone", async () => {
    const start = commit(await largeDesign());
    const state = viewState();
    rebuildShapes(state, start.shapes, ["lone"]);
    const first = builtObjects(state);
    expect(first.size).toBe(start.shapes.length);

    const moved = commit(nudge(start.shapes, "lone", 1));
    rebuildShapes(state, moved.shapes, ["lone"]);
    expect(rebuilt(first, state)).toEqual([]);
    expect(state.shapeRecords.get("lone")!.object.position.x).toBe(201);

    rebuildShapes(state, restore(start.entry), ["lone"]);
    expect(rebuilt(first, state)).toEqual([]);
    expect(state.shapeRecords.get("lone")!.object.position.x).toBe(200);

    rebuildShapes(state, restore(moved.entry), ["lone"]);
    expect(rebuilt(first, state)).toEqual([]);
    expect(state.shapeRecords.get("lone")!.object.position.x).toBe(201);
  });

  it("keeps a moved group as built, and its coloured mesh", async () => {
    const start = commit(await largeDesign());
    const state = viewState();
    rebuildShapes(state, start.shapes, ["cut-2"]);
    const first = builtObjects(state);
    const group = start.shapes.find((shape) => shape.id === "cut-2")!;
    const colours = getPartColoredMeshGeometry(group);
    expect(colours).toBeTruthy();

    const moved = commit(nudge(start.shapes, "cut-2", 5));
    rebuildShapes(state, moved.shapes, ["cut-2"]);
    expect(rebuilt(first, state)).toEqual([]);
    const movedGroup = moved.shapes.find((shape) => shape.id === "cut-2")!;
    expect(movedGroup.x).toBe(group.x + 5);
    expect(shapeGeometrySignature(movedGroup)).toBe(shapeGeometrySignature(group));
    expect(getPartColoredMeshGeometry(movedGroup)).toBe(colours);

    const undone = restore(start.entry);
    rebuildShapes(state, undone, ["cut-2"]);
    expect(rebuilt(first, state)).toEqual([]);
    expect(getPartColoredMeshGeometry(undone.find((shape) => shape.id === "cut-2")!)).toBe(colours);
  });

  it("hands back the same canonical parts for the same parts, at every depth", async () => {
    const design = await largeDesign();
    const nested = design.find((shape) => shape.id === "nested")!;
    const again = canonicalizeShape({ ...nested, x: nested.x + 3 });

    expect(again.groupedShapes).toBe(nested.groupedShapes);
    expect(canonicalizeShape(again).groupedShapes).toBe(nested.groupedShapes);
    const inner = nested.groupedShapes!.find((child) => child.groupedShapes?.length);
    expect(inner).toBeTruthy();
    if (!inner) return;
    expect(again.groupedShapes!.find((child) => child.id === inner.id)!.groupedShapes).toBe(inner.groupedShapes);
  });

  it("still builds a group again whose parts changed", async () => {
    const start = commit(await largeDesign());
    const state = viewState();
    rebuildShapes(state, start.shapes, []);
    const first = builtObjects(state);

    const recoloured = commit(start.shapes.map((shape) => (shape.id === "cut-1"
      ? { ...shape, groupedShapes: shape.groupedShapes!.map((child, index) => (index === 0 ? { ...child, color: "#00aa00" } : child)) }
      : shape)));
    const group = recoloured.shapes.find((shape) => shape.id === "cut-1")!;
    expect(group.groupedShapes![0].color).toBe("#00aa00");
    rebuildShapes(state, recoloured.shapes, []);
    expect(rebuilt(first, state)).toEqual(["cut-1"]);
  });
});
