import { describe, expect, it } from "vitest";
import * as THREE from "three";
import type { WorkplaneShape } from "@/types/layerling";
import type { CadModifierProfileLoop } from "@/lib/cadModifierTypes";
import { cadModifierProfileForShape, cadProfileExpectation, cadProfileSegmentCount, closedMeshVolume, withinExactProfileLimit, crescentProfile, gearProfileLoops, heartProfileLoops, honeycombProfileLoops, polygonProfileLoops, slotProfileLoops, starProfileLoops } from "@/lib/cadProfileExtrusion";
import { profileLoopBounds, validateCadProfile } from "@/lib/cadProfileSolid";
import { cadModifierPrepareTimeoutMs, CAD_MODIFIER_EXACT_SEGMENT_LIMIT, CAD_MODIFIER_MAX_PREPARE_TIMEOUT_MS } from "@/lib/cadModifierRuntime";
import { createStarGeometry } from "@/lib/starGeometry";
import { createHeartGeometry } from "@/lib/heartGeometry";
import { buildCrescentContourPoints, createCrescentGeometry } from "@/lib/crescentGeometry";
import { createSlotGeometry } from "@/lib/slotGeometry";
import { createHoneycombGeometry } from "@/lib/honeycombGeometry";
import { createPrismGeometry } from "@/lib/prismGeometry";
import { createGearGeometry, normalizeGearCenterHoleSize, normalizeGearTeeth } from "@/lib/gearGeometry";

type Vec3 = [number, number, number];

function shape(kind: WorkplaneShape["kind"], extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id: `t-${kind}`, name: kind, kind, x: 0, z: 0, elevation: 0, size: 40, width: 40, depth: 40, height: 10, rotation: 0, color: "#ff8800", ...extra } as WorkplaneShape;
}

function meshOf(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const vertices: Vec3[] = [];
  for (let i = 0; i < position.count; i += 1) vertices.push([position.getX(i), position.getY(i), position.getZ(i)]);
  const faces: Vec3[] = [];
  const count = index ? index.count : position.count;
  for (let i = 0; i < count; i += 3) faces.push(index ? [index.getX(i), index.getX(i + 1), index.getX(i + 2)] : [i, i + 1, i + 2]);
  return { vertices, faces };
}

/** Enclosed area by Green's theorem - lines exactly, arcs by their closed form. */
function loopArea(loop: CadModifierProfileLoop) {
  let twice = 0;
  let current = { x: loop.x, z: loop.z };
  loop.segments.forEach((segment) => {
    if (segment.kind === "line") {
      twice += current.x * segment.z - segment.x * current.z;
    } else {
      const { cx, cz, rx, rz, start, end } = segment;
      twice += cx * rz * (Math.sin(end) - Math.sin(start)) - cz * rx * (Math.cos(end) - Math.cos(start)) + rx * rz * (end - start);
    }
    current = segment;
  });
  return twice / 2;
}

function profileArea(loops: CadModifierProfileLoop[]) {
  const [outer, ...holes] = loops;
  return Math.abs(loopArea(outer)) - holes.reduce((total, hole) => total + Math.abs(loopArea(hole)), 0);
}

/** Points along a loop, arcs finely sampled. */
function sampleLoop(loop: CadModifierProfileLoop) {
  const points = [{ x: loop.x, z: loop.z }];
  loop.segments.forEach((segment) => {
    if (segment.kind === "arc") {
      for (let step = 1; step <= 2000; step += 1) {
        const angle = segment.start + ((segment.end - segment.start) * step) / 2000;
        points.push({ x: segment.cx + segment.rx * Math.cos(angle), z: segment.cz + segment.rz * Math.sin(angle) });
      }
    } else {
      points.push({ x: segment.x, z: segment.z });
    }
  });
  return points;
}

/** The profile agrees with the display mesh: same footprint, nearly the same area. */
function expectMatchesMesh(loops: CadModifierProfileLoop[], geometry: THREE.BufferGeometry, height: number, areaTolerance = 0.02) {
  validateCadProfile({ kind: "extrusion", loops, height });
  const mesh = meshOf(geometry);
  const expected = cadProfileExpectation(mesh.vertices, mesh.faces);
  const [minX, minZ, maxX, maxZ] = profileLoopBounds(loops[0]);
  const size = Math.max(expected.bounds[3] - expected.bounds[0], expected.bounds[5] - expected.bounds[2]);
  [[minX, expected.bounds[0]], [minZ, expected.bounds[2]], [maxX, expected.bounds[3]], [maxZ, expected.bounds[5]]].forEach(([exact, sampled]) => {
    expect(Math.abs(exact - sampled)).toBeLessThan(0.03 * size);
  });
  const area = profileArea(loops);
  expect(Math.abs(area * height - expected.volume) / expected.volume).toBeLessThan(areaTolerance);
}

describe("exact profiles for catalog shapes", () => {
  it("builds polygons on the display prism's corners", () => {
    [3, 4, 5, 6, 8, 12].forEach((sides) => {
      [[40, 40], [60, 25], [20, 45]].forEach(([width, depth]) => {
        const loops = polygonProfileLoops(width, depth, sides);
        expect(loops[0].segments).toHaveLength(sides);
        expect(loops[0].segments.every((segment) => segment.kind === "line")).toBe(true);
        expectMatchesMesh(loops, createPrismGeometry(width, 10, depth, sides), 10, 1e-6);
      });
    });
  });

  it("builds stars of every kind, round-tipped or sharp, square or stretched", () => {
    const cases: Array<Partial<WorkplaneShape> & { width: number; depth: number }> = [
      { width: 40, depth: 40, starPoints: 5, starInnerSize: 20 },
      { width: 40, depth: 40, starPoints: 5, starInnerSize: 20, starOuterFillet: 3, starInnerFillet: 2 },
      { width: 60, depth: 30, starPoints: 6, starInnerSize: 30, starOuterFillet: 4, starInnerFillet: 3 },
      { width: 30, depth: 50, starPoints: 3, starInnerSize: 8, starOuterFillet: 80, starInnerFillet: 80 },
      { width: 80, depth: 80, starPoints: 32, starInnerSize: 70, starOuterFillet: 0.5, starInnerFillet: 0 },
    ];
    cases.forEach((options) => {
      const loops = starProfileLoops(options.width, options.depth, options);
      const points = options.starPoints ?? 5;
      const arcs = loops[0].segments.filter((segment) => segment.kind === "arc").length;
      const rounded = ((options.starOuterFillet ?? 0) > 0 ? points : 0) + ((options.starInnerFillet ?? 0) > 0 ? points : 0);
      expect(arcs).toBe(rounded);
      expectMatchesMesh(loops, createStarGeometry({ height: 10, starQuality: 48, ...options }), 10);
    });
  });

  it("builds slots with true half circles, lying or standing, and a round one as a circle", () => {
    [[40, 20], [20, 40], [50, 12], [20, 20]].forEach(([width, depth]) => {
      const loops = slotProfileLoops(width, depth);
      const radius = Math.min(width, depth) / 2;
      expect(profileArea(loops)).toBeCloseTo((Math.max(width, depth) - 2 * radius) * 2 * radius + Math.PI * radius * radius, 9);
      expectMatchesMesh(loops, createSlotGeometry({ width, depth, height: 10, sides: 256 }), 10, 0.005);
    });
  });

  it("builds hearts from two lobes, filling width and depth exactly", () => {
    [[40, 40, 0], [50, 36, 4], [25, 60, 20], [40, 40, 0.005]].forEach(([width, depth, heartTipFillet]) => {
      const loops = heartProfileLoops(width, depth, { heartTipFillet });
      const [minX, minZ, maxX, maxZ] = profileLoopBounds(loops[0]);
      expect(maxX - minX).toBeCloseTo(width, 9);
      // A rounded tip takes a little off the depth, exactly as on the display mesh.
      if (heartTipFillet <= 0.01) expect(maxZ - minZ).toBeCloseTo(depth, 9);
      else expect(maxZ - minZ).toBeLessThan(depth);
      expect(loops[0].segments.filter((segment) => segment.kind === "arc")).toHaveLength(heartTipFillet > 0.01 ? 3 : 2);
      expectMatchesMesh(loops, createHeartGeometry({ width, depth, height: 10, heartTipFillet, heartQuality: 64 }), 10);
    });
  });

  it("builds crescents from two arcs, with horns rounded as far back as the display rounds them", () => {
    const cases = [
      { width: 40, depth: 40, crescentThickness: 14, crescentTipFillet: 0, crescentQuality: 32 },
      { width: 40, depth: 40, crescentThickness: 14, crescentTipFillet: 0.5, crescentQuality: 32 },
      { width: 60, depth: 20, crescentThickness: 40, crescentTipFillet: 8, crescentQuality: 32 },
      { width: 40, depth: 40, crescentThickness: 4, crescentTipFillet: 3, crescentQuality: 32 },
      { width: 40, depth: 40, crescentThickness: 1, crescentTipFillet: 8, crescentQuality: 16 },
      { width: 30, depth: 60, crescentThickness: 8, crescentTipFillet: 2, crescentQuality: 64 },
    ];
    cases.forEach((options) => {
      const { loops } = crescentProfile(options.width, options.depth, options);
      const segments = loops[0].segments;
      expect(segments.every((segment) => segment.kind === "arc")).toBe(true);
      expect(segments).toHaveLength(options.crescentTipFillet > 0.01 ? 4 : 2);
      // Where each horn ends: the right-most point of the outline above and below the middle.
      const exact = sampleLoop(loops[0]);
      const display = buildCrescentContourPoints(options.width, options.depth, options.crescentThickness, options.crescentTipFillet, options.crescentQuality).map((point) => ({ x: point.x, z: point.y }));
      // The display rounds between chords, so its own horn moves 1.5-3.8 mm
      // with the quality slider alone; the exact horn stays within a fraction
      // of that of what is on screen (0.05 mm at the default settings).
      const tolerance = options.crescentThickness === 14 ? 0.06 : 0.3;
      [1, -1].forEach((side) => {
        const tip = (points: Array<{ x: number; z: number }>) => Math.max(...points.filter((point) => point.z * side > 0).map((point) => point.x));
        expect(Math.abs(tip(exact) - tip(display))).toBeLessThan(tolerance);
      });
      // A 1 mm sliver drawn at quality 16 loses almost 6 % of its area to the display's chords.
      expectMatchesMesh(loops, createCrescentGeometry({ ...options, height: 10 }), 10, options.crescentThickness === 1 ? 0.07 : 0.03);
    });
  });

  it("builds honeycombs with one hole loop per display cell", () => {
    [
      { width: 60, depth: 60, honeycombCellSize: 8, honeycombWallThickness: 1.6, honeycombFrameWidth: 3 },
      { width: 100, depth: 40, honeycombCellSize: 5, honeycombWallThickness: 1, honeycombFrameWidth: 0 },
      { width: 20, depth: 20, honeycombCellSize: 30, honeycombWallThickness: 2, honeycombFrameWidth: 2 },
    ].forEach((options) => {
      const loops = honeycombProfileLoops(options.width, options.depth, options);
      expectMatchesMesh(loops, createHoneycombGeometry({ ...options, height: 3 }), 3, 1e-6);
    });
  });

  it("builds spur gears on the display's tooth corners, with a round bore", () => {
    const cases: Array<Partial<WorkplaneShape> & { width: number; depth: number }> = [
      { width: 40, depth: 40 },
      { width: 40, depth: 40, teeth: 6 },
      { width: 80, depth: 80, teeth: 64 },
      { width: 60, depth: 40, teeth: 20, toothSize: 4 },
      { width: 40, depth: 40, centerHoleSize: 0 },
      { width: 30, depth: 30, teeth: 9, toothWidth: 1, centerHoleSize: 100 },
    ];
    cases.forEach((options) => {
      const loops = gearProfileLoops(options.width, options.depth, options);
      const teeth = normalizeGearTeeth(options.teeth);
      expect(loops[0].segments).toHaveLength(teeth * 4);
      expect(loops[0].segments.every((segment) => segment.kind === "line")).toBe(true);
      const bore = normalizeGearCenterHoleSize(options.centerHoleSize, options.width, options.depth, options.toothSize);
      if (bore > 0) {
        expect(loops).toHaveLength(2);
        expect(loops[1].segments.every((segment) => segment.kind === "arc" && Math.abs(segment.rx - bore / 2) < 1e-12)).toBe(true);
      } else {
        expect(loops).toHaveLength(1);
      }
      // The display draws the bore as a polygon of teeth x 4 sides; the round bore takes a hair more.
      expectMatchesMesh(loops, createGearGeometry({ height: 8, ...options }), 8, 0.005);
    });
  });

  it("measures closed meshes whatever way their triangles are wound", () => {
    // Crescent caps are wound the other way round from its walls.
    const crescent = meshOf(createCrescentGeometry({ width: 40, depth: 40, height: 10, crescentTipFillet: 0, crescentQuality: 32 }));
    const outline = crescentProfile(40, 40, { crescentTipFillet: 0, crescentQuality: 32 });
    expect(closedMeshVolume(crescent.vertices, crescent.faces) / (profileArea(outline.loops) * 10)).toBeGreaterThan(0.97);
    const box = meshOf(new THREE.BoxGeometry(2, 3, 4));
    expect(closedMeshVolume(box.vertices, box.faces)).toBeCloseTo(24, 9);
    const scrambled = box.faces.map(([a, b, c], index) => (index % 3 === 0 ? [a, c, b] as Vec3 : [a, b, c] as Vec3));
    expect(closedMeshVolume(box.vertices, scrambled)).toBeCloseTo(24, 9);
  });
});

describe("which shapes get an exact profile", () => {
  it("covers the extruded catalog shapes and the spur gear, placed like the display mesh", () => {
    ["polygon", "star", "heart", "crescent", "slot", "honeycomb", "gear"].forEach((kind) => {
      const profile = cadModifierProfileForShape(shape(kind as WorkplaneShape["kind"], { x: 5, z: -3, elevation: 2, rotation: 30 }));
      expect(profile?.kind).toBe("extrusion");
      expect(profile?.height).toBe(10);
      expect(profile?.transform).toHaveLength(12);
      expect(profile?.transform?.[3]).toBeCloseTo(5, 9);
      expect(profile?.transform?.[7]).toBeCloseTo(2, 9);
      expect(profile?.transform?.[11]).toBeCloseTo(-3, 9);
    });
    expect(cadModifierProfileForShape(shape("star"))?.transform).toBeUndefined();
    // The star, like the display mesh, has no taper or twist to honour.
    expect(cadModifierProfileForShape(shape("star", { extrudeTwist: 45 }))).not.toBeNull();
  });

  it("leaves everything else on its old path", () => {
    expect(cadModifierProfileForShape(shape("box"))).toBeNull();
    // Helical and bevel gears change their outline along the height.
    expect(cadModifierProfileForShape(shape("gear", { gearType: "helical" }))).toBeNull();
    expect(cadModifierProfileForShape(shape("gear", { gearType: "bevel" }))).toBeNull();
    expect(cadModifierProfileForShape(shape("text"))).toBeNull();
    // Only the polygon can be tapered, twisted or leaned; that stays on the mesh.
    expect(cadModifierProfileForShape(shape("polygon", { extrudeTwist: 45 }))).toBeNull();
    expect(cadModifierProfileForShape(shape("polygon", { extrudeTopOffsetX: 5 }))).toBeNull();
    expect(cadModifierProfileForShape(shape("polygon", { taperTopWidth: 20, taperTopDepth: 20 }))).toBeNull();
    expect(cadModifierProfileForShape(shape("star", { cadBrep: "brep" }))).toBeNull();
    expect(cadModifierProfileForShape(shape("star", { importedMesh: { positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], baseWidth: 1, baseDepth: 1, baseHeight: 1 } } as Partial<WorkplaneShape>))).toBeNull();
    expect(cadModifierProfileForShape(shape("star", { groupedShapes: [shape("box")] }))).toBeNull();
    expect(cadModifierProfileForShape(shape("star", { height: 0 }))).toBeNull();
    // Anything the outline builder cannot make sense of stays on the mesh instead of throwing.
    expect(cadModifierProfileForShape(shape("polygon", { sides: Number.NaN }))).toBeNull();
    expect(cadModifierProfileForShape(shape("star", { width: Number.NaN }))).toBeNull();
  });

  it("sends big requests back to the display meshes, all or nothing", () => {
    const star = cadModifierProfileForShape(shape("star", { starOuterFillet: 2, starInnerFillet: 1 }));
    const bigHoneycomb = cadModifierProfileForShape(shape("honeycomb", { width: 150, depth: 150, height: 3 }));
    const midHoneycomb = cadModifierProfileForShape(shape("honeycomb", { width: 100, depth: 100, height: 3 }));
    expect(cadProfileSegmentCount(star!)).toBe(20);
    expect(cadProfileSegmentCount(midHoneycomb!)).toBeLessThanOrEqual(CAD_MODIFIER_EXACT_SEGMENT_LIMIT);
    expect(cadProfileSegmentCount(bigHoneycomb!)).toBeGreaterThan(CAD_MODIFIER_EXACT_SEGMENT_LIMIT);
    const mesh = { name: "mesh" };
    const small = [{ profile: star!, profileMesh: mesh }, { profile: midHoneycomb!, profileMesh: mesh }, { mesh }];
    expect(withinExactProfileLimit(small)).toBe(small);
    const big = withinExactProfileLimit([{ profile: star!, profileMesh: mesh }, { profile: bigHoneycomb!, profileMesh: mesh }, { mesh }]);
    expect(big.every((part) => !part.profile && part.mesh === mesh)).toBe(true);
  });

  it("gives exact parts time of their own when the edge tool prepares them", () => {
    expect(cadModifierPrepareTimeoutMs(0, 0)).toBe(cadModifierPrepareTimeoutMs(0));
    expect(cadModifierPrepareTimeoutMs(1_000, 0)).toBe(cadModifierPrepareTimeoutMs(1_000));
    expect(cadModifierPrepareTimeoutMs(0, 1)).toBe(62_000);
    expect(cadModifierPrepareTimeoutMs(0, 20)).toBe(100_000);
    expect(cadModifierPrepareTimeoutMs(100_000, 3)).toBe(CAD_MODIFIER_MAX_PREPARE_TIMEOUT_MS);
    expect(cadModifierPrepareTimeoutMs(0, 1_000)).toBe(CAD_MODIFIER_MAX_PREPARE_TIMEOUT_MS);
    // A 150 mm honeycomb: 1,550 outline pieces, measured 26 s - the budget keeps the 2.5x margin.
    expect(cadModifierPrepareTimeoutMs(0, 1, 1_550)).toBeGreaterThanOrEqual(26_000 * 2.5);
    expect(cadModifierPrepareTimeoutMs(0, 1, 1_550)).toBeLessThanOrEqual(CAD_MODIFIER_MAX_PREPARE_TIMEOUT_MS);
  });
});
