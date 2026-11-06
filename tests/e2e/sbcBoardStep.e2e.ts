import { beforeAll, describe, expect, it, vi } from "vitest";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import { portContourPoints } from "@/lib/portGeometry";
import { SBC_BOARDS, SBC_BOARD_ORDER, sbcBoardSolids, sbcHoleDiameter, type SbcBoard, type SbcSolid } from "@/lib/sbcBoards";

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

/**
 * The board's outline, without its holes: the rounded rectangle, or for the UNO its rounded plate
 * (three corners round, the cut one sharp before it is cut) with the step and the cut corner, as
 * Arduino's PCB file draws them.
 */
function plateArea(board: SbcBoard) {
  if (!board.outline) return board.width * board.depth - (4 - Math.PI) * board.cornerRadius ** 2;
  if (board.type === "wemosD1Mini") return d1MiniArea();
  expect(board.type).toBe("arduinoUno");
  // 66.04 x 53.34 with three corners round, the back right one cut 1.524 mm at 45°; the step from
  // (66.04, 2.54) over (68.58, 5.08) and (68.58, 37.846) to (66.04, 40.386).
  return 66.04 * 53.34 - 3 * (1 - Math.PI / 4) - 1.524 ** 2 / 2 + 2.54 * ((40.386 - 2.54) + (37.846 - 5.08)) / 2;
}

/**
 * The D1 mini V4.0.0 as Wemos's drawing has it, laid with USB-C at the left: 34.3 x 25.4 mm, the
 * antenna end's corners 4 mm round, the USB end's 1 mm, and the notch at the RESET button: 6.8 x 1.9 mm
 * at the back left, its corner 1 mm round, its edge slanting from (6.8, 23.5) to (7.7, 25.4).
 */
function d1MiniArea() {
  return 34.3 * 25.4 - (1 - Math.PI / 4) * (1 + 16 + 16 + 1) - 6.8 * 1.9 - (0.9 * 1.9) / 2;
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
    const holes = board.holes.reduce((sum, hole) => sum + Math.PI * (sbcHoleDiameter(board, hole) / 2) ** 2, 0);
    const plate = (plateArea(board) - holes) * board.thickness;
    const parts = sbcBoardSolids(board, 0.3, 3).reduce((sum, solid) => sum + solidVolume(solid), 0);
    const volume = await reimportVolume(blob);
    expect(Math.abs(volume - (plate + parts)) / (plate + parts)).toBeLessThan(1e-3);
  });
});
