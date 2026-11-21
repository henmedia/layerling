import { describe, expect, it } from "vitest";
import { tapeAddAfterClick, tapeMenuOpensMeasuring } from "@/lib/tapeMenu";

// #1768: the tape measure measures as soon as it is opened, without a second click on Add measurement.
describe("tape measure menu", () => {
  it("starts measuring when the menu is opened", () => {
    expect(tapeMenuOpensMeasuring({})).toBe(true);
    expect(tapeMenuOpensMeasuring({ hidden: false })).toBe(true);
  });

  it("leaves hidden measurements hidden: opening the menu alone does not show them", () => {
    expect(tapeMenuOpensMeasuring({ hidden: true })).toBe(false);
  });

  it("Add measurement switches off again with a second click", () => {
    expect(tapeAddAfterClick(false)).toBe(true);
    expect(tapeAddAfterClick(true)).toBe(false);
  });
});
