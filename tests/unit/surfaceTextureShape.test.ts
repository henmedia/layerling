import { describe, expect, it } from "vitest";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { meshForShape } from "@/lib/editorMeshCore";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { analyzeTriangleSoup } from "@/lib/svgImport";
import {
  canChangeSurfaceTexture,
  canTextureSurface,
  offersSurfaceTexture,
  offersSurfaceTextureMask,
  shapeUnderSurfaceTexture,
  surfaceTextureEntry,
  surfaceTextureMaskOf,
  surfaceTextureMasksFor,
  surfacePatternLabel,
  surfaceTexturedShape,
  surfaceTextureInput,
  textureSurfaceOffThread,
  textureSurfacePositions,
} from "@/lib/surfaceTextureShape";
import { normalizeSurfaceTexture } from "@/lib/surfaceTexture";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import { canonicalizeShape, workplaneShapesEqual } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

function shape(overrides: Partial<WorkplaneShape>): WorkplaneShape {
  return canonicalizeShape({
    id: "c1", name: "Cylinder", kind: "cylinder", color: "#d97813", x: 12, z: -7, elevation: 3,
    size: 30, width: 30, depth: 30, height: 20, rotation: 0, ...overrides,
  });
}

function soupOf(target: WorkplaneShape) {
  const mesh = meshForShape(target);
  return mesh.faces.flatMap((face) => face.flatMap((index) => mesh.vertices[index]));
}

describe("which shapes take a surface texture", () => {
  it("takes one solid body that is not locked and has no texture yet", () => {
    expect(canTextureSurface(shape({}))).toBe(true);
    expect(canTextureSurface(shape({ locked: true }))).toBe(false);
    expect(canTextureSurface(shape({ surfaceTexture: normalizeSurfaceTexture({}) }))).toBe(false);
    expect(canTextureSurface(null)).toBe(false);
    // A textured body still shows the card, to say what it carries.
    expect(offersSurfaceTexture(shape({ surfaceTexture: normalizeSurfaceTexture({}) }))).toBe(true);
  });

  it("names the patterns in the current language", () => {
    expect(surfacePatternLabel("knurl")).toBe("Knurling");
    expect(surfacePatternLabel("honeycomb")).toBe("Honeycomb");
  });
});

describe("a textured shape", () => {
  it("reads the body where it stands in the design", () => {
    const cylinder = shape({});
    const input = surfaceTextureInput(cylinder);
    expect(input.length).toBe(meshForShape(cylinder).faces.length * 9);
    let minY = Infinity;
    for (let i = 1; i < input.length; i += 3) minY = Math.min(minY, input[i]);
    expect(minY).toBeCloseTo(3, 6);
  });

  it("stands where the body stood, as a closed mesh that remembers its settings", () => {
    const cylinder = shape({});
    const settings = normalizeSurfaceTexture({ pattern: "grooves", spacing: 3, depth: 0.5, angle: 0 });
    const outcome = textureSurfacePositions(surfaceTextureInput(cylinder), settings, 200_000);
    expect(outcome.stats.nothing).toBe(false);
    expect(outcome.stats.around).toBe(Math.round((Math.PI * 30) / 3));
    const textured = surfaceTexturedShape(cylinder, outcome.positions, settings);
    if (!textured) throw new Error("no shape");
    expect(textured.kind).toBe("mesh");
    expect(textured.id).toBe(cylinder.id);
    expect(textured.color).toBe(cylinder.color);
    expect(textured.surfaceTexture).toEqual(settings);
    expect(textured.x).toBeCloseTo(12, 3);
    expect(textured.z).toBeCloseTo(-7, 3);
    expect(textured.elevation).toBeCloseTo(3, 6);
    expect(textured.height).toBeCloseTo(20, 3);
    // Inward grooves leave the outer diameter as it was.
    expect(textured.width).toBeCloseTo(30, 2);
    // The editor's mesh of the new shape is the textured one, where the texture put it.
    const placed = soupOf(textured);
    expect(placed.length).toBe(outcome.positions.length);
    for (let i = 0; i < placed.length; i += 997) expect(placed[i]).toBeCloseTo(outcome.positions[i], 4);
    const analysis = analyzeTriangleSoup(placed);
    expect(analysis.boundaryEdges).toBe(0);
    expect(analysis.nonManifoldEdges).toBe(0);
    // The record of the texture counts as a change of the shape.
    expect(workplaneShapesEqual(textured, { ...textured, surfaceTexture: normalizeSurfaceTexture({ ...settings, depth: 1 }) })).toBe(false);
  });

  it("textures a turned body where it stands, and the new body starts upright", () => {
    const lying = shape({ rotationX: 90 });
    const outcome = textureSurfacePositions(surfaceTextureInput(lying), normalizeSurfaceTexture({ pattern: "bumps", projection: "allRound", spacing: 4, depth: 0.4 }), 150_000);
    const textured = surfaceTexturedShape(lying, outcome.positions, normalizeSurfaceTexture({}));
    if (!textured) throw new Error("no shape");
    expect(textured.rotationX ?? 0).toBe(0);
    // Lying down, the cylinder is as tall as it is wide.
    expect(textured.height).toBeGreaterThan(29);
    // Up to 150,000 triangles textured all round: it ran past the default 5 s twice in the full parallel suite.
  }, 30_000);

  it("works without a worker, here in the tests", async () => {
    const outcome = await textureSurfaceOffThread(surfaceTextureInput(shape({})), normalizeSurfaceTexture({ pattern: "honeycomb", spacing: 6 }), 150_000);
    expect(outcome.stats.triangles).toBeGreaterThan(1000);
    expect(outcome.positions.length).toBe(outcome.stats.triangles * 9);
  });
});

describe("texture masks", () => {
  const box = (overrides: Partial<WorkplaneShape>) => shape({ id: "m1", name: "Box", kind: "box", width: 40, depth: 40, height: 12, x: 12, z: -7, elevation: 14, ...overrides });

  it("are convex helper bodies with no texture of their own", () => {
    expect(offersSurfaceTextureMask(box({}))).toBe(true);
    expect(offersSurfaceTextureMask(shape({ id: "s", kind: "sphere" }))).toBe(true);
    expect(offersSurfaceTextureMask(shape({ id: "t", kind: "text" }))).toBe(false);
    expect(offersSurfaceTextureMask(box({ surfaceTexture: normalizeSurfaceTexture({}) }))).toBe(false);
  });

  it("describe a box by its six faces, pointing out, with its box", () => {
    const mask = surfaceTextureMaskOf(box({}), "exclude");
    if (!mask) throw new Error("no mask");
    expect(mask.planes.length).toBe(24);
    // The middle of the box lies behind every face.
    for (let k = 0; k < mask.planes.length; k += 4) {
      expect(mask.planes[k] * 12 + mask.planes[k + 1] * 20 + mask.planes[k + 2] * -7).toBeLessThan(mask.planes[k + 3]);
    }
    expect(mask.box?.[1]).toBeCloseTo(14, 6);
    expect(mask.box?.[4]).toBeCloseTo(26, 6);
  });

  it("take part where a marked body reaches into the textured one, and keep its texture away", () => {
    const cylinder = shape({});
    const far = box({ id: "far", x: 200, surfaceTextureMask: "only" });
    const near = box({ surfaceTextureMask: "exclude" });
    const unmarked = box({ id: "plain" });
    const masks = surfaceTextureMasksFor(cylinder, [cylinder, far, near, unmarked]);
    expect(masks.map((mask) => mask.mode)).toEqual(["exclude"]);
    const settings = normalizeSurfaceTexture({ pattern: "knurl", spacing: 3, depth: 0.5, fade: 0.5, masks });
    const outcome = textureSurfacePositions(surfaceTextureInput(cylinder), settings, 200_000);
    // Above the mask's bottom (14 + half a millimetre of fade) the wall stays where it was; below it carries the knurl.
    let deepest = Infinity;
    for (let i = 0; i < outcome.positions.length; i += 3) {
      const r = Math.hypot(outcome.positions[i] - 12, outcome.positions[i + 2] + 7);
      const y = outcome.positions[i + 1];
      if (y > 14.6 && y < 22.9 && r > 5) expect(r).toBeGreaterThan(15 * Math.cos(Math.PI / 96) - 1e-6);
      if (y > 5 && y < 12) deepest = Math.min(deepest, r);
    }
    expect(deepest).toBeLessThan(14.6);
    // The texture keeps the masks it was made with.
    const textured = surfaceTexturedShape(cylinder, outcome.positions, settings);
    expect(textured?.surfaceTexture?.masks).toHaveLength(1);
  });
});

describe("a texture changed later", () => {
  const grooves = normalizeSurfaceTexture({ pattern: "grooves", spacing: 4, depth: 0.5, angle: 0 });
  const texture = (target: WorkplaneShape, settings = grooves) => {
    const textured = surfaceTexturedShape(target, textureSurfacePositions(surfaceTextureInput(target), settings, 150_000).positions, settings);
    if (!textured) throw new Error("no shape");
    return textured;
  };

  it("keeps the body under it, and gives it back where the textured body stands", () => {
    const cylinder = shape({});
    const textured = texture(cylinder);
    const entry = surfaceTextureEntry(textured);
    expect(entry?.feature.kind).toBe("surfaceTexture");
    expect(entry?.feature.surfaceTexture).toEqual(grooves);
    expect(canChangeSurfaceTexture(textured)).toBe(true);
    expect(canChangeSurfaceTexture({ ...textured, locked: true })).toBe(false);
    // Taken off where it was made, the body is the one before, to the hundredth of a millimetre.
    const under = shapeUnderSurfaceTexture(textured);
    expect(under?.kind).toBe("cylinder");
    expect(under?.surfaceTexture).toBeUndefined();
    expect(under?.edgeTreatmentHistory).toBeUndefined();
    expect(under?.x).toBeCloseTo(12, 2);
    expect(under?.z).toBeCloseTo(-7, 2);
    expect(under?.elevation).toBeCloseTo(3, 6);
    expect(under?.width).toBeCloseTo(30, 2);
    // Moved up and along, and made taller: the body under it comes back there, and as tall.
    const moved = canonicalizeShape({ ...textured, x: textured.x + 10, elevation: (textured.elevation ?? 0) + 2, height: textured.height * 1.5 });
    const back = shapeUnderSurfaceTexture(moved);
    expect(back?.x).toBeCloseTo(22, 2);
    expect(back?.elevation).toBeCloseTo(5, 6);
    expect(back?.height).toBeCloseTo(30, 2);
    expect(back?.color).toBe(cylinder.color);
  });

  it("is made again from the body under it, and keeps the steps before it", () => {
    const earlier = {
      id: "edge-history-0",
      createdAt: 1,
      feature: { kind: "chamfer" as const, amount: 1, edgeCount: 1 },
      before: shape({ height: 20 }),
    };
    const chamfered = shape({ edgeTreatmentHistory: [earlier] });
    const textured = texture(chamfered);
    expect(textured.edgeTreatmentHistory?.map((step) => step.feature.kind)).toEqual(["chamfer", "surfaceTexture"]);
    const under = shapeUnderSurfaceTexture(textured);
    if (!under) throw new Error("no body under the texture");
    expect(under.edgeTreatmentHistory?.map((step) => step.id)).toEqual(["edge-history-0"]);
    const knurled = texture(under, normalizeSurfaceTexture({ pattern: "knurl", spacing: 3, depth: 0.4 }));
    expect(knurled.surfaceTexture?.pattern).toBe("knurl");
    expect(knurled.edgeTreatmentHistory?.map((step) => step.feature.kind)).toEqual(["chamfer", "surfaceTexture"]);
    expect(surfaceTextureEntry(knurled)?.before.kind).toBe("cylinder");
  });

  it("cannot be changed with a step after it, nor without the body under it", () => {
    const textured = texture(shape({}));
    const hollowed = {
      ...textured,
      edgeTreatmentHistory: [...(textured.edgeTreatmentHistory ?? []), { id: "edge-history-9", createdAt: 9, feature: { kind: "shell" as const, amount: 2, edgeCount: 0 }, before: textured }],
    };
    expect(surfaceTextureEntry(hollowed)).toBeNull();
    expect(shapeUnderSurfaceTexture(hollowed)).toBeNull();
    expect(surfaceTextureEntry({ ...textured, edgeTreatmentHistory: undefined })).toBeNull();
    // A body with no texture has nothing to take off.
    expect(surfaceTextureEntry(shape({}))).toBeNull();
  });

  it("keeps the body under it through saving and opening the project", async () => {
    const textured = texture(shape({}));
    const exported = await exportLylProject({
      projectId: "project-texture",
      projectName: "Texture",
      createdAt: 1_700_000_000_000,
      modifiedAt: 1_700_000_100_000,
      shapes: [textured],
      history: [editorHistoryEntry([textured], [])],
      historyIndex: 0,
      assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      snapGrid: DEFAULT_SNAP_GRID,
      placementElevation: 0,
    });
    const restored = (await importLylProject(exported)).shapes[0];
    expect(restored.surfaceTexture).toEqual(grooves);
    expect(surfaceTextureEntry(restored)?.feature.surfaceTexture).toEqual(grooves);
    const under = shapeUnderSurfaceTexture(restored);
    expect(under?.kind).toBe("cylinder");
    expect(under?.x).toBeCloseTo(12, 2);
    expect(under?.height).toBeCloseTo(20, 2);
  });
});
