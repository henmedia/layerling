import { beforeAll, describe, expect, it, vi } from "vitest";
import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import { clearanceMeshShape } from "@/lib/clearanceCheck";
import { packValue, unpackValue } from "@/lib/geometryTransfer";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { checkPrint, printCheckFloating, printCheckSmallContacts, PRINT_CHECK_CONTACT_MM2_PER_MM } from "@/lib/printCheck";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * The print check with the real Manifold kernel: a plate too thin for the nozzle and one that is not, a hollowed box
 * with one wall too thin, a sphere on the plate, a box in the air and one resting on another, and the way the answer
 * crosses back from the geometry worker.
 */
const kernel = vi.hoisted(() => ({ runtime: null as Promise<unknown> | null }));
vi.mock("@/lib/editorMeshCore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/editorMeshCore")>()),
  getManifoldRuntime: () => kernel.runtime,
}));
let runtime: ManifoldToplevel;
beforeAll(async () => {
  kernel.runtime = manifoldModule().then((loaded) => { loaded.setup(); rememberManifoldRuntime(loaded); return loaded; });
  runtime = (await kernel.runtime) as ManifoldToplevel;
});

const box = (id: string, patch: Partial<WorkplaneShape> = {}): WorkplaneShape => (
  { id, name: id, kind: "box", color: "#d97813", x: 0, z: 0, elevation: 0, rotation: 0, width: 10, depth: 10, size: 10, height: 10, locked: false, hidden: false, ...patch } as WorkplaneShape
);

/** A Manifold solid as a mesh object of the design (nine numbers a triangle, scene frame). */
function meshObject(id: string, solid: ReturnType<ManifoldToplevel["Manifold"]["cube"]>) {
  const mesh = solid.getMesh();
  const positions: number[] = [];
  for (const index of mesh.triVerts) positions.push(mesh.vertProperties[index * mesh.numProp], mesh.vertProperties[index * mesh.numProp + 1], mesh.vertProperties[index * mesh.numProp + 2]);
  solid.delete();
  return { ...clearanceMeshShape(id, id, "#19c37d", positions)!, importedMesh: { ...clearanceMeshShape(id, id, "#19c37d", positions)!.importedMesh!, sourceFormat: "stl" } } as WorkplaneShape;
}

describe("the print check (real Manifold kernel)", () => {
  it("finds a 0.5 mm plate too thin for a 0.4 mm nozzle, and a 2 mm plate fine", async () => {
    const thin = await checkPrint([box("plate", { width: 20, depth: 20, height: 0.5 })], { nozzle: 0.4 });
    expect(thin.minimumWallMm).toBeCloseTo(0.8, 12);
    expect(thin.thinWalls?.places.length).toBeGreaterThan(0);
    expect(thin.thinWalls!.places[0]).toMatchObject({ id: "plate" });
    expect(thin.thinWalls!.places[0].thinnestMm).toBeCloseTo(0.5, 3);
    const total = thin.thinWalls!.places.reduce((sum, place) => sum + place.areaMm2, 0);
    expect(total).toBeCloseTo(800, 0);
    expect(thin.thinWalls!.positions.length % 9).toBe(0);
    const thick = await checkPrint([box("plate", { width: 20, depth: 20, height: 2 })], { nozzle: 0.4 });
    expect(thick.thinWalls?.places).toEqual([]);
    expect(thick.thinWalls?.positions).toEqual([]);
  });

  it("finds the 0.6 mm wall of a hollowed box, on the side where it is", async () => {
    // 30 x 20 x 20, open at the top; the wall at x = -15 is 0.6 mm, the others 2 mm.
    const shell = runtime.Manifold.cube([30, 20, 20], true).translate([0, 10, 0])
      .subtract(runtime.Manifold.cube([30 - 2.6, 20, 16], true).translate([-0.7, 12, 0]));
    const result = await checkPrint([meshObject("tray", shell)], { nozzle: 0.4 });
    const places = result.thinWalls!.places;
    expect(places.length).toBeGreaterThan(0);
    expect(places[0].thinnestMm).toBeCloseTo(0.6, 3);
    for (const place of places) expect(place.box.max[0]).toBeLessThan(-15 + 0.6 + 0.01);
    // At 0.25 the wall is fine: 0.5 mm is enough.
    const finer = await checkPrint([meshObject("tray", runtime.Manifold.cube([30, 20, 20], true).translate([0, 10, 0])
      .subtract(runtime.Manifold.cube([30 - 2.6, 20, 16], true).translate([-0.7, 12, 0])))], { nozzle: 0.25 });
    expect(finer.thinWalls!.places).toEqual([]);
  });

  it("warns that a sphere stands on little of the plate, and lets a box stand", async () => {
    const result = await checkPrint([meshObject("ball", runtime.Manifold.sphere(10, 96).translate([0, 10, 0])), box("cube", { x: 40 })]);
    const [ball, cube] = result.pieces;
    expect(ball).toMatchObject({ ids: ["ball"], onPlate: true, floating: false, smallContact: true });
    // The first layer of a sphere of radius 10 at 0.1 mm: a disc of about 2π · 10 · 0.1 mm².
    expect(ball.footprintMm2!).toBeGreaterThan(5);
    expect(ball.footprintMm2!).toBeLessThan(6.6);
    expect(ball.footprintMm2! / ball.heightMm).toBeLessThan(PRINT_CHECK_CONTACT_MM2_PER_MM);
    expect(cube).toMatchObject({ ids: ["cube"], onPlate: true, smallContact: false });
    expect(cube.footprintMm2!).toBeCloseTo(100, 3);
    expect(printCheckSmallContacts(result).map((piece) => piece.ids)).toEqual([["ball"]]);
  });

  it("finds a box in the air, and lets a box resting on another stand", async () => {
    const floating = await checkPrint([box("base"), box("up", { x: 30, elevation: 5 })]);
    expect(printCheckFloating(floating).map((piece) => piece.ids)).toEqual([["up"]]);
    expect(printCheckFloating(floating)[0].box.min[1]).toBeCloseTo(5, 6);
    // Stacked: joined into one piece that stands on the plate.
    const stacked = await checkPrint([box("base"), box("top", { elevation: 10 })]);
    expect(printCheckFloating(stacked)).toEqual([]);
    // 0.03 mm above it rests on it still; 0.2 mm above it is in the air.
    const resting = await checkPrint([box("base"), box("top", { elevation: 10.03 })]);
    expect(resting.pieces).toHaveLength(2);
    expect(printCheckFloating(resting)).toEqual([]);
    const lifted = await checkPrint([box("base"), box("top", { elevation: 10.2 })]);
    expect(printCheckFloating(lifted).map((piece) => piece.ids)).toEqual([["top"]]);
    // What rests only on a floating box floats too.
    const chain = await checkPrint([box("base"), box("air", { x: 30, elevation: 5 }), box("onAir", { x: 30, elevation: 15 })]);
    expect(printCheckFloating(chain).map((piece) => piece.ids).flat()).toEqual(["air", "onAir"]);
  });

  it("checks the separate parts of one object on their own, and joins overlapping bodies", async () => {
    // One imported object of two boxes, one standing, one in the air.
    const parts = runtime.Manifold.compose([runtime.Manifold.cube([10, 10, 10]), runtime.Manifold.cube([10, 10, 10]).translate([20, 5, 0])]);
    const result = await checkPrint([meshObject("pair", parts)], {}, (n) => `Part ${n}`);
    expect(result.pieces.map((piece) => piece.name).sort()).toEqual(["pair · Part 1", "pair · Part 2"]);
    expect(printCheckFloating(result)).toHaveLength(1);
    // A 0.5 mm plate sunk into a thick block is no thin wall: the two print as one.
    const sunk = await checkPrint([box("block", { width: 20, depth: 20, height: 10 }), box("plate", { width: 16, depth: 16, height: 0.5, elevation: 4 })]);
    expect(sunk.joined).toBe(true);
    expect(sunk.thinWalls!.places).toEqual([]);
    expect(sunk.pieces).toHaveLength(1);
    // Wholly inside, the plate leaves no face of its own: the piece is the block's.
    expect(sunk.pieces[0].ids).toEqual(["block"]);
    // Sticking out at one side, it is part of the piece too.
    const peeking = await checkPrint([box("block", { width: 20, depth: 20, height: 10 }), box("plate", { x: 4, width: 16, depth: 16, height: 2, elevation: 4 })]);
    expect(peeking.pieces).toHaveLength(1);
    expect(peeking.pieces[0].ids).toEqual(["block", "plate"]);
  });

  it("comes back from the geometry worker as the page would have worked it out", async () => {
    const source = [box("plate", { width: 20, depth: 20, height: 0.5 }), box("up", { x: 40, elevation: 3 })];
    const direct = await checkPrint(source, { nozzle: 0.4 });
    // The worker's way: the arguments packed and unpacked, the answer packed and unpacked (lib/geometryTransfer.ts).
    const request = packValue({ source, options: { nozzle: 0.4 } });
    const received = new Map<unknown[], number>();
    const args = unpackValue(structuredClone(request.value), request.buffers.map((buffer) => buffer.slice()), [], received) as { source: WorkplaneShape[]; options: { nozzle: number } };
    const answer = packValue(await checkPrint(args.source, args.options), received);
    const viaWorker = unpackValue(structuredClone(answer.value), answer.buffers.map((buffer) => buffer.slice()), request.lists);
    expect(viaWorker).toEqual(direct);
  });
});
