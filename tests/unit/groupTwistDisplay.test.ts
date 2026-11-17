import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { groupedShape } from "@/lib/editorBooleans";
import { applyGroupedContentTaper, createShapeObject, syncShapeObjectAppearance } from "@/components/workplane/viewportShapeObjects";
import { meshAabb } from "@/lib/editorMeshCore";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * A twisted bundle in the viewport (#1419): its parts are cut into the same height bands as its
 * mesh, so the legs wind round as they are exported. Turned at their ends only, the legs stayed
 * straight bars, the bundle was drawn 30 mm across instead of 42.4, and a group of it with two
 * plates stretched the plates by 1.41 to fill the group's true width on Ctrl+G.
 */

function box(id: string, x: number, z: number, elevation: number, width: number, depth: number, height: number, extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id, name: id, kind: "box", color: "#6e2786", x, z, elevation, size: Math.max(width, depth), width, depth, height, rotation: 0, rotationX: 0, rotationZ: 0, ...extra } as unknown as WorkplaneShape;
}

function twistedBundle(mirrored = false) {
  const legs = [
    box("l1", -12.5, -12.5, 5, 5, 5, 30),
    box("l2", 12.5, -12.5, 5, 5, 5, 30, mirrored ? { mirrorX: true } : {}),
    box("l3", 12.5, 12.5, 5, 5, 5, 30),
    box("l4", -12.5, 12.5, 5, 5, 5, 30),
  ];
  return { ...groupedShape(legs)!, name: "Bundle", groupOperation: "bundle", extrudeTwist: 90 } as WorkplaneShape;
}

function sizeOf(object: THREE.Object3D, only?: (child: THREE.Object3D) => boolean) {
  object.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh || child instanceof THREE.Line)) return;
    if (only && !only(child)) return;
    bounds.union(new THREE.Box3().setFromObject(child, true));
  });
  return bounds.getSize(new THREE.Vector3());
}

describe("a twisted bundle in the viewport (#1419)", () => {
  it("is drawn as wide as its mesh: the legs wind round", () => {
    const bundle = twistedBundle();
    const mesh = meshAabb(bundle);
    expect(mesh.maxX - mesh.minX).toBeCloseTo(30 * Math.SQRT2, 1);
    const drawn = sizeOf(createShapeObject(bundle, false, undefined, false), (child) => child instanceof THREE.Mesh);
    expect(drawn.x).toBeCloseTo(mesh.maxX - mesh.minX, 1);
    expect(drawn.z).toBeCloseTo(mesh.maxZ - mesh.minZ, 1);
    expect(drawn.y).toBeCloseTo(30, 3);
  });

  it("draws its edge lines along the wound legs", () => {
    const bundle = twistedBundle();
    const object = createShapeObject(bundle, true, undefined, false);
    const lines = sizeOf(object, (child) => child instanceof THREE.LineSegments);
    expect(lines.x).toBeCloseTo(30 * Math.SQRT2, 1);
    expect(lines.z).toBeCloseTo(30 * Math.SQRT2, 1);
  });

  it("outlines only the legs' real edges when it is selected, not a line at every band", () => {
    const bundle = twistedBundle();
    const segments = (object: THREE.Object3D) => {
      let count = 0;
      object.traverse((child) => {
        if (child instanceof THREE.LineSegments) count += child.geometry.getAttribute("position").count / 2;
      });
      return count;
    };
    const builtSelected = segments(createShapeObject(bundle, true, undefined, false));
    expect(builtSelected).toBeGreaterThan(0);
    const object = createShapeObject(bundle, false, undefined, false);
    // Selecting it later draws its lines from the banded legs; at 1 degree every band's fold was a line (5676 instead of 352).
    syncShapeObjectAppearance(object, bundle, true, false);
    const synced = segments(object);
    expect(synced).toBeGreaterThan(0);
    expect(synced).toBeLessThanOrEqual(builtSelected);
  });

  it("keeps the plates of a group at their own size", () => {
    const group = groupedShape([box("top", 0, 0, 35, 30, 30, 5), box("bottom", 0, 0, 0, 30, 30, 5), twistedBundle()])!;
    expect(group.width).toBeCloseTo(30 * Math.SQRT2, 1);
    const object = createShapeObject(group, false, undefined, false);
    const content = object.children.find((child) => child.userData.groupedShapeContent)!;
    expect(content.scale.x).toBeCloseTo(1, 3);
    expect(content.scale.z).toBeCloseTo(1, 3);
    object.updateMatrixWorld(true);
    const plates: THREE.Object3D[] = [];
    object.traverse((child) => {
      if (String(child.userData.groupChildId ?? "").startsWith("top") || String(child.userData.groupChildId ?? "").startsWith("bottom")) plates.push(child);
    });
    expect(plates).toHaveLength(2);
    plates.forEach((plate) => {
      const size = sizeOf(plate, (child) => child instanceof THREE.Mesh);
      expect(size.x).toBeCloseTo(30, 2);
      expect(size.y).toBeCloseTo(5, 2);
      expect(size.z).toBeCloseTo(30, 2);
    });
  });

  it("keeps the corner colours of a part-coloured part, turned at its own corners as before", () => {
    const content = new THREE.Group();
    const plain = new THREE.Mesh(new THREE.BoxGeometry(5, 30, 5), new THREE.MeshStandardMaterial());
    plain.position.set(-12.5, 15, -12.5);
    const geometry = new THREE.BoxGeometry(5, 30, 5);
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(new Array(geometry.getAttribute("position").count * 3).fill(0.5), 3));
    const coloured = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true }));
    coloured.position.set(12.5, 15, 12.5);
    content.add(plain, coloured);
    const bounds = new THREE.Box3().setFromObject(content, true);
    applyGroupedContentTaper(content, { ...twistedBundle(), extrudeTwist: 90 }, bounds);
    // The plain part is cut into bands; the coloured one keeps its colours (lost, it would turn black).
    expect(plain.geometry.getAttribute("position").count).toBeGreaterThan(36 * 3);
    expect(coloured.geometry.getAttribute("color")).toBeTruthy();
    expect(coloured.geometry.getAttribute("color").count).toBe(coloured.geometry.getAttribute("position").count);
  });

  it("lights a mirrored leg from outside", () => {
    const object = createShapeObject(twistedBundle(true), false, undefined, false);
    object.updateMatrixWorld(true);
    let leg: THREE.Mesh | undefined;
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && String(child.parent?.userData.groupChildId ?? child.userData.groupChildId ?? "").startsWith("l2")) leg = child;
    });
    expect(leg).toBeTruthy();
    expect(leg!.matrixWorld.determinant()).toBeLessThan(0);
    const geometry = leg!.geometry;
    const position = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    const [a, b, c] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    let agreeing = 0;
    for (let index = 0; index + 2 < position.count; index += 3) {
      a.fromBufferAttribute(position, index);
      b.fromBufferAttribute(position, index + 1);
      c.fromBufferAttribute(position, index + 2);
      const face = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
      const shading = new THREE.Vector3().fromBufferAttribute(normal, index)
        .add(new THREE.Vector3().fromBufferAttribute(normal, index + 1))
        .add(new THREE.Vector3().fromBufferAttribute(normal, index + 2));
      if (face.dot(shading) > 0) agreeing += 1;
    }
    expect(agreeing).toBe(position.count / 3);
  });
});
