import { describe, expect, it } from "vitest";
import { DIMENSION_FORMULA_FIELDS, fieldFormulasEqual, formulaMatchesMillimeters, formulaMatchesValue, formulaToRemember, withFieldFormula } from "@/lib/fieldFormulas";
import { isArithmeticInput } from "@/lib/measurementUnits";
import { workplaneShapesEqual } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

// #180: a number field keeps the calculation it was set from, and shows it again while the value still fits.
describe("field formulas (#180)", () => {
  it("remembers a calculation, not a plain number, fraction or percentage", () => {
    expect(isArithmeticInput("(140+2)/2")).toBe(true);
    expect(isArithmeticInput("15*3")).toBe(true);
    expect(isArithmeticInput("120 - 2 x 4")).toBe(true);
    expect(isArithmeticInput("21")).toBe(false);
    expect(isArithmeticInput("-21")).toBe(false);
    expect(isArithmeticInput("1,5")).toBe(false);
    expect(isArithmeticInput("5/8")).toBe(false);
    expect(isArithmeticInput("1 5/8")).toBe(false);
    expect(isArithmeticInput("50%")).toBe(false);
    expect(isArithmeticInput("(40+2")).toBe(false);
    expect(formulaToRemember("  (140+2)/2 ")).toBe("(140+2)/2");
    expect(formulaToRemember("71")).toBeNull();
    expect(formulaToRemember(`(${"1+".repeat(50)}1)`)).toBeNull();
  });

  it("shows the formula again only while the value still equals it", () => {
    expect(formulaMatchesValue("(140+2)/2", 71)).toBe(true);
    expect(formulaMatchesValue("(140+2)/2", 71.0000001)).toBe(true);
    expect(formulaMatchesValue("(140+2)/2", 70.5)).toBe(false);
    expect(formulaMatchesValue(undefined, 71)).toBe(false);
    expect(formulaMatchesValue("nonsense", 71)).toBe(false);
  });

  it("sets and clears one field's formula and leaves a body without any as it was", () => {
    expect(withFieldFormula(undefined, "width", "(140+2)/2")).toEqual({ width: "(140+2)/2" });
    expect(withFieldFormula({ width: "(140+2)/2" }, "height", "5*2")).toEqual({ width: "(140+2)/2", height: "5*2" });
    expect(withFieldFormula({ width: "(140+2)/2" }, "width", null)).toBeUndefined();
    expect(withFieldFormula(undefined, "width", null)).toBeUndefined();
    expect(fieldFormulasEqual(undefined, undefined)).toBe(true);
    expect(fieldFormulasEqual({ width: "2*3" }, { width: "2*3" })).toBe(true);
    expect(fieldFormulasEqual({ width: "2*3" }, { width: "3*2" })).toBe(false);
    expect(fieldFormulasEqual({ width: "2*3" }, undefined)).toBe(false);
  });

  it("counts a changed formula as a real change, so the same value typed as a calculation is kept", () => {
    const shape = { id: "s", name: "Box", kind: "box", color: "#fff", x: 0, z: 0, elevation: 0, rotation: 0, width: 21, depth: 20, height: 20, size: 21 } as WorkplaneShape;
    expect(workplaneShapesEqual(shape, { ...shape })).toBe(true);
    expect(workplaneShapesEqual(shape, { ...shape, formulas: { width: "(40+2)/2" } })).toBe(false);
    expect(workplaneShapesEqual({ ...shape, formulas: { width: "(40+2)/2" } }, { ...shape, formulas: { width: "(40+2)/2" } })).toBe(true);
  });
});

// #180: the dimension boxes on the work area keep a calculation too, so the saved formula has to be checked in millimetres.
describe("formulas of the dimension boxes (#180)", () => {
  it("shows a formula only while it still gives the body's size", () => {
    expect(formulaMatchesMillimeters("(40+6)/2", 23, () => 23)).toBe(true);
    expect(formulaMatchesMillimeters("(40+6)/2", 24, () => 23)).toBe(false);
    expect(formulaMatchesMillimeters(undefined, 23, () => 23)).toBe(false);
    expect(formulaMatchesMillimeters("bad", 23, () => Number.NaN)).toBe(false);
  });

  it("names the inspector fields the boxes share their formulas with", () => {
    expect(DIMENSION_FORMULA_FIELDS).toEqual({ width: "width", depth: "length", height: "height", elevation: "positionZ" });
  });
});
