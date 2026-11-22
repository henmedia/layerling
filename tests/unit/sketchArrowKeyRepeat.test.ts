import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { sketchSelectionMovePointIds } from "@/lib/sketchSelection";

const workspace = readFileSync(fileURLToPath(new URL("../../apps/web/src/components/SketchWorkspace.tsx", import.meta.url)), "utf8");

/** The arrow-key branch of the sketch's keydown handler. */
function arrowBranch() {
  const start = workspace.indexOf('tool === "select" && !pointerAction && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]');
  expect(start).toBeGreaterThan(-1);
  return workspace.slice(start, workspace.indexOf("const handleKeyUp", start));
}

/** The source between a start text and the next end text. */
function between(startText: string, endText: string) {
  const start = workspace.indexOf(startText);
  expect(start).toBeGreaterThan(-1);
  return workspace.slice(start, workspace.indexOf(endText, start + startText.length));
}

describe("the arrow keys in the sketch move at once and hand the run over when they rest (#1930)", () => {
  it("draws each press in the sketch and gives the editor nothing per press", () => {
    const branch = arrowBranch();
    expect(branch).toContain("nudgeSketchSelection(dx, dz);");
    expect(branch).not.toContain("onTransformPoints(");
    expect(branch).not.toContain("onMoveHandle(");
    expect(branch).not.toContain("onUpdateImage(");
    const nudge = between("const nudgeSketchSelection = ", "const handOverKeyNudge = ");
    expect(nudge).toContain("setKeyNudge(");
    expect(nudge).not.toContain("onTransformPoints(");
    expect(nudge).not.toContain("onMoveHandle(");
    expect(nudge).not.toContain("onUpdateImage(");
  });

  it("shows the run as the drawn sketch: points and handles in the outline, a picture among the pictures", () => {
    expect(between("const previewProfile = useMemo(", "}, [keyNudge, pointerAction, profile]);")).toMatch(/keyNudge\?\.kind === "points"[\s\S]*keyNudge\?\.kind === "handle"/);
    expect(between("const displayImages = useMemo(", "}, [keyNudge, pointerAction, profile.images]);")).toContain('keyNudge?.kind === "image"');
  });

  it("hands the run over as one move with its key, so a run is still one step of Undo (#370)", () => {
    const handOver = between("const handOverKeyNudge = ", "const handOverKeyNudgeRef");
    expect(handOver).toContain("onTransformPoints(translateSketchPoints(run.startPoints, run.dx, run.dz), t(\"sketch.shapeMoved\"), `points:");
    expect(handOver).toContain("onMoveHandle(run.pointId, run.handle, run.at, `handle:");
    expect(handOver).toContain("`image:${run.imageId}`");
    // The editor's new sketch and the end of the run are one drawing.
    expect(handOver.indexOf("setKeyNudgeState(null)")).toBeGreaterThan(handOver.indexOf("onUpdateImage("));
  });

  it("hands over when the arrow keys rest, and at once on another key, a click, losing focus or leaving", () => {
    const effect = between("const stopTimer = () => {", "// Another selection or tool ends the run first.");
    expect(effect).toContain("window.setTimeout(handOverNow, KEY_NUDGE_HANDOVER_MS)");
    expect(effect).toContain("flushSync(() => handOverKeyNudgeRef.current())");
    expect(effect).toContain('if (event.key === "Shift" || event.key === "Alt") return;');
    // A key that ends the run is not lost: it is sent again once the editor's handlers are set anew.
    expect(effect).toMatch(/handOverNow\(\);[\s\S]*event\.stopImmediatePropagation\(\);\s*const again = new KeyboardEvent\("keydown", event\);\s*\(target \?\? window\)\.dispatchEvent\(again\);/);
    expect(effect).toContain('window.addEventListener("keydown", onKeyDown, true)');
    expect(effect).toContain('window.addEventListener("keyup", onKeyUp, true)');
    expect(effect).toContain('window.addEventListener("pointerdown", handOverNow, true)');
    expect(effect).toContain('window.addEventListener("blur", onBlur)');
    expect(effect).toMatch(/stopTimer\(\);\s*\/\/ Leaving the sketch[^\n]*\n\s*handOverKeyNudgeRef\.current\(\);/);
    expect(workspace).toMatch(/useEffect\(\(\) => \{\s*handOverKeyNudgeRef\.current\(\);\s*\}, \[selected, selectedHandle, tool\]\);/);
  });
});

describe("the points a frame selection moves are found quickly (#1930)", () => {
  it("still leaves out the far ends of the lines leading out of the frame (#1800) on a large outline", () => {
    const count = 2000;
    const points = Array.from({ length: count }, (_, i) => ({ id: `p${i}` }));
    const segments = points.map((point, i) => ({ id: `s${i}`, startId: point.id, endId: points[(i + 1) % count].id }));
    // The frame takes points 10 to 1009 and every line touching them: s9 and s1009 lead out.
    const pointIds = points.slice(10, 1010).map((point) => point.id);
    const segmentIds = segments.slice(9, 1010).map((segment) => segment.id);
    const moved = new Set(sketchSelectionMovePointIds({ segments }, { kind: "multiple", pointIds, segmentIds }));
    expect(moved.size).toBe(1000);
    expect(moved.has("p9")).toBe(false);
    expect(moved.has("p1010")).toBe(false);
  });
});
