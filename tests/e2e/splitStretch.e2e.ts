import { beforeAll, describe, expect, it, vi } from "vitest";
import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import type { WorkplaneShape } from "@/types/layerling";
import { splitShapesByPlane, stretchLengthLabel, stretchNotice, stretchShapeByPlane } from "@/lib/editorBooleans";
import { meshForShape } from "@/lib/editorMeshCore";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import type { ManifoldSolid } from "@/lib/manifoldSplit";
import { splitShapeFromWorldPositions } from "@/lib/modelSplit";

/*
 * Split's Stretch with the real kernel (Discussions #506, #1569): a body made longer or shorter at the plane comes back
 * as one closed body, the part on the normal's side moved by the length and the cut at the plane drawn out between - so
 * a case gets longer through its straight walls while a pocket on the other side keeps its size.
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

/** A body's mesh as a Manifold solid: closed and manifold, or the kernel says what is wrong. */
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

/** The case of #1569 in small: a tray 100 wide (x), 40 deep (z), 20 high (y), a 3 mm floor, two pockets with a wall between. */
function caseShape() {
  const created: ManifoldSolid[] = [];
  const keep = (solid: ManifoldSolid) => {
    created.push(solid);
    return solid;
  };
  const block = (from: Vec3, to: Vec3) => keep(keep(runtime.Manifold.cube([to[0] - from[0], to[1] - from[1], to[2] - from[2]])).translate(from));
  const outer = block([-50, 0, -20], [50, 20, 20]);
  const left = block([-45, 3, -15], [-5, 21, 15]);
  const right = block([5, 3, -15], [45, 21, 15]);
  const tray = keep(outer.subtract(left).subtract(right));
  const mesh = tray.getMesh();
  const positions: number[] = [];
  for (const vertex of mesh.triVerts) positions.push(...Array.from(mesh.vertProperties.slice(vertex * mesh.numProp, vertex * mesh.numProp + 3)));
  dispose(created);
  return splitShapeFromWorldPositions(box(100, 40, 20, { id: "case", name: "Case" }), positions, "case", "Case")!;
}

function measure(shape: WorkplaneShape) {
  const created: ManifoldSolid[] = [];
  const solid = solidOf(shape, created);
  const status = solid.status();
  const volume = solid.volume();
  const components = solid.decompose();
  const count = components.length;
  const bounds = solid.boundingBox();
  dispose([...created, ...components]);
  return { status, volume, count, min: bounds.min as Vec3, max: bounds.max as Vec3 };
}

describe("stretch a box", () => {
  it("makes it longer at the plane, as one closed body", async () => {
    const result = await stretchShapeByPlane(box(60, 30, 40), { axis: "y", normal: [0, 1, 0], position: 20 }, 15);
    expect(result.parts).not.toBeNull();
    const parts = result.parts!;
    expect(parts).toHaveLength(1);
    expect(parts[0].name).toBe("Box");
    const { status, volume, count, min, max } = measure(parts[0]);
    expect(status).toBe("NoError");
    expect(count).toBe(1);
    expect(volume).toBeCloseTo(60 * 30 * 55, 0);
    expect(min[1]).toBeCloseTo(0, 3);
    expect(max[1]).toBeCloseTo(55, 3);
  });

  it("makes it shorter with a minus length", async () => {
    const result = await stretchShapeByPlane(box(60, 30, 40), { axis: "y", normal: [0, 1, 0], position: 20 }, -10);
    const { volume, count, max } = measure(result.parts![0]);
    expect(count).toBe(1);
    expect(volume).toBeCloseTo(60 * 30 * 30, 0);
    expect(max[1]).toBeCloseTo(30, 3);
  });

  it("says so when the body does not reach that far past the plane", async () => {
    const result = await stretchShapeByPlane(box(60, 30, 40), { axis: "y", normal: [0, 1, 0], position: 20 }, -25);
    expect(result.parts).toBeNull();
    expect("error" in result && result.error).toMatch(/does not reach that far/);
  });

  it("works along a tilted plane: the volume grows by the cut's area times the length", async () => {
    const tilt = Math.SQRT1_2;
    const plane = { axis: "x" as const, normal: [tilt, tilt, 0] as Vec3, position: 20 * tilt };
    const source = box(60, 30, 40);
    const created: ManifoldSolid[] = [];
    const before = solidOf(source, created).volume();
    dispose(created);
    // The plane x + y = 20 runs through the box from (-20, 40) to (20, 0), across its whole depth of 30.
    const area = 40 * Math.SQRT2 * 30;
    const result = await stretchShapeByPlane(source, plane, 12);
    const { status, volume, count } = measure(result.parts![0]);
    expect(status).toBe("NoError");
    expect(count).toBe(1);
    expect(volume).toBeCloseTo(before + area * 12, -1);
  });
});

describe("stretch a case through one pocket (#1569)", () => {
  it("lengthens the right pocket and leaves the left one as it was", async () => {
    const tray = caseShape();
    const before = measure(tray);
    // At x = 25 the cut is the floor and the walls round the right pocket: 40 x 20 less the pocket's 30 x 17.
    const cutArea = 40 * 20 - 30 * 17;
    const result = await stretchShapeByPlane(tray, { axis: "x", normal: [1, 0, 0], position: 25 }, 20);
    const after = measure(result.parts![0]);
    expect(after.status).toBe("NoError");
    expect(after.count).toBe(1);
    expect(after.volume).toBeCloseTo(before.volume + cutArea * 20, 0);
    expect(after.min[0]).toBeCloseTo(-50, 3);
    expect(after.max[0]).toBeCloseTo(70, 3);
    // The left pocket is still 40 long: a cut across it at x = -25 is the same as before.
    const created: ManifoldSolid[] = [];
    const sectionArea = (shape: WorkplaneShape, x: number) => {
      const turned = solidOf(shape, created).rotate([0, 90, 0]);
      created.push(turned);
      const cut = turned.slice(-x);
      const area = cut.area();
      cut.delete();
      return area;
    };
    expect(sectionArea(result.parts![0], -25)).toBeCloseTo(sectionArea(tray, -25), 3);
    dispose(created);
  });

  it("shortens the right pocket to the exact length, as one body", async () => {
    const tray = caseShape();
    const before = measure(tray);
    const cutArea = 40 * 20 - 30 * 17;
    const result = await stretchShapeByPlane(tray, { axis: "x", normal: [1, 0, 0], position: 25 }, -10);
    const after = measure(result.parts![0]);
    expect(after.count).toBe(1);
    expect(after.max[0]).toBeCloseTo(40, 3);
    expect(after.volume).toBeCloseTo(before.volume - cutArea * 10, 0);
  });

  it("with the plane laid on the floor, the walls get taller and the floor keeps its thickness", async () => {
    const tray = caseShape();
    const before = measure(tray);
    // A hair above the floor the cut is the rim round both pockets.
    const rimArea = 100 * 40 - 2 * 40 * 30;
    const result = await stretchShapeByPlane(tray, { axis: "y", normal: [0, 1, 0], position: 3 }, 5);
    const after = measure(result.parts![0]);
    expect(after.count).toBe(1);
    expect(after.volume).toBeCloseTo(before.volume + rimArea * 5, 0);
    expect(after.max[1]).toBeCloseTo(25, 3);
  });
});

describe("stretch through the split's own path", () => {
  it("replaces each crossed object by one body and leaves the others", async () => {
    const crossed = box(60, 30, 40, { id: "crossed" });
    const missed = box(10, 10, 10, { id: "missed", x: 200 });
    const outcome = await splitShapesByPlane([crossed, missed], { axis: "y", normal: [0, 1, 0], position: 20 }, () => true, undefined, undefined, 10);
    expect(outcome.status).toBe("done");
    if (outcome.status !== "done") return;
    expect(outcome.splitCount).toBe(1);
    expect([...outcome.replacements.keys()]).toEqual(["crossed"]);
    expect(outcome.replacements.get("crossed")).toHaveLength(1);
    expect(outcome.connectors).toBeUndefined();
  });

  it("says how much longer or shorter in the status line", () => {
    expect(stretchNotice(20, 1, stretchLengthLabel(20))).toBe("Made 1 object 20 mm longer");
    expect(stretchNotice(-12.5, 2, stretchLengthLabel(-12.5))).toBe("Made 2 objects 12.5 mm shorter");
  });
});
