import { beforeAll, describe, expect, it, vi } from "vitest";
import manifoldModule from "manifold-3d";
import { strFromU8, unzipSync } from "fflate";
import type { WorkplaneShape } from "@/types/layerling";
import { closedMeshVolume } from "@/lib/cadProfileExtrusion";
import { colorSeparatedExportMeshes, exportBodiesWithLooseHoles, unionOverlappingExportMeshes, visibleExportShapes } from "@/lib/editorBooleans";
import { meshForShape } from "@/lib/editorMeshCore";
import { layeredTextShape, nameTagSource } from "@/lib/editorTextTags";
import { meshBounds } from "@/lib/exportUnion";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { NAME_TAG_LAYERS, NAME_TAG_LETTER_SIZE } from "@/lib/nameTag";
import { loadTextFonts } from "@/lib/textFonts";
import { exportMeshesTo3mf } from "@/lib/threemfExport";
import { zUpToLayerling } from "@/lib/meshCoordinates";

/**
 * A name tag from the shape library, resized by its handles and exported (Issue #1899). The tag is a bundle of its
 * layers, each a text; the view stretches the layers' meshes to the bundle's size, but the export took the bundle
 * apart and built every layer again as a text in a stretched box. A text keeps its letters' proportions and its
 * outline's width, so the file held the tag at its old width, or every layer with letters of a size of its own: in
 * the slicer the text stood apart from its plate. The file is read back here and every layer measured against the
 * tag as it was before the resize, stretched as the view stretches it.
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

describe("a resized name tag in the 3MF export (Issue #1899)", () => {
  it("writes its three layers as they stand at the tag's own size", async () => {
    const bodies = await bodiesIn3mf([nameTag()]);
    expect(bodies.map((body) => body.color).sort()).toEqual([...LAYER_COLORS].sort());
  });

  it.each([
    ["twice as wide", [2, 1, 1]],
    ["half as deep and higher", [1, 1.5, 0.5]],
    ["larger all round", [2, 2, 2]],
    ["stretched differently every way", [1.6, 0.8, 2.4]],
  ] as const)("keeps every layer on the one below when the tag is %s", async (_label, stretch) => {
    const tag = nameTag();
    const before = await bodiesIn3mf([tag]);
    const after = await bodiesIn3mf([resized(tag, stretch)]);
    expect(after).toHaveLength(before.length);
    const [sx, sy, sz] = stretch;
    for (const color of LAYER_COLORS) {
      const was = before.find((body) => body.color === color)!;
      const is = after.find((body) => body.color === color)!;
      // The tag stands on the plate at the origin, so the stretch runs from x = 0, y = 0 and z = 0.
      expect(is.box.minX).toBeCloseTo(was.box.minX * sx, 3);
      expect(is.box.maxX).toBeCloseTo(was.box.maxX * sx, 3);
      expect(is.box.minY).toBeCloseTo(was.box.minY * sy, 3);
      expect(is.box.maxY).toBeCloseTo(was.box.maxY * sy, 3);
      expect(is.box.minZ).toBeCloseTo(was.box.minZ * sz, 3);
      expect(is.box.maxZ).toBeCloseTo(was.box.maxZ * sz, 3);
      expect(is.volume / was.volume).toBeCloseTo(sx * sy * sz, 3);
    }
  });

  it("fills the box the view draws for a resized tag that is turned and moved", async () => {
    const tag = resized(nameTag(), [1.8, 1, 1.2], { x: 25, z: -12, elevation: 3, rotation: 30 });
    const shown = meshBounds(meshForShape(tag).vertices)!;
    const bodies = await bodiesIn3mf([tag]);
    expect(bodies).toHaveLength(LAYER_COLORS.length);
    expect(Math.min(...bodies.map((body) => body.box.minX))).toBeCloseTo(shown.minX, 3);
    expect(Math.max(...bodies.map((body) => body.box.maxX))).toBeCloseTo(shown.maxX, 3);
    expect(Math.min(...bodies.map((body) => body.box.minY))).toBeCloseTo(shown.minY, 3);
    expect(Math.max(...bodies.map((body) => body.box.maxY))).toBeCloseTo(shown.maxY, 3);
    expect(Math.min(...bodies.map((body) => body.box.minZ))).toBeCloseTo(shown.minZ, 3);
    expect(Math.max(...bodies.map((body) => body.box.maxZ))).toBeCloseTo(shown.maxZ, 3);
  });

  it("writes the same resized tag into an STL", async () => {
    const tag = resized(nameTag(), [2, 1, 1]);
    const shown = meshBounds(meshForShape(tag).vertices)!;
    const { visible } = visibleExportShapes([tag]);
    const { solids, meshes, cut } = await exportBodiesWithLooseHoles(visible);
    const joined = await unionOverlappingExportMeshes(solids, meshes, cut);
    const boxes = joined.meshes.map((mesh) => meshBounds(mesh.vertices)!);
    expect(Math.min(...boxes.map((box) => box.minX))).toBeCloseTo(shown.minX, 3);
    expect(Math.max(...boxes.map((box) => box.maxX))).toBeCloseTo(shown.maxX, 3);
    expect(Math.min(...boxes.map((box) => box.minZ))).toBeCloseTo(shown.minZ, 3);
    expect(Math.max(...boxes.map((box) => box.maxZ))).toBeCloseTo(shown.maxZ, 3);
  });

  it("leaves the layers of a tag at its own size as the texts they are", () => {
    const { visible } = visibleExportShapes([nameTag()]);
    expect(visible.map((part) => part.kind)).toEqual(["text", "text", "text"]);
  });
});
