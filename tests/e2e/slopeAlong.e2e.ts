import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as THREE from "three";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import type { WorkplaneShape } from "@/types/layerling";
import type { CadModifierProfilePart } from "@/lib/cadModifierTypes";
import { cadModifierProfileForShape, cadProfileExpectation } from "@/lib/cadProfileExtrusion";
import { cadProfileSolidMismatch, profileExtrusionSolid } from "@/lib/cadProfileSolid";
import { cadTransformRequiresGeneralTransform } from "@/lib/cadModifierRuntime";
import { createBooleanHollowCylinderGeometry, createBooleanRoundRoofGeometry } from "@/lib/roundBodyGeometry";
import { createPrismGeometry } from "@/lib/prismGeometry";
import { createRoundedBoxGeometry } from "@/lib/roundedBoxGeometry";
import { transformMesh } from "@/lib/editorMeshCore";
import { narrowCurveForShape, shapeHasNarrow, slopeCurveForShape } from "@/lib/slopeAlong";

/*
 * Slope along: the exact body (a box's side outline pushed across, a round roof's
 * half-ellipse lofted along its length) against the display mesh transformMesh
 * draws, and both against the volume worked out from the top line by hand.
 */

type Vec3 = [number, number, number];

function shape(kind: WorkplaneShape["kind"], extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id: `s-${kind}`, name: kind, kind, x: 0, z: 0, elevation: 0, size: 30, width: 30, depth: 40, height: 20, rotation: 0, color: "#ff8800", ...extra } as WorkplaneShape;
}

function wedgeGeometry(width: number, height: number, depth: number) {
  const w = width / 2;
  const d = depth / 2;
  const v = [[-w, 0, -d], [w, 0, -d], [w, height, -d], [-w, 0, d], [w, 0, d], [w, height, d]];
  const tri = [[0, 2, 1], [3, 4, 5], [0, 1, 4], [0, 4, 3], [1, 2, 5], [1, 5, 4], [0, 3, 5], [0, 5, 2]];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(tri.flat().flatMap((i) => v[i]), 3));
  return geometry;
}

function localMesh(source: WorkplaneShape) {
  const width = source.width ?? 30;
  const depth = source.depth ?? 40;
  const geometry = source.kind === "box" ? new THREE.BoxGeometry(width, source.height, depth)
    : source.kind === "roundRoof" ? createBooleanRoundRoofGeometry(width, source.height, depth, 64)
      : source.kind === "wedge" ? wedgeGeometry(width, source.height, depth)
        : source.kind === "tube" || source.kind === "ring" ? createBooleanHollowCylinderGeometry(width, source.height, depth, source.bevel ?? 4, 256)
          : source.kind === "roundedBox" ? createRoundedBoxGeometry({ width, depth, height: source.height, topBottomFillet: source.topBottomFillet ?? 0 })
            : createPrismGeometry(width, source.height, depth, source.kind === "polygon" ? source.sides ?? 6 : 256);
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  flat.computeBoundingBox();
  const lift = flat.boundingBox?.min.y ?? 0;
  const position = flat.getAttribute("position");
  const vertices: Vec3[] = [];
  for (let i = 0; i < position.count; i += 1) vertices.push([position.getX(i), position.getY(i) - lift, position.getZ(i)]);
  const faces: Array<[number, number, number]> = [];
  for (let i = 0; i + 2 < vertices.length; i += 3) faces.push([i, i + 1, i + 2]);
  return { name: source.kind, vertices, faces };
}

/** The area under the top line, from its Bezier points, independently of slopeTopAt: the integral of y dx over t. */
function areaUnderTop(source: WorkplaneShape) {
  const curve = slopeCurveForShape(source);
  const p0 = { x: 0, y: curve.keep };
  const c = { x: curve.control.s, y: curve.control.y };
  const p2 = { x: curve.length, y: curve.end };
  const steps = 20000;
  let area = 0;
  for (let i = 0; i < steps; i += 1) {
    const t = (i + 0.5) / steps;
    const y = (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * c.y + t * t * p2.y;
    const dx = 2 * (1 - t) * (c.x - p0.x) + 2 * t * (p2.x - c.x);
    area += (y * dx) / steps;
  }
  return area;
}


/** A curve's value at a distance s, from dense samples of its Bezier parameter (independent of slopeTopAt). */
function sampled(p0: { x: number; y: number }, c: { x: number; y: number }, p2: { x: number; y: number }) {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= 4000; i += 1) {
    const t = i / 4000;
    xs.push((1 - t) ** 2 * p0.x + 2 * (1 - t) * t * c.x + t * t * p2.x);
    ys.push((1 - t) ** 2 * p0.y + 2 * (1 - t) * t * c.y + t * t * p2.y);
  }
  return (s: number) => {
    if (s <= xs[0]) return ys[0];
    let k = 1;
    while (k < xs.length - 1 && xs[k] < s) k += 1;
    const f = (s - xs[k - 1]) / Math.max(1e-12, xs[k] - xs[k - 1]);
    return ys[k - 1] + (ys[k] - ys[k - 1]) * Math.min(1, Math.max(0, f));
  };
}

function topOf(source: WorkplaneShape) {
  const c = slopeCurveForShape(source);
  if (!(typeof source.slopeEnd === "number")) return () => source.height;
  return sampled({ x: 0, y: c.keep }, { x: c.control.s, y: c.control.y }, { x: c.length, y: c.end });
}

function halfWidthOf(source: WorkplaneShape) {
  const c = narrowCurveForShape(source);
  if (!(typeof source.narrowEnd === "number")) return () => c.keep;
  const curve = sampled({ x: 0, y: c.keep }, { x: c.control.s, y: c.control.y }, { x: c.length, y: c.end });
  return (s: number) => (s <= c.start ? c.keep : curve(s - c.start));
}

/** The integral of f over [0, length]. */
function integrate(f: (s: number) => number, length: number) {
  const steps = 20000;
  let sum = 0;
  for (let i = 0; i < steps; i += 1) sum += f(((i + 0.5) / steps) * length);
  return (sum * length) / steps;
}

describe("slope along: exact bodies", () => {
  let cad: OcctKernel;

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    cad = await OcctKernel.init({ wasm });
  });

  function body(source: WorkplaneShape) {
    const profile = cadModifierProfileForShape(source);
    expect(profile).not.toBeNull();
    const mesh = transformMesh(localMesh(source), source);
    const expected = cadProfileExpectation(mesh.vertices, mesh.faces);
    const part = { ...(profile as CadModifierProfilePart), expected };
    const local = profileExtrusionSolid(cad, part);
    const t = part.transform;
    const solid = !t ? local : cadTransformRequiresGeneralTransform(t) ? cad.generalTransform(local, t) : cad.transform(local, t);
    expect(cad.isSolid(solid)).toBe(true);
    expect(cad.isValid(solid)).toBe(true);
    return { solid, expected, part };
  }

  function trueBounds(solid: ShapeHandle) {
    const copy = cad.copy(solid);
    const { positions } = cad.tessellate(copy, { linearDeflection: 0.005, angularDeflection: 0.2 });
    cad.release(copy);
    const box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (let i = 0; i < positions.length; i += 3) for (let a = 0; a < 3; a += 1) { box[a] = Math.min(box[a], positions[i + a]); box[a + 3] = Math.max(box[a + 3], positions[i + a]); }
    return box;
  }

  const boxes: Array<[string, Partial<WorkplaneShape>]> = [
    ["down to the back, straight", { slopeEnd: 8, slopeSide: "back" }],
    ["down to the front, straight", { slopeEnd: 8, slopeSide: "front" }],
    ["down to the left, straight", { slopeEnd: 5, slopeSide: "left" }],
    ["down to the right, straight", { slopeEnd: 5, slopeSide: "right" }],
    ["down to the back, bulging up", { slopeEnd: 6, slopeSide: "back", slopeCurve: 0.7 }],
    ["down to the right, sagging", { slopeEnd: 4, slopeSide: "right", slopeCurve: -1 }],
  ];

  it.each(boxes)("builds a box sloping %s: the hand-worked volume, where the mesh stands", (_name, extra) => {
    const source = shape("box", extra);
    const { solid, expected, part } = body(source);
    expect(part.kind).toBe("extrusion");
    expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
    const across = extra.slopeSide === "left" || extra.slopeSide === "right" ? source.depth! : source.width!;
    const exact = areaUnderTop(source) * across;
    expect(Math.abs(cad.getVolume(solid) / exact - 1)).toBeLessThan(1e-6);
    // The mesh's top is drawn from straight pieces close to the curve.
    expect(Math.abs(expected.volume / exact - 1)).toBeLessThan(2e-3);
    trueBounds(solid).forEach((value, index) => expect(Math.abs(value - expected.bounds[index])).toBeLessThan(0.02));
  });

  it("builds a sloping box turned, lifted and mirrored where the mesh stands", () => {
    const source = shape("box", { slopeEnd: 7, slopeSide: "left", slopeCurve: 0.4, x: 12, z: -5, elevation: 3, rotation: 30, rotationX: 15, mirrorZ: true });
    const { solid, expected } = body(source);
    expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
    trueBounds(solid).forEach((value, index) => expect(Math.abs(value - expected.bounds[index])).toBeLessThan(0.05));
  });

  const roofs: Array<[string, Partial<WorkplaneShape>, number]> = [
    ["down to the back, straight", { slopeEnd: 10, slopeSide: "back" }, 1e-6],
    ["down to the front, straight", { slopeEnd: 10, slopeSide: "front" }, 1e-6],
    ["down to the back, bulging up", { slopeEnd: 6, slopeSide: "back", slopeCurve: 0.6 }, 1e-4],
    ["down to the front, sagging", { slopeEnd: 4, slopeSide: "front", slopeCurve: -1 }, 1e-4],
  ];

  it.each(roofs)("builds a round roof sloping %s: its half-ellipse lower along the length", (_name, extra, tolerance) => {
    const source = shape("roundRoof", extra);
    const { solid, expected, part } = body(source);
    expect(part.kind).toBe("loft");
    expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
    // A half-ellipse of half-width r and height h has the area pi r h / 2.
    const exact = (Math.PI * (source.width! / 2) / 2) * areaUnderTop(source);
    expect(Math.abs(cad.getVolume(solid) / exact - 1)).toBeLessThan(tolerance);
    trueBounds(solid).forEach((value, index) => expect(Math.abs(value - expected.bounds[index])).toBeLessThan(0.05));
  });


  const narrowBoxes: Array<[string, Partial<WorkplaneShape>]> = [
    ["to the back, straight, from the wide end", { narrowEnd: 10, narrowSide: "back" }],
    ["to the front, to a point, from the middle", { narrowEnd: 0, narrowSide: "front", narrowStart: 0.5 }],
    ["to the left, bulging out like a bow, from the middle", { narrowEnd: 4, narrowSide: "left", narrowStart: 0.5, narrowCurve: 1 }],
    ["to the right, drawn in", { narrowEnd: 6, narrowSide: "right", narrowCurve: -0.6, narrowStart: 0.2 }],
  ];

  it.each(narrowBoxes)("builds a box narrowing %s: the hand-worked volume, where the mesh stands", (_name, extra) => {
    const source = shape("box", extra);
    const { solid, expected, part } = body(source);
    expect(part.kind).toBe("extrusion");
    expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
    const c = narrowCurveForShape(source);
    const exact = integrate((s) => 2 * halfWidthOf(source)(s), c.total) * source.height;
    expect(Math.abs(cad.getVolume(solid) / exact - 1)).toBeLessThan(1e-4);
    expect(Math.abs(expected.volume / exact - 1)).toBeLessThan(3e-3);
    trueBounds(solid).forEach((value, index) => expect(Math.abs(value - expected.bounds[index])).toBeLessThan(0.05));
  });

  const narrowRoofs: Array<[string, Partial<WorkplaneShape>, number]> = [
    ["narrowing to the back, straight", { narrowEnd: 12, narrowSide: "back" }, 1e-4],
    ["narrowing to the front like a bow, from the middle", { narrowEnd: 2, narrowSide: "front", narrowStart: 0.5, narrowCurve: 1 }, 1e-4],
    ["narrowing and sloping to the back together", { narrowEnd: 10, narrowSide: "back", slopeEnd: 8, slopeSide: "back" }, 1e-4],
    ["narrowing to the front from a third while sloping to the back, curved", { narrowEnd: 8, narrowSide: "front", narrowStart: 0.33, narrowCurve: -0.5, slopeEnd: 9, slopeSide: "back", slopeCurve: 0.5 }, 1e-4],
  ];

  it.each(narrowRoofs)("builds a round roof %s: half-ellipses as wide and high as the lines say", (_name, extra, tolerance) => {
    const source = shape("roundRoof", extra);
    const { solid, expected, part } = body(source);
    expect(part.kind).toBe("loft");
    expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
    const depth = source.depth!;
    const top = topOf(source);
    const half = halfWidthOf(source);
    // Measured from the front: a back side keeps the front end, a front side the back end.
    const fromKept = (side: unknown, z: number) => (side === "front" ? depth - z : z);
    const exact = integrate((z) => (Math.PI / 2) * half(fromKept(source.narrowSide ?? "back", z)) * top(fromKept(source.slopeSide ?? "back", z)), depth);
    expect(Math.abs(cad.getVolume(solid) / exact - 1)).toBeLessThan(tolerance);
    trueBounds(solid).forEach((value, index) => expect(Math.abs(value - expected.bounds[index])).toBeLessThan(0.05));
  });


  const uprights: Array<[string, WorkplaneShape, (z: number) => number]> = [
    // [name, shape, its footprint's width across at z (mm from the middle along the slope's axis)]
    ["a cylinder cut down to the back, straight", shape("cylinder", { width: 30, depth: 30, slopeEnd: 8, slopeSide: "back" }), (z) => 2 * Math.sqrt(Math.max(0, 225 - z * z))],
    ["an ellipse sloping to the right, bulging", shape("ellipse", { width: 40, depth: 24, slopeEnd: 6, slopeSide: "right", slopeCurve: 0.8 }), (x) => 2 * 12 * Math.sqrt(Math.max(0, 1 - (x / 20) ** 2))],
    ["a tube cut slanting like a mitre", shape("tube", { width: 30, depth: 30, bevel: 3, slopeEnd: 5, slopeSide: "front" }), (z) => 2 * Math.sqrt(Math.max(0, 225 - z * z)) - 2 * Math.sqrt(Math.max(0, 144 - z * z))],
  ];

  it.each(uprights)("builds %s: its plain body trimmed, the hand-worked volume", (_name, source, chord) => {
    const { solid, expected, part } = body(source);
    expect(part.kind).toBe("extrusion");
    expect(part.trim).toBeTruthy();
    expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
    const length = source.slopeSide === "left" || source.slopeSide === "right" ? source.width! : source.depth!;
    const top = topOf(source);
    const exact = integrate((s) => chord(s - length / 2) * top(s), length);
    expect(Math.abs(cad.getVolume(solid) / exact - 1)).toBeLessThan(1e-4);
    trueBounds(solid).forEach((value, index) => expect(Math.abs(value - expected.bounds[index])).toBeLessThan(0.05));
  });

  it("builds a sloping hexagon and a rounded box with straight ends where their meshes stand", () => {
    for (const source of [shape("polygon", { sides: 6, slopeEnd: 7, slopeSide: "left", slopeCurve: -0.5 }), shape("roundedBox", { topBottomFillet: 0, slopeEnd: 9, slopeSide: "back" })]) {
      const { solid, expected } = body(source);
      expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
      expect(Math.abs(cad.getVolume(solid) / expected.volume - 1)).toBeLessThan(2e-3);
    }
  });

  it.each([
    ["sloping to the back", { slopeEnd: 6, slopeSide: "back" as const }],
    ["narrowing to the front from the middle, bulging", { narrowEnd: 6, narrowSide: "front" as const, narrowStart: 0.5, narrowCurve: 0.7 }],
    ["sloping and narrowing to the back together", { slopeEnd: 8, slopeSide: "back" as const, narrowEnd: 10, narrowSide: "back" as const }],
  ])("builds a wedge %s: its triangle as wide and high as the lines say", (_name, extra) => {
    const source = shape("wedge", extra);
    const { solid, expected, part } = body(source);
    expect(part.kind).toBe("loft");
    expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
    const depth = source.depth!;
    const top = topOf(source);
    const half = halfWidthOf(source);
    const fromKept = (side: unknown, z: number) => (side === "front" ? depth - z : z);
    const exact = integrate((z) => (half(fromKept(source.narrowSide ?? "back", z)) * top(fromKept(source.slopeSide ?? "back", z))), depth);
    expect(Math.abs(cad.getVolume(solid) / exact - 1)).toBeLessThan(1e-4);
  });

  it("leaves a narrowing cylinder on its display mesh, the mesh the hand-worked volume", () => {
    const source = shape("cylinder", { width: 30, depth: 30, narrowEnd: 10, narrowSide: "back" });
    expect(cadModifierProfileForShape(source)).toBeNull();
    const mesh = transformMesh(localMesh(source), source);
    const half = halfWidthOf(source);
    const exact = source.height * integrate((s) => 2 * Math.sqrt(Math.max(0, 225 - (15 - s) ** 2)) * (half(s) / 15), 30);
    expect(Math.abs(cadProfileExpectation(mesh.vertices, mesh.faces).volume / exact - 1)).toBeLessThan(3e-3);
  });

  it("does not narrow a tube or a ring", () => {
    expect(shapeHasNarrow(shape("tube", { width: 30, depth: 30, narrowEnd: 10 }))).toBe(false);
    expect(shapeHasNarrow(shape("ring", { width: 30, depth: 30, narrowEnd: 10 }))).toBe(false);
  });

  it("leaves a slope with a taper on the display mesh, and a box without one to its primitive", () => {
    expect(cadModifierProfileForShape(shape("box", { slopeEnd: 8, taperTopWidth: 20 }))).toBeNull();
    expect(cadModifierProfileForShape(shape("box", { slopeEnd: 20 }))).toBeNull();
    expect(cadModifierProfileForShape(shape("box", { slopeEnd: 8, narrowEnd: 10 }))).toBeNull();
  });
});
