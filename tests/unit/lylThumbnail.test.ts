import { describe, expect, it } from "vitest";
import { unzipSync } from "fflate";
import { exportLylProject, importLylProject, inspectLylProjectPackage, LYL_THUMBNAIL_FILE, lylThumbnailFiles, withLylProjectName, withLylThumbnail } from "@/lib/lylProject";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * A .lyl carries the picture of its design as thumbnail.png at its top level, for other programs to show without
 * building the design (Discussion #1226); layerling opens such a package as before.
 */
const box = { id: "box-1", name: "Box", kind: "box", x: 0, y: 0, z: 0, size: 20, width: 20, depth: 10, height: 5, rotation: 0, color: "#d84a3a" } as WorkplaneShape;

// The first bytes of a PNG and a few more: what the file holds is handed through as it is.
const picture = (fill: number) => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, fill, fill, fill]);

function savedPackage(extraFiles?: Record<string, Uint8Array>) {
  return exportLylProject({
    projectId: "design-1",
    projectName: "Holder",
    createdAt: Date.UTC(2026, 10, 1),
    modifiedAt: Date.UTC(2026, 10, 2),
    shapes: [box],
    history: [],
    historyIndex: 0,
    assets: [],
    compressionLevel: 1,
    extraFiles,
  });
}

describe("the picture of a design in its .lyl (#1226)", () => {
  it("goes in as thumbnail.png at the top level, and the design opens as before", async () => {
    const bytes = await savedPackage(lylThumbnailFiles(picture(1)));
    expect(LYL_THUMBNAIL_FILE).toBe("thumbnail.png");
    expect(unzipSync(bytes)["thumbnail.png"]).toEqual(picture(1));
    expect((await inspectLylProjectPackage(bytes)).projectName).toBe("Holder");
    const restored = await importLylProject(bytes);
    expect(restored.shapes.map((shape) => [shape.kind, shape.width, shape.depth, shape.height])).toEqual([["box", 20, 10, 5]]);
  });

  it("stays out when there is no picture", async () => {
    expect(lylThumbnailFiles(null)).toBeUndefined();
    expect(lylThumbnailFiles(new Uint8Array())).toBeUndefined();
    expect(Object.keys(unzipSync(await savedPackage(lylThumbnailFiles(null))))).not.toContain("thumbnail.png");
  });

  it("is put into a package saved before, in place of an older one, and stays through a rename", async () => {
    const saved = await savedPackage();
    expect(await withLylThumbnail(saved, null)).toEqual(saved);
    const pictured = await withLylThumbnail(saved, picture(2));
    expect(unzipSync(pictured)["thumbnail.png"]).toEqual(picture(2));
    expect(unzipSync(await withLylThumbnail(pictured, picture(3)))["thumbnail.png"]).toEqual(picture(3));
    expect((await importLylProject(pictured)).shapes).toHaveLength(1);
    expect(unzipSync(await withLylProjectName(pictured, "Other name"))["thumbnail.png"]).toEqual(picture(2));
  });
});
