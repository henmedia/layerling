import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Make exact can take minutes on a large mesh, and an ordinary message goes after a few seconds: the working message
 * has to stay until the result or the error replaces it (Discussion #1797). No test mounts the editor, so its source
 * is read here.
 */
const editor = readFileSync(fileURLToPath(new URL("../../apps/web/src/components/LayerlingEditor.tsx", import.meta.url)), "utf8");

/** What a callback does before it waits for Make exact, without comments, spaces folded. */
function beforeWait(start: string) {
  const from = editor.indexOf(start);
  expect(from).toBeGreaterThan(-1);
  return editor
    .slice(from, editor.indexOf("await makeExactShape(", from))
    .replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "")
    .replace(/\s+/g, " ");
}

describe("the working message of Make exact", () => {
  for (const [name, start] of [
    ["the toolbar and the right-click menu", "const makeSelectedExact = useCallback("],
    ["the offer after an import", "const takeExactOffer = useCallback("],
  ]) {
    it(`stays up while it runs, from ${name}`, () => {
      const before = beforeWait(start);
      const calls = before.match(/setNotice\( ?t\("makeExact\.working"[^;]*;/g) ?? [];
      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatch(/, "stay",? ?\);$/);
      // Nothing after it may put another message in its place before the work starts.
      const after = before.slice(before.indexOf(calls[0]) + calls[0].length);
      expect(after).not.toMatch(/setNotice\(|dismissNotice\(/);
    });
  }

  it("is replaced when Make exact fails, so it does not stay up for good", () => {
    const from = editor.indexOf("const makeSelectedExact = useCallback(");
    const failed = editor
      .slice(editor.indexOf("} catch", from), editor.indexOf("} finally {", from))
      .replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
    expect(failed).toMatch(/setNotice\(/);
  });
});
