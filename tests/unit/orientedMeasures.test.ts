import { describe, expect, it } from "vitest";
import { orientedMeasures, withOrientedMeasures } from "@/lib/orientedMeasures";

const turn = (rotationX = 0, rotation = 0, rotationZ = 0) => ({ rotationX, rotation, rotationZ });
const labels = { width: "Width", height: "Height", length: "Length" };
const fields = [
  { id: "length", label: "Length" },
  { id: "width", label: "Width" },
  { id: "height", label: "Height" },
];

describe("orientedMeasures (#230)", () => {
  it("leaves an upright body alone", () => {
    expect(orientedMeasures(turn())).toEqual({ kind: "upright" });
    expect(withOrientedMeasures(fields, orientedMeasures(turn()), labels)).toEqual(fields);
  });

  it("names the measures of a roof laid on its side after the way they run now", () => {
    // A quarter turn about X: the own height runs to the back, the own length runs up.
    const oriented = orientedMeasures(turn(90));
    expect(oriented).toEqual({ kind: "aligned", meaning: { width: "width", height: "length", length: "height" } });
    const result = withOrientedMeasures(fields, oriented, labels);
    // The field that runs up is called Height and comes last, as usual.
    expect(result.map((field) => field.label)).toEqual(["Length", "Width", "Height"]);
    // Each still writes the same measure of the body: Height (the one running up) is the own length.
    expect(result.map((field) => field.id)).toEqual(["height", "width", "length"]);
  });

  it("follows a quarter turn about the vertical axis, which swaps width and length", () => {
    const oriented = orientedMeasures(turn(0, 90));
    expect(oriented).toEqual({ kind: "aligned", meaning: { width: "length", height: "height", length: "width" } });
    expect(withOrientedMeasures(fields, oriented, labels).map((field) => field.id)).toEqual(["width", "length", "height"]);
  });

  it("accepts a few hundredths of a degree, and a half turn changes no direction", () => {
    expect(orientedMeasures(turn(90.02)).kind).toBe("aligned");
    // Turned right over about X the body stands on its other end: the axes run as before, upside down.
    expect(orientedMeasures(turn(180))).toEqual({ kind: "upright" });
  });

  it("says tilted for any other angle and keeps the fields as they are", () => {
    expect(orientedMeasures(turn(30))).toEqual({ kind: "tilted" });
    expect(orientedMeasures(turn(0, 45))).toEqual({ kind: "tilted" });
    expect(withOrientedMeasures(fields, orientedMeasures(turn(30)), labels)).toEqual(fields);
  });

  it("only moves the three measures and leaves other fields in their places", () => {
    const mixed = [
      { id: "sides", label: "Sides" },
      { id: "length", label: "Length" },
      { id: "color", label: "Color" },
      { id: "width", label: "Width" },
      { id: "height", label: "Height" },
    ];
    const result = withOrientedMeasures(mixed, orientedMeasures(turn(90)), labels);
    expect(result.map((field) => field.id)).toEqual(["sides", "height", "color", "width", "length"]);
  });

  it("keeps a measure with a name of its own, such as a countersink's head diameter and length (#1634)", () => {
    const countersink = [
      { id: "width", label: "Head diameter" },
      { id: "screwHoleShaft", label: "Shaft diameter" },
      { id: "height", label: "Total length" },
    ];
    // Laid on its side (Y -90 degrees): the own height runs along X, the own width up.
    const oriented = orientedMeasures(turn(0, 0, -90));
    expect(oriented.kind).toBe("aligned");
    expect(withOrientedMeasures(countersink, oriented, labels)).toEqual(countersink);
    // A cylinder's Diameter stays, its plain Height follows the turn and stays in its place.
    const cylinder = [
      { id: "width", label: "Diameter" },
      { id: "height", label: "Height" },
    ];
    expect(withOrientedMeasures(cylinder, oriented, labels).map((field) => field.label)).toEqual(["Diameter", "Width"]);
  });
});
