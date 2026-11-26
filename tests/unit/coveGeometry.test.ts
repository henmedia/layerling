import { describe, expect, it } from "vitest";
import type { WorkplaneShape } from "@/types/layerling";
import { coveArc, coveMaxRadius, coveMinRadius, coveOutline, coveRadius, createCoveGeometry, normalizeCoveRadius } from "@/lib/coveGeometry";
import { cadModifierProfileForShape, CAD_PROFILE_SHAPE_KINDS, closedMeshVolume } from "@/lib/cadProfileExtrusion";
import { validateCadProfile } from "@/lib/cadProfileSolid";
import { meshForShape } from "@/lib/editorMeshCore";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import { shapeAssetDefaultDimensions, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { SHAPE_LIBRARY_SECTIONS } from "@/lib/shapeLibrarySections";
import { workplaneShapesEqual } from "@/lib/workplaneShapes";
import { MCP_SHAPE_SETTING_KEYS } from "@/lib/mcpShapeSettings";

// The cove (Facebook, Car'OS): the wedge's triangle with its slope hollowed out by an arc.

function shape(extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id: "cove-1", name: "Cove", kind: "cove", x: 0, z: 0, elevation: 0, size: 10, width: 10, depth: 40, height: 10, rotation: 0, color: "#2f8f83", ...extra } as WorkplaneShape;
}

/** The area between the two sides and the hollow: the triangle less the circle's segment over its slope. */
function coveArea(width: number, height: number, radius: number) {
  const chord = Math.hypot(width, height);
  const angle = 2 * Math.asin(chord / (2 * radius));
  return (width * height) / 2 - (radius * radius * (angle - Math.sin(angle))) / 2;
}

describe("the cove's hollow", () => {
  it("is a quarter circle tangent to both sides when width and height are equal", () => {
    expect(coveMinRadius(10, 10)).toBeCloseTo(10, 9);
    const arc = coveArc(10, 10);
    expect(arc.radius).toBeCloseTo(10, 9);
    // The centre is the corner of the frame opposite the body's corner.
    expect(arc.cx).toBeCloseTo(-5, 9);
    expect(arc.cz).toBeCloseTo(10, 9);
    expect(Math.abs(arc.end - arc.start)).toBeCloseTo(Math.PI / 2, 9);
    expect(coveArea(10, 10, 10)).toBeCloseTo(100 - 25 * Math.PI, 9);
  });

  it("never bows out of its frame, whatever the sides and the radius", () => {
    for (const [width, height] of [[10, 10], [30, 8], [6, 25], [1, 1], [100, 3]]) {
      for (const stored of [undefined, 0.1, coveMinRadius(width, height) * 1.5, 1e6]) {
        const outline = coveOutline(width, height, stored, 64);
        expect(outline[0]).toEqual({ x: width / 2, z: height });
        expect(outline[outline.length - 2]).toEqual({ x: -width / 2, z: 0 });
        expect(outline[outline.length - 1]).toEqual({ x: width / 2, z: 0 });
        outline.forEach((point) => {
          expect(point.x).toBeGreaterThanOrEqual(-width / 2 - 1e-9);
          expect(point.x).toBeLessThanOrEqual(width / 2 + 1e-9);
          expect(point.z).toBeGreaterThanOrEqual(-1e-9);
          expect(point.z).toBeLessThanOrEqual(height + 1e-9);
          // Every point of the hollow lies on the corner's side of the slope, or on it.
          expect(point.z * width - (point.x + width / 2) * height).toBeLessThanOrEqual(1e-9);
        });
      }
    }
  });

  it("keeps a radius within what the sides allow and stores the smallest as no setting", () => {
    expect(coveRadius(10, 10)).toBe(10);
    expect(coveRadius(10, 10, 4)).toBe(10);
    expect(coveRadius(10, 10, 25)).toBe(25);
    expect(coveRadius(10, 10, 1e9)).toBe(coveMaxRadius(10, 10));
    expect(coveRadius(10, 10, Number.NaN)).toBe(10);
    expect(normalizeCoveRadius(10, 10, 10)).toBeUndefined();
    expect(normalizeCoveRadius(10, 10, 3)).toBeUndefined();
    expect(normalizeCoveRadius(10, 10, 18)).toBe(18);
    expect(normalizeCoveRadius(10, 10, 1e9)).toBe(coveMaxRadius(10, 10));
    // With unequal sides the arc leaves the longer side tangent.
    expect(coveMinRadius(30, 8)).toBeCloseTo((900 + 64) / 16, 9);
    expect(coveMinRadius(8, 30)).toBeCloseTo((900 + 64) / 16, 9);
  });

  it("is a closed body of the hollow's volume, standing on the plate in its frame", () => {
    for (const [width, height, depth, stored] of [[10, 10, 40, undefined], [30, 8, 12, undefined], [12, 20, 5, 40]] as Array<[number, number, number, number | undefined]>) {
      const mesh = meshForShape(shape({ width, height, depth, coveRadius: stored }));
      const volume = closedMeshVolume(mesh.vertices, mesh.faces);
      const exact = coveArea(width, height, coveRadius(width, height, stored)) * depth;
      // Chords instead of the arc leave a little more body, at most 0.005 mm deep along the arc: within half a per cent.
      expect(volume).toBeGreaterThan(exact - 1e-9);
      expect(volume).toBeLessThan(exact * 1.005 + 1e-6);
      const xs = mesh.vertices.map(([x]) => x), ys = mesh.vertices.map(([, y]) => y), zs = mesh.vertices.map(([, , z]) => z);
      expect([Math.min(...xs), Math.max(...xs)]).toEqual([-width / 2, width / 2]);
      expect([Math.min(...ys), Math.max(...ys)]).toEqual([0, height]);
      expect([Math.min(...zs), Math.max(...zs)]).toEqual([-depth / 2, depth / 2]);
      // Closed: every edge is shared by two triangles, once each way.
      const edges = new Map<string, number>();
      const key = (v: readonly number[]) => v.map((value) => value.toFixed(6)).join(",");
      mesh.faces.forEach(([a, b, c]) => [[a, b], [b, c], [c, a]].forEach(([from, to]) => {
        const name = `${key(mesh.vertices[from])}>${key(mesh.vertices[to])}`;
        edges.set(name, (edges.get(name) ?? 0) + 1);
      }));
      for (const [name, count] of edges) {
        const [from, to] = name.split(">");
        expect(count).toBe(1);
        expect(edges.get(`${to}>${from}`)).toBe(1);
      }
    }
    const geometry = createCoveGeometry(10, 10, 40);
    expect(geometry.getAttribute("normal")).toBeDefined();
  });

  it("is an exact part: two lines and one arc pushed along the depth", () => {
    expect(CAD_PROFILE_SHAPE_KINDS.has("cove")).toBe(true);
    for (const extra of [{}, { width: 30, height: 8 }, { width: 12, height: 20, coveRadius: 40 }] as Array<Partial<WorkplaneShape>>) {
      const source = shape(extra);
      const part = cadModifierProfileForShape(source);
      expect(part).toMatchObject({ kind: "extrusion", height: source.depth });
      expect(() => validateCadProfile(part!)).not.toThrow();
      const [loop] = part!.loops;
      expect(loop.segments.map((segment) => segment.kind)).toEqual(["arc", "line", "line"]);
      const arc = loop.segments[0] as Extract<typeof loop.segments[number], { kind: "arc" }>;
      // From the top of the upright side to the end of the bottom side, then the corner.
      expect(loop.x).toBeCloseTo(source.width / 2, 9);
      expect(loop.z).toBeCloseTo(source.height, 9);
      expect(arc.x).toBeCloseTo(-source.width / 2, 9);
      expect(arc.z).toBeCloseTo(0, 9);
      expect(arc.rx).toBeCloseTo(coveRadius(source.width, source.height, source.coveRadius), 9);
      expect(loop.segments[1]).toMatchObject({ kind: "line", x: source.width / 2, z: 0 });
    }
  });
});

describe("the cove in the editor's lists", () => {
  it("has a tile among the basic shapes, right after the wedge, and its own start size", () => {
    expect(toolbarShapeAssets.find((asset) => asset.id === "cove")).toMatchObject({ kind: "cove" });
    const basic = SHAPE_LIBRARY_SECTIONS.find((section) => section.id === "basic")!.shapes;
    expect(basic.indexOf("cove")).toBe(basic.indexOf("wedge") + 1);
    expect(shapeAssetDefaultDimensions("cove")).toEqual({ width: 10, depth: 40, height: 10 });
    expect(MCP_SHAPE_SETTING_KEYS).toContain("coveRadius");
  });

  it("tells two coves apart by their radius", () => {
    expect(workplaneShapesEqual(shape(), shape())).toBe(true);
    expect(workplaneShapesEqual(shape(), shape({ coveRadius: 20 }))).toBe(false);
  });

  it("keeps its radius through saving and opening, and refuses one that is no size", async () => {
    const shapes = [shape({ coveRadius: 18 }), shape({ id: "cove-2" })];
    const bytes = await exportLylProject({
      projectId: "p", projectName: "Cove", createdAt: 1_700_000_000_000, modifiedAt: 1_700_000_100_000, shapes,
      history: [editorHistoryEntry(shapes, [])], historyIndex: 0, assets: [], workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0,
    });
    const restored = await importLylProject(bytes);
    expect(restored.shapes.map((entry) => [entry.kind, entry.coveRadius])).toEqual([["cove", 18], ["cove", undefined]]);
    const broken = [shape({ coveRadius: -2 })];
    await expect(exportLylProject({
      projectId: "p", projectName: "Cove", createdAt: 1, modifiedAt: 2, shapes: broken,
      history: [editorHistoryEntry(broken, [])], historyIndex: 0, assets: [], workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0,
    }).then(importLylProject)).rejects.toThrow(/coveRadius/);
  });
});
