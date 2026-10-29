import { beforeAll, describe, expect, it, vi } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { WorkplaneShape } from "@/types/layerling";

// Drive the REAL exporter/importer against the REAL OpenCascade kernel, loaded
// from node_modules instead of the browser-only /occt/ URL. Everything else in
// stepExport.ts / stepImport.ts runs unmodified.
vi.mock("@/lib/brepKernel", async () => {
  const brep = await import("brepjs");
  const { OcctKernel } = await import("occt-wasm");
  const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
  let ready: Promise<typeof brep> | null = null;
  let raw: Awaited<ReturnType<typeof OcctKernel.init>> | null = null;
  return {
    occtKernel: () => raw,
    loadBrepWithOcct: () =>
      (ready ??= (async () => {
        const kernel = await OcctKernel.init({ wasm });
        raw = kernel;
        brep.registerKernel("occt-wasm", brep.OcctWasmAdapter.fromKernel(kernel));
        return brep;
      })()),
  };
});

let brep: typeof import("brepjs");
let exportShapesToStep: typeof import("@/lib/stepExport").exportShapesToStep;
let importedShapeFromStep: typeof import("@/lib/stepImport").importedShapeFromStep;

beforeAll(async () => {
  brep = await import("brepjs");
  ({ exportShapesToStep } = await import("@/lib/stepExport"));
  ({ importedShapeFromStep } = await import("@/lib/stepImport"));
  // Warm the kernel via the mocked loader so brepjs has a registered kernel for
  // the re-import assertions below.
  const { loadBrepWithOcct } = await import("@/lib/brepKernel");
  await loadBrepWithOcct();
});

function shape(overrides: Partial<WorkplaneShape>): WorkplaneShape {
  return {
    id: Math.random().toString(36).slice(2),
    name: "Shape",
    kind: "box",
    color: "#0098c7",
    x: 0,
    z: 0,
    size: 10,
    width: 10,
    depth: 10,
    height: 10,
    rotation: 0,
    ...overrides,
  };
}

async function reimportVolume(blob: Blob): Promise<number> {
  const r = await brep.importSTEP(blob);
  if (!r.ok) throw new Error(`reimport failed: ${String(r.error?.message ?? r.error)}`);
  const v = brep.measureVolume(r.value);
  if (!v.ok) throw new Error("measureVolume failed");
  return v.value;
}

const PI = Math.PI;
const near = (a: number, b: number, relTol = 0.01) => Math.abs(a - b) <= relTol * Math.abs(b) + 1e-6;

describe("STEP export round-trip (real OCCT kernel)", () => {
  it("exports a print-in-place hinge as its fused exact parts, with the display mesh's volume", async () => {
    const { hingeTriangles } = await import("@/lib/hingeGeometry");
    const meshVolume = hingeTriangles({ width: 40, depth: 40, height: 8, sides: 96 }).reduce(
      (sum, [a, b, c]) => sum + (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6,
      0,
    );
    for (const [rotation, hingeAngle, mirrorY] of [[0, 0, false], [90, 0, false], [0, 60, false], [90, 135, false], [30, 90, true]] as const) {
      const hinge = shape({ kind: "hinge", name: "Hinge", width: 40, depth: 40, height: 8, size: 40, rotation, x: 12, z: -7, elevation: 3, hingeAngle, mirrorY });
      const { blob, exportedCount, skipped } = await exportShapesToStep([hinge]);
      expect(skipped).toEqual([]);
      expect(exportedCount).toBe(1);
      // The display mesh is a 96-sided polygon, the exact body round: within a percent.
      expect(near(await reimportVolume(blob), meshVolume, 0.01)).toBe(true);
    }
  });

  it("exports a hinge with screw holes and rounded corners, the holes cut, with the display mesh's volume", async () => {
    const { hingeTriangles } = await import("@/lib/hingeGeometry");
    const volume = (fields: Parameters<typeof hingeTriangles>[0]) => hingeTriangles(fields).reduce(
      (sum, [a, b, c]) => sum + (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6,
      0,
    );
    for (const [hingeScrewCountersink, hingeAngle, mirrorY] of [[true, 0, false], [false, 0, false], [true, 120, false], [true, 60, true]] as const) {
      const fields = { width: 40, depth: 40, height: 8, sides: 96, hingeScrewHoles: 2, hingeScrewCountersink, hingeCornerRadius: 5, hingeAngle };
      const hinge = shape({ kind: "hinge", name: "Hinge", size: 40, rotation: 30, x: 12, z: -7, elevation: 3, mirrorY, ...fields });
      const { blob, exportedCount, skipped } = await exportShapesToStep([hinge]);
      expect(skipped).toEqual([]);
      expect(exportedCount).toBe(1);
      // Less than the hinge without holes, and within a percent of the display mesh (polygons against true circles).
      const exported = await reimportVolume(blob);
      expect(exported).toBeLessThan(volume({ width: 40, depth: 40, height: 8, sides: 96, hingeAngle }) - 30);
      expect(near(exported, volume(fields), 0.01)).toBe(true);
    }
  });

  it("exports a hinge with fingers instead of leaves, with the display mesh's volume", async () => {
    const { hingeTriangles } = await import("@/lib/hingeGeometry");
    for (const [hingeStyle, hingeCornerRadius, hingeAngle] of [["pin", 0, 0], ["pin", 2, 135], ["pinless", 3, 270]] as const) {
      const fields = { width: 40, depth: 40, height: 8, sides: 96, hingeLeafStyle: "fingers" as const, hingeStyle, hingeCornerRadius, hingeAngle };
      const hinge = shape({ kind: "hinge", name: "Hinge", size: 40, rotation: 30, x: 12, z: -7, elevation: 3, ...fields });
      const { blob, exportedCount, skipped } = await exportShapesToStep([hinge]);
      expect(skipped).toEqual([]);
      expect(exportedCount).toBe(1);
      const meshVolume = hingeTriangles(fields).reduce(
        (sum, [a, b, c]) => sum + (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6,
        0,
      );
      expect(near(await reimportVolume(blob), meshVolume, 0.01)).toBe(true);
    }
  });

  it("exports a lift-off hinge and nut pockets, turned, folded and mirrored, with the display mesh's volume", async () => {
    const { hingeTriangles } = await import("@/lib/hingeGeometry");
    const volume = (fields: Parameters<typeof hingeTriangles>[0]) => hingeTriangles(fields).reduce(
      (sum, [a, b, c]) => sum + (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6,
      0,
    );
    for (const [hingeStyle, hingeScrewHead, hingeAngle, mirrorY] of [["liftOff", "countersunk", 0, false], ["liftOff", "countersunkNut", 120, false], ["pin", "nut", 60, true], ["pinless", "nut", 0, false]] as const) {
      const fields = { width: 50, depth: 44, height: 10, sides: 96, hingeStyle, hingeLeafThickness: 2.5, hingeScrewHoles: 2, hingeScrewHead, hingeCornerRadius: 4, hingeAngle };
      const hinge = shape({ kind: "hinge", name: "Hinge", size: 50, rotation: 30, x: 12, z: -7, elevation: 3, mirrorY, ...fields });
      const { blob, exportedCount, skipped } = await exportShapesToStep([hinge]);
      expect(skipped).toEqual([]);
      expect(exportedCount).toBe(1);
      expect(near(await reimportVolume(blob), volume(fields), 0.01)).toBe(true);
    }
  });

  it("exports box + cylinder + sphere as exact B-Rep with conserved volume", async () => {
    const box = shape({ kind: "box", name: "Box", x: -30, width: 10, depth: 6, height: 4 });
    const cyl = shape({ kind: "cylinder", name: "Cyl", x: 0, width: 8, depth: 8, height: 12 });
    const sph = shape({ kind: "sphere", name: "Sph", x: 30, width: 10, depth: 10, height: 10 });

    const { blob, exportedCount, skipped } = await exportShapesToStep([box, cyl, sph]);
    expect(exportedCount).toBe(3);
    expect(skipped).toEqual([]);

    const expected = 10 * 6 * 4 + PI * 4 * 4 * 12 + (4 / 3) * PI * 5 ** 3;
    expect(near(await reimportVolume(blob), expected)).toBe(true);
  });

  it("subtracts an overlapping hole and conserves the cut volume", async () => {
    const body = shape({ kind: "box", name: "Plate", width: 20, depth: 20, height: 10, elevation: 0 });
    // Cylinder hole punched fully through the plate's full height (overhangs both faces).
    const hole = shape({ kind: "cylinder", name: "Bore", hole: true, width: 6, depth: 6, height: 14, elevation: -2 });

    const { blob, exportedCount, skipped } = await exportShapesToStep([body, hole]);
    expect(exportedCount).toBe(1);
    expect(skipped).toEqual([]);

    const expected = 20 * 20 * 10 - PI * 3 * 3 * 10;
    expect(near(await reimportVolume(blob), expected)).toBe(true);
  });

  it("leaves a body untouched when the hole's AABB does not reach it", async () => {
    const body = shape({ kind: "box", name: "Plate", x: 0, width: 10, depth: 10, height: 10 });
    const farHole = shape({ kind: "cylinder", name: "Bore", hole: true, x: 500, width: 4, depth: 4, height: 20 });

    const { blob } = await exportShapesToStep([body, farHole]);
    expect(near(await reimportVolume(blob), 1000)).toBe(true);
  });

  it("exports a full cone in a multi-solid assembly with conserved volume (occt-wasm 3.6.1 fix)", async () => {
    const cone = shape({ kind: "cone", name: "Cone", x: -20, width: 8, depth: 8, height: 10, baseRadius: 4, topRadius: 0 });
    const box = shape({ kind: "box", name: "Box", x: 20, width: 6, depth: 6, height: 6 });

    const { blob, exportedCount, skipped } = await exportShapesToStep([cone, box]);
    expect(exportedCount).toBe(2);
    expect(skipped).toEqual([]);

    const expected = (1 / 3) * PI * 4 * 4 * 10 + 6 * 6 * 6;
    expect(near(await reimportVolume(blob), expected)).toBe(true);
  });

  it("exports a truncated cone with conserved volume", async () => {
    const frustum = shape({ kind: "cone", name: "Frustum", width: 10, depth: 10, height: 12, baseRadius: 5, topRadius: 2 });
    const { blob, exportedCount } = await exportShapesToStep([frustum]);
    expect(exportedCount).toBe(1);
    // Frustum volume = (π h / 3)(R² + R r + r²), with R=5, r=2, h=12.
    const expected = (PI * 12 / 3) * (25 + 10 + 4);
    expect(near(await reimportVolume(blob), expected)).toBe(true);
  });

  it("skips non-exact shapes with descriptive reasons but still exports the rest", async () => {
    const box = shape({ kind: "box", name: "Box", width: 8, depth: 8, height: 8 });
    const pyramid = shape({ kind: "pyramid", name: "Pyramid", width: 8, depth: 8, height: 8 });
    const meshNoBrep = shape({ kind: "mesh", name: "RawMesh" });

    const { exportedCount, skipped } = await exportShapesToStep([box, pyramid, meshNoBrep]);
    expect(exportedCount).toBe(1);
    expect(skipped.map((s) => s.kind).sort()).toEqual(["mesh", "pyramid"]);
    expect(skipped.find((s) => s.kind === "pyramid")?.reason).toMatch(/no exact B-Rep mapping/i);
    expect(skipped.find((s) => s.kind === "mesh")?.reason).toMatch(/no B-Rep source/i);
  });

  it("exports outline shapes as exact bodies with the volume their outline predicts", async () => {
    const ellipse = shape({ kind: "ellipse", name: "Ellipse", x: -60, width: 26, depth: 16, height: 20 });
    const tube = shape({ kind: "tube", name: "Tube", x: -20, width: 34, depth: 34, height: 28, bevel: 6 });
    const dome = shape({ kind: "halfSphere", name: "Dome", x: 20, width: 22, depth: 22, height: 11 });
    const roof = shape({ kind: "roundRoof", name: "Roof", x: 60, width: 20, depth: 30, height: 10 });

    const { blob, exportedCount, skipped } = await exportShapesToStep([ellipse, tube, dome, roof]);
    expect(exportedCount).toBe(4);
    expect(skipped).toEqual([]);

    const expected = PI * 13 * 8 * 20 + PI * (17 ** 2 - 11 ** 2) * 28 + (2 / 3) * PI * 11 ** 3 + (PI / 2) * 10 * 10 * 30;
    expect(near(await reimportVolume(blob), expected)).toBe(true);
  });

  it("exports an oval dome and an oval cone at their drawn size", async () => {
    const cases = [
      { source: shape({ kind: "halfSphere", name: "Oval dome", width: 30, depth: 20, height: 10 }), box: [-15, -10, 0, 15, 10, 10] },
      { source: shape({ kind: "cone", name: "Oval cone", width: 30, depth: 15, height: 15, baseRadius: 15, topRadius: 0 }), box: [-15, -7.5, 0, 15, 7.5, 15] },
      { source: shape({ kind: "cone", name: "Oval frustum", width: 30, depth: 15, height: 15, baseRadius: 15, topRadius: 4 }), box: [-15, -7.5, 0, 15, 7.5, 15] },
    ];
    const { occtKernel } = await import("@/lib/brepKernel");
    const kernel = occtKernel()!;
    for (const { source, box } of cases) {
      const { blob, exportedCount, skipped } = await exportShapesToStep([source]);
      expect(exportedCount).toBe(1);
      expect(skipped).toEqual([]);
      // Measured on a mesh of the re-imported body (the kernel's own box is loose on B-spline
      // faces), in STEP's Z-up frame: depth along -Y, height along Z.
      const { positions } = kernel.tessellate(kernel.importStep(await blob.text()), { linearDeflection: 0.01, angularDeflection: 0.2 });
      const bounds = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
      for (let index = 0; index < positions.length; index += 3) {
        for (let axis = 0; axis < 3; axis += 1) {
          bounds[axis] = Math.min(bounds[axis], positions[index + axis]);
          bounds[axis + 3] = Math.max(bounds[axis + 3], positions[index + axis]);
        }
      }
      bounds.forEach((value, index) => expect(Math.abs(value - box[index])).toBeLessThan(0.02));
    }
  });

  it("exports round shapes round whatever their side count, as before", async () => {
    const dome = shape({ kind: "halfSphere", name: "Faceted dome", x: -40, width: 30, depth: 30, height: 15, steps: 8 });
    const cone = shape({ kind: "cone", name: "Six-sided oval cone", x: 0, width: 30, depth: 15, height: 15, baseRadius: 15, topRadius: 0, sides: 6 });
    const ellipse = shape({ kind: "ellipse", name: "Eight-sided ellipse", x: 40, width: 26, depth: 16, height: 20, sides: 8 });
    const { blob, exportedCount, skipped } = await exportShapesToStep([dome, cone, ellipse]);
    expect(skipped).toEqual([]);
    expect(exportedCount).toBe(3);
    const expected = (2 / 3) * PI * 15 ** 3 + (PI * 15 * 7.5 * 15) / 3 + PI * 13 * 8 * 20;
    // The pointed oval cone is a B-spline body; OCCT's volume of it runs about 1 % high.
    expect(Math.abs(await reimportVolume(blob) - expected) / expected).toBeLessThan(0.01);
  });

  it("exports a bent tube as its exact swept body instead of skipping it", async () => {
    const { bentTubeNaturalDimensions, normalizedBentTubeFields } = await import("@/lib/bentTubeGeometry");
    const fields = normalizedBentTubeFields({ bentTubeSize: 10, bentTubeWall: 1.5, bentTubeSegments: [{ length: 25, bendAngle: 90, bendRadius: 15, roll: 0 }, { length: 25, bendAngle: 0, bendRadius: 15, roll: 0 }] });
    const natural = bentTubeNaturalDimensions(fields);
    const tube = shape({ kind: "bentTube", name: "Bent tube", ...fields, width: natural.width, depth: natural.depth, height: natural.height, size: natural.size });
    // Drawn with twelve corners it still goes out round, like every round shape - placed where the drawn tube stands.
    const coarseFields = normalizedBentTubeFields({ ...fields, bentTubeQuality: 12 });
    const coarseNatural = bentTubeNaturalDimensions(coarseFields);
    const coarse = shape({ kind: "bentTube", name: "Coarse bent tube", x: 80, ...coarseFields, width: coarseNatural.width, depth: coarseNatural.depth, height: coarseNatural.height, size: coarseNatural.size });

    const { blob, exportedCount, skipped } = await exportShapesToStep([tube, coarse]);
    expect(exportedCount).toBe(2);
    expect(skipped).toEqual([]);
    // Section times centre line (25 + a quarter of 15 + 25), twice.
    const expected = 2 * PI * (5 ** 2 - 3.5 ** 2) * (50 + (PI / 2) * 15);
    expect(near(await reimportVolume(blob), expected, 1e-4)).toBe(true);
  });

  it("exports a tapered, a leaning and (since #184) a twisted box as they are drawn, not as plain boxes", async () => {
    // 30 x 20 at the bottom to 12 x 8 at the top over 15: (h/3)(A1 + A2 + sqrt(A1 A2)) for similar ends.
    const frustum = shape({ kind: "box", name: "Frustum", x: -40, width: 30, depth: 20, height: 15, taperTopWidth: 12, taperTopDepth: 8 });
    const leaning = shape({ kind: "box", name: "Leaning", x: 40, width: 10, depth: 10, height: 20, extrudeTopOffsetX: 6 });
    const twisted = shape({ kind: "box", name: "Twisted", x: 0, z: 60, width: 10, depth: 10, height: 20, extrudeTwist: 45 });
    const { blob, exportedCount, skipped } = await exportShapesToStep([frustum, leaning, twisted]);
    expect(exportedCount).toBe(3);
    expect(skipped).toEqual([]);
    // A twist only turns each slice: the twisted box keeps its 10 x 10 x 20 volume.
    const expected = (15 / 3) * (600 + 96 + Math.sqrt(600 * 96)) + 10 * 10 * 20 + 10 * 10 * 20;
    expect(near(await reimportVolume(blob), expected, 1e-4)).toBe(true);
  });

  it("exports a threaded rod, a nut and a tapped hole as their exact bodies", async () => {
    const { threadNaturalFootprint, threadNaturalHeight, threadSettings } = await import("@/lib/threadGeometry");
    const { cadModifierThreadForShape } = await import("@/lib/cadProfileExtrusion");
    const { threadPartSolid } = await import("@/lib/threadSolid");
    const { occtKernel } = await import("@/lib/brepKernel");
    const thread = (overrides: Partial<WorkplaneShape>) => {
      const fields = { threadDiameter: 6, threadPitch: 1, ...overrides } as WorkplaneShape;
      const settings = threadSettings(fields);
      const footprint = threadNaturalFootprint(settings);
      return shape({ kind: "thread", width: footprint.width, depth: footprint.depth, size: footprint.width, height: threadNaturalHeight(settings), ...overrides });
    };
    const rod = thread({ name: "Rod", x: -30 });
    const nut = thread({ name: "Nut", threadRole: "nut", x: 0 });
    const block = shape({ kind: "box", name: "Block", x: 40, width: 20, depth: 20, height: 12 });
    const tapped = thread({ name: "Tapped hole", threadRole: "bore", hole: true, x: 40, height: 12 });

    const { blob, exportedCount, skipped } = await exportShapesToStep([rod, nut, block, tapped]);
    expect(skipped).toEqual([]);
    expect(exportedCount).toBe(3);
    // The same bodies the CAD worker builds, measured directly.
    const kernel = occtKernel()!;
    const volume = (source: WorkplaneShape) => kernel.getVolume(threadPartSolid(kernel, cadModifierThreadForShape(source)!));
    const expected = volume(rod) + volume(nut) + 20 * 20 * 12 - volume(tapped);
    expect(near(await reimportVolume(blob), expected, 1e-4)).toBe(true);
  });

  it("exports a group as the bodies it holds, its holes cutting only its own solids (#709)", async () => {
    const { threadNaturalFootprint, threadNaturalHeight, threadSettings } = await import("@/lib/threadGeometry");
    const { cadModifierThreadForShape } = await import("@/lib/cadProfileExtrusion");
    const { threadPartSolid } = await import("@/lib/threadSolid");
    const { occtKernel } = await import("@/lib/brepKernel");
    const thread = (overrides: Partial<WorkplaneShape>) => {
      const fields = { threadDiameter: 6, threadPitch: 1, ...overrides } as WorkplaneShape;
      const settings = threadSettings(fields);
      const footprint = threadNaturalFootprint(settings);
      return shape({ kind: "thread", width: footprint.width, depth: footprint.depth, size: footprint.width, height: threadNaturalHeight(settings), ...overrides });
    };
    // A block with a tapped hole, grouped; a screw stands in the same place outside the group.
    const block = shape({ kind: "box", name: "Block", x: 0, width: 20, depth: 20, height: 12 });
    const tapped = thread({ name: "Tapped hole", threadRole: "bore", hole: true, x: 0, height: 12 });
    const group = shape({ kind: "mesh", name: "Group", x: 40, width: 20, depth: 20, height: 12, groupedShapes: [block, tapped] });
    const screw = thread({ name: "Screw", threadRole: "rod", x: 40 });

    const { blob, exportedCount, skipped } = await exportShapesToStep([group, screw]);
    expect(skipped).toEqual([]);
    expect(exportedCount).toBe(2);
    const kernel = occtKernel()!;
    const volume = (source: WorkplaneShape) => kernel.getVolume(threadPartSolid(kernel, cadModifierThreadForShape(source)!));
    const expected = 20 * 20 * 12 - volume(tapped) + volume(screw);
    expect(near(await reimportVolume(blob), expected, 1e-4)).toBe(true);
  });

  it("exports springs as their exact bodies, round wire and all", async () => {
    const { springBuildPlan } = await import("@/lib/springGeometry");
    const plain = shape({ kind: "spring", name: "Spring", x: -30, width: 20, depth: 20, height: 30, springTurns: 6, springWire: 3 });
    const oval = shape({ kind: "spring", name: "Oval spring", x: 10, width: 20, depth: 12, height: 40, springTurns: 9, springWire: 2, rotation: 30, mirrorX: true });
    const { blob, exportedCount, skipped } = await exportShapesToStep([plain, oval]);
    expect(skipped).toEqual([]);
    expect(exportedCount).toBe(2);
    // The round wire's section times its centre line, stretched with the footprint.
    const volume = (source: WorkplaneShape) => {
      const plan = springBuildPlan({ ...source, width: source.width, depth: source.depth ?? source.width, height: source.height });
      return Math.PI * plan.wireRadius ** 2 * Math.hypot(plan.coilRadius * plan.twist, plan.span) * plan.scaleX * plan.scaleZ;
    };
    expect(near(await reimportVolume(blob), volume(plain) + volume(oval), 1e-4)).toBe(true);
  });

  it("exports a helical and a bevel gear as their exact bodies", async () => {
    const { cadModifierHelicalGearForShape, cadModifierProfileForShape } = await import("@/lib/cadProfileExtrusion");
    const { helicalGearPartSolid } = await import("@/lib/gearSolid");
    const { profileExtrusionSolid } = await import("@/lib/cadProfileSolid");
    const { occtKernel } = await import("@/lib/brepKernel");
    const gear = (overrides: Partial<WorkplaneShape>) => shape({ kind: "gear", width: 30, depth: 30, size: 30, height: 6, teeth: 12, toothSize: 2.5, centerHoleSize: 6, helixAngle: 22.5, ...overrides });
    const helical = gear({ name: "Helical", gearType: "helical", x: -40, rotation: 20 });
    const bevel = gear({ name: "Bevel", gearType: "bevel", x: 0 });
    const block = shape({ kind: "box", name: "Block", x: 50, width: 40, depth: 40, height: 6 });
    const pocket = gear({ name: "Pocket", gearType: "helical", x: 50, hole: true, helixAngle: -15 });

    const { blob, exportedCount, skipped } = await exportShapesToStep([helical, bevel, block, pocket]);
    expect(skipped).toEqual([]);
    expect(exportedCount).toBe(3);
    // The same bodies the CAD worker builds, measured directly.
    const kernel = occtKernel()!;
    const volume = (source: WorkplaneShape) => source.gearType === "bevel"
      ? kernel.getVolume(profileExtrusionSolid(kernel, cadModifierProfileForShape(source)!))
      : kernel.getVolume(helicalGearPartSolid(kernel, cadModifierHelicalGearForShape(source)!));
    const expected = volume(helical) + volume(bevel) + 40 * 40 * 6 - volume(pocket);
    expect(near(await reimportVolume(blob), expected, 1e-4)).toBe(true);
  });

  it("exports a Gridfinity bin and baseplate as their exact bodies", async () => {
    const { cadModifierGridfinityForShape } = await import("@/lib/cadProfileExtrusion");
    const { gridfinityPartSolid } = await import("@/lib/gridfinitySolid");
    const { occtKernel } = await import("@/lib/brepKernel");
    const bin = shape({ kind: "gridfinity", name: "Bin", x: -60, width: 83.5, depth: 41.5, height: 25.4, gridfinityType: "bin", gridfinityMagnets: true, rotation: 90 });
    const plate = shape({ kind: "gridfinity", name: "Baseplate", x: 60, width: 84, depth: 84, height: 5, gridfinityType: "baseplate" });
    const { blob, exportedCount, skipped } = await exportShapesToStep([bin, plate]);
    expect(skipped).toEqual([]);
    expect(exportedCount).toBe(2);
    const kernel = occtKernel()!;
    const volume = (source: WorkplaneShape) => kernel.getVolume(gridfinityPartSolid(kernel, cadModifierGridfinityForShape(source)!));
    expect(near(await reimportVolume(blob), volume(bin) + volume(plate), 1e-4)).toBe(true);
  });

  it("exports a star, a heart and a teardrop instead of skipping them", async () => {
    const star = shape({ kind: "star", name: "Star", x: -30, width: 20, depth: 20, height: 5 });
    const heart = shape({ kind: "heart", name: "Heart", x: 0, width: 20, depth: 20, height: 5 });
    const teardrop = shape({ kind: "teardrop", name: "Teardrop", x: 30, width: 6, depth: 20, height: 3 + 3 * Math.SQRT2 });

    const { blob, exportedCount, skipped } = await exportShapesToStep([star, heart, teardrop]);
    expect(exportedCount).toBe(3);
    expect(skipped).toEqual([]);
    expect(await reimportVolume(blob)).toBeGreaterThan(0);
  });

  it("cuts a counterbore out of a plate", async () => {
    const plate = shape({ kind: "box", name: "Plate", width: 20, depth: 20, height: 20 });
    const bore = shape({ kind: "counterbore", name: "Bore", hole: true, width: 6.4, depth: 6.4, height: 12, elevation: 8.1, screwHoleShaft: 3.4, screwHoleHeadDepth: 3.2 });

    const { blob, exportedCount, skipped } = await exportShapesToStep([plate, bore]);
    expect(exportedCount).toBe(1);
    expect(skipped).toEqual([]);

    // Shaft from 8.1 to 16.9, head pocket from 16.9 up to the top of the plate at 20.
    const expected = 20 * 20 * 20 - PI * 1.7 ** 2 * (16.9 - 8.1) - PI * 3.2 ** 2 * (20 - 16.9);
    expect(near(await reimportVolume(blob), expected, 0.001)).toBe(true);
  });

  it("keeps the planes and cylinders of an edited body that was moved and turned, and still exports a stretched one", async () => {
    const { occtKernel } = await import("@/lib/brepKernel");
    const kernel = occtKernel()!;
    // The stored body of an edited part, as the CAD worker bakes it: a 20 x 10 x 30 block (Y up),
    // standing on y = 0 and centred on x and z, with a round hole through it along z.
    const block = kernel.translate(kernel.makeBox(20, 10, 30), -10, 0, -15);
    const bore = kernel.translate(kernel.makeCylinder(3, 30), 0, 5, -15);
    const stored = kernel.toBREP(kernel.cut(block, bore));
    const frame = { x: 0, z: 0, elevation: 0, width: 20, depth: 30, height: 10 };
    const edited = (overrides: Partial<WorkplaneShape>) => shape({ kind: "mesh", name: "Edited", width: 20, depth: 30, height: 10, cadBrep: stored, cadBrepFrame: frame, ...overrides });
    const surfaces = async (blob: Blob) => {
      const imported = kernel.importStep(await blob.text());
      return new Set(kernel.getSubShapes(imported, "face").map((face) => kernel.surfaceType(face)));
    };
    const volume = 20 * 10 * 30 - PI * 3 * 3 * 30;

    // Moved, lifted and turned: still the planes and the cylinder it was, not B-splines.
    const moved = await exportShapesToStep([edited({ x: 25, z: -10, elevation: 3, rotation: 30 })]);
    expect(moved.skipped).toEqual([]);
    expect([...await surfaces(moved.blob)].sort()).toEqual(["cylinder", "plane"]);
    expect(near(await reimportVolume(moved.blob), volume, 1e-4)).toBe(true);

    // Mirrored, the rigid placement has a negative scale; the body must not come out inside out.
    const mirrored = await exportShapesToStep([edited({ x: 25, mirrorX: true })]);
    expect(mirrored.skipped).toEqual([]);
    expect([...await surfaces(mirrored.blob)].sort()).toEqual(["cylinder", "plane"]);
    expect(near(await reimportVolume(mirrored.blob), volume, 1e-4)).toBe(true);

    // Stretched to twice its width: only the general transform can do that, and it still goes out.
    const stretched = await exportShapesToStep([edited({ width: 40, size: 40 })]);
    expect(stretched.skipped).toEqual([]);
    expect(near(await reimportVolume(stretched.blob), volume * 2, 1e-3)).toBe(true);
  });

  it("throws when there is nothing exact to export", async () => {
    await expect(exportShapesToStep([shape({ kind: "pyramid", name: "Pyramid" })])).rejects.toThrow(/No exportable B-Rep solids/i);
  });
});

describe("STEP import → re-export round-trip (real OCCT kernel)", () => {
  it("imports a STEP body, stores its B-Rep, and re-exports it losslessly", async () => {
    // Author a source STEP file straight from the kernel: a 12×8×6 box in CAD Z-up.
    const src = brep.exportSTEP(brep.box(12, 8, 6, { centered: true }));
    expect(src.ok).toBe(true);
    const bytes = await (src as { value: Blob }).value.arrayBuffer();

    const imported = await importedShapeFromStep("widget.step", bytes);
    expect(imported.kind).toBe("mesh");
    expect(imported.importedMesh?.sourceFormat).toBe("step");
    expect(imported.importedMesh?.brepStep).toBeTruthy();
    // Importer maps CAD Z-up (X12,Y8,Z6) to Layerling Y-up (width12, height6, depth8).
    expect(near(imported.importedMesh!.baseWidth, 12)).toBe(true);
    expect(near(imported.importedMesh!.baseHeight, 6)).toBe(true);
    expect(near(imported.importedMesh!.baseDepth, 8)).toBe(true);

    // Re-export the imported body at native size and confirm volume survives the
    // import-normalize → store → re-emit pipeline.
    const reexport = await exportShapesToStep([imported]);
    expect(reexport.exportedCount).toBe(1);
    expect(reexport.skipped).toEqual([]);
    expect(near(await reimportVolume(reexport.blob), 12 * 8 * 6)).toBe(true);
  });
});
