import { afterEach, describe, expect, it } from "vitest";
import { setLanguage } from "@/lib/i18n";
import { displayShapeName, hasOwnShapeName, renamedShapeName } from "@/lib/shapeCatalog";

describe("displayShapeName", () => {
  afterEach(() => setLanguage("en", false));

  it("shows the editor's own English names in the interface language", () => {
    setLanguage("de", false);
    expect(displayShapeName({ name: "Sketch extrusion", kind: "mesh" })).toBe("Skizzenkörper");
    expect(displayShapeName({ name: "Sketch revolve", kind: "mesh" })).toBe("Drehkörper");
    expect(displayShapeName({ name: "Group", kind: "mesh" })).toBe("Gruppe");
    expect(displayShapeName({ name: "Box", kind: "box" })).toBe("Quader");
    expect(displayShapeName({ name: "Cylinder", kind: "cylinder" })).toBe("Zylinder");
  });

  it("leaves a name somebody typed alone", () => {
    setLanguage("de", false);
    expect(displayShapeName({ name: "Deckel", kind: "box" })).toBe("Deckel");
    // "Box" on a cylinder is not the catalogue name for it, so it was chosen.
    expect(displayShapeName({ name: "Box", kind: "cylinder" })).toBe("Box");
  });

  it("translates the roof from the shape library, also when its name was emptied (#1931)", () => {
    setLanguage("de", false);
    expect(displayShapeName({ name: "Roof", kind: "polygon", polygonRoof: true })).toBe("Dach");
    expect(hasOwnShapeName({ name: "Roof", kind: "polygon", polygonRoof: true })).toBe(false);
    expect(displayShapeName({ name: "", kind: "polygon", polygonRoof: true })).toBe("Dach");
    expect(displayShapeName({ name: "", kind: "polygon" })).not.toBe("Dach");
  });

  it("switches back with the language", () => {
    setLanguage("en", false);
    expect(displayShapeName({ name: "Sketch extrusion", kind: "mesh" })).toBe("Sketch body");
    expect(displayShapeName({ name: "Box", kind: "box" })).toBe("Box");
  });
});

describe("renamedShapeName", () => {
  afterEach(() => setLanguage("en", false));

  it("stores a new name, trimmed", () => {
    expect(renamedShapeName({ name: "Box", kind: "box" }, "  Lid  ")).toBe("Lid");
    expect(renamedShapeName({ name: "Lid", kind: "box" }, "Base")).toBe("Base");
  });

  it("changes nothing when the shown name is confirmed as it is", () => {
    expect(renamedShapeName({ name: "Lid", kind: "box" }, "Lid")).toBeUndefined();
    expect(renamedShapeName({ name: "Lid", kind: "box" }, " Lid ")).toBeUndefined();
  });

  it("does not store the translated name of an untouched shape", () => {
    setLanguage("de", false);
    // The field opens with "Quader"; confirming it must keep "Box" stored, so
    // the name still follows the language.
    expect(renamedShapeName({ name: "Box", kind: "box" }, "Quader")).toBeUndefined();
    expect(renamedShapeName({ name: "Group", kind: "mesh" }, "Gruppe")).toBeUndefined();
  });

  it("clears the name when the field is emptied, which shows the default again", () => {
    const shape = { name: "Lid", kind: "box" as const };
    expect(renamedShapeName(shape, "   ")).toBe("");
    expect(displayShapeName({ ...shape, name: "" })).toBe("Box");
  });
});

// A plant pot showed as "Plant pot" in German although the library calls it "Pflanztopf": the library's own
// entries and the names handed out by tools were not looked up (full audit, 26.11.2026).
describe("names of library entries and tools", () => {
  afterEach(() => setLanguage("en", false));

  it("shows them in the interface language", () => {
    setLanguage("de", false);
    expect(displayShapeName({ name: "Plant pot", kind: "vase" })).toBe("Pflanztopf");
    expect(displayShapeName({ name: "Lampshade", kind: "vase" })).not.toBe("Lampshade");
    expect(displayShapeName({ name: "Loft", kind: "mesh" })).toBe("Übergang");
    expect(displayShapeName({ name: "Sketch sweep", kind: "mesh" })).toBe("Skizze entlang Pfad");
    expect(displayShapeName({ name: "Thread insert", kind: "mesh" })).not.toBe("Thread insert");
    expect(displayShapeName({ name: "Magnet pocket", kind: "mesh" })).not.toBe("Magnet pocket");
  });

  it("does not take them for names somebody typed", () => {
    expect(hasOwnShapeName({ name: "Plant pot", kind: "vase" })).toBe(false);
    expect(hasOwnShapeName({ name: "Loft", kind: "mesh" })).toBe(false);
  });
});

// The export window suggests the name of a single body only when somebody gave it one (forum, 26.10.2026).
describe("hasOwnShapeName", () => {
  afterEach(() => setLanguage("en", false));

  it("tells a typed name from one the editor handed out", () => {
    expect(hasOwnShapeName({ name: "Lid", kind: "box" })).toBe(true);
    expect(hasOwnShapeName({ name: "Box", kind: "cylinder" })).toBe(true);
    expect(hasOwnShapeName({ name: "Box", kind: "box" })).toBe(false);
    expect(hasOwnShapeName({ name: "Group", kind: "mesh" })).toBe(false);
    expect(hasOwnShapeName({ name: "Hull", kind: "mesh" })).toBe(false);
    expect(hasOwnShapeName({ name: "  ", kind: "box" })).toBe(false);
  });

  it("does not take a confirmed translated name for a typed one", () => {
    setLanguage("de", false);
    expect(hasOwnShapeName({ name: "Quader", kind: "box" })).toBe(false);
    expect(hasOwnShapeName({ name: "Deckel", kind: "box" })).toBe(true);
  });
});
