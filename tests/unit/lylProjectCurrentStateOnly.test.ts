import { describe, expect, it } from "vitest";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject, type LylProjectDocumentV1 } from "@/lib/lylProject";
import type { WorkplaneShape } from "@/types/layerling";

function box(id: string, extra: Partial<WorkplaneShape> = {}) {
  return {
    id,
    name: "Box",
    kind: "box",
    x: 0,
    y: 0,
    z: 0,
    size: 20,
    width: 20,
    depth: 10,
    height: 5,
    rotation: 0,
    color: "#d84a3a",
    ...extra,
  } as WorkplaneShape;
}

const KEPT_NOTE = { id: "note-1", text: "keep", x: 0, y: 0, z: 0 };

async function packageWithHistory(states: WorkplaneShape[][], historyIndex: number) {
  return exportLylProject({
    projectId: "design-1",
    projectName: "Lantern",
    createdAt: Date.UTC(2026, 10, 1),
    modifiedAt: Date.UTC(2026, 10, 2),
    shapes: states[historyIndex],
    notes: [KEPT_NOTE],
    history: states.map((shapes, index) => editorHistoryEntry(shapes, [], index === historyIndex ? [KEPT_NOTE] : [])),
    historyIndex,
    assets: [],
    compressionLevel: 1,
  });
}

/** The package with the bytes of every B-Rep only an earlier state uses broken, as if they had gone bad. */
function breakEarlierBreps(bytes: Uint8Array) {
  const files = unzipSync(bytes);
  const document = JSON.parse(strFromU8(files["project.json"])) as LylProjectDocumentV1;
  const scene = document.states.find((state) => state.id === document.sceneStateId);
  const used = new Set(scene?.nodes.map((node) => node.cadBrepAssetId).filter(Boolean));
  const broken = document.assets.filter((asset) => asset.kind === "brep" && !used.has(asset.id));
  broken.forEach((asset) => {
    files[asset.path] = strToU8("x".repeat(files[asset.path].byteLength));
  });
  return { bytes: zipSync(files), broken: broken.length };
}

describe("opening a design with its current state only (#1157)", () => {
  it("leaves the earlier states unread, so a broken one no longer stops the design from opening", async () => {
    const earlier = [box("box-1", { cadBrep: "DBRep_DrawableShape earlier body" })];
    const current = [box("box-1", { width: 40, cadBrep: "DBRep_DrawableShape current body" })];
    const { bytes, broken } = breakEarlierBreps(await packageWithHistory([earlier, current], 1));
    expect(broken).toBe(1);

    await expect(importLylProject(bytes)).rejects.toThrow("integrity check");

    const restored = await importLylProject(bytes, { currentStateOnly: true });
    expect(restored.history).toHaveLength(1);
    expect(restored.historyIndex).toBe(0);
    expect(restored.shapes.map((shape) => [shape.id, shape.width, shape.cadBrep])).toEqual([["box-1", 40, "DBRep_DrawableShape current body"]]);
    expect(restored.notes.map((note) => note.text)).toEqual(["keep"]);
    expect(restored.projectName).toBe("Lantern");
  });

  it("takes the state the design stood at, also after Undo", async () => {
    const first = [box("box-1")];
    const second = [box("box-1"), box("box-2", { x: 30 })];
    const restored = await importLylProject(await packageWithHistory([first, second], 0), { currentStateOnly: true });
    expect(restored.history).toHaveLength(1);
    expect(restored.shapes.map((shape) => shape.id)).toEqual(["box-1"]);
  });

  it("reads a design without earlier states the same as a whole import", async () => {
    const saved = await packageWithHistory([[box("box-1", { height: 7 })]], 0);
    const whole = await importLylProject(saved);
    const cut = await importLylProject(saved, { currentStateOnly: true });
    expect(cut.shapes).toEqual(whole.shapes);
    expect(cut.history).toHaveLength(1);
  });
});
