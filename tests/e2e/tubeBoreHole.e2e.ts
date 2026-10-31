import { beforeAll, describe, expect, it, vi } from "vitest";
import manifoldModule from "manifold-3d";
import type { WorkplaneShape } from "@/types/layerling";
import { buildGroupedShapeFromSelection, manifoldFromMeshData, splitBoreTube } from "@/lib/editorBooleans";
import { bentTubeNaturalDimensions, bentTubeProfileRadii, bentTubeSettings, normalizedBentTubeFields } from "@/lib/bentTubeGeometry";
import { boundsForShapesOfVertices, meshForShape } from "@/lib/editorMeshCore";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { edgeTreatmentAppliedFrame } from "@/lib/edgeTreatmentHistory";
import { normalizeShapeCustomizations } from "@/lib/workplaneSettings";

/**
 * Two tubes grouped into a T-junction: the bore of one does not cut the wall of the other, so nothing flows through (#892).
 * With "Bore cuts as a hole when grouped" the tube is cut as an outer cylinder and a bore hole, and the junction opens.
 */
const kernel = vi.hoisted(() => ({ runtime: null as Promise<unknown> | null }));
vi.mock("@/lib/editorMeshCore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/editorMeshCore")>()),
  getManifoldRuntime: () => kernel.runtime,
}));
let runtime: Awaited<ReturnType<typeof manifoldModule>>;
beforeAll(async () => {
  kernel.runtime = manifoldModule().then((loaded) => { loaded.setup(); rememberManifoldRuntime(loaded); runtime = loaded; return loaded; });
  await kernel.runtime;
});

const tube = (id: string, extra: Partial<WorkplaneShape>) => ({ id, name: "Tube", kind: "tube", color: "#c33", x: 0, z: 0, elevation: 0, rotation: 0, size: 20, width: 20, depth: 20, height: 60, bevel: 3, locked: false, hidden: false, ...extra } as WorkplaneShape);

/** A standing tube (outer 20, bore 14) and a tube lying along x (outer 12, bore 8) that ends in the middle of the first. */
const tubes = (bore: boolean) => [
  tube("upright", { tubeBoreHole: bore || undefined }),
  tube("lying", { x: 25, elevation: 5, rotationZ: 90, width: 12, depth: 12, size: 12, height: 50, bevel: 2, tubeBoreHole: bore || undefined }),
];

/** The volume of the group inside a thin rod along x through the middle of the lying tube's bore, across the standing tube's wall. */
async function blockedVolume(bore: boolean) {
  const { group } = await buildGroupedShapeFromSelection(tubes(bore), 500_000);
  expect(group).not.toBeNull();
  const solid = manifoldFromMeshData(runtime, meshForShape(group!));
  const rod = runtime.Manifold.cylinder(2, 1, 1, 32).rotate([0, 90, 0]).translate([7.5, 30, 0]);
  const inside = solid.intersect(rod);
  const volume = inside.volume();
  [solid, rod, inside].forEach((item) => item.delete());
  return volume;
}

describe("a tube whose bore cuts as a hole (#892)", () => {
  it("leaves the wall of the other tube standing without the switch", async () => {
    expect(await blockedVolume(false)).toBeGreaterThan(5);
  });

  it("opens the wall of the other tube with it", async () => {
    expect(await blockedVolume(true)).toBeLessThan(0.01);
  });

  it("is cut as an outer cylinder and a bore hole, and stays one shape otherwise", () => {
    const parts = splitBoreTube(tube("t", { tubeBoreHole: true }));
    expect(parts.map((part) => [part.kind, part.hole === true, part.width])).toEqual([["cylinder", false, 20], ["cylinder", true, 14]]);
    expect(parts[1].id).not.toBe(parts[0].id);
    expect(splitBoreTube(tube("t", {}))).toHaveLength(1);
    expect(splitBoreTube(tube("t", { tubeBoreHole: true, hole: true }))).toHaveLength(1);
    // A wall as thick as the radius has no bore to cut.
    expect(splitBoreTube(tube("t", { tubeBoreHole: true, bevel: 10 }))).toHaveLength(1);
  });
});

/**
 * A tube with filleted ends is one mesh, which the fillet made from the tube; the first entry of its history remembers the
 * tube. Here the mesh is the tube's own, standing in for the rounded one: what counts is where its bore goes (#1067).
 */
function filletedTube(base: WorkplaneShape, extra: Partial<WorkplaneShape> = {}) {
  const mesh = meshForShape(base);
  const box = boundsForShapesOfVertices([base]);
  const x = (box.minX + box.maxX) / 2;
  const z = (box.minZ + box.maxZ) / 2;
  const positions = mesh.faces.flatMap((face) => face.flatMap((index) => [mesh.vertices[index][0] - x, mesh.vertices[index][1] - box.minY, mesh.vertices[index][2] - z]));
  const width = box.maxX - box.minX;
  const depth = box.maxZ - box.minZ;
  const height = box.maxY - box.minY;
  const filleted = {
    ...base, kind: "mesh", x, z, elevation: box.minY, width, depth, height, size: Math.max(width, depth), rotation: 0, rotationX: 0, rotationZ: 0,
    importedMesh: { positions, baseWidth: width, baseDepth: depth, baseHeight: height, triangleCount: mesh.faces.length, sourceFormat: "step" },
  } as WorkplaneShape;
  return {
    ...filleted,
    edgeTreatments: [{ kind: "fillet", amount: 1, edgeCount: 2 }],
    edgeTreatmentHistory: [{ id: "fillet", createdAt: 0, feature: { kind: "fillet", amount: 1, edgeCount: 2 }, before: base, appliedFrame: edgeTreatmentAppliedFrame(filleted) }],
    ...extra,
  } as WorkplaneShape;
}

describe("a filleted tube whose bore cuts as a hole (#1067)", () => {
  /** The lying tube filleted: only its bore opens the standing tube's wall where the rod runs. */
  async function blocked(bore: boolean) {
    const lying = filletedTube({ ...tubes(false)[1], tubeBoreHole: bore || undefined });
    const { group } = await buildGroupedShapeFromSelection([tubes(false)[0], lying], 500_000);
    const solid = manifoldFromMeshData(runtime, meshForShape(group!));
    const rod = runtime.Manifold.cylinder(2, 1, 1, 32).rotate([0, 90, 0]).translate([7.5, 30, 0]);
    const inside = solid.intersect(rod);
    const volume = inside.volume();
    [solid, rod, inside].forEach((item) => item.delete());
    return volume;
  }

  it("still opens the wall of the other tube", async () => {
    expect(await blocked(false)).toBeGreaterThan(5);
    expect(await blocked(true)).toBeLessThan(0.01);
  });

  it("keeps the filleted body and cuts with the tube's bore where the body now stands", () => {
    const parts = splitBoreTube(filletedTube(tube("upright", {}), { tubeBoreHole: true, x: 7 }));
    expect(parts.map((part) => [part.kind, part.hole === true])).toEqual([["mesh", false], ["cylinder", true]]);
    expect(parts[0].tubeBoreHole).toBeUndefined();
    expect(parts[1].width).toBe(14);
    expect(parts[1].x).toBe(7);
    // The AI bridge reads the switch through the shape settings, which dropped it.
    expect(normalizeShapeCustomizations({ tube: { tubeBoreHole: true }, bentTube: { tubeBoreHole: false } })).toMatchObject({ tube: { tubeBoreHole: true }, bentTube: { tubeBoreHole: false } });
    // A body that was never a tube has no bore to hand on.
    expect(splitBoreTube(filletedTube({ ...tube("box", {}), kind: "box" } as WorkplaneShape, { tubeBoreHole: true }))).toHaveLength(1);
  });
});

/** A straight bent tube (outer 10, bore 6) lying along x through a 6 mm wall: the bore only cuts that wall with the switch (#892). */
function bentPipe(bore: boolean) {
  const fields = normalizedBentTubeFields({ bentTubeSize: 10, bentTubeWall: 2, bentTubeSegments: [{ length: 40, bendAngle: 0, bendRadius: 15, roll: 0 }] });
  const natural = bentTubeNaturalDimensions(fields);
  return { id: "pipe", name: "Bent tube", kind: "bentTube", color: "#c33", x: 0, z: 0, elevation: 0, rotation: 0, locked: false, hidden: false, ...fields, width: natural.width, depth: natural.depth, height: natural.height, size: natural.size, tubeBoreHole: bore || undefined } as WorkplaneShape;
}
const wall = () => ({ id: "wall", name: "Wall", kind: "box", color: "#33c", x: 0, z: 0, elevation: 0, rotation: 0, size: 30, width: 6, depth: 30, height: 30, locked: false, hidden: false } as WorkplaneShape);

async function bentPipeBlockedVolume(bore: boolean) {
  const { group } = await buildGroupedShapeFromSelection([bentPipe(bore), wall()], 500_000);
  expect(group).not.toBeNull();
  const solid = manifoldFromMeshData(runtime, meshForShape(group!));
  const rod = runtime.Manifold.cylinder(2, 1, 1, 32).rotate([0, 90, 0]).translate([-1, 5, 0]);
  const inside = solid.intersect(rod);
  const volume = inside.volume();
  [solid, rod, inside].forEach((item) => item.delete());
  return volume;
}

describe("a bent tube whose opening cuts as a hole (#892)", () => {
  it("leaves the wall standing in its opening without the switch", async () => {
    expect(await bentPipeBlockedVolume(false)).toBeGreaterThan(3);
  });

  it("opens the wall with it", async () => {
    expect(await bentPipeBlockedVolume(true)).toBeLessThan(0.05);
  });

  it("keeps the opening in the middle of the pipe, so its own wall stays closed", async () => {
    // Lying, stood up and tipped: the bottom of the pipe's wall (2 mm) is still there beside the other wall.
    for (const turn of [{}, { rotationZ: 90 }, { rotationX: 30, rotation: 20 }]) {
      const pipe = { ...bentPipe(true), ...turn } as WorkplaneShape;
      const [solid, bore] = splitBoreTube(pipe);
      const solidBox = boundsForShapesOfVertices([solid]);
      const boreBox = boundsForShapesOfVertices([bore]);
      for (const [low, high] of [["minX", "maxX"], ["minY", "maxY"], ["minZ", "maxZ"]] as const) {
        expect((boreBox[low] + boreBox[high]) / 2).toBeCloseTo((solidBox[low] + solidBox[high]) / 2, 3);
      }
    }
    const { group } = await buildGroupedShapeFromSelection([bentPipe(true), wall()], 500_000);
    const solid = manifoldFromMeshData(runtime, meshForShape(group!));
    const floor = runtime.Manifold.cube([4, 1.2, 1], true).translate([-14, 1, 0]);
    const kept = solid.intersect(floor);
    const volume = kept.volume();
    [solid, floor, kept].forEach((item) => item.delete());
    expect(volume).toBeGreaterThan(4.8 * 0.95);
  });

  it("is cut as a solid pipe and an opening that is a hole, and stays one shape otherwise", () => {
    const parts = splitBoreTube(bentPipe(true));
    expect(parts.map((part) => [part.bentTubeInnerProfile, part.hole === true])).toEqual([["none", false], ["none", true]]);
    expect(parts[1].bentTubeSize).toBeCloseTo(6, 5);
    expect(parts[0].bentTubeSize).toBe(10);
    // Whatever the profiles: the hole's outside is the pipe's opening.
    for (const [profile, innerProfile] of [["square", "round"], ["round", "hexagon"], ["octagon", "square"]] as const) {
      const pipe = { ...bentPipe(true), ...normalizedBentTubeFields({ ...bentPipe(true), bentTubeProfile: profile, bentTubeInnerProfile: innerProfile }) } as WorkplaneShape;
      const opening = bentTubeProfileRadii(bentTubeSettings(pipe)).inner;
      const bore = splitBoreTube(pipe)[1];
      expect(bore.bentTubeProfile).toBe(innerProfile);
      expect(bentTubeProfileRadii(bentTubeSettings(bore)).outer).toBeCloseTo(opening!, 5);
    }
    expect(splitBoreTube(bentPipe(false))).toHaveLength(1);
    expect(splitBoreTube({ ...bentPipe(true), bentTubeInnerProfile: "none" } as WorkplaneShape)).toHaveLength(1);
  });
});
