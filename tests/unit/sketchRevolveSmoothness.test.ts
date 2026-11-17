import { describe, expect, it } from "vitest";
import { SKETCH_CAD_DEFLECTION } from "@/lib/cadModifierRuntime";
import { OVER_FINE_LINEAR_DEFLECTION } from "@/lib/cadMeshRelief";
import { SKETCH_REVOLVE_SMOOTHNESS, sketchRevolveCadDeflection } from "@/lib/sketchCadDeflection";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { normalizeSketchRevolveSettings } from "@/lib/sketchRevolve";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { SketchSegment, WorkplaneShape } from "@/types/layerling";

const segments = (count: number): SketchSegment[] =>
  Array.from({ length: count }, (_, index) => ({ id: `s${index}`, startId: `p${index}`, endId: `p${index + 1}`, kind: "bezier" }));

/** Discussion #1426: Tom's revolved pots showed facets on the print; a revolved body can now be cut finer. */
describe("a revolved body's smoothness", () => {
  it("cuts as usual on standard and finer step by step", () => {
    const profile = { segments: segments(8) };
    expect(sketchRevolveCadDeflection(profile, undefined)).toEqual(SKETCH_CAD_DEFLECTION);
    const fine = sketchRevolveCadDeflection(profile, "fine");
    const extraFine = sketchRevolveCadDeflection(profile, "extraFine");
    expect(fine.linear).toBeLessThan(SKETCH_CAD_DEFLECTION.linear);
    expect(fine.angular).toBeLessThan(SKETCH_CAD_DEFLECTION.angular);
    expect(extraFine.linear).toBeLessThan(fine.linear);
    expect(extraFine.angular).toBeLessThan(fine.angular);
  });

  it("never goes below the fineness under which a body is lightened when a design opens", () => {
    for (const deflection of Object.values(SKETCH_REVOLVE_SMOOTHNESS)) expect(deflection.linear).toBeGreaterThanOrEqual(OVER_FINE_LINEAR_DEFLECTION);
  });

  it("is kept with the revolve's settings, and only its three steps", () => {
    expect(normalizeSketchRevolveSettings({ smoothness: "fine" }).smoothness).toBe("fine");
    expect(normalizeSketchRevolveSettings({ smoothness: "extraFine" }).smoothness).toBe("extraFine");
    expect(normalizeSketchRevolveSettings({}).smoothness).toBeUndefined();
    expect(normalizeSketchRevolveSettings({ smoothness: "ultra" as never }).smoothness).toBeUndefined();
  });

  it("stays with the body, in the editor and in a saved design", async () => {
    const shape: WorkplaneShape = {
      id: "pot", name: "Pot", kind: "box", color: "#78b96b", x: 0, z: 0, size: 20, width: 20, depth: 20, height: 20, rotation: 0, locked: false, hidden: false,
      sketchRevolve: { startAngle: 0, sweepAngle: 360, sides: 64, quality: 6, smoothness: "extraFine" },
    };
    expect(canonicalizeShape(shape).sketchRevolve?.smoothness).toBe("extraFine");
    expect(canonicalizeShape({ ...shape, sketchRevolve: { ...shape.sketchRevolve!, smoothness: undefined } }).sketchRevolve).not.toHaveProperty("smoothness");
    const saved = await exportLylProject({
      projectId: "p1426", projectName: "Pot", createdAt: 1, modifiedAt: 2, shapes: [shape], history: [editorHistoryEntry([shape], [])], historyIndex: 0,
      assets: [], workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0,
    });
    expect((await importLylProject(saved)).shapes[0].sketchRevolve?.smoothness).toBe("extraFine");
  });
});
