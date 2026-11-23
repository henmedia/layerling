import { describe, expect, it } from "vitest";
import { isUntitledName, plateExportName, projectExportFileName, stlNameAsksForNewFile, suggestedExportName } from "@/lib/exportNames";

describe("project export filenames", () => {
  it("uses the project name for each supported export format", () => {
    expect(projectExportFileName("Gearbox Prototype", "stl")).toBe("Gearbox Prototype.stl");
    expect(projectExportFileName("Gearbox Prototype", "obj")).toBe("Gearbox Prototype.obj");
    expect(projectExportFileName("Gearbox Prototype", "step")).toBe("Gearbox Prototype.step");
    expect(projectExportFileName("Gearbox Prototype", "svg")).toBe("Gearbox Prototype.svg");
    expect(projectExportFileName("Gearbox Prototype", "lyl")).toBe("Gearbox Prototype.lyl");
  });

  it("removes filesystem-reserved characters without discarding the project name", () => {
    expect(projectExportFileName('  enclosure: v2 / final?  ', "stl")).toBe("enclosure- v2 - final-.stl");
  });

  it("falls back to a useful name when the project name cannot be used", () => {
    expect(projectExportFileName("...", "obj")).toBe("layerling design.obj");
  });
});

describe("a name typed for an STL that is linked to a file already", () => {
  const project = "Gearbox";

  it("never asks while there is no linked file", () => {
    expect(stlNameAsksForNewFile("Liner", project, null)).toBe(false);
    expect(stlNameAsksForNewFile("Liner", project, undefined)).toBe(false);
  });

  it("keeps writing into the link while the window shows the name it started with", () => {
    expect(stlNameAsksForNewFile("Gearbox", project, "model.stl")).toBe(false);
    expect(stlNameAsksForNewFile("  Gearbox ", project, "model.stl")).toBe(false);
  });

  it("asks for a new file when another name is typed", () => {
    // The model and then its liner, one after the other: the second must not land in the file of the first.
    expect(stlNameAsksForNewFile("Liner", project, "Model.stl")).toBe(true);
  });

  it("keeps writing into the link when the name typed is the linked file's own, with or without .stl", () => {
    expect(stlNameAsksForNewFile("model", project, "Model.stl")).toBe(false);
    expect(stlNameAsksForNewFile("Model.STL", project, "Model.stl")).toBe(false);
  });
});

describe("the name suggested for one build plate (Discussion #1860)", () => {
  it("is the plate's own name", () => {
    expect(plateExportName("Base plate templates", "Plate 1: Main Plate 5x5", "Main Plate 5x5")).toBe("Main Plate 5x5");
    expect(plateExportName("Base plate templates", "Plate 2: Padding Part", "  Padding Part ")).toBe("Padding Part");
  });

  it("is the design's name with the plate behind it for a plate without a name, so two plates do not share a file name", () => {
    expect(plateExportName("Base plate templates", "Plate 2", "")).toBe("Base plate templates - Plate 2");
    expect(plateExportName("  ", "Plate 2", "")).toBe("Plate 2");
  });

  it("goes before the design's name and before the one body's own name in the export window", () => {
    expect(suggestedExportName("Gearbox", null, null)).toBe("Gearbox");
    expect(suggestedExportName("Gearbox", "Lid", null)).toBe("Lid");
    expect(suggestedExportName("Gearbox", null, { label: "Plate 1: Main Plate 5x5", name: "Main Plate 5x5" })).toBe("Main Plate 5x5");
    expect(suggestedExportName("Gearbox", "Lid", { label: "Plate 1: Main Plate 5x5", name: "Main Plate 5x5" })).toBe("Main Plate 5x5");
    expect(suggestedExportName("Gearbox", "Lid", { label: "Plate 2", name: "" })).toBe("Lid");
    expect(suggestedExportName("Gearbox", null, { label: "Plate 2", name: "" })).toBe("Gearbox - Plate 2");
  });

  it("gives a file name the system takes", () => {
    expect(projectExportFileName(plateExportName("Gearbox", "Plate 2", ""), "stl")).toBe("Gearbox - Plate 2.stl");
  });
});

describe("the only body of a design (Discussion #2001)", () => {
  it("goes under the design's name, once the design has one", () => {
    expect(suggestedExportName("Winter Cup", "Coffee Cup", null, { untitled: false })).toBe("Winter Cup");
    expect(suggestedExportName("Untitled design 3", "Coffee Cup", null, { untitled: true })).toBe("Coffee Cup");
    expect(suggestedExportName("  ", "Coffee Cup", null, { untitled: false })).toBe("Coffee Cup");
    expect(suggestedExportName("Winter Cup", "Coffee Cup", null, null)).toBe("Coffee Cup");
  });

  it("knows the names the start page gives", () => {
    expect(isUntitledName("Untitled design 3", "Untitled design {number}")).toBe(true);
    expect(isUntitledName("Untitled design 3b", "Untitled design {number}")).toBe(false);
    expect(isUntitledName("Untitled design", "Untitled design {number}")).toBe(false);
    expect(isUntitledName("Winter Cup", "Untitled design {number}")).toBe(false);
  });
});
