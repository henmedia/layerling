import type { ShellEdges, ShellOpenings } from "@/types/layerling";

export type CadModifierKind = "chamfer" | "fillet" | "shell";

export type CadModifierEdge = {
  id: number;
  owner?: number;
  points: number[];
  display: boolean;
  selectable: boolean;
  angle: number;
  boundary: boolean;
  manifold: boolean;
};

export type CadModifierQuality = "draft" | "standard" | "fine";

export type CadModifierDisplayEdge = {
  points: number[];
};

export type CadModifierPrimitivePart =
  | {
      kind: "box";
      width: number;
      depth: number;
      height: number;
      transform?: number[];
    }
  | {
      kind: "cylinder";
      radius: number;
      width: number;
      depth: number;
      height: number;
      transform?: number[];
    }
  | {
      kind: "cone";
      baseRadius: number;
      topRadius: number;
      width: number;
      depth: number;
      height: number;
      transform?: number[];
    }
  | {
      kind: "sphere";
      radius: number;
      width: number;
      depth: number;
      height: number;
      transform?: number[];
    }
  | {
      kind: "torus";
      majorRadius: number;
      minorRadius: number;
      width: number;
      depth: number;
      height: number;
      transform?: number[];
    };

/**
 * One piece of a flat outline in the shape's local X/Z plane, running from the
 * end of the previous piece (or the loop's start point) to (x, z). An arc is a
 * piece of the ellipse (cx + rx cos t, cz + rz sin t) from t = start to
 * t = end; with rx === rz it is a circular arc.
 */
export type CadModifierProfileSegment =
  | { kind: "line"; x: number; z: number }
  | { kind: "arc"; x: number; z: number; cx: number; cz: number; rx: number; rz: number; start: number; end: number };

export type CadModifierProfileLoop = {
  x: number;
  z: number;
  segments: CadModifierProfileSegment[];
};

/**
 * A catalog shape whose body is its outline pushed straight up: the CAD worker
 * builds it as an exact solid (lines, arcs, flat caps) from the shape's own
 * parameters instead of sewing the display mesh back together.
 */
export type CadModifierProfilePart = {
  kind: "extrusion";
  /** The first loop is the outer boundary, any further loops are holes. */
  loops: CadModifierProfileLoop[];
  height: number;
  transform?: number[];
  /**
   * World bounds [minX, minY, minZ, maxX, maxY, maxZ] and volume of the
   * display mesh - the exact body has to agree with them, or the worker falls
   * back to the mesh.
   */
  expected?: { bounds: number[]; volume: number };
};

export type CadModifierMeshPart = {
  positions?: Float32Array;
  indices?: Uint32Array;
  brep?: string;
  brepTransform?: number[];
  primitive?: CadModifierPrimitivePart;
  /** When set, positions/indices (if any) are only the fallback if the exact body fails. */
  profile?: CadModifierProfilePart;
  hole: boolean;
};

export type CadModifierComponentMesh = {
  owner: number;
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  triangleCount: number;
  brep: string;
  displayEdges: CadModifierDisplayEdge[];
};

export type CadModifierDeflection = { linear: number; angular: number };

export type CadModifierWorkerRequest =
  | { type: "prepare"; requestId: number; parts: CadModifierMeshPart[]; sharpAngle: number; suppressTreatmentDetailEdges?: boolean }
  | {
      type: "preview";
      requestId: number;
      kind: CadModifierKind;
      edgeIds: number[];
      amount: number;
      quality: CadModifierQuality;
      chamferAngle: number;
      // Only for "shell": which faces stay open; `amount` is the wall thickness.
      shellOpenings?: ShellOpenings;
      shellEdges?: ShellEdges;
      // The finest deflection the shape's edge-treatment history has needed
      // so far, if any - a floor beneath this operation's own deflection.
      minDeflection?: CadModifierDeflection;
    }
  | { type: "dispose"; requestId: number };

export type CadModifierWorkerResponse =
  | { type: "ready"; requestId: number; edges: CadModifierEdge[]; selectableEdgeIds: number[]; sourceType: string }
  | {
      type: "preview";
      requestId: number;
      positions: Float32Array;
      normals: Float32Array;
      indices: Uint32Array;
      triangleCount: number;
      brep: string;
      displayEdges: CadModifierDisplayEdge[];
      components?: CadModifierComponentMesh[];
      // The deflection actually used for this operation - request.minDeflection
      // folded in, so the caller can carry it forward as the new floor.
      deflection: CadModifierDeflection;
    }
  | { type: "disposed"; requestId: number }
  | { type: "error"; requestId: number; message: string; resetSession?: boolean };
