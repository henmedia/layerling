import { beforeAll, describe, expect, it, vi } from "vitest";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import type { OcctKernel, ShapeHandle } from "occt-wasm";
import type { CadModifierEdge, CadModifierEnclosurePart, CadModifierMeshPart, CadModifierWorkerRequest, CadModifierWorkerResponse } from "@/lib/cadModifierTypes";
import type { WorkplaneShape } from "@/types/layerling";
import { cadModifierEnclosureForShape, cadProfileExpectation } from "@/lib/cadProfileExtrusion";
import { cadProfileSolidMismatch } from "@/lib/cadProfileSolid";
import { applyCadTransform } from "@/lib/cadModifierRuntime";
import { cadModifierPrimitiveForAnalyticShape } from "@/lib/cadBakeMetadata";
import { cadMeshHasOpenEdges } from "@/lib/cadMeshAccuracy";
import { enclosurePartSolid } from "@/lib/enclosureSolid";
import { screwBossCavityMesh, screwBossMesh, screwBossPlan, type ScrewBossFields } from "@/lib/screwBoss";
import { snapFitMesh, snapFitPlan, type SnapFitFields } from "@/lib/snapFit";
import { ribMesh, ribSize, type RibFields } from "@/lib/rib";
import { meshForShape } from "@/lib/editorMeshCore";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { stepSourceForShape } from "@/lib/stepExport";

/*
 * The screw boss, the snap-fit and the rib (#1246) as exact bodies, with the REAL OpenCascade kernel: each built from
 * its own fields (enclosureSolid.ts) against the mesh builder the editor draws it with, rounded, chamfered and hollowed
 * through the edge tool's worker from the exact body alone (no mesh sent along to fall back on), and written by the
 * STEP exporter as solids. A boss set as a hole is its pocket only, in the worker and in the file (#1288).
 *
 * The mesh has chords where the body is round. The boss's post and hole are drawn here with 1440 sides, which leaves
 * the one chord the mesh flattens the post with at each gusset's foot, all the way up from the gusset's top; the
 * rib's round top and the hook's fillet are a few chords. What those chords take or add is worked out, and the
 * volumes agree once it is counted in.
 */

// The exact kernel (Manifold) loads its files relative to the page; in node they are the public folder.
(globalThis as unknown as { window: unknown }).window = { location: { href: pathToFileURL(resolve("apps/web/public") + "/").href } };

vi.mock("@/lib/brepKernel", async () => {
  const brep = await import("brepjs");
  const { OcctKernel } = await import("occt-wasm");
  const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
  let ready: Promise<typeof brep> | null = null;
  let raw: Awaited<ReturnType<typeof OcctKernel.init>> | null = null;
  return {
    occtKernel: () => raw,
    dropOcctKernel: () => undefined,
    loadBrepWithOcct: () =>
      (ready ??= (async () => {
        const kernel = await OcctKernel.init({ wasm });
        raw = kernel;
        brep.registerKernel("occt-wasm", brep.OcctWasmAdapter.fromKernel(kernel));
        return brep;
      })()),
  };
});
// The edge tool's worker loads the kernel from its runtime folder: here the package's own.
vi.mock("@/lib/cadModifierRuntime", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/cadModifierRuntime")>()),
  CAD_MODIFIER_RUNTIME_BASE: pathToFileURL(dirname(fileURLToPath(import.meta.resolve("occt-wasm")))).href,
}));
vi.mock("occt-wasm", async (importOriginal) => {
  const original = await importOriginal<typeof import("occt-wasm")>();
  const init = original.OcctKernel.init.bind(original.OcctKernel);
  const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
  original.OcctKernel.init = ((options: object) => init({ ...options, wasm })) as typeof original.OcctKernel.init;
  return original;
});

type Self = { postMessage: (message: unknown) => void; onmessage: ((event: { data: CadModifierWorkerRequest }) => Promise<void>) | null };
const replies: CadModifierWorkerResponse[] = [];
const self: Self = { postMessage: (message) => replies.push(message as CadModifierWorkerResponse), onmessage: null };
(globalThis as unknown as { self: Self }).self = self;

let cad: OcctKernel;
let brep: typeof import("brepjs");
let exportShapesToStep: typeof import("@/lib/stepExport").exportShapesToStep;

beforeAll(async () => {
  brep = await import("brepjs");
  ({ exportShapesToStep } = await import("@/lib/stepExport"));
  const kernel = await import("@/lib/brepKernel");
  await kernel.loadBrepWithOcct();
  cad = kernel.occtKernel()!;
  vi.stubGlobal("WebAssembly", WebAssembly);
  await import("@/workers/cadModifier.worker");
});

let requestId = 0;
async function ask(request: Omit<CadModifierWorkerRequest, "requestId"> & { type: string }) {
  requestId += 1;
  const id = requestId;
  replies.length = 0;
  await self.onmessage!({ data: { ...request, requestId: id } as CadModifierWorkerRequest });
  const reply = replies.find((entry) => (entry as { requestId?: number }).requestId === id);
  if (!reply) throw new Error("no reply");
  if (reply.type === "error") throw new Error(reply.message);
  return reply;
}

type Kind = "screwBoss" | "snapFit" | "rib";

function make(kind: Kind, extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  const asset = toolbarShapeAssets.find((entry) => entry.kind === kind)!;
  return { ...makeShapeFromAsset(asset, { x: 0, z: 0 }), id: kind, elevation: 0, ...extra } as WorkplaneShape;
}

function enclosurePart(shape: WorkplaneShape) {
  const part = cadModifierEnclosureForShape(shape);
  expect(part).not.toBeNull();
  return part!;
}

/** A circular segment's area: what a chord across `angle` of a circle of `radius` cuts off. */
const segment = (radius: number, angle: number) => (radius * radius * (angle - Math.sin(angle))) / 2;

/**
 * The mesh builder's volume for the fields the body was built from, with what its chords leave out or add counted in:
 * the boss's chord across each gusset's foot, from the gusset's top up; the hook's fillet and the rib's round top.
 */
function meshVolumeRounded(part: CadModifierEnclosurePart) {
  if (part.kind === "screwBoss") {
    const fields = part.fields as ScrewBossFields;
    if (fields.hole) return screwBossCavityMesh(fields, 1440).mesh.orient().volume();
    const plan = screwBossPlan(fields);
    const flats = plan.gussets * segment(plan.radius, 2 * Math.asin(plan.gussetHalf / plan.radius)) * (plan.height - plan.gussetHeight);
    return screwBossMesh(fields, 1440).mesh.orient().volume() + flats;
  }
  if (part.kind === "snapFit") {
    const plan = snapFitPlan(part.fields as SnapFitFields);
    const filleted = plan.part !== "catch" && plan.foot > 0 && plan.armBack + plan.depth / 2 > plan.fillet + 0.2;
    // The fillet's six chords lie inside its circle: the mesh holds that sliver more.
    const fillet = filleted ? 6 * segment(plan.fillet, Math.PI / 12) * plan.width : 0;
    return snapFitMesh(part.fields as SnapFitFields).mesh.volume() - fillet;
  }
  const { style, top, width, height, thickness, foot } = ribSize(part.fields as RibFields);
  // The round top stands on the foot's top, where there is one.
  const round = style === "straight" && top === "round" && height - (foot?.thickness ?? 0) > thickness / 2 + 0.1 ? 12 * segment(thickness / 2, Math.PI / 12) * width : 0;
  // Turned outward first: a gusset on its foot is built face by face, each face's turn left to orient().
  return ribMesh(part.fields as RibFields).orient().volume() + round;
}

function solidsOf(shape: ShapeHandle) {
  return cad.isSolid(shape) ? [shape] : cad.getSubShapes(shape, "solid");
}

function displayExpectation(shape: WorkplaneShape) {
  const mesh = meshForShape(shape);
  return cadProfileExpectation(mesh.vertices, mesh.faces);
}

/** The part as the edge tool sends it: its fields and the display mesh's bounds and volume, without the mesh to fall back on. */
function exactOnly(shape: WorkplaneShape): CadModifierMeshPart {
  return { enclosure: { ...enclosurePart(shape), expected: displayExpectation(shape) }, hole: Boolean(shape.hole) };
}

function previewVolume(preview: CadModifierWorkerResponse) {
  if (preview.type !== "preview") throw new Error("no preview");
  const body = cad.fromBREP(preview.brep);
  expect(cad.isValid(body)).toBe(true);
  const volume = cad.getVolume(body);
  cad.release(body);
  return volume;
}

/** The prepared body's edges that lie wholly where `on` says, by their points. */
function edgesWhere(ready: CadModifierWorkerResponse, on: (x: number, y: number, z: number) => boolean) {
  if (ready.type !== "ready") throw new Error("not ready");
  return ready.edges.filter((edge: CadModifierEdge) => edge.selectable && edge.points.length >= 6 && Array.from({ length: edge.points.length / 3 }, (_, i) => i).every((i) => on(edge.points[i * 3], edge.points[i * 3 + 1], edge.points[i * 3 + 2])));
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-3;
const GUSSETED = { width: 18, depth: 18, size: 18, height: 12, screwBossDiameter: 8 };
/** A rib on its foot (Discussion #1307): 0.8 mm thick on a foot 2.4 mm wide, the foot as thick as it starts. */
const ON_FOOT = { ribFoot: true, ribThickness: 0.8, depth: 2.4 };
const GUSSET_ON_FOOT = { ribStyle: "gusset", width: 10, height: 12, ribFoot: true, ribThickness: 1.6, depth: 4.8 } as const;
const K30 = { screwBossFastener: "selfTapping", screwBossSize: "K30" } as const;

describe("the enclosure parts as exact bodies (#1246)", () => {
  it.each<[string, Kind, Partial<WorkplaneShape>, number]>([
    ["M3 insert boss", "screwBoss", {}, 1],
    ["boss with three gussets", "screwBoss", { ...GUSSETED, screwBossGussets: 3 }, 1],
    ["boss with four gussets", "screwBoss", { ...GUSSETED, screwBossGussets: 4 }, 1],
    ["boss with six thin gussets", "screwBoss", { ...GUSSETED, screwBossGussets: 6, screwBossGussetThickness: 1.2 }, 1],
    ["boss with a hole going through", "screwBoss", { height: 5, ...K30 }, 1],
    ["boss with gussets and a hole going through", "screwBoss", { ...GUSSETED, height: 6, screwBossGussets: 4, ...K30 }, 1],
    ["boss with a hole too wide for a chamfer", "screwBoss", { screwBossFastener: "custom", screwBossHole: 7.2, screwBossHoleDepth: 6 }, 1],
    ["boss with three gussets, turned, tipped and lifted", "screwBoss", { ...GUSSETED, screwBossGussets: 3, rotation: 30, rotationX: 90, x: 12, z: -5, elevation: 4 }, 1],
    ["boss as a hole", "screwBoss", { hole: true }, 1],
    ["boss with gussets as a hole", "screwBoss", { ...GUSSETED, screwBossGussets: 4, hole: true }, 1],
    ["boss as a hole going through", "screwBoss", { height: 5, ...K30, hole: true }, 1],
    ["hook and catch", "snapFit", {}, 2],
    ["hook alone", "snapFit", { snapFitPart: "hook" }, 1],
    ["catch alone", "snapFit", { snapFitPart: "catch", width: 8, height: 1.6, depth: 1 }, 1],
    ["hook and catch that let go at 45 degrees", "snapFit", { snapFitRetainAngle: 45 }, 2],
    ["steep hook with more undercut and clearance", "snapFit", { snapFitLeadAngle: 45, snapFitUndercut: 1.5, snapFitClearance: 0.5 }, 2],
    ["hook without a foot", "snapFit", { snapFitPart: "hook", snapFitFoot: 0, depth: 3 }, 1],
    ["mirrored and turned hook and catch", "snapFit", { mirrorX: true, rotation: 45, rotationZ: 180, elevation: 20 }, 2],
    ["flat rib", "rib", {}, 1],
    ["rib with a round top", "rib", { ribTop: "round" }, 1],
    ["rib with a chamfered top", "rib", { ribTop: "chamfer" }, 1],
    ["gusset", "rib", { ribStyle: "gusset", width: 10, height: 12 }, 1],
    ["gusset mirrored front to back and turned", "rib", { ribStyle: "gusset", width: 10, height: 12, mirrorX: true, rotation: 90 }, 1],
    ["thin rib on its foot", "rib", ON_FOOT, 1],
    ["rib on its foot with a round top", "rib", { ...ON_FOOT, ribTop: "round", ribThickness: 1.2, depth: 4 }, 1],
    ["rib on a thick foot with a chamfered top, turned and lifted", "rib", { ...ON_FOOT, ribTop: "chamfer", ribFootThickness: 2, rotation: 30, elevation: 3 }, 1],
    ["gusset ending in its foot", "rib", GUSSET_ON_FOOT, 1],
    ["gusset standing on a thin foot to its tip, mirrored and turned", "rib", { ...GUSSET_ON_FOOT, ribFootThickness: 0.4, mirrorX: true, rotation: 90 }, 1],
  ])("builds the %s as a valid closed solid of its mesh's volume", (_name, kind, extra, count) => {
    const shape = make(kind, extra);
    const part = enclosurePart(shape);
    const local = enclosurePartSolid(cad, part);
    expect(cad.isValid(local)).toBe(true);
    const solids = solidsOf(local);
    expect(solids).toHaveLength(count);
    for (const solid of solids) expect(cadMeshHasOpenEdges(cad.tessellate(solid, { linearDeflection: 0.02, angularDeflection: 0.2 }))).toBe(false);
    const volume = cad.getVolume(local);
    expect(Math.abs(volume - meshVolumeRounded(part)) / volume).toBeLessThan(1e-4);
    // Placed as the editor places the mesh, it agrees with what the editor draws: the worker's own check.
    expect(cadProfileSolidMismatch(cad, applyCadTransform(cad, local, part.transform), displayExpectation(shape))).toBeNull();
    expect(stepSourceForShape(shape)).toBe("enclosure");
  });

  it("makes the boss's post, hole and chamfer true cylinders and a cone, and its gussets flat", () => {
    const solid = enclosurePartSolid(cad, enclosurePart(make("screwBoss", { ...GUSSETED, screwBossGussets: 4 })));
    const types = cad.getSubShapes(solid, "face").map((face) => cad.surfaceType(face));
    expect(types.filter((type) => type === "cylinder").length).toBeGreaterThanOrEqual(2);
    expect(types.filter((type) => type === "cone")).toHaveLength(1);
    expect(types.every((type) => type === "plane" || type === "cylinder" || type === "cone")).toBe(true);
  });
});

describe("the edge tool on the enclosure parts' exact bodies", () => {
  it("rounds the rim round the top of a boss with gussets, and hollows a boss", async () => {
    const shape = make("screwBoss", { ...GUSSETED, screwBossGussets: 4 });
    const ready = await ask({ type: "prepare", parts: [exactOnly(shape)], sharpAngle: 25 });
    // An exact body: the top's outer rim is one round edge or two, not the 48 short ones of the mesh.
    const rim = edgesWhere(ready, (x, y, z) => near(y, 12) && near(Math.hypot(x, z), 4));
    expect(rim.length).toBeGreaterThanOrEqual(1);
    expect(rim.length).toBeLessThanOrEqual(2);
    const before = cad.getVolume(enclosurePartSolid(cad, enclosurePart(shape)));
    const rounded = previewVolume(await ask({ type: "preview", kind: "fillet", edgeIds: rim.map((edge) => edge.id), amount: 0.8, quality: "standard", chamferAngle: 45 }));
    // A 0.8 mm rounding takes (1 - pi/4) r^2 of the section all round the rim.
    const taken = (1 - Math.PI / 4) * 0.8 * 0.8 * 2 * Math.PI * (4 - 0.8 * (1 - 2 / (3 * (4 - Math.PI))));
    expect(Math.abs(before - rounded - taken) / taken).toBeLessThan(0.02);

    await ask({ type: "prepare", parts: [exactOnly(make("screwBoss"))], sharpAngle: 25 });
    const plain = cad.getVolume(enclosurePartSolid(cad, enclosurePart(make("screwBoss"))));
    const hollow = previewVolume(await ask({ type: "preview", kind: "shell", edgeIds: [], amount: 0.6, quality: "standard", chamferAngle: 45, shellOpenings: "bottom" }));
    expect(hollow).toBeLessThan(plain * 0.9);
    expect(hollow).toBeGreaterThan(plain * 0.3);
  });

  it("rounds the top edges of a rib and hollows it open at the bottom", async () => {
    const shape = make("rib");
    const ready = await ask({ type: "prepare", parts: [exactOnly(shape)], sharpAngle: 25 });
    // The two long edges of the top, not the short ones across its ends.
    const top = edgesWhere(ready, (_x, y, z) => near(y, 8) && near(Math.abs(z), 0.8)).filter((edge) => Math.abs(edge.points[0] - edge.points[edge.points.length - 3]) > 39);
    expect(top).toHaveLength(2);
    const rounded = previewVolume(await ask({ type: "preview", kind: "fillet", edgeIds: top.map((edge) => edge.id), amount: 0.5, quality: "standard", chamferAngle: 45 }));
    expect(rounded).toBeCloseTo(512 - 2 * (1 - Math.PI / 4) * 0.25 * 40, 3);
    const hollow = previewVolume(await ask({ type: "preview", kind: "shell", edgeIds: [], amount: 0.4, quality: "standard", chamferAngle: 45, shellOpenings: "bottom" }));
    expect(hollow).toBeCloseTo(512 - 39.2 * 7.6 * 0.8, 3);
  });

  it("rounds the corners where a rib meets its foot", async () => {
    // The 45 degree fillet one might want there: the edge tool makes it on the exact body, a round one too.
    const shape = make("rib", ON_FOOT);
    const ready = await ask({ type: "prepare", parts: [exactOnly(shape)], sharpAngle: 25 });
    const roots = edgesWhere(ready, (_x, y, z) => near(y, 0.8) && near(Math.abs(z), 0.4)).filter((edge) => Math.abs(edge.points[0] - edge.points[edge.points.length - 3]) > 39);
    expect(roots).toHaveLength(2);
    const before = cad.getVolume(enclosurePartSolid(cad, enclosurePart(shape)));
    expect(before).toBeCloseTo(40 * (0.8 * 7.2 + 2.4 * 0.8), 6);
    const rounded = previewVolume(await ask({ type: "preview", kind: "fillet", edgeIds: roots.map((edge) => edge.id), amount: 0.4, quality: "standard", chamferAngle: 45 }));
    // A concave rounding fills (1 - pi/4) r^2 of the section along each corner.
    expect(rounded).toBeCloseTo(before + 2 * (1 - Math.PI / 4) * 0.16 * 40, 3);
  });

  it("chamfers the back of the snap-fit hook's foot", async () => {
    const shape = make("snapFit");
    const ready = await ask({ type: "prepare", parts: [exactOnly(shape)], sharpAngle: 25 });
    const back = edgesWhere(ready, (_x, y, z) => near(y, 16) && near(z, -4.5));
    expect(back).toHaveLength(1);
    const before = cad.getVolume(enclosurePartSolid(cad, enclosurePart(shape)));
    const chamfered = previewVolume(await ask({ type: "preview", kind: "chamfer", edgeIds: back.map((edge) => edge.id), amount: 0.5, quality: "standard", chamferAngle: 45 }));
    expect(chamfered).toBeCloseTo(before - 0.5 * 0.5 * 0.5 * 8, 3);
  });

  it("cuts only a boss's pocket from a block when the boss is a hole (#1288)", async () => {
    const block = { id: "block", name: "block", kind: "box", color: "#d41721", x: 0, z: 0, elevation: 0, size: 20, width: 20, depth: 20, height: 10, rotation: 0 } as unknown as WorkplaneShape;
    const boss = make("screwBoss", { hole: true, screwBossGussets: 4, width: 18, depth: 18, size: 18 });
    const pocket = cad.getVolume(enclosurePartSolid(cad, enclosurePart(boss)));
    // The M3 insert's hole with its chamfer, some 86 mm³; the post with its gussets would take several hundred.
    expect(pocket).toBeGreaterThan(75);
    expect(pocket).toBeLessThan(90);
    await ask({ type: "prepare", parts: [{ primitive: cadModifierPrimitiveForAnalyticShape(block)!, hole: false }, exactOnly(boss)], sharpAngle: 25 });
    expect(previewVolume(await ask({ type: "preview", kind: "exact", edgeIds: [], amount: 1, quality: "standard", chamferAngle: 45 }))).toBeCloseTo(4000 - pocket, 3);
  });
});

describe("the enclosure parts in a STEP file", () => {
  async function reimported(blob: Blob) {
    const result = await brep.importSTEP(blob);
    if (!result.ok) throw new Error(`reimport failed: ${String(result.error?.message ?? result.error)}`);
    const volume = brep.measureVolume(result.value);
    if (!volume.ok) throw new Error("measureVolume failed");
    return volume.value;
  }

  it.each<[string, Kind, Partial<WorkplaneShape>, number]>([
    ["boss with gussets", "screwBoss", { ...GUSSETED, screwBossGussets: 4 }, 1],
    ["hook and catch", "snapFit", {}, 2],
    ["rib with a round top", "rib", { ribTop: "round" }, 1],
    ["gusset", "rib", { ribStyle: "gusset", width: 10, height: 12, rotation: 30, x: 5 }, 1],
    ["rib on its foot with a round top", "rib", { ...ON_FOOT, ribTop: "round" }, 1],
    ["gusset on its foot", "rib", { ...GUSSET_ON_FOOT, rotation: 30, x: 5 }, 1],
  ])("writes the %s as exact solids", async (_name, kind, extra, count) => {
    const shape = make(kind, extra);
    const { blob, exportedCount, skipped } = await exportShapesToStep([shape]);
    expect(skipped).toEqual([]);
    expect(exportedCount).toBe(1);
    const text = await blob.text();
    expect(text.match(/MANIFOLD_SOLID_BREP/g)?.length).toBe(count);
    const volume = cad.getVolume(enclosurePartSolid(cad, enclosurePart(shape)));
    expect(Math.abs((await reimported(blob)) - volume) / volume).toBeLessThan(1e-4);
  });

  it("cuts only the pocket of a boss set as a hole from the block it is grouped with (#1288)", async () => {
    const block = { id: "block", name: "block", kind: "box", color: "#d41721", x: 0, z: 0, elevation: 0, size: 20, width: 20, depth: 20, height: 10, rotation: 0 } as unknown as WorkplaneShape;
    const boss = make("screwBoss", { hole: true });
    const { blob, exportedCount, skipped } = await exportShapesToStep([block, boss]);
    expect(skipped).toEqual([]);
    expect(exportedCount).toBe(1);
    const pocket = cad.getVolume(enclosurePartSolid(cad, enclosurePart(boss)));
    expect(Math.abs(pocket - screwBossCavityMesh(enclosurePart(boss).fields as ScrewBossFields, 1440).mesh.orient().volume()) / pocket).toBeLessThan(1e-4);
    expect((await reimported(blob)) / (4000 - pocket)).toBeCloseTo(1, 5);
  });
});
