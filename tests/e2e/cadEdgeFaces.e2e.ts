import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import manifoldModule from "manifold-3d";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import type { WorkplaneShape } from "@/types/layerling";
import { edgeFaceMap } from "@/lib/cadEdgeFaces";
import { cadModifierGridfinityForShape, cadModifierProfileForShape, textGlyphProfiles } from "@/lib/cadProfileExtrusion";
import { profileExtrusionSolid } from "@/lib/cadProfileSolid";
import { gridfinityPartSolid } from "@/lib/gridfinitySolid";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { loadTextFonts } from "@/lib/textFonts";

/*
 * The edge tool reads the faces round each edge from each face's own edges, no longer from the kernel's
 * `edgeToFaceMap` (#1812). Both must give the same faces in the same order, so a kernel update that changes the faces
 * or their order shows up here.
 */

const HASH_UPPER_BOUND = 2_147_483_647;

/** The kernel's map: edge hash, face count, face hashes, again and again; an edge can come more than once. */
function kernelEdgeFaceMap(cad: OcctKernel, shape: ShapeHandle) {
  const values = cad.edgeToFaceMap(shape, HASH_UPPER_BOUND);
  const map = new Map<number, number[]>();
  for (let index = 0; index + 1 < values.length; ) {
    const edgeHash = values[index++];
    const count = values[index++];
    const faces = values.slice(index, index + count);
    index += count;
    const current = map.get(edgeHash) ?? [];
    faces.forEach((hash) => {
      if (!current.includes(hash)) current.push(hash);
    });
    map.set(edgeHash, current);
  }
  return map;
}

function shape(kind: WorkplaneShape["kind"], extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id: `test-${kind}`, name: kind, kind, x: 0, z: 0, elevation: 0, size: 40, width: 40, depth: 40, height: 10, rotation: 0, color: "#ff8800", ...extra } as WorkplaneShape;
}

describe("the faces round each edge", () => {
  let cad: OcctKernel;

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    cad = await OcctKernel.init({ wasm });
    await loadTextFonts();
    const runtime = await manifoldModule();
    runtime.setup();
    rememberManifoldRuntime(runtime);
  });

  function expectSameMap(name: string, body: ShapeHandle) {
    const map = edgeFaceMap(cad, cad.getSubShapes(body, "face"));
    expect(map.size, name).toBeGreaterThan(0);
    expect(map, name).toEqual(kernelEdgeFaceMap(cad, body));
  }

  it("match the kernel's on plain bodies, a cut, a join, a fillet, two parts and an imported mesh", () => {
    const box = () => cad.makeBox(20, 10, 5);
    expectSameMap("box", box());
    expectSameMap("cylinder", cad.makeCylinder(5, 10));
    expectSameMap("sphere", cad.makeSphere(6));
    expectSameMap("torus", cad.makeTorus(8, 2));
    expectSameMap("box with a hole", cad.cut(box(), cad.translate(cad.makeCylinder(2, 20), 10, 5, -5)));
    expectSameMap("two boxes joined", cad.fuse(box(), cad.translate(cad.makeBox(5, 5, 15), 2, 2, 0)));
    const filleted = box();
    expectSameMap("box with four rounded edges", cad.fillet(filleted, cad.getSubShapes(filleted, "edge").slice(0, 4), 1));
    expectSameMap("two parts", cad.makeCompound([box(), cad.translate(cad.makeCylinder(4, 8), 40, 0, 0)]));
    expectSameMap("imported mesh", cad.importStl(cad.exportStl(cad.makeSphere(6), 0.1, true)));
  });

  it("match the kernel's on a honeycomb plate, a text and a Gridfinity bin with a lettered label", () => {
    const plate = shape("honeycomb", { width: 80, depth: 80, height: 3, honeycombCellSize: 8, honeycombWallThickness: 1.6, honeycombFrameWidth: 3 });
    expectSameMap("honeycomb plate", profileExtrusionSolid(cad, cadModifierProfileForShape(plate)!));
    const glyphs = textGlyphProfiles(shape("text", { text: "Pécs", font: "Sans", width: 60, depth: 20, height: 5 }))!;
    expectSameMap("text", cad.makeCompound(glyphs.map((glyph) => profileExtrusionSolid(cad, glyph.profile!))));
    const bin = shape("gridfinity", { size: 83.5, width: 83.5, depth: 41.5, height: 25.4, gridfinityType: "bin", gridfinityLip: true, gridfinityLabelBack: true, gridfinityLabelBackText: "M3 NUTS" });
    expectSameMap("labelled bin", gridfinityPartSolid(cad, cadModifierGridfinityForShape(bin)!));
  });
});
