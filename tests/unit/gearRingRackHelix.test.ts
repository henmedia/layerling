import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import * as THREE from "three";
import { beforeAll, describe, expect, it } from "vitest";
import { cadModifierHelicalGearForShape } from "@/lib/cadProfileExtrusion";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { createGearGeometry, internalGearDiameter, involuteGearDiameter, rackLength, rackMeasures } from "@/lib/gearGeometry";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { GearProfile, GearType, WorkplaneShape } from "@/types/layerling";

/*
 * Ring gears and racks with slanted teeth (Discussion #1627): helical or herringbone, from the helix angle of the
 * helical gear that runs with them. Their display meshes must be closed bodies of the straight one's volume (a
 * turn or a shift keeps every section's area), a rack exactly as long as before, and they must mesh with that
 * helical gear: taken with the same angle, the gear finds a turn where it does not cut into them; taken the other
 * way, it does not.
 */

let runtime: ManifoldToplevel;
beforeAll(async () => {
  runtime = await manifoldModule();
  runtime.setup();
});

/** The editor's way from display mesh to solid: the non-indexed triangles welded at 0.0001 mm. */
function solid(geometry: THREE.BufferGeometry, matrix?: THREE.Matrix4) {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = flat.getAttribute("position");
  const vertProperties = new Float32Array(position.count * 3);
  const point = new THREE.Vector3();
  for (let index = 0; index < position.count; index += 1) {
    point.fromBufferAttribute(position, index);
    if (matrix) point.applyMatrix4(matrix);
    vertProperties.set([point.x, point.y, point.z], index * 3);
  }
  const triVerts = Uint32Array.from({ length: position.count }, (_, index) => index);
  const mesh = new runtime.Mesh({ numProp: 3, vertProperties, triVerts, tolerance: 0.0001 });
  mesh.merge();
  return runtime.Manifold.ofMesh(mesh);
}

const MODULE = 1.5;
const HEIGHT = 8;
const PROFILE: GearProfile = "involute";

function ring(teeth: number, extra: Record<string, unknown> = {}) {
  const diameter = internalGearDiameter(MODULE, teeth, 2, PROFILE);
  return createGearGeometry({ width: diameter, depth: diameter, height: HEIGHT, teeth, gearType: "internal" as GearType, gearProfile: PROFILE, gearRim: 2, helixQuality: 24, ...extra });
}

function rack(teeth: number, extra: Record<string, unknown> = {}) {
  return createGearGeometry({ width: rackLength(MODULE, teeth), depth: 6, height: HEIGHT, teeth, gearType: "rack" as GearType, gearProfile: PROFILE, ...extra });
}

function pinion(teeth: number, helixAngle: number, herringbone: boolean) {
  const diameter = involuteGearDiameter(MODULE, teeth, PROFILE);
  return createGearGeometry({ width: diameter, depth: diameter, height: HEIGHT, teeth, gearType: (herringbone ? "herringbone" : "helical") as GearType, helixAngle, helixQuality: 24, gearProfile: PROFILE, centerHoleSize: 0 });
}

/** The least the pinion cuts into the other body, over one tooth's turn: about nothing when they mesh. */
function leastOverlap(other: THREE.BufferGeometry, gear: THREE.BufferGeometry, teeth: number, place: THREE.Matrix4) {
  const body = solid(other);
  let least = Infinity;
  for (let step = 0; step < 16; step += 1) {
    const turn = new THREE.Matrix4().makeRotationY(((step / 16) * 2 * Math.PI) / teeth);
    least = Math.min(least, body.intersect(solid(gear, place.clone().multiply(turn))).volume());
  }
  return least;
}

describe("ring gears and racks with slanted teeth (Discussion #1627)", () => {
  it.each([
    ["helical ring gear", () => ring(36, { ringRackHelixAngle: 20 }), () => ring(36)],
    ["herringbone ring gear", () => ring(36, { ringRackHelixAngle: -25, ringRackHerringbone: true }), () => ring(36)],
    ["round-toothed helical ring gear", () => ring(30, { ringRackHelixAngle: 15, gearProfile: "round" }), () => ring(30, { gearProfile: "round" })],
    ["helical rack", () => rack(12, { ringRackHelixAngle: 20 }), () => rack(12)],
    ["rack slanted the other way, steeply", () => rack(12, { ringRackHelixAngle: -45 }), () => rack(12)],
    ["herringbone rack", () => rack(12, { ringRackHelixAngle: 30, ringRackHerringbone: true }), () => rack(12)],
    ["round-toothed herringbone rack", () => rack(10, { ringRackHelixAngle: 20, ringRackHerringbone: true, gearProfile: "round" }), () => rack(10, { gearProfile: "round" })],
  ])("draws the %s as a closed body of the straight one's volume and size", (_name, slanted, straight) => {
    const body = solid(slanted());
    expect(body.status()).toBe("NoError");
    const reference = solid(straight());
    // The ring's turn is drawn in straight steps; within them the area stays.
    expect(Math.abs(body.volume() - reference.volume()) / reference.volume()).toBeLessThan(0.003);
    const box = body.boundingBox();
    const straightBox = reference.boundingBox();
    for (const axis of [0, 1, 2]) {
      expect(box.min[axis]).toBeCloseTo(straightBox.min[axis], 3);
      expect(box.max[axis]).toBeCloseTo(straightBox.max[axis], 3);
    }
  });

  it("keeps the rack's length exactly: its ends are cut square where the straight rack ends", () => {
    const geometry = rack(12, { ringRackHelixAngle: 35 });
    geometry.computeBoundingBox();
    expect(geometry.boundingBox!.max.x - geometry.boundingBox!.min.x).toBeCloseTo(rackLength(MODULE, 12), 6);
  });

  it("leaves a straight ring gear and rack as they were", () => {
    expect(ring(36, { ringRackHelixAngle: 0, ringRackHerringbone: true }).getAttribute("position").count).toBe(ring(36).getAttribute("position").count);
    expect(rack(12, { ringRackHerringbone: true }).getAttribute("position").count).toBe(rack(12).getAttribute("position").count);
  });

  it.each([
    ["helical", 20, false],
    ["herringbone", 25, true],
  ])("meshes a %s ring gear with a gear of the same helix angle, not with one of the other", (_name, angle, herringbone) => {
    const centre = (MODULE * (36 - 12)) / 2;
    const place = new THREE.Matrix4().makeTranslation(centre, 0, 0);
    const other = ring(36, { ringRackHelixAngle: angle, ringRackHerringbone: herringbone });
    const same = leastOverlap(other, pinion(12, angle, herringbone), 12, place);
    const opposite = leastOverlap(other, pinion(12, -angle, herringbone), 12, place);
    expect(same).toBeLessThan(0.05);
    expect(opposite).toBeGreaterThan(20 * Math.max(same, 0.05));
  }, 60_000);

  it.each([
    ["helical", 20, false],
    ["herringbone", 25, true],
  ])("meshes a %s rack with a gear of the same helix angle, not with one of the other", (_name, angle, herringbone) => {
    const measures = rackMeasures(rackLength(MODULE, 12), 6, { teeth: 12, gearProfile: PROFILE });
    // The gear above the rack's teeth, its pitch circle on the rack's pitch line.
    const place = new THREE.Matrix4().makeTranslation(0, 0, measures.pitchZ + (MODULE * 12) / 2);
    const other = rack(12, { ringRackHelixAngle: angle, ringRackHerringbone: herringbone });
    const same = leastOverlap(other, pinion(12, angle, herringbone), 12, place);
    const opposite = leastOverlap(other, pinion(12, -angle, herringbone), 12, place);
    expect(same).toBeLessThan(0.05);
    expect(opposite).toBeGreaterThan(20 * Math.max(same, 0.05));
  }, 60_000);

  it("keeps the slant and the herringbone teeth through saving and loading", async () => {
    const shape = (id: string, gearType: GearType, extra: Partial<WorkplaneShape>) => ({
      id, name: id, kind: "gear", color: "#888888", x: 0, z: 0, elevation: 0, rotation: 0, width: 40, depth: 40, size: 40, height: 8,
      teeth: 24, toothSize: 2.5, centerHoleSize: 0, helixAngle: 22.5, helixQuality: 16, gearType, gearProfile: "involute", ...extra,
    }) as WorkplaneShape;
    const shapes = [shape("ring", "internal", { ringRackHelixAngle: -20, ringRackHerringbone: true }), shape("rack", "rack", { depth: 6, ringRackHelixAngle: 30 })];
    const exported = await exportLylProject({
      projectId: "gears", projectName: "Gears", createdAt: 1_700_000_000_000, modifiedAt: 1_700_000_100_000, shapes,
      history: [editorHistoryEntry(shapes, [])], historyIndex: 0, assets: [], workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0,
    });
    const restored = new Map((await importLylProject(exported)).shapes.map((entry) => [entry.id, entry]));
    expect(restored.get("ring")).toMatchObject({ ringRackHelixAngle: -20, ringRackHerringbone: true });
    expect(restored.get("rack")).toMatchObject({ ringRackHelixAngle: 30 });
  });

  it("gives the edge tools a slanted ring gear's exact body up to the helical gear's corner limit, the STEP export at any size", () => {
    const ringShape = (teeth: number) => {
      const diameter = internalGearDiameter(MODULE, teeth, 2, PROFILE);
      return { id: "r", name: "r", kind: "gear", color: "#888888", x: 0, z: 0, elevation: 0, rotation: 0, width: diameter, depth: diameter, size: diameter, height: 8, teeth, gearType: "internal", gearProfile: PROFILE, gearRim: 2, ringRackHelixAngle: 20 } as WorkplaneShape;
    };
    expect(cadModifierHelicalGearForShape(ringShape(30))).not.toBeNull();
    expect(cadModifierHelicalGearForShape(ringShape(36))).toBeNull();
    expect(cadModifierHelicalGearForShape(ringShape(36), { anySize: true })).not.toBeNull();
  });
});