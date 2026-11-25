import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import { EXACT_MESH_FREEFORM_MESSAGE, exactMeshFreeformShare, exactSolidFromMesh } from "@/lib/cadMeshExact";

/*
 * Make exact on the meshes the kernel itself tessellates from known solids: what comes back must be a valid solid of
 * the same volume, made of the surfaces the solid had, and it must take a fillet and go into a STEP file.
 */

let cad: OcctKernel;
beforeAll(async () => {
  const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
  cad = await OcctKernel.init({ wasm });
});

const COARSE = { linearDeflection: 0.05, angularDeflection: 0.3 };
const FINE = { linearDeflection: 0.01, angularDeflection: 0.1 };

function solidOf(shape: ShapeHandle) {
  return cad.isSolid(shape) ? shape : cad.getSubShapes(shape, "solid")[0];
}

function faceKinds(shape: ShapeHandle) {
  const out: Record<string, number> = {};
  for (const face of cad.getSubShapes(shape, "face")) out[cad.surfaceType(face)] = (out[cad.surfaceType(face)] ?? 0) + 1;
  return out;
}

const parts = {
  plateWithHole: () => cad.cut(cad.makeBox(40, 30, 8), cad.translate(cad.makeCylinder(5, 20), 20, 15, -5)),
  roundedBox: () => {
    const box = cad.makeBox(30, 20, 10);
    return cad.fillet(box, cad.getSubShapes(box, "edge"), 3);
  },
  filletedCylinder: () => {
    const cylinder = cad.makeCylinder(10, 15);
    const top = cad.getSubShapes(cylinder, "edge").filter((edge) => cad.curveType(edge) === "circle" && cad.curvePointAtParam(edge, cad.curveParameters(edge).first).z > 14);
    return cad.fillet(cylinder, top, 2);
  },
  countersink: () => cad.cut(cad.makeBox(30, 30, 6), cad.translate(cad.makeCone(1.5, 6, 6), 15, 15, 0.5)),
  sphere: () => cad.makeSphere(10),
  // Stefan's ring on PR #1245: its tube came out as 72 spheres, a band each.
  ring: () => cad.makeTorus(20, 6),
  // Half of it, with a flat end either side: the tube still goes all the way round.
  halfRing: () => cad.cut(cad.makeTorus(20, 6), cad.translate(cad.makeBox(60, 30, 20), -30, -30, -10)),
  // Five discs fused into a cloud, as in a design made of grouped cylinders.
  cloud: () => {
    const discs = [[-22, 4, 13], [-4, -6, 16], [16, 0, 14], [30, 8, 10], [4, 12, 12]];
    let shape = cad.translate(cad.makeCylinder(discs[0][2], 8), discs[0][0], discs[0][1], 0);
    for (const [x, y, r] of discs.slice(1)) shape = cad.fuse(shape, cad.translate(cad.makeCylinder(r, 8), x, y, 0));
    return solidOf(cad.unifySameDomain(shape));
  },
  crossHoles: () => {
    let shape = cad.makeBox(30, 30, 20);
    shape = cad.cut(shape, cad.translate(cad.rotate(cad.makeCylinder(4, 40), { point: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 1, z: 0 } }, Math.PI / 2), -5, 15, 10));
    return cad.cut(shape, cad.translate(cad.rotate(cad.makeCylinder(3, 40), { point: { x: 0, y: 0, z: 0 }, direction: { x: 1, y: 0, z: 0 } }, -Math.PI / 2), 15, -5, 10));
  },
  obliqueCut: () => {
    const cutter = cad.rotate(cad.translate(cad.makeBox(40, 40, 20), -20, -20, 0), { point: { x: 0, y: 0, z: 0 }, direction: { x: 1, y: 0, z: 0 } }, 0.5);
    return cad.cut(cad.makeCylinder(8, 20), cad.translate(cutter, 0, 0, 12));
  },
} satisfies Record<string, () => ShapeHandle>;

/** The kinds each part is made of, at least once each: what Make exact has to find. */
const expectedKinds: Record<keyof typeof parts, string[]> = {
  plateWithHole: ["plane", "cylinder"],
  roundedBox: ["plane", "cylinder", "sphere"],
  filletedCylinder: ["plane", "cylinder", "torus"],
  countersink: ["plane", "cone"],
  sphere: ["sphere"],
  ring: ["torus"],
  halfRing: ["plane", "torus"],
  cloud: ["plane", "cylinder"],
  crossHoles: ["plane", "cylinder"],
  obliqueCut: ["plane", "cylinder"],
};

function topEdges(shape: ShapeHandle) {
  const edges = cad.getSubShapes(shape, "edge");
  const heights = (edge: ShapeHandle) => {
    const range = cad.curveParameters(edge);
    return [range.first, (range.first + range.last) / 2, range.last].map((t) => cad.curvePointAtParam(edge, t).z);
  };
  const top = Math.max(...edges.flatMap(heights));
  return edges.filter((edge) => heights(edge).every((z) => Math.abs(z - top) < 1e-3));
}

describe("making a mesh exact", () => {
  for (const [name, make] of Object.entries(parts) as [keyof typeof parts, () => ShapeHandle][]) {
    it(`rebuilds ${name} from its mesh with the surfaces it was made of`, () => {
      const source = make();
      const mesh = cad.tessellate(source, COARSE);
      const exact = exactSolidFromMesh(cad, mesh.positions, mesh.indices);
      expect(exact).not.toBeNull();
      const { solid, report } = exact!;
      expect(cad.isSolid(solid)).toBe(true);
      expect(cad.isValid(solid)).toBe(true);
      expect(cad.getVolume(solid)).toBeCloseTo(cad.getVolume(source), 0);
      expect(Math.abs(cad.getVolume(solid) / cad.getVolume(source) - 1)).toBeLessThan(0.002);
      // Nothing was left as facets, and the faces are those surfaces, not triangles.
      expect(report.facets).toBe(0);
      const kinds = faceKinds(solid);
      for (const kind of expectedKinds[name]) {
        expect(kinds[kind] ?? 0, `${name}: ${kind}`).toBeGreaterThan(0);
        expect(report[kind as "plane"], `${name}: report ${kind}`).toBeGreaterThan(0);
      }
      expect(Object.keys(kinds).every((kind) => ["plane", "cylinder", "cone", "sphere", "torus"].includes(kind))).toBe(true);
      expect(report.faces).toBe(cad.getSubShapes(solid, "face").length);
      // The triangles it worked from: those of the mesh, without any folded onto a line.
      expect(report.triangles).toBeLessThanOrEqual(mesh.indices.length / 3);
      expect(report.triangles).toBeGreaterThan(mesh.indices.length / 3 * 0.98);
      // A STEP file carries it.
      expect(cad.exportStep(solid).length).toBeGreaterThan(1000);
    });
  }

  it("finds the bore of a finely tessellated plate as one cylinder that a fillet follows", () => {
    const source = parts.plateWithHole();
    const mesh = cad.tessellate(source, FINE);
    const exact = exactSolidFromMesh(cad, mesh.positions, mesh.indices);
    expect(exact).not.toBeNull();
    expect(faceKinds(exact!.solid)).toEqual({ plane: 6, cylinder: 1 });
    // The top: four straight edges and the bore's one round rim (two halves at most).
    const top = topEdges(exact!.solid);
    expect(top.filter((edge) => cad.curveType(edge) === "line")).toHaveLength(4);
    expect(top.filter((edge) => cad.curveType(edge) === "circle").length).toBeLessThanOrEqual(2);
    const rounded = cad.fillet(exact!.solid, top, 1);
    expect(cad.isValid(rounded)).toBe(true);
    expect(cad.getVolume(rounded)).toBeLessThan(cad.getVolume(exact!.solid));
  });

  it("takes a fillet along the top of a cloud of fused discs", () => {
    const mesh = cad.tessellate(parts.cloud(), COARSE);
    const exact = exactSolidFromMesh(cad, mesh.positions, mesh.indices);
    expect(exact).not.toBeNull();
    const rounded = cad.fillet(exact!.solid, topEdges(exact!.solid), 0.8);
    expect(cad.isValid(rounded)).toBe(true);
  });

  it("refuses a mostly free-form mesh when asked to, and says how much of it fits a surface", () => {
    const circle = cad.makeWire([cad.makeCircleEdge({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, 10)]);
    const square = cad.makeWire([
      cad.makeLineEdge({ x: -6, y: -6, z: 15 }, { x: 6, y: -6, z: 15 }),
      cad.makeLineEdge({ x: 6, y: -6, z: 15 }, { x: 6, y: 6, z: 15 }),
      cad.makeLineEdge({ x: 6, y: 6, z: 15 }, { x: -6, y: 6, z: 15 }),
      cad.makeLineEdge({ x: -6, y: 6, z: 15 }, { x: -6, y: -6, z: 15 }),
    ]);
    const mesh = cad.tessellate(cad.loft([circle, square], true, false), COARSE);
    let message = "";
    const started = performance.now();
    try {
      exactSolidFromMesh(cad, mesh.positions, mesh.indices, { refuseFreeform: true });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain(EXACT_MESH_FREEFORM_MESSAGE);
    const share = exactMeshFreeformShare(message);
    expect(share).not.toBeNull();
    expect(share!).toBeGreaterThan(0);
    expect(share!).toBeLessThan(50);
    // It says so before it builds a face for every triangle (that took over a minute on finer meshes).
    expect(performance.now() - started).toBeLessThan(20000);
  });

  it("makes a perforated plate exact, its many small bores not taken for a free-form surface", () => {
    let plate = cad.makeBox(60, 60, 3);
    for (let row = 0; row < 6; row += 1) {
      for (let column = 0; column < 6; column += 1) plate = cad.cut(plate, cad.translate(cad.makeCylinder(1.5, 10), 7.5 + column * 9, 7.5 + row * 9, -2));
    }
    const mesh = cad.tessellate(plate, COARSE);
    const exact = exactSolidFromMesh(cad, mesh.positions, mesh.indices, { refuseFreeform: true });
    expect(exact).not.toBeNull();
    expect(exact!.report.facets).toBe(0);
    expect(faceKinds(exact!.solid).cylinder).toBe(36);
    expect(Math.abs(cad.getVolume(exact!.solid) / cad.getVolume(plate) - 1)).toBeLessThan(0.002);
  });

  it("finds the cylinders of a mesh divided again after its export, with corners on the chords", async () => {
    const manifold = await (await import("manifold-3d")).default();
    manifold.setup();
    const { Manifold } = manifold;
    // 96 sides and every edge divided to 1.5 mm: the new corners stand up to 5 µm inside the bore's true cylinder.
    const solid = Manifold.cube([40, 30, 8]).subtract(Manifold.cylinder(20, 5, 5, 96).translate([20, 15, -5])).refineToLength(1.5);
    const mesh = solid.getMesh();
    const positions = Array.from(mesh.triVerts, (vertex) => [0, 1, 2].map((axis) => mesh.vertProperties[vertex * mesh.numProp + axis])).flat();
    const exact = exactSolidFromMesh(cad, positions, undefined, { budgetMs: 30000 });
    expect(exact).not.toBeNull();
    expect(faceKinds(exact!.solid)).toEqual({ plane: 6, cylinder: 1 });
    expect(Math.abs(cad.getVolume(exact!.solid) / solid.volume() - 1)).toBeLessThan(0.002);
    solid.delete();
  });

  // Stefan's measurements on PR #1245: a box of 60 x 40 x 20 mm with every edge rounded by 5 mm, finely meshed, came
  // back after 101 seconds as 33,493 faces (34,242 facets, 49 MB of CAD data) and counted as a success. The rounded
  // edges had run a little way into the rounded corners they meet without a crease, and the faces did not close.
  it("rebuilds a finely meshed rounded box as its 26 faces, not as a face for every triangle", () => {
    const box = cad.makeBox(60, 40, 20);
    const source = cad.fillet(box, cad.getSubShapes(box, "edge"), 5);
    const mesh = cad.tessellate(source, { linearDeflection: 0.002, angularDeflection: 0.05 });
    expect(mesh.indices.length / 3).toBeGreaterThan(30000);
    const started = performance.now();
    const exact = exactSolidFromMesh(cad, mesh.positions, mesh.indices, { budgetMs: 90000, refuseFreeform: true });
    expect(performance.now() - started).toBeLessThan(30000);
    expect(exact).not.toBeNull();
    expect(exact!.report.facets).toBe(0);
    expect(faceKinds(exact!.solid)).toEqual({ plane: 6, cylinder: 12, sphere: 8 });
    expect(Math.abs(cad.getVolume(exact!.solid) / cad.getVolume(source) - 1)).toBeLessThan(0.002);
  });

  // Stefan's measurements on PR #2048: small coarse bodies (a sphere of 520 triangles, a capsule of 386) gave a solid
  // of facets before and gave no result with the check above. It only holds for larger meshes.
  it("still builds a small coarse capsule, as facets where its curved faces do not hold", () => {
    const cylinder = cad.makeCylinder(5, 20);
    const capsule = cad.fillet(cylinder, cad.getSubShapes(cylinder, "edge").filter((edge) => cad.curveType(edge) === "circle"), 4.99);
    const mesh = cad.tessellate(capsule, { linearDeflection: 0.3, angularDeflection: 0.5 });
    const triangles = mesh.indices.length / 3;
    expect(triangles).toBeLessThan(1000);
    const started = performance.now();
    const exact = exactSolidFromMesh(cad, mesh.positions, mesh.indices, { budgetMs: 20000, refuseFreeform: true });
    expect(exact).not.toBeNull();
    expect(cad.isValid(exact!.solid)).toBe(true);
    // The facets' volume is the mesh's, a little under the capsule's.
    const volume = cad.getVolume(exact!.solid);
    expect(volume).toBeGreaterThan(cad.getVolume(capsule) * 0.9);
    expect(volume).toBeLessThanOrEqual(cad.getVolume(capsule));
    expect(exact!.report.faces).toBeLessThanOrEqual(triangles);
    expect(performance.now() - started).toBeLessThan(15000);
  });

  it("finds a finely meshed ring as one torus too", () => {
    const mesh = cad.tessellate(cad.makeTorus(20, 6), FINE);
    expect(mesh.indices.length / 3).toBeGreaterThan(30000);
    const exact = exactSolidFromMesh(cad, mesh.positions, mesh.indices, { refuseFreeform: true });
    expect(exact).not.toBeNull();
    expect(exact!.report).toMatchObject({ torus: 1, sphere: 0, cylinder: 0, facets: 0 });
    expect(faceKinds(exact!.solid)).toEqual({ torus: 1 });
    expect(Math.abs(cad.getVolume(exact!.solid) / (2 * Math.PI ** 2 * 20 * 36) - 1)).toBeLessThan(0.001);
  });

  // The same measurements: with 8 seconds given, a finely meshed ring took 135 and a sphere 36. Both are found well
  // within 8 seconds now, so the time here is too short for the ring on purpose.
  it("keeps to the time it is given", () => {
    const fine = { linearDeflection: 0.002, angularDeflection: 0.05 };
    for (const shape of [cad.makeTorus(20, 6), cad.makeSphere(10)]) {
      const mesh = cad.tessellate(shape, fine);
      const started = performance.now();
      try {
        exactSolidFromMesh(cad, mesh.positions, mesh.indices, { budgetMs: 2000, refuseFreeform: true });
      } catch (error) {
        expect(String(error)).toContain(EXACT_MESH_FREEFORM_MESSAGE);
      }
      // What is left once the time is up runs to its end (the triangles no face took are still gathered), and the
      // machine may be busy: about half a second over on the ring's 180,000 triangles, three times that allowed.
      expect(performance.now() - started).toBeLessThan(6000);
    }
  });

  it("gives up on a mesh that is not closed", () => {
    const mesh = cad.tessellate(parts.plateWithHole(), COARSE);
    // Without its last triangles the mesh has a hole in its surface.
    const indices = Array.from(mesh.indices).slice(0, mesh.indices.length - 12);
    expect(exactSolidFromMesh(cad, mesh.positions, indices)).toBeNull();
  });

  it("reads only the messages it gave as free-form", () => {
    expect(exactMeshFreeformShare(`${EXACT_MESH_FREEFORM_MESSAGE} (12 %)`)).toBe(12);
    expect(exactMeshFreeformShare("Timed out waiting for the CAD worker")).toBeNull();
  });
});
