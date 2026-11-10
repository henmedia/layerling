import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import * as THREE from "three";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { beforeAll, describe, expect, it } from "vitest";
import {
  BENT_TUBE_INNER_PROFILES,
  BENT_TUBE_PROFILES,
  bentTubeNaturalDimensions,
  bentTubeParameterPatch,
  bentTubeProfiles,
  bentTubeSelfIntersects,
  bentTubeSettings,
  bentTubeWallLimits,
  buildBentTubeMesh,
  createBentTubeGeometry,
  createBentTubeSegmentGeometry,
  minBentTubeBendRadius,
  normalizeBentTubeSegments,
  normalizedBentTubeFields,
  type BentTubeShapeFields,
} from "@/lib/bentTubeGeometry";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject, type LylProjectDocumentV1 } from "@/lib/lylProject";
import { makeShapeFromAsset, sceneShape, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE, normalizeShapeCustomizations } from "@/lib/workplaneSettings";
import { canonicalizeShape, shapeSupportsTaper, workplaneShapesEqual } from "@/lib/workplaneShapes";
import type { BentTubeSegment, WorkplaneShape } from "@/types/layerling";

type Vec3 = [number, number, number];

/** Every directed edge of a closed, consistently oriented mesh has exactly one partner running the other way. */
function orientedEdgeDefects(indices: number[]) {
  const directed = new Map<string, number>();
  for (let index = 0; index < indices.length; index += 3) {
    const triangle = [indices[index], indices[index + 1], indices[index + 2]];
    for (let edge = 0; edge < 3; edge += 1) {
      const key = `${triangle[edge]}>${triangle[(edge + 1) % 3]}`;
      directed.set(key, (directed.get(key) ?? 0) + 1);
    }
  }
  let defects = 0;
  directed.forEach((count, key) => {
    const [a, b] = key.split(">");
    if (count !== 1 || directed.get(`${b}>${a}`) !== 1) defects += 1;
  });
  return defects;
}

function degenerateTriangles(positions: ArrayLike<number>, indices: number[]) {
  let count = 0;
  for (let index = 0; index < indices.length; index += 3) {
    const a = new THREE.Vector3(positions[indices[index] * 3], positions[indices[index] * 3 + 1], positions[indices[index] * 3 + 2]);
    const b = new THREE.Vector3(positions[indices[index + 1] * 3], positions[indices[index + 1] * 3 + 1], positions[indices[index + 1] * 3 + 2]);
    const c = new THREE.Vector3(positions[indices[index + 2] * 3], positions[indices[index + 2] * 3 + 1], positions[indices[index + 2] * 3 + 2]);
    if (b.clone().sub(a).cross(c.clone().sub(a)).length() < 1e-9) count += 1;
  }
  return count;
}

function signedVolume(positions: ArrayLike<number>, indices: number[]) {
  let total = 0;
  for (let index = 0; index < indices.length; index += 3) {
    const [a, b, c] = [indices[index] * 3, indices[index + 1] * 3, indices[index + 2] * 3];
    total += (
      positions[a] * (positions[b + 1] * positions[c + 2] - positions[b + 2] * positions[c + 1])
      + positions[a + 1] * (positions[b + 2] * positions[c] - positions[b] * positions[c + 2])
      + positions[a + 2] * (positions[b] * positions[c + 1] - positions[b + 1] * positions[c])
    ) / 6;
  }
  return total;
}

function polygonArea(points: Array<[number, number]>) {
  let area = 0;
  points.forEach(([ax, ay], index) => {
    const [bx, by] = points[(index + 1) % points.length];
    area += ax * by - bx * ay;
  });
  return Math.abs(area) / 2;
}

/** Volume the swept rings enclose: section area times the length their centres travel. */
function expectedVolume(fields: BentTubeShapeFields) {
  const settings = bentTubeSettings(fields);
  const profiles = bentTubeProfiles(settings);
  const area = polygonArea(profiles.outer) - (profiles.inner ? polygonArea(profiles.inner) : 0);
  const travel = settings.segments.reduce((total, segment) => {
    const steps = Math.max(1, Math.ceil((Math.abs(segment.bendAngle) * settings.quality) / 240));
    const step = (Math.abs(segment.bendAngle) * Math.PI) / 180 / steps;
    const chords = Math.abs(segment.bendAngle) > 0 ? steps * 2 * segment.bendRadius * Math.sin(step / 2) : 0;
    return total + segment.length + chords;
  }, 0);
  return area * travel;
}

/**
 * The same path the editor takes for grouping, holes and export: the rendered
 * (non-indexed, crease-normal) geometry, welded by manifold at 0.0001 mm.
 */
function manifoldFromGeometry(runtime: ManifoldToplevel, geometry: THREE.BufferGeometry, matrix?: THREE.Matrix4) {
  const position = geometry.getAttribute("position");
  const vertProperties = new Float32Array(position.count * 3);
  const point = new THREE.Vector3();
  for (let index = 0; index < position.count; index += 1) {
    point.fromBufferAttribute(position, index);
    if (matrix) point.applyMatrix4(matrix);
    vertProperties[index * 3] = point.x;
    vertProperties[index * 3 + 1] = point.y;
    vertProperties[index * 3 + 2] = point.z;
  }
  const triVerts = new Uint32Array(position.count);
  for (let index = 0; index < position.count; index += 1) triVerts[index] = index;
  const mesh = new runtime.Mesh({ numProp: 3, vertProperties, triVerts, tolerance: 0.0001 });
  mesh.merge();
  return runtime.Manifold.ofMesh(mesh);
}

function naturalGeometry(fields: BentTubeShapeFields) {
  return createBentTubeGeometry({ ...fields, ...bentTubeNaturalDimensions(fields) });
}

function bentTube(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  const fields = normalizedBentTubeFields(overrides);
  const natural = bentTubeNaturalDimensions(fields);
  return {
    id: "bent-1",
    name: "Bent Tube",
    kind: "bentTube",
    color: "#b5651d",
    x: 0,
    z: 0,
    elevation: 0,
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    locked: false,
    hidden: false,
    ...natural,
    ...fields,
    ...overrides,
  } as WorkplaneShape;
}

/**
 * Where the start of the tube sits in the world, computed from the mesh and
 * the shape's transform the way the viewport places it - independent of the
 * placement code under test. `bakedRotation` stands for a shape that the
 * editor has rotated and baked: its position is then the centre of the rotated
 * body's bounds.
 */
function worldStart(shape: WorkplaneShape, bakedRotation?: { rotation: number; rotationX: number; rotationZ: number }) {
  const mesh = buildBentTubeMesh(bentTubeSettings(shape));
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let index = 0; index < mesh.outerVertexCount; index += 1) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], mesh.positions[index * 3 + axis]);
      max[axis] = Math.max(max[axis], mesh.positions[index * 3 + axis]);
    }
  }
  const factor = [shape.width / (max[0] - min[0]), shape.height / (max[1] - min[1]), shape.depth / (max[2] - min[2])];
  const toObject = (natural: Vec3) => new THREE.Vector3(
    (natural[0] - (min[0] + max[0]) / 2) * factor[0],
    (natural[1] - min[1]) * factor[1] - shape.height / 2,
    (natural[2] - (min[2] + max[2]) / 2) * factor[2],
  );
  const euler = bakedRotation ?? { rotation: shape.rotation, rotationX: shape.rotationX ?? 0, rotationZ: shape.rotationZ ?? 0 };
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(
    THREE.MathUtils.degToRad(euler.rotationX),
    THREE.MathUtils.degToRad(euler.rotation),
    THREE.MathUtils.degToRad(euler.rotationZ),
    "XYZ",
  ));
  // A mirror flips the body about its centre before the turn.
  const mirror = bakedRotation ? new THREE.Vector3(1, 1, 1) : new THREE.Vector3(shape.mirrorX ? -1 : 1, shape.mirrorY ? -1 : 1, shape.mirrorZ ? -1 : 1);
  const start = toObject([0, 0, 0]).multiply(mirror).applyQuaternion(quaternion);
  // Standing on its floor, the box's centre is half its height above the floor.
  if (!bakedRotation) return new THREE.Vector3(shape.x, (shape.elevation ?? 0) + shape.height / 2, shape.z).add(start);
  const box = new THREE.Box3();
  for (let index = 0; index < mesh.outerVertexCount; index += 1) {
    box.expandByPoint(toObject([mesh.positions[index * 3], mesh.positions[index * 3 + 1], mesh.positions[index * 3 + 2]]).applyQuaternion(quaternion));
  }
  const centre = box.getCenter(new THREE.Vector3());
  // A baked body's floor is the bottom of its rotated bounds.
  return new THREE.Vector3(shape.x + start.x - centre.x, (shape.elevation ?? 0) + start.y - box.min.y, shape.z + start.z - centre.z);
}

describe("bent tube geometry", () => {
  let runtime: ManifoldToplevel;

  beforeAll(async () => {
    runtime = await manifoldModule();
    runtime.setup();
  });

  describe("closed, consistently oriented body for every profile pairing", () => {
    const pairings = BENT_TUBE_PROFILES.flatMap((profile) => BENT_TUBE_INNER_PROFILES.map((inner) => [profile, inner] as const));
    it.each(pairings)("outer %s, inner %s", (profile, inner) => {
      const fields: BentTubeShapeFields = {
        bentTubeProfile: profile,
        bentTubeInnerProfile: inner,
        bentTubeSize: 12,
        bentTubeWall: 2,
        bentTubeSegments: [
          { length: 20, bendAngle: 90, bendRadius: 18, roll: 0 },
          { length: 10, bendAngle: -60, bendRadius: 20, roll: 45 },
          { length: 15, bendAngle: 120, bendRadius: 16, roll: 90 },
          { length: 5, bendAngle: 0, bendRadius: 16, roll: 0 },
        ],
      };
      const mesh = buildBentTubeMesh(bentTubeSettings(fields));
      expect(orientedEdgeDefects(mesh.indices)).toBe(0);
      expect(degenerateTriangles(mesh.positions, mesh.indices)).toBe(0);
      const volume = signedVolume(mesh.positions, mesh.indices);
      expect(volume).toBeGreaterThan(0);
      expect(volume / expectedVolume(fields)).toBeCloseTo(1, 2);

      const solid = manifoldFromGeometry(runtime, naturalGeometry(fields));
      expect(solid.status()).toBe("NoError");
      expect(solid.genus()).toBe(inner === "none" ? 0 : 1);
      expect(solid.volume() / volume).toBeCloseTo(1, 4);
      solid.delete();
    });
  });

  it("stays closed at the tightest allowed bend and at both quality limits", () => {
    for (const profile of BENT_TUBE_PROFILES) {
      for (const quality of [12, 96]) {
        const radius = minBentTubeBendRadius(profile, 10, quality);
        const fields: BentTubeShapeFields = {
          bentTubeProfile: profile,
          bentTubeInnerProfile: "round",
          bentTubeSize: 10,
          bentTubeWall: 1,
          bentTubeQuality: quality,
          bentTubeSegments: [{ length: 0, bendAngle: 180, bendRadius: 0.01, roll: 0 }, { length: 10, bendAngle: 0, bendRadius: radius, roll: 0 }],
        };
        expect(bentTubeSettings(fields).segments[0].bendRadius).toBeCloseTo(radius, 9);
        const mesh = buildBentTubeMesh(bentTubeSettings(fields));
        expect(orientedEdgeDefects(mesh.indices)).toBe(0);
        expect(degenerateTriangles(mesh.positions, mesh.indices)).toBe(0);
        const solid = manifoldFromGeometry(runtime, naturalGeometry(fields));
        expect(solid.status()).toBe("NoError");
        expect(solid.genus()).toBe(1);
        solid.delete();
      }
    }
  });

  it("keeps the bend radius above half the outer size, measured to the profile corners", () => {
    expect(minBentTubeBendRadius("round", 10)).toBeCloseTo(5.1, 9);
    expect(minBentTubeBendRadius("square", 10)).toBeCloseTo(5 * Math.SQRT2 + 0.1, 9);
    expect(minBentTubeBendRadius("hexagon", 10)).toBeCloseTo(5 / Math.cos(Math.PI / 6) + 0.1, 9);
    expect(minBentTubeBendRadius("octagon", 10)).toBeCloseTo(5 / Math.cos(Math.PI / 8) + 0.1, 9);
    const clamped = normalizeBentTubeSegments([{ length: 5, bendAngle: 90, bendRadius: 2, roll: 0 }], "square", 10);
    expect(clamped[0].bendRadius).toBeCloseTo(5 * Math.SQRT2 + 0.1, 9);
  });

  it("never lets the inner profile reach through the outer one", () => {
    for (const profile of BENT_TUBE_PROFILES) {
      for (const inner of BENT_TUBE_INNER_PROFILES.filter((entry) => entry !== "none")) {
        const limits = bentTubeWallLimits(profile, inner, 10);
        for (const wall of [limits.min, (limits.min + limits.max) / 2, limits.max, limits.max + 5]) {
          const settings = bentTubeSettings({ bentTubeProfile: profile, bentTubeInnerProfile: inner, bentTubeSize: 10, bentTubeWall: wall });
          const { outer, inner: hole } = bentTubeProfiles(settings);
          const outerInradius = Math.min(...outer.map(([ax, ay], index) => {
            const [bx, by] = outer[(index + 1) % outer.length];
            return Math.abs(ax * by - bx * ay) / Math.hypot(bx - ax, by - ay);
          }));
          const innerCircumradius = Math.max(...hole!.map(([x, y]) => Math.hypot(x, y)));
          const innerInradius = Math.min(...hole!.map(([ax, ay], index) => {
            const [bx, by] = hole![(index + 1) % hole!.length];
            return Math.abs(ax * by - bx * ay) / Math.hypot(bx - ax, by - ay);
          }));
          expect(innerInradius).toBeGreaterThanOrEqual(0.1 * Math.cos(Math.PI / 4) - 1e-9);
          if (inner === profile) {
            // Uniform offset: the wall is the same across the flats.
            const flats = profile === "round" ? Math.cos(Math.PI / settings.quality) : 1;
            expect(outerInradius - innerInradius).toBeCloseTo(settings.wall * flats, 9);
          } else {
            // Different profiles: the wall at its thinnest, the inner corners.
            expect(innerCircumradius).toBeLessThan(outerInradius);
            expect(outerInradius - innerCircumradius).toBeCloseTo(settings.wall, 9);
          }
        }
      }
    }
    // The same profile inside and out gives a uniform wall across the flats.
    const square = bentTubeProfiles(bentTubeSettings({ bentTubeProfile: "square", bentTubeInnerProfile: "square", bentTubeSize: 10, bentTubeWall: 2 }));
    expect(Math.max(...square.inner!.map(([x]) => x))).toBeCloseTo(3, 9);
  });

  it("measures an elbow exactly and fits the geometry to the shape's box", () => {
    // Square 10 mm, 25 mm straight, 90 degree bend of radius 15, 25 mm straight.
    const fields: BentTubeShapeFields = { bentTubeProfile: "square", bentTubeInnerProfile: "none", bentTubeSize: 10 };
    expect(bentTubeNaturalDimensions(fields)).toMatchObject({ width: expect.closeTo(45, 9), depth: expect.closeTo(45, 9), height: expect.closeTo(10, 9) });

    const upward = { ...fields, bentTubeSegments: [{ length: 25, bendAngle: 90, bendRadius: 15, roll: 90 }, { length: 25, bendAngle: 0, bendRadius: 15, roll: 0 }] };
    expect(bentTubeNaturalDimensions(upward)).toMatchObject({ width: expect.closeTo(45, 9), depth: expect.closeTo(10, 9), height: expect.closeTo(45, 9) });

    const geometry = createBentTubeGeometry({ ...fields, width: 45, depth: 45, height: 10 });
    const box = geometry.boundingBox!;
    expect(box.min.y).toBeCloseTo(0, 5);
    expect(box.max.y).toBeCloseTo(10, 5);
    expect(box.max.x - box.min.x).toBeCloseTo(45, 5);
    expect(box.max.z - box.min.z).toBeCloseTo(45, 5);
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(0, 5);
    expect((box.min.z + box.max.z) / 2).toBeCloseTo(0, 5);

    const stretched = createBentTubeGeometry({ ...fields, width: 90, depth: 45, height: 20 }).boundingBox!;
    expect(stretched.max.x - stretched.min.x).toBeCloseTo(90, 5);
    expect(stretched.max.y - stretched.min.y).toBeCloseTo(20, 5);
  });

  it("reports a chain that runs back into itself, and only then", () => {
    expect(bentTubeSelfIntersects({})).toBe(false);
    // U-turn with the legs 12 mm apart: 10 mm tubes pass without touching.
    expect(bentTubeSelfIntersects({ bentTubeSize: 10, bentTubeSegments: [
      { length: 50, bendAngle: 180, bendRadius: 6, roll: 0 },
      { length: 50, bendAngle: 0, bendRadius: 6, roll: 0 },
    ] })).toBe(false);
    // The same U-turn made tighter than the tube is wide.
    expect(bentTubeSelfIntersects({ bentTubeSize: 10, bentTubeSegments: [
      { length: 50, bendAngle: 90, bendRadius: 5.1, roll: 0 },
      { length: 0, bendAngle: 90, bendRadius: 5.1, roll: 0 },
      { length: 50, bendAngle: 0, bendRadius: 5.1, roll: 0 },
    ] })).toBe(false);
    // Three quarter turns back across the first leg.
    expect(bentTubeSelfIntersects({ bentTubeSize: 10, bentTubeSegments: [
      { length: 60, bendAngle: 90, bendRadius: 8, roll: 0 },
      { length: 30, bendAngle: 90, bendRadius: 8, roll: 0 },
      { length: 30, bendAngle: 90, bendRadius: 8, roll: 0 },
      { length: 50, bendAngle: 0, bendRadius: 8, roll: 0 },
    ] })).toBe(true);
    // A full circle of 360 degrees made from two half bends closes onto its own start.
    expect(bentTubeSelfIntersects({ bentTubeSize: 10, bentTubeSegments: [
      { length: 0, bendAngle: 180, bendRadius: 20, roll: 0 },
      { length: 0, bendAngle: 180, bendRadius: 20, roll: 0 },
    ] })).toBe(true);
    // The same loop with a 15 mm straight between the halves stops short of its start.
    expect(bentTubeSelfIntersects({ bentTubeSize: 10, bentTubeSegments: [
      { length: 0, bendAngle: 180, bendRadius: 20, roll: 0 },
      { length: 15, bendAngle: 180, bendRadius: 20, roll: 0 },
    ] })).toBe(false);
  });
});

describe("bent tube editing", () => {
  let runtime: ManifoldToplevel;

  beforeAll(async () => {
    runtime = await manifoldModule();
    runtime.setup();
  });

  it("keeps the start of a moved tube in place while a slider is dragged, one value at a time", () => {
    let shape = bentTube({ x: 137.5, z: -84.25, elevation: 12 });
    const anchor = worldStart(shape);
    const first = shape.bentTubeSegments!;
    // A drag delivers many intermediate values; each one is applied to the
    // result of the previous one, exactly as the inspector does it.
    for (let length = 25; length <= 60; length += 0.5) {
      shape = { ...shape, ...bentTubeParameterPatch(shape, { bentTubeSegments: [{ ...first[0], length }, first[1]] }) };
      const start = worldStart(shape);
      expect(start.x).toBeCloseTo(anchor.x, 6);
      expect(start.z).toBeCloseTo(anchor.z, 6);
    }
    for (let angle = 90; angle >= -170; angle -= 5) {
      const segments = shape.bentTubeSegments!;
      shape = { ...shape, ...bentTubeParameterPatch(shape, { bentTubeSegments: [{ ...segments[0], bendAngle: angle }, segments[1]] }) };
    }
    const end = worldStart(shape);
    expect(end.x).toBeCloseTo(anchor.x, 6);
    expect(end.z).toBeCloseTo(anchor.z, 6);

    // Many small steps land where one large step lands.
    const direct = bentTube({ x: 137.5, z: -84.25, elevation: 12 });
    const once = { ...direct, ...bentTubeParameterPatch(direct, { bentTubeSegments: shape.bentTubeSegments }) };
    expect(once.x).toBeCloseTo(shape.x, 6);
    expect(once.z).toBeCloseTo(shape.z, 6);
    expect(once.width).toBeCloseTo(shape.width, 9);
    expect(once.depth).toBeCloseTo(shape.depth, 9);
    expect(once.height).toBeCloseTo(shape.height, 9);
  });

  it("keeps the start of a rotated (baked) tube in place and keeps its rotation", () => {
    const source = { rotation: 37, rotationX: 22, rotationZ: -15 };
    const base = bentTube({ x: -63, z: 91 });
    const baked: WorkplaneShape = {
      ...base,
      parametricSource: {
        kind: "bentTube",
        width: base.width,
        depth: base.depth,
        height: base.height,
        size: base.size,
        ...source,
      },
    };
    const anchor = worldStart(baked, source);
    const patch = bentTubeParameterPatch(baked, {
      bentTubeProfile: "hexagon",
      bentTubeSize: 14,
      bentTubeSegments: [
        { length: 40, bendAngle: 45, bendRadius: 30, roll: 30 },
        { length: 10, bendAngle: -90, bendRadius: 20, roll: 0 },
        { length: 20, bendAngle: 0, bendRadius: 20, roll: 0 },
      ],
    });
    expect(patch).not.toHaveProperty("rotation");
    expect(patch).not.toHaveProperty("rotationX");
    expect(patch).not.toHaveProperty("rotationZ");
    const after = worldStart({ ...baked, ...patch }, source);
    expect(after.x).toBeCloseTo(anchor.x, 6);
    expect(after.z).toBeCloseTo(anchor.z, 6);
  });

  describe("the start stays put in all three directions when a segment changes (#1422)", () => {
    const moreSegments = (shape: WorkplaneShape): BentTubeShapeFields[] => {
      const [first, second, ...rest] = shape.bentTubeSegments!;
      return [
        { bentTubeSegments: [{ ...first, length: first.length + 20 }, second, ...rest] },
        { bentTubeSegments: [{ ...first, length: Math.max(5, first.length - 12) }, second, ...rest] },
        { bentTubeSegments: [first, { ...second, bendAngle: second.bendAngle + 35 }, ...rest] },
        { bentTubeSegments: [first, { ...second, bendRadius: second.bendRadius + 15 }, ...rest] },
        { bentTubeSegments: [first, { ...second, roll: 40 }, ...rest] },
        { bentTubeSegments: [first, second, ...rest, { length: 15, bendAngle: 30, bendRadius: 20, roll: 20 }] },
        { bentTubeSegments: [first] },
      ];
    };

    it.each([
      ["tilted about a horizontal axis", { rotationZ: 30 }],
      ["tilted about two axes", { rotationX: 20, rotationZ: 25, rotation: 15 }],
      ["tilted and standing on a raised spot", { rotationZ: 30, x: 40, z: -20, elevation: 17 }],
      ["flat", {}],
      ["only turned about the vertical axis", { rotation: 50, elevation: 8 }],
      ["mirrored and tilted", { rotationX: 35, mirrorY: true }],
    ] as Array<[string, Partial<WorkplaneShape>]>)("%s: the start does not move when a change is applied", (_name, placement) => {
      const shape = bentTube(placement);
      const anchor = worldStart(shape);
      for (const changes of moreSegments(shape)) {
        const after = { ...shape, ...bentTubeParameterPatch(shape, changes) };
        const start = worldStart(after);
        expect(start.x).toBeCloseTo(anchor.x, 6);
        expect(start.y).toBeCloseTo(anchor.y, 6);
        expect(start.z).toBeCloseTo(anchor.z, 6);
      }
    });

    it("keeps the start while a length slider is dragged one value at a time, on a tilted tube", () => {
      let shape = bentTube({ rotationZ: 30, rotationX: 20, x: 12, z: 7, elevation: 3 });
      const anchor = worldStart(shape);
      const first = shape.bentTubeSegments!;
      for (let length = 25; length <= 80; length += 0.5) {
        shape = { ...shape, ...bentTubeParameterPatch(shape, { bentTubeSegments: [{ ...first[0], length }, first[1]] }) };
        const start = worldStart(shape);
        expect(start.x).toBeCloseTo(anchor.x, 6);
        expect(start.y).toBeCloseTo(anchor.y, 6);
        expect(start.z).toBeCloseTo(anchor.z, 6);
      }
    });

    it("keeps the start of a rotated (baked) tube in all three directions", () => {
      for (const source of [{ rotation: 37, rotationX: 22, rotationZ: -15 }, { rotation: 0, rotationX: 0, rotationZ: 40 }, { rotation: 90, rotationX: 0, rotationZ: 0 }]) {
        const base = bentTube({ x: -63, z: 91, elevation: 4 });
        const baked: WorkplaneShape = {
          ...base,
          parametricSource: { kind: "bentTube", width: base.width, depth: base.depth, height: base.height, size: base.size, ...source },
        };
        const anchor = worldStart(baked, source);
        for (const changes of moreSegments(base)) {
          const patch = bentTubeParameterPatch(baked, changes);
          const start = worldStart({ ...baked, ...patch }, source);
          expect(start.x).toBeCloseTo(anchor.x, 6);
          expect(start.y).toBeCloseTo(anchor.y, 6);
          expect(start.z).toBeCloseTo(anchor.z, 6);
        }
      }
    });

    it("leaves a flat tube's height alone when its length changes: it stays on the plate as before", () => {
      const shape = bentTube({ elevation: 6 });
      const patch = bentTubeParameterPatch(shape, { bentTubeSegments: [{ ...shape.bentTubeSegments![0], length: 70 }, shape.bentTubeSegments![1]] });
      expect(patch.elevation).toBeCloseTo(6, 9);
    });

    it("lets a segment change reach below the plate rather than lift the tube", () => {
      let reachedBelow = false;
      for (const rotationZ of [30, -30, 60]) {
        const shape = bentTube({ rotationZ });
        const anchor = worldStart(shape);
        for (const length of [5, 120]) {
          const patch = bentTubeParameterPatch(shape, { bentTubeSegments: [{ ...shape.bentTubeSegments![0], length }, shape.bentTubeSegments![1]] });
          expect(worldStart({ ...shape, ...patch }).y).toBeCloseTo(anchor.y, 6);
          if ((patch.elevation as number) < -1e-6) reachedBelow = true;
        }
      }
      expect(reachedBelow).toBe(true);
    });

    it("changes nothing for a profile change: no height in the patch, the position as before", () => {
      for (const placement of [{}, { rotationZ: 30 }, { rotationX: 20, rotationZ: 25 }] as Array<Partial<WorkplaneShape>>) {
        const shape = bentTube({ x: 5, z: -9, elevation: 2, ...placement });
        for (const changes of [{ bentTubeSize: 20 }, { bentTubeWall: 3 }, { bentTubeProfile: "hexagon" as const }, { bentTubeInnerProfile: "none" as const }, { bentTubeQuality: 24 }]) {
          const patch = bentTubeParameterPatch(shape, changes);
          expect(patch).not.toHaveProperty("elevation");
        }
      }
    });
  });

  it("writes the natural size and normalised values with every change", () => {
    const shape = bentTube();
    const patch = bentTubeParameterPatch(shape, { bentTubeSize: 2000, bentTubeWall: -3, bentTubeQuality: 33 });
    expect(patch.bentTubeSize).toBe(500);
    expect(patch.bentTubeWall).toBe(0.2);
    expect(patch.bentTubeQuality).toBe(32);
    const natural = bentTubeNaturalDimensions(patch as BentTubeShapeFields);
    expect(patch).toMatchObject({ width: natural.width, depth: natural.depth, height: natural.height, size: Math.max(natural.width, natural.depth) });
  });

  it("keeps the stretch the handles gave the tube when a parameter changes (#737)", () => {
    const shape = bentTube();
    const natural = bentTubeNaturalDimensions(shape as BentTubeShapeFields);
    const stretched = { ...shape, width: natural.width * 1.5, depth: natural.depth * 0.5, height: natural.height * 2 };
    const patch = bentTubeParameterPatch(stretched, { bentTubeInnerProfile: "none" });
    const next = bentTubeNaturalDimensions(patch as BentTubeShapeFields);
    expect(patch.width).toBeCloseTo(next.width * 1.5, 6);
    expect(patch.depth).toBeCloseTo(next.depth * 0.5, 6);
    expect(patch.height).toBeCloseTo(next.height * 2, 6);
    // An unstretched tube still takes the natural size.
    const plain = bentTubeParameterPatch(shape, { bentTubeInnerProfile: "none" });
    expect(plain.width).toBeCloseTo(next.width, 6);
  });

  it("is seen as a change by the editor, including a change inside one segment", () => {
    const shape = bentTube();
    const segments = shape.bentTubeSegments!.map((segment, index): BentTubeSegment => (index === 1 ? { ...segment, roll: 15 } : segment));
    expect(workplaneShapesEqual(shape, { ...shape, bentTubeSegments: segments })).toBe(false);
    expect(workplaneShapesEqual(shape, { ...shape, bentTubeSegments: shape.bentTubeSegments!.map((segment) => ({ ...segment })) })).toBe(true);
    expect(workplaneShapesEqual(shape, { ...shape, bentTubeInnerProfile: "none" })).toBe(false);
    expect(workplaneShapesEqual(shape, { ...shape, bentTubeWall: 2 })).toBe(false);
  });

  it("is placed from the catalogue next to the tube with its natural size", () => {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "bentTube")!;
    expect(asset).toBeDefined();
    const created = makeShapeFromAsset(asset, { x: 10, z: -5 });
    const natural = bentTubeNaturalDimensions(created);
    expect(created).toMatchObject({ kind: "bentTube", x: 10, z: -5, width: natural.width, depth: natural.depth, height: natural.height });
    expect(created.bentTubeSegments).toHaveLength(2);
    // Workspace defaults reach the new shape; a preset size cannot stretch it.
    const custom = makeShapeFromAsset(asset, undefined, { bentTubeProfile: "octagon", bentTubeInnerProfile: "none", bentTubeSize: 16, width: 200 });
    expect(custom).toMatchObject({ bentTubeProfile: "octagon", bentTubeInnerProfile: "none", bentTubeSize: 16 });
    expect(custom.width).toBeCloseTo(bentTubeNaturalDimensions(custom).width, 9);
    // The scene copy keeps every field.
    expect(sceneShape(created)).toMatchObject({
      bentTubeProfile: created.bentTubeProfile,
      bentTubeInnerProfile: created.bentTubeInnerProfile,
      bentTubeSize: created.bentTubeSize,
      bentTubeWall: created.bentTubeWall,
      bentTubeQuality: created.bentTubeQuality,
      bentTubeSegments: created.bentTubeSegments,
    });
    expect(shapeSupportsTaper("bentTube")).toBe(false);
  });

  it("accepts workspace defaults and refuses values it cannot use", () => {
    const entry = normalizeShapeCustomizations({
      bentTube: { bentTubeProfile: "hexagon", bentTubeInnerProfile: "none", bentTubeSize: 9999, bentTubeWall: 0.01, bentTubeQuality: 50 },
    }).bentTube!;
    expect(entry).toMatchObject({ bentTubeProfile: "hexagon", bentTubeInnerProfile: "none", bentTubeSize: 500, bentTubeWall: 0.2, bentTubeQuality: 50 });
    const rejected = normalizeShapeCustomizations({ bentTube: { bentTubeProfile: "triangle", bentTubeInnerProfile: "star" } }).bentTube ?? {};
    expect(rejected.bentTubeProfile).toBeUndefined();
    expect(rejected.bentTubeInnerProfile).toBeUndefined();
  });

  it("survives saving and reopening a project, rotated, as a hole and after edits", async () => {
    const plain = canonicalizeShape(bentTube({ id: "plain", x: 150, z: -120, elevation: 4 }));
    const edited = canonicalizeShape({
      ...plain,
      id: "edited",
      ...bentTubeParameterPatch(plain, {
        bentTubeProfile: "square",
        bentTubeInnerProfile: "octagon",
        bentTubeSegments: [
          { length: 12.5, bendAngle: -135, bendRadius: 22, roll: -30 },
          { length: 0, bendAngle: 45, bendRadius: 9, roll: 90 },
          { length: 7.25, bendAngle: 0, bendRadius: 9, roll: 0 },
        ],
      }),
    });
    const hole = canonicalizeShape(bentTube({ id: "hole", hole: true, color: "#b8c2cc" }));
    const baked = canonicalizeShape({
      ...bentTube({ id: "baked" }),
      kind: "mesh",
      importedMesh: { positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], baseWidth: 1, baseDepth: 1, baseHeight: 1, triangleCount: 1, sourceFormat: "json" },
      parametricSource: { kind: "bentTube", width: 45, depth: 45, height: 10, size: 45, rotation: 30, rotationX: 10, rotationZ: 0 },
    });
    const shapes = [plain, edited, hole, baked];
    const exported = await exportLylProject({
      projectId: "bent",
      projectName: "Bent",
      createdAt: 1_700_000_000_000,
      modifiedAt: 1_700_000_100_000,
      shapes,
      history: [editorHistoryEntry([plain], []), editorHistoryEntry(shapes, [])],
      historyIndex: 1,
      assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      snapGrid: DEFAULT_SNAP_GRID,
      placementElevation: 0,
    });
    const restored = await importLylProject(exported);
    expect(restored.shapes).toHaveLength(4);
    const byId = new Map(restored.shapes.map((shape) => [shape.id, shape]));
    [plain, edited, hole].forEach((original) => {
      const loaded = byId.get(original.id)!;
      expect(workplaneShapesEqual(loaded, original)).toBe(true);
      expect(loaded.bentTubeSegments).toEqual(original.bentTubeSegments);
    });
    expect(byId.get("baked")).toMatchObject({ kind: "mesh", parametricSource: { kind: "bentTube" }, bentTubeSegments: baked.bentTubeSegments });

    // Reopened, the body is the same closed solid.
    const reloaded = byId.get("edited")!;
    const solid = manifoldFromGeometry(runtime, createBentTubeGeometry(reloaded));
    expect(solid.status()).toBe("NoError");
    expect(solid.genus()).toBe(1);
    solid.delete();

    // Damaged bent-tube data is refused instead of half-loaded.
    const corrupt = (mutate: (definition: Record<string, unknown>) => void) => {
      const files = unzipSync(exported);
      const document = JSON.parse(strFromU8(files["project.json"])) as LylProjectDocumentV1;
      document.states.forEach((state) => state.nodes
        .filter((node) => node.definition.id === "plain")
        .forEach((node) => mutate(node.definition)));
      files["project.json"] = strToU8(JSON.stringify(document));
      return importLylProject(zipSync(files));
    };
    await expect(corrupt((definition) => { definition.bentTubeSegments = []; })).rejects.toThrow(/bentTubeSegments/);
    await expect(corrupt((definition) => { definition.bentTubeSegments = [{ length: "x", bendAngle: 0, bendRadius: 5, roll: 0 }]; })).rejects.toThrow(/length/);
    await expect(corrupt((definition) => { definition.bentTubeSegments = [{ length: 5, bendAngle: 0, bendRadius: 0, roll: 0 }]; })).rejects.toThrow(/bendRadius/);
    await expect(corrupt((definition) => { definition.bentTubeProfile = "triangle"; })).rejects.toThrow(/bentTubeProfile/);
    await expect(corrupt((definition) => { definition.bentTubeWall = Number.NaN; })).rejects.toThrow(/bentTubeWall/);
  });

  it("works as a hole and in a group: subtraction, union and a drilled tube stay solid", () => {
    const fields: BentTubeShapeFields = { bentTubeProfile: "round", bentTubeInnerProfile: "none", bentTubeSize: 8 };
    const natural = bentTubeNaturalDimensions(fields);
    // Placed away from the origin and turned, the way the editor transforms it.
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(40, natural.height / 2 + 3, -25),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0.8, -0.2, "XYZ")),
      new THREE.Vector3(1, 1, 1),
    ).multiply(new THREE.Matrix4().makeTranslation(0, -natural.height / 2, 0));
    const tube = manifoldFromGeometry(runtime, createBentTubeGeometry({ ...fields, ...natural }), matrix);
    expect(tube.status()).toBe("NoError");
    const tubeVolume = tube.volume();

    // A block that fully contains the tube: the tube as a hole removes exactly its own volume.
    const block = runtime.Manifold.cube([200, 200, 200], true);
    const cut = block.subtract(tube);
    expect(cut.status()).toBe("NoError");
    expect(cut.volume()).toBeCloseTo(block.volume() - tubeVolume, 0);
    // Two closed shells - the block and the tube-shaped cavity inside it.
    expect(cut.genus()).toBe(-1);

    // A thin plate the tube passes through: a clean, partial cut.
    const plate = runtime.Manifold.cube([200, 2, 200], true).translate([40, 8, -25]);
    const pierced = plate.subtract(tube);
    expect(pierced.status()).toBe("NoError");
    expect(pierced.volume()).toBeLessThan(plate.volume());
    expect(pierced.volume()).toBeGreaterThan(plate.volume() * 0.9);

    // Grouped with a copy of itself shifted sideways: union of two solids.
    const copy = tube.translate([3, 0, 0]);
    const union = tube.add(copy);
    expect(union.status()).toBe("NoError");
    expect(union.volume()).toBeGreaterThan(tubeVolume);
    expect(union.volume()).toBeLessThan(tubeVolume * 2);

    // A cylinder drilled through the tube.
    const drill = runtime.Manifold.cylinder(200, 2, 2, 32, true).translate([40, 0, -25]);
    const drilled = tube.subtract(drill);
    expect(drilled.status()).toBe("NoError");
    expect(drilled.volume()).toBeLessThanOrEqual(tubeVolume);

    [tube, block, cut, plate, pierced, copy, union, drill, drilled].forEach((entry) => entry.delete());
  });
});

describe("bent tube segment highlight", () => {
  const segments: BentTubeSegment[] = [
    { length: 20, bendAngle: 90, bendRadius: 15, roll: 0 },
    { length: 30, bendAngle: 0, bendRadius: 15, roll: 0 },
  ];
  const fields: BentTubeShapeFields = { bentTubeProfile: "round", bentTubeInnerProfile: "none", bentTubeSize: 10, bentTubeWall: 2, bentTubeQuality: 48, bentTubeSegments: segments };
  const natural = bentTubeNaturalDimensions(fields);
  const options = { ...fields, width: natural.width, depth: natural.depth, height: natural.height };
  const boxOf = (geometry: THREE.BufferGeometry) => new THREE.Box3().setFromBufferAttribute(geometry.getAttribute("position") as THREE.BufferAttribute);

  it("covers each segment and together the whole tube, a hair wider", () => {
    const tube = createBentTubeGeometry(options);
    const first = createBentTubeSegmentGeometry(options, 0);
    const second = createBentTubeSegmentGeometry(options, 1);
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    const whole = boxOf(tube);
    const joined = boxOf(first!).union(boxOf(second!));
    expect(joined.min.distanceTo(whole.min)).toBeLessThan(0.8);
    expect(joined.max.distanceTo(whole.max)).toBeLessThan(0.8);
    // The straight piece is 30 mm long and the bend is not part of it.
    const straight = boxOf(second!);
    const longest = Math.max(straight.max.x - straight.min.x, straight.max.y - straight.min.y, straight.max.z - straight.min.z);
    expect(longest).toBeGreaterThan(29.9);
    expect(longest).toBeLessThan(31);
  });

  it("has nothing for a segment that does not exist or has no length and no bend", () => {
    expect(createBentTubeSegmentGeometry(options, 2)).toBeNull();
    expect(createBentTubeSegmentGeometry(options, -1)).toBeNull();
    const empty = { ...options, bentTubeSegments: [...segments, { length: 0, bendAngle: 0, bendRadius: 15, roll: 0 }] };
    expect(createBentTubeSegmentGeometry(empty, 2)).toBeNull();
  });
});

