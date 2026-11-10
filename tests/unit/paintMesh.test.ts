import manifoldModule from "manifold-3d";
import * as THREE from "three";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { meshForShape, type MeshData } from "@/lib/editorMeshCore";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { DEFAULT_PAINT_TOOL, normalizePaintStroke, normalizePaintStrokes, normalizePaintTool, paintColors, canPaintShape, thinnedOutline, type PaintStroke } from "@/lib/paint";
import {
  clearPaintedMeshCache,
  closeSeams,
  meshIsClosed,
  paintBaseMesh,
  paintBodyMatrix,
  paintedBodyMesh,
  paintedWorldMesh,
  paintLassoStroke,
  paintMeshWithStrokes,
  paintStrokeAt,
  PAINT_VIEW_SIDES,
  paintSideLasso,
  paintSurfaceNormalAt,
  rebasePaintStrokes,
  type PaintedMesh,
} from "@/lib/paintMesh";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * Paint (paint.ts, paintMesh.ts): strokes laid onto a body's mesh. A fill spreads over the faces up to a sharp edge;
 * a circle and a lasso are cut into the mesh, so their edges are edges of the mesh, and the mesh stays closed. The
 * strokes live in the body's own frame and stretch with it.
 */

let kernel: Awaited<ReturnType<typeof manifoldModule>>;

beforeAll(async () => {
  kernel = await manifoldModule();
  kernel.setup();
  rememberManifoldRuntime(kernel);
});

beforeEach(() => clearPaintedMeshCache());

const RED = "#e03131";
const GREEN = "#2f9e44";

const asset = (kind: string) => toolbarShapeAssets.find((entry) => entry.kind === kind)!;

function body(kind: string, patch: Partial<WorkplaneShape> = {}): WorkplaneShape {
  const made = makeShapeFromAsset({ ...asset(kind), name: kind }, { x: 0, z: 0, elevation: 0 }, { width: 20, depth: 20, height: 20 });
  return { ...made, id: `paint-${kind}`, width: 20, depth: 20, height: 20, size: 20, color: "#4dabf7", ...patch } as WorkplaneShape;
}

function areaOf(painted: PaintedMesh, which: (color: string | null, face: number) => boolean) {
  let area = 0;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  painted.faces.forEach(([i, j, k], face) => {
    if (!which(painted.colors[face], face)) return;
    a.fromArray(painted.vertices[i]);
    b.fromArray(painted.vertices[j]);
    c.fromArray(painted.vertices[k]);
    area += new THREE.Triangle(a, b, c).getArea();
  });
  return area;
}

function normalOf(painted: PaintedMesh, face: number) {
  const [i, j, k] = painted.faces[face];
  return new THREE.Triangle(new THREE.Vector3(...painted.vertices[i]), new THREE.Vector3(...painted.vertices[j]), new THREE.Vector3(...painted.vertices[k])).getNormal(new THREE.Vector3());
}

const stroke = (patch: Partial<PaintStroke>) => normalizePaintStroke({ mode: "fill", color: RED, size: [20, 20, 20], point: [0, 20, 0], normal: [0, 1, 0], ...patch })!;

describe("paint strokes as they are kept", () => {
  it("keeps the panel's settings inside what the tool offers", () => {
    expect(normalizePaintTool({})).toEqual(DEFAULT_PAINT_TOOL);
    expect(normalizePaintTool({ mode: "lasso", angle: 400, diameter: -3, color: "#ABC", erase: true })).toEqual({ mode: "lasso", angle: 90, diameter: 0.2, color: "#aabbcc", erase: true });
    expect(normalizePaintTool({ mode: "brush" as never, color: "red" }).mode).toBe("fill");
  });

  it("refuses what cannot be a stroke and rounds what can", () => {
    expect(normalizePaintStroke(null)).toBeNull();
    expect(normalizePaintStroke({ mode: "spray", size: [1, 1, 1], point: [0, 0, 0], normal: [0, 1, 0] })).toBeNull();
    expect(normalizePaintStroke({ mode: "fill", size: [0, 1, 1], point: [0, 0, 0], normal: [0, 1, 0] })).toBeNull();
    expect(normalizePaintStroke({ mode: "fill", size: [1, 1, 1], point: [0, 0, 0], normal: [0, 0, 0] })).toBeNull();
    expect(normalizePaintStroke({ mode: "circle", color: "blue", size: [1, 1, 1], point: [0, 0, 0], normal: [0, 1, 0] })).toBeNull();
    expect(normalizePaintStroke({ mode: "lasso", size: [1, 1, 1], origin: [0, 0, 0], right: [1, 0, 0], up: [0, 1, 0], forward: [0, 0, 1], outline: [[0, 0], [1, 0]] })).toBeNull();
    const fill = normalizePaintStroke({ mode: "fill", size: [10, 10, 10], point: [1.234567, 10, 0], normal: [0, 2, 0], angle: 200 })!;
    expect(fill).toEqual({ mode: "fill", size: [10, 10, 10], point: [1.2346, 10, 0], normal: [0, 1, 0], angle: 90 });
    expect(fill.color).toBeUndefined();
    const circle = normalizePaintStroke({ mode: "circle", color: "#00FF00", size: [10, 10, 10], point: [0, 10, 0], normal: [0, 1, 0] })!;
    expect(circle.color).toBe("#00ff00");
    expect(circle.diameter).toBe(10);
  });

  it("keeps the last strokes when there are too many, and thins a long lasso", () => {
    const strokes = Array.from({ length: 520 }, (_, index) => ({ mode: "fill", size: [1, 1, 1], point: [index, 0, 0], normal: [0, 1, 0] }));
    const kept = normalizePaintStrokes([...strokes, { mode: "nothing" }]);
    expect(kept).toHaveLength(500);
    expect(kept[0].point![0]).toBe(20);
    expect(thinnedOutline(Array.from({ length: 1000 }, (_, index) => [index, 0] as [number, number]))).toHaveLength(400);
  });

  it("paints single solid bodies only and names the colours used", () => {
    expect(canPaintShape(body("box"))).toBe(true);
    expect(canPaintShape(body("box", { hole: true }))).toBe(false);
    expect(canPaintShape(body("box", { groupedShapes: [body("box")] }))).toBe(false);
    // A group cut into one body is one body to paint, unless it shows its parts' colours; a bundle's parts are painted on their own.
    const cut = { kind: "mesh", importedMesh: { positions: [], baseWidth: 1, baseHeight: 1, baseDepth: 1, triangleCount: 0, sourceFormat: "json" } } as Partial<WorkplaneShape>;
    expect(canPaintShape(body("box", { ...cut, groupedShapes: [body("box")] }))).toBe(true);
    expect(canPaintShape(body("box", { ...cut, groupedShapes: [body("box")], multicolor: true }))).toBe(false);
    expect(canPaintShape(body("box", { ...cut, groupedShapes: [body("box")], groupOperation: "bundle" }))).toBe(false);
    expect(paintColors({ paint: [stroke({ color: GREEN }), stroke({}), stroke({ color: undefined }), stroke({ color: GREEN })] })).toEqual([GREEN, RED]);
  });
});

describe("laying strokes onto a mesh", () => {
  it("fills a box's top face up to its edges, and the whole box at 90°", () => {
    const box = body("box");
    const mesh = paintBaseMesh(box);
    const top = paintMeshWithStrokes(kernel, mesh, [stroke({ point: [3, 20, 2], normal: [0, 1, 0], angle: 30 })], [20, 20, 20]);
    expect(areaOf(top, (color) => color === RED)).toBeCloseTo(400, 6);
    top.faces.forEach((_, face) => expect(top.colors[face] === RED).toBe(normalOf(top, face).y > 0.99));
    const all = paintMeshWithStrokes(kernel, mesh, [stroke({ point: [3, 20, 2], normal: [0, 1, 0], angle: 90 })], [20, 20, 20]);
    expect(all.colors.every((color) => color === RED)).toBe(true);
  });

  it("fills a cylinder's round wall in one go and stops at its rims", () => {
    const cylinder = body("cylinder", { sides: 64 });
    const painted = paintMeshWithStrokes(kernel, paintBaseMesh(cylinder), [stroke({ point: [10, 10, 0], normal: [1, 0, 0] })], [20, 20, 20]);
    const wall = areaOf(painted, (color) => color === RED);
    // A 64-sided prism of radius 10 and height 20: 64 sides of 2 * 10 * sin(pi / 64) by 20.
    expect(wall).toBeCloseTo(64 * 2 * 10 * Math.sin(Math.PI / 64) * 20, 3);
    painted.faces.forEach((_, face) => {
      if (painted.colors[face] === RED) expect(Math.abs(normalOf(painted, face).y)).toBeLessThan(1e-6);
    });
  });

  it("cuts a circle into a box face of two triangles, closed, with nothing on the back", () => {
    const painted = paintMeshWithStrokes(kernel, paintBaseMesh(body("box")), [stroke({ mode: "circle", point: [2, 20, -1], normal: [0, 1, 0], diameter: 8 })], [20, 20, 20]);
    expect(painted.cut).toBe(true);
    expect(meshIsClosed(painted.faces, painted.vertices.length)).toBe(true);
    // A polygon of many sides round a circle of radius 4, all on the top face.
    const area = areaOf(painted, (color) => color === RED);
    expect(area).toBeGreaterThan(Math.PI * 16 * 0.99);
    expect(area).toBeLessThan(Math.PI * 16 * 1.0001);
    painted.faces.forEach(([i, j, k], face) => {
      if (painted.colors[face] !== RED) return;
      expect(normalOf(painted, face).y).toBeGreaterThan(0.99);
      [i, j, k].forEach((corner) => expect(Math.hypot(painted.vertices[corner][0] - 2, painted.vertices[corner][2] + 1)).toBeLessThan(4 + 1e-4));
    });
    // The surface is the box's surface still: the same area all round.
    expect(areaOf(painted, () => true)).toBeCloseTo(6 * 400, 2);
  });

  it("stops a circle at the box's edge instead of running down the side face", () => {
    const painted = paintMeshWithStrokes(kernel, paintBaseMesh(body("box")), [stroke({ mode: "circle", point: [9, 20, 0], normal: [0, 1, 0], diameter: 8 })], [20, 20, 20]);
    expect(meshIsClosed(painted.faces, painted.vertices.length)).toBe(true);
    painted.faces.forEach((_, face) => {
      if (painted.colors[face] === RED) expect(normalOf(painted, face).y).toBeGreaterThan(0.99);
    });
    // Half of the circle less what lies over the edge: the segment from x = 5 to x = 10 of a circle round x = 9.
    const segment = 16 * Math.acos(-0.25) + 4 * 0.25 * Math.sqrt(1 - 0.0625) * 4;
    expect(areaOf(painted, (color) => color === RED)).toBeCloseTo(segment, 0);
  });

  it("lays a circle onto a cylinder's wall on the side clicked only", () => {
    const painted = paintMeshWithStrokes(kernel, paintBaseMesh(body("cylinder", { sides: 96 })), [stroke({ mode: "circle", point: [10, 10, 0], normal: [1, 0, 0], diameter: 6 })], [20, 20, 20]);
    expect(meshIsClosed(painted.faces, painted.vertices.length)).toBe(true);
    let count = 0;
    painted.faces.forEach((_, face) => {
      if (painted.colors[face] !== RED) return;
      count += 1;
      expect(normalOf(painted, face).x).toBeGreaterThan(0.8);
    });
    expect(count).toBeGreaterThan(10);
  });

  it("erases a smaller circle out of a larger one: a ring", () => {
    const painted = paintMeshWithStrokes(kernel, paintBaseMesh(body("box")), [
      stroke({ mode: "circle", point: [0, 20, 0], normal: [0, 1, 0], diameter: 16 }),
      stroke({ mode: "circle", color: undefined, point: [0, 20, 0], normal: [0, 1, 0], diameter: 8 }),
    ], [20, 20, 20]);
    expect(meshIsClosed(painted.faces, painted.vertices.length)).toBe(true);
    expect(areaOf(painted, (color) => color === RED)).toBeCloseTo(Math.PI * (64 - 16), 0);
  });

  it("paints what a flat view saw inside a lasso, not the back", () => {
    // Looking straight down on the box, a square 6 mm across round its middle.
    const lasso = normalizePaintStroke({
      mode: "lasso", color: GREEN, size: [20, 20, 20], origin: [0, 100, 0], right: [1, 0, 0], up: [0, 0, -1], forward: [0, -1, 0], perspective: false,
      outline: [[-3, -3], [3, -3], [3, 3], [-3, 3]],
    })!;
    const painted = paintMeshWithStrokes(kernel, paintBaseMesh(body("box")), [lasso], [20, 20, 20]);
    expect(meshIsClosed(painted.faces, painted.vertices.length)).toBe(true);
    expect(areaOf(painted, (color) => color === GREEN)).toBeCloseTo(36, 3);
    painted.faces.forEach((_, face) => {
      if (painted.colors[face] === GREEN) expect(normalOf(painted, face).y).toBeGreaterThan(0.99);
    });
  });

  it("leaves out what the body hides from the eye, though it faces it: the inside of a tube behind its front wall", () => {
    const tube = body("tube");
    const mesh = paintBaseMesh(tube);
    const radius = (face: number, painted: PaintedMesh) => {
      const [i, j, k] = painted.faces[face];
      const x = (painted.vertices[i][0] + painted.vertices[j][0] + painted.vertices[k][0]) / 3;
      const z = (painted.vertices[i][2] + painted.vertices[j][2] + painted.vertices[k][2]) / 3;
      return Math.hypot(x, z);
    };
    // Seen flat from the front, a lasso round the whole tube.
    const lasso = normalizePaintStroke({
      mode: "lasso", color: GREEN, size: [20, 20, 20], origin: [0, 10, 100], right: [1, 0, 0], up: [0, 1, 0], forward: [0, 0, -1], perspective: false,
      outline: [[-15, -15], [15, -15], [15, 15], [-15, 15]],
    })!;
    const painted = paintMeshWithStrokes(kernel, mesh, [lasso], [20, 20, 20]);
    let outside = 0;
    painted.faces.forEach((_, face) => {
      if (painted.colors[face] !== GREEN) return;
      // Only the front of the outer wall: the inner wall behind it faces the eye too, but the front wall hides it.
      expect(radius(face, painted)).toBeGreaterThan(9.5);
      expect(normalOf(painted, face).z).toBeGreaterThan(0);
      outside += 1;
    });
    expect(outside).toBeGreaterThan(20);
  });

  it("paints what an eye in perspective saw inside a lasso, the side face it saw too", () => {
    // The eye up and to the right of the box: inside a wide lasso it sees the top and the +x side, not the others.
    const eye = new THREE.Vector3(60, 60, 0);
    const forward = new THREE.Vector3(0, 10, 0).sub(eye).normalize();
    const right = new THREE.Vector3(0, 0, -1);
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();
    const lasso = normalizePaintStroke({
      mode: "lasso", color: GREEN, size: [20, 20, 20], origin: eye.toArray(), right: right.toArray(), up: up.toArray(), forward: forward.toArray(), perspective: true,
      outline: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]],
    })!;
    const painted = paintMeshWithStrokes(kernel, paintBaseMesh(body("box")), [lasso], [20, 20, 20]);
    expect(meshIsClosed(painted.faces, painted.vertices.length)).toBe(true);
    expect(areaOf(painted, (color, face) => color === GREEN && normalOf(painted, face).y > 0.99)).toBeCloseTo(400, 3);
    expect(areaOf(painted, (color, face) => color === GREEN && normalOf(painted, face).x > 0.99)).toBeCloseTo(400, 3);
    expect(areaOf(painted, (color) => color === GREEN)).toBeCloseTo(800, 3);
  });

  it("stretches the strokes with the body", () => {
    const circle = stroke({ mode: "circle", point: [0, 20, 0], normal: [0, 1, 0], diameter: 8 });
    const larger = body("box", { width: 40, depth: 40, height: 40, size: 40 });
    const painted = paintMeshWithStrokes(kernel, paintBaseMesh(larger), [circle], [40, 40, 40]);
    expect(meshIsClosed(painted.faces, painted.vertices.length)).toBe(true);
    // Twice the size: four times the area.
    expect(areaOf(painted, (color) => color === RED)).toBeGreaterThan(Math.PI * 64 * 0.99);
    expect(areaOf(painted, (color) => color === RED)).toBeLessThan(Math.PI * 64 * 1.0001);
    painted.faces.forEach((_, face) => {
      if (painted.colors[face] === RED) expect(normalOf(painted, face).y).toBeGreaterThan(0.99);
    });
  });

  it("skips a stroke that no longer finds the surface, and lays the others", () => {
    const painted = paintMeshWithStrokes(kernel, paintBaseMesh(body("box")), [
      stroke({ point: [0, 45, 0], normal: [0, 1, 0] }),
      stroke({ mode: "circle", point: [0, 80, 0], normal: [1, 0, 0], diameter: 2 }),
      stroke({ color: GREEN, point: [0, 0, 0], normal: [0, -1, 0] }),
    ], [20, 20, 20]);
    expect(painted.skipped).toBe(2);
    expect(areaOf(painted, (color) => color === GREEN)).toBeCloseTo(400, 6);
  });

  it("colours whole faces by their middles without the kernel, and leaves the mesh as it was", () => {
    const mesh = paintBaseMesh(body("box"));
    const painted = paintMeshWithStrokes(null, mesh, [stroke({ mode: "circle", point: [0, 20, 0], normal: [0, 1, 0], diameter: 30 })], [20, 20, 20]);
    expect(painted.cut).toBe(false);
    expect(painted.faces).toHaveLength(12);
    expect(areaOf(painted, (color) => color === RED)).toBeCloseTo(400, 6);
  });

  it("colours whole faces of a mesh that is not closed, without cutting it", () => {
    const mesh = paintBaseMesh(body("box"));
    const open: MeshData = { ...mesh, faces: mesh.faces.slice(2) };
    const painted = paintMeshWithStrokes(kernel, open, [stroke({ mode: "circle", point: [0, 20, 0], normal: [0, 1, 0], diameter: 30 })], [20, 20, 20]);
    expect(painted.cut).toBe(false);
    expect(painted.faces).toHaveLength(10);
  });
});

describe("closing the seams of a cut", () => {
  it("splits the face along an edge that the other side has a corner on", () => {
    // A square of two triangles below, and above it a single triangle whose bottom edge the square's top corner splits.
    const positions = [0, 0, 0, 2, 0, 0, 1, 1, 0, 0, 1, 0, 2, 1, 0, 1, 2, 0];
    // Below: (0,0)-(2,0)-(1,1) and the two halves (0,0)-(1,1)-(0,1), (2,0)-(2,1)-(1,1); above: (0,1)-(2,1)-(1,2) misses the corner (1,1).
    const faces = [0, 1, 2, 0, 2, 3, 1, 4, 2, 3, 2, 5, 2, 4, 5];
    const closed = closeSeams(positions, faces);
    expect(closed.faces.length).toBe(faces.length);
    const tJunction = [0, 1, 2, 0, 2, 3, 1, 4, 2, 3, 4, 5];
    const fixed = closeSeams(positions, tJunction);
    // The top triangle is split at (1,1) into two.
    expect(fixed.faces.length / 3).toBe(5);
    expect(fixed.source).toEqual([0, 1, 2, 3, 3]);
  });

  it("welds corners that differ by a rounding only", () => {
    const tetrahedron = [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1];
    const faces = [0, 2, 1, 0, 1, 3, 0, 3, 2, 1, 2, 3];
    // The same corners again with a hair added, for the faces of the second half.
    const positions = [...tetrahedron, ...tetrahedron.map((value) => value + 3e-5)];
    const split = [0, 2, 1, 0, 1, 3, 4 + 0, 4 + 3, 4 + 2, 4 + 1, 4 + 2, 4 + 3];
    expect(meshIsClosed(split)).toBe(false);
    const closed = closeSeams(positions, split);
    expect(closed.closed).toBe(true);
    expect(closed.positions.length / 3).toBe(4);
  });

  it("stays closed under many circles and lassos laid across a cylinder and a box with a hole", () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const cylinder = paintBaseMesh(body("cylinder", { sides: 48 }));
    const strokes: PaintStroke[] = [];
    for (let index = 0; index < 12; index += 1) {
      const angle = random() * Math.PI * 2;
      const normal: [number, number, number] = [Math.cos(angle), 0, Math.sin(angle)];
      strokes.push(stroke({ mode: "circle", color: index % 3 ? RED : undefined, point: [normal[0] * 10, 2 + random() * 16, normal[2] * 10], normal, diameter: 1 + random() * 8 }));
    }
    strokes.push(normalizePaintStroke({
      mode: "lasso", color: GREEN, size: [20, 20, 20], origin: [0, 10, 80], right: [1, 0, 0], up: [0, 1, 0], forward: [0, 0, -1], perspective: false,
      outline: Array.from({ length: 9 }, () => [random() * 24 - 12, random() * 24 - 12] as [number, number]),
    })!);
    const painted = paintMeshWithStrokes(kernel, cylinder, strokes, [20, 20, 20]);
    expect(painted.cut).toBe(true);
    expect(meshIsClosed(painted.faces, painted.vertices.length)).toBe(true);
    expect(painted.colors.some((color) => color === RED)).toBe(true);
    expect(painted.colors.some((color) => color === GREEN)).toBe(true);
  });
});

describe("a painted body in the editor's frame and in the world", () => {
  it("makes a stroke from a click in the world on a moved, turned body, back in the body's own frame", () => {
    const box = body("box", { x: 30, z: -12, elevation: 5, rotation: 90 });
    // The top of the turned box at its middle, 5 mm towards the world's +x: turned by 90°, that is the body's own +z.
    const made = paintStrokeAt(box, { x: 35, y: 25, z: -12 }, { x: 0, y: 1, z: 0 }, { ...DEFAULT_PAINT_TOOL, mode: "circle", diameter: 6 })!;
    expect(made.mode).toBe("circle");
    expect(made.point![0]).toBeCloseTo(0, 6);
    expect(made.point![1]).toBeCloseTo(20, 6);
    expect(made.point![2]).toBeCloseTo(5, 6);
    expect(made.normal).toEqual([0, 1, 0]);
    expect(made.size).toEqual([20, 20, 20]);
    expect(made.color).toBe(DEFAULT_PAINT_TOOL.color);
    expect(paintStrokeAt(box, { x: 35, y: 25, z: -12 }, { x: 0, y: 1, z: 0 }, { ...DEFAULT_PAINT_TOOL, erase: true })!.color).toBeUndefined();
  });

  it("makes a lasso stroke from a view in the world", () => {
    const box = body("box", { x: 10, rotation: 180 });
    const made = paintLassoStroke(box, { origin: { x: 10, y: 100, z: 0 }, right: { x: 1, y: 0, z: 0 }, up: { x: 0, y: 0, z: -1 }, forward: { x: 0, y: -1, z: 0 }, perspective: false }, [[-1, -1], [1, -1], [0, 1]], DEFAULT_PAINT_TOOL)!;
    expect(made.origin![0]).toBeCloseTo(0, 6);
    expect(made.origin![1]).toBeCloseTo(100, 6);
    expect(made.right![0]).toBeCloseTo(-1, 6);
    expect(made.up![2]).toBeCloseTo(1, 6);
    expect(made.outline).toEqual([[-1, -1], [1, -1], [0, 1]]);
  });

  it("places the painted mesh where the body stands, and gives the unpainted faces the body's colour", () => {
    const box = body("box", { x: 30, z: -12, elevation: 5, rotation: 30, paint: [stroke({ point: [0, 20, 0], normal: [0, 1, 0] })] });
    const world = paintedWorldMesh(box)!;
    const plain = meshForShape(box);
    const bounds = (vertices: number[][]) => new THREE.Box3().setFromPoints(vertices.map((vertex) => new THREE.Vector3(...vertex)));
    expect(bounds(world.mesh.vertices).min.distanceTo(bounds(plain.vertices).min)).toBeLessThan(1e-4);
    expect(bounds(world.mesh.vertices).max.distanceTo(bounds(plain.vertices).max)).toBeLessThan(1e-4);
    expect(world.faceColors.filter((color) => color === RED)).toHaveLength(2);
    expect(world.faceColors.filter((color) => color === "#4dabf7")).toHaveLength(10);
    // The top faces are the painted ones in the world too.
    world.mesh.faces.forEach(([a, b, c], face) => {
      const normal = new THREE.Triangle(new THREE.Vector3(...world.mesh.vertices[a]), new THREE.Vector3(...world.mesh.vertices[b]), new THREE.Vector3(...world.mesh.vertices[c])).getNormal(new THREE.Vector3());
      expect(world.faceColors[face] === RED).toBe(normal.y > 0.99);
    });
  });

  it("keeps the faces turned outwards on a mirrored body", () => {
    const box = body("box", { mirrorX: true, paint: [stroke({ point: [0, 20, 0], normal: [0, 1, 0] })] });
    const world = paintedWorldMesh(box)!;
    const volume = world.mesh.faces.reduce((sum, [a, b, c]) => sum + new THREE.Vector3(...world.mesh.vertices[a]).dot(new THREE.Vector3(...world.mesh.vertices[b]).cross(new THREE.Vector3(...world.mesh.vertices[c]))) / 6, 0);
    expect(volume).toBeCloseTo(8000, 3);
  });

  it("keeps the painted mesh while the body only moves, and has none for a body without paint", () => {
    const box = body("box", { paint: [stroke({ mode: "circle", point: [0, 20, 0], normal: [0, 1, 0], diameter: 6 })] });
    const first = paintedBodyMesh(box);
    expect(paintedBodyMesh({ ...box, x: 40, rotation: 45 })).toBe(first);
    expect(paintedBodyMesh({ ...box, width: 30 })).not.toBe(first);
    expect(paintedBodyMesh(body("box"))).toBeNull();
    expect(paintedWorldMesh(body("box", { paint: [stroke({ color: undefined })] }))).toBeNull();
  });

  it("moves the strokes into the frame of a body built anew, where they lay in the world", () => {
    // A group cut into one body and built again stands on another middle: the strokes stay where they were painted.
    const before = body("box", { x: 10, z: 0, rotation: 90 });
    const after = body("box", { x: 13, z: -2, width: 26, size: 26, rotation: 0 });
    const [moved] = rebasePaintStrokes([stroke({ mode: "circle", point: [5, 10, 10], normal: [0, 0, 1], diameter: 4 })], before, after);
    const world = new THREE.Vector3(5, 10, 10).applyMatrix4(paintBodyMatrix(before));
    const again = new THREE.Vector3(...moved.point!).applyMatrix4(paintBodyMatrix(after));
    expect(again.distanceTo(world)).toBeLessThan(1e-3);
    // Turned by 90° before, the front normal pointed along the world's +x; the new body is not turned.
    expect(moved.normal![0]).toBeCloseTo(1, 5);
    expect(moved.size).toEqual([26, 20, 20]);
    expect(moved.diameter).toBe(4);
  });

  it("takes a lasso drawn in a flat view from a side and a stroke given only a point, as the MCP tool does", () => {
    const box = body("box", { x: 20, z: 5, rotation: 90 });
    // From the right, [z, height]: a square round the middle of the right side, which is the box's own front, turned.
    const { view, outline } = paintSideLasso("right", [[2, 7], [8, 7], [8, 13], [2, 13]]);
    expect(outline).toEqual([[-2, 7], [-8, 7], [-8, 13], [-2, 13]]);
    const lasso = paintLassoStroke(box, view, outline, { ...DEFAULT_PAINT_TOOL, color: GREEN })!;
    const painted = paintedWorldMesh({ ...box, paint: [lasso] })!;
    const green = painted.mesh.faces.filter((_, face) => painted.faceColors[face] === GREEN);
    expect(green.length).toBeGreaterThan(0);
    green.forEach(([a, b, c]) => {
      const normal = new THREE.Triangle(new THREE.Vector3(...painted.mesh.vertices[a]), new THREE.Vector3(...painted.mesh.vertices[b]), new THREE.Vector3(...painted.mesh.vertices[c])).getNormal(new THREE.Vector3());
      expect(normal.x).toBeGreaterThan(0.99);
    });
    expect(paintSurfaceNormalAt(box, { x: 30, y: 10, z: 5 })!.x).toBeCloseTo(1, 6);
    expect(paintSurfaceNormalAt(box, { x: 20, y: 20, z: 5 })!.y).toBeCloseTo(1, 6);
    expect(paintSurfaceNormalAt(box, { x: 20, y: 60, z: 5 })).toBeNull();
    expect(PAINT_VIEW_SIDES).toHaveLength(6);
  });

  it("frames the body as the 3D view does: standing on its elevation, turned about its middle", () => {
    const box = body("box", { x: 5, z: 6, elevation: 7, rotationX: 90 });
    const bottomMiddle = new THREE.Vector3(0, 0, 0).applyMatrix4(paintBodyMatrix(box));
    // Tipped by 90° about x round the middle of its height (17 mm up): the bottom's middle comes to the front.
    expect(bottomMiddle.x).toBeCloseTo(5, 6);
    expect(bottomMiddle.y).toBeCloseTo(17, 6);
    expect(bottomMiddle.z).toBeCloseTo(-4, 6);
  });
});
