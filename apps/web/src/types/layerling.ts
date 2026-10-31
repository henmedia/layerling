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
  | "paraboloid"
  | "torus"
  | "tube"
  | "bentTube"
  | "star"
  | "heart"
  | "crescent"
  | "gear"
  | "hirth"
  | "honeycomb"
  | "hinge"
  | "knurl"
  | "dovetail"
  | "counterbore"
  | "countersink"
  | "doubleCountersink"
  | "teardrop"
  | "port"
  | "loft"
  | "vase"
  | "thread"
  | "spring"
  | "gridfinity"
  | "ring"
  | "wedge"
  | "polygon"
  | "icosahedron"
  | "ruler"
  | "mesh";

/** Outline of a port opening (portGeometry.ts): rounded corners, or the lower corners cut as on these sockets. */
export type PortProfile = "rounded" | "hdmi" | "miniHdmi" | "displayPort" | "miniDisplayPort";

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
 * A file kept with a design - its instructions, a parts list - and saved, shared and backed up
 * with it (#820). Not part of the undo history. `mediaType` comes from the content check of
 * `projectAttachments.ts`, never from the browser.
 */
export type ProjectAttachment = {
  id: string;
  name: string;
  mediaType: string;
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
  /** Screw only (#1052): the head diameter (across flats on a hex head), the drive in its free face, and the drive's size and depth. Unset = the standard measure. */
  threadHeadDiameter?: number;
  threadDrive?: ThreadDrive;
  threadDriveSize?: number;
  threadDriveDepth?: number;
  springTurns?: number;
  springWire?: number;
  springHand?: ThreadHand;
  springQuality?: number;
  /** A flat spring (#1076) instead of the coil: a band that runs in waves across the plate, `height` thick. Unset = the coil. */
  springForm?: SpringForm;
  springPattern?: FlatSpringPattern;
  springEnds?: FlatSpringEnds;
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
  /** Tube or ring: its bore counts as a hole when the shape is grouped, and cuts what it is grouped with - a wall of another tube in a T-junction (#892). */
  tubeBoreHole?: boolean;
  /** Hinge: the knuckles are at most this wide in mm and their number follows; left out, the count of `hingeKnuckles` stands (#907). */
  hingeKnuckleWidth?: number;
  /** Hinge, cone style: the diameter of the cones at their root in mm; left out, the largest that fits (#907). */
  hingeConeSize?: number;
  /** Hinge: "pin" (default) or "cone": cones on every other knuckle that nest into the others, printing without bridges (#907). */
  hingeStyle?: "pin" | "pinless" | "cone" | "liftOff";
  /** Hinge: diameter of the pin in mm; the other part's bore is wider by the clearance. */
  hingePinDiameter?: number;
  /** Hinge: thickness of the two leaves in mm. */
  hingeLeafThickness?: number;
  /** Hinge: gap in mm between the moving parts - around the pin, between knuckles and before the leaves. */
  hingeClearance?: number;
  /** Hinge: no printed pin; the bore runs through every knuckle for a pin of one's own (filament, wire). */
  hingePinless?: boolean;
  /** Hinge: the second leaf folded up about the pin, in degrees; 0 lies flat, 180 is closed. */
  hingeAngle?: number;
  /** Hinge: screw holes in each leaf along the axis, 0 to 6; left out, none. */
  hingeScrewHoles?: number;
  /** Hinge: the screw holes' diameter in mm. */
  hingeScrewDiameter?: number;
  /** Hinge: from one screw hole's middle to the next along the axis in mm; left out, they share the length evenly. */
  hingeScrewSpacing?: number;
  /** Hinge: from the hole in one leaf to the hole in the other, across the axis, in mm; left out, each in the middle of its leaf. */
  hingeScrewAcross?: number;
  /** Hinge: false for straight screw holes; otherwise countersunk on the side that faces the other leaf when closed. */
  hingeScrewCountersink?: boolean;
  /** Hinge: the screw holes' top - "countersunk", "straight", "nut" (a hexagonal pocket for a nut) or "countersunkNut" (countersunk on leaf A, a nut on B); left out, hingeScrewCountersink decides. */
  hingeScrewHead?: "countersunk" | "straight" | "nut" | "countersunkNut";
  /** Hinge: a nut's width across the flats in mm for the nut's pockets; left out, from the hole's diameter. */
  hingeNutWidth?: number;
  /** Hinge: the leaves' outer corners rounded with this radius in mm. */
  hingeCornerRadius?: number;
  /** Hinge: "fingers" gives each knuckle its own finger instead of a leaf each side, the two sides' alternating like combs; left out, plates. */
  hingeLeafStyle?: "plate" | "fingers";
  /** Gridfinity: a bin or the baseplate it stands in, whose size counts grid units of 42 mm (height units of 7 mm), or a tray of any size in mm (#837). */
  gridfinityType?: GridfinityType;
  /** Gridfinity bin: the stacking lip on top of the wall; missing means on. */
  gridfinityLip?: boolean;
  /** Gridfinity bin: holes for 6 x 2 mm magnets under each foot. */
  gridfinityMagnets?: boolean;
  /** Gridfinity bin: the size counts cells of 21 mm, each with a foot, four to a baseplate's socket; missing means the 42 mm grid. */
  gridfinityHalfGrid?: boolean;
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
  /** Gridfinity bin: a finger scoop along the back wall, the floor rising along a quarter circle into it. */
  gridfinityScoopBack?: boolean;
  /** Gridfinity bin: a finger scoop along the front wall. */
  gridfinityScoopFront?: boolean;
  /** Gridfinity bin: a finger scoop along the left wall. */
  gridfinityScoopLeft?: boolean;
  /** Gridfinity bin: a finger scoop along the right wall. */
  gridfinityScoopRight?: boolean;
  /** Gridfinity bin: the finger scoops' radius in mm; missing is half the height from the floor up to the lip's support, or to the top without the lip. */
  gridfinityScoopRadius?: number;
  /** Gridfinity bin: the floor's height inside in mm, measured from the underside; missing is 5.95, and at the highest the bin is solid up to the lip's support, or to the top without the lip. */
  gridfinityFloorHeight?: number;
  /** Gridfinity bin: no wall and no stacking lip along the back above the floor; the walls beside it run out to the outline (#682). Opened only partly with gridfinityOpenings (#455). */
  gridfinityOpenBack?: boolean;
  /** Gridfinity bin: no wall and no stacking lip along the front. */
  gridfinityOpenFront?: boolean;
  /** Gridfinity bin: no wall and no stacking lip along the left. */
  gridfinityOpenLeft?: boolean;
  /** Gridfinity bin: no wall and no stacking lip along the right. */
  gridfinityOpenRight?: boolean;
  /** Gridfinity bin with the lip: a chamfer on the lip's top in mm, down the outer wall and down the slope, as the edge tool's; missing is none, sharp as the specification draws it, at most 1 (#780). */
  gridfinityLipChamfer?: number;
  /** Gridfinity bin: the wall's thickness in mm, set in from an outline that never changes; missing is 0.95, at least 0.8, at most where the walls meet, which builds the bin solid (#455). */
  gridfinityWallThickness?: number;
  /** Gridfinity bin: the corners of its partly open sides' notches, seen from outside the wall, rounded or chamfered; missing is rounded (#455). */
  gridfinityOpeningCorner?: GridfinityLabelCorner;
  /** Gridfinity bin: the size of that rounding or chamfer in mm; missing, 0 or under 0.5 leaves them square. */
  gridfinityOpeningCornerSize?: number;
  /** Gridfinity baseplate: a solid border at the plate's height along the back, in mm, outside the grid and inside the box; missing is none, at most 41 (#455). */
  gridfinityPaddingBack?: number;
  /** Gridfinity baseplate: the border along the front. */
  gridfinityPaddingFront?: number;
  /** Gridfinity baseplate: the border along the left. */
  gridfinityPaddingLeft?: number;
  /** Gridfinity baseplate: the border along the right. */
  gridfinityPaddingRight?: number;
  /** Gridfinity baseplate: the radius of its four outer corners in mm; missing is the specification's 4, at least 0 (square), at most 4; the sockets keep theirs (#856). */
  gridfinityCornerRadius?: number;
  /** Gridfinity bin: the radius of its outer corners above the feet in mm; missing is the specification's 3.75, at least 0 (square), at most 3.75; the feet, the inside and the lip's slopes keep theirs (#856). */
  gridfinityBinCornerRadius?: number;
  /** Gridfinity bin: compartments across, a whole number; missing is 1, a bin without dividers (#554). */
  gridfinityCompartmentsX?: number;
  /** Gridfinity bin: compartments deep, a whole number; missing is 1. */
  gridfinityCompartmentsZ?: number;
  /** Gridfinity bin: the dividers' thickness in mm, 0.8 to 3; missing is 1.2. */
  gridfinityDividerThickness?: number;
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
  /** Transition: straight pieces of a full circle in the mesh, 96 if missing (#755). */
  loftSegments?: number;
  /** Capsule: the small end's diameter as a share of the large one, 1 or missing for equal ends (#206). */
  slotEndRatio?: number;
  /** Torus: how thick the tube is seen from above, as a share of the outer size; the height only squashes it (#981). */
  torusTubeRatio?: number;
  /** Transition: degrees the top end tilts about the x axis and about the z axis (#205). */
  loftTiltX?: number;
  loftTiltZ?: number;
  /** Counterbore/countersink: diameter of the shaft below the head in mm (double countersink: the shaft between the two cones). */
  screwHoleShaft?: number;
  /** Counterbore: depth of the head pocket in mm. */
  screwHoleHeadDepth?: number;
  /** Countersink and double countersink: opening angle of the cone in degrees. */
  screwHoleAngle?: number;
  /** Port opening: rounded corners, or the lower ones cut off as on an HDMI or DisplayPort socket. */
  portProfile?: PortProfile;
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
  /** Holes drawn darker and denser, with a line round them, so they stand out among see-through bodies (#662). */
  strongHoles: boolean;
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
  /** Soft light (#812): most of the light comes from the viewer's eye and turns with the camera, so no face is left dark or burnt out. Off by default. */
  softLighting: boolean;
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
  /** Pasted parts are set in the middle of the workplane and dropped onto it, instead of where they came from (#876). */
  pasteCentered: boolean;
  /** A double click on a sketch body opens its sketch; on a group or bundle, opens it for editing (#150). */
  doubleClickOpensSketch: boolean;
  doubleClickOpensGroup: boolean;
  /** A double click on empty workplane slides the view so that the spot comes to the middle. */
  doubleClickCentersView: boolean;
  /** Moving a shape snaps its edges and centre to other shapes, with guide lines. */
  objectSnap: boolean;
  /** An STL leaves as a plain download each time, which the browser numbers (name (1).stl), instead of writing into one linked file (#731). */
  stlAsDownload: boolean;
  /** The browser asks "Leave site?" when a design is open and the tab is closed or reloaded; off by default (#683 mail). */
  confirmTabClose: boolean;
  dimensionsAlwaysVisible: boolean;
  /** A turned body shows its angles about X, Y and Z beside it while it is selected. */
  showRotationAngles: boolean;
  zoomSpeed: number;
  /**
   * Which mouse buttons steer the view (#1013): layerling's own (right turns, middle shifts, a left drag on empty space draws
   * a selection box) or as in Bambu Studio and OrcaSlicer (a left drag on empty space turns, the right button shifts,
   * Shift and a left drag draws the box).
   */
  mouseScheme: MouseScheme;
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

export type MouseScheme = "layerling" | "slicer";

export type AlignAxis = "x" | "y" | "z";
export type AlignTarget = "min" | "center" | "max";
export type AlignHandleStatus = {
  axis: AlignAxis;
  target: AlignTarget;
  disabled: boolean;
  aligned: boolean;
  title: string;
  /** The same dot with Alt held: it stretches the parts to the reference instead of moving them (#998). */
  size?: { disabled: boolean; aligned: boolean; title: string };
};

export type SketchPoint = {
  id: string;
  x: number;
  z: number;
  handleIn?: { x: number; z: number };
  handleOut?: { x: number; z: number };
  mode?: "corner" | "smooth" | "split";
  /** Part of a locked outline (#653): the point keeps its place, and the sides between locked points stay as they are. */
  locked?: boolean;
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

/** Where the wall of a stroked closed outline lies against the drawn line; "grow" keeps the area and widens it by the width (#215), "shrink" keeps it and moves its edge in by the width (#558). */
export type SketchStrokeAlign = "center" | "inside" | "outside" | "grow" | "shrink";
export type SketchStrokeJoin = "miter" | "round" | "bevel";
export type SketchStrokeCap = "flat" | "square" | "round";
/**
 * A sketch drawn as a line of this width instead of a filled area (#154). `edge` makes the wall a cutting edge (#982): its top
 * runs in to that width with a 45° chamfer on both sides; only for a line inside, outside or centred, and narrower than the line.
 */
export type SketchStroke = { width: number; align: SketchStrokeAlign; join: SketchStrokeJoin; cap: SketchStrokeCap; edge?: number };
/** Where a name tag's key ring hole sits, seen from above (#215). */
export type TextKeyringSide = "left" | "right" | "top";
/**
 * A key ring hole on a text (#215): a round hole `offset` mm beyond the letters' box on `side`,
 * centred on that side, or `along` mm off its middle (#671: up on the left and right, to the
 * right on top). With `ear` the text also grows a round ear round the hole that joins
 * its outline - the bottom layer of a name tag; the layers above only get the hole where it
 * reaches them. The box grows by the ear on that side; the letters keep their size.
 */
export type TextKeyring = { side: TextKeyringSide; diameter: number; offset: number; along?: number; ear?: boolean; free?: FreeKeyring };

/**
 * A key ring hole placed freely (#598), where a key ring tab of its own was put and then fixed to
 * the tag: the hole's middle `dx`/`dz` mm from the corner of the letters' or icon's box it is
 * nearest to (`ax` -1 left, 1 right; `az` -1 top, 1 bottom, seen from above), so it keeps to that
 * corner when the words or the size change. The ear runs from the hole `length` mm towards
 * `angle` degrees (0 along +x, 90 along +z) and ends straight there. `side` and `along` are not used with it.
 */
export type FreeKeyring = { ax: -1 | 1; az: -1 | 1; dx: number; dz: number; angle: number; length: number };

/**
 * A key ring hole in an extruded sketch (#391): its middle in the sketch's own mm, its size, the side it is on and whether the layer has the ear.
 * `along` is how far the card moved it off the middle of its side (#671), kept so the card reads it back; `free` (#598) when it was placed freely.
 */
export type SketchKeyring = { side: TextKeyringSide; diameter: number; x: number; z: number; along?: number; ear?: boolean; free?: FreeKeyring };
/**
 * A sketch built set in from its outlines: every edge `distance` mm inward, every corner rounded to
 * `radius` mm. The face tool keeps the outline of the face it pushes out or in here and builds the
 * inset from it, as a stroked sketch keeps its line.
 */
export type SketchInset = { distance: number; radius: number };

/**
 * A note on an open sketch, in the sketch's own mm. In the 3D view it is an ordinary note pinned to
 * the sketch body; `offPlane` keeps where it stands off the sketch's plane when it came from there:
 * a share of the height for an extrusion or a sweep (0.5, the top, when left out), an angle round
 * the axis for a revolve (the middle of the turn when left out).
 */
export type SketchNote = { id: string; text: string; x: number; z: number; collapsed?: boolean; offPlane?: number };

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
  /** Which edge of a swept cross-section runs along the path: "center" (the default, left out) or "left"/"right" as seen along the path. */
  sweepAnchor?: SweepAnchor;
  /** The sketch body's notes, only while the sketch is open, so that undo takes them along; a body never keeps them here. */
  notes?: SketchNote[];
};

/** Where the cross-section of a sweep sits on its path, across it. */
export type SweepAnchor = "left" | "center" | "right";

export type SketchOperation = "extrude" | "revolve" | "sweep";

/** Spur, helical, herringbone and bevel gears; a ring gear with its teeth pointing in and a rack (#201, #265). */
export type GearType = "spur" | "helical" | "herringbone" | "bevel" | "internal" | "rack";
export type GearProfile = "involute" | "round" | "simple";

/** A Gridfinity bin, the baseplate bins stand in, or a tray of any size with a flat bottom (#837). */
export type GridfinityType = "bin" | "baseplate" | "tray";
/** How a label shelf's corners are finished where it meets a wall or another shelf. */
export type GridfinityLabelCorner = "round" | "chamfer";
/**
 * A label in one compartment of a Gridfinity bin with dividers (#554): column 0 is the left, row 0 the back. It stands
 * against one side of the compartment, the bin's wall or a divider; `length` is a share of that side in per cent (10 to
 * 100, missing the full length), `align` where a shorter one sits along it (start towards -x on a back or front side and
 * towards -z on a left or right one; missing the middle), `width` how far it reaches out in mm (missing 14, within what
 * the compartment takes).
 */
export type GridfinityCompartmentLabel = {
  column: number;
  row: number;
  side: "back" | "front" | "left" | "right";
  length?: number;
  align?: "start" | "middle" | "end";
  width?: number;
};

/**
 * A Gridfinity bin's side switched open, opened only partly (#455): a notch from the lip's top down `depth` mm, `width`
 * mm wide, at its place along the side's straight part: `align` start (towards -x on a back or front side, towards -z on
 * a left or right one), middle or end, and `distance` mm from that end; a missing value is the full depth, the full
 * wall, the middle or 0. At the full depth and the full wall the side is open as before.
 */
export type GridfinityOpening = {
  side: "back" | "front" | "left" | "right";
  depth?: number;
  width?: number;
  align?: "start" | "middle" | "end";
  distance?: number;
};

/** Was aus dem Gewinde wird: Stange, Schraube, Mutter oder das Loch dafuer. */
export type ThreadRole = "rod" | "screw" | "nut" | "bore";
export type ThreadHead = "cylinder" | "countersunk" | "hex";
/** What drives a screw: a recess in its free head face (#1052). */
export type ThreadDrive = "hex" | "torx" | "phillips" | "slot" | "robertson" | "none";
export type ThreadHand = "right" | "left";
export type SpringForm = "coil" | "flat";
export type FlatSpringPattern = "round" | "zigzag" | "square";
export type FlatSpringEnds = "eye" | "tab" | "none";
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
  /**
   * How far the profile climbs per full turn, in mm. Left out or 0 the profile turns into rings; above
   * 0 it winds up as one continuous strand (a coil, a filament spool) and the sweep may run past a
   * turn. A positive sweep winds right-handed, a negative one left-handed.
   */
  pitch?: number;
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
  /**
   * "shell" hollows the body: `amount` is then the wall thickness. "deleteFace" deletes faces and closes the gap (#451). "offset" moves every face by `amount` (#919).
   * "surfaceTexture" lays a relief onto the body: `amount` is its depth, and the entry keeps the body under it.
   */
  kind: "fillet" | "chamfer" | "chamfillet" | "shell" | "deleteFace" | "offset" | "surfaceTexture";
  amount: number;
  edgeCount: number;
  /** The edges picked, as the tool numbered them on the body before this treatment: "Edit" picks them again (#227). */
  edgeIds?: number[];
  chamferAngle?: number;
  /** Only for a fillet of one edge (#687): the radius at the edge's end, `amount` the one at its start. */
  endAmount?: number;
  openings?: ShellOpenings;
  /** Only for "shell" and "offset"; missing means "round". */
  shellEdges?: ShellEdges;
  /** Only for "offset": the faces moved inward, the body shrunk; missing means grown. */
  offsetShrink?: boolean;
  /** Only for "offset" (#1057): only the sides moved, flat tops and bottoms kept at their heights; missing means every face. */
  offsetSideways?: boolean;
  /** Only for "deleteFace": the faces deleted, as the tool numbered them on the body before. */
  faceIds?: number[];
  faceCount?: number;
  /** Only for "surfaceTexture": the settings it was made with, masks included. */
  surfaceTexture?: import("@/lib/surfaceTexture").SurfaceTextureSettings;
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
 * Where an extruded sketch body's sketch lay once an edge treatment or hollowing baked its turn and place into its exact
 * body (#1006): `transform` takes sketch points (y up from the sketch) into the exact body's own coordinates, `height`
 * is the extrusion's and `anchor` the point of the outline under the body's middle, as it was before.
 */
export type SketchPose = {
  transform: number[];
  height: number;
  anchor: { x: number; z: number };
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
  slopeEnd?: number;
  slopeSide?: "back" | "front" | "left" | "right";
  slopeCurve?: number;
  narrowEnd?: number;
  narrowSide?: "back" | "front" | "left" | "right";
  narrowCurve?: number;
  narrowStart?: number;
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
  /**
   * Slope along: the height of the top at the far end, in mm. The kept
   * end stays at the body's height; missing or equal to the height means no slope.
   */
  slopeEnd?: number;
  /** Slope along: which end goes down ("back" unless set; a round roof or a wedge slopes front or back). */
  slopeSide?: "back" | "front" | "left" | "right";
  /** Slope along: -1 to 1, 0 a straight top, above 0 bulging up, below 0 sagging. */
  slopeCurve?: number;
  /**
   * Narrow along: seen from above, the width of the narrow end in mm,
   * both long sides running in evenly. Missing or the full width means no narrowing.
   */
  narrowEnd?: number;
  /** Narrow along: which end narrows ("back" unless set; a round roof or a wedge narrows front or back). */
  narrowSide?: "back" | "front" | "left" | "right";
  /** Narrow along: -1 to 1, 0 straight sides, above 0 bulging out, below 0 drawn in. */
  narrowCurve?: number;
  /** Narrow along: 0 to 0.95, the share of the length from the wide end where the narrowing starts. */
  narrowStart?: number;
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
  /** Screw only (#1052): the head diameter (across flats on a hex head), the drive in its free face, and the drive's size and depth. Unset = the standard measure. */
  threadHeadDiameter?: number;
  threadDrive?: ThreadDrive;
  threadDriveSize?: number;
  threadDriveDepth?: number;
  springTurns?: number;
  springWire?: number;
  springHand?: ThreadHand;
  springQuality?: number;
  /** A flat spring (#1076) instead of the coil: a band that runs in waves across the plate, `height` thick. Unset = the coil. */
  springForm?: SpringForm;
  springPattern?: FlatSpringPattern;
  springEnds?: FlatSpringEnds;
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
  /** Tube or ring: its bore counts as a hole when the shape is grouped, and cuts what it is grouped with - a wall of another tube in a T-junction (#892). */
  tubeBoreHole?: boolean;
  /** Hinge: the knuckles are at most this wide in mm and their number follows; left out, the count of `hingeKnuckles` stands (#907). */
  hingeKnuckleWidth?: number;
  /** Hinge, cone style: the diameter of the cones at their root in mm; left out, the largest that fits (#907). */
  hingeConeSize?: number;
  /** Hinge: "pin" (default) or "cone": cones on every other knuckle that nest into the others, printing without bridges (#907). */
  hingeStyle?: "pin" | "pinless" | "cone" | "liftOff";
  /** Hinge: diameter of the pin in mm; the other part's bore is wider by the clearance. */
  hingePinDiameter?: number;
  /** Hinge: thickness of the two leaves in mm. */
  hingeLeafThickness?: number;
  /** Hinge: gap in mm between the moving parts - around the pin, between knuckles and before the leaves. */
  hingeClearance?: number;
  /** Hinge: no printed pin; the bore runs through every knuckle for a pin of one's own (filament, wire). */
  hingePinless?: boolean;
  /** Hinge: the second leaf folded up about the pin, in degrees; 0 lies flat, 180 is closed. */
  hingeAngle?: number;
  /** Hinge: screw holes in each leaf along the axis, 0 to 6; left out, none. */
  hingeScrewHoles?: number;
  /** Hinge: the screw holes' diameter in mm. */
  hingeScrewDiameter?: number;
  /** Hinge: from one screw hole's middle to the next along the axis in mm; left out, they share the length evenly. */
  hingeScrewSpacing?: number;
  /** Hinge: from the hole in one leaf to the hole in the other, across the axis, in mm; left out, each in the middle of its leaf. */
  hingeScrewAcross?: number;
  /** Hinge: false for straight screw holes; otherwise countersunk on the side that faces the other leaf when closed. */
  hingeScrewCountersink?: boolean;
  /** Hinge: the screw holes' top - "countersunk", "straight", "nut" (a hexagonal pocket for a nut) or "countersunkNut" (countersunk on leaf A, a nut on B); left out, hingeScrewCountersink decides. */
  hingeScrewHead?: "countersunk" | "straight" | "nut" | "countersunkNut";
  /** Hinge: a nut's width across the flats in mm for the nut's pockets; left out, from the hole's diameter. */
  hingeNutWidth?: number;
  /** Hinge: the leaves' outer corners rounded with this radius in mm. */
  hingeCornerRadius?: number;
  /** Hinge: "fingers" gives each knuckle its own finger instead of a leaf each side, the two sides' alternating like combs; left out, plates. */
  hingeLeafStyle?: "plate" | "fingers";
  /** Gridfinity: a bin or the baseplate it stands in, whose size counts grid units of 42 mm (height units of 7 mm), or a tray of any size in mm (#837). */
  gridfinityType?: GridfinityType;
  /** Gridfinity bin: the stacking lip on top of the wall; missing means on. */
  gridfinityLip?: boolean;
  /** Gridfinity bin: holes for 6 x 2 mm magnets under each foot. */
  gridfinityMagnets?: boolean;
  /** Gridfinity bin: the size counts cells of 21 mm, each with a foot, four to a baseplate's socket; missing means the 42 mm grid. */
  gridfinityHalfGrid?: boolean;
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
  /** Gridfinity bin: a finger scoop along the back wall, the floor rising along a quarter circle into it. */
  gridfinityScoopBack?: boolean;
  /** Gridfinity bin: a finger scoop along the front wall. */
  gridfinityScoopFront?: boolean;
  /** Gridfinity bin: a finger scoop along the left wall. */
  gridfinityScoopLeft?: boolean;
  /** Gridfinity bin: a finger scoop along the right wall. */
  gridfinityScoopRight?: boolean;
  /** Gridfinity bin: the finger scoops' radius in mm; missing is half the height from the floor up to the lip's support, or to the top without the lip. */
  gridfinityScoopRadius?: number;
  /** Gridfinity bin: the floor's height inside in mm, measured from the underside; missing is 5.95, and at the highest the bin is solid up to the lip's support, or to the top without the lip. */
  gridfinityFloorHeight?: number;
  /** Gridfinity bin: no wall and no stacking lip along the back above the floor; the walls beside it run out to the outline (#682). Opened only partly with gridfinityOpenings (#455). */
  gridfinityOpenBack?: boolean;
  /** Gridfinity bin: no wall and no stacking lip along the front. */
  gridfinityOpenFront?: boolean;
  /** Gridfinity bin: no wall and no stacking lip along the left. */
  gridfinityOpenLeft?: boolean;
  /** Gridfinity bin: no wall and no stacking lip along the right. */
  gridfinityOpenRight?: boolean;
  /** Gridfinity bin with the lip: a chamfer on the lip's top in mm, down the outer wall and down the slope, as the edge tool's; missing is none, sharp as the specification draws it, at most 1 (#780). */
  gridfinityLipChamfer?: number;
  /** Gridfinity bin: the wall's thickness in mm, set in from an outline that never changes; missing is 0.95, at least 0.8, at most where the walls meet, which builds the bin solid (#455). */
  gridfinityWallThickness?: number;
  /** Gridfinity baseplate: a solid border at the plate's height along the back, in mm, outside the grid and inside the box; missing is none, at most 41 (#455). */
  gridfinityPaddingBack?: number;
  /** Gridfinity baseplate: the border along the front. */
  gridfinityPaddingFront?: number;
  /** Gridfinity baseplate: the border along the left. */
  gridfinityPaddingLeft?: number;
  /** Gridfinity baseplate: the border along the right. */
  gridfinityPaddingRight?: number;
  /** Gridfinity baseplate: the radius of its four outer corners in mm; missing is the specification's 4, at least 0 (square), at most 4; the sockets keep theirs (#856). */
  gridfinityCornerRadius?: number;
  /** Gridfinity bin: the radius of its outer corners above the feet in mm; missing is the specification's 3.75, at least 0 (square), at most 3.75; the feet, the inside and the lip's slopes keep theirs (#856). */
  gridfinityBinCornerRadius?: number;
  /** Gridfinity bin: compartments across, a whole number; missing is 1, a bin without dividers (#554). */
  gridfinityCompartmentsX?: number;
  /** Gridfinity bin: compartments deep, a whole number; missing is 1. */
  gridfinityCompartmentsZ?: number;
  /** Gridfinity bin: the dividers' thickness in mm, 0.8 to 3; missing is 1.2. */
  gridfinityDividerThickness?: number;
  /** Gridfinity bin: each divider across, in mm from the inside of the left wall to its middle, left to right; missing spaces them evenly. */
  gridfinityDividerPositionsX?: number[];
  /** Gridfinity bin: each divider deep, in mm from the inside of the back wall to its middle, back to front; missing spaces them evenly. */
  gridfinityDividerPositionsZ?: number[];
  /** Gridfinity bin with dividers: the compartments' labels, one for each compartment that has one. */
  gridfinityCompartmentLabels?: GridfinityCompartmentLabel[];
  /** Gridfinity bin: how far each side switched open is opened (#455), one entry a side; missing is the whole side. */
  gridfinityOpenings?: GridfinityOpening[];
  /** Gridfinity bin: the corners of its partly open sides' notches, seen from outside the wall, rounded or chamfered; missing is rounded (#455). */
  gridfinityOpeningCorner?: GridfinityLabelCorner;
  /** Gridfinity bin: the size of that rounding or chamfer in mm; missing, 0 or under 0.5 leaves them square. */
  gridfinityOpeningCornerSize?: number;
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
  /** Transition: straight pieces of a full circle in the mesh, 96 if missing (#755). */
  loftSegments?: number;
  /** Capsule: the small end's diameter as a share of the large one, 1 or missing for equal ends (#206). */
  slotEndRatio?: number;
  /** Torus: how thick the tube is seen from above, as a share of the outer size; the height only squashes it (#981). */
  torusTubeRatio?: number;
  /** Transition: degrees the top end tilts about the x axis and about the z axis (#205). */
  loftTiltX?: number;
  loftTiltZ?: number;
  /** Counterbore/countersink: diameter of the shaft below the head in mm (double countersink: the shaft between the two cones). */
  screwHoleShaft?: number;
  /** Counterbore: depth of the head pocket in mm. */
  screwHoleHeadDepth?: number;
  /** Countersink and double countersink: opening angle of the cone in degrees. */
  screwHoleAngle?: number;
  /** Port opening: rounded corners, or the lower ones cut off as on an HDMI or DisplayPort socket. */
  portProfile?: PortProfile;
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
   * The letters stacked top to bottom (#981), each centred on one upright line, instead of side by side. Curved text
   * runs them as a column along the circle at its left side (its right side with textInward), the letters upright.
   */
  textVertical?: boolean;
  /**
   * Text only (#594): the space between the letters, in per cent of the letter size on top of the typeface's own
   * advance - 0 or left out as the font has it, above it wider, below it (down to -50) tighter. Straight and curved text.
   */
  textSpacing?: number;
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
   * A key ring tab of its own (#598), made by a name tag's or icon tag's "Free": its properties
   * panel offers to fix it to the nearest tag in one click, where it was put.
   */
  keyringTab?: boolean;
  /**
   * A QR code (#553): the text and the choices it was made with, so the properties panel can make
   * it again. On the code body itself, or on the plate group or bundle that holds it.
   */
  qrCode?: QrCodeSettings;
  /**
   * Set on a body made by wrapping around a cylinder (#106): its box is
   * centred on the cylinder's axis, and aligning, snapping and centring use
   * that box rather than the arc the mesh actually covers.
   */
  cylinderWrap?: { diameter: number; inward?: boolean };
  /**
   * Set on a body made by a surface texture (grooves, knurling, honeycomb, bumps): the
   * settings it was made with. The body is a mesh with the relief; undo takes it back.
   */
  surfaceTexture?: import("@/lib/surfaceTexture").SurfaceTextureSettings;
  /**
   * A helper for another body's surface texture: where this convex body reaches into it, the
   * texture stays away ("exclude") or goes only there ("only"). It counts when that body gets its
   * texture, also while this one is hidden.
   */
  surfaceTextureMask?: import("@/lib/surfaceTexture").SurfaceTextureMaskMode;
  /** The gold filling the cracks of this textured body (see surfaceTextureShape.ts): it goes when the texture is made anew or taken off. */
  surfaceFillOf?: string;
  /** Only for "vase": the vase tool's settings; the frame gives its height and widest diameter. */
  vase?: import("@/lib/vase/vase-geometry.mjs").VaseSettings;
  /** An accessory laid out for a vase (its id): laying them out again replaces it. */
  vasePartOf?: string;
  importedMesh?: {
    positions: number[];
    normals?: number[];
    baseWidth: number;
    baseDepth: number;
    baseHeight: number;
    triangleCount: number;
    // Only on the sketch's own copy of a body on a workplane set on a face: how many triangles of `positions` belong to
    // each visible part in turn (one count for a single body); the sketch shows each part as seen from the plane (#778). Never saved.
    partTriangleCounts?: number[];
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
  /**
   * A reference image (#680): a thin box with a picture on top, laid on the plate or a face to line
   * parts up on. A guide, never exported, cut, grouped or printed; the picture is a project asset in the .lyl file.
   */
  imagePlate?: {
    dataUrl: string;
    mimeType: string;
    pixelWidth: number;
    pixelHeight: number;
    /** How opaque the picture is drawn, 0.1 to 1 (#680); left out, solid, as old picture plates were. */
    opacity?: number;
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
  sketchPose?: SketchPose;
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
  groupOperation?: "group" | "intersection" | "hull" | "bundle" | "loft";
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

export type QrErrorCorrection = "L" | "M" | "Q" | "H";
/** What is built: the code alone, a plate with the code raised on it, or a plate with the code engraved. */
export type QrStyle = "code" | "raised" | "engraved";
/** What a QR body keeps so it can be made again from the inspector (#553). */
export type QrCodeSettings = {
  text: string;
  errorCorrection: QrErrorCorrection;
  /** Four modules of empty margin round the code - on a plate, the plate's rim. */
  quietZone: boolean;
  style: QrStyle;
  /** The code's height (raised, or alone) or the engraving's depth, in mm. */
  codeHeight: number;
  /** The plate's thickness, in mm, for a plate. */
  plateThickness: number;
};
