import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * A QR code or an SBC board made again (#1942) is built with an await, and a move, lock or rename in that
 * time must not be undone by the new body. No test mounts the editor, so its source is read here.
 */
const editor = readFileSync(fileURLToPath(new URL("../../apps/web/src/components/LayerlingEditor.tsx", import.meta.url)), "utf8");

/** One callback's body without its comments, spaces folded. */
function body(start: string) {
  const from = editor.indexOf(start);
  return editor
    .slice(from, editor.indexOf("}, [commitShapes, selectedShape, selectedShapes.length]);", from))
    .replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

describe("making a QR code or an SBC board again", () => {
  for (const [name, start, notice, made] of [
    ["QR code", "const regenerateSelectedQrCode", "status.qrCodeChanged", 't("status.qrCodeRegenerated")'],
    ["SBC board", "const regenerateSelectedSbcBoard", "status.sbcBoardChanged", 't("status.sbcBoardRegenerated", { name: next.name })'],
  ]) {
    it(`leaves the ${name} as it is and says so when it was changed while the new one was built`, () => {
      const make = body(start);
      const waited = make.indexOf("await ");
      // One build and one replace; what the body was like is kept before the build.
      expect(make.split("await ")).toHaveLength(2);
      expect(make.split("commitShapes(")).toHaveLength(2);
      for (const kept of ["const sourceFingerprint = projectShapesFingerprint([current]);", "const sourceProjectId = projectInfoRef.current.projectId;"]) {
        expect(make.indexOf(kept)).toBeGreaterThan(-1);
        expect(make.indexOf(kept)).toBeLessThan(waited);
      }
      expect(make.endsWith(
        "const currentTarget = shapesRef.current.find((shape) => shape.id === current.id); "
        + "if (projectInfoRef.current.projectId !== sourceProjectId || !currentTarget || projectShapesFingerprint([currentTarget]) !== sourceFingerprint) "
        + `{ setNotice(t("${notice}")); return; } `
        + `commitShapes(shapesRef.current.map((shape) => (shape.id === current.id ? next : shape)), [next.id], ${made});`,
      )).toBe(true);
    });
  }
});
