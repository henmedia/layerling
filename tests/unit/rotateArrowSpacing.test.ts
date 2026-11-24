import { describe, expect, it } from "vitest";
import { angleBadgePoint, ROTATE_ARROW_GAP, ROTATE_ARROW_REACH, spreadRotateArrows, withRotateArrowRooms } from "@/lib/rotateArrowSpacing";

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe("rotate arrows keep room (#2020)", () => {
  it("leaves arrows that stand apart where they are", () => {
    const arrows = [{ key: "x", x: 0, y: 0 }, { key: "y", x: 100, y: 0 }, { key: "z", x: 50, y: 80 }];
    expect(spreadRotateArrows(arrows)).toEqual(arrows);
  });

  it("moves two close ones apart round the middle between them", () => {
    const [a, b] = spreadRotateArrows([{ x: 100, y: 100 }, { x: 120, y: 110 }]);
    expect(distance(a, b)).toBeCloseTo(ROTATE_ARROW_GAP, 5);
    expect((a.x + b.x) / 2).toBeCloseTo(110, 5);
    expect((a.y + b.y) / 2).toBeCloseTo(105, 5);
  });

  it("parts arrows right on each other, and three in a heap", () => {
    const [a, b] = spreadRotateArrows([{ x: 5, y: 5 }, { x: 5, y: 5 }]);
    expect(distance(a, b)).toBeCloseTo(ROTATE_ARROW_GAP, 5);
    const heap = spreadRotateArrows([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 8 }]);
    for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) expect(distance(heap[i], heap[j])).toBeGreaterThan(ROTATE_ARROW_GAP - 3);
  });
});

describe("the grab area of a rotate arrow (#2020)", () => {
  it("has the distance to the nearest arrow as its room, and no more than it needs", () => {
    expect(withRotateArrowRooms([{ x: 0, y: 0 }, { x: 46, y: 0 }, { x: 400, y: 0 }]).map((arrow) => arrow.room)).toEqual([46, 46, 116]);
    expect(withRotateArrowRooms([{ x: 0, y: 0 }]).map((arrow) => arrow.room)).toEqual([116]);
  });
});

describe("the angle label keeps off the rotate arrows (#2020)", () => {
  const handles = [{ x: 90, y: 100 }, { x: 110, y: 120 }];

  it("stands under the lowest handle", () => {
    expect(angleBadgePoint(handles, [])).toEqual({ x: 100, y: 150 });
    // Beside it and well above it an arrow is in no way.
    expect(angleBadgePoint(handles, [{ x: 400, y: 150 }, { x: 100, y: 20 }])).toEqual({ x: 100, y: 150 });
  });

  it("goes below the arrows it would cover", () => {
    const arrows = [{ x: 95, y: 150 }, { x: 130, y: 190 }];
    const badge = angleBadgePoint(handles, arrows);
    for (const arrow of arrows) expect(badge.y).toBeGreaterThanOrEqual(arrow.y + ROTATE_ARROW_REACH);
  });
});
