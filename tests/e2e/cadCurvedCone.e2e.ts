import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import type { WorkplaneShape } from "@/types/layerling";
import type { CadModifierProfilePart } from "@/lib/cadModifierTypes";
import { cadModifierProfileForShape, cadProfileExpectation } from "@/lib/cadProfileExtrusion";
import { cadProfileSolidMismatch, profileExtrusionSolid } from "@/lib/cadProfileSolid";
import { cadTransformRequiresGeneralTransform } from "@/lib/cadModifierRuntime";
import { meshForShape } from "@/lib/editorMeshCore";
import { shellSolid } from "@/lib/cadShell";
import { curvedConeSection } from "@/lib/curvedCone";

/*
 * The curved cone (#1211) as an exact body: the turned Bezier side against its display mesh, round
 * and oval, from a trumpet over the straight cone to a dome, and what the edge tool and Hollow do to it.
 */

function cone(extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id: "test-curved-cone", name: "Curved Cone", kind: "curvedCone", x: 0, z: 0, elevation: 0, size: 30, width: 30, depth: 30, height: 30, rotation: 0, color: "#9b59b6", curvedConeTop: 0.25, curvedConeBend: -0.8, ...extra } as WorkplaneShape;
}

/** The volume of the turned section, pi times the integral of r^2 dy along the curve, by Simpson's rule. */
function sectionVolume(source: WorkplaneShape) {
  const { base, top, height, control } = curvedConeSection(source.width ?? 30, source.height, source.curvedConeTop, source.curvedConeBend);
  const at = (s: number) => {
    const r = (1 - s) ** 2 * base + 2 * (1 - s) * s * control.x + s * s * top;
    const dy = 2 * (1 - s) * control.z + 2 * s * (height - control.z);
    return r * r * dy;
  };
  const steps = 2000;
  let sum = at(0) + at(1);
  for (let index = 1; index < steps; index += 1) sum += at(index / steps) * (index % 2 ? 4 : 2);
  return (Math.PI * sum) / (3 * steps);
}

describe("the curved cone as an exact body", () => {
  let cad: OcctKernel;

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    cad = await OcctKernel.init({ wasm });
  });

  function body(source: WorkplaneShape) {
    const profile = cadModifierProfileForShape(source);
    expect(profile).not.toBeNull();
    const mesh = meshForShape(source);
    const expected = cadProfileExpectation(mesh.vertices, mesh.faces);
    const part = { ...(profile as CadModifierProfilePart), expected };
    const local = profileExtrusionSolid(cad, part);
    const transform = part.transform;
    const solid = !transform ? local : cadTransformRequiresGeneralTransform(transform) ? cad.generalTransform(local, transform) : cad.transform(local, transform);
    expect(cad.isSolid(solid)).toBe(true);
    expect(cad.isValid(solid)).toBe(true);
    return { solid, expected };
  }

  const bends = [-1, -0.8, 0, 0.5, 1];

  it("has the volume of its turned section and matches its display mesh, round and oval", () => {
    for (const bend of bends) {
      for (const top of [0, 0.25, 0.6]) {
        const source = cone({ curvedConeBend: bend, curvedConeTop: top });
        const { solid, expected } = body(source);
        expect(cad.getVolume(solid) / sectionVolume(source), `bend ${bend}, top ${top}`).toBeCloseTo(1, 3);
        expect(cadProfileSolidMismatch(cad, solid, expected), `bend ${bend}, top ${top}`).toBeNull();
        const oval = cone({ curvedConeBend: bend, curvedConeTop: top, depth: 20 });
        const ovalBody = body(oval);
        expect(cadProfileSolidMismatch(cad, ovalBody.solid, ovalBody.expected), `oval, bend ${bend}, top ${top}`).toBeNull();
        // Stretched to two thirds along z, the volume is two thirds of the round one's.
        expect(cad.getVolume(ovalBody.solid) / (sectionVolume(source) * (20 / 30)), `oval, bend ${bend}, top ${top}`).toBeCloseTo(1, 3);
      }
    }
  });

  it("is a straight cone without a bend", () => {
    const { solid } = body(cone({ curvedConeBend: 0, curvedConeTop: 0.5 }));
    // A frustum of radii 15 and 7.5, 30 high: pi h (R^2 + R r + r^2) / 3.
    expect(cad.getVolume(solid) / ((Math.PI * 30 * (15 * 15 + 15 * 7.5 + 7.5 * 7.5)) / 3)).toBeCloseTo(1, 4);
  });

  it("takes a fillet and a chamfer on its rims", () => {
    const bottom = (edge: ShapeHandle) => cad.getBoundingBox(edge).ymax < 1e-6;
    const top = (edge: ShapeHandle) => cad.getBoundingBox(edge).ymin > 30 - 1e-6;
    for (const bend of [...bends, -0.95, 0.95]) {
      const { solid } = body(cone({ curvedConeBend: bend, curvedConeTop: 0.4 }));
      // Bent all the way, the side runs into the bottom (inward) or the top (outward) without a corner: that rim is
      // already smooth, and the kernel has nothing to round there.
      const edges = cad.getSubShapes(solid, "edge").filter((edge) => (bend > -1 && bottom(edge)) || (bend < 1 && top(edge)));
      expect(edges.length, `bend ${bend}`).toBe(Math.abs(bend) === 1 ? 1 : 2);
      for (const result of [cad.fillet(solid, edges, 1), cad.chamfer(solid, edges, 1)]) {
        expect(cad.isValid(result), `bend ${bend}`).toBe(true);
        expect(cad.getVolume(result)).toBeLessThan(cad.getVolume(solid));
      }
    }
  });

  it("can be hollowed out, open at the top", () => {
    for (const bend of bends) {
      const { solid } = body(cone({ curvedConeBend: bend, curvedConeTop: 0.4 }));
      const shelled = shellSolid(cad, solid, 1.5, "top");
      expect(shelled, `bend ${bend}`).not.toBeNull();
      expect(cad.isValid(shelled as ShapeHandle), `bend ${bend}`).toBe(true);
      expect(cad.getVolume(shelled as ShapeHandle)).toBeLessThan(cad.getVolume(solid) * 0.6);
    }
  });
});
