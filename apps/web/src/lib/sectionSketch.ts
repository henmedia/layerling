import * as THREE from "three";
import { dxfEntityEnds, dxfLoopEntities, type DxfEntity, type DxfPoint } from "@/lib/dxfExport";
import { placementWorkplaneCoordinates, type PlacementWorkplane } from "@/lib/placementWorkplane";
import type { SectionLoop, SectionPoint } from "@/lib/sectionSvg";
import { sectionPointFromFrame, type SectionFrame, type SectionPlaneAxis } from "@/lib/sectionView";
import { ellipsePieces, MAX_SVG_SKETCH_SEGMENTS, sketchFromPieceRings, splitPiece, type SketchPiece } from "@/lib/svgSketch";
import type { SketchProfile } from "@/types/layerling";

/*
 * A sketch from the section view (#1022): the outlines a cut leaves become the lines of a new sketch,
 * drawn on the cut itself, so a part that has to fit another one starts from that part's own outline.
 * The cut's outlines are polygons of the meshes; the round parts are found again as the DXF export
 * finds them (a hole is a true circle, a fillet a true arc, a free curve arcs within 0.01 mm), and an
 * arc goes into the sketch as cubic curves of a quarter turn at most, as an imported SVG's arcs do.
 */

/** The most lines and curves a sketch from the cut may have, as for an SVG. */
export const MAX_SECTION_SKETCH_SEGMENTS = MAX_SVG_SKETCH_SEGMENTS;

/** A point of the cut in the frame's coordinates: projectSectionPoint undone. */
export function sectionPointInFrame(point: SectionPoint, axis: SectionPlaneAxis, offset: number): [number, number, number] {
  if (axis === "x") return [offset, -point.v, -point.u];
  if (axis === "y") return [point.u, offset, point.v];
  return [point.u, -point.v, offset];
}

type Point = { x: number; y: number };

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function arcPieces(center: DxfPoint, radius: number, from: number, to: number, clockwise: boolean) {
  return ellipsePieces(new THREE.EllipseCurve(center[0], center[1], radius, radius, from, to, clockwise, 0));
}

/**
 * One outline's lines, arcs and circles as pieces running round it. An arc has no direction of its own,
 * so the pieces start at a line, which runs the way the outline does, and each arc is taken from the
 * end the last piece stopped at.
 */
function outlinePieces(entities: readonly DxfEntity[]): SketchPiece[] {
  const firstLine = entities.findIndex((entity) => entity.type === "line");
  const ordered = firstLine > 0 ? [...entities.slice(firstLine), ...entities.slice(0, firstLine)] : entities;
  const pieces: SketchPiece[] = [];
  for (const entity of ordered) {
    if (entity.type === "circle") {
      pieces.push(...arcPieces(entity.center, entity.radius, 0, Math.PI * 2, false));
      continue;
    }
    const ends = dxfEntityEnds(entity);
    if (!ends) continue;
    const a = { x: ends[0][0], y: ends[0][1] };
    const b = { x: ends[1][0], y: ends[1][1] };
    const cursor = pieces[pieces.length - 1]?.end;
    const forward = !cursor || distance(cursor, a) <= distance(cursor, b);
    if (entity.type === "line") {
      pieces.push(forward ? { start: a, end: b } : { start: b, end: a });
      continue;
    }
    const start = (entity.startAngle * Math.PI) / 180;
    const end = (entity.endAngle * Math.PI) / 180;
    pieces.push(...(forward ? arcPieces(entity.center, entity.radius, start, end, false) : arcPieces(entity.center, entity.radius, end, start, true)));
  }
  // A sketch outline needs three steps to count as closed (a D: one arc and one line).
  while (pieces.length > 0 && pieces.length < 3) {
    let longest = 0;
    pieces.forEach((piece, index) => {
      if (distance(piece.start, piece.end) > distance(pieces[longest].start, pieces[longest].end)) longest = index;
    });
    pieces.splice(longest, 1, ...splitPiece(pieces[longest]));
  }
  return pieces;
}

export type SectionSketch = {
  /** The sketch, in the coordinates of the workplane it is drawn on; null when the cut gave no closed outline or too many pieces. */
  profile: SketchProfile | null;
  /** Closed outlines in the sketch. */
  outlines: number;
  /** Outlines that did not close (a mesh with a gap), left out. */
  openLeftOut: number;
  /** More lines and curves than a sketch takes: nothing was made. */
  tooMany: boolean;
};

/**
 * The cut's outlines as a sketch on `workplane`, the workplane on the cut (sectionPlacementWorkplane), so the
 * sketch's lines lie exactly where the cut is. `loops` are the outlines as sliceMeshContours gives them for
 * that axis and offset, in the frame of a turned section view when there is one.
 */
export function sectionSketchProfile(
  loops: readonly SectionLoop[],
  axis: SectionPlaneAxis,
  offset: number,
  frame: SectionFrame | null,
  workplane: PlacementWorkplane,
): SectionSketch {
  const rings: SketchPiece[][] = [];
  let openLeftOut = 0;
  let total = 0;
  for (const loop of loops) {
    if (!loop.closed) {
      openLeftOut += 1;
      continue;
    }
    const flat = loop.points.map((point): DxfPoint => {
      const [x, y, z] = sectionPointFromFrame(sectionPointInFrame(point, axis, offset), frame);
      const local = placementWorkplaneCoordinates(workplane, { x, y, z });
      return [local.x, local.z];
    });
    const ring = outlinePieces(dxfLoopEntities(flat));
    if (ring.length < 3) continue;
    total += ring.length;
    if (total > MAX_SECTION_SKETCH_SEGMENTS) return { profile: null, outlines: 0, openLeftOut, tooMany: true };
    rings.push(ring);
  }
  if (!rings.length) return { profile: null, outlines: 0, openLeftOut, tooMany: false };
  return {
    profile: sketchFromPieceRings(rings, ({ x, y }) => ({ x, z: y }), "cut"),
    outlines: rings.length,
    openLeftOut,
    tooMany: false,
  };
}
