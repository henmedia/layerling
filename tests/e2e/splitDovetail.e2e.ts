import { beforeAll, describe, expect, it, vi } from "vitest";
import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import type { WorkplaneShape } from "@/types/layerling";
import { groupedShape, previewSplitConnectors, splitShapeByPlane, splitShapesByPlane, withConnectorsNote } from "@/lib/editorBooleans";
import { meshForShape } from "@/lib/editorMeshCore";
import { setLanguage } from "@/lib/i18n";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import type { ManifoldSolid } from "@/lib/manifoldSplit";
import { modelSplitPlane } from "@/lib/modelSplit";
import { dovetailGrooveDepth, dovetailTopWidth, normalizeSplitConnectorOptions, SPLIT_CONNECTOR_DEFAULTS, splitPlaneFrame, type SplitConnectorOptions } from "@/lib/splitConnectors";

/*
 * Split's dovetail with the real kernel (Discussion #832): the halves come out closed, the tongue stands on the minus half
 * and its groove runs through the plus half; put together as they were cut they do not touch, they slide apart along the
 * tongue without touching, and they cannot be pulled apart across the cut or shifted sideways by more than the play. For
 * a box, a cylinder, a cone narrowing above the cut, a mesh body, a tilted plane and a cut through two legs.
 */
const kernel = vi.hoisted(() => ({ runtime: null as Promise<unknown> | null }));
vi.mock("@/lib/editorMeshCore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/editorMeshCore")>()),
  getManifoldRuntime: () => kernel.runtime,
}));

let runtime: ManifoldToplevel;

beforeAll(async () => {
  await setLanguage("en", false);
  kernel.runtime = manifoldModule().then((loaded) => {
    loaded.setup();
    rememberManifoldRuntime(loaded);
    return loaded;
  });
  runtime = (await kernel.runtime) as ManifoldToplevel;
});

type Vec3 = [number, number, number];

const box = (width: number, depth: number, height: number, extra: Partial<WorkplaneShape> = {}): WorkplaneShape => ({
  id: "box", name: "Box", kind: "box", color: "#d41721",
  x: 0, z: 0, elevation: 0, size: Math.max(width, depth), width, depth, height, rotation: 0, ...extra,
} as WorkplaneShape);

/** A body's mesh from its triangles, merged corner by corner: closed and manifold, or the kernel says what is wrong. */
function solidOf(shape: WorkplaneShape, created: ManifoldSolid[]) {
  const mesh = meshForShape(shape);
  const made = new runtime.Mesh({
    numProp: 3,
    vertProperties: new Float32Array(mesh.vertices.flat()),
    triVerts: new Uint32Array(mesh.faces.flat()),
    tolerance: 1e-4,
  });
  made.merge();
  const solid = runtime.Manifold.ofMesh(made);
  created.push(solid);
  return solid;
}

const dispose = (values: { delete?: () => void }[]) => Array.from(new Set(values)).forEach((value) => value.delete?.());
const options = (patch: Partial<SplitConnectorOptions>) => normalizeSplitConnectorOptions({ ...SPLIT_CONNECTOR_DEFAULTS, ...patch });
const scaled = (vector: readonly number[], length: number) => vector.map((value) => value * length) as Vec3;

/** How much of `moved`, shifted by `by`, overlaps `fixed`, in mm³. */
function overlapWhenMoved(fixed: ManifoldSolid, moved: ManifoldSolid, by: Vec3, created: ManifoldSolid[]) {
  const shifted = moved.translate(by);
  const overlap = fixed.intersect(shifted);
  created.push(shifted, overlap);
  return overlap.volume();
}

describe("a dovetail in a box split across the middle", () => {
  const shape = box(60, 30, 40);
  const plane = { axis: "y" as const, normal: [0, 1, 0] as Vec3, position: 20 };
  const dovetail = options({ kind: "dovetail" });

  it("stands one tongue along the long way of the cut face on the minus half, as the preview showed it", async () => {
    const preview = await previewSplitConnectors([shape], plane, dovetail);
    expect(preview.tally).toEqual({ placed: 1, faces: 1, tooSmall: 0, tooThin: 0 });
    expect(preview.points).toEqual([]);
    expect(preview.tongues).toHaveLength(1);
    const { foot, top } = preview.tongues![0];
    // From edge to edge of the face along x, its foot 6 mm wide about the middle, its top wider by the flanks.
    expect(foot.map(([x]) => Math.abs(x))).toEqual([30, 30, 30, 30]);
    foot.forEach(([, y, z]) => {
      expect(y).toBeCloseTo(20, 9);
      expect(Math.abs(z)).toBeCloseTo(3, 9);
    });
    top.forEach(([, , z]) => expect(Math.abs(z)).toBeCloseTo(dovetailTopWidth(dovetail) / 2, 9));
    const result = await splitShapeByPlane(shape, plane, dovetail);
    expect(result.parts).toHaveLength(2);
    expect(result.connectors).toEqual(preview.tally);
    const [upper, lower] = result.parts!;
    expect(upper.name).toBe("Box (Z+)");
    expect(lower.name).toBe("Box (Z-)");
    // The tongue stands its depth out of the lower half's cut face; the upper half still starts at the plane.
    expect(lower.elevation + lower.height).toBeCloseTo(20 + dovetail.dovetailDepth, 3);
    expect(upper.elevation).toBeCloseTo(20, 3);
    const created: ManifoldSolid[] = [];
    const [above, below] = [upper, lower].map((part) => solidOf(part, created));
    for (const solid of [above, below]) {
      expect(solid.status()).toBe("NoError");
      expect(solid.decompose().length).toBe(1);
      expect(solid.genus()).toBe(0);
    }
    // What the lower half gained, the upper half lost and a little more: the groove is the tongue and its play.
    const half = 60 * 30 * 20;
    const gained = below.volume() - half;
    const lost = half - above.volume();
    expect(gained).toBeGreaterThan(0.9 * 60 * dovetail.dovetailDepth * (dovetail.dovetailWidth + dovetailTopWidth(dovetail)) / 2);
    expect(lost).toBeGreaterThan(gained);
    dispose(created);
  });

  it("fits with the play: put together they do not touch, shifted across by more than the play they do", async () => {
    const result = await splitShapeByPlane(shape, plane, dovetail);
    const created: ManifoldSolid[] = [];
    const [above, below] = result.parts!.map((part) => solidOf(part, created));
    expect(overlapWhenMoved(below, above, [0, 0, 0], created)).toBeLessThan(1e-3);
    // Square to a flank the play is the clearance; across the tongue that is the clearance over the flank's cosine.
    const across = dovetail.clearance / Math.cos((dovetail.dovetailAngle * Math.PI) / 180);
    for (const side of [1, -1]) {
      expect(overlapWhenMoved(below, above, [0, 0, side * (across - 0.03)], created)).toBeLessThan(1e-3);
      expect(overlapWhenMoved(below, above, [0, 0, side * (across + 0.05)], created)).toBeGreaterThan(1e-3);
    }
    dispose(created);
  });

  it("slides apart along the tongue, and cannot be pulled apart across the cut", async () => {
    const result = await splitShapeByPlane(shape, plane, dovetail);
    const created: ManifoldSolid[] = [];
    const [above, below] = result.parts!.map((part) => solidOf(part, created));
    for (const along of [1, 10, 29, 45, 61]) {
      expect(overlapWhenMoved(below, above, [along, 0, 0], created)).toBeLessThan(1e-3);
      expect(overlapWhenMoved(below, above, [-along, 0, 0], created)).toBeLessThan(1e-3);
    }
    // Lifted, the groove's lips catch under the tongue's wide top as soon as the flanks' play is used up.
    const lift = dovetail.clearance / Math.sin((dovetail.dovetailAngle * Math.PI) / 180);
    expect(overlapWhenMoved(below, above, [0, lift - 0.05, 0], created)).toBeLessThan(1e-3);
    expect(overlapWhenMoved(below, above, [0, lift + 0.2, 0], created)).toBeGreaterThan(1e-3);
    expect(overlapWhenMoved(below, above, [0, 3, 0], created)).toBeGreaterThan(5);
    dispose(created);
  });

  it("makes the groove its end play deeper than the tongue and chamfers the tongue's ends", async () => {
    const result = await splitShapeByPlane(shape, plane, dovetail);
    const created: ManifoldSolid[] = [];
    const [above, below] = result.parts!.map((part) => solidOf(part, created));
    const probe = (solid: ManifoldSolid, min: Vec3, max: Vec3) => {
      const cube = runtime.Manifold.cube([max[0] - min[0], max[1] - min[1], max[2] - min[2]]).translate(min);
      const inside = solid.intersect(cube);
      created.push(cube, inside);
      return inside.volume() / cube.volume();
    };
    const floor = 20 + dovetailGrooveDepth(dovetail);
    // Empty just under the groove's floor in the middle, solid just above it.
    expect(probe(above, [-1, floor - 0.1, -1], [1, floor - 0.02, 1])).toBeLessThan(1e-6);
    expect(probe(above, [-1, floor + 0.02, -1], [1, floor + 0.1, 1])).toBeCloseTo(1, 6);
    // The tongue's top runs full width in the middle and is chamfered off at its ends.
    const top = 20 + dovetail.dovetailDepth;
    expect(probe(below, [-1, top - 0.2, -2], [1, top - 0.1, 2])).toBeCloseTo(1, 6);
    expect(probe(below, [29.8, top - 0.2, -2], [30, top - 0.1, 2])).toBeLessThan(1e-6);
    dispose(created);
  });

  it("cuts a wider groove for a larger clearance", async () => {
    const created: ManifoldSolid[] = [];
    const volumes = [];
    for (const clearance of [0.1, 0.4]) {
      const result = await splitShapeByPlane(shape, plane, options({ kind: "dovetail", clearance }));
      volumes.push(solidOf(result.parts![0], created).volume());
    }
    // Both flanks 0.3 mm further out square to themselves, all the 60 mm along, over the groove's slanted height.
    const radians = (dovetail.dovetailAngle * Math.PI) / 180;
    const flank = dovetailGrooveDepth(dovetail) / Math.cos(radians);
    const expected = 2 * 0.3 * flank * 60;
    expect(volumes[0] - volumes[1]).toBeGreaterThan(expected * 0.9);
    expect(volumes[0] - volumes[1]).toBeLessThan(expected * 1.2);
    dispose(created);
  });
});

describe("the way a tongue runs", () => {
  const plane = { axis: "y" as const, normal: [0, 1, 0] as Vec3, position: 20 };

  it("runs along the longer side of the cut face, and across it turned by 90 degrees", async () => {
    const deep = box(30, 60, 40);
    const along = await previewSplitConnectors([deep], plane, options({ kind: "dovetail" }));
    expect(along.tongues).toHaveLength(1);
    along.tongues![0].foot.forEach(([x, , z]) => {
      expect(Math.abs(x)).toBeCloseTo(3, 6);
      expect(Math.abs(z)).toBeCloseTo(30, 6);
    });
    const across = await previewSplitConnectors([box(80, 60, 40)], plane, options({ kind: "dovetail", dovetailTurn: 90 }));
    expect(across.tongues!.length).toBeGreaterThanOrEqual(1);
    across.tongues!.forEach(({ foot }) => foot.forEach(([, , z]) => expect(Math.abs(z)).toBeCloseTo(30, 6)));
  });

  it("splits a wide face into tongues side by side that each slide", async () => {
    const wide = box(120, 100, 30);
    const dovetail = options({ kind: "dovetail" });
    const result = await splitShapeByPlane(wide, { ...plane, position: 15 }, dovetail);
    expect(result.connectors?.placed).toBe(3);
    const created: ManifoldSolid[] = [];
    const [above, below] = result.parts!.map((part) => solidOf(part, created));
    expect(overlapWhenMoved(below, above, [0, 0, 0], created)).toBeLessThan(1e-3);
    expect(overlapWhenMoved(below, above, [70, 0, 0], created)).toBeLessThan(1e-3);
    expect(overlapWhenMoved(below, above, [0, 2, 0], created)).toBeGreaterThan(1);
    dispose(created);
  });
});

describe("round, narrowing and tilted bodies", () => {
  const plane = { axis: "y" as const, normal: [0, 1, 0] as Vec3, position: 20 };
  const dovetail = options({ kind: "dovetail" });

  it("keeps the tongue inside a cylinder's round face, and the halves slide apart along it", async () => {
    const cylinder = box(40, 40, 40, { id: "round", name: "Cylinder", kind: "cylinder", sides: 64 } as Partial<WorkplaneShape>);
    const result = await splitShapeByPlane(cylinder, plane, dovetail);
    expect(result.connectors).toEqual({ placed: 1, faces: 1, tooSmall: 0, tooThin: 0 });
    const created: ManifoldSolid[] = [];
    const [above, below] = result.parts!.map((part) => solidOf(part, created));
    [above, below].forEach((solid) => expect(solid.status()).toBe("NoError"));
    const lower = result.parts![1];
    expect(lower.width).toBeLessThanOrEqual(40 + 1e-3);
    expect(lower.depth).toBeLessThanOrEqual(40 + 1e-3);
    expect(overlapWhenMoved(below, above, [0, 0, 0], created)).toBeLessThan(1e-3);
    expect(overlapWhenMoved(below, above, [45, 0, 0], created)).toBeLessThan(1e-3);
    expect(overlapWhenMoved(below, above, [0, 2, 0], created)).toBeGreaterThan(1);
    dispose(created);
  });

  it("ends the tongue at the surface of a cone that narrows above the cut", async () => {
    const cone = box(50, 50, 40, { id: "cone", name: "Cone", kind: "cone", baseRadius: 25, topRadius: 5, sides: 64 } as Partial<WorkplaneShape>);
    const result = await splitShapeByPlane(cone, plane, dovetail);
    expect(result.connectors?.placed).toBe(1);
    const created: ManifoldSolid[] = [];
    const whole = solidOf(cone, created);
    const below = solidOf(result.parts![1], created);
    const raised = below.trimByPlane([0, 1, 0], 20);
    const beyond = raised.subtract(whole);
    created.push(raised, beyond);
    // The tongue stands where the upper half was, never outside the cone.
    expect(raised.volume()).toBeGreaterThan(50);
    expect(beyond.volume()).toBeLessThan(1e-3);
    dispose(created);
  });

  it("keeps the tongue's foot inside its own half on a box stood on its edge (Discussion #1451)", async () => {
    // A 30 mm box turned 45 degrees about the front axis, standing on an edge, cut upright through its middle: below the
    // cut face the minus half leans in towards the top and bottom corners, where the tongue's foot used to stand out.
    const tilted = box(30, 30, 30, { x: 27, z: -20, elevation: 6.2132034355964265, rotationZ: 315 } as Partial<WorkplaneShape>);
    const result = await splitShapeByPlane(tilted, { axis: "x", normal: [1, 0, 0], position: 27 }, dovetail);
    expect(result.connectors?.placed).toBe(1);
    const created: ManifoldSolid[] = [];
    const whole = solidOf(tilted, created);
    for (const part of result.parts!) {
      const solid = solidOf(part, created);
      const beyond = solid.subtract(whole);
      created.push(beyond);
      // Nothing of either half stands out of the box: no flap at the corners.
      expect(beyond.volume(), part.name).toBeLessThan(1e-3);
      expect(solid.decompose().length, part.name).toBe(1);
    }
    // The halves still slide apart along the tongue (upright here) and hold when pulled apart across the cut.
    const [above, below] = result.parts!.map((part) => solidOf(part, created));
    for (const along of [1, 10]) expect(overlapWhenMoved(below, above, [0, along, 0], created)).toBeLessThan(1e-3);
    expect(overlapWhenMoved(below, above, [3, 0, 0], created)).toBeGreaterThan(5);
    dispose(created);
  });

  it("splits a mesh body as it splits a box", async () => {
    const source = box(50, 50, 40);
    const mesh = meshForShape(source);
    const positions = mesh.faces.flatMap((face) => face.flatMap((index) => mesh.vertices[index]));
    const imported = {
      id: "part", name: "Part", kind: "mesh", color: "#0098c7", x: 0, z: 0, elevation: 0, size: 50, width: 50, depth: 50, height: 40, rotation: 0,
      importedMesh: { positions, baseWidth: 50, baseDepth: 50, baseHeight: 40, triangleCount: positions.length / 9, sourceFormat: "stl" },
    } as unknown as WorkplaneShape;
    const across = { axis: "x" as const, normal: [1, 0, 0] as Vec3, position: 0 };
    const result = await splitShapeByPlane(imported, across, options({ kind: "dovetail", count: 2 }));
    expect(result.connectors).toEqual({ placed: 2, faces: 1, tooSmall: 0, tooThin: 0 });
    const created: ManifoldSolid[] = [];
    const [plus, minus] = result.parts!.map((part) => solidOf(part, created));
    [plus, minus].forEach((solid) => expect(solid.status()).toBe("NoError"));
    expect(overlapWhenMoved(minus, plus, [0, 0, 0], created)).toBeLessThan(1e-3);
    // Pulled apart along the plane's normal, the tongues hold.
    expect(overlapWhenMoved(minus, plus, [2, 0, 0], created)).toBeGreaterThan(1);
    dispose(created);
  });

  it("stands the tongue square to a tilted plane and slides along the plane", async () => {
    const shape = box(60, 60, 60, { elevation: -30 });
    const tilted = modelSplitPlane(meshForShape(shape).vertices, "y", 0, [30, 0])!;
    const slanted = { axis: tilted.axis, normal: tilted.normal, position: tilted.position };
    const preview = await previewSplitConnectors([shape], slanted, dovetail);
    expect(preview.tally.placed).toBeGreaterThanOrEqual(1);
    const { foot } = preview.tongues![0];
    // The foot lies on the plane; its long side gives the way the tongue runs.
    foot.forEach((corner) => expect(corner[0] * slanted.normal[0] + corner[1] * slanted.normal[1] + corner[2] * slanted.normal[2]).toBeCloseTo(slanted.position, 6));
    const runs = foot[1].map((value, index) => value - foot[0][index]);
    const length = Math.hypot(...runs);
    const along = runs.map((value) => value / length) as Vec3;
    const result = await splitShapeByPlane(shape, slanted, dovetail);
    const created: ManifoldSolid[] = [];
    const [plus, minus] = result.parts!.map((part) => solidOf(part, created));
    expect(overlapWhenMoved(minus, plus, [0, 0, 0], created)).toBeLessThan(1e-3);
    expect(overlapWhenMoved(minus, plus, scaled(along, 20), created)).toBeLessThan(1e-3);
    expect(overlapWhenMoved(minus, plus, scaled(along, -length - 5), created)).toBeLessThan(1e-3);
    expect(overlapWhenMoved(minus, plus, scaled(slanted.normal, 2), created)).toBeGreaterThan(1);
    // The frame's own axis along the plane would not do: the tongue runs down the slope, the long way of the section.
    expect(Math.abs(along[0])).toBeLessThan(1e-6);
    expect(splitPlaneFrame(slanted.normal).u).toEqual([1, 0, 0]);
    dispose(created);
  });
});

describe("a cut through two legs", () => {
  // Two legs under one top, the right one set back: the left leg's tongue lines up with the right leg.
  const legs = () => groupedShape([
    box(60, 24, 30, { id: "left", x: -40, z: 0 }),
    box(60, 24, 30, { id: "right", x: 40, z: 10 }),
    box(140, 44, 10, { id: "top", elevation: 30, z: 5 }),
  ])!;
  const plane = { axis: "y" as const, normal: [0, 1, 0] as Vec3, position: 10 };
  const dovetail = options({ kind: "dovetail" });

  it("gives each leg its own tongue, and grooves the other leg only where its own tongue goes", async () => {
    const shape = legs();
    const preview = await previewSplitConnectors([shape], plane, dovetail);
    expect(preview.tally).toEqual({ placed: 2, faces: 2, tooSmall: 0, tooThin: 0 });
    const result = await splitShapeByPlane(shape, plane, dovetail);
    const created: ManifoldSolid[] = [];
    const [above, below] = result.parts!.map((part) => solidOf(part, created));
    expect(above.decompose().length).toBe(1);
    const stumps = below.decompose();
    created.push(...stumps);
    expect(stumps).toHaveLength(2);
    const material = (min: Vec3, max: Vec3) => {
      const cube = runtime.Manifold.cube([max[0] - min[0], max[1] - min[1], max[2] - min[2]]).translate(min);
      const inside = above.intersect(cube);
      created.push(cube, inside);
      return inside.volume() / cube.volume();
    };
    // The right leg is grooved on its own middle line, not on the left leg's.
    expect(material([35, 10.5, -1.5], [45, 13, 0])).toBeCloseTo(1, 6);
    expect(material([35, 10.5, -10.5], [45, 13, -9.5])).toBeLessThan(1e-6);
    expect(material([-45, 10.5, -0.5], [-35, 13, 0.5])).toBeLessThan(1e-6);
    // Put together they do not touch; each stump slides out to its own side.
    expect(overlapWhenMoved(above, below, [0, 0, 0], created)).toBeLessThan(1e-3);
    const [left, right] = [...stumps].sort((a, b) => a.boundingBox().min[0] - b.boundingBox().min[0]);
    for (const along of [10, 30, 50, 75]) {
      expect(overlapWhenMoved(above, left, [-along, 0, 0], created)).toBeLessThan(1e-3);
      expect(overlapWhenMoved(above, right, [along, 0, 0], created)).toBeLessThan(1e-3);
    }
    expect(overlapWhenMoved(above, left, [0, -2, 0], created)).toBeGreaterThan(1);
    dispose(created);
  });

  it("grooves both legs on both lines when the halves are one body each, so they slide apart in one move", async () => {
    // A frame of two legs joined above and below the cut: each half is one body that meets the other on both legs.
    const frame = groupedShape([
      box(60, 24, 40, { id: "left", x: -40, z: 0 }),
      box(60, 24, 40, { id: "right", x: 40, z: 10 }),
      box(140, 44, 5, { id: "bottom", z: 5 }),
      box(140, 44, 5, { id: "top", elevation: 35, z: 5 }),
    ])!;
    const middle = { ...plane, position: 20 };
    const result = await splitShapeByPlane(frame, middle, dovetail);
    expect(result.connectors?.placed).toBe(2);
    const created: ManifoldSolid[] = [];
    const [above, below] = result.parts!.map((part) => solidOf(part, created));
    expect(above.decompose().length).toBe(1);
    expect(below.decompose().length).toBe(1);
    // All the way along, either way: the left leg's tongue passes through the right leg on its way out, and the other way round.
    for (const along of [0, 20, 40, 60, 80, 100, 130, 150]) {
      expect(overlapWhenMoved(above, below, [along, 0, 0], created)).toBeLessThan(1e-3);
      expect(overlapWhenMoved(above, below, [-along, 0, 0], created)).toBeLessThan(1e-3);
    }
    expect(overlapWhenMoved(above, below, [0, -2, 0], created)).toBeGreaterThan(1);
    dispose(created);
  });

  it("gives a leg too narrow for a tongue none, and says so", async () => {
    const shape = groupedShape([
      box(60, 24, 30, { id: "left", x: -40 }),
      box(60, 10, 30, { id: "right", x: 40 }),
      box(140, 30, 10, { id: "top", elevation: 30 }),
    ])!;
    const result = await splitShapesByPlane([shape], plane, () => true, undefined, dovetail);
    expect(result.status).toBe("done");
    if (result.status !== "done") return;
    expect(result.connectors).toEqual({ placed: 1, faces: 2, tooSmall: 1, tooThin: 0 });
  });
});

describe("when no dovetail fits", () => {
  const plane = { axis: "y" as const, normal: [0, 1, 0] as Vec3, position: 20 };
  const dovetail = options({ kind: "dovetail" });

  it("splits as usual and says so", async () => {
    const thin = box(60, 12, 40);
    const result = await splitShapesByPlane([thin], plane, () => true, undefined, dovetail);
    expect(result.status).toBe("done");
    if (result.status !== "done") return;
    expect(result.connectors).toEqual({ placed: 0, faces: 1, tooSmall: 1, tooThin: 0 });
    expect(result.replacements.get("box")).toHaveLength(2);
    expect(withConnectorsNote("Split 1 object into 2 bodies", "dovetail", result.connectors)).toBe("Split 1 object into 2 bodies. No dovetail fit on the cut face, so the parts were split without.");
    // A narrower, shallower tongue fits.
    const narrow = await previewSplitConnectors([thin], plane, options({ kind: "dovetail", dovetailWidth: 3, dovetailDepth: 2 }));
    expect(narrow.tally.placed).toBe(1);
  });

  it("leaves the tongue out where the other half is thinner than the groove", async () => {
    const shape = box(60, 30, 40);
    // 4 mm below the top: the upper half has no room for a groove 4.3 mm deep and its skin.
    const result = await splitShapeByPlane(shape, { ...plane, position: 36 }, dovetail);
    expect(result.connectors).toEqual({ placed: 0, faces: 1, tooSmall: 0, tooThin: 1 });
    expect(result.parts).toHaveLength(2);
    // Turned the other way up, the tongue stands on the thin part and goes into the thick one.
    const flipped = await splitShapeByPlane(shape, { axis: "y", normal: [0, -1, 0], position: -36 }, dovetail);
    expect(flipped.connectors?.placed).toBe(1);
  });

  it("splits a hole without a dovetail", async () => {
    const hole = box(60, 30, 40, { hole: true });
    const preview = await previewSplitConnectors([hole], plane, dovetail);
    expect(preview).toEqual({ tally: { placed: 0, faces: 0, tooSmall: 0, tooThin: 0 }, points: [], holes: 1, tongues: [] });
    const result = await splitShapeByPlane(hole, plane, dovetail);
    expect(result.parts).toHaveLength(2);
    expect(result.parts!.every((part) => part.hole)).toBe(true);
  });

  it("says how many dovetails hold the halves", () => {
    expect(withConnectorsNote("Split 1 object into 2 bodies", "dovetail", { placed: 1, faces: 1, tooSmall: 0, tooThin: 0 })).toBe("Split 1 object into 2 bodies. 1 dovetail holds the halves together: slide them into each other from the side.");
    expect(withConnectorsNote("Split 2 objects into 4 bodies", "dovetail", { placed: 3, faces: 2, tooSmall: 0, tooThin: 0 })).toContain("3 dovetails hold the halves together");
  });
});
