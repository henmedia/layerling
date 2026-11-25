import { describe, expect, it } from "vitest";
import { boxSnapSpots, cleanReferencePosition, measurementMiddle, nearestReferenceOnScreen, newReferencePositions, pivotReference, referencePointsForBox, unionReferenceBoxes } from "@/lib/referencePoints";
import { normalizeNotes, notesSignature, referencePoints } from "@/lib/workplaneNotes";

const box = { minX: -20, maxX: 40, minY: 0, maxY: 8, minZ: 10, maxZ: 30 };

describe("reference points", () => {
  it("marks the centre, the corners and the edge middles on the top face", () => {
    expect(referencePointsForBox(box, "center")).toEqual([{ x: 10, y: 8, z: 20 }]);
    expect(referencePointsForBox(box, "corners")).toHaveLength(4);
    expect(referencePointsForBox(box, "corners")).toContainEqual({ x: -20, y: 8, z: 30 });
    expect(referencePointsForBox(box, "midpoints")).toEqual([
      { x: 10, y: 8, z: 10 },
      { x: 40, y: 8, z: 20 },
      { x: 10, y: 8, z: 30 },
      { x: -20, y: 8, z: 20 },
    ]);
  });

  it("joins several boxes into one", () => {
    expect(unionReferenceBoxes([])).toBeNull();
    expect(unionReferenceBoxes([box, { ...box, minX: -50, maxY: 12 }])).toEqual({ ...box, minX: -50, maxY: 12 });
  });

  it("cleans float noise and skips points that are already marked", () => {
    expect(cleanReferencePosition({ x: 0.1 + 0.2, y: -1e-9, z: 5 })).toEqual({ x: 0.3, y: 0, z: 5 });
    const existing = [{ x: 10, y: 8, z: 20, kind: "point" as const }, { x: 0, y: 0, z: 0 }];
    const fresh = newReferencePositions(existing, [{ x: 10, y: 8, z: 20 }, { x: 10.0004, y: 8, z: 20 }, { x: 0, y: 0, z: 0 }, { x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 3 }]);
    // a plain note at (0, 0, 0) is not a point; the duplicate of the new one counts once
    expect(fresh).toEqual([{ x: 0, y: 0, z: 0 }, { x: 1, y: 2, z: 3 }]);
  });

  it("keeps the kind of a point through normalizing and tells it apart in the signature", () => {
    const notes = normalizeNotes([
      { id: "a", text: "hello", x: 1, y: 2, z: 3 },
      { id: "b", text: "ignored", x: 4, y: 5, z: 6, kind: "point", anchor: { shapeId: "s", normalized: [0, 0, 0] }, collapsed: true },
    ]);
    expect(notes[1]).toEqual({ id: "b", text: "", x: 4, y: 5, z: 6, kind: "point", collapsed: true });
    expect(referencePoints(notes).map((note) => note.id)).toEqual(["b"]);
    const asNote = normalizeNotes([{ id: "b", text: "", x: 4, y: 5, z: 6, collapsed: true }]);
    expect(notesSignature(notes)).not.toBe(notesSignature([notes[0], asNote[0]]));
  });
});

describe("the middle of a measurement", () => {
  it("is halfway between the two points of a straight measurement", () => {
    expect(measurementMiddle([{ x: 0, y: 5, z: 0 }, { x: 6, y: 5, z: 2 }])).toEqual({ x: 3, y: 5, z: 1 });
  });

  it("is the centre of a closed edge, however the edge is cut into points", () => {
    const ring = (count: number, radius: number, centre: { x: number; y: number; z: number }) =>
      Array.from({ length: count + 1 }, (_, index) => {
        const angle = (index % count) / count * Math.PI * 2;
        return { x: centre.x + Math.cos(angle) * radius, y: centre.y, z: centre.z + Math.sin(angle) * radius };
      });
    for (const count of [8, 24, 64]) {
      const middle = cleanReferencePosition(measurementMiddle(ring(count, 3, { x: 12, y: 7, z: -4 }))!);
      expect(middle).toEqual({ x: 12, y: 7, z: -4 });
    }
    // Unevenly spaced points: the centre of the area, not the average of the points.
    const uneven = [0, 0.1, 0.2, 0.3, 1, 2, 3, 4, 5, 6.28318530718, 0].map((angle) => ({ x: 20 + Math.cos(angle) * 2.5, y: 1, z: 5 + Math.sin(angle) * 2.5 }));
    uneven[uneven.length - 1] = { ...uneven[0] };
    const middle = measurementMiddle(uneven)!;
    expect(middle.x).toBeCloseTo(20, 0);
    expect(middle.z).toBeCloseTo(5, 0);
  });

  it("is halfway along an open edge, and nothing for a single point", () => {
    expect(measurementMiddle([{ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, { x: 10, y: 0, z: 10 }])).toEqual({ x: 10, y: 0, z: 0 });
    expect(measurementMiddle([{ x: 1, y: 2, z: 3 }])).toBeNull();
  });
});

describe("the reference point under the tape measure's pointer (#334)", () => {
  const points = [{ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }];
  // The screen shows x as pixels, 5 to the unit.
  const project = (point: { x: number; z: number }) => ({ x: point.x * 5, y: point.z * 5 });

  it("takes the nearest point within reach", () => {
    expect(nearestReferenceOnScreen(points, project, { x: 48, y: 3 }, 14)).toBe(points[1]);
    expect(nearestReferenceOnScreen(points, project, { x: 4, y: 0 }, 14)).toBe(points[0]);
  });

  it("gives a pivot the point near the pointer, but not hidden notes' or with Shift", () => {
    expect(pivotReference(points, { visible: true, faceCentre: false }, project, { x: 48, y: 3 }, 10)).toBe(points[1]);
    expect(pivotReference(points, { visible: false, faceCentre: false }, project, { x: 48, y: 3 }, 10)).toBeNull();
    expect(pivotReference(points, { visible: true, faceCentre: true }, project, { x: 48, y: 3 }, 10)).toBeNull();
  });

  it("takes none when the pointer is too far away, and none for no points", () => {
    expect(nearestReferenceOnScreen(points, project, { x: 25, y: 40 }, 14)).toBeNull();
    expect(nearestReferenceOnScreen([], project, { x: 0, y: 0 }, 14)).toBeNull();
  });
});

describe("box snap spots (#799)", () => {
  // The corners in the order the editor gives them: x outermost, then y, then z.
  const corners = [0, 1].flatMap((x) => [0, 1].flatMap((y) => [0, 1].map((z) => ({ x: x * 20, y: y * 10, z: z * 40 }))));

  it("gives the corners, the middles of the 12 edges and the centres of the 6 faces", () => {
    const spots = boxSnapSpots(corners);

    expect(spots).toHaveLength(26);
    expect(spots).toContainEqual({ x: 20, y: 10, z: 40 });
    expect(spots).toContainEqual({ x: 10, y: 0, z: 0 });
    expect(spots).toContainEqual({ x: 20, y: 5, z: 40 });
    expect(spots).toContainEqual({ x: 10, y: 10, z: 20 });
    expect(spots).toContainEqual({ x: 10, y: 5, z: 0 });
    expect(spots).toContainEqual({ x: 0, y: 5, z: 20 });
  });

  it("gives nothing for anything but a box", () => {
    expect(boxSnapSpots(corners.slice(0, 4))).toEqual([]);
  });
});
