import { describe, expect, it } from "vitest";
import { DEFAULT_WORKPLANE_WORKSPACE, handleDimensionLimit, heightHandleLimit, RULER_MAX_LENGTH, typedDimensionLimit } from "@/lib/workplaneSettings";

const plate = (width: number, depth: number, maxDimension?: number) => ({
  ...DEFAULT_WORKPLANE_WORKSPACE,
  width,
  depth,
  shapeCustomizations: maxDimension === undefined ? {} : { box: { maxDimension } },
});

describe("how far the handles pull a body (#181)", () => {
  it("keeps the old ceilings on the standard plate", () => {
    expect(handleDimensionLimit(plate(200, 200), "box", 220, "across", 20)).toBe(220);
    expect(handleDimensionLimit(plate(200, 200), "box", 180, "height", 20)).toBe(200);
  });

  it("reaches as far as a larger plate or printer", () => {
    expect(handleDimensionLimit(plate(350, 320), "box", 220, "across", 20)).toBe(350);
    expect(handleDimensionLimit(plate(350, 320), "box", 180, "height", 20, 325)).toBe(325);
  });

  it("never shrinks a body that is already larger, typed in", () => {
    expect(handleDimensionLimit(plate(200, 200), "box", 220, "across", 265)).toBe(265);
  });

  it("lets a custom size limit win over the plate", () => {
    expect(handleDimensionLimit(plate(350, 350, 120), "box", 220, "across", 20)).toBe(120);
    expect(handleDimensionLimit(plate(350, 350, 120), "box", 220, "across", 150)).toBe(150);
  });

  it("lets the handles pull a ruler as far as its slider goes, whatever the plate (#500)", () => {
    expect(handleDimensionLimit(plate(220, 220), "ruler", 220, "across", 150)).toBe(RULER_MAX_LENGTH);
    expect(handleDimensionLimit(plate(200, 200), "ruler", 220, "across", 20)).toBe(500);
    expect(handleDimensionLimit(plate(700, 650), "ruler", 220, "across", 20)).toBe(700);
    expect(handleDimensionLimit(plate(220, 220), "ruler", 220, "across", 620)).toBe(620);
  });
});

describe("how large a typed size makes a body (Discussion #1444)", () => {
  it("takes a size past the plate as it is typed, 36 in on the standard plate", () => {
    expect(typedDimensionLimit(plate(200, 200), "box", 20)).toBe(Number.POSITIVE_INFINITY);
    expect(Math.min(914.4, typedDimensionLimit(plate(200, 200), "group", 40))).toBe(914.4);
  });

  it("keeps a custom size limit, without shrinking a body already larger", () => {
    expect(typedDimensionLimit(plate(200, 200, 500), "box", 20)).toBe(500);
    expect(typedDimensionLimit(plate(200, 200, 500), "box", 650)).toBe(650);
  });
});

describe("how far the height handle pulls a body laid on its side (Discussion #1558)", () => {
  it("keeps the printer's height for a body standing upright", () => {
    expect(heightHandleLimit(plate(256, 256), "box", 20, 200, true)).toBe(200);
  });

  it("reaches as far as the plate when the height runs along it", () => {
    expect(heightHandleLimit(plate(256, 256), "box", 20, 200, false)).toBe(256);
    expect(heightHandleLimit(plate(200, 200), "box", 20, 180, false)).toBe(220);
  });

  it("keeps a custom size limit either way", () => {
    expect(heightHandleLimit(plate(256, 256, 120), "box", 20, 200, false)).toBe(120);
  });
});
