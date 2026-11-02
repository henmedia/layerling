import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import { cadLidSolid, type CadLidRequest } from "@/lib/cadLid";
import { shellSolid } from "@/lib/cadShell";

/*
 * The lid as an exact body (#1154): for a rounded box hollowed with its top open, every kind of lid comes out as one
 * valid solid whose rounded corners are cylinders, not facets, laid where it was asked to lie - and its top edge can
 * be rounded, which the mesh lid refused.
 */

let cad: OcctKernel;

beforeAll(async () => {
  const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
  cad = await OcctKernel.init({ wasm });
});

/** A 60 × 40 mm box 30 mm tall (y up) with its upright edges rounded to 6 mm, hollowed to 2 mm walls with its top open. */
function roundedTray(): ShapeHandle {
  const block = cad.translate(cad.makeBox(60, 30, 40), -30, 0, -20);
  const upright = cad.getSubShapes(block, "edge").filter((edge) => {
    const box = cad.getBoundingBox(edge);
    return box.ymax - box.ymin > 29;
  });
  return shellSolid(cad, cad.fillet(block, upright, 6), 2, "top");
}

const request = (type: CadLidRequest["type"], extra: Partial<CadLidRequest> = {}): CadLidRequest => ({
  type, thickness: 2, gap: 0.2, depth: 4, wall: 1.6, pockets: [], place: { x: 40, y: 0, z: -20 }, ...extra,
});

const surfaceKinds = (shape: ShapeHandle) => new Set(cad.getSubShapes(shape, "face").map((face) => cad.surfaceType(face)));

describe("an exact lid for a rounded box", () => {
  for (const type of ["plug", "cap", "both", "flat"] as const) {
    it(`builds a ${type} lid as one valid solid with round corners, where it was asked to lie`, () => {
      const lid = cadLidSolid(cad, roundedTray(), request(type));
      expect(lid).not.toBeNull();
      expect(cad.isValid(lid!)).toBe(true);
      expect(cad.getSubShapes(lid!, "solid")).toHaveLength(1);
      expect(surfaceKinds(lid!).has("cylinder")).toBe(true);
      const box = cad.getBoundingBox(lid!);
      expect(box.xmin).toBeCloseTo(40, 3);
      expect(box.ymin).toBeCloseTo(0, 3);
      expect(box.zmin).toBeCloseTo(-20, 3);
      const expectedHeight = type === "flat" ? 2 : 6;
      expect(box.ymax - box.ymin).toBeCloseTo(expectedHeight, 3);
    });
  }

  it("makes a plug lid the size of the box, with a lip that fits the opening with its gap", () => {
    const lid = cadLidSolid(cad, roundedTray(), request("plug"))!;
    const box = cad.getBoundingBox(lid);
    expect(box.xmax - box.xmin).toBeCloseTo(60, 3);
    expect(box.zmax - box.zmin).toBeCloseTo(40, 3);
    // Plate: the rounded outline, 2 mm. Lip: the opening (56 × 36, corners 4) set in by 0.2, a 1.6 mm ring, 4 mm deep.
    const plate = 2 * (60 * 40 - (4 - Math.PI) * 36);
    const ring = (w: number, d: number, r: number) => w * d - (4 - Math.PI) * r * r;
    const lip = 4 * (ring(55.6, 35.6, 3.8) - ring(52.4, 32.4, 2.2));
    expect(cad.getVolume(lid)).toBeCloseTo(plate + lip, 0);
  });

  it("lets the top edge of the lid be rounded", () => {
    const lid = cadLidSolid(cad, roundedTray(), request("plug"))!;
    // Turned over, the plate lies on the plate: its outer edge on top is the one at y = 2 round the outside.
    const box = cad.getBoundingBox(lid);
    const rimEdges = cad.getSubShapes(lid, "edge").filter((edge) => {
      const edgeBox = cad.getBoundingBox(edge);
      return Math.abs(edgeBox.ymin) < 1e-6 && Math.abs(edgeBox.ymax) < 1e-6
        && (Math.abs(edgeBox.xmin - box.xmin) < 6.01 || Math.abs(edgeBox.xmax - box.xmax) < 6.01 || Math.abs(edgeBox.zmin - box.zmin) < 6.01 || Math.abs(edgeBox.zmax - box.zmax) < 6.01);
    });
    expect(rimEdges.length).toBeGreaterThanOrEqual(8);
    const rounded = cad.fillet(lid, rimEdges, 1);
    expect(cad.isValid(rounded)).toBe(true);
    expect(cad.getVolume(rounded)).toBeLessThan(cad.getVolume(lid));
  });

  it("cuts the magnets' pockets into the plate's underside", () => {
    const plain = cadLidSolid(cad, roundedTray(), request("plug", { thickness: 3 }))!;
    const pockets = [[-22, -12], [22, -12], [22, 12], [-22, 12]].map(([x, z]) => ({ x, z, radius: 3.1, depth: 2.2, overcut: 1 }));
    const withPockets = cadLidSolid(cad, roundedTray(), request("plug", { thickness: 3, pockets }))!;
    expect(cad.isValid(withPockets)).toBe(true);
    expect(cad.getVolume(plain) - cad.getVolume(withPockets)).toBeCloseTo(4 * Math.PI * 3.1 * 3.1 * 2.2, 0);
  });

  it("gives up on a body closed at the top, so the mesh lid can say why", () => {
    expect(cadLidSolid(cad, cad.makeBox(20, 20, 20), request("plug"))).toBeNull();
  });
});
