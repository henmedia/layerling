import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as THREE from "three";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import type { WorkplaneShape } from "@/types/layerling";
import { cadModifierProfileForShape, cadProfileExpectation } from "@/lib/cadProfileExtrusion";
import { cadProfileSolidMismatch, profileExtrusionSolid } from "@/lib/cadProfileSolid";
import type { CadModifierProfilePart } from "@/lib/cadModifierTypes";
import { createTeardropGeometry } from "@/lib/teardropGeometry";
import { createScrewHoleGeometry } from "@/lib/screwHoleGeometry";
import { createPortGeometry, PORT_PROFILE_POLYGONS, portPolygonCorners, portPresetSize, type PortPreset } from "@/lib/portGeometry";
import { createFinishingWasherGeometry } from "@/lib/finishingWasherGeometry";
import { finishingWasherFields } from "@/lib/screwHoleSizes";
import { drillPointLength } from "@/lib/drillPoint";
import { meshForShape } from "@/lib/editorMeshCore";

/*
 * The teardrop, the port opening and the two screw holes as exact bodies against the real
 * kernel: valid solids with the faces their outline predicts, in the place
 * and turn their display mesh has, and with fillets that work on them.
 */

type Vec3 = [number, number, number];

function shape(kind: WorkplaneShape["kind"], extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id: `test-${kind}`, name: kind, kind, x: 0, z: 0, elevation: 0, size: 20, width: 20, depth: 20, height: 10, rotation: 0, color: "#ff8800", ...extra } as WorkplaneShape;
}

function worldMesh(source: WorkplaneShape) {
  const { width, depth, height } = source;
  const geometry = source.kind === "teardrop"
    ? createTeardropGeometry({ width, depth, height })
    : source.kind === "finishingWasher"
    ? createFinishingWasherGeometry({ width, depth, height, screwHoleShaft: source.screwHoleShaft, screwHoleHeadDepth: source.screwHoleHeadDepth, screwHoleAngle: source.screwHoleAngle, sides: 192 })
    : source.kind === "port"
    ? createPortGeometry({ width, depth, height, cornerFillet: source.cornerFillet, portProfile: source.portProfile })
    : createScrewHoleGeometry({ kind: source.kind as "counterbore" | "countersink" | "doubleCountersink", width, depth, height, screwHoleShaft: source.screwHoleShaft, screwHoleHeadDepth: source.screwHoleHeadDepth, screwHoleAngle: source.screwHoleAngle });
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const centerY = height / 2;
  const rotation = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(source.rotationX ?? 0), THREE.MathUtils.degToRad(source.rotation ?? 0), THREE.MathUtils.degToRad(source.rotationZ ?? 0), "XYZ"));
  const vertices: Vec3[] = [];
  for (let i = 0; i < position.count; i += 1) {
    const v = new THREE.Vector3(position.getX(i), position.getY(i) - centerY, position.getZ(i)).applyMatrix4(rotation);
    vertices.push([v.x + source.x, v.y + (source.elevation ?? 0) + centerY, v.z + source.z]);
  }
  const faces: Vec3[] = [];
  const count = index ? index.count : position.count;
  for (let i = 0; i < count; i += 3) faces.push(index ? [index.getX(i), index.getX(i + 1), index.getX(i + 2)] : [i, i + 1, i + 2]);
  return { vertices, faces };
}

describe("exact bodies for the bore shapes with the real OCCT kernel", () => {
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
    return { solid, mesh, profile };
  }

  const surfaceTypes = (solid: ShapeHandle) => {
    const faces = cad.getSubShapes(solid, "face");
    const types = faces.map((face) => cad.surfaceType(face));
    faces.forEach((face) => cad.release(face));
    return types.sort();
  };

  it("teardrop: a round part and two flanks, laid along the depth with the point up", () => {
    const source = shape("teardrop", { x: 5, z: -3, elevation: 4, width: 6, depth: 20, height: 3 + 3 * Math.SQRT2 });
    const { solid, mesh } = exact(source);
    // round part, two flanks, two end caps
    expect(cad.subShapeCount(solid, "face")).toBe(5);
    expect(surfaceTypes(solid)).toEqual(["cylinder", "plane", "plane", "plane", "plane"]);
    const box = cad.getBoundingBox(solid);
    expect(box.xmin).toBeCloseTo(2, 3);
    expect(box.xmax).toBeCloseTo(8, 3);
    expect(box.ymin).toBeCloseTo(4, 3);
    expect(box.ymax).toBeCloseTo(4 + 3 + 3 * Math.SQRT2, 3);
    expect(box.zmin).toBeCloseTo(-13, 3);
    expect(box.zmax).toBeCloseTo(7, 3);
    const radius = 3;
    const rise = radius * Math.SQRT2;
    const area = Math.PI * radius * radius * (1 - Math.acos(radius / rise) / Math.PI) + radius * Math.sqrt(rise * rise - radius * radius);
    expect(cad.getVolume(solid)).toBeCloseTo(area * 20, 2);
    const meshVolume = cadProfileExpectation(mesh.vertices, mesh.faces).volume;
    expect(Math.abs(cad.getVolume(solid) - meshVolume) / meshVolume).toBeLessThan(0.02);
  });

  it("teardrop: follows the turn of the shape like its display mesh", () => {
    const { solid } = exact(shape("teardrop", { width: 6, depth: 20, height: 3 + 3 * Math.SQRT2, rotation: 30, rotationX: 15 }));
    expect(cad.isValid(solid)).toBe(true);
  });

  it("teardrop: takes a fillet on the end edges", () => {
    const { solid } = exact(shape("teardrop", { width: 6, depth: 20, height: 3 + 3 * Math.SQRT2 }));
    const edges = cad.getSubShapes(solid, "edge").filter((edge) => {
      const box = cad.getBoundingBox(edge);
      return Math.abs(box.zmin - box.zmax) < 1e-6 && Math.abs(Math.abs(box.zmin) - 10) < 1e-6;
    });
    expect(edges.length).toBeGreaterThan(0);
    const filleted = cad.fillet(solid, edges, 0.5);
    expect(cad.isValid(filleted)).toBe(true);
    expect(cad.getVolume(filleted)).toBeLessThan(cad.getVolume(solid));
  });

  it("teardrop: with no room for a tip it stays a mesh", () => {
    expect(cadModifierProfileForShape(shape("teardrop", { width: 6, depth: 20, height: 4 }))).toBeNull();
  });

  it("port opening: USB-C with round ends, laid along the depth, standing on its elevation (#1049)", () => {
    const source = shape("port", { x: 4, z: -2, elevation: 6, width: 9.4, depth: 10, height: 3.7, cornerFillet: 1.85 });
    const { solid } = exact(source);
    // two round ends, top and bottom, two end caps
    expect(surfaceTypes(solid)).toEqual(["cylinder", "cylinder", "plane", "plane", "plane", "plane"]);
    const box = cad.getBoundingBox(solid);
    expect(box.xmin).toBeCloseTo(4 - 4.7, 3);
    expect(box.xmax).toBeCloseTo(4 + 4.7, 3);
    expect(box.ymin).toBeCloseTo(6, 3);
    expect(box.ymax).toBeCloseTo(9.7, 3);
    expect(box.zmin).toBeCloseTo(-7, 3);
    expect(box.zmax).toBeCloseTo(3, 3);
    const r = 1.85;
    expect(cad.getVolume(solid)).toBeCloseTo(((9.4 - 2 * r) * 3.7 + Math.PI * r * r) * 10, 2);
  });

  it("port opening: square corners give a plain block, small ones four rounded edges", () => {
    expect(surfaceTypes(exact(shape("port", { width: 13, depth: 10, height: 5.6, cornerFillet: 0 })).solid)).toEqual(Array(6).fill("plane"));
    const { solid } = exact(shape("port", { width: 13, depth: 10, height: 5.6, cornerFillet: 0.5, rotation: 90 }));
    expect(surfaceTypes(solid).filter((type) => type === "cylinder")).toHaveLength(4);
    // Standing upright the round ends are top and bottom; as wide as high it is one round hole.
    expect(surfaceTypes(exact(shape("port", { width: 3.7, depth: 10, height: 9.4, cornerFillet: 1.85 })).solid)).toEqual(["cylinder", "cylinder", "plane", "plane", "plane", "plane"]);
    expect(surfaceTypes(exact(shape("port", { width: 6, depth: 10, height: 6, cornerFillet: 3 })).solid)).toEqual(["cylinder", "plane", "plane"]);
  });

  it("port opening: HDMI with both lower corners cut, DisplayPort with only the left one", () => {
    const hdmi = exact(shape("port", { width: 15.7, depth: 10, height: 6.2, cornerFillet: 0.3, portProfile: "hdmi" })).solid;
    // two rounded upper corners; top, bottom, two sides, two slants and two end caps flat
    expect(surfaceTypes(hdmi)).toEqual(["cylinder", "cylinder", ...Array(8).fill("plane")]);
    const hdmiBox = cad.getBoundingBox(hdmi);
    expect(hdmiBox.xmax - hdmiBox.xmin).toBeCloseTo(15.7, 3);
    expect(hdmiBox.ymax - hdmiBox.ymin).toBeCloseTo(6.2, 3);
    const dp = exact(shape("port", { width: 17.1, depth: 10, height: 5.76, cornerFillet: 0.8, portProfile: "displayPort" })).solid;
    expect(surfaceTypes(dp)).toEqual(["cylinder", "cylinder", "cylinder", ...Array(7).fill("plane")]);
    // the cut corner takes 1.8 x 1.8 / 2 off the section
    const r = 0.8;
    const section = 17.1 * 5.76 - 3 * (r * r - Math.PI * r * r / 4) - 1.8 * 1.8 / 2;
    expect(cad.getVolume(dp)).toBeCloseTo(section * 10, 2);
  });

  it("port opening: Micro-HDMI with both lower corners cut, also grown by extra clearance", () => {
    for (const [width, height, corner] of [[6.8, 3.6, 0.3], [7.4, 4.2, 0.6]]) {
      const source = shape("port", { width, depth: 10, height, cornerFillet: corner, portProfile: "microHdmi" });
      const { solid } = exact(source);
      expect(surfaceTypes(solid)).toEqual(["cylinder", "cylinder", ...Array(8).fill("plane")]);
      const box = cad.getBoundingBox(solid);
      expect(box.xmax - box.xmin).toBeCloseTo(width, 3);
      expect(box.ymax - box.ymin).toBeCloseTo(height, 3);
      // each cut corner takes a triangle of width / 6.8 by 0.9 / 3.6 of the height, each round one r² (1 - π/4)
      const cx = width / 6.8, cy = (0.9 / 3.6) * height;
      const section = width * height - 2 * (corner * corner - Math.PI * corner * corner / 4) - 2 * (cx * cy / 2);
      expect(cad.getVolume(solid)).toBeCloseTo(section * 10, 2);
    }
  });

  it("port opening: XT30, XT60, MT60 and D-Sub 9 as rounded polygons, plain and grown by extra clearance", () => {
    for (const key of ["xt30", "xt60", "mt60", "dsub9"] as PortPreset[]) {
      for (const clearance of [0, 0.3]) {
        const preset = portPresetSize(key, clearance);
        const source = shape("port", { width: preset.width, depth: 10, height: preset.height, cornerFillet: preset.corner, portProfile: preset.profile });
        const { solid } = exact(source);
        const corners = PORT_PROFILE_POLYGONS[preset.profile as keyof typeof PORT_PROFILE_POLYGONS](1, 1).length;
        // one round face for each corner, a flat one for each side and the two end caps
        expect(surfaceTypes(solid), `${key} ${clearance}`).toEqual([...Array(corners).fill("cylinder"), ...Array(corners + 2).fill("plane")]);
        const box = cad.getBoundingBox(solid);
        expect(box.xmax - box.xmin, `${key} ${clearance}`).toBeCloseTo(preset.width, 3);
        expect(box.ymax - box.ymin, `${key} ${clearance}`).toBeCloseTo(preset.height, 3);
        // The section: the polygon inside the rounding, its sides pushed out by the radius, and a whole circle at the corners.
        const inner = portPolygonCorners(preset.profile, preset.width, preset.height, preset.corner);
        const area = inner.reduce((sum, point, index) => {
          const next = inner[(index + 1) % inner.length];
          return sum + (point.x * next.y - next.x * point.y) / 2;
        }, 0);
        const perimeter = inner.reduce((sum, point, index) => {
          const next = inner[(index + 1) % inner.length];
          return sum + Math.hypot(next.x - point.x, next.y - point.y);
        }, 0);
        const section = area + perimeter * preset.corner + Math.PI * preset.corner * preset.corner;
        expect(cad.getVolume(solid), `${key} ${clearance}`).toBeCloseTo(section * 10, 2);
      }
    }
  });

  it("counterbore: five faces, plane and cylinder only, head end on top", () => {
    const source = shape("counterbore", { x: 2, z: 1, elevation: 3, width: 6.4, depth: 6.4, height: 12, screwHoleShaft: 3.4, screwHoleHeadDepth: 3.2 });
    const { solid } = exact(source);
    expect(cad.subShapeCount(solid, "face")).toBe(5);
    expect(surfaceTypes(solid)).toEqual(["cylinder", "cylinder", "plane", "plane", "plane"]);
    const box = cad.getBoundingBox(solid);
    expect(box.ymin).toBeCloseTo(3, 4);
    expect(box.ymax).toBeCloseTo(15, 4);
    expect(box.xmax - box.xmin).toBeCloseTo(6.4, 3);
    const exactVolume = Math.PI * 1.7 ** 2 * 8.8 + Math.PI * 3.2 ** 2 * 3.2;
    expect(cad.getVolume(solid)).toBeCloseTo(exactVolume, 2);
  });

  it("countersink: four faces with a real cone, and a chamfer works on its rim", () => {
    const source = shape("countersink", { width: 6.6, depth: 6.6, height: 8, screwHoleShaft: 3.4, screwHoleAngle: 90 });
    const { solid } = exact(source);
    expect(cad.subShapeCount(solid, "face")).toBe(4);
    expect(surfaceTypes(solid)).toEqual(["cone", "cylinder", "plane", "plane"]);
    const cone = (Math.PI * 1.6 / 3) * (1.7 ** 2 + 1.7 * 3.3 + 3.3 ** 2);
    expect(cad.getVolume(solid)).toBeCloseTo(Math.PI * 1.7 ** 2 * 6.4 + cone, 2);
    const rim = cad.getSubShapes(solid, "edge").filter((edge) => {
      const box = cad.getBoundingBox(edge);
      return Math.abs(box.ymin - 8) < 1e-6 && Math.abs(box.ymax - 8) < 1e-6;
    });
    expect(rim.length).toBeGreaterThan(0);
    const chamfered = cad.chamfer(solid, rim, 0.3);
    expect(cad.isValid(chamfered)).toBe(true);
  });

  it("double countersink: five faces, two real cones and a shaft, and a chamfer works on a rim (#392)", () => {
    const source = shape("doubleCountersink", { width: 6.6, depth: 6.6, height: 6, screwHoleShaft: 3.4, screwHoleAngle: 90 });
    const { solid } = exact(source);
    expect(cad.subShapeCount(solid, "face")).toBe(5);
    expect(surfaceTypes(solid)).toEqual(["cone", "cone", "cylinder", "plane", "plane"]);
    const cone = (Math.PI * 1.6 / 3) * (1.7 ** 2 + 1.7 * 3.3 + 3.3 ** 2);
    expect(cad.getVolume(solid)).toBeCloseTo(2 * cone + Math.PI * 1.7 ** 2 * 2.8, 2);
    const rim = cad.getSubShapes(solid, "edge").filter((edge) => {
      const box = cad.getBoundingBox(edge);
      return Math.abs(box.ymin - 6) < 1e-6 && Math.abs(box.ymax - 6) < 1e-6;
    });
    expect(rim.length).toBeGreaterThan(0);
    expect(cad.isValid(cad.chamfer(solid, rim, 0.3))).toBe(true);
  });

  it("double countersink: too short for two cones, they meet in the middle (#392)", () => {
    // Head 10, shaft 6, 90 degrees, length 2: two cones from 10 down to 8 in the middle.
    const source = shape("doubleCountersink", { width: 10, depth: 10, height: 2, screwHoleShaft: 6, screwHoleAngle: 90 });
    const { solid } = exact(source);
    expect(cad.subShapeCount(solid, "face")).toBe(4);
    expect(surfaceTypes(solid)).toEqual(["cone", "cone", "plane", "plane"]);
    const cone = (Math.PI * 1 / 3) * (4 ** 2 + 4 * 5 + 5 ** 2);
    expect(cad.getVolume(solid)).toBeCloseTo(2 * cone, 2);
  });

  it("finishing washer: bottom, rim, dome, seat and bore as five faces with a real cone, and a fillet works on the rim (#1131)", () => {
    const source = shape("finishingWasher", { ...finishingWasherFields("M4"), x: 3, z: -2, elevation: 1 });
    const { solid } = exact(source);
    expect(cad.subShapeCount(solid, "face")).toBe(5);
    const types = surfaceTypes(solid);
    expect(types.filter((type) => type === "plane")).toHaveLength(1);
    expect(types.filter((type) => type === "cone")).toHaveLength(1);
    expect(types.filter((type) => type === "cylinder")).toHaveLength(2);
    const box = cad.getBoundingBox(solid);
    expect(box.xmin).toBeCloseTo(3 - 6.7, 4);
    expect(box.ymin).toBeCloseTo(1, 4);
    expect(box.ymax).toBeCloseTo(1 + 3.95, 4);
    // The bottom rim, where the flat underside meets the upright edge.
    const rim = cad.getSubShapes(solid, "edge").filter((edge) => {
      const edgeBox = cad.getBoundingBox(edge);
      return Math.abs(edgeBox.ymin - 1) < 1e-6 && Math.abs(edgeBox.ymax - 1) < 1e-6 && edgeBox.xmax - edgeBox.xmin > 12;
    });
    expect(rim).toHaveLength(1);
    expect(cad.isValid(cad.fillet(solid, rim, 0.2))).toBe(true);
  });

  it("finishing washer: every size builds; an oval one keeps its mesh (#1131)", () => {
    for (const size of ["M2", "M3", "M8", "M20"] as const) exact(shape("finishingWasher", finishingWasherFields(size)));
    expect(cadModifierProfileForShape(shape("finishingWasher", { ...finishingWasherFields("M5"), depth: 18 }))).toBeNull();
  });

  it("screw holes: an oval footprint keeps the display mesh", () => {
    expect(cadModifierProfileForShape(shape("counterbore", { width: 6.4, depth: 9, height: 12 }))).toBeNull();
  });

  /** The exact body of a shape against its own display mesh, as the edge tool and STEP get it. */
  function exactAgainstMesh(source: WorkplaneShape) {
    const part = cadModifierProfileForShape(source);
    expect(part).not.toBeNull();
    const mesh = meshForShape(source);
    const profile = { ...(part as CadModifierProfilePart), expected: cadProfileExpectation(mesh.vertices, mesh.faces) };
    const local = profileExtrusionSolid(cad, profile);
    const solid = profile.transform ? cad.transform(local, profile.transform) : local;
    expect(cad.isSolid(solid)).toBe(true);
    expect(cad.isValid(solid)).toBe(true);
    expect(cadProfileSolidMismatch(cad, solid, profile.expected)).toBeNull();
    return { solid, meshVolume: profile.expected.volume };
  }

  it.each([90, 118, 135])("drilled hole at %s degrees: the wall and a real cone below the depth, where its mesh has them (Discussion #621)", (angle) => {
    const tip = drillPointLength(6, angle);
    const { solid, meshVolume } = exactAgainstMesh(shape("cylinder", { x: 3, z: -1, elevation: 4, width: 6, depth: 6, height: 10, hole: true, drillPointAngle: angle }));
    expect(surfaceTypes(solid)).toEqual(["cone", "cylinder", "plane"]);
    const box = cad.getBoundingBox(solid);
    // The height counts to the shoulder, as in a drawing: the tip lies below it.
    expect(box.ymin).toBeCloseTo(4 - tip, 4);
    expect(box.ymax).toBeCloseTo(14, 4);
    expect(box.xmin).toBeCloseTo(0, 3);
    const volume = Math.PI * 9 * 10 + (Math.PI * 9 * tip) / 3;
    expect(cad.getVolume(solid)).toBeCloseTo(volume, 2);
    expect(Math.abs(meshVolume - volume) / volume).toBeLessThan(0.005);
    // Its mouth takes a chamfer, as a drilled hole often has.
    const rim = cad.getSubShapes(solid, "edge").filter((edge) => {
      const edgeBox = cad.getBoundingBox(edge);
      return Math.abs(edgeBox.ymin - 14) < 1e-6 && Math.abs(edgeBox.ymax - 14) < 1e-6;
    });
    expect(rim.length).toBeGreaterThan(0);
    expect(cad.isValid(cad.chamfer(solid, rim, 0.5))).toBe(true);
  });

  it("drilled counterbore and countersink: the drill point below the shaft as one more cone (Discussion #621)", () => {
    const tip = drillPointLength(3.4, 118);
    const tipVolume = (Math.PI * 1.7 ** 2 * tip) / 3;
    const counterbore = exactAgainstMesh(shape("counterbore", { elevation: 3, width: 6.4, depth: 6.4, height: 12, hole: true, screwHoleShaft: 3.4, screwHoleHeadDepth: 3.2, drillPointAngle: 118 })).solid;
    expect(surfaceTypes(counterbore)).toEqual(["cone", "cylinder", "cylinder", "plane", "plane"]);
    expect(cad.getVolume(counterbore)).toBeCloseTo(Math.PI * 1.7 ** 2 * 8.8 + Math.PI * 3.2 ** 2 * 3.2 + tipVolume, 2);
    expect(cad.getBoundingBox(counterbore).ymin).toBeCloseTo(3 - tip, 4);
    const countersink = exactAgainstMesh(shape("countersink", { width: 6.6, depth: 6.6, height: 8, hole: true, screwHoleShaft: 3.4, screwHoleAngle: 90, drillPointAngle: 118 })).solid;
    expect(surfaceTypes(countersink)).toEqual(["cone", "cone", "cylinder", "plane"]);
    const cone = (Math.PI * 1.6 / 3) * (1.7 ** 2 + 1.7 * 3.3 + 3.3 ** 2);
    expect(cad.getVolume(countersink)).toBeCloseTo(Math.PI * 1.7 ** 2 * 6.4 + cone + tipVolume, 2);
    expect(cad.getBoundingBox(countersink).ymin).toBeCloseTo(-tip, 4);
  });

  it("slotted countersink: two half cones joined by flat flanks along the slot, as its mesh draws it (Discussion #1531)", () => {
    const source = shape("countersink", { x: 4, z: -2, width: 14, depth: 6.6, height: 8, hole: true, screwHoleShaft: 3.4, screwHoleAngle: 90, screwHoleSlot: true });
    const { solid } = exactAgainstMesh(source);
    const cone = (Math.PI * 1.6 / 3) * (1.7 ** 2 + 1.7 * 3.3 + 3.3 ** 2);
    const section = 3.4 * 6.4 + ((3.4 + 6.6) / 2) * 1.6;
    expect(cad.getVolume(solid)).toBeCloseTo(Math.PI * 1.7 ** 2 * 6.4 + cone + section * 7.4, 2);
    const box = cad.getBoundingBox(solid);
    expect([box.xmin, box.xmax, box.ymin, box.ymax, box.zmin, box.zmax].map((value) => Number(value.toFixed(4)) + 0)).toEqual([-3, 11, 0, 8, -5.3, 1.3]);
    // Real cones and cylinders at the ends, no facets: the edge tool and STEP get the curved faces.
    const types = surfaceTypes(solid);
    expect(types.filter((type) => type === "cone").length).toBeGreaterThan(0);
    expect(types.filter((type) => type === "cylinder").length).toBeGreaterThan(0);
    expect(types.every((type) => type === "cone" || type === "cylinder" || type === "plane")).toBe(true);
    const rim = cad.getSubShapes(solid, "edge").filter((edge) => {
      const edgeBox = cad.getBoundingBox(edge);
      return Math.abs(edgeBox.ymin - 8) < 1e-6 && Math.abs(edgeBox.ymax - 8) < 1e-6;
    });
    expect(rim.length).toBeGreaterThan(0);
    expect(cad.isValid(cad.chamfer(solid, rim, 0.3))).toBe(true);
  });

  it("recessed countersink: a cylinder as wide as the head above the cone, and on both ends of a double one (Discussion #1531)", () => {
    const { solid } = exactAgainstMesh(shape("countersink", { width: 6.6, depth: 6.6, height: 12, hole: true, screwHoleShaft: 3.4, screwHoleAngle: 90, screwHoleRecess: 4 }));
    const cone = (Math.PI * 1.6 / 3) * (1.7 ** 2 + 1.7 * 3.3 + 3.3 ** 2);
    expect(cad.getVolume(solid)).toBeCloseTo(Math.PI * 1.7 ** 2 * 6.4 + cone + Math.PI * 3.3 ** 2 * 4, 2);
    expect(surfaceTypes(solid).filter((type) => type === "cylinder").length).toBe(2);
    const double = exactAgainstMesh(shape("doubleCountersink", { width: 6.6, depth: 6.6, height: 12, hole: true, screwHoleShaft: 3.4, screwHoleAngle: 90, screwHoleRecess: 2 })).solid;
    expect(cad.getVolume(double)).toBeCloseTo(Math.PI * 1.7 ** 2 * 4.8 + 2 * cone + 2 * Math.PI * 3.3 ** 2 * 2, 2);
    const slotted = exactAgainstMesh(shape("countersink", { width: 14, depth: 6.6, height: 12, hole: true, screwHoleShaft: 3.4, screwHoleAngle: 90, screwHoleSlot: true, screwHoleRecess: 4 })).solid;
    expect(cad.isValid(slotted)).toBe(true);
  });

  it("chamfered counterbore: a real cone at the rim, outside the head's diameter, round and slotted (Discussion #1632)", () => {
    const { solid } = exactAgainstMesh(shape("counterbore", { width: 6.4, depth: 6.4, height: 12, hole: true, screwHoleShaft: 3.4, screwHoleHeadDepth: 3.2, screwHoleChamfer: 1 }));
    const rim = (Math.PI * 1 / 3) * (3.2 ** 2 + 3.2 * 4.2 + 4.2 ** 2);
    expect(cad.getVolume(solid)).toBeCloseTo(Math.PI * 1.7 ** 2 * 8.8 + Math.PI * 3.2 ** 2 * 2.2 + rim, 2);
    expect(surfaceTypes(solid).filter((type) => type === "cone").length).toBe(1);
    const box = cad.getBoundingBox(solid);
    expect(box.xmax - box.xmin).toBeCloseTo(8.4, 3);
    expect(box.ymax - box.ymin).toBeCloseTo(12, 3);
    const slotted = exactAgainstMesh(shape("counterbore", { width: 14, depth: 6.4, height: 12, hole: true, screwHoleShaft: 3.4, screwHoleHeadDepth: 3.2, screwHoleSlot: true, screwHoleChamfer: 1 })).solid;
    expect(cad.isValid(slotted)).toBe(true);
  });

  it("slotted counterbore along the depth and slotted double countersink: valid bodies where their meshes are (Discussion #1531)", () => {
    const counterbore = exactAgainstMesh(shape("counterbore", { width: 6.4, depth: 10, height: 12, hole: true, screwHoleShaft: 3.4, screwHoleHeadDepth: 3.2, screwHoleSlot: true, rotation: 30 })).solid;
    const round = Math.PI * 1.7 ** 2 * 8.8 + Math.PI * 3.2 ** 2 * 3.2;
    expect(cad.getVolume(counterbore)).toBeCloseTo(round + (3.4 * 8.8 + 6.4 * 3.2) * 3.6, 2);
    const double = exactAgainstMesh(shape("doubleCountersink", { width: 12, depth: 6.6, height: 6, hole: true, screwHoleShaft: 3.4, screwHoleAngle: 90, screwHoleSlot: true })).solid;
    expect(cad.isValid(double)).toBe(true);
    expect(cad.getBoundingBox(double).xmax).toBeCloseTo(6, 4);
  });
});
