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
  | "star"
  | "heart"
  | "crescent"
  | "gear"
  | "honeycomb"
  | "thread"
  | "spring"
  | "ring"
  | "wedge"
  | "polygon"
  | "icosahedron"
  | "ruler"
  | "mesh";

export type ShapeAsset = {
  id: string;
  name: string;
  src: string;
  kind: ShapeKind;
  color: string;
  hole?: boolean;
};

export type ProjectAssetSourceFormat = "stl" | "obj" | "svg" | "step";

export type ProjectAsset = {
  id: string;
  name: string;
  mediaType: string;
  sourceFormat: ProjectAssetSourceFormat;
  bytes: Uint8Array;
  byteLength: number;
  sha256: string;
};

export type GridSize = "Off" | "0.1 mm" | "0.25 mm" | "0.5 mm" | "1.0 mm" | "2.0 mm" | "5.0 mm" | "Brick";
export type MeasurementAccuracy = 1 | 2 | 3;
export type HistoryRetentionLimit = "unlimited" | number;

export type ShapeCustomization = {
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
  threadRole?: ThreadRole;
  threadHead?: ThreadHead;
  threadHand?: ThreadHand;
  threadProfile?: ThreadProfile;
  threadDiameter?: number;
  threadPitch?: number;
  threadClearance?: number;
  threadQuality?: number;
  threadHeadHeight?: number;
  threadChamfer?: number;
  threadHeadChamfer?: number;
  springTurns?: number;
  springWire?: number;
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
  text?: string;
  font?: string;
};

export type ShapeCustomizationMap = Partial<Record<ShapeKind, ShapeCustomization>>;

export type WorkplaneWorkspaceSettings = {
  width: number;
  depth: number;
  sizePreset: string;
  gridBlockSize: number;
  gridBlockPreset: string;
  gridColor: string;
  background: string;
  showShadows: boolean;
  showGrid: boolean;
  cruiseShapes: boolean;
  selectBeforeMove: boolean;
  zoomSpeed: number;
  units: string;
  scale: string;
  accuracy: MeasurementAccuracy;
  historyLimit: HistoryRetentionLimit;
  shapeCustomizations: ShapeCustomizationMap;
};

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
};

export type SketchProfile = {
  points: SketchPoint[];
  segments: SketchSegment[];
  images?: SketchImage[];
};

export type SketchOperation = "extrude" | "revolve";

export type GearType = "spur" | "helical" | "bevel";

/** Was aus dem Gewinde wird: Stange, Schraube, Mutter oder das Loch dafuer. */
export type ThreadRole = "rod" | "screw" | "nut" | "bore";
export type ThreadHead = "cylinder" | "countersunk" | "hex";
export type ThreadHand = "right" | "left";
/** Die Zahnform: scharfe ISO-Spitze, flache Trapezflanke oder rundes Profil. */
export type ThreadProfile = "v" | "trapezoidal" | "round";

export type SketchRevolveSettings = {
  startAngle: number;
  sweepAngle: number;
  sides: number;
  quality: number;
};

export type EdgeTreatmentFeature = {
  kind: "fillet" | "chamfer";
  amount: number;
  edgeCount: number;
  chamferAngle?: number;
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
  kind: "box" | "cylinder" | "cone";
  width: number;
  depth: number;
  height: number;
  radius?: number;
  baseRadius?: number;
  topRadius?: number;
  frame: CadBrepFrame;
};

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
  threadRole?: ThreadRole;
  threadHead?: ThreadHead;
  threadHand?: ThreadHand;
  threadProfile?: ThreadProfile;
  threadDiameter?: number;
  threadPitch?: number;
  threadClearance?: number;
  threadQuality?: number;
  threadHeadHeight?: number;
  threadChamfer?: number;
  threadHeadChamfer?: number;
  springTurns?: number;
  springWire?: number;
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
  cornerFillet?: number;
  topBottomFillet?: number;
  roundedBoxQuality?: number;
  text?: string;
  font?: string;
  importedMesh?: {
    positions: number[];
    normals?: number[];
    baseWidth: number;
    baseDepth: number;
    baseHeight: number;
    triangleCount: number;
    sourceFormat: "stl" | "obj" | "svg" | "json" | "step";
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
  groupOperation?: "group" | "intersection";
  extrudeSweepPath?: { x: number; y: number; z: number }[];
  extrudeSweepRadius?: number;
  locked?: boolean;
  hidden?: boolean;
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
};
