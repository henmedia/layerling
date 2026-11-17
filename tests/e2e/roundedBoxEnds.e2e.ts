import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel } from "occt-wasm";
import type { WorkplaneShape } from "@/types/layerling";
import type { CadModifierProfilePart } from "@/lib/cadModifierTypes";
import { cadModifierProfileForShape, cadProfileExpectation } from "@/lib/cadProfileExtrusion";
import { cadProfileSolidMismatch, profileExtrusionSolid } from "@/lib/cadProfileSolid";
import { createRoundedBoxGeometry } from "@/lib/roundedBoxGeometry";
import { transformMesh } from "@/lib/editorMeshCore";

/*
 * A rounded box with its own radius for the top and the bottom edge: the exact body against the display
 * mesh, and the ends against each other - swapping the radii turns the body over, so it keeps its volume.
 */

function shape(extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  // the corner radius equals the edge radii used below, so the mesh's edge (an ellipse) is the circle the kernel rounds
  return { id: "s-rb", name: "roundedBox", kind: "roundedBox", x: 0, z: 0, elevation: 0, size: 40, width: 40, depth: 30, height: 14, rotation: 0, color: "#ff8800", cornerFillet: 4, topBottomFillet: 4, roundedBoxQuality: 24, ...extra } as WorkplaneShape;
}

function localMesh(source: WorkplaneShape) {
  const geometry = createRoundedBoxGeometry({ width: source.width!, depth: source.depth!, height: source.height, cornerFillet: source.cornerFillet, topBottomFillet: source.topBottomFillet, bottomFillet: source.bottomFillet, roundedBoxQuality: source.roundedBoxQuality });
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = flat.getAttribute("position");
  const vertices: Array<[number, number, number]> = [];
  for (let i = 0; i < position.count; i += 1) vertices.push([position.getX(i), position.getY(i), position.getZ(i)]);
  const faces: Array<[number, number, number]> = [];
  for (let i = 0; i + 2 < vertices.length; i += 3) faces.push([i, i + 1, i + 2]);
  return { name: "roundedBox", vertices, faces };
}

describe("rounded box: top and bottom edge on their own", () => {
  let cad: OcctKernel;

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    cad = await OcctKernel.init({ wasm });
  });

  function build(extra: Partial<WorkplaneShape>) {
    const source = shape(extra);
    const profile = cadModifierProfileForShape(source);
    expect(profile).not.toBeNull();
    const mesh = transformMesh(localMesh(source), source);
    const expected = cadProfileExpectation(mesh.vertices, mesh.faces);
    const solid = profileExtrusionSolid(cad, { ...(profile as CadModifierProfilePart), expected });
    expect(cad.isSolid(solid)).toBe(true);
    expect(cad.isValid(solid)).toBe(true);
    expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
    return { solid, volume: cad.getVolume(solid), meshVolume: expected.volume, box: cad.getBoundingBox(solid) };
  }

  const cases: Array<[string, Partial<WorkplaneShape>]> = [
    ["a flat top over a rounded bottom", { topBottomFillet: 0, bottomFillet: 4 }],
    ["a rounded top over a flat bottom", { topBottomFillet: 4, bottomFillet: 0 }],
    ["a larger top than bottom", { topBottomFillet: 6, bottomFillet: 2, cornerFillet: 6 }],
    ["a larger bottom than top", { topBottomFillet: 2, bottomFillet: 6, cornerFillet: 6 }],
  ];

  it.each(cases)("builds %s as an exact body that matches the mesh and keeps the box's size", (_name, extra) => {
    const { volume, meshVolume, box } = build(extra);
    // Where the two edge radii differ, one of them cannot match the corner radius, and the mesh draws that edge as an
    // ellipse as wide as the corner - a little more than the circle the kernel rounds (as for a shared radius that is not the corner's).
    const unequal = extra.topBottomFillet !== extra.bottomFillet && (extra.topBottomFillet ?? 0) > 0 && (extra.bottomFillet ?? 0) > 0;
    expect(Math.abs(meshVolume / volume - 1)).toBeLessThan(unequal ? 0.02 : 2e-3);
    expect(box.ymin).toBeCloseTo(0, 5);
    expect(box.ymax).toBeCloseTo(14, 5);
    expect(box.xmax - box.xmin).toBeCloseTo(40, 5);
  });

  it("turns over when the two radii swap, and sits between the all-flat and the all-rounded body", () => {
    const a = build({ topBottomFillet: 6, bottomFillet: 2, cornerFillet: 6 }).volume;
    const b = build({ topBottomFillet: 2, bottomFillet: 6, cornerFillet: 6 }).volume;
    expect(Math.abs(a / b - 1)).toBeLessThan(1e-6);
    const flatTop = build({ topBottomFillet: 0, bottomFillet: 4 }).volume;
    const flatBottom = build({ topBottomFillet: 4, bottomFillet: 0 }).volume;
    expect(Math.abs(flatTop / flatBottom - 1)).toBeLessThan(1e-6);
    const bothFlat = build({ topBottomFillet: 0, bottomFillet: 0, cornerFillet: 4 }).volume;
    const bothRounded = build({ topBottomFillet: 4, bottomFillet: 4 }).volume;
    expect(flatTop).toBeLessThan(bothFlat);
    expect(flatTop).toBeGreaterThan(bothRounded);
    // one rounded end takes away about half what two do
    expect(Math.abs((bothFlat - flatTop) / (bothFlat - bothRounded) - 0.5)).toBeLessThan(0.05);
  });

  it("keeps a body with one radius for both ends the way it was", () => {
    const shared = build({ topBottomFillet: 4 });
    const same = build({ topBottomFillet: 4, bottomFillet: 4 });
    expect(Math.abs(same.volume / shared.volume - 1)).toBeLessThan(1e-9);
  });
});
