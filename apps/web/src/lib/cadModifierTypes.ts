import type { GridfinityCompartmentLabel, GridfinityLabelCorner, GridfinityOpening, GridfinityType, ShellEdges, ShellOpenings } from "@/types/layerling";

export type CadModifierKind = "chamfer" | "chamfillet" | "fillet" | "shell" | "deleteFace" | "offset";

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
 * t = end; with rx === rz it is a circular arc. A bezier is the Bezier curve
 * through its start, the control points and (x, z) - quadratic with one
 * control point, cubic with two, as a font's glyph outlines use them.
 */
export type CadModifierProfileSegment =
  | { kind: "line"; x: number; z: number }
  | { kind: "arc"; x: number; z: number; cx: number; cz: number; rx: number; rz: number; start: number; end: number }
  | { kind: "bezier"; x: number; z: number; controls: Array<{ x: number; z: number }> };

export type CadModifierProfileLoop = {
  x: number;
  z: number;
  segments: CadModifierProfileSegment[];
};

/**
 * One piece of a sweep's centre line (the bent tube). `frame` is a 3x4 matrix,
 * row by row, that places the section - drawn in the X/Z plane - at the start
 * of the piece, with local +Y the running direction; it keeps handedness. A
 * straight piece pushes the placed section `length` along that direction, a
 * bend turns it `angle` radians about `axis` through `center` (right-handed).
 * All in the frame the part's `transform` then places.
 */
export type CadModifierSweepPiece =
  | { kind: "straight"; frame: number[]; length: number }
  | { kind: "bend"; frame: number[]; center: [number, number, number]; axis: [number, number, number]; angle: number };

/**
 * A catalog shape whose body is its outline pushed straight up (or a section turned around an axis): the CAD worker
 * builds it as an exact solid (lines, arcs, flat caps) from the shape's own
 * parameters instead of sewing the display mesh back together.
 */
export type CadModifierProfilePart = {
  /**
   * "extrusion": the outline in the local X/Z plane pushed up by `height`.
   * "revolution": the loop is a half-section (x = distance from the axis,
   * z = position along it, x >= 0) turned once around the Z axis, `height`
   * long; the transform stands the axis up.
   * "sweep": the loops are a cross-section, pushed along the straight pieces
   * of `path` and turned through its bends, the pieces fused into one body;
   * `height` is the length of the centre line.
   * "loft": the loops are the section at the bottom (y = 0) and `topLoops`
   * the same section at the top (y = `height`), scaled and shifted - a
   * tapered or leaning extrusion. Each loop is joined to its partner by
   * straight lines (a ruled loft), which is exactly what the display's taper
   * and lean do between the two ends.
   * Either way `transform` places the result on the shape (for the teardrop it
   * also lays the extrusion on its side).
   */
  kind: "extrusion" | "revolution" | "sweep" | "loft";
  /** Sweep only: the centre line, piece by piece. */
  path?: CadModifierSweepPiece[];
  /** Loft only: the section at the top, loop for loop and piece for piece the partner of `loops`. */
  topLoops?: CadModifierProfileLoop[];
  /**
   * Loft only: the section turns this many degrees from bottom to top, evenly, around
   * `twistCenter` (which moves with the lean). The sides are then no longer ruled: the body is a
   * smooth loft through sections a few degrees apart (#184).
   */
  twist?: number;
  twistCenter?: { x: number; z: number };
  /** Degrees between two sections of a twisted loft, where the standard step is too coarse for an outline with fine teeth (a knurl). */
  twistStep?: number;
  /** Loft only: 0 to 1, how much of an S-curve the sides take between the ends instead of a straight line (#271); built like a turned loft, through sections. */
  smooth?: number;
  /** Loft only, with a twist: how far the lean moves the top; the turning centre moves along with it. */
  twistLean?: { x: number; z: number };
  /**
   * Loft only: degrees the sections tilt on the way up, evenly to the top - about the x axis
   * (the front rising) and about the z axis (the right side rising), around each section's
   * turning centre, after its twist (a transition's tilted top, #205).
   */
  tilt?: { x: number; z: number };
  /** Extrusion only: round every edge of the two flat ends by this radius (a rounded box). */
  capFillet?: number;
  /**
   * Extrusion only: chamfer a round body at both ends at 45 degrees - keep
   * what lies within `radius` less `size` plus the distance from the nearer
   * end, measured from the axis through the outline's origin (knurling).
   * On a loft (a tapered or leaning knurl, #630) the bound narrows with the
   * body: `bottomScale` and `topScale` are the factors of the two ends and
   * `lean` is how far the top has moved sideways.
   */
  capChamfer?: { radius: number; size: number; bottomScale?: number; topScale?: number; lean?: { x: number; z: number } };
  /** The first loop is the outer boundary, any further loops are holes. */
  loops: CadModifierProfileLoop[];
  /**
   * Extrusion only: a text widened all round (#215) - its letters' own outlines, with the font's
   * curves, which the kernel moves out by `width` itself, so the walls stay planes and single
   * curves instead of the hundreds of short straight pieces `loops` (the outline the display's
   * polygon offset made, the fallback) is made of. Each region is a letter's outline with its
   * counters (none for a silhouette); the regions' wider bodies are fused. `area` is what `loops`
   * enclose, which the exact body has to agree with, or `loops` is used.
   */
  grow?: {
    width: number;
    regions: Array<{ outer: CadModifierProfileLoop; holes: CadModifierProfileLoop[] }>;
    silhouette: boolean;
    area: number;
  };
  height: number;
  transform?: number[];
  /**
   * World bounds [minX, minY, minZ, maxX, maxY, maxZ] and volume of the
   * display mesh - the exact body has to agree with them, or the worker falls
   * back to the mesh.
   */
  expected?: { bounds: number[]; volume: number };
};

/**
 * A thread, rod, screw, nut or tapped hole, as the exact body its display
 * mesh draws: the profile swept along a helix, cut to length and chamfered
 * at its ends, with its head or nut body around it. Built in the shape's own
 * frame (y up, the axis on y, the bottom at y = 0); `transform` places it.
 */
export type CadModifierThreadPart = {
  role: "rod" | "screw" | "nut" | "bore";
  /** One pitch of the profile from the crest: u in [0, 1), level 1 = major radius, 0 = minor; straight between points, as drawn, unless `curve` says otherwise. */
  profile: Array<{ u: number; level: number }>;
  /**
   * The true curve the profile points sample, where there is one: "round", the
   * cosine level = (1 + cos 2 pi u) / 2; "whitworth", arcs of `radius` (in
   * pitches) at crest and root, tangent to flanks at `halfAngle` (radians).
   * Absent: the points themselves are the profile.
   */
  curve?: { kind: "round" } | { kind: "whitworth"; radius: number; halfAngle: number };
  major: number;
  minor: number;
  pitch: number;
  /** 1: the thread climbs as the angle from +x towards +z grows, a left-hand thread about +y; -1 the other way, a right-hand one. */
  hand: 1 | -1;
  height: number;
  /** Where the thread starts: 0, or the top of a screw head. */
  shaftBottom: number;
  /** The 45 degree chamfer at the thread ends; 0 for none. */
  chamfer: number;
  /** The chamfer at the bottom end, when the part has one (`chamferBottom`). */
  chamferLow: number;
  chamferBottom: boolean;
  /** Screw only. */
  head?: {
    kind: "cylinder" | "hex" | "countersunk";
    height: number;
    /** Cylinder head radius, or the countersunk head's crown radius at y = 0. */
    radius: number;
    /** Hex head across flats. */
    acrossFlats: number;
    /** The countersunk cone's radius where it meets the shaft. */
    neckRadius: number;
    /** Radius of the flat faces when both head edges are chamfered, or 0. */
    chamferFaceRadius: number;
    /** Hex socket across flats and depth, or 0 depth for none. */
    socketAcrossFlats: number;
    socketDepth: number;
  };
  /** Nut only: its hex across flats, and the face radius of its chamfered rims (0 for sharp). */
  nut?: { acrossFlats: number; chamferFaceRadius: number };
  transform?: number[];
  expected?: { bounds: number[]; volume: number };
};

/**
 * A spring, as the exact body its display mesh draws: a round wire swept
 * along a helix about y, cut square to the wire at both ends. The centre line
 * starts on +x at y = `bottom` and climbs `span` in `turns` whole turns as the
 * angle from +x towards +z grows. Built in the shape's own frame (y up, the
 * bottom at y = 0); `transform` places it, footprint stretch included.
 */
export type CadModifierSpringPart = {
  coilRadius: number;
  wireRadius: number;
  turns: number;
  bottom: number;
  span: number;
  /** Right-hand: the wire climbs right-handed about the shape's up axis, like a usual compression spring. */
  hand: "right" | "left";
  /** The display mesh's polygon wire section as a share of the round one, which the mesh's volume is short by. */
  meshSectionShare: number;
  transform?: number[];
  expected?: { bounds: number[]; volume: number };
};

/**
 * A helical gear, as the exact body its display mesh draws: the tooth ring's
 * corners (radius and angle from +x towards +z, at the foot) turned evenly
 * by `twist` radians about y from the foot to the top, every side the ruled
 * face between the helices of its two corners; the result stretched by
 * `stretch` (x and z) as the mesh is, then the straight round bore cut
 * through it. Built in the shape's own frame (y up, the foot at y = 0);
 * `transform` places it.
 */
export type CadModifierHelicalGearPart = {
  corners: Array<{ angle: number; radius: number }>;
  /** Radians; the corners turn from +x towards +z as they rise when positive. */
  twist: number;
  height: number;
  stretch: { x: number; z: number };
  /** 0 for none. */
  boreRadius: number;
  transform?: number[];
  expected?: { bounds: number[]; volume: number };
};

/**
 * A Hirth joint (#1016), as the exact body its display mesh draws: the rim's
 * half width and half depth, the height, the teeth and their height at the
 * rim, and the round bore (0 for none), in the shape's own frame (y up, the
 * bottom at y = 0, centred on x and z); `transform` places it.
 */
export type CadModifierHirthPart = {
  rx: number;
  rz: number;
  height: number;
  teeth: number;
  toothHeight: number;
  boreRadius: number;
  transform?: number[];
  expected?: { bounds: number[]; volume: number };
};

/**
 * A Gridfinity bin or baseplate, as the exact body its display mesh draws:
 * the size and settings it is built from (`gridfinityPlan`), in the shape's
 * own frame (y up, the bottom at y = 0, centred on x and z); `transform`
 * places it.
 */
export type CadModifierGridfinityPart = {
  width: number;
  depth: number;
  height: number;
  gridfinityType: GridfinityType;
  gridfinityLip: boolean;
  gridfinityMagnets: boolean;
  gridfinityHalfGrid?: boolean;
  gridfinityLabelBack?: boolean;
  gridfinityLabelFront?: boolean;
  gridfinityLabelLeft?: boolean;
  gridfinityLabelRight?: boolean;
  gridfinityLabelBackWidth?: number;
  gridfinityLabelBackLength?: number;
  gridfinityLabelBackOffset?: number;
  gridfinityLabelFrontWidth?: number;
  gridfinityLabelFrontLength?: number;
  gridfinityLabelFrontOffset?: number;
  gridfinityLabelLeftWidth?: number;
  gridfinityLabelLeftLength?: number;
  gridfinityLabelLeftOffset?: number;
  gridfinityLabelRightWidth?: number;
  gridfinityLabelRightLength?: number;
  gridfinityLabelRightOffset?: number;
  gridfinityLabelCorner?: GridfinityLabelCorner;
  gridfinityLabelCornerSize?: number;
  gridfinityScoopBack?: boolean;
  gridfinityScoopFront?: boolean;
  gridfinityScoopLeft?: boolean;
  gridfinityScoopRight?: boolean;
  gridfinityScoopRadius?: number;
  gridfinityFloorHeight?: number;
  gridfinityOpenBack?: boolean;
  gridfinityOpenFront?: boolean;
  gridfinityOpenLeft?: boolean;
  gridfinityOpenRight?: boolean;
  gridfinityLipChamfer?: number;
  gridfinityWallThickness?: number;
  gridfinityPaddingBack?: number;
  gridfinityPaddingFront?: number;
  gridfinityPaddingLeft?: number;
  gridfinityPaddingRight?: number;
  gridfinityCornerRadius?: number;
  gridfinityBinCornerRadius?: number;
  gridfinityCompartmentsX?: number;
  gridfinityCompartmentsZ?: number;
  gridfinityDividerThickness?: number;
  gridfinityDividerPositionsX?: number[];
  gridfinityDividerPositionsZ?: number[];
  gridfinityCompartmentLabels?: GridfinityCompartmentLabel[];
  gridfinityOpenings?: GridfinityOpening[];
  gridfinityOpeningCorner?: GridfinityLabelCorner;
  gridfinityOpeningCornerSize?: number;
  transform?: number[];
  expected?: { bounds: number[]; volume: number };
};

export type CadModifierMeshPart = {
  positions?: Float32Array;
  indices?: Uint32Array;
  brep?: string;
  /**
   * A body imported from STEP: the file's exact solid in the shape's own
   * frame, placed by `brepTransform`. positions/indices (if any) are only the
   * fallback if it cannot be restored.
   */
  step?: string;
  brepTransform?: number[];
  /** With `step`: world bounds and volume of the display mesh, which the placed body has to match. */
  expected?: { bounds: number[]; volume: number };
  /** A thread's exact body; positions/indices (if any) are only the fallback if it cannot be built. */
  thread?: CadModifierThreadPart;
  /** A spring's exact body; positions/indices (if any) are only the fallback if it cannot be built. */
  spring?: CadModifierSpringPart;
  /** A helical gear's exact body; positions/indices (if any) are only the fallback if it cannot be built. */
  helicalGear?: CadModifierHelicalGearPart;
  /** A Gridfinity bin or baseplate's exact body; positions/indices (if any) are only the fallback if it cannot be built. */
  gridfinity?: CadModifierGridfinityPart;
  /** A Hirth joint's exact body; positions/indices (if any) are only the fallback if it cannot be built. */
  hirth?: CadModifierHirthPart;
  primitive?: CadModifierPrimitivePart;
  /** When set, positions/indices (if any) are only the fallback if the exact body fails. */
  profile?: CadModifierProfilePart;
  hole: boolean;
  /**
   * The groups inside the treated group that this part sits in, where such a group mixes solids and holes: its
   * holes cut only the solids with the same scope (#996). Missing or empty for the treated group's own level.
   */
  scope?: number[];
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

/** One face of a prepared body, for Delete face (#451) and the MCP's face list. */
export type CadFaceInfo = {
  /** The face's place in the body's face list (getSubShapes order). */
  id: number;
  /** OCCT's surface kind: plane, cylinder, cone, sphere, torus, bspline, ... */
  kind: string;
  area: number;
  center: { x: number; y: number; z: number };
  /** Out of the body, for flat faces only. */
  normal?: { x: number; y: number; z: number };
};

/** The prepared body's faces: each face's description and, for picking, the tessellation with the face of every triangle. */
export type CadModifierFaces = {
  list: Array<CadFaceInfo & { owner: number }>;
  mesh?: { positions: Float32Array; indices: Uint32Array; triangleFaces: Int32Array };
};

export type CadModifierWorkerRequest =
  // faces: also send the body's faces (Delete face); faceMesh: with their tessellation, for picking.
  | { type: "prepare"; requestId: number; parts: CadModifierMeshPart[]; sharpAngle: number; suppressTreatmentDetailEdges?: boolean; faces?: boolean; faceMesh?: boolean }
  | {
      type: "preview";
      requestId: number;
      kind: CadModifierKind;
      edgeIds: number[];
      amount: number;
      quality: CadModifierQuality;
      chamferAngle: number;
      // Only for "fillet" of one edge (#687): the radius at the edge's end, `amount` the one at its start.
      endAmount?: number;
      // Only for "shell": which faces stay open; `amount` is the wall thickness.
      shellOpenings?: ShellOpenings;
      shellEdges?: ShellEdges;
      // Only for "offset" (#919): `amount` is the distance, moved inward when this is set.
      offsetShrink?: boolean;
      // Only for "deleteFace": the faces to delete, as the prepare numbered them.
      faceIds?: number[];
      // The finest deflection the shape's edge-treatment history has needed
      // so far, if any - a floor beneath this operation's own deflection.
      minDeflection?: CadModifierDeflection;
      // The edges picked since the last preview that worked. When there are
      // any, the editor already knows which edge to blame on a refusal, and
      // the worker does not search for one.
      addedEdgeIds?: number[];
    }
  | { type: "dispose"; requestId: number };

export type CadModifierWorkerResponse =
  | { type: "ready"; requestId: number; edges: CadModifierEdge[]; selectableEdgeIds: number[]; sourceType: string; faces?: CadModifierFaces }
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
  // failedEdgeIds: the selected edges the kernel could not treat together.
  | { type: "error"; requestId: number; message: string; resetSession?: boolean; failedEdgeIds?: number[] };
