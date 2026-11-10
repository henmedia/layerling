import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { ThreeState } from "@/components/workplane/ViewportOverlays";
import { pickRotationPivot } from "@/components/workplane/viewportPicking";
import { createShapeObject } from "@/components/workplane/viewportShapeObjects";
import { syncLayFlatHover } from "@/components/workplane/viewportTransformOverlays";
import { groupedShape } from "@/lib/editorBooleans";
import { meshDataPositions, meshForShape } from "@/lib/editorMeshCore";
import { JOINED_FACE_REACH, nearestFaceTriangle, pivotAfterJoin } from "@/lib/rotationPivot";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * The face lit under the pointer and the rotation pivot on a group of two cubes, read from the
 * group's parts joined. The join is a stand-in, the box round both cubes, so its top is told
 * apart from one cube's; the real join is in tests/e2e/faceReadGroup.e2e.ts.
 */
const cube = (id: string, x: number, z: number) => ({ id, name: "Box", kind: "box", color: "#cf101b", x, z, elevation: 0, rotation: 0, width: 20, depth: 20, size: 20, height: 20, locked: false, hidden: false } as WorkplaneShape);

function scene() {
  // Their middles 7 and 8 mm apart: the box round both is 27 x 28, its top's middle at (3.5, 20, 4).
  const group = groupedShape([cube("a", 0, 0), cube("b", 7, 8)])!;
  const box = new THREE.BoxGeometry(27, 20, 28, 2, 1, 2).translate(3.5, 10, 4).toNonIndexed();
  const joined = Array.from(box.getAttribute("position").array);
  const object = createShapeObject(group);
  const shapeLayer = new THREE.Group();
  shapeLayer.add(object);
  shapeLayer.updateMatrixWorld(true);
  // Straight down onto cube a only, away from cube b.
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 1000);
  camera.position.set(-3, 100, -3);
  camera.up.set(0, 0, -1);
  camera.lookAt(-3, 0, -3);
  camera.updateMatrixWorld(true);
  const state = {
    renderer: { domElement: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 400 }) } },
    pointer: new THREE.Vector2(),
    raycaster: new THREE.Raycaster(),
    camera,
    scene: new THREE.Scene(),
    shapeLayer,
    sectionPlane: null,
  } as unknown as ThreeState;
  return { state, group, joined };
}

/** The area the highlight under the pointer covers. */
function litArea(state: ThreeState) {
  const position = (state.layFlatHoverLayer?.children[0] as THREE.Mesh).geometry.getAttribute("position");
  const [a, b, c] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  let area = 0;
  for (let offset = 0; offset < position.count; offset += 3) {
    a.fromBufferAttribute(position, offset);
    b.fromBufferAttribute(position, offset + 1);
    c.fromBufferAttribute(position, offset + 2);
    area += new THREE.Triangle(a, b, c).getArea();
  }
  return area;
}

describe("a group's joined face under the pointer", () => {
  it("lights one cube's top until the join is there, then the joined top at the same spot", () => {
    const { state, group, joined } = scene();
    syncLayFlatHover(state, [group.id], "light", 200, 200);
    expect(litArea(state)).toBeCloseTo(400, 3);
    syncLayFlatHover(state, [group.id], "light", 200, 200, false, joined);
    expect(litArea(state)).toBeCloseTo(27 * 28, 3);
  });

  it("lights the cube's own face when the joined body has no face where the pointer is", () => {
    const { state, group, joined } = scene();
    const lifted = joined.map((value, index) => (index % 3 === 1 ? value + 1 : value));
    syncLayFlatHover(state, [group.id], "light", 200, 200, false, lifted);
    expect(litArea(state)).toBeCloseTo(400, 3);
  });

  it("lights the cube's own face for a joined body too dense to search on every move, and for a round face", () => {
    const { state, group, joined } = scene();
    const dense = new Float64Array(600_003 * 3);
    dense.set(joined);
    syncLayFlatHover(state, [group.id], "light", 200, 200, false, dense);
    expect(litArea(state)).toBeCloseTo(400, 3);
    syncLayFlatHover(state, [group.id], "light", 200, 200, true, joined);
    expect(litArea(state)).not.toBeCloseTo(27 * 28, 0);
  });

  it("lights the face again when another joined read comes, or the cube's own when it is let go, with the pointer still", () => {
    const { state, group, joined } = scene();
    syncLayFlatHover(state, [group.id], "light", 200, 200, false, joined);
    expect(litArea(state)).toBeCloseTo(27 * 28, 3);
    // The same group read again, as after an edit: a new read of the same top lights it again.
    const again = Float64Array.from(joined);
    syncLayFlatHover(state, [group.id], "light", 200, 200, false, again);
    expect(litArea(state)).toBeCloseTo(27 * 28, 3);
    syncLayFlatHover(state, [group.id], "light", 200, 200, false, again.slice(0, 6 * 9));
    expect(litArea(state)).not.toBeCloseTo(27 * 28, 0);
    syncLayFlatHover(state, [group.id], "light", 200, 200, false, null);
    expect(litArea(state)).toBeCloseTo(400, 3);
  });

  it("does not search the joined body again while the pointer stays on the joined face it lit", () => {
    const { state, group, joined } = scene();
    syncLayFlatHover(state, [group.id], "light", 200, 200, false, joined);
    const lit = state.layFlatHoverLayer?.children[0];
    // Over cube b only, still on the joined top.
    syncLayFlatHover(state, [group.id], "light", 359, 359, false, joined);
    expect(state.layFlatHoverLayer?.children[0]).toBe(lit);
    expect(litArea(state)).toBeCloseTo(27 * 28, 3);
    syncLayFlatHover(state, [group.id], "dark", 359, 359, false, joined);
    expect(state.layFlatHoverLayer?.children[0]).not.toBe(lit);
  });

  it("searches again when the pointer leaves the joined face it lit", () => {
    const { state, group, joined } = scene();
    // Only the joined top's quarter over cube a's middle: the spot over cube b is off it.
    const quarter: number[] = [];
    for (let offset = 0; offset < joined.length; offset += 9) {
      const triangle = joined.slice(offset, offset + 9);
      const onTop = [1, 4, 7].every((index) => Math.abs(triangle[index] - 20) < 1e-9);
      if (onTop && [0, 3, 6].every((index) => triangle[index] <= 3.5) && [2, 5, 8].every((index) => triangle[index] <= 4)) quarter.push(...triangle);
    }
    syncLayFlatHover(state, [group.id], "light", 200, 200, false, quarter);
    expect(litArea(state)).toBeCloseTo(13.5 * 14, 3);
    syncLayFlatHover(state, [group.id], "light", 359, 359, false, quarter);
    expect(litArea(state)).toBeCloseTo(400, 3);
  });

  it("lights the joined top again when the pointer leaves the body and comes back", () => {
    const { state, group, joined } = scene();
    syncLayFlatHover(state, [group.id], "light", 200, 200, false, joined);
    // Beside the group, over nothing.
    syncLayFlatHover(state, [group.id], "light", 5, 5, false, joined);
    expect(state.layFlatHoverLayer?.children).toHaveLength(0);
    syncLayFlatHover(state, [group.id], "light", 200, 200, false, joined);
    expect(litArea(state)).toBeCloseTo(27 * 28, 3);
  });

  it("hands the pivot the face it hit, so the editor can take the joined face's middle", () => {
    const { state, group, joined } = scene();
    const pick = pickRotationPivot(state, 200, 200);
    expect(pick?.face?.shapeId).toBe(group.id);
    expect(pick?.point.x).toBeCloseTo(0, 6);
    expect(pick?.point.z).toBeCloseTo(0, 6);
    const pivot = pick?.face ? pivotAfterJoin(pick.point, pick.face, joined) : null;
    expect(pivot?.x).toBeCloseTo(3.5, 6);
    expect(pivot?.y).toBeCloseTo(20, 6);
    expect(pivot?.z).toBeCloseTo(4, 6);
  });
});

describe("a group as drawn and as the face readers take it", () => {
  // The joined body comes from meshForShape; a point on the drawn face must lie within reach of it.
  it.each([
    ["turned", { rotation: 30 }],
    ["mirrored", { mirrorX: true }],
    ["tapered", {}],
  ])("draws a %s group where meshForShape puts it", (kind, transform) => {
    const parts = kind === "tapered" ? [cube("a", 0, 0), { ...cube("b", 7, 8), taperTopWidth: 10, taperTopDepth: 12 } as WorkplaneShape] : [cube("a", 0, 0), cube("b", 7, 8)];
    const group = { ...groupedShape(parts)!, ...transform };
    const read = meshDataPositions(meshForShape(group));
    const object = createShapeObject(group);
    object.updateMatrixWorld(true);
    let checked = 0;
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const geometry = (child.geometry as THREE.BufferGeometry).index ? (child.geometry as THREE.BufferGeometry).toNonIndexed() : child.geometry as THREE.BufferGeometry;
      const position = geometry.getAttribute("position");
      const [a, b, c] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
      for (let offset = 0; offset < position.count; offset += 3) {
        a.fromBufferAttribute(position, offset).applyMatrix4(child.matrixWorld);
        b.fromBufferAttribute(position, offset + 1).applyMatrix4(child.matrixWorld);
        c.fromBufferAttribute(position, offset + 2).applyMatrix4(child.matrixWorld);
        const normal = b.clone().sub(a).cross(c.clone().sub(a));
        if (normal.lengthSq() < 1e-12) continue;
        const middle = a.clone().add(b).add(c).divideScalar(3);
        expect(nearestFaceTriangle(read, middle, normal, JOINED_FACE_REACH)).toBeGreaterThanOrEqual(0);
        checked += 1;
      }
    });
    expect(checked).toBeGreaterThan(20);
  });
});

describe("the editor's wiring of a group's joined face", () => {
  // No test mounts the editor: its source is read, spaces folded, for the rules that hold it together.
  const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8").replace(/\s+/g, " ");
  const editor = read("../../apps/web/src/components/LayerlingEditor.tsx");
  const viewport = read("../../apps/web/src/components/WorkplaneViewport.tsx");
  const between = (text: string, start: string, end: string) => {
    const from = text.indexOf(start);
    const to = text.indexOf(end, from);
    if (from < 0 || to < 0) throw new Error(`not found: ${from < 0 ? start : end}`);
    return text.slice(from, to);
  };
  const opening = between(editor, "const faceJoinSourceId =", "const faceJoinPositions =");

  it("reads ahead once the body has been still a moment, not while a part is dragged, and drops the read when the step ends or the body changes", () => {
    expect(opening).toContain("faceReads.readAhead(faceJoinSource, faceJoinFingerprint), 250);");
    expect(opening).toContain("faceReadInWorker(faceJoinSource) ? projectShapesFingerprint");
    expect(opening).toContain("|| projectInteractionActive) return;");
    expect(opening).toContain("faceReads.drop(geometryAbortRef.current?.signal.aborted);");
    expect(opening).toContain("}, [faceJoinFingerprint, faceReads, projectInteractionActive]);");
    expect(between(opening, "faceReads.drop(", "faceReads.readAhead(")).toContain("}, [faceJoinFingerprint, faceReads]);");
  });

  it("lets only the clicks share the kept read, never an MCP action", () => {
    // The hole pattern's, the Face tool's and the support rib's (#1385).
    expect(editor.match(/faceReadForClick\(/g)).toHaveLength(3);
    expect(editor.match(/faceReads\.forClick\(/g)).toHaveLength(1);
    // A click's read counts only for the body as it stands.
    expect(between(editor, "const faceReadForClick =", "}), [faceReads]);")).toContain("return latest ? projectShapesFingerprint([latest]) === fingerprint : false;");
  });

  it("lets go of the kept read's triangles with the read, and lights them only for the body read", () => {
    expect(between(opening, "faceReads.drop(", "}, [faceJoinFingerprint, faceReads]);")).toContain("setFaceReadAhead(null);");
    expect(editor).toContain("const faceJoinPositions = faceReadAhead && faceReadAhead.fingerprint === faceJoinFingerprint ? faceReadAhead.positions : null;");
  });

  it("lights the face again whenever the joined read changes, and forgets the pointer when the pick ends", () => {
    // The hole pattern's pick lights a round wall as well (#1393).
    // The support rib lights a flat face as the Face tool does (#1385).
    expect(editor.match(/joined: faceJoinPositions(?:, round: "either")? \}/g)).toHaveLength(3);
    expect(between(viewport, "const mateFaceJoined =", "}, [mateFaceJoined]);")).toContain("pick.round, mateFaceJoined);");
    expect(viewport).toContain("if (!mateFacePick) mateFaceHoverRef.current = null;");
  });

  it("calls a pivot click's read off on the next click and when the pivot mode ends, and writes the pivot on the body as it stands", () => {
    const pivot = between(editor, "const pickRotationPivot = useCallback", "}, [ownPivotShape, selectionKey]);");
    expect(pivot.indexOf("callOffFaceRead(pivotPickAbortRef.current")).toBeGreaterThan(-1);
    expect(pivot.indexOf("callOffFaceRead(pivotPickAbortRef.current")).toBeLessThan(pivot.indexOf("await faceReadPositionsOffThread"));
    expect(pivot).toContain("if (target && face && source && faceReadInWorker(source)) {");
    // Another click, the pivot mode ended, or the selection or the body changed during the read: it no longer counts.
    for (const guard of ["pivotPickRunRef.current !== run", "!pivotPickModeRef.current", "selectedIdsRef.current.join(\"|\") !== selectionKey", "projectShapesFingerprint([latest]) !== fingerprint"]) {
      expect(pivot.indexOf(guard)).toBeLessThan(pivot.indexOf("point = pivotAfterJoin("));
      expect(pivot.indexOf(guard)).toBeGreaterThan(pivot.indexOf("await faceReadPositionsOffThread"));
    }
    expect(pivot).toContain("writeOwnPivotRef.current(own.id, shapePivotFromWorld(own, point));");
    expect(editor).toContain("if (!pivotPickMode) callOffFaceRead(pivotPickAbortRef.current");
  });
});
