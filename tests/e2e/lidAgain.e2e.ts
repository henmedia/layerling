import { beforeAll, describe, expect, it, vi } from "vitest";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * A lid made again for a box that has magnets or screws from an earlier lid (Discussion #1985), on the real kernels,
 * grouped as the editor groups it. The old pockets counted as openings: a push-in lid stood a peg in every one, and the
 * holes for screws were cut where the wide pockets for magnets still lay open.
 */

// Manifold loads its files relative to the page; in node they are the public folder.
(globalThis as unknown as { window: unknown }).window = { location: { href: pathToFileURL(resolve("apps/web/public") + "/").href } };

// Grouping exact parts runs against the real OpenCascade kernel, loaded from node_modules (as in lidMagnetsExact.e2e.ts).
vi.mock("@/lib/brepKernel", async () => {
  const brep = await import("brepjs");
  const { OcctKernel } = await import("occt-wasm");
  const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
  let ready: Promise<typeof brep> | null = null;
  let raw: Awaited<ReturnType<typeof OcctKernel.init>> | null = null;
  return {
    occtKernel: () => raw,
    loadBrepWithOcct: () =>
      (ready ??= (async () => {
        const kernel = await OcctKernel.init({ wasm });
        raw = kernel;
        brep.registerKernel("occt-wasm", brep.OcctWasmAdapter.fromKernel(kernel));
        return brep;
      })()),
  };
});

let lidTool: typeof import("@/lib/lidTool");
let editorBooleans: typeof import("@/lib/editorBooleans");
let meshCore: typeof import("@/lib/editorMeshCore");

beforeAll(async () => {
  lidTool = await import("@/lib/lidTool");
  editorBooleans = await import("@/lib/editorBooleans");
  meshCore = await import("@/lib/editorMeshCore");
  const { loadBrepWithOcct } = await import("@/lib/brepKernel");
  await loadBrepWithOcct();
});

type Options = Parameters<typeof import("@/lib/lidTool").normalizeLidOptions>[0];
type Solid = import("@/lib/editorMeshCore").ManifoldSolid;

function box(id: string, overrides: Partial<WorkplaneShape>): WorkplaneShape {
  return { id, name: "Box", kind: "box", color: "#d41721", x: 0, z: 0, elevation: 0, size: 60, width: 60, depth: 60, height: 50, rotation: 0, ...overrides } as WorkplaneShape;
}

/** A box 60 x 60 x 50 with 2 mm walls and floor, open at the top: a solid and a hole, as one makes it before grouping. */
const openBox = () => [box("outer", { x: 5, z: -3 }), box("inner", { x: 5, z: -3, width: 56, depth: 56, elevation: 2, hole: true })];

const MAGNETS: Options = { type: "plug", thickness: 4, magnets: true, magnetDiameter: 10, magnetHeight: 3 };
const SCREWS: Options = { type: "plug", thickness: 4, cornerScrews: true };
const PLAIN: Options = { type: "plug", thickness: 4 };

const build = (shapes: WorkplaneShape[]) => editorBooleans.buildGroupedShapeFromSelection(shapes, 250_000);

/** The editor's way to build a group again from its parts: the same group, under its own id and name. */
const rebuild = async (group: WorkplaneShape, parts: WorkplaneShape[]) => {
  const built = await build(parts);
  return built.group ? { ...built.group, id: group.id, name: group.name } : { error: built.failureNotice || "not built" };
};

/**
 * A lid for `targets` as the editor makes it: what an earlier lid left in the corners taken out first, then the lid, and
 * the bodies grouped with their new posts and pockets (the bodies as they were for a lid that brings neither).
 */
async function makeLid(targets: WorkplaneShape[], given: Options) {
  const options = lidTool.normalizeLidOptions(given);
  const replaces = options.magnets || options.cornerScrews;
  const without = await lidTool.lidTargetsWithoutCorners(targets, replaces ? "all" : "pockets", rebuild);
  if ("failure" in without) throw new Error(without.failure);
  const result = await lidTool.lidForShapes(without.targets, options);
  if (!result.lid) throw new Error(result.error);
  if (!result.magnets) return { lid: result.lid, body: targets, pockets: [] as WorkplaneShape[] };
  const grouped = await lidTool.groupedWithMagnets(without.targets, result.magnets, build);
  if (!grouped.group) throw new Error(grouped.failureNotice);
  return { lid: result.lid, body: [{ ...grouped.group, name: "Box" }], pockets: result.magnets.pockets };
}

/** The shapes joined and their holes cut away, as one solid in the kernel. */
function solidOf(runtime: Awaited<ReturnType<typeof import("@/lib/editorMeshCore").getManifoldRuntime>>, shapes: readonly WorkplaneShape[], created: Solid[]) {
  const part = (shape: WorkplaneShape) => editorBooleans.shapeToManifoldSolid(runtime, { ...shape, hole: false }, created)!;
  let solid = runtime.Manifold.union(shapes.filter((shape) => !shape.hole).map(part));
  created.push(solid);
  const holes = shapes.filter((shape) => shape.hole).map(part);
  if (holes.length) {
    solid = solid.subtract(runtime.Manifold.union(holes));
    created.push(solid);
  }
  return solid;
}

/** How many outlines the lid has 1 mm above its plate, as it lies turned over: a lip is two, its outside and its inside. */
function lipOutlines(lid: Solid, thickness: number, created: Solid[]) {
  const up = lid.rotate([90, 0, 0]);
  created.push(up);
  return up.slice(up.boundingBox().min[2] + thickness + 1).toPolygons().length;
}

describe("a lid made again for a box that has magnets or screws from an earlier lid (Discussion #1985)", () => {
  it("replaces the old posts and pockets with the new lid's, and stands no pegs in them", async () => {
    const runtime = await meshCore.getManifoldRuntime();
    const created: Solid[] = [];
    try {
      const volumes = (made: Awaited<ReturnType<typeof makeLid>>) => ({ lid: solidOf(runtime, [made.lid], created).volume(), body: solidOf(runtime, made.body, created).volume() });
      const magnets = await makeLid(openBox(), MAGNETS);
      const screwsAlone = volumes(await makeLid(openBox(), SCREWS));
      const magnetsAlone = volumes(magnets);

      // Screws after magnets: the box and the lid come out as for a box that never had magnets.
      const screws = await makeLid(magnets.body, SCREWS);
      expect(lipOutlines(solidOf(runtime, [screws.lid], created), 4, created)).toBe(2);
      const afterMagnets = volumes(screws);
      expect(afterMagnets.lid).toBeCloseTo(screwsAlone.lid, 0);
      expect(afterMagnets.body).toBeCloseTo(screwsAlone.body, 0);
      // The body is one group of the box, the screws' posts and their holes: nothing of the magnets is left in it.
      const parts = screws.body[0].groupedShapes ?? [];
      expect(parts.filter((part) => lidTool.lidCornerPart(part) === "pocket")).toHaveLength(4);
      expect(parts.filter((part) => lidTool.lidCornerPart(part) === "pocket").every((part) => Math.abs(part.width - 4) < 1e-6)).toBe(true);
      expect(parts.some((part) => (part.groupedShapes ?? []).some((inner) => lidTool.lidCornerPart(inner)))).toBe(false);

      // And magnets again after that: the parts are found again although the box has been ungrouped in between.
      const again = await makeLid(screws.body, MAGNETS);
      expect(lipOutlines(solidOf(runtime, [again.lid], created), 4, created)).toBe(2);
      const afterScrews = volumes(again);
      expect(afterScrews.lid).toBeCloseTo(magnetsAlone.lid, 0);
      expect(afterScrews.body).toBeCloseTo(magnetsAlone.body, 0);
    } finally {
      Array.from(new Set(created)).forEach((value) => value.delete?.());
    }
  }, 240_000);

  it("keeps the lip of a lid without magnets out of the old pockets, and leaves the box as it is", async () => {
    const runtime = await meshCore.getManifoldRuntime();
    const created: Solid[] = [];
    try {
      const magnets = await makeLid(openBox(), MAGNETS);
      const plain = await makeLid(magnets.body, PLAIN);
      expect(plain.body).toBe(magnets.body);
      // One lip that goes round the posts, and nothing in the corners.
      const lid = solidOf(runtime, [plain.lid], created);
      expect(lipOutlines(lid, 4, created)).toBe(2);
      // Set on the box, it meets neither the posts nor the pockets' floors.
      const body = solidOf(runtime, magnets.body, created);
      const turned = lid.rotate([180, 0, 0]);
      const bodyBox = body.boundingBox();
      const lidBox = turned.boundingBox();
      const closed = turned.translate([(bodyBox.min[0] + bodyBox.max[0] - lidBox.min[0] - lidBox.max[0]) / 2, bodyBox.max[1] + 4 - lidBox.max[1], (bodyBox.min[2] + bodyBox.max[2] - lidBox.min[2] - lidBox.max[2]) / 2]);
      const overlap = closed.intersect(body);
      created.push(turned, closed, overlap);
      expect(overlap.volume()).toBeLessThan(0.01);
      // Each pocket is empty still, from its floor up to the rim.
      for (const pocket of magnets.pockets) {
        const space = runtime.Manifold.cylinder(pocket.height - 1.1, pocket.width / 2 - 0.1, pocket.width / 2 - 0.1, 48).rotate([-90, 0, 0]).translate([pocket.x, (pocket.elevation ?? 0) + 0.05, pocket.z]);
        const filled = space.intersect(closed);
        created.push(space, filled);
        expect(filled.volume()).toBeLessThan(0.01);
      }
    } finally {
      Array.from(new Set(created)).forEach((value) => value.delete?.());
    }
  }, 240_000);

  it("takes them out of a box that was grouped with a hole afterwards, and keeps that hole", async () => {
    const runtime = await meshCore.getManifoldRuntime();
    const created: Solid[] = [];
    try {
      const magnets = await makeLid(openBox(), MAGNETS);
      // A hole for a cable through the front wall, grouped with the box after its lid was made.
      const cable = { ...box("cable", { kind: "cylinder", x: 5, z: 27, width: 8, depth: 8, height: 8, elevation: 20, rotationX: 90, hole: true }), sides: 48 } as WorkplaneShape;
      const withCable = await build([...magnets.body, cable]);
      if (!withCable.group) throw new Error(withCable.failureNotice);
      const cabled = [{ ...withCable.group, id: "cabled", name: "Box" }];
      const fresh = await build([...(await makeLid(openBox(), SCREWS)).body, cable]);
      if (!fresh.group) throw new Error(fresh.failureNotice);

      const screws = await makeLid(cabled, SCREWS);
      expect(lipOutlines(solidOf(runtime, [screws.lid], created), 4, created)).toBe(2);
      expect(solidOf(runtime, screws.body, created).volume()).toBeCloseTo(solidOf(runtime, [fresh.group], created).volume(), 0);
      // The group with the cable's hole is the same group still, without the magnets' parts.
      const inner = (screws.body[0].groupedShapes ?? []).filter((part) => part.groupedShapes?.length);
      expect(inner).toHaveLength(1);
      expect(inner[0].name).toBe("Box");
      expect(JSON.stringify(inner[0]).includes("-magnet-")).toBe(false);
    } finally {
      Array.from(new Set(created)).forEach((value) => value.delete?.());
    }
  }, 240_000);
});
