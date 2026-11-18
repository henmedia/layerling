import { beforeAll, describe, expect, it, vi } from "vitest";
import manifoldModule from "manifold-3d";
import { thread } from "./helpers/threadHarness";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { boltPinDiameter, boltSplitFits, splitBoltForShape } from "@/lib/boltSplit";
import type { WorkplaneShape } from "@/types/layerling";

const kernel = vi.hoisted(() => ({ runtime: null as Promise<unknown> | null }));
vi.mock("@/lib/editorMeshCore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/editorMeshCore")>()),
  getManifoldRuntime: () => kernel.runtime,
}));
beforeAll(async () => {
  kernel.runtime = manifoldModule().then((loaded) => { loaded.setup(); rememberManifoldRuntime(loaded); return loaded; });
  await kernel.runtime;
});

/** The volume of a mesh shape's triangles (mm³). */
function volumeOf(shape: WorkplaneShape) {
  const p = shape.importedMesh!.positions;
  let sum = 0;
  for (let i = 0; i < p.length; i += 9) {
    sum += p[i] * (p[i + 4] * p[i + 8] - p[i + 5] * p[i + 7]) - p[i + 1] * (p[i + 3] * p[i + 8] - p[i + 5] * p[i + 6]) + p[i + 2] * (p[i + 3] * p[i + 7] - p[i + 4] * p[i + 6]);
  }
  return Math.abs(sum) / 6;
}

/** The area of the shape's faces lying on the bed (all three corners at its lowest point, facing down). */
function areaOnBed(shape: WorkplaneShape) {
  const p = shape.importedMesh!.positions;
  let area = 0;
  for (let i = 0; i < p.length; i += 9) {
    if (Math.max(p[i + 1], p[i + 4], p[i + 7]) > 0.001) continue;
    const ux = p[i + 3] - p[i], uz = p[i + 5] - p[i + 2];
    const vx = p[i + 6] - p[i], vz = p[i + 8] - p[i + 2];
    area += Math.abs(ux * vz - uz * vx) / 2;
  }
  return area;
}

/** The area of faces that look straight down above the bed: bridges, which would need support. */
function areaFacingDown(shape: WorkplaneShape) {
  const p = shape.importedMesh!.positions;
  let area = 0;
  for (let i = 0; i < p.length; i += 9) {
    if (Math.min(p[i + 1], p[i + 4], p[i + 7]) < 0.05) continue;
    const ux = p[i + 3] - p[i], uy = p[i + 4] - p[i + 1], uz = p[i + 5] - p[i + 2];
    const vx = p[i + 6] - p[i], vy = p[i + 7] - p[i + 1], vz = p[i + 8] - p[i + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz);
    if (length > 0 && ny / length < -0.95) area += length / 2;
  }
  return area;
}

const screw = (extra: Partial<WorkplaneShape> = {}) => thread({ threadRole: "screw", threadDiameter: 10, threadPitch: 1.5, threadHead: "cylinder", height: 40, ...extra } as Partial<WorkplaneShape>);

describe("splitting a screw lengthwise to print it lying flat", () => {
  it("offers itself for screws and rods only", () => {
    expect(boltSplitFits(screw())).toBe(true);
    expect(boltSplitFits(thread({ threadRole: "rod" } as Partial<WorkplaneShape>))).toBe(true);
    expect(boltSplitFits(thread({ threadRole: "nut" } as Partial<WorkplaneShape>))).toBe(false);
    expect(boltSplitFits(thread({ threadRole: "bore", hole: true } as Partial<WorkplaneShape>))).toBe(false);
  });

  it("cuts an M10 screw in two equal halves lying on their cut faces, with a centring pin in the head and on the thread", async () => {
    const shape = screw();
    const result = await splitBoltForShape(shape, { pins: true, pinPlay: 0.15 });
    if (!result.parts) throw new Error(result.error);
    expect(result.parts).toHaveLength(3);
    const [a, b, pins] = result.parts;
    // The halves: as long as the screw, as high as the head's radius, on the bed.
    for (const half of [a, b]) {
      expect(half.elevation).toBeCloseTo(0, 3);
      expect(half.width).toBeCloseTo(shape.height, 0);
      expect(half.height).toBeGreaterThan(4.5);
      expect(half.height).toBeLessThan(shape.width / 2 + 0.2);
    }
    const va = volumeOf(a);
    const vb = volumeOf(b);
    expect(Math.abs(va - vb) / va).toBeLessThan(0.03);
    // Each lies on its flat cut face: most of the core's length times its width is on the bed.
    for (const half of [a, b]) expect(areaOnBed(half)).toBeGreaterThan(0.5 * 8 * shape.height);
    // One pin in the head, one on the thread (40 mm with the head: one is enough).
    expect(result.placed.head).toBe(1);
    expect(result.placed.thread).toBeGreaterThanOrEqual(1);
    expect(result.pins).toBe(result.placed.head + result.placed.thread);
    expect(result.pinDiameter).toBe(boltPinDiameter(shape));
    // The pins stand upright, as long as asked, in a row.
    expect(pins.height).toBeCloseTo(Math.max(result.pinLength, result.headPinLength), 1);
    expect(pins.elevation).toBeCloseTo(0, 3);
    // The holes: the halves lose the pins' holes and nothing else, the same in both.
    const plain = await splitBoltForShape(shape, { pins: false });
    if (!plain.parts) throw new Error(plain.error);
    expect(plain.parts).toHaveLength(2);
    const lost = volumeOf(plain.parts[0]) + volumeOf(plain.parts[1]) - va - vb;
    const r = result.pinDiameter / 2 + 0.15;
    const hole = (length: number) => Math.PI * r * r * (length + 0.6) + (2 * Math.PI * r * r * r) / 3;
    const holes = result.placed.thread * hole(result.pinLength) + result.placed.head * hole(result.headPinLength || result.pinLength);
    expect(lost / holes).toBeGreaterThan(0.95);
    expect(lost / holes).toBeLessThan(1.05);
    // The pins fit their holes: shorter and thinner by the play.
    expect(volumeOf(pins)).toBeLessThan(holes);
    // Laid out side by side, not overlapping.
    const zs = result.parts.map((part) => [part.z - (part.depth ?? 0) / 2, part.z + (part.depth ?? 0) / 2]).sort((p, q) => p[0] - q[0]);
    for (let index = 1; index < zs.length; index += 1) expect(zs[index][0]).toBeGreaterThan(zs[index - 1][1]);
  });

  it("gives a long rod pins spread along it, in holes that end in a cone, so nothing needs support", async () => {
    const rod = thread({ threadRole: "rod", threadDiameter: 12, threadPitch: 1.75, height: 70 } as Partial<WorkplaneShape>);
    const result = await splitBoltForShape(rod, { pins: true });
    if (!result.parts) throw new Error(result.error);
    expect(result.placed.head).toBe(0);
    expect(result.placed.thread).toBe(3);
    for (const part of result.parts) expect(areaFacingDown(part)).toBeLessThan(0.5);
  });

  it("splits along the screw's own axis whatever way it is turned", async () => {
    const upright = await splitBoltForShape(screw(), { pins: true });
    const lying = await splitBoltForShape(screw({ rotationX: 90, rotationZ: 30 }), { pins: true });
    if (!upright.parts || !lying.parts) throw new Error("no parts");
    expect(lying.parts).toHaveLength(upright.parts.length);
    upright.parts.forEach((part, index) => {
      expect(lying.parts![index].width).toBeCloseTo(part.width, 2);
      expect(lying.parts![index].height).toBeCloseTo(part.height, 2);
    });
  });

  it.each([
    ["M6 with a cylinder head", { threadDiameter: 6, threadPitch: 1, threadHead: "cylinder", height: 25 }],
    ["M8 countersunk", { threadDiameter: 8, threadPitch: 1.25, threadHead: "countersunk", height: 30 }],
    ["M8 hex head", { threadDiameter: 8, threadPitch: 1.25, threadHead: "hex", height: 20 }],
    ["M10 wing head", { threadDiameter: 10, threadPitch: 1.5, threadHead: "wing", height: 35 }],
    ["M12 knob", { threadDiameter: 12, threadPitch: 1.75, threadHead: "knob", height: 50 }],
    ["M16 hex head, long", { threadDiameter: 16, threadPitch: 2, threadHead: "hex", height: 90 }],
  ])("always gives the head a pin and the thread at least one: %s", async (_label, fields) => {
    const result = await splitBoltForShape(screw(fields as Partial<WorkplaneShape>), { pins: true });
    if (!result.parts) throw new Error(result.error);
    expect(result.placed.head).toBe(1);
    expect(result.placed.thread).toBeGreaterThanOrEqual(1);
    expect(result.pinDiameter).toBeGreaterThanOrEqual(1.5);
    for (const part of result.parts) expect(areaFacingDown(part)).toBeLessThan(0.5);
  });

  it("still gives the head of an M5 screw its pin, where the thread is too thin for one", async () => {
    const result = await splitBoltForShape(screw({ threadDiameter: 5, threadPitch: 0.8, height: 20 } as Partial<WorkplaneShape>), { pins: true });
    if (!result.parts) throw new Error(result.error);
    expect(result.placed).toEqual({ head: 1, thread: 0 });
    for (const part of result.parts) expect(areaFacingDown(part)).toBeLessThan(0.5);
  });

  it("leaves the pins out where a thread is too thin for them, and splits it all the same", async () => {
    const rod = thread({ threadRole: "rod", threadDiameter: 4, threadPitch: 0.7, height: 30 } as Partial<WorkplaneShape>);
    const result = await splitBoltForShape(rod, { pins: true });
    if (!result.parts) throw new Error(result.error);
    expect(result.parts).toHaveLength(2);
    expect(result.pins).toBe(0);
  });

  it("refuses a nut", async () => {
    const result = await splitBoltForShape(thread({ threadRole: "nut" } as Partial<WorkplaneShape>), {});
    expect(result.parts).toBeNull();
  });
});
