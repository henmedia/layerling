import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The face tools' reads in the editor (LayerlingEditor.tsx) go through faceReadPositionsOffThread
 * and a click can stop waiting; no test mounts the editor, so its source is read here, spaces folded.
 */
const editor = readFileSync(fileURLToPath(new URL("../../apps/web/src/components/LayerlingEditor.tsx", import.meta.url)), "utf8").replace(/\s+/g, " ");

function body(start: string, end: string) {
  const from = editor.indexOf(start);
  return editor.slice(from, editor.indexOf(end, from));
}

describe("the face tools' reads in the editor", () => {
  it("read every face through faceReadPositionsOffThread, the clicks through faceReadForClick", () => {
    // The hole pattern, the Face tool and the support rib (#1385).
    expect(editor.match(/await faceReadForClick\(source, fingerprint, pickAbort\.signal\)/g)).toHaveLength(3);
    // push_face and support_rib read a flat face, perforate_face a flat face or a round wall (#1393).
    expect(editor.match(/read(?:Perforable|HolePattern)Face\(await faceReadPositionsOffThread\(target, geometryAbortRef\.current\?\.signal\), point, normal\)/g)).toHaveLength(3);
    expect(editor).not.toMatch(/faceReadMesh|faceReadPositions\(/);
  });

  for (const [name, start, tool, run, abort, missed] of [
    ["hole pattern", "const pickHolePatternFace", "holePatternTool", "holePatternPickRunRef", "holePatternPickAbortRef", "status.holePatternMissed"],
    ["Face tool", "const pickFaceToolFace", "faceTool", "faceToolPickRunRef", "faceToolPickAbortRef", "status.faceToolMissed"],
    ["support rib", "const pickSupportRibFace", "supportRibTool", "supportRibPickRunRef", "supportRibPickAbortRef", "status.supportRibMissed"],
  ]) {
    const end = `}, [faceReadForClick, ${tool}]);`;
    it(`stops the ${name}'s click before it waiting on any new click, keeps its own to stop, and drops a stale answer`, () => {
      const pick = body(start, end);
      const callOff = pick.indexOf(`${abort}.current?.abort();`);
      const kept = pick.indexOf(`${abort}.current = pickAbort;`);
      expect(callOff).toBeGreaterThan(-1);
      expect(callOff).toBeLessThan(pick.indexOf(missed));
      expect(kept).toBeGreaterThan(callOff);
      expect(kept).toBeLessThan(pick.indexOf("await faceReadForClick"));
      expect(pick).toMatch(new RegExp(`catch \\(error\\) \\{ if \\(${run}\\.current === run\\) setNotice\\(localizedError`));
      expect(pick).toContain(`if (${run}.current !== run || !latest || projectShapesFingerprint([latest]) !== fingerprint) return;`);
    });

    it(`stops the ${name}'s click waiting when the tool closes or the editor goes`, () => {
      expect(editor).toContain(`!== "pick") ${abort}.current?.abort(); }, [${tool}]);`);
      expect(body("return () => { unsubscribe();", "}, [dismissNotice, setNotice]);")).toContain(`${abort}.current?.abort();`);
    });
  }
});
