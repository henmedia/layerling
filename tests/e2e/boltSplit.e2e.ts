import { beforeAll, describe, expect, it, vi } from "vitest";
import manifoldModule from "manifold-3d";
import { thread } from "./helpers/threadHarness";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { BOLT_FILAMENT_DIAMETER, boltFilamentChannel, boltFilamentPlay, boltPinDiameter, boltSplitFits, boltSplitStatus, splitBoltForShape } from "@/lib/boltSplit";
import { shapeToManifoldSolid } from "@/lib/editorBooleans";
import type { ManifoldSolid } from "@/lib/editorMeshCore";
import type { WorkplaneShape } from "@/types/layerling";

const kernel = vi.hoisted(() => ({ runtime: null as Promise<unknown> | null }));
let wasm: Awaited<ReturnType<typeof manifoldModule>>;
vi.mock("@/lib/editorMeshCore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/editorMeshCore")>()),
  getManifoldRuntime: () => kernel.runtime,
}));
beforeAll(async () => {
  kernel.runtime = manifoldModule().then((loaded) => { loaded.setup(); rememberManifoldRuntime(loaded); wasm = loaded; return loaded; });
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

/*
 * Filament as the pins (Discussion #1851), judged as someone who prints and glues it would: the halves are put together
 * again in the kernel with the pieces of filament in their places.
 */

/** A half as a solid of the kernel, as it lies: its cut face on y = 0, its length along x, centred on x and z. */
function halfSolid(shape: WorkplaneShape): ManifoldSolid {
  const positions = shape.importedMesh!.positions;
  const mesh = new wasm.Mesh({ numProp: 3, vertProperties: Float32Array.from(positions), triVerts: Uint32Array.from({ length: positions.length / 3 }, (_, index) => index) });
  mesh.merge();
  const solid = new wasm.Manifold(mesh);
  const box = solid.boundingBox();
  return solid.translate([-(box.min[0] + box.max[0]) / 2, -box.min[1], -(box.min[2] + box.max[2]) / 2]);
}

/** The second half turned over onto the first, as glued: half a turn about the axis. */
const turnedOver = (half: ManifoldSolid) => half.rotate([180, 0, 0]);

type Hole = { x: number; z: number; alongX: number; alongZ: number };

/** The holes in a half's cut face, cut 0.05 mm above the bed: where each is and how large. A channel that is closed at both ends is one of them. */
function holesIn(half: ManifoldSolid): Hole[] {
  // The kernel slices across z: the half is turned so its height is z; x stays, z becomes -y.
  const polygons = half.rotate([90, 0, 0]).slice(0.05).toPolygons();
  const holes: Hole[] = [];
  for (const polygon of polygons) {
    let area = 0;
    for (let index = 0; index < polygon.length; index += 1) {
      const [x0, y0] = polygon[index];
      const [x1, y1] = polygon[(index + 1) % polygon.length];
      area += x0 * y1 - x1 * y0;
    }
    if (area >= 0) continue;
    const xs = polygon.map((point) => point[0]);
    const ys = polygon.map((point) => point[1]);
    holes.push({ x: (Math.min(...xs) + Math.max(...xs)) / 2, z: -(Math.min(...ys) + Math.max(...ys)) / 2, alongX: Math.max(...xs) - Math.min(...xs), alongZ: Math.max(...ys) - Math.min(...ys) });
  }
  return holes.sort((p, q) => p.x - q.x);
}

const isChannel = (hole: Hole) => hole.alongX > 1.5 * hole.alongZ;

/** A piece of filament `length` long and `diameter` thick in the hole: lying in a channel along x, standing across the cut face in a round hole. */
function pieceIn(hole: Hole, length: number, diameter = BOLT_FILAMENT_DIAMETER, move: [number, number, number] = [0, 0, 0]) {
  const rod = wasm.Manifold.cylinder(length, diameter / 2, diameter / 2, 64, true);
  return (isChannel(hole) ? rod.rotate([0, 90, 0]) : rod.rotate([90, 0, 0])).translate([hole.x + move[0], move[1], hole.z + move[2]]);
}

const overlap = (a: ManifoldSolid, b: ManifoldSolid) => a.intersect(b).volume();

/** The area of faces above the bed that overhang by more than 45 degrees (a degree to spare for the mesh). */
function areaOverhanging(shape: WorkplaneShape) {
  const p = shape.importedMesh!.positions;
  let area = 0;
  for (let i = 0; i < p.length; i += 9) {
    if (Math.min(p[i + 1], p[i + 4], p[i + 7]) < 0.05) continue;
    const ux = p[i + 3] - p[i], uy = p[i + 4] - p[i + 1], uz = p[i + 5] - p[i + 2];
    const vx = p[i + 6] - p[i], vy = p[i + 7] - p[i + 1], vz = p[i + 8] - p[i + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz);
    if (length > 0 && ny / length < -Math.cos((44 * Math.PI) / 180)) area += length / 2;
  }
  return area;
}

/** Splits with filament and puts the halves together again: the halves, their holes and the pieces as the message names them. */
async function splitWithFilament(shape: WorkplaneShape, pinPlay = 0.15) {
  const result = await splitBoltForShape(shape, { pins: true, filament: true, pinPlay });
  if (!result.parts) throw new Error(result.error);
  expect(result.parts).toHaveLength(2);
  expect(result.pins).toBe(0);
  const first = halfSolid(result.parts[0]);
  const second = turnedOver(halfSolid(result.parts[1]));
  const holes = holesIn(first);
  // Across the head first, then along the thread, as `filament` lists them; the holes are sorted along the axis.
  const across = holes.filter((hole) => !isChannel(hole));
  const along = holes.filter(isChannel);
  expect(across).toHaveLength(result.placed.head);
  expect(along).toHaveLength(result.placed.thread);
  const headFirst = across.length === 0 || along.length === 0 || across[0].x < along[0].x;
  const pieces = [...across.map((hole, index) => ({ hole, length: result.filament[index] })), ...(headFirst ? along : [...along].reverse()).map((hole, index) => ({ hole, length: result.filament[across.length + index] }))];
  return { result, first, second, glued: first.add(second), holes, pieces };
}

const m4Socket = () => screw({ threadDiameter: 4, threadPitch: 0.7, threadHead: "cylinder", height: 20 } as Partial<WorkplaneShape>);
const m5Hex = () => screw({ threadDiameter: 5, threadPitch: 0.8, threadHead: "hex", height: 30 } as Partial<WorkplaneShape>);
const rodOf = (threadDiameter: number, threadPitch: number, height: number) => thread({ threadRole: "rod", threadDiameter, threadPitch, height } as Partial<WorkplaneShape>);

describe("splitting a screw with pieces of filament as the pins (Discussion #1851)", () => {
  it("puts the halves of an M5 screw together as the screw was, less the holes", async () => {
    const shape = m5Hex();
    const { result, first, second, glued } = await splitWithFilament(shape);
    expect(result.placed).toEqual({ head: 1, thread: 1 });
    expect(result.filament).toEqual([4.5, 21.5]);
    // The halves do not overlap, and together they are the screw: nothing of them lies outside it.
    expect(overlap(first, second)).toBeLessThan(0.01);
    const created: ManifoldSolid[] = [];
    const body = shapeToManifoldSolid(wasm, { ...shape, rotation: 0, rotationX: 0, rotationZ: 0 }, created)!;
    const box = body.boundingBox();
    // Laid down as the first half is: the axis along x, what was -x up.
    const laid = body.translate([-(box.min[0] + box.max[0]) / 2, -(box.min[1] + box.max[1]) / 2, -(box.min[2] + box.max[2]) / 2]).transform([0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    expect(glued.subtract(laid).volume()).toBeLessThan(0.002 * laid.volume());
    const holesVolume = laid.volume() - glued.volume();
    expect(holesVolume).toBeGreaterThan(Math.PI * 0.875 ** 2 * (4.5 + 21.5));
    expect(holesVolume).toBeLessThan(1.6 * Math.PI * 0.875 ** 2 * (4.5 + 21.5));
    // Both halves are equal and lie on their cut faces.
    expect(volumeOf(result.parts[0])).toBeCloseTo(volumeOf(result.parts[1]), 0);
    for (const part of result.parts) expect(areaOnBed(part)).toBeGreaterThan(20);
  });

  it("has the same holes in both halves, on the axis, with half a printed pin's play", async () => {
    const { result, first, holes } = await splitWithFilament(m5Hex());
    const other = holesIn(halfSolid(result.parts[1]));
    expect(other).toHaveLength(holes.length);
    holes.forEach((hole, index) => {
      // Turned over, the second half's holes lie on the first's.
      expect(other[index].x).toBeCloseTo(hole.x, 2);
      expect(-other[index].z).toBeCloseTo(hole.z, 2);
      expect(other[index].alongX).toBeCloseTo(hole.alongX, 2);
      // On the axis: the half is centred on it.
      expect(Math.abs(hole.z)).toBeLessThan(0.01);
      // 1.75 mm and 0.075 mm per side (half of 0.15), a hundredth to spare for the slice above the bed.
      expect(hole.alongZ).toBeGreaterThan(BOLT_FILAMENT_DIAMETER + 2 * 0.075 - 0.02);
      expect(hole.alongZ).toBeLessThan(BOLT_FILAMENT_DIAMETER + 2 * 0.075 + 0.005);
    });
    expect(first.boundingBox().min[1]).toBeCloseTo(0, 5);
  });

  it("takes its play from the pin play as the lid hinge's filament holes do: half of it, at least 0.05 mm", async () => {
    expect(boltFilamentPlay(0.15)).toBeCloseTo(0.075, 6);
    expect(boltFilamentPlay(0.3)).toBeCloseTo(0.15, 6);
    expect(boltFilamentPlay(0)).toBeCloseTo(0.05, 6);
    for (const [pinPlay, play] of [[0.3, 0.15], [0, 0.05]] as const) {
      const { holes } = await splitWithFilament(m5Hex(), pinPlay);
      for (const hole of holes) {
        expect(hole.alongZ).toBeGreaterThan(BOLT_FILAMENT_DIAMETER + 2 * play - 0.02);
        expect(hole.alongZ).toBeLessThan(BOLT_FILAMENT_DIAMETER + 2 * play + 0.005);
      }
    }
  });

  it("names lengths in half millimetres that fit: each hole is 0.6 to 1.1 mm longer than its piece", async () => {
    for (const shape of [m5Hex(), m4Socket(), rodOf(4, 0.7, 31.3), rodOf(6, 1, 47)]) {
      const { result, glued, pieces } = await splitWithFilament(shape);
      expect(pieces).toHaveLength(result.filament.length);
      for (const { hole, length } of pieces) {
        expect(length).toBeGreaterThanOrEqual(3);
        expect(Math.abs(length * 2 - Math.round(length * 2))).toBeLessThan(1e-9);
        // The piece as named goes in, and one cut half a millimetre long still does; one 1.2 mm long does not.
        expect(overlap(glued, pieceIn(hole, length))).toBeLessThan(1e-4);
        expect(overlap(glued, pieceIn(hole, length + 0.55))).toBeLessThan(1e-4);
        expect(overlap(glued, pieceIn(hole, length + 1.2))).toBeGreaterThan(1e-3);
        if (isChannel(hole)) {
          expect(hole.alongX - length).toBeGreaterThan(0.6 - 0.01);
          expect(hole.alongX - length).toBeLessThan(1.1 + 0.01);
        }
      }
    }
  });

  it("holds the pieces with the stated play and no more: filament 0.2 mm thicker does not go in", async () => {
    const { glued, pieces } = await splitWithFilament(m5Hex());
    for (const { hole, length } of pieces) {
      expect(overlap(glued, pieceIn(hole, length, BOLT_FILAMENT_DIAMETER + 0.12))).toBeLessThan(1e-4);
      expect(overlap(glued, pieceIn(hole, length, BOLT_FILAMENT_DIAMETER + 0.2))).toBeGreaterThan(1e-3);
    }
  });

  it("lets every piece be laid in from the cut face: the channel is open to it over its whole length, with no undercut", async () => {
    for (const shape of [m5Hex(), m4Socket()]) {
      const { first, second, pieces } = await splitWithFilament(shape);
      for (const { hole, length } of pieces) {
        // On its way down into the first half, and with the second half coming down onto it.
        for (const lift of [0, 0.3, 0.6, 0.9, 1.5]) {
          expect(overlap(first, pieceIn(hole, length, BOLT_FILAMENT_DIAMETER, [0, -lift, 0]))).toBeLessThan(1e-4);
          expect(overlap(second, pieceIn(hole, length, BOLT_FILAMENT_DIAMETER, [0, lift, 0]))).toBeLessThan(1e-4);
        }
      }
    }
  });

  it("closes the channel at both ends: nothing shows at the tip or under the head", async () => {
    for (const shape of [m5Hex(), m4Socket(), rodOf(4, 0.7, 30)]) {
      const { first, holes } = await splitWithFilament(shape);
      const box = first.boundingBox();
      // A hole of the cut face's outline, so closed all round; and well inside the half's length.
      for (const hole of holes.filter(isChannel)) {
        expect(hole.x - hole.alongX / 2 - box.min[0]).toBeGreaterThan(BOLT_FILAMENT_DIAMETER);
        expect(box.max[0] - hole.x - hole.alongX / 2).toBeGreaterThan(BOLT_FILAMENT_DIAMETER);
      }
    }
  });

  /** Whether the pieces find room with the second half pushed aside by `shift`: tried in steps of 0.025 mm over the hole's play and beyond. */
  const goesTogether = (first: ManifoldSolid, second: ManifoldSolid, pieces: { hole: Hole; length: number }[], shift: [number, number, number]) => {
    const moved = first.add(second.translate(shift));
    return pieces.every(({ hole, length }) => {
      for (let step = -8; step <= 28; step += 1) {
        const move: [number, number, number] = [shift[0] ? (Math.sign(shift[0]) * step) / 40 : 0, 0, shift[2] ? (Math.sign(shift[2]) * step) / 40 : 0];
        if (overlap(moved, pieceIn(hole, length, BOLT_FILAMENT_DIAMETER, move)) < 1e-4) return true;
      }
      return false;
    });
  };

  it("lines the halves up across by the piece in the channel, and along the axis by the piece across the head", async () => {
    const { first, second, pieces } = await splitWithFilament(m5Hex());
    expect(goesTogether(first, second, pieces, [0, 0, 0])).toBe(true);
    // Within the play (0.075 mm per side in each half) they still go together; a quarter millimetre out they do not.
    expect(goesTogether(first, second, pieces, [0, 0, 0.1])).toBe(true);
    expect(goesTogether(first, second, pieces, [0, 0, 0.25])).toBe(false);
    expect(goesTogether(first, second, pieces, [0, 0, -0.25])).toBe(false);
    expect(goesTogether(first, second, pieces, [0.25, 0, 0])).toBe(false);
    expect(goesTogether(first, second, pieces, [-0.25, 0, 0])).toBe(false);
    // The piece across the head does that along the axis; the one in the channel alone would let them slide.
    const channelOnly = pieces.filter(({ hole }) => isChannel(hole));
    expect(goesTogether(first, second, channelOnly, [0.25, 0, 0])).toBe(true);
    expect(goesTogether(first, second, channelOnly, [0, 0, 0.25])).toBe(false);
  });

  it("says so where no piece goes across the head: an M4 socket head screw and a rod line up across, their ends are pushed flush", async () => {
    for (const shape of [m4Socket(), rodOf(4, 0.7, 30)]) {
      const { result, first, second, pieces } = await splitWithFilament(shape);
      expect(result.placed).toEqual({ head: 0, thread: 1 });
      expect(goesTogether(first, second, pieces, [0, 0, 0])).toBe(true);
      expect(goesTogether(first, second, pieces, [0, 0, 0.25])).toBe(false);
      expect(goesTogether(first, second, pieces, [0, 0, -0.25])).toBe(false);
      // Along the axis the channel's ends leave the piece's end play: the message tells the user to push the ends flush.
      expect(goesTogether(first, second, pieces, [0.25, 0, 0])).toBe(true);
      expect(boltSplitStatus("Screw", result, true)).toBe(`Screw split lengthwise: two halves lying on their cut faces. Cut 1.75 mm filament: ${result.filament[0]} mm. It lines the halves up across; push their ends flush while the glue sets.`);
      // Flush ends are exact: both halves are the same length.
      const [a, b] = [first.boundingBox(), second.boundingBox()];
      expect(a.max[0] - a.min[0]).toBeCloseTo(b.max[0] - b.min[0], 3);
    }
    const withHead = await splitWithFilament(m5Hex());
    expect(boltSplitStatus("Screw", withHead.result, true)).toBe("Screw split lengthwise: two halves lying on their cut faces. Cut 1.75 mm filament: 4.5 mm, 21.5 mm.");
  });

  it.each([
    ["M4 coarse", 4, 0.7],
    ["M4 fine", 4, 0.5],
    ["M5 coarse", 5, 0.8],
    ["M5 fine", 5, 0.5],
  ])("keeps enough wall round the channel on the thinnest threads: %s", async (_label, diameter, pitch) => {
    const shape = rodOf(diameter, pitch, 30);
    const section = boltFilamentChannel(shape)!;
    expect(section).not.toBeNull();
    const { glued, holes } = await splitWithFilament(shape);
    const [channel] = holes.filter(isChannel);
    const length = channel.alongX - 1;
    const solid = (size: [number, number, number], at: [number, number, number]) => {
      const box = wasm.Manifold.cube(size, true).translate(at);
      return overlap(glued, box) / box.volume();
    };
    // Beside it on the cut face 0.4 mm of the core at least, on both sides, over its whole length.
    for (const side of [1, -1]) expect(solid([length, 0.1, 0.38], [channel.x, 0, side * (section.radius + 0.2)])).toBeGreaterThan(0.999);
    // Over its roof 0.3 mm of the core (0.25 measured: the thread's root is drawn in flats), in both halves.
    for (const side of [1, -1]) expect(solid([length, 0.23, 0.1], [channel.x, side * (section.top + 0.135), 0])).toBeGreaterThan(0.999);
    // And the channel itself is empty up to its roof.
    expect(solid([length, 2 * section.top - 0.1, 0.05], [channel.x, 0, 0])).toBeLessThan(1e-6);
  });

  it("prints without support: no hole or channel overhangs by more than 45 degrees, but for a roof's flat top under 0.7 mm", async () => {
    for (const shape of [m5Hex(), m4Socket(), rodOf(4, 0.7, 30), rodOf(4, 0.5, 30), rodOf(8, 1.25, 40)]) {
      const plain = await splitBoltForShape(shape, { pins: false });
      const { result } = await splitWithFilament(shape);
      if (!plain.parts) throw new Error(plain.error);
      const section = boltFilamentChannel(shape)!;
      const flat = Math.max(0, 2 * (section.radius * Math.SQRT2 - section.top));
      expect(flat).toBeLessThan(0.7);
      const channels = result.filament.slice(result.placed.head).reduce((sum, length) => sum + length + 1.1, 0);
      result.parts.forEach((part, index) => {
        expect(areaOverhanging(part) - areaOverhanging(plain.parts![index])).toBeLessThan(flat * channels + 0.05);
      });
    }
  });

  it.each([
    ["rod", "rod"], ["socket head", "cylinder"], ["countersunk", "countersunk"], ["hex head", "hex"], ["square head", "square"], ["flange", "flange"], ["wing", "wing"], ["knob", "knob"],
  ])("works for every head from M4 up, with a piece across the head where it has room for 3 mm of it: %s", async (_label, head) => {
    for (const [diameter, pitch, height] of [[4, 0.7, 20], [5, 0.8, 30], [6, 1, 30]] as const) {
      const shape = head === "rod" ? rodOf(diameter, pitch, height) : screw({ threadDiameter: diameter, threadPitch: pitch, threadHead: head, height } as Partial<WorkplaneShape>);
      const { result, first, second, glued, pieces } = await splitWithFilament(shape);
      expect(result.placed.thread).toBe(1);
      expect(result.filament).toHaveLength(result.placed.head + 1);
      expect(overlap(first, second)).toBeLessThan(0.01);
      for (const { hole, length } of pieces) {
        expect(length).toBeGreaterThanOrEqual(3);
        expect(overlap(glued, pieceIn(hole, length))).toBeLessThan(1e-4);
      }
      // No piece across the head touches the channel or the drive: 0.4 mm of wall round its hole, inside the head.
      for (const { hole, length } of pieces.filter((piece) => !isChannel(piece.hole))) {
        const sleeve = wasm.Manifold.cylinder(length, BOLT_FILAMENT_DIAMETER / 2 + 0.075 + 0.38, BOLT_FILAMENT_DIAMETER / 2 + 0.075 + 0.38, 64, true).rotate([90, 0, 0]).translate([hole.x, 0, hole.z]);
        const bore = pieceIn(hole, length + 0.2, BOLT_FILAMENT_DIAMETER + 0.2);
        const wall = sleeve.subtract(bore);
        expect(overlap(glued, wall) / wall.volume()).toBeGreaterThan(0.98);
      }
      if (head === "rod") expect(result.placed.head).toBe(0);
    }
  });

  it("gives a long thread two pieces, one at each end, so none is longer than filament comes straight", async () => {
    const { result, holes, first } = await splitWithFilament(rodOf(5, 0.8, 70));
    expect(result.placed).toEqual({ head: 0, thread: 2 });
    expect(result.filament).toEqual([15, 15]);
    const box = first.boundingBox();
    expect(holes[0].x - holes[0].alongX / 2 - box.min[0]).toBeLessThan(4);
    expect(box.max[0] - holes[1].x - holes[1].alongX / 2).toBeLessThan(4);
    expect(holes[1].x - holes[0].x).toBeGreaterThan(45);
  });

  it("fits from M4: an M3 comes without a channel, its core is too thin even for filament", async () => {
    expect(boltFilamentChannel(rodOf(4, 0.7, 20))).not.toBeNull();
    expect(boltFilamentChannel(rodOf(3, 0.5, 20))).toBeNull();
    const rod = rodOf(3, 0.5, 20);
    const result = await splitBoltForShape(rod, { pins: true, filament: true });
    const plain = await splitBoltForShape(rod, { pins: false });
    if (!result.parts || !plain.parts) throw new Error("not split");
    expect(result.parts).toHaveLength(2);
    expect(result.filament).toHaveLength(0);
    expect(result.placed).toEqual({ head: 0, thread: 0 });
    // Split all the same, the halves whole, and the message says there was no room.
    expect(volumeOf(result.parts[0])).toBeCloseTo(volumeOf(plain.parts[0]), 3);
    expect(boltSplitStatus("Rod", result, true)).toBe("Rod split lengthwise: two halves, without centring pins (there is no room for them).");
  });

  it("leaves printed pins as they were: without filament nothing changes, and filament without pins is no pins", async () => {
    const shape = screw();
    const printed = await splitBoltForShape(shape, { pins: true });
    const asked = await splitBoltForShape(shape, { pins: true, filament: false });
    const none = await splitBoltForShape(shape, { pins: false, filament: true });
    if (!printed.parts || !asked.parts || !none.parts) throw new Error("not split");
    expect(printed.filament).toEqual([]);
    expect(asked.parts).toHaveLength(printed.parts.length);
    expect(volumeOf(asked.parts[0])).toBeCloseTo(volumeOf(printed.parts[0]), 6);
    expect(none.parts).toHaveLength(2);
    expect(none.filament).toEqual([]);
    expect(none.placed).toEqual({ head: 0, thread: 0 });
  });
});
