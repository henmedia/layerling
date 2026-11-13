import { describe, expect, it } from "vitest";
import { AXIS_MIN_PIXELS, axisCrossWidth, mmPerScreenPixel } from "@/lib/workplaneGrid";

// Discussion #1666: zoomed out, the centre cross shrank with the plate to a hairline and was lost among the darker lines.
describe("the centre cross keeps a width on the screen", () => {
  it("tells how many mm a pixel covers for both cameras", () => {
    // 45 degrees, 1000 mm away, 800 px high: the view is 828 mm high, a pixel about 1.04 mm.
    expect(mmPerScreenPixel({ perspective: true, fovDegrees: 45 }, 1000, 800)).toBeCloseTo((2 * 1000 * Math.tan(Math.PI / 8)) / 800, 9);
    // Orthographic: a frame 400 mm high at zoom 2 on 800 px is a quarter mm per pixel.
    expect(mmPerScreenPixel({ perspective: false, top: 200, bottom: -200, zoom: 2 }, 0, 800)).toBeCloseTo(0.25, 9);
    expect(mmPerScreenPixel({ perspective: true, fovDegrees: 45 }, 1000, 0)).toBeNaN();
  });

  it("keeps its own band close up and grows to AXIS_MIN_PIXELS far out", () => {
    // Close up a pixel is 0.02 mm: the 0.3 mm band is 15 px wide and stays as it is.
    expect(axisCrossWidth(0.3, 0.02)).toBe(0.3);
    // Far out a pixel is 1.04 mm: the band would be a third of a pixel, now it is three pixels.
    expect(axisCrossWidth(0.3, 1.04)).toBeCloseTo(AXIS_MIN_PIXELS * 1.04, 9);
    expect(AXIS_MIN_PIXELS).toBe(3);
  });

  it("keeps its own band when the camera cannot be measured", () => {
    expect(axisCrossWidth(0.3, Number.NaN)).toBe(0.3);
    expect(axisCrossWidth(0.3, 0)).toBe(0.3);
  });
});
