import { describe, expect, it } from "vitest";
import { addMagnetAnchor, closeMagnet, dropMagnetAnchor, magnetLine, type PaintMagnetDraft } from "@/components/workplane/paintMagnet";
import type { PreparedPicture } from "@/lib/pictureTrace";

/*
 * The paint tool's magnetic lasso (paintMagnet.ts, Discussion #1778): clicks near the edges of the body as the view
 * shows it are laid onto them, and the line between two clicks follows them. Here the view is a picture of a square
 * face, 100 pixels across, on an empty background, and the clicks land a few pixels inside its corners.
 */
function squarePicture(): PreparedPicture {
  const size = 200;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const inside = x >= 50 && x < 150 && y >= 50 && y < 150;
      const at = (y * size + x) * 4;
      data.set(inside ? [60, 160, 60, 255] : [0, 0, 0, 0], at);
    }
  }
  return { width: size, height: size, pixels: { width: size, height: size, data }, scaleX: 1, scaleY: 1, fields: {}, contours: new Map(), areas: new Map() };
}

function area(points: Array<[number, number]>) {
  let sum = 0;
  points.forEach(([x1, y1], index) => {
    const [x2, y2] = points[(index + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  });
  return Math.abs(sum) / 2;
}

describe("the paint tool's magnetic lasso", () => {
  it("lays clicks near the corners onto the face's outline and closes round the whole face", () => {
    let draft: PaintMagnetDraft = { picture: squarePicture(), anchors: [], segments: [] };
    for (const spot of [{ x: 53, y: 54 }, { x: 146, y: 53 }, { x: 147, y: 146 }, { x: 54, y: 147 }]) draft = addMagnetAnchor(draft, spot);
    // Each click moved onto the face's outline, near its corner.
    draft.anchors.forEach((anchor, index) => {
      const corner = [[50, 50], [150, 50], [150, 150], [50, 150]][index];
      expect(Math.min(Math.abs(anchor.x - corner[0]), Math.abs(anchor.y - corner[1]))).toBeLessThan(1.5);
      expect(Math.hypot(anchor.x - corner[0], anchor.y - corner[1])).toBeLessThan(6);
    });
    const outline = closeMagnet(draft)!;
    // The face is 100 x 100; a polygon through the clicks would hold about 93 x 93.
    expect(area(outline)).toBeGreaterThan(98 * 98);
    expect(area(outline)).toBeLessThan(102 * 102);
  });

  it("follows the edge round a corner between two clicks, not the straight line", () => {
    let draft: PaintMagnetDraft = { picture: squarePicture(), anchors: [], segments: [] };
    draft = addMagnetAnchor(draft, { x: 100, y: 52 });
    draft = addMagnetAnchor(draft, { x: 148, y: 100 });
    const { laid } = magnetLine(draft);
    // The way runs along the top to the corner at (150, 50) and down the side.
    expect(laid.some((point) => Math.hypot(point.x - 150, point.y - 50) < 3)).toBe(true);
    laid.forEach((point) => expect(Math.min(Math.abs(point.y - 50), Math.abs(point.x - 150))).toBeLessThan(2.5));
  });

  it("shows the way ahead to the pointer, takes a click back, and needs three clicks to close", () => {
    let draft: PaintMagnetDraft = { picture: squarePicture(), anchors: [], segments: [] };
    draft = addMagnetAnchor(draft, { x: 60, y: 51 });
    draft = addMagnetAnchor(draft, { x: 120, y: 51 });
    expect(closeMagnet(draft)).toBeNull();
    const ahead = magnetLine(draft, { x: 149, y: 120 }).ahead;
    expect(ahead[0]).toEqual(draft.anchors[1]);
    expect(ahead.length).toBeGreaterThan(1);
    const back = dropMagnetAnchor(draft);
    expect(back.anchors).toHaveLength(1);
    expect(back.segments).toHaveLength(1);
  });
});
