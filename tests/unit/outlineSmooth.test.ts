import { describe, expect, it } from "vitest";
import { smoothOutline } from "@/lib/outlineSmooth";

/* Smoothing a lasso drawn by hand or laid by the magnetic lasso (Discussion #1778): the steps go, the corners stay. */
function area(points: Array<[number, number]>) {
  let sum = 0;
  points.forEach(([x1, y1], index) => {
    const [x2, y2] = points[(index + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  });
  return Math.abs(sum) / 2;
}

/** How long the line is round: a shaky one runs much longer than the circle it follows. */
function length(points: Array<[number, number]>) {
  return points.reduce((sum, [x, y], index) => {
    const [nx, ny] = points[(index + 1) % points.length];
    return sum + Math.hypot(nx - x, ny - y);
  }, 0);
}

describe("smoothing a drawn outline", () => {
  // A circle of radius 50 as a shaky hand or a pixel staircase gives it: off by up to 2 px either way.
  let seed = 3;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const shaky = Array.from({ length: 120 }, (_, index): [number, number] => {
    const angle = (index / 120) * Math.PI * 2;
    const radius = 50 + (random() - 0.5) * 4;
    return [100 + Math.cos(angle) * radius, 100 + Math.sin(angle) * radius];
  });

  it("evens out a shaky circle without shrinking it", () => {
    const smooth = smoothOutline(shaky, 60, true);
    const circle = Math.PI * 100;
    expect(length(shaky)).toBeGreaterThan(circle * 1.12);
    expect(length(smooth)).toBeLessThan(circle * 1.04);
    expect(length(smooth)).toBeGreaterThan(circle * 0.98);
    expect(smoothOutline(shaky, 100, true).length).toBeLessThan(shaky.length / 2);
    expect(area(smooth)).toBeGreaterThan(Math.PI * 2500 * 0.97);
    expect(area(smooth)).toBeLessThan(Math.PI * 2500 * 1.03);
  });

  it("leaves the line as it is at 0", () => {
    expect(smoothOutline(shaky, 0, true)).toEqual(shaky);
  });

  it("keeps the corners of a square", () => {
    const square: Array<[number, number]> = [[0, 0], [100, 0], [100, 100], [0, 100]];
    const smooth = smoothOutline(square, 100, true);
    for (const [x, y] of square) expect(smooth.some(([sx, sy]) => Math.hypot(sx - x, sy - y) < 0.5)).toBe(true);
    expect(area(smooth)).toBeGreaterThan(9900);
  });

  it("keeps the ends of an open line where they are", () => {
    const wave = Array.from({ length: 50 }, (_, index): [number, number] => [index * 3, index % 2 ? 1 : -1]);
    const smooth = smoothOutline(wave, 80, false);
    expect(smooth[0]).toEqual(wave[0]);
    expect(smooth[smooth.length - 1]).toEqual(wave[wave.length - 1]);
    expect(Math.max(...smooth.slice(1, -1).map(([, y]) => Math.abs(y)))).toBeLessThan(0.6);
  });
});
