import { beforeAll, describe, expect, it, vi } from "vitest";
import manifoldModule from "manifold-3d";
import { strFromU8, unzipSync } from "fflate";
import type { WorkplaneShape } from "@/types/layerling";
import { closedMeshVolume } from "@/lib/cadProfileExtrusion";
import { buildGroupedShapeFromSelection, restoreGroupedChildren, colorSeparatedExportMeshes, exportFaceColors, multicolorExportSolids, exportBodiesWithLooseHoles, unionOverlappingExportMeshes, visibleExportShapes } from "@/lib/editorBooleans";
import { meshForShape } from "@/lib/editorMeshCore";
import { layeredTextShape, nameTagSource } from "@/lib/editorTextTags";
import { meshBounds } from "@/lib/exportUnion";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { NAME_TAG_LAYERS, NAME_TAG_LETTER_SIZE } from "@/lib/nameTag";
import { loadTextFonts } from "@/lib/textFonts";
import { exportMeshesTo3mf } from "@/lib/threemfExport";
import { zUpToLayerling } from "@/lib/meshCoordinates";

/**
 * A resized name tag grouped with holes for magnets (Issue #2192): the cut took the bundle apart and built every layer
 * again as a text, whose letters keep their proportions, so a tag pulled to 100 x 50 mm came out 100 x 26.6 mm.
 */
const kernel = vi.hoisted(() => ({ runtime: null as Promise<unknown> | null }));
vi.mock("@/lib/editorMeshCore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/editorMeshCore")>()),
  getManifoldRuntime: () => kernel.runtime,
}));
beforeAll(async () => {
  kernel.runtime = manifoldModule().then((runtime) => { runtime.setup(); rememberManifoldRuntime(runtime); return runtime; });
  await kernel.runtime;
  await loadTextFonts();
});

/** The name tag as the shape library places it: the word in the default layers, white letters on red on black. */
function nameTag(): WorkplaneShape {
  const text = { id: "tag", name: "Text", kind: "text", color: "#ffffff", x: 0, z: 0, elevation: 0, rotation: 0, width: 60, depth: 20, size: 60, height: 1.2, text: "Name", font: "Sans" } as WorkplaneShape;
  return layeredTextShape(nameTagSource(text, { text: "Name", letterSize: NAME_TAG_LETTER_SIZE }), NAME_TAG_LAYERS, [], text.id, { locked: false, hidden: false, name: "Text" });
}

/** The tag pulled to other sizes by its handles: only its own width, depth and height change. */
function resized(tag: WorkplaneShape, [sx, sy, sz]: readonly [number, number, number], extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  const width = tag.width! * sx;
  const depth = tag.depth! * sz;
  return { ...tag, width, depth, height: tag.height * sy, size: Math.max(width, depth), ...extra };
}

type Body = { color: string; box: NonNullable<ReturnType<typeof meshBounds>>; volume: number };

/**
 * The bodies of the 3MF the export window writes for these shapes, read back from the file as a slicer composes it:
 * every object of the build with its own vertices, in the colour its material names. layerling writes each body where
 * it stands, so no object and no build item may carry a transform or be made of components.
 */
async function bodiesIn3mf(shapes: WorkplaneShape[]): Promise<Body[]> {
  const { visible } = visibleExportShapes(shapes);
  const { solids, meshes, cut } = await exportBodiesWithLooseHoles(visible, { painted: true });
  const separated = await colorSeparatedExportMeshes(solids, meshes, cut);
  const bytes = exportMeshesTo3mf(separated.meshes.map((mesh, index) => ({ ...mesh, name: solids[separated.quellen[index]].name, color: solids[separated.quellen[index]].color })));
  const model = strFromU8(unzipSync(bytes)["3D/3dmodel.model"]);
  expect(model).not.toMatch(/transform=|<components/);
  const colors = [...model.matchAll(/<base [^>]*displaycolor="([^"]+)"/g)].map((match) => match[1].toLowerCase());
  const built = [...model.matchAll(/<item objectid="(\d+)"\/>/g)].map((match) => match[1]);
  const objects = [...model.matchAll(/<object id="(\d+)"[^>]* pindex="(\d+)">(.*?)<\/object>/g)];
  expect(built).toEqual(objects.map((match) => match[1]));
  return objects.map(([, , pindex, mesh]) => {
    const vertices = [...mesh.matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"\/>/g)].map((match) => zUpToLayerling([Number(match[1]), Number(match[2]), Number(match[3])]));
    const faces = [...mesh.matchAll(/<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"/g)].map((match) => [Number(match[1]), Number(match[2]), Number(match[3])] as [number, number, number]);
    return { color: colors[Number(pindex)], box: meshBounds(vertices)!, volume: Math.abs(closedMeshVolume(vertices, faces)) };
  });
}

const LAYER_COLORS = NAME_TAG_LAYERS.map((layer) => layer.color.toLowerCase());

/** The colours the export paints a cut group's faces in, as the export window works them out for its 3MF. */
async function paintedColors(group: WorkplaneShape) {
  const { visible } = visibleExportShapes([group]);
  const { solids, meshes, cut } = await exportBodiesWithLooseHoles(visible, { painted: true });
  const joined = await colorSeparatedExportMeshes(solids, meshes, cut);
  const found = new Set<string>();
  joined.meshes.forEach((mesh, index) => {
    const source = solids[joined.quellen[index]];
    const probes = multicolorExportSolids(source);
    (probes ? exportFaceColors(mesh, probes, source.color) : [source.color]).forEach((color) => found.add(color.toLowerCase()));
  });
  return [...found].sort();
}

const hole = (id: string, x: number) => ({ id, name: "Hole", kind: "cylinder", hole: true, color: "#888888", x, z: 0, elevation: -2, rotation: 0, width: 3, depth: 3, size: 3, height: 20 } as WorkplaneShape);

const boxOf = (shape: WorkplaneShape) => meshBounds(meshForShape(shape).vertices)!;

describe("a resized name tag in a group (Issue #2192)", () => {
  const stretches = [["deeper only", [1, 1, 2]], ["wider only", [1.6, 1, 1]], ["stretched differently every way", [1.6, 0.8, 2.4]]] as const;

  it.each(stretches)("keeps its size when grouped with holes, %s", async (_label, stretch) => {
    const tag = resized(nameTag(), stretch);
    const shown = boxOf(tag);
    const { group } = await buildGroupedShapeFromSelection([tag, hole("h1", -3), hole("h2", 3)], 200_000);
    expect(group).toBeTruthy();
    const made = boxOf(group!);
    expect(made.maxX - made.minX).toBeCloseTo(shown.maxX - shown.minX, 2);
    expect(made.maxZ - made.minZ).toBeCloseTo(shown.maxZ - shown.minZ, 2);
    expect(made.maxY - made.minY).toBeCloseTo(shown.maxY - shown.minY, 2);
    // With Multicolor on, the layers keep their colours.
    expect(await paintedColors({ ...group!, multicolor: true })).toEqual([...LAYER_COLORS].sort());
    const bodies = await bodiesIn3mf([group!]);
    expect(Math.min(...bodies.map((body) => body.box.minZ))).toBeCloseTo(shown.minZ, 2);
    expect(Math.max(...bodies.map((body) => body.box.maxZ))).toBeCloseTo(shown.maxZ, 2);
    // The holes took something away.
    const whole = await bodiesIn3mf([tag]);
    const sum = (list: Body[]) => list.reduce((total, body) => total + body.volume, 0);
    expect(sum(bodies)).toBeLessThan(sum(whole));
  });

  it("is still the resized name tag when the group is taken apart", async () => {
    const tag = resized(nameTag(), [1, 1, 2]);
    const { group } = await buildGroupedShapeFromSelection([tag, hole("h1", 0)], 200_000);
    const back = restoreGroupedChildren(group!).find((part) => !part.hole)!;
    expect(back.groupOperation).toBe("bundle");
    expect(back.groupedShapes?.map((part) => part.kind)).toEqual(["text", "text", "text"]);
    expect(back.width).toBeCloseTo(tag.width!, 2);
    expect(back.depth).toBeCloseTo(tag.depth!, 2);
  });

  it("keeps its size in a group without holes", async () => {
    const tag = resized(nameTag(), [1, 1, 2]);
    const shown = boxOf(tag);
    const beside = { ...hole("c", 80), hole: false, kind: "cylinder", elevation: 0, height: 2 } as WorkplaneShape;
    const { group } = await buildGroupedShapeFromSelection([tag, beside], 200_000);
    const made = boxOf(group!);
    expect(made.maxZ - made.minZ).toBeCloseTo(shown.maxZ - shown.minZ, 2);
    const bodies = await bodiesIn3mf([group!]);
    expect(Math.min(...bodies.map((body) => body.box.minZ))).toBeCloseTo(shown.minZ, 2);
    expect(Math.max(...bodies.map((body) => body.box.maxZ))).toBeCloseTo(shown.maxZ, 2);
  });

  it("is cut as before at its own size", async () => {
    const tag = nameTag();
    const shown = boxOf(tag);
    const { group } = await buildGroupedShapeFromSelection([tag, hole("h1", 0)], 200_000);
    const made = boxOf(group!);
    expect(made.maxX - made.minX).toBeCloseTo(shown.maxX - shown.minX, 2);
    expect(made.maxZ - made.minZ).toBeCloseTo(shown.maxZ - shown.minZ, 2);
  });
});
