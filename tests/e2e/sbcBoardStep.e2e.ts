import { beforeAll, describe, expect, it, vi } from "vitest";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import { portContourPoints } from "@/lib/portGeometry";
import { SBC_BOARDS, SBC_BOARD_ORDER, sbcBoardSolids, type SbcSolid } from "@/lib/sbcBoards";

/*
 * The SBC board (#1098) through the REAL STEP exporter and the REAL OpenCascade kernel: every part
 * goes out as an exact body - nothing skipped - and the file holds the drilled board and the
 * parts, volume for volume.
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
    loadBrepWithOcct: () =>
      (ready ??= (async () => {
        const kernel = await OcctKernel.init({ wasm });
        raw = kernel;
        brep.registerKernel("occt-wasm", brep.OcctWasmAdapter.fromKernel(kernel));
        return brep;
      })()),
  };
});

let brep: typeof import("brepjs");
let exportShapesToStep: typeof import("@/lib/stepExport").exportShapesToStep;
let sbcBoardShape: typeof import("@/lib/editorSbcBoard").sbcBoardShape;

beforeAll(async () => {
  brep = await import("brepjs");
  ({ exportShapesToStep } = await import("@/lib/stepExport"));
  ({ sbcBoardShape } = await import("@/lib/editorSbcBoard"));
  const { loadBrepWithOcct } = await import("@/lib/brepKernel");
  await loadBrepWithOcct();
});

/** A solid's exact volume: a box, or a socket's outline (drawn finely enough to stand for the exact one) times its length. */
function solidVolume(solid: SbcSolid) {
  const alongX = solid.profile?.along === "x";
  const across = alongX ? solid.y1 - solid.y0 : solid.x1 - solid.x0;
  const length = alongX ? solid.x1 - solid.x0 : solid.y1 - solid.y0;
  const height = solid.top - solid.bottom;
  if (!solid.profile) return across * length * height;
  const points = portContourPoints(across, height, solid.profile.corner, 4096, solid.profile.portProfile);
  const area = Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0)) / 2;
  return area * length;
}

async function reimportVolume(blob: Blob): Promise<number> {
  const r = await brep.importSTEP(blob);
  if (!r.ok) throw new Error(`reimport failed: ${String(r.error?.message ?? r.error)}`);
  const v = brep.measureVolume(r.value);
  if (!v.ok) throw new Error("measureVolume failed");
  return v.value;
}

describe("the SBC board as a STEP file", () => {
  it.each(SBC_BOARD_ORDER)("exports %s exactly, the holes through the board only", async (type) => {
    const board = SBC_BOARDS[type];
    const shape = await sbcBoardShape({ board: type, clearance: 0.3, reach: 3 }, 250_000);
    const { blob, exportedCount, skipped } = await exportShapesToStep([shape]);
    expect(skipped).toEqual([]);
    expect(exportedCount).toBeGreaterThanOrEqual(1);
    // The rounded plate less its holes, and every part on it: the parts stand on the board, touching but not overlapping.
    const plate = (board.width * board.depth - (4 - Math.PI) * board.cornerRadius ** 2 - board.holes.length * Math.PI * (board.holeDiameter / 2) ** 2) * board.thickness;
    const parts = sbcBoardSolids(board, 0.3, 3).reduce((sum, solid) => sum + solidVolume(solid), 0);
    const volume = await reimportVolume(blob);
    expect(Math.abs(volume - (plate + parts)) / (plate + parts)).toBeLessThan(1e-3);
  });
});
