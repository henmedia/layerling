import { afterEach, describe, expect, it, vi } from "vitest";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { placementWorkplaneFromSurface } from "@/lib/placementWorkplane";
import { projectAssetFromBytes } from "@/lib/projectAssets";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import {
  exportLylProject,
  importLylProject,
  inspectLylProjectPackage,
  LYL_FORMAT_VERSION,
  LYL_LIMITS,
  LYL_NEWEST_READABLE_FORMAT_VERSION,
  LYL_SCHEMA_ID,
  type LylProjectDocumentV1,
  type LylProjectExportInput,
} from "@/lib/lylProject";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { CadDisplayEdge, ShapeKind, WorkplaneShape } from "@/types/layerling";

function shape(kind: ShapeKind, id = `${kind}-1`, overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id,
    name: kind,
    kind,
    color: "#12a4cc",
    x: 1,
    z: 2,
    elevation: 3,
    size: 20,
    width: 20,
    depth: 18,
    height: 16,
    rotation: 15,
    rotationX: 5,
    rotationZ: 10,
    locked: false,
    hidden: false,
    ...overrides,
  };
}

function displayEdges(count: number): CadDisplayEdge[] {
  return Array.from({ length: count }, (_unused, index) => ({
    points: [index, 0, 0, index, 5, 0, index, 5, 5],
  }));
}

function input(shapes: WorkplaneShape[], overrides: Partial<LylProjectExportInput> = {}): LylProjectExportInput {
  const history = [editorHistoryEntry(shapes, [])];
  return {
    projectId: "project-original",
    projectName: "Round trip",
    createdAt: 1_700_000_000_000,
    modifiedAt: 1_700_000_100_000,
    shapes,
    history,
    historyIndex: 0,
    assets: [],
    workspace: DEFAULT_WORKPLANE_WORKSPACE,
    snapGrid: DEFAULT_SNAP_GRID,
    placementElevation: 12.5,
    ...overrides,
  };
}

function packageDocument(bytes: Uint8Array) {
  const files = unzipSync(bytes);
  return { files, document: JSON.parse(strFromU8(files["project.json"])) as LylProjectDocumentV1 };
}

function mutateProject(bytes: Uint8Array, mutate: (document: LylProjectDocumentV1) => void) {
  const files = unzipSync(bytes);
  const document = JSON.parse(strFromU8(files["project.json"])) as LylProjectDocumentV1;
  mutate(document);
  files["project.json"] = strToU8(JSON.stringify(document));
  return zipSync(files);
}

describe("layerling .lyl project packages", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("round-trips every supported native shape kind and editable properties", async () => {
    const nativeKinds: ShapeKind[] = [
      "box", "cylinder", "ellipse", "sphere", "sketch", "scribble", "cone", "pyramid", "roof", "text", "roundRoof",
      "halfSphere", "torus", "tube", "gear", "thread", "spring", "ring", "wedge", "polygon", "icosahedron", "ruler",
    ];
    const shapes = nativeKinds.map((kind, index) => shape(kind, `${kind}-${index}`, {
      hole: index === 2,
      locked: index === 3,
      hidden: index === 4,
      mirrorX: index === 5,
      sides: index + 3,
      teeth: kind === "gear" ? 18 : undefined,
      toothSize: kind === "gear" ? 3.25 : undefined,
      toothWidth: kind === "gear" ? 2.75 : undefined,
      centerHoleSize: kind === "gear" ? 7.5 : undefined,
      gearType: kind === "gear" ? "helical" : undefined,
      helixAngle: kind === "gear" ? -30 : undefined,
      helixQuality: kind === "gear" ? 24 : undefined,
      text: kind === "text" ? "Editable" : undefined,
      sketchProfile: kind === "sketch" ? {
        points: [
          { id: "p1", x: 0, z: 0 },
          { id: "p2", x: 10, z: 0 },
          { id: "p3", x: 10, z: 10 },
        ],
        segments: [
          { id: "s1", startId: "p1", endId: "p2", kind: "line" },
          { id: "s2", startId: "p2", endId: "p3", kind: "bezier" },
          { id: "s3", startId: "p3", endId: "p1", kind: "line" },
        ],
      } : undefined,
    }));

    const customWorkspace = { ...DEFAULT_WORKPLANE_WORKSPACE, gridColor: "#a34fd1" };
    const exported = await exportLylProject(input(shapes, { workspace: customWorkspace }));
    const { document } = packageDocument(exported);
    const summary = await inspectLylProjectPackage(exported);
    const restored = await importLylProject(exported);

    expect(restored.projectName).toBe("Round trip");
    expect(restored.sourceProjectId).toBe("project-original");
    expect(JSON.stringify(restored.shapes)).toBe(JSON.stringify(shapes.map(canonicalizeShape)));
    expect(restored.workspace).toEqual(customWorkspace);
    expect(restored.snapGrid).toBe(DEFAULT_SNAP_GRID);
    expect(restored.placementElevation).toBe(12.5);
    expect(summary).toEqual({
      projectName: "Round trip",
      createdAt: 1_700_000_000_000,
      modifiedAt: 1_700_000_100_000,
      formatVersion: LYL_FORMAT_VERSION,
    });
    expect(document.assets.filter((entry) => entry.kind === "derived-mesh")).toHaveLength(0);
  });

  it("keeps the top edge of a text's letters through saving and opening, and refuses a broken one (#225)", async () => {
    const letters = shape("text", "text-edge", { text: "Ada", textEdge: { kind: "round", size: 0.4 } });
    const bytes = await exportLylProject(input([letters]));
    const restored = await importLylProject(bytes);
    expect(restored.shapes[0].textEdge).toEqual({ kind: "round", size: 0.4 });
    const broken = mutateProject(bytes, (document) => {
      const nodes = JSON.stringify(document);
      expect(nodes).toContain("textEdge");
      document.states.forEach((state) => state.nodes.forEach((node) => {
        const definition = node.definition as Record<string, unknown>;
        if (definition.textEdge) definition.textEdge = { kind: "bevel", size: 1 };
      }));
    });
    await expect(importLylProject(broken)).rejects.toThrow(/textEdge/);
  });

  it("keeps a group's Multicolor choice through saving and opening", async () => {
    const group = shape("box", "group-1", { multicolor: false });
    const other = shape("box", "group-2", { multicolor: true });
    const restored = await importLylProject(await exportLylProject(input([group, other])));
    expect(restored.shapes.map((entry) => entry.multicolor)).toEqual([false, true]);
  });

  it("keeps what a group does with its parts when it is resized, and refuses another word (#526)", async () => {
    const keeping = shape("box", "group-1", { groupResize: "keepParts" });
    const stretching = shape("box", "group-2");
    const bytes = await exportLylProject(input([keeping, stretching]));
    const restored = await importLylProject(bytes);
    expect(restored.shapes.map((entry) => entry.groupResize)).toEqual(["keepParts", undefined]);
    const broken = mutateProject(bytes, (document) => {
      expect(JSON.stringify(document)).toContain("keepParts");
      document.states.forEach((state) => state.nodes.forEach((node) => {
        const definition = node.definition as Record<string, unknown>;
        if (definition.groupResize) definition.groupResize = "sideways";
      }));
    });
    await expect(importLylProject(broken)).rejects.toThrow(/groupResize/);
  });

  it("loads an old cylinder with mismatched width and depth as circular instead of refusing it", async () => {
    const legacyCylinder = shape("cylinder", "legacy-cylinder", { width: 24, depth: 15 });
    const exported = await exportLylProject(input([legacyCylinder]));
    const restored = await importLylProject(exported);

    expect(restored.shapes[0].width).toBe(24);
    expect(restored.shapes[0].depth).toBe(24);
  });

  it("preserves an oriented placement workplane", async () => {
    const placementWorkplane = placementWorkplaneFromSurface(
      { x: 12, y: 8, z: -3 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
    );
    const sketchPlacementWorkplane = placementWorkplaneFromSurface(
      { x: -4, y: 6, z: 9 },
      { x: 0, y: 0, z: -1 },
      { x: 1, y: 0, z: 0 },
    );
    const exported = await exportLylProject(input([shape("box")], {
      placementElevation: 0,
      placementWorkplane,
      sketchPlacementWorkplane,
    }));
    const restored = await importLylProject(exported);

    expect(restored.placementWorkplane).toEqual(placementWorkplane);
    expect(restored.sketchPlacementWorkplane).toEqual(sketchPlacementWorkplane);
  });

  it("preserves editable revolve sketch settings and generated geometry", async () => {
    const revolve = shape("mesh", "revolve-sketch", {
      name: "Sketch revolve",
      sketchOperation: "revolve",
      sketchRevolve: { startAngle: 25, sweepAngle: -220, sides: 48, quality: 8 },
      sketchProfile: {
        points: [{ id: "p1", x: -4, z: 0 }, { id: "p2", x: -8, z: 0 }, { id: "p3", x: -8, z: 16 }, { id: "p4", x: -4, z: 16 }],
        segments: [
          { id: "s1", startId: "p1", endId: "p2", kind: "line" },
          { id: "s2", startId: "p2", endId: "p3", kind: "line" },
          { id: "s3", startId: "p3", endId: "p4", kind: "line" },
          { id: "s4", startId: "p4", endId: "p1", kind: "line" },
        ],
      },
      importedMesh: {
        positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
        baseWidth: 16,
        baseDepth: 16,
        baseHeight: 16,
        triangleCount: 1,
        sourceFormat: "json",
      },
    });
    const restored = await importLylProject(await exportLylProject(input([revolve])));
    expect(restored.shapes[0].sketchOperation).toBe("revolve");
    expect(restored.shapes[0].sketchRevolve).toEqual(revolve.sketchRevolve);
    expect(restored.shapes[0].sketchProfile).toEqual(revolve.sketchProfile);
    expect(restored.shapes[0].importedMesh?.positions).toEqual(revolve.importedMesh?.positions);
  });

  it("keeps the inset of a face tool body and refuses a negative one", async () => {
    const pad = shape("mesh", "face-pad", {
      name: "Face extrusion",
      sketchOperation: "extrude",
      sketchProfile: {
        points: [{ id: "p1", x: 0, z: 0 }, { id: "p2", x: 40, z: 0 }, { id: "p3", x: 40, z: 30 }],
        segments: [
          { id: "s1", startId: "p1", endId: "p2", kind: "line" },
          { id: "s2", startId: "p2", endId: "p3", kind: "line" },
          { id: "s3", startId: "p3", endId: "p1", kind: "line" },
        ],
        inset: { distance: 3, radius: 1.5 },
      },
      importedMesh: { positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], baseWidth: 40, baseDepth: 30, baseHeight: 3, triangleCount: 1, sourceFormat: "json" },
    });
    const restored = await importLylProject(await exportLylProject(input([pad])));
    expect(restored.shapes[0].sketchProfile?.inset).toEqual({ distance: 3, radius: 1.5 });
    const broken = { ...pad, sketchProfile: { ...pad.sketchProfile!, inset: { distance: -1, radius: 0 } } };
    await expect(importLylProject(await exportLylProject(input([broken])))).rejects.toThrow(/inset/);
  });

  it("keeps the side of a swept section that runs along the path, and refuses another word (#732)", async () => {
    const sweep = shape("mesh", "rail", {
      name: "Sketch sweep",
      sketchOperation: "sweep",
      sketchProfile: {
        points: [{ id: "p1", x: 0, z: 0 }, { id: "p2", x: 10, z: 0 }, { id: "p3", x: 10, z: 6 }],
        segments: [
          { id: "s1", startId: "p1", endId: "p2", kind: "line" },
          { id: "s2", startId: "p2", endId: "p3", kind: "line" },
          { id: "s3", startId: "p3", endId: "p1", kind: "line" },
        ],
        sweepAnchor: "left",
      },
      importedMesh: { positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], baseWidth: 10, baseDepth: 6, baseHeight: 3, triangleCount: 1, sourceFormat: "json" },
    });
    const restored = await importLylProject(await exportLylProject(input([sweep])));
    expect(restored.shapes[0].sketchProfile?.sweepAnchor).toBe("left");
    const middle = { ...sweep, sketchProfile: { ...sweep.sketchProfile!, sweepAnchor: "center" as const } };
    expect((await importLylProject(await exportLylProject(input([middle])))).shapes[0].sketchProfile?.sweepAnchor).toBeUndefined();
    const broken = { ...sweep, sketchProfile: { ...sweep.sketchProfile!, sweepAnchor: "top" as never } };
    await expect(importLylProject(await exportLylProject(input([broken])))).rejects.toThrow(/sweepAnchor/);
  });

  it("preserves nested groups, holes, intersection metadata, edge history, B-Rep, and undo/redo", async () => {
    const solid = shape("box", "solid", { x: 0 });
    // Ein Zylinder bleibt beim Laden immer kreisrund (canonicalizeShape) - die
    // sonst hier ueblichen ungleichen Breiten-/Tiefen-Vorgaben wuerden sonst
    // beim Rundreise-Vergleich stillschweigend angeglichen.
    const hole = shape("cylinder", "hole", { hole: true, color: "#b8c2cc", x: 4, depth: 20 });
    const group = shape("mesh", "group", {
      name: "Intersection",
      groupOperation: "intersection",
      groupedBaseWidth: 30,
      groupedBaseDepth: 30,
      groupedBaseHeight: 20,
      groupedShapes: [solid, hole],
      importedMesh: {
        positions: [0, 0, 0, 2, 0, 0, 0, 2, 0],
        normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
        baseWidth: 2,
        baseDepth: 1,
        baseHeight: 2,
        triangleCount: 1,
        sourceFormat: "json",
      },
      cadBrep: "BREP exact payload",
      edgeTreatments: [{ kind: "fillet", amount: 1.25, edgeCount: 3 }],
      edgeTreatmentHistory: [{
        id: "edge-history-1",
        createdAt: 1_700_000_050_000,
        feature: { kind: "fillet", amount: 1.25, edgeCount: 3 },
        before: shape("box", "group", { width: 30, depth: 30, height: 20 }),
      }],
    });
    const before = editorHistoryEntry([solid, hole], ["solid", "hole"]);
    const after = editorHistoryEntry([group], ["group"]);
    const exported = await exportLylProject(input([group], { history: [before, after], historyIndex: 1 }));
    const { document } = packageDocument(exported);

    expect(document.groups[0].operation).toBe("boolean-intersection");
    expect(document.features.some((feature) => feature.type === "fillet")).toBe(true);
    expect(document.exactCad).toHaveLength(1);

    const restored = await importLylProject(exported);
    expect(restored.history).toHaveLength(2);
    expect(restored.historyIndex).toBe(1);
    expect(restored.shapes[0].groupedShapes).toEqual([solid, hole]);
    expect(restored.shapes[0].groupOperation).toBe("intersection");
    expect(restored.shapes[0].cadBrep).toBe("BREP exact payload");
    expect(restored.shapes[0].edgeTreatmentHistory?.[0].before.kind).toBe("box");
  });

  it("saves deleted faces as their own operation and reads them back", async () => {
    const body = shape("box", "body", {
      cadBrep: "BREP exact payload",
      edgeTreatments: [{ kind: "deleteFace", amount: 0, edgeCount: 0, faceIds: [6], faceCount: 1 }],
    });
    const exported = await exportLylProject(input([body]));
    const { document } = packageDocument(exported);

    expect(document.features.map((feature) => feature.type)).toEqual(["delete-face"]);
    const restored = await importLylProject(exported);
    expect(restored.shapes[0].edgeTreatments).toEqual([{ kind: "deleteFace", amount: 0, edgeCount: 0, faceIds: [6], faceCount: 1 }]);
  });

  it("keeps a bundle a bundle, with its hole as a part and no cut", async () => {
    const plate = shape("box", "plate", { color: "#222222" });
    const logo = shape("box", "logo", { color: "#ffffff", width: 10, depth: 10 });
    const hole = shape("box", "bore", { hole: true, color: "#b8c2cc", x: 12, width: 6, depth: 6 });
    const bundle = shape("mesh", "bundle", {
      name: "Bundle",
      groupOperation: "bundle",
      groupedBaseWidth: 30,
      groupedBaseDepth: 30,
      groupedBaseHeight: 20,
      groupedShapes: [plate, logo, hole],
    });
    const exported = await exportLylProject(input([bundle]));
    // An index that says "subtraction" would promise a cut the bundle never makes.
    expect(packageDocument(exported).document.groups[0].operation).toBe("group");
    const restored = await importLylProject(exported);
    expect(restored.shapes[0].groupOperation).toBe("bundle");
    expect(restored.shapes[0].groupedShapes).toEqual([plate, logo, hole]);
    expect(restored.shapes[0].importedMesh).toBeUndefined();
  });

  it("repairs duplicate descendant IDs from legacy shallow-copied groups during export", async () => {
    const roof = shape("roundRoof", "round-roof-shared-child");
    const box = shape("box", "box-shared-child");
    const original = shape("mesh", "group-original", { groupedShapes: [roof, box] });
    const duplicate = { ...original, id: "group-copy", x: 30 };
    const history = [
      editorHistoryEntry([original], [original.id]),
      editorHistoryEntry([original, duplicate], [duplicate.id]),
    ];

    const exported = await exportLylProject(input([original, duplicate], { history, historyIndex: 1 }));
    const restored = await importLylProject(exported);
    const collectIds = (entry: WorkplaneShape): string[] => [
      entry.id,
      ...(entry.groupedShapes ?? []).flatMap(collectIds),
    ];
    const restoredIds = restored.shapes.flatMap(collectIds);

    expect(original.groupedShapes?.[0].id).toBe(duplicate.groupedShapes?.[0].id);
    expect(restored.shapes.map((entry) => entry.id)).toEqual(["group-original", "group-copy"]);
    expect(new Set(restoredIds).size).toBe(restoredIds.length);
    expect(restored.history).toHaveLength(2);
    expect(restored.historyIndex).toBe(1);
  });

  it("preserves every silently packaged undo and redo action", async () => {
    const created = shape("box", "history-box", { width: 20, depth: 20, x: 0 });
    const resized = { ...created, width: 30 };
    const moved = { ...resized, x: 18 };
    const history = [
      editorHistoryEntry([created], ["history-box"]),
      editorHistoryEntry([resized], ["history-box"]),
      editorHistoryEntry([moved], ["history-box"]),
    ];

    const restored = await importLylProject(await exportLylProject(input([resized], {
      history,
      historyIndex: 1,
      compressionLevel: 1,
    })));

    expect(restored.history).toHaveLength(3);
    expect(restored.historyIndex).toBe(1);
    expect(restored.history[0].shapes[0]).toMatchObject({ width: 20, x: 0 });
    expect(restored.history[1].shapes[0]).toMatchObject({ width: 30, x: 0 });
    expect(restored.history[2].shapes[0]).toMatchObject({ width: 30, x: 18 });
    expect(restored.shapes[0]).toMatchObject({ width: 30, x: 0 });
  });

  it("reopens a project that holds an imported 3MF source", async () => {
    const asset = await projectAssetFromBytes("plate.3mf", "3mf", strToU8("PK 3mf source"));
    const importedMesh: NonNullable<WorkplaneShape["importedMesh"]> = {
      positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      baseWidth: 1,
      baseDepth: 1,
      baseHeight: 1,
      triangleCount: 1,
      sourceFormat: "3mf",
      assetId: asset.id,
    };
    const exported = await exportLylProject(input([shape("mesh", "plate", { importedMesh })], { assets: [asset] }));
    const restored = await importLylProject(exported, {
      sourceImporter: async () => ({ ...importedMesh, assetId: undefined }),
    });

    expect(restored.assets.map((entry) => entry.sourceFormat)).toContain("3mf");
    expect(restored.shapes).toHaveLength(1);
  });

  it("stores one original source asset for repeated imported instances and regenerates it once", async () => {
    const sourceBytes = strToU8("solid source");
    const asset = await projectAssetFromBytes("shared.stl", "stl", sourceBytes);
    const importedMesh: NonNullable<WorkplaneShape["importedMesh"]> = {
      positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      baseWidth: 1,
      baseDepth: 1,
      baseHeight: 1,
      triangleCount: 1,
      sourceFormat: "stl",
      assetId: asset.id,
    };
    const instances = [
      shape("mesh", "instance-a", { importedMesh, x: 0 }),
      shape("mesh", "instance-b", { importedMesh, x: 30 }),
    ];
    const exported = await exportLylProject(input(instances, { assets: [asset] }));
    const { document } = packageDocument(exported);
    let importCalls = 0;
    const restored = await importLylProject(exported, {
      sourceImporter: async () => {
        importCalls += 1;
        return { ...importedMesh, assetId: undefined };
      },
    });

    expect(document.assets.filter((entry) => entry.kind === "source")).toHaveLength(1);
    expect(document.assets.filter((entry) => entry.kind === "derived-mesh")).toHaveLength(0);
    expect(restored.assets).toHaveLength(1);
    expect(restored.shapes[0].importedMesh?.assetId).toBe(restored.shapes[1].importedMesh?.assetId);
    expect(importCalls).toBe(1);
  });

  it("exports and imports source-backed projects without Web Crypto", async () => {
    const sourceBytes = strToU8("solid http source");
    const asset = await projectAssetFromBytes("http.stl", "stl", sourceBytes);
    const importedMesh: NonNullable<WorkplaneShape["importedMesh"]> = {
      positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      baseWidth: 1,
      baseDepth: 1,
      baseHeight: 1,
      triangleCount: 1,
      sourceFormat: "stl",
      assetId: asset.id,
    };
    vi.stubGlobal("crypto", {});

    const exported = await exportLylProject(input([shape("mesh", "http-object", { importedMesh })], { assets: [asset] }));
    const restored = await importLylProject(exported, {
      sourceImporter: async () => ({ ...importedMesh, assetId: undefined }),
    });

    expect(packageDocument(exported).document.assets[0].sha256).toBe(asset.sha256);
    expect(restored.assets[0].sha256).toBe(asset.sha256);
    expect(restored.shapes[0].importedMesh?.assetId).toBe(restored.assets[0].id);
  });

  it("shares decoded derived-mesh arrays across restored history states", async () => {
    const importedMesh: NonNullable<WorkplaneShape["importedMesh"]> = {
      positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      baseWidth: 1,
      baseDepth: 1,
      baseHeight: 1,
      triangleCount: 1,
      sourceFormat: "json",
    };
    const before = shape("mesh", "derived-history", { importedMesh, x: 0 });
    const after = { ...before, x: 20 };
    const history = [editorHistoryEntry([before], []), editorHistoryEntry([after], [after.id])];

    const restored = await importLylProject(await exportLylProject(input([after], { history, historyIndex: 1 })));
    const firstPositions = restored.history[0].shapes[0].importedMesh?.positions;
    const secondPositions = restored.history[1].shapes[0].importedMesh?.positions;

    expect(firstPositions).toBe(secondPositions);
    expect(restored.shapes[0].importedMesh?.positions).toBe(secondPositions);
  });

  it.each(["svg", "step"] as const)("stores and restores original %s sources", async (sourceFormat) => {
    const asset = await projectAssetFromBytes(`source.${sourceFormat}`, sourceFormat, strToU8(`${sourceFormat} source`));
    const importedMesh: NonNullable<WorkplaneShape["importedMesh"]> = {
      positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      baseWidth: 1,
      baseDepth: 1,
      baseHeight: 1,
      triangleCount: 1,
      sourceFormat,
      assetId: asset.id,
      ...(sourceFormat === "step" ? { brepStep: "exact STEP" } : {}),
    };
    const exported = await exportLylProject(input([shape("mesh", `${sourceFormat}-object`, { importedMesh })], { assets: [asset] }));
    const { document } = packageDocument(exported);
    const restored = await importLylProject(exported, { sourceImporter: async () => importedMesh });

    expect(document.assets.filter((entry) => entry.kind === "source")).toHaveLength(1);
    expect(document.assets.filter((entry) => entry.kind === "derived-mesh")).toHaveLength(0);
    expect(restored.assets[0].sourceFormat).toBe(sourceFormat);
    expect(restored.shapes[0].importedMesh?.sourceFormat).toBe(sourceFormat);
    if (sourceFormat === "step") expect(document.exactCad[0].importedStepAssetId).toBeTruthy();
  });

  it("deduplicates and restores reference images stored in sketches and image plates", async () => {
    const dataUrl = "data:image/png;base64,AAECAwQ=";
    const imageShape = shape("sketch", "sketch-images", {
      imagePlate: { dataUrl, mimeType: "image/png", pixelWidth: 2, pixelHeight: 2 },
      sketchProfile: {
        points: [
          { id: "p1", x: 0, z: 0 },
          { id: "p2", x: 10, z: 0 },
          { id: "p3", x: 0, z: 10 },
        ],
        segments: [
          { id: "s1", startId: "p1", endId: "p2" },
          { id: "s2", startId: "p2", endId: "p3" },
          { id: "s3", startId: "p3", endId: "p1" },
        ],
        images: [{
          id: "image-1",
          name: "Reference",
          dataUrl,
          mimeType: "image/png",
          pixelWidth: 2,
          pixelHeight: 2,
          x: 0,
          z: 0,
          width: 10,
          depth: 10,
          lockAspect: true,
          locked: true,
        }],
      },
    });
    const exported = await exportLylProject(input([imageShape]));
    const { document } = packageDocument(exported);
    const restored = await importLylProject(exported);

    expect(document.assets.filter((entry) => entry.kind === "image")).toHaveLength(1);
    expect(restored.shapes[0].imagePlate?.dataUrl).toBe(dataUrl);
    expect(restored.shapes[0].sketchProfile?.images?.[0].dataUrl).toBe(dataUrl);
    expect(restored.shapes[0].sketchProfile?.images?.[0].locked).toBe(true);
  });

  it("deduplicates derived geometry when legacy imported objects share one mesh", async () => {
    const mesh = {
      positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      baseWidth: 1,
      baseDepth: 1,
      baseHeight: 1,
      triangleCount: 1,
      sourceFormat: "json" as const,
    };
    const exported = await exportLylProject(input([
      shape("mesh", "legacy-a", { importedMesh: mesh }),
      shape("mesh", "legacy-b", { importedMesh: mesh }),
    ]));
    const { document } = packageDocument(exported);
    const restored = await importLylProject(exported);

    expect(document.assets.filter((entry) => entry.kind === "derived-mesh")).toHaveLength(1);
    expect(restored.shapes[0].importedMesh?.positions).toEqual(mesh.positions);
    expect(restored.shapes[1].importedMesh?.positions).toEqual(mesh.positions);
  });

  it("exports in a far-western timezone without underflowing the ZIP 1980 date floor", async () => {
    // ZIP stores entry mtimes as DOS dates, and fflate encodes them with local-time
    // getters, rejecting years outside 1980-2099 with "date not in range 1980-2099".
    // A UTC-pinned epoch rolls back to 1979 west of UTC, so exercise the fix under the
    // most extreme western offset. Node re-reads process.env.TZ per Date operation.
    const originalTz = process.env.TZ;
    process.env.TZ = "Etc/GMT+12";
    try {
      const exported = await exportLylProject(input([shape("box")]));
      const restored = await importLylProject(exported);
      expect(restored.shapes[0].kind).toBe("box");
    } finally {
      if (originalTz === undefined) delete process.env.TZ;
      else process.env.TZ = originalTz;
    }
  });

  it("writes compact project data that stays compatible with the reader limit", async () => {
    const exported = await exportLylProject(input([shape("box")]));
    const { files, document } = packageDocument(exported);
    const projectJson = strFromU8(files["project.json"]);

    expect(projectJson).toBe(JSON.stringify(document));
    await expect(importLylProject(exported)).resolves.toMatchObject({ projectName: "Round trip" });
  });

  it("refuses to create an .lyl package that its reader cannot reopen", async () => {
    const oversizedName = "x".repeat(LYL_LIMITS.projectJsonBytes);

    await expect(exportLylProject(input([shape("box")], { projectName: oversizedName })))
      .rejects.toThrow("Project data exceeds the 64 MB project file limit");
  });

  it("migrates the documented v0 JSON project without changing IDs", async () => {
    const box = shape("box", "legacy-box");
    const legacy = strToU8(JSON.stringify({
      schema: LYL_SCHEMA_ID,
      formatVersion: 0,
      project: { id: "legacy-project", name: "Legacy", createdAt: 100, modifiedAt: 200 },
      shapes: [box],
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      snapGrid: "0.5 mm",
    }));

    const restored = await importLylProject(legacy);

    expect(restored.migratedFromVersion).toBe(0);
    expect(restored.sourceProjectId).toBe("legacy-project");
    expect(restored.shapes[0].id).toBe("legacy-box");
    expect(restored.snapGrid).toBe("0.5 mm");
  });

  it("rejects unsupported future versions before restoring any state", async () => {
    const exported = await exportLylProject(input([shape("box")]));
    const future = mutateProject(exported, (document) => {
      (document as { formatVersion: number }).formatVersion = LYL_NEWEST_READABLE_FORMAT_VERSION + 1;
    });

    await expect(importLylProject(future)).rejects.toThrow("requires a newer layerling version");
  });

  it("rejects missing references, duplicate IDs, cyclic groups, unknown operations, and corrupt assets", async () => {
    const twoShapes = await exportLylProject(input([shape("box", "one"), shape("box", "two")]));
    const missing = mutateProject(twoShapes, (document) => {
      document.states[0].rootNodeIds[0] = "missing-node";
    });
    await expect(importLylProject(missing)).rejects.toThrow("missing node");

    const duplicate = mutateProject(twoShapes, (document) => {
      const [first, second] = document.states[0].nodes;
      second.objectId = first.objectId;
      second.definition.id = first.objectId;
    });
    await expect(importLylProject(duplicate)).rejects.toThrow("duplicate object ID");

    const grouped = await exportLylProject(input([shape("mesh", "group-cycle", {
      groupedShapes: [shape("box", "child-a"), shape("box", "child-b")],
    })]));
    const cyclic = mutateProject(grouped, (document) => {
      const root = document.states[0].nodes.find((node) => node.objectId === "group-cycle")!;
      root.groupedShapeNodeIds = [root.nodeId];
    });
    await expect(importLylProject(cyclic)).rejects.toThrow("Cyclic group");

    const unknownOperation = mutateProject(grouped, (document) => {
      document.features[0].type = "unsupported-operation";
    });
    await expect(importLylProject(unknownOperation)).rejects.toThrow("Unknown operation type");

    const legacyMesh = await exportLylProject(input([shape("mesh", "mesh", {
      importedMesh: {
        positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
        baseWidth: 1,
        baseDepth: 1,
        baseHeight: 1,
        triangleCount: 1,
        sourceFormat: "json",
      },
    })]));
    const { files, document } = packageDocument(legacyMesh);
    const asset = document.assets.find((entry) => entry.kind === "derived-mesh")!;
    files[asset.path][20] ^= 0xff;
    await expect(importLylProject(zipSync(files))).rejects.toThrow("integrity check");
  });

  it("stores display edges once instead of repeating them in every undo state", async () => {
    const edges = displayEdges(4);
    const placed = shape("box", "cad-box", { cadDisplayEdges: edges, cadDisplayEdgesVersion: 2 });
    const moved = { ...placed, x: placed.x + 5 };
    const movedAgain = { ...moved, x: moved.x + 5 };
    const history = [placed, moved, movedAgain].map((state) => editorHistoryEntry([state], []));

    const exported = await exportLylProject(input([movedAgain], { history, historyIndex: 2 }));
    const { document } = packageDocument(exported);
    const edgeAssets = document.assets.filter((entry) => entry.kind === "display-edges");

    expect(document.states).toHaveLength(3);
    expect(edgeAssets).toHaveLength(1);
    document.states.forEach((state) => state.nodes.forEach((node) => {
      expect(node.definition.cadDisplayEdges).toBeUndefined();
      expect(node.cadDisplayEdgesAssetId).toBe(edgeAssets[0].id);
    }));

    const restored = await importLylProject(exported);
    expect(restored.shapes[0].cadDisplayEdges).toEqual(edges);
    expect(restored.shapes[0].cadDisplayEdgesVersion).toBe(2);
    expect(restored.history).toHaveLength(3);
    restored.history.forEach((entry) => {
      expect(entry.shapes[0].cadDisplayEdges).toBe(restored.shapes[0].cadDisplayEdges);
    });
  });

  it("keeps an empty display edge list inline and restores it unchanged", async () => {
    const exported = await exportLylProject(input([shape("box", "cad-box", { cadDisplayEdges: [], cadDisplayEdgesVersion: 2 })]));
    const { document } = packageDocument(exported);

    expect(document.assets.filter((entry) => entry.kind === "display-edges")).toHaveLength(0);
    expect((await importLylProject(exported)).shapes[0].cadDisplayEdges).toEqual([]);
  });

  it("encodes and hashes unchanged resources only once across repeated saves", async () => {
    const project = input([shape("box", "cad-box", { cadDisplayEdges: displayEdges(6), cadDisplayEdgesVersion: 2 })], {
      assets: [await projectAssetFromBytes("cube.stl", "stl", strToU8("solid cube\nendsolid cube\n"))],
    });
    const meshed = shape("mesh", "baked", {
      importedMesh: {
        positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
        baseWidth: 1,
        baseDepth: 1,
        baseHeight: 1,
        triangleCount: 1,
        sourceFormat: "json",
      },
    });
    const shapes = [...project.shapes, meshed];
    const repeated = { ...project, shapes, history: [editorHistoryEntry(shapes, [])], historyIndex: 0 };

    const first = await exportLylProject(repeated);
    const digest = vi.spyOn(globalThis.crypto.subtle, "digest");
    try {
      const second = await exportLylProject(repeated);
      expect(digest).not.toHaveBeenCalled();
      expect(strFromU8(packageDocument(second).files["project.json"])).toBe(strFromU8(packageDocument(first).files["project.json"]));
    } finally {
      digest.mockRestore();
    }
  });

  /*
   * Notizen sind kein Koerper: Sie stehen neben den Knoten eines Standes, nicht
   * darin. Ein Leser, der sie nicht kennt, uebergeht das Feld und oeffnet die
   * Datei trotzdem - das ist der Preis dafuer, dass die Formatnummer bleibt.
   */
  it("carries notes through a round trip, pinned and free", async () => {
    const pinned = { id: "note-1", text: "Hier 4,2 aufreiben", x: 4, y: 6, z: 8, anchor: { shapeId: "box-1", normalized: [0.5, 0.5, 0.5] as [number, number, number] } };
    const free = { id: "note-2", text: "Stützen nicht vergessen", x: -20, y: 0, z: 12, collapsed: true };
    const shapes = [shape("box")];
    const exported = await exportLylProject(input(shapes, {
      notes: [pinned, free],
      history: [editorHistoryEntry(shapes, [], [pinned, free])],
    }));

    const { document } = packageDocument(exported);
    expect(document.states[0].notes).toEqual([pinned, free]);

    const restored = await importLylProject(exported);
    expect(restored.notes).toEqual([pinned, free]);
    expect(restored.history[restored.historyIndex].notes).toEqual([pinned, free]);
  });

  it("carries a reference point through a round trip next to a note", async () => {
    const note = { id: "note-1", text: "Hier", x: 1, y: 2, z: 3 };
    const point = { id: "note-2", text: "", x: 10, y: 8, z: -20, kind: "point" as const };
    const shapes = [shape("box")];
    const exported = await exportLylProject(input(shapes, {
      notes: [note, point],
      history: [editorHistoryEntry(shapes, [], [note, point])],
    }));
    const restored = await importLylProject(exported);
    expect(restored.notes).toEqual([note, point]);
    expect(restored.history[restored.historyIndex].notes).toEqual([note, point]);
  });

  it("writes no note field into a design that has none", async () => {
    const { document } = packageDocument(await exportLylProject(input([shape("box")])));
    expect(document.states[0]).not.toHaveProperty("notes");
  });

  it("keeps two states apart that differ only in a note", async () => {
    const shapes = [shape("box")];
    const first = editorHistoryEntry(shapes, []);
    const second = editorHistoryEntry(shapes, [], [{ id: "note-1", text: "Zweiter Stand", x: 0, y: 0, z: 0 }]);
    const exported = await exportLylProject(input(shapes, {
      notes: second.notes,
      history: [first, second],
      historyIndex: 1,
    }));

    const { document } = packageDocument(exported);
    // Gleiche Koerper, aber zwei Staende - sonst faende das Rueckgaengig zurueck
    // in einen Stand, in dem die Notiz schon da ist.
    expect(document.states).toHaveLength(2);
    const restored = await importLylProject(exported);
    expect(restored.history[0].notes).toBeUndefined();
    expect(restored.history[1].notes).toHaveLength(1);
  });

  it("opens a design whose notes are damaged instead of refusing it", async () => {
    const shapes = [shape("box")];
    const exported = await exportLylProject(input(shapes, {
      notes: [{ id: "note-1", text: "gut", x: 0, y: 0, z: 0 }],
      history: [editorHistoryEntry(shapes, [], [{ id: "note-1", text: "gut", x: 0, y: 0, z: 0 }])],
    }));
    const broken = mutateProject(exported, (document) => {
      (document.states[0] as { notes?: unknown }).notes = [{ id: "note-1", text: "gut", x: 0, y: 0, z: 0 }, 42, null];
    });

    const restored = await importLylProject(broken);
    expect(restored.notes).toHaveLength(1);
  });

  it("rejects a display edge reference that does not resolve to an edge asset", async () => {
    const exported = await exportLylProject(input([shape("box", "cad-box", { cadDisplayEdges: displayEdges(3), cadDisplayEdgesVersion: 2 })]));
    const broken = mutateProject(exported, (document) => {
      document.states[0].nodes[0].cadDisplayEdgesAssetId = "display-edges-missing";
    });

    await expect(importLylProject(broken)).rejects.toThrow("missing display edge asset");
  });
});

describe("history timestamps", () => {
  it("round-trips the time a state was recorded and tolerates states without one", async () => {
    const before = editorHistoryEntry([shape("box")], []);
    const after = editorHistoryEntry([shape("box", "box-1", { x: 40 })], [], [], undefined, Date.UTC(2026, 9, 7, 12, 30));
    const exported = await exportLylProject(input([shape("box", "box-1", { x: 40 })], { history: [before, after], historyIndex: 1 }));
    const document = JSON.parse(strFromU8(unzipSync(exported)["project.json"])) as LylProjectDocumentV1;

    expect(document.history.entries[0].recordedAt).toBeUndefined();
    expect(document.history.entries[1].recordedAt).toBe("2026-10-07T12:30:00.000Z");

    const restored = await importLylProject(exported);
    expect(restored.history[0].at).toBeUndefined();
    expect(restored.history[1].at).toBe(Date.UTC(2026, 9, 7, 12, 30));
  });
});
