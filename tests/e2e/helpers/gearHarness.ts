import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as THREE from "three";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import type { WorkplaneShape } from "@/types/layerling";
import { cadModifierHelicalGearForShape, cadModifierProfileForShape, cadProfileExpectation } from "@/lib/cadProfileExtrusion";
import { cadProfileSolidMismatch, profileExtrusionSolid } from "@/lib/cadProfileSolid";
import { cadTransformRequiresGeneralTransform } from "@/lib/cadModifierRuntime";
import { helicalGearPartSolid } from "@/lib/gearSolid";
import { BEVEL_GEAR_TOP_SCALE, createGearGeometry, gearHelixTwist, gearOutlineCorners, gearSettings, gearTypeHasHelix, MIN_GEAR_HELIX_QUALITY, MAX_GEAR_HELIX_QUALITY } from "@/lib/gearGeometry";
import { meshYawDegrees, mirrorSign } from "@/lib/workplaneShapes";


/*
 * The helical, herringbone and bevel gears' exact bodies against their display mesh,
 * built by the real createGearGeometry and placed as transformMesh places it
 * (copied here, as LayerlingEditor.tsx keeps it to itself; gears take no
 * taper, twist or lean).
 *
 * Bounds and volume cannot tell a gear turned the wrong way, or turned too
 * far, from the right one. So the body is also cut at several heights, and
 * points just inside and just outside the section the gear has there are
 * tested against it: the foot outline turned by its share of the helix
 * angle (helical; half of it up to the middle and back for a herringbone
 * gear), or shrunk towards the top (bevel), and the round bore.
 *
 * The mesh draws the bore as a polygon inside the circle and a helical gear
 * in straight steps; it holds within 1 % of the body. The body is held to
 * the volume worked out from its outline: a turn keeps every section's area,
 * so a helical gear is a straight one in volume; a bevel gear is a frustum.
 */

export type Vec3 = [number, number, number];
export type P2 = { x: number; z: number };

export let cad: OcctKernel;

beforeAll(async () => {
  const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
  cad = await OcctKernel.init({ wasm });
});

export function gear(extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "g", name: "Gear", kind: "gear", color: "#888888", x: 0, z: 0, elevation: 0, rotation: 0,
    width: 30, depth: 30, size: 30, height: 6, teeth: 12, toothSize: 2.5, centerHoleSize: 6, gearType: "helical", helixAngle: 22.5, helixQuality: 16,
    ...extra,
  } as WorkplaneShape;
}

/** Shape-local (y up, foot at y = 0) to world, as transformMesh places the mesh. */
export function placer(shape: WorkplaneShape) {
  const centerY = shape.height / 2;
  const rotation = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(
    THREE.MathUtils.degToRad(shape.rotationX ?? 0), THREE.MathUtils.degToRad(meshYawDegrees(shape)), THREE.MathUtils.degToRad(shape.rotationZ ?? 0), "XYZ"));
  const mirror = new THREE.Vector3(mirrorSign(shape.mirrorX), mirrorSign(shape.mirrorY), mirrorSign(shape.mirrorZ));
  return (x: number, y: number, z: number): Vec3 => {
    const v = new THREE.Vector3(x * mirror.x, (y - centerY) * mirror.y, z * mirror.z).applyMatrix4(rotation);
    return [v.x + shape.x, v.y + (shape.elevation ?? 0) + centerY, v.z + shape.z];
  };
}

export function displayMesh(shape: WorkplaneShape) {
  const geometry = createGearGeometry({ ...shape, width: shape.width, depth: shape.depth ?? shape.width, height: shape.height });
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = flat.getAttribute("position");
  const place = placer(shape);
  const vertices: Vec3[] = [];
  for (let i = 0; i < position.count; i += 1) vertices.push(place(position.getX(i), position.getY(i), position.getZ(i)));
  const faces: Vec3[] = [];
  const flip = [shape.mirrorX, shape.mirrorY, shape.mirrorZ].filter(Boolean).length % 2 === 1;
  for (let i = 0; i + 2 < vertices.length; i += 3) faces.push(flip ? [i, i + 2, i + 1] : [i, i + 1, i + 2]);
  return cadProfileExpectation(vertices, faces);
}

export function body(shape: WorkplaneShape) {
  let local: ShapeHandle;
  let transform: number[] | undefined;
  if (gearTypeHasHelix(gearSettings(shape).gearType)) {
    const part = cadModifierHelicalGearForShape(shape);
    expect(part).not.toBeNull();
    local = helicalGearPartSolid(cad, part!);
    transform = part!.transform;
  } else {
    const part = cadModifierProfileForShape(shape);
    // The bevel gear is a loft; the ring gear and the rack (#201) are straight extrusions.
    expect(["loft", "extrusion"]).toContain(part?.kind);
    local = profileExtrusionSolid(cad, part!);
    transform = part!.transform;
  }
  return !transform ? local : cadTransformRequiresGeneralTransform(transform) ? cad.generalTransform(local, transform) : cad.transform(local, transform);
}

export function area(points: P2[]) {
  let sum = 0;
  points.forEach((a, index) => {
    const b = points[(index + 1) % points.length];
    sum += a.x * b.z - b.x * a.z;
  });
  return Math.abs(sum) / 2;
}

/**
 * The gear's section at height y in its own frame, worked out here from the
 * corners alone: the helical gear's ring turned by its share of the helix
 * angle and stretched as its part says (the herringbone gear's turned half
 * the angle up to the middle and back), the bevel gear's foot outline
 * stretched to width x depth and shrunk towards the top. And its bore.
 */
export function section(shape: WorkplaneShape, y: number) {
  const settings = gearSettings(shape);
  const corners = gearOutlineCorners(shape.width, shape.depth!, shape);
  const t = y / shape.height;
  if (gearTypeHasHelix(settings.gearType)) {
    const { stretch } = cadModifierHelicalGearForShape(shape)!;
    const twist = gearHelixTwist(shape.width, shape.depth!, shape.height, shape);
    const turn = settings.gearType === "herringbone" ? (twist / 2) * (1 - Math.abs(2 * t - 1)) : twist * t;
    return { outline: corners.map((c) => ({ x: Math.cos(c.angle + turn) * c.radiusX * stretch.x, z: Math.sin(c.angle + turn) * c.radiusZ * stretch.z })), bore: settings.centerHoleSize / 2 };
  }
  const raw = corners.map((c) => ({ x: Math.cos(c.angle) * c.radiusX, z: Math.sin(c.angle) * c.radiusZ }));
  const sx = shape.width / (Math.max(...raw.map((p) => p.x)) - Math.min(...raw.map((p) => p.x)));
  const sz = shape.depth! / (Math.max(...raw.map((p) => p.z)) - Math.min(...raw.map((p) => p.z)));
  const scale = 1 + (BEVEL_GEAR_TOP_SCALE - 1) * t;
  return { outline: raw.map((p) => ({ x: p.x * sx * scale, z: p.z * sz * scale })), bore: settings.centerHoleSize / 2 };
}

/** The body's volume as its outline gives it: area times height for a turned ring, a frustum for a bevel gear; less the bore. */
export function outlineVolume(shape: WorkplaneShape) {
  const foot = area(section(shape, 0).outline);
  const top = area(section(shape, shape.height).outline);
  const bore = Math.PI * section(shape, 0).bore ** 2 * shape.height;
  return (shape.height / 3) * (foot + top + Math.sqrt(foot * top)) - bore;
}

/**
 * Which side of the body's surface a point near it stands on: the nearest
 * face, the nearest point on it, and the surface normal there (which points
 * out of the body on a reversed face too). The kernel's ray classifier
 * misread points near a spring's surface, so it is not asked.
 */
export function surfaceSides(solid: ShapeHandle) {
  const faces = cad.getSubShapes(solid, "face").map((face) => ({ face, box: cad.getBoundingBox(face) }));
  return (p: Vec3, reach: number) => {
    const vertex = cad.makeVertex(p[0], p[1], p[2]);
    let nearest: { face: ShapeHandle; distance: number } | undefined;
    for (const { face, box } of faces) {
      if (!(p[0] > box.xmin - reach && p[0] < box.xmax + reach && p[1] > box.ymin - reach && p[1] < box.ymax + reach && p[2] > box.zmin - reach && p[2] < box.zmax + reach)) continue;
      const distance = cad.distanceBetween(face, vertex);
      if (!nearest || distance < nearest.distance) nearest = { face, distance };
    }
    cad.release(vertex);
    expect(nearest).toBeDefined();
    const q = cad.projectPointOnFace(nearest!.face, { x: p[0], y: p[1], z: p[2] });
    const uv = cad.uvFromPoint(nearest!.face, q);
    const normal = cad.surfaceNormal(nearest!.face, uv.u, uv.v);
    return (p[0] - q.x) * normal.x + (p[1] - q.y) * normal.y + (p[2] - q.z) * normal.z < 0;
  };
}

/** Points `offset` either side of the middle of every side of the section, and of the bore, at several heights - and whether each lies inside. */
export function sectionPoints(shape: WorkplaneShape, offset: number) {
  const place = placer(shape);
  const points: Array<{ p: Vec3; inside: boolean }> = [];
  // A herringbone gear turns up to the middle and back: two heights more on the way there and back.
  for (const share of gearSettings(shape).gearType === "herringbone" ? [0.15, 0.3, 0.5, 0.7, 0.85] : [0.15, 0.5, 0.85]) {
    const y = shape.height * share;
    const { outline, bore } = section(shape, y);
    // Outward normal of a side: the outline runs counter-clockwise in x/z, so the outside is to its right.
    outline.forEach((a, index) => {
      const b = outline[(index + 1) % outline.length];
      const length = Math.hypot(b.x - a.x, b.z - a.z);
      const n = { x: (b.z - a.z) / length, z: -(b.x - a.x) / length };
      const m = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
      points.push({ p: place(m.x - n.x * offset, y, m.z - n.z * offset), inside: true });
      points.push({ p: place(m.x + n.x * offset, y, m.z + n.z * offset), inside: false });
    });
    if (bore > 0) {
      for (let k = 0; k < 8; k += 1) {
        const angle = (k / 8) * Math.PI * 2 + 0.1;
        points.push({ p: place(Math.cos(angle) * (bore + offset), y, Math.sin(angle) * (bore + offset)), inside: true });
        points.push({ p: place(Math.cos(angle) * (bore - offset), y, Math.sin(angle) * (bore - offset)), inside: false });
      }
    }
  }
  return points;
}
