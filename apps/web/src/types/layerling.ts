export type ShapeKind =
  | "box"
  | "roundedBox"
  | "cylinder"
  | "slot"
  | "ellipse"
  | "sphere"
  | "sketch"
  | "scribble"
  | "cone"
  | "pyramid"
  | "roof"
  | "text"
  | "roundRoof"
  | "halfSphere"
  | "torus"
  | "tube"
  | "bentTube"
  | "star"
  | "heart"
  | "crescent"
  | "gear"
  | "honeycomb"
  | "hinge"
  | "knurl"
  | "dovetail"
  | "counterbore"
  | "countersink"
  | "doubleCountersink"
  | "teardrop"
  | "loft"
  | "thread"
  | "spring"
  | "gridfinity"
  | "ring"
  | "wedge"
  | "polygon"
  | "icosahedron"
  | "ruler"
  | "mesh";

/** Cross-section of a bent tube; the inner one may also be "none" for a solid tube. */
export type BentTubeProfile = "round" | "square" | "hexagon" | "octagon";
export type BentTubeInnerProfile = BentTubeProfile | "none";

/**
 * One link of a bent tube: a straight run of `length`, then a circular bend of
 * `bendAngle` degrees around a centre line radius of `bendRadius`. `roll`
 * turns the plane of this bend about the running direction, in degrees,
 * relative to the previous bend.
 */
export type BentTubeSegment = {
  length: number;
  bendAngle: number;
  bendRadius: number;
  roll: number;
};

export type ShapeAsset = {
  id: string;
  name: string;
  src: string;
  kind: ShapeKind;
  color: string;
  hole?: boolean;
};

export type ProjectAssetSourceFormat = "stl" | "obj" | "svg" | "step" | "3mf";

export type ProjectAsset = {
  id: string;
  name: string;
  mediaType: string;
  sourceFormat: ProjectAssetSourceFormat;
  bytes: Uint8Array;
  byteLength: number;
  sha256: string;
};

/**
 * A snap step of the user's own: a measure with a name, such as the 19.05 mm
 * one key takes up on a keyboard. The snap menu offers it whole, halved and
 * quartered.
 */
/** `wholeOnly` offers just the measure itself in the snap menu, not its half and quarter as well. */
export type CustomSnapGrid = { name: string; size: number; wholeOnly?: boolean };
/** "custom:<size in mm>:<divisor>" - the step is the size divided by the divisor, so it needs no lookup. */
export type CustomSnapGridSize = `custom:${number}:${number}`;
export type GridSize = "Off" | "0.1 mm" | "0.25 mm" | "0.5 mm" | "1.0 mm" | "2.0 mm" | "5.0 mm" | "1/64 in" | "1/32 in" | "1/16 in" | "1/8 in" | "1/4 in" | "1/2 in" | "1 in" | "Brick" | CustomSnapGridSize;
export type MeasurementAccuracy = 1 | 2 | 3;
export type HistoryRetentionLimit = "unlimited" | number;

export type ShapeCustomization = {
  /** The colour a new shape of this kind starts with ("#rrggbb"); the app's own colour of the kind when absent. */
  color?: string;
  width?: number;
  depth?: number;
  height?: number;
  maxDimension?: number;
  cornerFillet?: number;
  topBottomFillet?: number;
  roundedBoxQuality?: number;
  steps?: number;
  sides?: number;
  bevel?: number;
  segments?: number;
  topRadius?: number;
  baseRadius?: number;
  topWidth?: number;
  topDepth?: number;
  teeth?: number;
  toothSize?: number;
  toothWidth?: number;
  centerHoleSize?: number;
  gearType?: GearType;
  helixAngle?: number;
  helixQuality?: number;
  /** Involute teeth (#201) or the straight ones every gear had before; missing means straight. */
  gearProfile?: GearProfile;
  /** Involute teeth: pressure angle in degrees (20 by default). */
  gearPressureAngle?: number;
  /** Involute teeth: play of a meshing pair in mm, half taken off each gear. */
  gearBacklash?: number;
  /** Ring gear (#201): the rim outside its teeth, in mm (3 by default). */
  gearRim?: number;
  threadRole?: ThreadRole;
  threadHead?: ThreadHead;
  threadHand?: ThreadHand;
  threadProfile?: ThreadProfile;
  threadDiameter?: number;
  threadPitch?: number;
  threadClearance?: number;
  /** Rod and screw: how much thinner (in diameter) the bolt comes out, for a metal nut. */
  threadBoltClearance?: number;
  threadAxialClearance?: number;
  /** Own profile: the thread depth in mm (outer minus core radius) and the included flank angle in degrees. */
  threadDepth?: number;
  threadFlankAngle?: number;
  threadQuality?: number;
  threadHeadHeight?: number;
  threadChamfer?: number;
  /** The chamfer at the bottom end; without it the bottom end has the same chamfer as the top. */
  threadChamferBottom?: number;
  threadHeadChamfer?: number;
  springTurns?: number;
  springWire?: number;
  springHand?: ThreadHand;
  springQuality?: number;
  starPoints?: number;
  starInnerSize?: number;
  starOuterFillet?: number;
  starInnerFillet?: number;
  starQuality?: number;
  heartTipFillet?: number;
  heartQuality?: number;
  crescentThickness?: number;
  crescentTipFillet?: number;
  crescentQuality?: number;
  honeycombCellSize?: number;
  honeycombWallThickness?: number;
  honeycombFrameWidth?: number;
  /** Hinge: how many knuckles share the axis, odd so the pin's part holds both ends. */
  hingeKnuckles?: number;
  /** Hinge: diameter of the pin in mm; the other part's bore is wider by the clearance. */
  hingePinDiameter?: number;
  /** Hinge: thickness of the two leaves in mm. */
  hingeLeafThickness?: number;
  /** Hinge: gap in mm between the moving parts - around the pin, between knuckles and before the leaves. */
  hingeClearance?: number;
  /** Hinge: no printed pin; the bore runs through every knuckle for a pin of one's own (filament, wire). */
  hingePinless?: boolean;
  /** Gridfinity: a bin or the baseplate it stands in; the size counts grid units of 42 mm (height units of 7 mm). */
  gridfinityType?: GridfinityType;
  /** Gridfinity bin: the stacking lip on top of the wall; missing means on. */
  gridfinityLip?: boolean;
  /** Gridfinity bin: holes for 6 x 2 mm magnets under each foot. */
  gridfinityMagnets?: boolean;
  /** Gridfinity bin: a label shelf along the back wall. */
  gridfinityLabelBack?: boolean;
  /** Gridfinity bin: a label shelf along the front wall. */
  gridfinityLabelFront?: boolean;
  /** Gridfinity bin: a label shelf along the left wall. */
  gridfinityLabelLeft?: boolean;
  /** Gridfinity bin: a label shelf along the right wall. */
  gridfinityLabelRight?: boolean;
  /** Gridfinity bin: how far the back wall's label shelf reaches out from it, in mm. */
  gridfinityLabelBackWidth?: number;
  /** Gridfinity bin: the back wall's label shelf length in mm; missing or 0 runs it from wall to wall. */
  gridfinityLabelBackLength?: number;
  /** Gridfinity bin: the back wall's label shelf of a set length moved along the wall from the middle, in mm, towards +x. */
  gridfinityLabelBackOffset?: number;
  /** Gridfinity bin: how far the front wall's label shelf reaches out from it, in mm. */
  gridfinityLabelFrontWidth?: number;
  /** Gridfinity bin: the front wall's label shelf length in mm; missing or 0 runs it from wall to wall. */
  gridfinityLabelFrontLength?: number;
  /** Gridfinity bin: the front wall's label shelf of a set length moved along the wall from the middle, in mm, towards +x. */
  gridfinityLabelFrontOffset?: number;
  /** Gridfinity bin: how far the left wall's label shelf reaches out from it, in mm. */
  gridfinityLabelLeftWidth?: number;
  /** Gridfinity bin: the left wall's label shelf length in mm; missing or 0 runs it from wall to wall. */
  gridfinityLabelLeftLength?: number;
  /** Gridfinity bin: the left wall's label shelf of a set length moved along the wall from the middle, in mm, towards +z (the front). */
  gridfinityLabelLeftOffset?: number;
  /** Gridfinity bin: how far the right wall's label shelf reaches out from it, in mm. */
  gridfinityLabelRightWidth?: number;
  /** Gridfinity bin: the right wall's label shelf length in mm; missing or 0 runs it from wall to wall. */
  gridfinityLabelRightLength?: number;
  /** Gridfinity bin: the right wall's label shelf of a set length moved along the wall from the middle, in mm, towards +z (the front). */
  gridfinityLabelRightOffset?: number;
  /** Gridfinity bin: where a label shelf meets a wall or another shelf, the corner rounded or chamfered. */
  gridfinityLabelCorner?: GridfinityLabelCorner;
  /** Gridfinity bin: the size of that rounding or chamfer in mm; 0 leaves the corner sharp. */
  gridfinityLabelCornerSize?: number;
  /** Knurling: grooves straight along the axis, or crossed into diamonds. */
  knurlPattern?: "straight" | "diamond" | "round";
  /** Knurling: number of grooves around the grip. */
  knurlCount?: number;
  /** Knurling: how deep a groove goes, in mm. */
  knurlDepth?: number;
  /** Crossed knurling: angle of the grooves to the axis, in degrees. */
  knurlAngle?: number;
  /** Knurling: 45-degree chamfer on both ends, in mm; 0 for none. */
  knurlChamfer?: number;
  /** Dovetail: width of the narrow neck in mm (the wide end is the shape's width). */
  dovetailNeckWidth?: number;
  /** Dovetail: gap in mm added on every side when the dovetail is a cut-out (its socket). */
  dovetailClearance?: number;
  /** Transition (loft, #188): the outline at the bottom and at the top. */
  loftBottomOutline?: "round" | "rectangle" | "polygon";
  loftTopOutline?: "round" | "rectangle" | "polygon";
  /** Transition: the size of each end in mm, as set; the frame stretches them when it is dragged. */
  loftBottomWidth?: number;
  loftBottomDepth?: number;
  loftTopWidth?: number;
  loftTopDepth?: number;
  /** Transition: corner rounding of a rectangular end, in mm. */
  loftBottomCorner?: number;
  loftTopCorner?: number;
  /** Transition: number of sides of a polygonal end. */
  loftBottomSides?: number;
  loftTopSides?: number;
  /** Transition: how far the top's middle sits from the bottom's, in mm. */
  loftOffsetX?: number;
  loftOffsetZ?: number;
  /** Transition: wall thickness in mm; 0 is a solid body, more a tube open at both ends. */
  loftWall?: number;
  /** Transition: degrees the section turns from bottom to top (#205). */
  loftTwist?: number;
  /** Transition: 0 to 1, how much of an S-curve the sides take between the ends (#271). */
  loftSmooth?: number;
  /** Capsule: the small end's diameter as a share of the large one, 1 or missing for equal ends (#206). */
  slotEndRatio?: number;
  /** Transition: degrees the top end tilts about the x axis and about the z axis (#205). */
  loftTiltX?: number;
  loftTiltZ?: number;
  /** Counterbore/countersink: diameter of the shaft below the head in mm (double countersink: the shaft between the two cones). */
  screwHoleShaft?: number;
  /** Counterbore: depth of the head pocket in mm. */
  screwHoleHeadDepth?: number;
  /** Countersink and double countersink: opening angle of the cone in degrees. */
  screwHoleAngle?: number;
  bentTubeProfile?: BentTubeProfile;
  bentTubeInnerProfile?: BentTubeInnerProfile;
  bentTubeSize?: number;
  bentTubeWall?: number;
  bentTubeQuality?: number;
  text?: string;
  font?: string;
  /** Text only: bend the line along a circle instead of laying it straight. */
  textCurved?: boolean;
  /** Curved text: radius of the circle the baseline follows, in mm. */
  textRadius?: number;
  /** Curved text: letter size (em) in mm. Straight text just fills its box. */
  textSize?: number;
  /** Curved text: run along the bottom of the circle, letters pointing at the centre. */
  textInward?: boolean;
  /** Curved text: same place on the circle, letters turned upside down (read from the other side). */
  textFlipped?: boolean;
};

export type ShapeCustomizationMap = Partial<Record<ShapeKind, ShapeCustomization>>;

export type WorkplaneWorkspaceSettings = {
  width: number;
  depth: number;
  sizePreset: string;
  /** Id of the chosen printer preset (printerPresets.generated.ts), or "" for none. */
  printer: string;
  gridBlockSize: number;
  gridBlockPreset: string;
  /** The grid preset of the unit system left by the last switch between mm and in, so switching back finds it again (#442). */
  gridBlockOtherUnits?: string;
  gridColor: string;
  /** Every how many grid steps a darker line is drawn on a millimetre grid: 5 or 10 (#143). */
  gridMajorInterval: number;
  /** Colour of those darker lines; empty takes it from the grid colour (#143). */
  gridMajorColor: string;
  /** The work area's background in the light theme; the dark themes keep their own. */
  background: string;
  /** The workplane's surface colour in the light theme. */
  surfaceColor: string;
  /** Arrows for the X, Y and Z directions at the corner of the plate. */
  showAxes: boolean;
  /** The design's name and the printer with its build volume, written on the plate (#192). */
  showPlateLabels: boolean;
  /** The fine and darker grid lines also lie on the plate as bands that grow as you zoom in; off, they stay one pixel wide (#240). */
  gridLinesGrow: boolean;
  /** Draw an edge line on every body, not only on selected and complex ones. */
  edgeLines: boolean;
  /** Colour of those edge lines. */
  edgeColor: string;
  showShadows: boolean;
  /** The camera keeps turning for a moment after you let go, and slows down. */
  cameraInertia: boolean;
  /**
   * Fast mode: turns the costly parts of the view down together - no shadows, no edge lines on
   * all bodies, no camera inertia, and the view drawn at one pixel per screen pixel.
   */
  fastMode: boolean;
  /** Lighting contrast, -100 (soft) to 100 (punchy); 0 is the original look. */
  shadeContrast: number;
  /** How dark the cast shadows are, 0 to 100 (100 = as before). */
  shadowStrength: number;
  /** How soft the shadow edges are, 0 (crisp, as before) to 100. */
  shadowSoftness: number;
  /** Where the main light comes from round the plate, -180 to 180 degrees; 0 is the front, 90 the right. */
  lightAzimuth: number;
  /** How high the main light stands, 10 to 90 degrees; 90 is straight above. */
  lightElevation: number;
  /** The sketch view's background in the light theme. */
  sketchBackground: string;
  /** The sketch view's grid colour in the light theme. */
  sketchGridColor: string;
  /** The sketch view's area under the grid in the light theme (#143). */
  sketchPlateColor: string;
  /** Overhangs steeper than this (degrees from vertical) show red when overhangs are shown. */
  overhangAngle: number;
  showGrid: boolean;
  clickToPlaceShapes: boolean;
  selectBeforeMove: boolean;
  /** The selection frame takes only what it encloses when dragged to the right, what it touches when dragged to the left (#430). */
  frameByDirection: boolean;
  /** A double click on a sketch body opens its sketch; on a group or bundle, opens it for editing (#150). */
  doubleClickOpensSketch: boolean;
  doubleClickOpensGroup: boolean;
  /** Moving a shape snaps its edges and centre to other shapes, with guide lines. */
  objectSnap: boolean;
  dimensionsAlwaysVisible: boolean;
  /** A turned body shows its angles about X, Y and Z beside it while it is selected. */
  showRotationAngles: boolean;
  zoomSpeed: number;
  units: string;
  /** With Imperial: inches as fractions (1⅝, like similar tools) or decimals (1.625). */
  inchFormat: InchFormat;
  scale: string;
  accuracy: MeasurementAccuracy;
  historyLimit: HistoryRetentionLimit;
  /** Snap steps of the user's own, offered in the snap menu next to the fixed ones. */
  customSnapGrids: CustomSnapGrid[];
  /** Imported meshes with more triangles than this are not cut, merged or intersected exactly. */
  booleanTriangleLimit: number;
  shapeCustomizations: ShapeCustomizationMap;
};

export type InchFormat = "fraction" | "decimal";

export type AlignAxis = "x" | "y" | "z";
export type AlignTarget = "min" | "center" | "max";
export type AlignHandleStatus = {
  axis: AlignAxis;
  target: AlignTarget;
  disabled: boolean;
  aligned: boolean;
  title: string;
};

export type SketchPoint = {
  id: string;
  x: number;
  z: number;
  handleIn?: { x: number; z: number };
  handleOut?: { x: number; z: number };
  mode?: "corner" | "smooth" | "split";
};

export type SketchSegment = {
  id: string;
  startId: string;
  endId: string;
  kind?: "line" | "bezier" | "smooth";
  /** A construction line (#229): drawn dashed, never part of the body, points snap to its crossings. */
  construction?: boolean;
};

export type SketchImage = {
  id: string;
  name: string;
  dataUrl: string;
  mimeType: string;
  pixelWidth: number;
  pixelHeight: number;
  x: number;
  z: number;
  width: number;
  depth: number;
  opacity?: number;
  lockAspect?: boolean;
  locked?: boolean;
  /** Turned on the plate by this many degrees, counter-clockwise (#216). */
  rotation?: number;
  /** The shares of the picture cut away on each side (#216); width and depth are the part that is shown. */
  crop?: { left: number; top: number; right: number; bottom: number };
};

/** Where the wall of a stroked closed outline lies against the drawn line; "grow" keeps the area and widens it by the width (#215). */
export type SketchStrokeAlign = "center" | "inside" | "outside" | "grow";
export type SketchStrokeJoin = "miter" | "round" | "bevel";
export type SketchStrokeCap = "flat" | "square" | "round";
/** A sketch drawn as a line of this width instead of a filled area (#154). */
export type SketchStroke = { width: number; align: SketchStrokeAlign; join: SketchStrokeJoin; cap: SketchStrokeCap };
/** Where a name tag's key ring hole sits, seen from above (#215). */
export type TextKeyringSide = "left" | "right" | "top";
/**
 * A key ring hole on a text (#215): a round hole `offset` mm beyond the letters' box on `side`,
 * centred on that side. With `ear` the text also grows a round ear round the hole that joins
 * its outline - the bottom layer of a name tag; the layers above only get the hole where it
 * reaches them. The box grows by the ear on that side; the letters keep their size.
 */
export type TextKeyring = { side: TextKeyringSide; diameter: number; offset: number; ear?: boolean };

/** A key ring hole in an extruded sketch (#391): its middle in the sketch's own mm, its size, the side it is on and whether the layer has the ear. */
export type SketchKeyring = { side: TextKeyringSide; diameter: number; x: number; z: number; ear?: boolean };
/**
 * A sketch built set in from its outlines: every edge `distance` mm inward, every corner rounded to
 * `radius` mm. The face tool keeps the outline of the face it pushes out or in here and builds the
 * inset from it, as a stroked sketch keeps its line.
 */
export type SketchInset = { distance: number; radius: number };

export type SketchProfile = {
  points: SketchPoint[];
  segments: SketchSegment[];
  images?: SketchImage[];
  stroke?: SketchStroke;
  /** Built without its holes: only the outermost outlines count, as the usual Silhouette (#197). */
  silhouette?: boolean;
  /** A key ring hole cut through the body, with its ear on the bottom layer of an icon tag (#391). */
  keyring?: SketchKeyring;
  /** Built set in from its outlines by the face tool: the body keeps the face's outline and builds the inset from it. */
  inset?: SketchInset;
};

export type SketchOperation = "extrude" | "revolve" | "sweep";

/** Spur, helical, herringbone and bevel gears; a ring gear with its teeth pointing in and a rack (#201, #265). */
export type GearType = "spur" | "helical" | "herringbone" | "bevel" | "internal" | "rack";
export type GearProfile = "involute" | "round" | "simple";

/** A Gridfinity bin, or the baseplate bins stand in. */
export type GridfinityType = "bin" | "baseplate";
/** How a label shelf's corners are finished where it meets a wall or another shelf. */
export type GridfinityLabelCorner = "round" | "chamfer";

/** Was aus dem Gewinde wird: Stange, Schraube, Mutter oder das Loch dafuer. */
export type ThreadRole = "rod" | "screw" | "nut" | "bore";
export type ThreadHead = "cylinder" | "countersunk" | "hex";
export type ThreadHand = "right" | "left";
/**
 * Die Zahnform: scharfe ISO-Spitze, flache Trapezflanke, rundes Profil oder
 * das Whitworth-Profil der G-Rohrgewinde (55 Grad, Kuppe und Grund gerundet).
 */
export type ThreadProfile = "v" | "trapezoidal" | "round" | "whitworth" | "custom";

export type SketchRevolveSettings = {
  startAngle: number;
  sweepAngle: number;
  sides: number;
  quality: number;
};

/** A side of a body as seen from the workplane: up/down and the four sides of the plate. */
export type ShellSide = "top" | "bottom" | "front" | "back" | "left" | "right";

/**
 * Which faces a hollowed body leaves open, measured against the world's axes:
 * any set of sides, or one of the names the Hollow tool had before it took
 * every side ("top-bottom" is a frame, "none" sealed all round).
 */
export type ShellOpenings = "none" | "top" | "bottom" | "top-bottom" | ShellSide[];

/**
 * How the inner walls meet where the offset faces move apart: "round" is
 * OCCT's arc join (radius = wall thickness), "sharp" extends the faces until
 * they intersect.
 */
export type ShellEdges = "round" | "sharp";

export type EdgeTreatmentFeature = {
  /** "shell" hollows the body: `amount` is then the wall thickness. "deleteFace" deletes faces and closes the gap (#451). */
  kind: "fillet" | "chamfer" | "shell" | "deleteFace";
  amount: number;
  edgeCount: number;
  /** The edges picked, as the tool numbered them on the body before this treatment: "Edit" picks them again (#227). */
  edgeIds?: number[];
  chamferAngle?: number;
  openings?: ShellOpenings;
  /** Only for "shell"; missing means "round". */
  shellEdges?: ShellEdges;
  /** Only for "deleteFace": the faces deleted, as the tool numbered them on the body before. */
  faceIds?: number[];
  faceCount?: number;
};

export type EdgeTreatmentHistoryEntry = {
  id: string;
  createdAt: number;
  feature: EdgeTreatmentFeature;
  before: WorkplaneShape;
  appliedFrame?: {
    x: number;
    z: number;
    elevation: number;
    width: number;
    depth: number;
    height: number;
    rotation: number;
    rotationX: number;
    rotationZ: number;
    mirrorX: boolean;
    mirrorY: boolean;
    mirrorZ: boolean;
  };
};

export type CadDisplayEdge = {
  points: number[];
};

export type CadBrepFrame = {
  x: number;
  z: number;
  elevation: number;
  width: number;
  depth: number;
  height: number;
  sourceTransform?: number[];
};

/**
 * Was ein Koerper war, bevor eine Drehung ihn in ein Netz gebacken hat.
 *
 * Gedreht wird um die Mitte des Rahmens, und danach muss der Rahmen neu
 * aufgesetzt werden - sonst sinkt ein gekippter Koerper durch die
 * Arbeitsebene. Genau dafuer backt der Editor ihn in ein Netz. Seine Bauwerte
 * (Durchmesser, Zahnzahl, Steigung ...) bleiben dabei am Datensatz stehen;
 * hier steht nur, was das Backen ueberschrieben hat. Zusammen reicht das, um
 * den Koerper auf Wunsch neu zu bauen, wieder zu drehen und wieder zu backen.
 */
export type ParametricSource = {
  kind: ShapeKind;
  width: number;
  depth: number;
  height: number;
  size: number;
  /** Die aufgelaufene Drehung in Grad, so wie sie wieder aufzutragen ist. */
  rotation: number;
  rotationX: number;
  rotationZ: number;
  taperTopWidth?: number;
  taperTopDepth?: number;
  taperBottomWidth?: number;
  taperBottomDepth?: number;
  extrudeTwist?: number;
  extrudeTopOffsetX?: number;
  extrudeTopOffsetZ?: number;
};

export type CadPrimitiveFrame = {
  kind: "box" | "cylinder" | "cone" | "sphere" | "torus";
  width: number;
  depth: number;
  height: number;
  radius?: number;
  baseRadius?: number;
  topRadius?: number;
  majorRadius?: number;
  minorRadius?: number;
  frame: CadBrepFrame;
};

/** The top edge of a text's letters: rounded or chamfered, `size` mm wide and high (#225). */
export type TextEdge = { kind: "round" | "chamfer"; size: number };

export type WorkplaneShape = {
  id: string;
  name: string;
  kind: ShapeKind;
  color: string;
  hole?: boolean;
  x: number;
  z: number;
  elevation?: number;
  size: number;
  width: number;
  depth: number;
  height: number;
  rotation: number;
  rotationX?: number;
  rotationZ?: number;
  mirrorX?: boolean;
  mirrorY?: boolean;
  mirrorZ?: boolean;
  radius?: number;
  steps?: number;
  sides?: number;
  bevel?: number;
  segments?: number;
  topRadius?: number;
  baseRadius?: number;
  topWidth?: number;
  topDepth?: number;
  taperTopWidth?: number;
  taperTopDepth?: number;
  taperBottomWidth?: number;
  taperBottomDepth?: number;
  /** Legacy local-dev taper fields kept for compatibility with in-progress projects. */
  taperTopScale?: number;
  taperBottomScale?: number;
  /** Rotates the top face relative to the base, in degrees, for a twisted extrusion. */
  extrudeTwist?: number;
  /** Shifts the top face along the shape's local X axis, in mm. */
  extrudeTopOffsetX?: number;
  /** Shifts the top face along the shape's local Z axis, in mm. */
  extrudeTopOffsetZ?: number;
  teeth?: number;
  toothSize?: number;
  toothWidth?: number;
  centerHoleSize?: number;
  gearType?: GearType;
  helixAngle?: number;
  helixQuality?: number;
  /** Involute teeth (#201) or the straight ones every gear had before; missing means straight. */
  gearProfile?: GearProfile;
  /** Involute teeth: pressure angle in degrees (20 by default). */
  gearPressureAngle?: number;
  /** Involute teeth: play of a meshing pair in mm, half taken off each gear. */
  gearBacklash?: number;
  /** Ring gear (#201): the rim outside its teeth, in mm (3 by default). */
  gearRim?: number;
  threadRole?: ThreadRole;
  threadHead?: ThreadHead;
  threadHand?: ThreadHand;
  threadProfile?: ThreadProfile;
  threadDiameter?: number;
  threadPitch?: number;
  threadClearance?: number;
  /** Rod and screw: how much thinner (in diameter) the bolt comes out, for a metal nut. */
  threadBoltClearance?: number;
  threadAxialClearance?: number;
  /** Own profile: the thread depth in mm (outer minus core radius) and the included flank angle in degrees. */
  threadDepth?: number;
  threadFlankAngle?: number;
  threadQuality?: number;
  threadHeadHeight?: number;
  threadChamfer?: number;
  /** The chamfer at the bottom end; without it the bottom end has the same chamfer as the top. */
  threadChamferBottom?: number;
  threadHeadChamfer?: number;
  springTurns?: number;
  springWire?: number;
  springHand?: ThreadHand;
  springQuality?: number;
  starPoints?: number;
  starInnerSize?: number;
  starOuterFillet?: number;
  starInnerFillet?: number;
  starQuality?: number;
  heartTipFillet?: number;
  heartQuality?: number;
  crescentThickness?: number;
  crescentTipFillet?: number;
  crescentQuality?: number;
  honeycombCellSize?: number;
  honeycombWallThickness?: number;
  honeycombFrameWidth?: number;
  /** Hinge: how many knuckles share the axis, odd so the pin's part holds both ends. */
  hingeKnuckles?: number;
  /** Hinge: diameter of the pin in mm; the other part's bore is wider by the clearance. */
  hingePinDiameter?: number;
  /** Hinge: thickness of the two leaves in mm. */
  hingeLeafThickness?: number;
  /** Hinge: gap in mm between the moving parts - around the pin, between knuckles and before the leaves. */
  hingeClearance?: number;
  /** Hinge: no printed pin; the bore runs through every knuckle for a pin of one's own (filament, wire). */
  hingePinless?: boolean;
  /** Gridfinity: a bin or the baseplate it stands in; the size counts grid units of 42 mm (height units of 7 mm). */
  gridfinityType?: GridfinityType;
  /** Gridfinity bin: the stacking lip on top of the wall; missing means on. */
  gridfinityLip?: boolean;
  /** Gridfinity bin: holes for 6 x 2 mm magnets under each foot. */
  gridfinityMagnets?: boolean;
  /** Gridfinity bin: a label shelf along the back wall. */
  gridfinityLabelBack?: boolean;
  /** Gridfinity bin: a label shelf along the front wall. */
  gridfinityLabelFront?: boolean;
  /** Gridfinity bin: a label shelf along the left wall. */
  gridfinityLabelLeft?: boolean;
  /** Gridfinity bin: a label shelf along the right wall. */
  gridfinityLabelRight?: boolean;
  /** Gridfinity bin: how far the back wall's label shelf reaches out from it, in mm. */
  gridfinityLabelBackWidth?: number;
  /** Gridfinity bin: the back wall's label shelf length in mm; missing or 0 runs it from wall to wall. */
  gridfinityLabelBackLength?: number;
  /** Gridfinity bin: the back wall's label shelf of a set length moved along the wall from the middle, in mm, towards +x. */
  gridfinityLabelBackOffset?: number;
  /** Gridfinity bin: how far the front wall's label shelf reaches out from it, in mm. */
  gridfinityLabelFrontWidth?: number;
  /** Gridfinity bin: the front wall's label shelf length in mm; missing or 0 runs it from wall to wall. */
  gridfinityLabelFrontLength?: number;
  /** Gridfinity bin: the front wall's label shelf of a set length moved along the wall from the middle, in mm, towards +x. */
  gridfinityLabelFrontOffset?: number;
  /** Gridfinity bin: how far the left wall's label shelf reaches out from it, in mm. */
  gridfinityLabelLeftWidth?: number;
  /** Gridfinity bin: the left wall's label shelf length in mm; missing or 0 runs it from wall to wall. */
  gridfinityLabelLeftLength?: number;
  /** Gridfinity bin: the left wall's label shelf of a set length moved along the wall from the middle, in mm, towards +z (the front). */
  gridfinityLabelLeftOffset?: number;
  /** Gridfinity bin: how far the right wall's label shelf reaches out from it, in mm. */
  gridfinityLabelRightWidth?: number;
  /** Gridfinity bin: the right wall's label shelf length in mm; missing or 0 runs it from wall to wall. */
  gridfinityLabelRightLength?: number;
  /** Gridfinity bin: the right wall's label shelf of a set length moved along the wall from the middle, in mm, towards +z (the front). */
  gridfinityLabelRightOffset?: number;
  /** Gridfinity bin: where a label shelf meets a wall or another shelf, the corner rounded or chamfered. */
  gridfinityLabelCorner?: GridfinityLabelCorner;
  /** Gridfinity bin: the size of that rounding or chamfer in mm; 0 leaves the corner sharp. */
  gridfinityLabelCornerSize?: number;
  /** Knurling: grooves straight along the axis, or crossed into diamonds. */
  knurlPattern?: "straight" | "diamond" | "round";
  /** Knurling: number of grooves around the grip. */
  knurlCount?: number;
  /** Knurling: how deep a groove goes, in mm. */
  knurlDepth?: number;
  /** Crossed knurling: angle of the grooves to the axis, in degrees. */
  knurlAngle?: number;
  /** Knurling: 45-degree chamfer on both ends, in mm; 0 for none. */
  knurlChamfer?: number;
  /** Dovetail: width of the narrow neck in mm (the wide end is the shape's width). */
  dovetailNeckWidth?: number;
  /** Dovetail: gap in mm added on every side when the dovetail is a cut-out (its socket). */
  dovetailClearance?: number;
  /** Transition (loft, #188): the outline at the bottom and at the top. */
  loftBottomOutline?: "round" | "rectangle" | "polygon";
  loftTopOutline?: "round" | "rectangle" | "polygon";
  /** Transition: the size of each end in mm, as set; the frame stretches them when it is dragged. */
  loftBottomWidth?: number;
  loftBottomDepth?: number;
  loftTopWidth?: number;
  loftTopDepth?: number;
  /** Transition: corner rounding of a rectangular end, in mm. */
  loftBottomCorner?: number;
  loftTopCorner?: number;
  /** Transition: number of sides of a polygonal end. */
  loftBottomSides?: number;
  loftTopSides?: number;
  /** Transition: how far the top's middle sits from the bottom's, in mm. */
  loftOffsetX?: number;
  loftOffsetZ?: number;
  /** Transition: wall thickness in mm; 0 is a solid body, more a tube open at both ends. */
  loftWall?: number;
  /** Transition: degrees the section turns from bottom to top (#205). */
  loftTwist?: number;
  /** Transition: 0 to 1, how much of an S-curve the sides take between the ends (#271). */
  loftSmooth?: number;
  /** Capsule: the small end's diameter as a share of the large one, 1 or missing for equal ends (#206). */
  slotEndRatio?: number;
  /** Transition: degrees the top end tilts about the x axis and about the z axis (#205). */
  loftTiltX?: number;
  loftTiltZ?: number;
  /** Counterbore/countersink: diameter of the shaft below the head in mm (double countersink: the shaft between the two cones). */
  screwHoleShaft?: number;
  /** Counterbore: depth of the head pocket in mm. */
  screwHoleHeadDepth?: number;
  /** Countersink and double countersink: opening angle of the cone in degrees. */
  screwHoleAngle?: number;
  cornerFillet?: number;
  topBottomFillet?: number;
  roundedBoxQuality?: number;
  bentTubeProfile?: BentTubeProfile;
  bentTubeInnerProfile?: BentTubeInnerProfile;
  bentTubeSize?: number;
  bentTubeWall?: number;
  bentTubeQuality?: number;
  bentTubeSegments?: BentTubeSegment[];
  text?: string;
  font?: string;
  /** Text only: bend the line along a circle instead of laying it straight. */
  textCurved?: boolean;
  /** Curved text: radius of the circle the baseline follows, in mm. */
  textRadius?: number;
  /** Curved text: letter size (em) in mm. Straight text just fills its box. */
  textSize?: number;
  /** Curved text: run along the bottom of the circle, letters pointing at the centre. */
  textInward?: boolean;
  /** Curved text: same place on the circle, letters turned upside down (read from the other side). */
  textFlipped?: boolean;
  /**
   * Text only (#215): drawn as a line of this width round the letters - outside, inside or
   * centred on their outline - or widened by it ("grow"), instead of the filled letters.
   * Width and depth stay the box of the whole body; the letters are fitted inside it.
   */
  textStroke?: SketchStroke;
  /** Text only (#215): the letters without their counters (the holes in O, A, e), as the usual Silhouette. */
  textSilhouette?: boolean;
  /**
   * Straight text only (#382): the letters are stretched to fill the box in both directions, so a
   * capital can be made lower or narrower as in Tinkercad. Without it the letters keep their
   * proportions and are fitted into the box, centred.
   */
  textStretch?: boolean;
  /**
   * Text only (#225): the top edge of the letters rounded or chamfered by `size` mm, as a name
   * tag's letters on top are finished. Built from the outline stepped inwards, so it works for
   * every font and word; the edge tool takes such a text as a mesh.
   */
  textEdge?: TextEdge;
  /** Text only (#215): a key ring hole, with the ear round it on the bottom layer of a name tag. Straight text only. */
  textKeyring?: TextKeyring;
  /**
   * A bundle that is one text as a stack of layers (#215): texts of the same words, each wider
   * than the one above, in their own colours. Its properties panel edits text, font and layers
   * together and builds the stack again.
   */
  layeredText?: boolean;
  /**
   * A bundle that is one SVG icon as a stack of layers, the icon tag: sketch bodies of the same
   * outline, each a "Wider" line round the one above, in their own colours. Its properties panel
   * edits the icon's width and the layers together and builds the stack again.
   */
  layeredIcon?: boolean;
  /**
   * Set on a body made by wrapping around a cylinder (#106): its box is
   * centred on the cylinder's axis, and aligning, snapping and centring use
   * that box rather than the arc the mesh actually covers.
   */
  cylinderWrap?: { diameter: number; inward?: boolean };
  importedMesh?: {
    positions: number[];
    normals?: number[];
    baseWidth: number;
    baseDepth: number;
    baseHeight: number;
    triangleCount: number;
    sourceFormat: "stl" | "obj" | "svg" | "json" | "step" | "3mf";
    // IndexedDB persistence uses this only in compact stored shape records.
    // Runtime editor shapes are hydrated with the full immutable mesh resource.
    storageResourceId?: string;
    // Stable reference to the original imported file in the project's shared
    // asset table. Copies and grouped operands reuse this reference.
    assetId?: string;
    // Exact OpenCascade B-Rep of the body (single-shape STEP text) in the same
    // local frame as `positions`. Set only for STEP imports; lets the exporter
    // re-emit the original analytic geometry instead of the tessellation.
    brepStep?: string;
  };
  /** A shape that only shows what a preview would make (the common part of an intersection, #372): not picked, not saved. */
  previewOnly?: boolean;
  imagePlate?: {
    dataUrl: string;
    mimeType: string;
    pixelWidth: number;
    pixelHeight: number;
  };
  parametricSource?: ParametricSource;
  sketchProfile?: SketchProfile;
  sketchOperation?: SketchOperation;
  sketchRevolve?: SketchRevolveSettings;
  edgeTreatments?: EdgeTreatmentFeature[];
  edgeTreatmentHistory?: EdgeTreatmentHistoryEntry[];
  cadDisplayEdges?: CadDisplayEdge[];
  cadDisplayEdgesVersion?: 2;
  edgeResizeMode?: "scale" | "preserve";
  cadBrep?: string;
  cadBrepFrame?: CadBrepFrame;
  // The finest tessellation deflection any edge treatment on this body has
  // needed so far. Carried forward as a floor for the next one, so a later
  // fillet with a larger radius cannot re-tessellate an already finely
  // curved region more coarsely than it already was (layerling forum: mesh
  // quality getting worse over several sequential fillets).
  cadMeshDeflection?: { linear: number; angular: number };
  cadPrimitiveFrame?: CadPrimitiveFrame;
  groupedShapes?: WorkplaneShape[];
  groupedBaseWidth?: number;
  groupedBaseDepth?: number;
  groupedBaseHeight?: number;
  /**
   * How the parts are put together. "bundle" (the usual Ctrl+B) only holds
   * them together: no cutting, every part keeps its colour and goes out as
   * its own body.
   */
  groupOperation?: "group" | "intersection" | "bundle";
  /**
   * The point this body turns about, kept with the body: a fraction of its
   * width, height and depth from its centre, in its own frame, so it moves,
   * turns and scales with it. See lib/rotationPivot.
   */
  rotationPivot?: [number, number, number];
  /**
   * The calculation last typed into a number field, by the field's id (#180): "(140+2)/2" under
   * `width`. Shown again when the field is entered, as long as the value still equals it. See
   * lib/fieldFormulas.
   */
  formulas?: Record<string, string>;
  /**
   * A group shows each part in its own colour, like the usual "Multicolor".
   * Left out, see groupShowsPartColors() for what a group shows.
   */
  multicolor?: boolean;
  locked?: boolean;
  hidden?: boolean;
  /** Drawn see-through in its own colour, like the usual "Transparent". Display only - a solid stays a solid. */
  transparent?: boolean;
};

/**
 * Woran eine Notiz haengt, wenn sie nicht frei auf der Arbeitsebene steht: an
 * einem Koerper, und zwar an einer Stelle seines Rahmens statt an einer
 * Weltkoordinate. So faehrt sie mit, wenn der Koerper verschoben, gedreht oder
 * in der Groesse geaendert wird - dieselbe Rechnung wie beim Massband.
 */
export type WorkplaneNoteAnchor = {
  shapeId: string;
  normalized: [number, number, number];
};

/**
 * Eine Notiz auf der Arbeitsflaeche. Sie ist kein Koerper: Sie wird nicht
 * gedruckt, taucht in keiner Ausfuhr auf und traegt keine Geometrie - nur einen
 * Text und die Stelle, an der er steht.
 */
export type WorkplaneNote = {
  id: string;
  text: string;
  /** Weltkoordinate. Bei einer angehefteten Notiz die zuletzt bekannte Lage. */
  x: number;
  y: number;
  z: number;
  anchor?: WorkplaneNoteAnchor;
  /** Zugeklappt zeigt die Notiz nur ihre Nadel mit der Nummer. */
  collapsed?: boolean;
  /**
   * "point" makes this a reference point instead of a note: a mark in space
   * that other shapes snap to. It has no text and no anchor, is not counted as
   * a note, and travels with the design exactly like one (history, file, server).
   */
  kind?: "point";
};
