import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as THREE from "three";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import type { WorkplaneShape } from "@/types/layerling";
import { cadModifierProfileForShape, cadProfileExpectation } from "@/lib/cadProfileExtrusion";
import { cadProfileSolidMismatch, profileExtrusionSolid } from "@/lib/cadProfileSolid";
import type { CadModifierProfilePart } from "@/lib/cadModifierTypes";
import { createStarGeometry } from "@/lib/starGeometry";
import { createHeartGeometry } from "@/lib/heartGeometry";
import { createCrescentGeometry } from "@/lib/crescentGeometry";
import { createSlotGeometry } from "@/lib/slotGeometry";
import { createHoneycombGeometry } from "@/lib/honeycombGeometry";
import { createPrismGeometry } from "@/lib/prismGeometry";

/*
 * Exact profile bodies against the real kernel: each catalog shape becomes a
 * valid solid with the faces its outline predicts, agrees with its display
 * mesh, takes a fillet on a few edges - and is compared with the mesh path the
 * edge tool used before.
 */

type Vec3 = [number, number, number];

function shape(kind: WorkplaneShape["kind"], extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: `test-${kind}`,
    name: kind,
    kind,
    x: 0,
    z: 0,
    elevation: 0,
    size: 40,
    width: 40,
    depth: 40,
    height: 10,
    rotation: 0,
    color: "#ff8800",
    ...extra,
  } as WorkplaneShape;
}

/** The display mesh in the shape's local frame, as the viewport builds it. */
function localMesh(source: WorkplaneShape) {
  const { width, depth, height } = source;
  let geometry: THREE.BufferGeometry;
  switch (source.kind) {
    case "polygon":
      geometry = createPrismGeometry(width, height, depth, source.sides ?? 6);
      break;
    case "star":
      geometry = createStarGeometry({ width, depth, height, starPoints: source.starPoints, starInnerSize: source.starInnerSize, starOuterFillet: source.starOuterFillet, starInnerFillet: source.starInnerFillet, starQuality: source.starQuality });
      break;
    case "heart":
      geometry = createHeartGeometry({ width, depth, height, heartTipFillet: source.heartTipFillet, heartQuality: source.heartQuality });
      break;
    case "crescent":
      geometry = createCrescentGeometry({ width, depth, height, crescentThickness: source.crescentThickness, crescentTipFillet: source.crescentTipFillet, crescentQuality: source.crescentQuality });
      break;
    case "slot":
      geometry = createSlotGeometry({ width, depth, height, sides: source.sides });
      break;
    case "honeycomb":
      geometry = createHoneycombGeometry({ width, depth, height, honeycombCellSize: source.honeycombCellSize, honeycombWallThickness: source.honeycombWallThickness, honeycombFrameWidth: source.honeycombFrameWidth });
      break;
    default:
      throw new Error(`no mesh for ${source.kind}`);
  }
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const vertices: Vec3[] = [];
  for (let i = 0; i < position.count; i += 1) vertices.push([position.getX(i), position.getY(i), position.getZ(i)]);
  const faces: Vec3[] = [];
  const count = index ? index.count : position.count;
  for (let i = 0; i < count; i += 3) {
    faces.push(index ? [index.getX(i), index.getX(i + 1), index.getX(i + 2)] : [i, i + 1, i + 2]);
  }
  return { vertices, faces };
}

/**
 * World mesh, written out the way LayerlingEditor's transformMesh places a
 * vertex (turn about the centre, mirror, stand on the elevation) - kept
 * independent of the Matrix4 chain the profile's transform is built with.
 */
function worldMesh(source: WorkplaneShape) {
  const mesh = localMesh(source);
  const centerY = source.height / 2;
  const rotation = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(
    THREE.MathUtils.degToRad(source.rotationX ?? 0),
    THREE.MathUtils.degToRad(source.rotation ?? 0),
    THREE.MathUtils.degToRad(source.rotationZ ?? 0),
    "XYZ",
  ));
  const mx = source.mirrorX ? -1 : 1;
  const my = source.mirrorY ? -1 : 1;
  const mz = source.mirrorZ ? -1 : 1;
  const vertices = mesh.vertices.map(([x, y, z]) => {
    const v = new THREE.Vector3(x * mx, (y - centerY) * my, z * mz).applyMatrix4(rotation);
    return [v.x + source.x, v.y + (source.elevation ?? 0) + centerY, v.z + source.z] as Vec3;
  });
  const flipped = (mx * my * mz) < 0;
  return { vertices, faces: flipped ? mesh.faces.map(([a, b, c]) => [a, c, b] as Vec3) : mesh.faces };
}

describe("exact profile extrusions with the real OCCT kernel", () => {
  let cad: OcctKernel;

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    cad = await OcctKernel.init({ wasm });
  });

  function profileOf(source: WorkplaneShape) {
    const profile = cadModifierProfileForShape(source);
    expect(profile).not.toBeNull();
    const mesh = worldMesh(source);
    return { profile: { ...(profile as CadModifierProfilePart), expected: cadProfileExpectation(mesh.vertices, mesh.faces) }, mesh };
  }

  function placed(profile: CadModifierProfilePart) {
    const local = profileExtrusionSolid(cad, profile);
    return profile.transform ? cad.transform(local, profile.transform) : local;
  }

  function topEdges(solid: ShapeHandle, top: number) {
    return cad.getSubShapes(solid, "edge").filter((edge) => {
      const box = cad.getBoundingBox(edge);
      return Math.abs(box.ymin - top) < 1e-6 && Math.abs(box.ymax - top) < 1e-6;
    });
  }

  function expectExactBody(source: WorkplaneShape, faces: number, volume?: number) {
    const { profile, mesh } = profileOf(source);
    const solid = placed(profile);
    expect(cad.isSolid(solid)).toBe(true);
    expect(cad.isValid(solid)).toBe(true);
    expect(cad.subShapeCount(solid, "face")).toBe(faces);
    expect(cadProfileSolidMismatch(cad, solid, profile.expected)).toBeNull();
    const meshVolume = cadProfileExpectation(mesh.vertices, mesh.faces).volume;
    if (volume !== undefined) expect(cad.getVolume(solid)).toBeCloseTo(volume, 3);
    // Chords cut inside convex arcs and outside concave ones - never by much.
    expect(Math.abs(cad.getVolume(solid) - meshVolume) / meshVolume).toBeLessThan(0.02);
    return solid;
  }

  function expectFilletOnTop(solid: ShapeHandle, top: number, radius: number, take = 4) {
    const edges = topEdges(solid, top).slice(0, take);
    expect(edges.length).toBe(take);
    const filleted = cad.fillet(solid, edges, radius);
    expect(cad.isValid(filleted)).toBe(true);
    expect(cad.getVolume(filleted)).toBeLessThan(cad.getVolume(solid));
    return filleted;
  }

  it("builds a hexagon prism with 8 faces and the polygon's exact volume", () => {
    const source = shape("polygon", { sides: 6, width: 40, depth: 34.641, height: 12 });
    const { profile } = profileOf(source);
    const bounds = profile.expected.bounds;
    const solid = expectExactBody(source, 8);
    // Area of a regular hexagon from its corners, whatever the footprint fit did.
    const outline = profile.loops[0];
    let area = 0;
    let previous = { x: outline.x, z: outline.z };
    outline.segments.forEach((segment) => {
      area += previous.x * segment.z - segment.x * previous.z;
      previous = segment;
    });
    expect(cad.getVolume(solid)).toBeCloseTo((Math.abs(area) / 2) * 12, 3);
    expect(bounds[3] - bounds[0]).toBeCloseTo(40, 3);
    expectFilletOnTop(solid, 12, 1.5, 6);
  });

  it("builds a five-point star with rounded tips as 22 faces and fillets its top edges", () => {
    const source = shape("star", { starPoints: 5, starInnerSize: 20, starOuterFillet: 3, starInnerFillet: 2, starQuality: 16 });
    const solid = expectExactBody(source, 22);
    expectFilletOnTop(solid, 10, 1, 6);
  });

  it("builds a sharp star, a stretched star (elliptical roundings) and a 12-point star", () => {
    expectExactBody(shape("star", { starPoints: 5, starInnerSize: 18 }), 12);
    const stretched = expectExactBody(shape("star", { width: 60, depth: 30, starPoints: 6, starInnerSize: 30, starOuterFillet: 4, starInnerFillet: 3 }), 26);
    expectFilletOnTop(stretched, 10, 0.8, 5);
    expectExactBody(shape("star", { width: 50, depth: 50, starPoints: 12, starInnerSize: 38, starOuterFillet: 1, starInnerFillet: 1, starQuality: 4 }), 50);
  });

  it("builds a slot as two straight sides and two half cylinders, with the slot's exact volume", () => {
    const solid = expectExactBody(shape("slot", { width: 40, depth: 20, height: 20 }), 6, (20 * 20 + Math.PI * 10 * 10) * 20);
    expectFilletOnTop(solid, 20, 2, 4);
    expectExactBody(shape("slot", { width: 12, depth: 50, height: 5, sides: 12 }), 6, (38 * 12 + Math.PI * 6 * 6) * 5);
    expectExactBody(shape("slot", { width: 20, depth: 20, height: 5 }), 4, Math.PI * 10 * 10 * 5);
  });

  it("builds a heart from two true lobes, with and without a rounded tip", () => {
    expectExactBody(shape("heart", { width: 40, depth: 40 }), 6);
    const rounded = expectExactBody(shape("heart", { width: 50, depth: 36, heartTipFillet: 4 }), 7);
    expectFilletOnTop(rounded, 10, 1, 3);
  });

  it("builds a crescent from two circles with its horns rounded as on screen", () => {
    expectExactBody(shape("crescent", { crescentTipFillet: 0 }), 4);
    const rounded = expectExactBody(shape("crescent", { width: 40, depth: 40, crescentThickness: 14, crescentTipFillet: 0.5 }), 6);
    // The whole top edge, over both horns: the horn roundings are about 0.3 mm.
    expectFilletOnTop(rounded, 10, 0.2, 4);
    expectExactBody(shape("crescent", { width: 30, depth: 60, crescentThickness: 8, crescentTipFillet: 2, crescentQuality: 64 }), 6);
  });

  it("builds a honeycomb plate with every cell as a hole", () => {
    const source = shape("honeycomb", { width: 60, depth: 60, height: 3, honeycombCellSize: 8, honeycombWallThickness: 1.6, honeycombFrameWidth: 3 });
    const { profile } = profileOf(source);
    const holeEdges = profile.loops.slice(1).reduce((total, loop) => total + loop.segments.length, 0);
    expect(profile.loops.length).toBeGreaterThan(10);
    const solid = expectExactBody(source, 4 + 2 + holeEdges);
    expectFilletOnTop(solid, 3, 0.4, 4);
  });

  it("puts a turned, mirrored and lifted star exactly where the display mesh is", () => {
    const source = shape("star", {
      x: 12.5, z: -7, elevation: 4, rotation: 33, rotationX: 90, rotationZ: 15,
      mirrorX: true, width: 44, depth: 30, starPoints: 7, starInnerSize: 22, starOuterFillet: 2, starInnerFillet: 1,
    });
    const { profile } = profileOf(source);
    const solid = placed(profile);
    expect(cad.isValid(solid)).toBe(true);
    const box = cad.getBoundingBox(solid);
    const expected = profile.expected.bounds;
    // Fillets are sampled in the mesh, so allow the chord height, nothing more.
    [box.xmin, box.ymin, box.zmin, box.xmax, box.ymax, box.zmax].forEach((value, index) => {
      expect(Math.abs(value - expected[index])).toBeLessThan(0.05);
    });
  });

  it("refuses a body that does not match its mesh, so the worker can fall back", () => {
    const source = shape("heart", { width: 40, depth: 40 });
    const { profile } = profileOf(source);
    const solid = placed(profile);
    const moved = { bounds: profile.expected.bounds.map((value, index) => (index === 0 || index === 3 ? value + 10 : value)), volume: profile.expected.volume };
    expect(cadProfileSolidMismatch(cad, solid, moved)).toMatch(/bounds/);
    const hollow = { bounds: profile.expected.bounds, volume: profile.expected.volume * 0.5 };
    expect(cadProfileSolidMismatch(cad, solid, hollow)).toMatch(/volume/);
  });

  it("is much faster than rebuilding the same star from its display mesh", () => {
    const source = shape("star", { starPoints: 5, starInnerSize: 20, starOuterFillet: 3, starInnerFillet: 2, starQuality: 16 });
    const mesh = worldMesh(source);

    const exactStart = performance.now();
    const exact = placed(profileOf(source).profile);
    const exactFillet = cad.fillet(exact, topEdges(exact, 10).slice(0, 6), 1);
    const exactMs = performance.now() - exactStart;
    expect(cad.isValid(exactFillet)).toBe(true);

    // The mesh path of cadModifier.worker.ts reconstructSolid: STL import,
    // heal, merge coplanar faces.
    const meshStart = performance.now();
    const lines = ["solid layerling"];
    mesh.faces.forEach(([a, b, c]) => {
      lines.push(`facet normal 0 0 0\n outer loop\n  vertex ${mesh.vertices[a].join(" ")}\n  vertex ${mesh.vertices[b].join(" ")}\n  vertex ${mesh.vertices[c].join(" ")}\n endloop\nendfacet`);
    });
    lines.push("endsolid layerling");
    const imported = cad.importStl(lines.join("\n"));
    let fromMesh = cad.fixShape(imported);
    if (!cad.isSolid(fromMesh)) {
      // The worker's second route: sew the faces into a closed shell.
      fromMesh = cad.sewAndSolidify(cad.getSubShapes(imported, "face"), 1e-5);
      fromMesh = cad.fixShape(fromMesh);
    }
    if (cad.isSolid(fromMesh)) fromMesh = cad.healSolid(fromMesh, 1e-4);
    fromMesh = cad.fixFaceOrientations(fromMesh);
    fromMesh = cad.removeDegenerateEdges(fromMesh);
    fromMesh = cad.unifySameDomain(fromMesh);
    expect(cad.isValid(fromMesh)).toBe(true);
    const meshFaces = cad.subShapeCount(fromMesh, "face");
    const meshTopEdges = topEdges(fromMesh, 10);
    let meshFilletOk = true;
    try {
      cad.fillet(fromMesh, meshTopEdges.slice(0, 6), 1);
    } catch {
      meshFilletOk = false;
    }
    const meshMs = performance.now() - meshStart;

    console.info(`[exact profile] star: exact 22 faces, build + fillet ${exactMs.toFixed(0)} ms; mesh ${mesh.faces.length} triangles -> ${meshFaces} faces, build + fillet ${meshMs.toFixed(0)} ms (fillet ${meshFilletOk ? "ok" : "refused"})`);
    expect(meshFaces).toBeGreaterThan(22);
    expect(exactMs).toBeLessThan(meshMs);
  });
});
