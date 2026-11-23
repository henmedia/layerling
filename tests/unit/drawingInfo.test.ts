import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { drawingToPdf, drawingToSvg, generateDrawing } from "@/lib/drawingExport";
import { drawingInfoFor, drawingInfoText, normalizeDesignDrawingInfo, readDesignDrawingInfo, readDrawnBy, writeDesignDrawingInfo, writeDrawnBy, DRAWING_INFO_MAX_LENGTH } from "@/lib/drawingInfo";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { DrawingMesh } from "@/lib/drawingProjection";
import type { WorkplaneShape } from "@/types/layerling";

// Forum, Lofo: the drawing number, revision and who drew it go into the title block of a 2D drawing.

function boxMesh(): DrawingMesh {
  const geometry = new THREE.BoxGeometry(40, 20, 10).toNonIndexed();
  const positions = geometry.getAttribute("position");
  const vertices: [number, number, number][] = [];
  const faces: [number, number, number][] = [];
  for (let i = 0; i < positions.count; i++) vertices.push([positions.getX(i), positions.getY(i), positions.getZ(i)]);
  for (let i = 0; i < positions.count; i += 3) faces.push([i, i + 1, i + 2]);
  return { vertices, faces };
}

const day = new Date(2026, 10, 22);
const texts = (drawing: ReturnType<typeof generateDrawing>) => drawing.primitives.flatMap((p) => (p.kind === "text" ? [p] : []));

// The tests run without a browser: a small store stands in for localStorage.
let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, String(value)),
      removeItem: (key: string) => void store.delete(key),
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("the drawing's title block", () => {
  it("shows the number, revision and name typed, with the day of the export", () => {
    const drawing = generateDrawing([boxMesh()], "Bracket", undefined, { number: "Z-0042", revision: "B", drawnBy: "Lothar Müller" }, day);
    const values = texts(drawing).map((p) => p.text);
    expect(values).toContain("Z-0042 / B");
    expect(values).toContain("Lothar Müller / 2026-11-22");
  });

  it("keeps a dash where a field is empty", () => {
    const values = texts(generateDrawing([boxMesh()], "Bracket", undefined, {}, day)).map((p) => p.text);
    expect(values).toContain("— / —");
    expect(values).toContain("— / 2026-11-22");
    expect(values).not.toContain("— / A");
  });

  it("shrinks a long entry so it stays inside its half of the block", () => {
    const long = "W".repeat(DRAWING_INFO_MAX_LENGTH);
    const drawing = generateDrawing([boxMesh()], "Bracket", undefined, { number: long, revision: long }, day);
    const cell = texts(drawing).find((p) => p.text.startsWith("WWW"))!;
    const short = texts(generateDrawing([boxMesh()], "Bracket", undefined, { number: "1", revision: "A" }, day)).find((p) => p.text === "1 / A")!;
    expect(cell.size).toBeLessThan(short.size);
    expect(short.size).toBe(2.5);
  });

  it("writes the fields safely into SVG and PDF", () => {
    const drawing = generateDrawing([boxMesh()], "Bracket", undefined, { number: "A<1>&2", revision: "(b)", drawnBy: "Jürgen" }, day);
    const svg = drawingToSvg(drawing);
    expect(svg).toContain("A&lt;1&gt;&amp;2 / (b)");
    expect(svg).toContain("Jürgen / 2026-11-22");
    const pdf = new TextDecoder("latin1").decode(drawingToPdf(drawing));
    expect(pdf).toContain("A<1>&2 / \\(b\\)");
    expect(pdf).toContain("J\\374rgen / 2026-11-22");
  });
});

describe("keeping the fields", () => {
  it("takes one trimmed line of at most 40 characters", () => {
    expect(drawingInfoText("  Z-1\n2  ")).toBe("Z-1 2");
    expect(Array.from(drawingInfoText("ä".repeat(60)))).toHaveLength(DRAWING_INFO_MAX_LENGTH);
    expect(drawingInfoText(12)).toBe("");
    expect(normalizeDesignDrawingInfo({ number: " ", revision: "" })).toBeNull();
  });

  it("keeps number and revision per design and the name for every design", () => {
    writeDesignDrawingInfo("p1", { number: "Z-1", revision: "A" });
    writeDrawnBy("Lothar");
    expect(readDesignDrawingInfo("p1")).toEqual({ number: "Z-1", revision: "A" });
    expect(readDesignDrawingInfo("p2")).toEqual({ number: "", revision: "" });
    expect(drawingInfoFor("p2")).toEqual({ number: "", revision: "", drawnBy: "Lothar" });
    // A field given for one drawing (MCP) wins over the kept one, an empty one clears it for that drawing.
    expect(drawingInfoFor("p1", { revision: "C", drawnBy: "" })).toEqual({ number: "Z-1", revision: "C", drawnBy: "" });
    writeDesignDrawingInfo("p1", { number: "", revision: "" });
    writeDrawnBy(" ");
    expect(window.localStorage.getItem("layerling.drawingInfo.p1")).toBeNull();
    expect(readDrawnBy()).toBe("");
  });

  it("travels with the design in its .lyl file", async () => {
    const box: WorkplaneShape = { id: "b", name: "Box", kind: "box", color: "#123456", x: 0, z: 0, size: 20, width: 20, depth: 20, height: 10, rotation: 0 };
    const pack = (drawingInfo?: { number: string; revision: string } | null) => exportLylProject({
      projectName: "Drawn",
      createdAt: 1_700_000_000_000,
      modifiedAt: 1_700_000_100_000,
      shapes: [box],
      history: [editorHistoryEntry([box], [])],
      historyIndex: 0,
      assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      snapGrid: DEFAULT_SNAP_GRID,
      placementElevation: 0,
      drawingInfo,
    });
    expect((await importLylProject(await pack({ number: "Z-7", revision: "2" }))).drawingInfo).toEqual({ number: "Z-7", revision: "2" });
    expect((await importLylProject(await pack(null))).drawingInfo).toBeUndefined();
  });
});
