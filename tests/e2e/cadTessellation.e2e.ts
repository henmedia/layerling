import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import type { WorkplaneShape } from "@/types/layerling";
import { cadModifierBaseDeflection, cadModifierCappedDeflection } from "@/lib/cadModifierRuntime";
import { MAX_REFINED_TRIANGLES, meshTreatedBody } from "@/lib/cadMeshAccuracy";
import { textGlyphProfiles } from "@/lib/cadProfileExtrusion";
import { profileExtrusionSolid } from "@/lib/cadProfileSolid";
import { loadTextFonts } from "@/lib/textFonts";

/*
 * The edge tool tessellates a treated body with cadModifierBaseDeflection.
 * Small treatments now get a looser angle limit on top of their tight chord:
 * far fewer triangles on narrow fillet strips, while the mesh still lies on
 * the exact body - checked here against the real kernel, point by point.
 */

const BEFORE_ANGULAR = 0.16;

describe("tessellation of treated bodies with the real OCCT kernel", () => {
  let cad: OcctKernel;

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    cad = await OcctKernel.init({ wasm });
    await loadTextFonts();
  });

  function edgesAt(solid: ShapeHandle, axis: "y" | "z", value: number) {
    return cad.getSubShapes(solid, "edge").filter((edge) => {
      const box = cad.getBoundingBox(edge);
      const [min, max] = axis === "y" ? [box.ymin, box.ymax] : [box.zmin, box.zmax];
      return Math.abs(min - value) < 1e-6 && Math.abs(max - value) < 1e-6;
    });
  }

  /**
   * Triangles, and the largest distance of any triangle's centroid or edge
   * midpoint from its own face. The point is projected onto the face; one that
   * seems further than half the chord limit is measured again exactly
   * (BRepExtrema against that face), as a projection onto an untrimmed
   * surface can pick the wrong branch.
   */
  function tessellate(solid: ShapeHandle, linear: number, angular: number) {
    const triangles = cad.tessellate(solid, { linearDeflection: linear, angularDeflection: angular }).triangleCount;
    let deviation = 0;
    for (const face of cad.getSubShapes(solid, "face")) {
      // The faces keep the triangulation the whole solid just got.
      const mesh = cad.tessellate(face, { linearDeflection: linear, angularDeflection: angular });
      const corner = (triangle: number, k: number) => {
        const index = mesh.indices[triangle * 3 + k];
        return [mesh.positions[index * 3], mesh.positions[index * 3 + 1], mesh.positions[index * 3 + 2]];
      };
      for (let triangle = 0; triangle < mesh.triangleCount; triangle += 1) {
        const [a, b, c] = [0, 1, 2].map((k) => corner(triangle, k));
        const points = [
          [0, 1, 2].map((axis) => (a[axis] + b[axis] + c[axis]) / 3),
          [0, 1, 2].map((axis) => (a[axis] + b[axis]) / 2),
          [0, 1, 2].map((axis) => (b[axis] + c[axis]) / 2),
          [0, 1, 2].map((axis) => (c[axis] + a[axis]) / 2),
        ];
        for (const [x, y, z] of points) {
          const projected = cad.projectPointOnFace(face, { x, y, z });
          let distance = Math.hypot(projected.x - x, projected.y - y, projected.z - z);
          if (distance > linear / 2) {
            const vertex = cad.makeVertex(x, y, z);
            distance = cad.distanceBetween(vertex, face);
            cad.release(vertex);
          }
          deviation = Math.max(deviation, distance);
        }
      }
    }
    return { triangles, deviation };
  }

  /**
   * A body meshed the way the edge tool now meshes it (meshTreatedBody: the
   * looser angle, or the old one where the mesh strays from a torus), and a
   * fresh copy meshed with the old fixed angle.
   */
  function compare(build: () => ShapeHandle, amount: number) {
    const base = cadModifierBaseDeflection("standard", amount);
    const solid = build();
    const meshed = meshTreatedBody(cad, [solid], solid, base, cadModifierCappedDeflection("standard", base));
    const { linear, angular } = meshed.deflection;
    // Measured on the mesh meshTreatedBody left on the body.
    const after = tessellate(meshed.result, linear, angular);
    expect(after.triangles).toBe(meshed.mesh.triangleCount);
    // A fresh body: OCCT keeps a finer triangulation it already has.
    const before = tessellate(build(), linear, BEFORE_ANGULAR);
    return { linear, angular, fellBack: angular < base.angular, before, after };
  }

  // At this size OCCT takes the fillet; at some others it reports the solid invalid (see #48).
  // A small glyph: the test measures every triangle of the body, which took a minute on a big one.
  it("cuts the triangles of a 0.1 mm fillet round a glyph's top outline to a third, within the chord limit", () => {
    const glyph = textGlyphProfiles({
      id: "t", name: "Text", kind: "text", x: 0, z: 0, elevation: 0, size: 12, width: 12, depth: 6, height: 5, rotation: 0, color: "#f80", text: "G", font: "Sans",
    } as WorkplaneShape)![0].profile!;
    const build = () => {
      const solid = profileExtrusionSolid(cad, glyph);
      return cad.fillet(solid, edgesAt(solid, "y", 5), 0.1);
    };
    const { linear, angular, fellBack, before, after } = compare(build, 0.1);
    expect(fellBack).toBe(false);
    expect(angular).toBe(0.5);
    expect(after.triangles).toBeLessThan(before.triangles / 3);
    // Within the chord limit, as before (0.0099 mm then, 0.0100 mm now).
    expect(after.deviation).toBeLessThanOrEqual(linear * 1.05);
    expect(before.deviation).toBeLessThanOrEqual(linear * 1.05);
  });

  it("keeps a box's small fillets within the chord limit with a third of the triangles", () => {
    const box = () => {
      const solid = cad.makeBox(20, 20, 20);
      return cad.fillet(solid, cad.getSubShapes(solid, "edge"), 0.2);
    };
    const { linear, angular, fellBack, before, after } = compare(box, 0.2);
    expect(fellBack).toBe(false);
    expect(angular).toBe(0.5);
    expect(after.triangles).toBeLessThan(before.triangles / 3);
    expect(after.deviation).toBeLessThanOrEqual(linear);
  });

  it("notices when a fillet round a circular edge (a torus) strays, and meshes it exactly as before", () => {
    // With the looser angle this rim strays 0.031 mm from the exact torus,
    // three times the chord limit.
    const cylinder = () => {
      const solid = cad.makeCylinder(3, 10);
      return cad.fillet(solid, edgesAt(solid, "z", 10), 0.1);
    };
    const { angular, fellBack, before, after } = compare(cylinder, 0.1);
    expect(fellBack).toBe(true);
    expect(angular).toBe(BEFORE_ANGULAR);
    // Meshed afresh - not the looser mesh the body already carried (1182 triangles).
    expect(after).toEqual(before);
    expect(after.deviation).toBeLessThan(0.003);
  });

  it("tightens the angle further when the old one still leaves a fillet straying (forum report, 07.10.2026)", () => {
    // A 0.5 mm fillet round a 60 mm cylinder: at the old angle (0.16) OCCT
    // lets single triangles span most of the quarter arc, 0.124 mm off the
    // exact torus against a chord limit of 0.025 mm - visible as a sawtooth
    // along the seam, in the editor and in the slicer. At 0.1 it is 0.008 mm.
    const cylinder = () => {
      const solid = cad.makeCylinder(30, 5);
      return cad.fillet(solid, edgesAt(solid, "z", 5), 0.5);
    };
    const { linear, angular, fellBack, before, after } = compare(cylinder, 0.5);
    expect(fellBack).toBe(true);
    expect(angular).toBeLessThan(BEFORE_ANGULAR);
    expect(before.deviation).toBeGreaterThan(linear * 2);
    expect(after.deviation).toBeLessThanOrEqual(linear);
    // The finer mesh costs triangles, but not without bound.
    expect(after.triangles).toBeLessThan(40000);
  });

  it("checks a fillet already at the old angle too, and tightens it when it strays (#1947)", () => {
    // A 1.5 mm fillet round the top of a 190.5 mm disc: 1 mm and more gets the
    // old angle from the start, and the mesh went unchecked - triangles across
    // the whole quarter arc, 0.27 mm below the torus, dents in the slicer.
    const disc = () => {
      const solid = cad.makeCylinder(95.25, 2.5);
      return cad.fillet(solid, edgesAt(solid, "z", 2.5), 1.5);
    };
    const { linear, angular, fellBack, before, after } = compare(disc, 1.5);
    expect(fellBack).toBe(true);
    expect(angular).toBeLessThan(BEFORE_ANGULAR);
    expect(before.deviation).toBeGreaterThan(linear * 2);
    expect(after.deviation).toBeLessThanOrEqual(linear);
    expect(after.triangles).toBeLessThan(MAX_REFINED_TRIANGLES);
  });
  it("never leaves a treated body above the triangle limit it allows for refining", () => {
    const cylinder = () => {
      const solid = cad.makeCylinder(30, 5);
      return cad.fillet(solid, edgesAt(solid, "z", 5), 0.5);
    };
    const base = cadModifierBaseDeflection("standard", 0.5);
    const solid = cylinder();
    const meshed = meshTreatedBody(cad, [solid], solid, base, cadModifierCappedDeflection("standard", base));
    expect(meshed.mesh.triangleCount).toBeLessThanOrEqual(MAX_REFINED_TRIANGLES);
  });
});
