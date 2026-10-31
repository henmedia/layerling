import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as THREE from "three";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import type { LoftMiddleSection, WorkplaneShape } from "@/types/layerling";
import { cadModifierProfileForShape, cadProfileExpectation, closedMeshVolume } from "@/lib/cadProfileExtrusion";
import { cadProfileSolidMismatch, profileExtrusionSolid } from "@/lib/cadProfileSolid";
import type { CadModifierProfilePart } from "@/lib/cadModifierTypes";
import { createLoftGeometry, loftFieldsFromMeasures, loftFrameSize, loftStoredMeasures, normalizeLoftMeasures } from "@/lib/loftGeometry";

/*
 * A transition through more sections (#1034) as an exact body against the real kernel: a valid solid
 * where its display mesh is, ruled between neighbours with the volume of its frustums, smooth through
 * all of them as big as the mesh, hollow with a wall, with rims the edge tool can round.
 */

type Vec3 = [number, number, number];

function loft(extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  const base = {
    id: "test-loft", name: "loft", kind: "loft", x: 0, z: 0, elevation: 0, size: 40, height: 150, rotation: 0, color: "#c0703a",
    loftBottomOutline: "round", loftTopOutline: "round", loftBottomWidth: 4, loftBottomDepth: 4, loftTopWidth: 17, loftTopDepth: 17,
    loftBottomCorner: 0, loftTopCorner: 0, loftOffsetX: 0, loftOffsetZ: 1, loftWall: 0,
    ...extra,
  } as WorkplaneShape;
  const frame = loftFrameSize(loftStoredMeasures(base));
  return { ...base, width: frame.width, depth: frame.depth };
}

const fuselage: LoftMiddleSection[] = [
  { at: 25 / 150, outline: "round", width: 15, depth: 13 },
  { at: 55 / 150, outline: "round", width: 21, depth: 20, offsetZ: 2 },
  { at: 85 / 150, outline: "rectangle", width: 30, depth: 22, corner: 8 },
  { at: 120 / 150, outline: "rectangle", width: 28, depth: 22, corner: 10 },
];

function worldMesh(source: WorkplaneShape) {
  const geometry = createLoftGeometry(source);
  const position = geometry.getAttribute("position");
  const centerY = source.height / 2;
  const rotation = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(source.rotationX ?? 0), THREE.MathUtils.degToRad(source.rotation ?? 0), THREE.MathUtils.degToRad(source.rotationZ ?? 0), "XYZ"));
  const vertices: Vec3[] = [];
  for (let i = 0; i < position.count; i += 1) {
    const v = new THREE.Vector3(position.getX(i), position.getY(i) - centerY, position.getZ(i)).applyMatrix4(rotation);
    vertices.push([v.x + source.x, v.y + (source.elevation ?? 0) + centerY, v.z + source.z]);
  }
  const faces: Vec3[] = [];
  for (let i = 0; i < position.count; i += 3) faces.push([i, i + 1, i + 2]);
  return { vertices, faces };
}

const frustum = (h: number, a: number, b: number) => (h / 3) * (a + b + Math.sqrt(a * b));

describe("a transition through more sections with the real OCCT kernel", () => {
  let cad: OcctKernel;
  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    cad = await OcctKernel.init({ wasm });
  });

  function exact(source: WorkplaneShape) {
    const part = cadModifierProfileForShape(source);
    expect(part).not.toBeNull();
    const mesh = worldMesh(source);
    const profile = { ...(part as CadModifierProfilePart), expected: cadProfileExpectation(mesh.vertices, mesh.faces) };
    const local = profileExtrusionSolid(cad, profile);
    const solid = profile.transform ? cad.transform(local, profile.transform) : local;
    expect(cad.isSolid(solid)).toBe(true);
    expect(cad.isValid(solid)).toBe(true);
    expect(cadProfileSolidMismatch(cad, solid, profile.expected)).toBeNull();
    return { solid, mesh, part: part as CadModifierProfilePart };
  }

  const edgesAtHeight = (solid: ShapeHandle, y: number) => cad.getSubShapes(solid, "edge").filter((edge) => {
    const box = cad.getBoundingBox(edge);
    return Math.abs(box.ymin - y) < 1e-6 && Math.abs(box.ymax - y) < 1e-6;
  });

  it("straight through round sections: the frustums' volume, ruled", () => {
    const middles: LoftMiddleSection[] = [{ at: 0.3, outline: "round", width: 20, depth: 20 }, { at: 0.7, outline: "round", width: 12, depth: 12 }];
    const source = loft({ loftSections: middles, loftThrough: "straight", loftOffsetZ: 0, height: 100 });
    const { solid, part } = exact(source);
    expect(part.throughRuled).toBe(true);
    expect(part.through?.length).toBe(4);
    const area = (d: number) => (Math.PI * d * d) / 4;
    const exactVolume = frustum(30, area(4), area(20)) + frustum(40, area(20), area(12)) + frustum(30, area(12), area(17));
    expect(Math.abs(cad.getVolume(solid) / exactVolume - 1)).toBeLessThan(1e-4);
  });

  it("smooth through a fuselage's six sections: one solid as big as its mesh, reaching each section", () => {
    const source = loft({ loftSections: fuselage });
    const { solid, mesh, part } = exact(source);
    expect(part.throughRuled).toBeUndefined();
    expect(Math.abs(cad.getVolume(solid) / closedMeshVolume(mesh.vertices, mesh.faces) - 1)).toBeLessThan(5e-3);
    const box = cad.getBoundingBox(solid);
    expect(box.ymax - box.ymin).toBeCloseTo(150, 3);
    // The widest section, 30 mm across, sets the frame's width: the smooth surface does not swing past it.
    expect(box.xmax - box.xmin).toBeLessThan(30 + 0.05);
    expect(box.xmax - box.xmin).toBeGreaterThan(30 - 0.05);
  });

  it("with a wall: hollow, open at both ends", () => {
    const source = loft({ loftSections: fuselage, loftWall: 1.2, loftBottomWidth: 6, loftBottomDepth: 6 });
    const { solid } = exact(source);
    const full = exact(loft({ loftSections: fuselage, loftBottomWidth: 6, loftBottomDepth: 6 })).solid;
    expect(cad.getVolume(solid)).toBeLessThan(cad.getVolume(full) * 0.5);
  });

  it("keeps rims at the bottom and the top that can be rounded", () => {
    const source = loft({ loftSections: fuselage, loftBottomWidth: 10, loftBottomDepth: 10 });
    const { solid } = exact(source);
    const top = edgesAtHeight(solid, 150);
    expect(top.length).toBeGreaterThan(0);
    const rounded = cad.fillet(solid, top, 1);
    expect(cad.isValid(rounded)).toBe(true);
  });

  it("leaves a transition between two ends as it was", () => {
    const fields = loftFieldsFromMeasures(normalizeLoftMeasures({}));
    expect(fields.loftSections).toBeUndefined();
    expect(fields.loftThrough).toBeUndefined();
    const part = cadModifierProfileForShape(loft({ height: 30 }));
    expect(part?.through).toBeUndefined();
  });
});
