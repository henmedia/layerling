// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_IMPORT_COLOR, readImportColor, storeImportColor } from "@/lib/importPreferences";
import { importModelFiles } from "@/lib/modelImport";
import { importedShapesFromObj } from "@/lib/objImport";
import { importedShapeFromTriangleSoup } from "@/lib/stlImport";

const TRIANGLES = [0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 0, 0, 10, 0, 0, 0, 10];
const OBJ = "v 0 0 0\nv 10 0 0\nv 0 10 0\nv 0 0 10\nf 1 2 3\nf 1 3 4\n";

describe("the colour of imported bodies (Discussion #2079)", () => {
  beforeEach(() => window.localStorage.clear());

  it("is the usual blue until chosen, and after going back", () => {
    expect(readImportColor()).toBe(DEFAULT_IMPORT_COLOR);
    storeImportColor("#FFFFFF");
    expect(readImportColor()).toBe("#ffffff");
    storeImportColor(DEFAULT_IMPORT_COLOR);
    expect(window.localStorage.length).toBe(0);
  });

  it("falls back on a broken entry", () => {
    window.localStorage.setItem("layerling.importColor", "white");
    expect(readImportColor()).toBe(DEFAULT_IMPORT_COLOR);
  });

  it("colours a mesh without a colour of its own", () => {
    expect(importedShapeFromTriangleSoup("a.stl", TRIANGLES, undefined, "stl", { color: "#ffffff" }).color).toBe("#ffffff");
    expect(importedShapesFromObj("a.obj", OBJ, [], { color: "#ffffff" }).shapes[0].color).toBe("#ffffff");
  });

  it("leaves a colour of the file alone, the usual blue too", () => {
    const own = importedShapesFromObj("a.obj", `usemtl blue\n${OBJ}`, ["newmtl blue\nKd 0 0.5961 0.7804\n"], { color: "#ffffff" });
    expect(own.shapes[0].color).toBe(DEFAULT_IMPORT_COLOR);
  });

  it("reaches an SVG through the import itself", async () => {
    storeImportColor("#ffffff");
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>';
    const result = (await importModelFiles([new File([svg], "a.svg", { type: "image/svg+xml" })]))!;
    expect(result.shapes.map((shape) => shape.color)).toEqual(["#ffffff"]);
  });
});
