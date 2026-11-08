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
 * A rounded box with an own radius for each corner: the exact body against the display mesh, and both
 * against the area worked out by hand - the rectangle less (1 - pi/4) r^2 at every corner.
 */

function shape(extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id: "s-rb", name: "roundedBox", kind: "roundedBox", x: 0, z: 0, elevation: 0, size: 40, width: 40, depth: 30, height: 12, rotation: 0, color: "#ff8800", topBottomFillet: 0, roundedBoxQuality: 24, ...extra } as WorkplaneShape;
}

function localMesh(source: WorkplaneShape) {
  const geometry = createRoundedBoxGeometry({ width: source.width!, depth: source.depth!, height: source.height, cornerFillet: source.cornerFillet, cornerFillets: source.cornerFillets, topBottomFillet: source.topBottomFillet, roundedBoxQuality: source.roundedBoxQuality });
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = flat.getAttribute("position");
  const vertices: Array<[number, number, number]> = [];
  for (let i = 0; i < position.count; i += 1) vertices.push([position.getX(i), position.getY(i), position.getZ(i)]);
  const faces: Array<[number, number, number]> = [];
  for (let i = 0; i + 2 < vertices.length; i += 3) faces.push([i, i + 1, i + 2]);
  return { name: "roundedBox", vertices, faces };
}

describe("rounded box: own radii for each corner", () => {
  let cad: OcctKernel;

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    cad = await OcctKernel.init({ wasm });
  });

  const cases: Array<[string, Partial<WorkplaneShape>]> = [
    ["all four alike", { cornerFillets: [6, 6, 6, 6] }],
    ["one sharp, three rounded", { cornerFillets: [0, 5, 8, 3] }],
    ["only the front two rounded", { cornerFillets: [0, 0, 9, 9] }],
    ["more than half the shorter side asked", { cornerFillets: [99, 2, 0, 4] }],
  ];

  it.each(cases)("builds %s as an exact body that matches the mesh and the hand-worked volume", (_name, extra) => {
    const source = shape(extra);
    const profile = cadModifierProfileForShape(source);
    expect(profile).not.toBeNull();
    const mesh = transformMesh(localMesh(source), source);
    const expected = cadProfileExpectation(mesh.vertices, mesh.faces);
    const part = { ...(profile as CadModifierProfilePart), expected };
    const solid = profileExtrusionSolid(cad, part);
    expect(cad.isSolid(solid)).toBe(true);
    expect(cad.isValid(solid)).toBe(true);
    expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
    const radii = (extra.cornerFillets ?? []).map((radius) => Math.min(15, Math.max(0, radius)));
    const area = 40 * 30 - radii.reduce((sum, radius) => sum + (1 - Math.PI / 4) * radius * radius, 0);
    expect(Math.abs(cad.getVolume(solid) / (area * 12) - 1)).toBeLessThan(1e-6);
    // the mesh draws every arc from straight pieces
    expect(Math.abs(expected.volume / (area * 12) - 1)).toBeLessThan(2e-3);
  });

  it("keeps a body with a shared radius the way it was", () => {
    const profile = cadModifierProfileForShape(shape({ cornerFillet: 5 }));
    const same = cadModifierProfileForShape(shape({ cornerFillet: 5, cornerFillets: [5, 5, 5, 5] }));
    expect(profile).not.toBeNull();
    expect(JSON.stringify(same?.loops)).toBe(JSON.stringify(profile?.loops));
  });
});
