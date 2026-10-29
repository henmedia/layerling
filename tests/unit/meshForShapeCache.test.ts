import { beforeEach, describe, expect, it } from "vitest";
import type { WorkplaneShape } from "@/types/layerling";
import { clearUnplacedMeshCache, meshForShape } from "@/lib/editorMeshCore";
import { createVaseGeometry } from "@/lib/vaseShape";

function shape(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "s1",
    name: "Spring",
    kind: "spring",
    color: "#ffffff",
    x: 0,
    z: 0,
    size: 20,
    width: 20,
    depth: 20,
    height: 30,
    rotation: 0,
    ...overrides,
  } as WorkplaneShape;
}

function fresh(input: WorkplaneShape) {
  clearUnplacedMeshCache();
  const mesh = meshForShape(input);
  clearUnplacedMeshCache();
  return mesh;
}

describe("meshForShape keeps the mesh of a shape that only moved or turned", () => {
  beforeEach(() => clearUnplacedMeshCache());

  it("gives a moved and turned copy the same mesh as building it fresh", () => {
    meshForShape(shape());
    const moved = shape({ id: "s2", name: "Copy", color: "#ff0000", x: 12.5, z: -4, elevation: 3, rotation: 37, rotationX: 15, rotationZ: -20 });
    const fromCache = meshForShape(moved);
    const built = fresh(moved);
    expect(fromCache.name).toBe("Copy");
    expect(fromCache.faces).toEqual(built.faces);
    expect(fromCache.vertices).toEqual(built.vertices);
  });

  it("builds again when a field that shapes the body changes", () => {
    const first = meshForShape(shape({ springTurns: 4 }));
    const second = meshForShape(shape({ springTurns: 7 }));
    expect(second.vertices.length).not.toBe(first.vertices.length);
    expect(second.vertices).toEqual(fresh(shape({ springTurns: 7 })).vertices);
  });

  it("keeps mirror and taper out of the kept mesh", () => {
    meshForShape(shape({ kind: "gear", teeth: 12 }));
    const mirrored = shape({ kind: "gear", teeth: 12, mirrorX: true, x: 5 });
    expect(meshForShape(mirrored).faces).toEqual(fresh(mirrored).faces);
    const tapered = shape({ kind: "gear", teeth: 12, taperTopWidth: 10 });
    expect(meshForShape(tapered).vertices).toEqual(fresh(tapered).vertices);
  });

  it("is not changed by what a caller does to the mesh it got", () => {
    const first = meshForShape(shape());
    first.faces[0][0] = 999999;
    first.faces.length = 1;
    const again = meshForShape(shape({ x: 3 }));
    expect(again.faces).toEqual(fresh(shape({ x: 3 })).faces);
  });

  it("does not see a field changed on the shape object after the first call", () => {
    const changing = shape({ springTurns: 4 });
    const first = meshForShape(changing);
    changing.springTurns = 8;
    expect(meshForShape(changing).vertices.length).not.toBe(first.vertices.length);
  });
});

describe("meshForShape of a vase", () => {
  it("has the triangles of the shaded vase", () => {
    const vase = shape({ kind: "vase", width: 60, depth: 60, size: 60, height: 90, vase: { body: "hohl", cutout: "voronoi", quality: "entwurf" } } as Partial<WorkplaneShape>);
    const mesh = fresh(vase);
    const shaded = createVaseGeometry({ width: 60, depth: 60, height: 90, vase: vase.vase }).getAttribute("position");
    expect(mesh.vertices.length).toBe(shaded.count);
    for (let i = 0; i < shaded.count; i += 97) {
      expect(mesh.vertices[i][0]).toBeCloseTo(shaded.getX(i), 5);
      expect(mesh.vertices[i][1]).toBeCloseTo(shaded.getY(i), 5);
      expect(mesh.vertices[i][2]).toBeCloseTo(shaded.getZ(i), 5);
    }
  });
});
