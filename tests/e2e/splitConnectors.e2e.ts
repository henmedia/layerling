import { beforeAll, describe, expect, it, vi } from "vitest";
import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import type { WorkplaneShape } from "@/types/layerling";
import { groupedShape, previewSplitConnectors, splitShapeByPlane, splitShapesByPlane } from "@/lib/editorBooleans";
import { meshForShape } from "@/lib/editorMeshCore";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import type { ManifoldSolid } from "@/lib/manifoldSplit";
import { modelSplitPlane } from "@/lib/modelSplit";
import { BREAKAWAY_BASE, breakawayNubSize, breakawayPlateSize, breakawaySocketDiameter } from "@/lib/breakawayBase";
import { CONNECTOR_END_PLAY, connectorHoleRadius, dowelLength, normalizeSplitConnectorOptions, plugHeight, SPLIT_CONNECTOR_DEFAULTS, type SplitConnectorOptions } from "@/lib/splitConnectors";

/*
 * Split's connectors with the real kernel (Discussion #832): the halves and the loose dowels come out as closed bodies,
 * every hole lies where a pin goes, a pin put there fits without touching either half and leaves the halves room to
 * close, and the plugs' pegs go into the other half's holes. For a box (a primitive), a mesh body and a tilted plane.
 */
const kernel = vi.hoisted(() => ({ runtime: null as Promise<unknown> | null }));
vi.mock("@/lib/editorMeshCore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/editorMeshCore")>()),
  getManifoldRuntime: () => kernel.runtime,
}));

let runtime: ManifoldToplevel;

beforeAll(async () => {
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
const dot = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** A solid round bar of `radius` from `start` along `axis` for `length`, as a pin put into its holes would lie. */
function barAlong(start: Vec3, axis: Vec3, length: number, radius: number, created: ManifoldSolid[]) {
  const bar = runtime.Manifold.cylinder(length, radius, radius, 48);
  created.push(bar);
  const z = axis;
  const helper: Vec3 = Math.abs(z[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const xRaw: Vec3 = [helper[1] * z[2] - helper[2] * z[1], helper[2] * z[0] - helper[0] * z[2], helper[0] * z[1] - helper[1] * z[0]];
  const xLength = Math.hypot(...xRaw);
  const x = xRaw.map((value) => value / xLength) as Vec3;
  const y: Vec3 = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
  const placed = bar.transform([x[0], x[1], x[2], 0, y[0], y[1], y[2], 0, z[0], z[1], z[2], 0, start[0], start[1], start[2], 1]);
  created.push(placed);
  return placed;
}

const options = (patch: Partial<SplitConnectorOptions>) => normalizeSplitConnectorOptions({ ...SPLIT_CONNECTOR_DEFAULTS, ...patch });

describe("dowels in a box split across the middle", () => {
  const shape = box(60, 30, 40);
  const plane = { axis: "y" as const, normal: [0, 1, 0] as Vec3, position: 20 };
  const dowels = options({ kind: "dowels" });

  it("makes two closed halves and one closed body of loose pins, as many as the preview promised", async () => {
    const preview = await previewSplitConnectors([shape], plane, dowels);
    expect(preview.tally).toEqual({ placed: 2, faces: 1, tooSmall: 0, tooThin: 0 });
    const result = await splitShapeByPlane(shape, plane, dowels);
    expect(result.parts).toHaveLength(3);
    expect(result.connectors).toEqual(preview.tally);
    const [upper, lower, pins] = result.parts!;
    expect(upper.name).toBe("Box (Z+)");
    expect(lower.name).toBe("Box (Z-)");
    expect(pins.name).toBe("Box (dowels)");
    const created: ManifoldSolid[] = [];
    const solids = [upper, lower, pins].map((part) => solidOf(part, created));
    solids.forEach((solid) => expect(solid.status()).toBe("NoError"));
    // Each pin is a body of its own; the halves are one piece each.
    expect(solids[2].decompose().length).toBe(2);
    expect(solids[0].decompose().length).toBe(1);
    expect(solids[1].decompose().length).toBe(1);
    // The halves lost exactly their holes: half the box each, less what the holes take.
    const half = 60 * 30 * 20;
    expect(solids[0].volume()).toBeLessThan(half - 2 * Math.PI * connectorHoleRadius(dowels) ** 2 * (dowels.depth - 0.5));
    expect(solids[0].volume()).toBeCloseTo(solids[1].volume(), 3);
    dispose(created);
  });

  it("puts every hole where a pin goes: a pin there clears both halves and is shorter than both holes", async () => {
    const preview = await previewSplitConnectors([shape], plane, dowels);
    const result = await splitShapeByPlane(shape, plane, dowels);
    const created: ManifoldSolid[] = [];
    const [upper, lower] = result.parts!.map((part) => solidOf(part, created));
    for (const point of preview.points) {
      // The pin as drawn (no clearance), sunk as deep as half its length into each hole: it touches neither half.
      const length = dowelLength(dowels);
      const pin = barAlong([point[0], point[1] - length / 2, point[2]], [0, 1, 0], length, dowels.diameter / 2, created);
      const intoUpper = upper.intersect(pin);
      const intoLower = lower.intersect(pin);
      created.push(intoUpper, intoLower);
      expect(intoUpper.volume()).toBeLessThan(1e-3);
      expect(intoLower.volume()).toBeLessThan(1e-3);
      // The holes are deeper than half the pin by the end play: a bar that long still clears, a little longer does not.
      const deep = barAlong([point[0], point[1] - dowels.depth + 0.05, point[2]], [0, 1, 0], 2 * dowels.depth - 0.1, dowels.diameter / 2, created);
      const tooDeep = barAlong([point[0], point[1] - dowels.depth - 0.2, point[2]], [0, 1, 0], 2 * dowels.depth + 0.4, dowels.diameter / 2, created);
      const deepInto = upper.intersect(deep);
      const tooDeepInto = upper.intersect(tooDeep);
      created.push(deepInto, tooDeepInto);
      expect(deepInto.volume()).toBeLessThan(1e-3);
      expect(tooDeepInto.volume()).toBeGreaterThan(1);
    }
    expect(CONNECTOR_END_PLAY).toBeGreaterThan(0);
    dispose(created);
  });

  it("stands the pins beside the box on its floor, each as long as both holes less the end play", async () => {
    const result = await splitShapeByPlane(shape, plane, dowels);
    const pins = result.parts![2];
    expect(pins.elevation).toBeCloseTo(0, 6);
    // Both 6 mm holes, less 0.3 mm at each end.
    expect(pins.height).toBeCloseTo(11.4, 3);
    expect(pins.x - pins.width / 2).toBeGreaterThan(30);
  });

  it("makes the holes larger than the pin by the clearance on each side", async () => {
    const narrow = options({ kind: "dowels", clearance: 0.1 });
    const wide = options({ kind: "dowels", clearance: 0.4 });
    const created: ManifoldSolid[] = [];
    const volumes = [];
    for (const fit of [narrow, wide]) {
      const result = await splitShapeByPlane(shape, plane, fit);
      volumes.push(solidOf(result.parts![0], created).volume());
    }
    // Two holes 6 mm deep, 0.3 mm wider in radius: the half loses that much more.
    const ring = (radius: number) => Math.PI * radius * radius;
    const expected = 2 * (ring(connectorHoleRadius(wide)) - ring(connectorHoleRadius(narrow))) * dowels.depth;
    expect(volumes[0] - volumes[1]).toBeGreaterThan(expected * 0.95);
    expect(volumes[0] - volumes[1]).toBeLessThan(expected * 1.1);
    dispose(created);
  });
});

describe("plugs on one half", () => {
  it("stands pegs on the minus half that go into the plus half's holes without touching it", async () => {
    const shape = box(60, 30, 40);
    const plane = { axis: "y" as const, normal: [0, 1, 0] as Vec3, position: 20 };
    const plugs = options({ kind: "plugs" });
    const preview = await previewSplitConnectors([shape], plane, plugs);
    const result = await splitShapeByPlane(shape, plane, plugs);
    expect(result.parts).toHaveLength(2);
    expect(result.connectors?.placed).toBe(2);
    const created: ManifoldSolid[] = [];
    const [upper, lower] = result.parts!.map((part) => solidOf(part, created));
    expect(upper.status()).toBe("NoError");
    expect(lower.status()).toBe("NoError");
    expect(lower.decompose().length).toBe(1);
    // The lower half now reaches above the plane by the pegs, and the pegs fit into the upper half's holes.
    expect(result.parts![1].elevation + result.parts![1].height).toBeCloseTo(20 + plugHeight(plugs), 3);
    const pegsOnly = lower.trimByPlane([0, 1, 0], 20 + 1e-3);
    created.push(pegsOnly);
    expect(pegsOnly.decompose().length).toBe(2);
    const clash = upper.intersect(pegsOnly);
    created.push(clash);
    expect(clash.volume()).toBeLessThan(1e-3);
    for (const point of preview.points) {
      const peg = barAlong([point[0], 20, point[2]], [0, 1, 0], plugs.depth - 0.05, plugs.diameter / 2, created);
      const into = upper.intersect(peg);
      created.push(into);
      expect(into.volume()).toBeLessThan(1e-3);
    }
    dispose(created);
  });
});

describe("connectors on a mesh body and along a tilted plane", () => {
  it("splits an imported-mesh body with dowels as it splits a box", async () => {
    const source = box(50, 50, 30);
    const mesh = meshForShape(source);
    const positions = mesh.faces.flatMap((face) => face.flatMap((index) => mesh.vertices[index]));
    const imported = {
      id: "part", name: "Part", kind: "mesh", color: "#0098c7", x: 0, z: 0, elevation: 0, size: 50, width: 50, depth: 50, height: 30, rotation: 0,
      importedMesh: { positions: positions.map((value, index) => (index % 3 === 1 ? value : value)), baseWidth: 50, baseDepth: 50, baseHeight: 30, triangleCount: positions.length / 9, sourceFormat: "stl" },
    } as unknown as WorkplaneShape;
    const plane = { axis: "x" as const, normal: [1, 0, 0] as Vec3, position: 0 };
    const dowels = options({ kind: "dowels", count: 3 });
    const result = await splitShapeByPlane(imported, plane, dowels);
    expect(result.connectors).toEqual({ placed: 3, faces: 1, tooSmall: 0, tooThin: 0 });
    const created: ManifoldSolid[] = [];
    const solids = result.parts!.map((part) => solidOf(part, created));
    solids.forEach((solid) => expect(solid.status()).toBe("NoError"));
    expect(solids[2].decompose().length).toBe(3);
    dispose(created);
  });

  it("drills along the normal of a tilted plane", async () => {
    const shape = box(60, 60, 60, { elevation: -30 });
    const points = meshForShape(shape).vertices;
    const tilted = modelSplitPlane(points, "y", 0, [30, 0])!;
    const plane = { axis: tilted.axis, normal: tilted.normal, position: tilted.position };
    const dowels = options({ kind: "dowels" });
    const preview = await previewSplitConnectors([shape], plane, dowels);
    expect(preview.tally.placed).toBeGreaterThanOrEqual(2);
    const result = await splitShapeByPlane(shape, plane, dowels);
    const created: ManifoldSolid[] = [];
    const [upper, lower] = result.parts!.map((part) => solidOf(part, created));
    for (const point of preview.points) {
      // On the plane, and a pin along the normal clears both halves; one upright through the same point does not.
      expect(dot(point, plane.normal)).toBeCloseTo(plane.position, 6);
      const length = dowelLength(dowels);
      const start = point.map((value, index) => value - plane.normal[index] * length / 2) as Vec3;
      const pin = barAlong(start, plane.normal, length, dowels.diameter / 2, created);
      const upright = barAlong([point[0], point[1] - length / 2, point[2]], [0, 1, 0], length, dowels.diameter / 2, created);
      for (const half of [upper, lower]) {
        const into = half.intersect(pin);
        const crooked = half.intersect(upright);
        created.push(into, crooked);
        expect(into.volume()).toBeLessThan(1e-3);
        expect(crooked.volume()).toBeGreaterThan(0.5);
      }
    }
    dispose(created);
  });
});

describe("where the halves meet", () => {
  it("puts connectors only where both halves have material, on a plane laid on a step", async () => {
    // A wide block with a small one standing on it: cut at the step, the halves meet only under the small one.
    const base = box(60, 30, 20, { id: "base" });
    const tower = box(20, 20, 20, { id: "tower", elevation: 20 });
    const stepped = groupedShape([base, tower])!;
    const plane = { axis: "y" as const, normal: [0, 1, 0] as Vec3, position: 20 };
    const dowels = options({ kind: "dowels" });
    const preview = await previewSplitConnectors([stepped], plane, dowels);
    expect(preview.tally).toEqual({ placed: 1, faces: 1, tooSmall: 0, tooThin: 0 });
    expect(preview.points[0][0]).toBeCloseTo(0, 1);
    expect(preview.points[0][2]).toBeCloseTo(0, 1);
    const result = await splitShapeByPlane(stepped, plane, dowels);
    expect(result.parts).toHaveLength(3);
    const created: ManifoldSolid[] = [];
    result.parts!.forEach((part) => expect(solidOf(part, created).status()).toBe("NoError"));
    dispose(created);
  });
});

describe("when no connector fits", () => {
  it("splits as usual and says so", async () => {
    const thin = box(60, 8, 40);
    const plane = { axis: "y" as const, normal: [0, 1, 0] as Vec3, position: 20 };
    const result = await splitShapesByPlane([thin], plane, () => true, undefined, options({ kind: "dowels" }));
    expect(result.status).toBe("done");
    if (result.status !== "done") return;
    expect(result.connectors).toEqual({ placed: 0, faces: 1, tooSmall: 1, tooThin: 0 });
    expect(result.replacements.get("box")).toHaveLength(2);
  });

  it("leaves a connector out where a half is thinner than the hole", async () => {
    const shape = box(60, 30, 40);
    // 3 mm below the top: the upper half is too thin for a 6 mm hole and its floor.
    const plane = { axis: "y" as const, normal: [0, 1, 0] as Vec3, position: 37 };
    const result = await splitShapeByPlane(shape, plane, options({ kind: "dowels" }));
    expect(result.connectors).toEqual({ placed: 0, faces: 1, tooSmall: 0, tooThin: 2 });
    expect(result.parts).toHaveLength(2);
  });

  it("splits a hole without connectors", async () => {
    const hole = box(60, 30, 40, { hole: true });
    const plane = { axis: "y" as const, normal: [0, 1, 0] as Vec3, position: 20 };
    const preview = await previewSplitConnectors([hole], plane, options({ kind: "dowels" }));
    expect(preview).toEqual({ tally: { placed: 0, faces: 0, tooSmall: 0, tooThin: 0 }, points: [], holes: 1 });
    const result = await splitShapeByPlane(hole, plane, options({ kind: "dowels" }));
    expect(result.parts).toHaveLength(2);
    expect(result.parts!.every((part) => part.hole)).toBe(true);
  });

  it("splits exactly as before with None", async () => {
    const shape = box(60, 30, 40);
    const plane = { axis: "y" as const, normal: [0, 1, 0] as Vec3, position: 20 };
    const plain = await splitShapeByPlane(shape, plane);
    const none = await splitShapeByPlane(shape, plane, options({ kind: "none" }));
    expect(none.parts?.map((part) => part.importedMesh?.positions)).toEqual(plain.parts?.map((part) => part.importedMesh?.positions));
    expect("connectors" in none).toBe(false);
  });
});

describe("dowels on a breakaway base (a mail from Michael Celotto)", () => {
  const shape = box(60, 30, 40);
  const plane = { axis: "y" as const, normal: [0, 1, 0] as Vec3, position: 20 };

  it("stands all the loose pins on one plate, raised onto their nubs, one closed body with it", async () => {
    const plain = await splitShapeByPlane(shape, plane, options({ kind: "dowels" }));
    const based = await splitShapeByPlane(shape, plane, options({ kind: "dowels", dowelBase: true }));
    expect(based.parts).toHaveLength(3);
    expect(based.connectors).toEqual(plain.connectors);
    const pins = based.parts![2];
    const created: ManifoldSolid[] = [];
    const solid = solidOf(pins, created);
    const plainSolid = solidOf(plain.parts![2], created);
    expect(solid.status()).toBe("NoError");
    // The two pins and the base are one body now, to be broken apart once printed.
    expect(solid.decompose().length).toBe(1);
    expect(pins.elevation).toBeCloseTo(0, 6);
    expect(pins.height).toBeCloseTo(dowelLength(SPLIT_CONNECTOR_DEFAULTS) + BREAKAWAY_BASE.lift, 3);
    // The base stays clear of the halves.
    expect(pins.x - pins.width / 2).toBeGreaterThan(30 + 2);
    // The plate under both pins, less a socket each, and a nub each: no pin touches its socket's wall.
    const { height, floor, lift } = BREAKAWAY_BASE;
    const reach = breakawayPlateSize(5);
    const pitch = 5 + 3;
    const nub = breakawayNubSize(5, 0.5);
    const socketArea = (48 / 2) * (breakawaySocketDiameter(5) / 2) ** 2 * Math.sin((2 * Math.PI) / 48);
    const base = (reach + pitch) * reach * height - 2 * socketArea * (height - floor) + 2 * nub ** 2 * (lift - floor);
    expect(solid.volume()).toBeCloseTo(plainSolid.volume() + base, 0);
    dispose(created);
  });

  it("is off unless asked for, and leaves plugs and dovetails as they are", () => {
    expect(SPLIT_CONNECTOR_DEFAULTS.dowelBase).toBe(false);
    expect(options({ kind: "dowels", dowelBase: true }).dowelBase).toBe(true);
    expect(normalizeSplitConnectorOptions({ kind: "dowels", dowelBase: "yes" }).dowelBase).toBe(false);
  });
});
