// Die Werkzeugbeschreibungen der MCP-Bruecke, getrennt vom Server, damit ein
// Test sie lesen kann, ohne den Server zu starten - er haengt sich beim Laden
// an die Standardeingabe und liefe im Test einfach weiter.

export const editorTargetSchema = {
  type: "object",
  properties: {
    editorNumber: { type: "number", description: "The 5-digit Layerling editor number from layerling_list_editors." },
    editorId: { type: "string", description: "Optional internal editor id. Prefer editorNumber for human-directed use." },
    timeoutMs: { type: "number", description: "Command timeout in milliseconds. Defaults to 15000." },
  },
};

/**
 * Die Arten, die sich anlegen lassen. Der Editor holt sie aus dem Formenkatalog;
 * diese Liste ist nur die Ansage nach aussen, und ein Test schlaegt fehl, sobald
 * beide auseinanderlaufen. `cube` ist ein Quader mit gleichen Kanten, `sketch`
 * eine ausgezogene Skizze - beide stehen in keinem Katalog.
 */
export const creatableShapeKinds = [
  "box", "roundedBox", "cube", "cylinder", "slot", "ellipse", "polygon", "sphere", "cone", "pyramid", "wedge",
  "roundRoof", "halfSphere", "torus", "loft", "tube", "bentTube", "star", "heart", "crescent", "text", "thread", "spring", "gridfinity", "gear",
  "hinge", "knurl", "dovetail", "counterbore", "countersink", "doubleCountersink", "teardrop", "ruler", "sketch",
];

/**
 * Die Zahnformen und die Normgroessen der Gewinde. Der Editor fuehrt sie in
 * `threadProfiles.ts` und `threadGeometry.ts`; ein Test schlaegt fehl, sobald
 * diese Ansage davon abweicht.
 */
export const threadProfiles = ["v", "trapezoidal", "round", "whitworth", "custom"];

export const threadSizeNames = [
  "M2", "M2.5", "M3", "M4", "M5", "M6", "M8", "M10", "M12",
  "#4-40 UNC", "#6-32 UNC", "#8-32 UNC", "#10-24 UNC", "1/4\"-20 UNC", "5/16\"-18 UNC", "3/8\"-16 UNC", "7/16\"-14 UNC", "1/2\"-13 UNC", "5/8\"-11 UNC", "3/4\"-10 UNC", "1\"-8 UNC",
  "#4-48 UNF", "#6-40 UNF", "#8-36 UNF", "#10-32 UNF", "1/4\"-28 UNF", "5/16\"-24 UNF", "3/8\"-24 UNF", "7/16\"-20 UNF", "1/2\"-20 UNF", "5/8\"-18 UNF", "3/4\"-16 UNF", "1\"-12 UNF",
  "G1/16", "G1/8", "G1/4", "G3/8", "G1/2", "G5/8", "G3/4", "G7/8", "G1", "G1 1/8", "G1 1/4", "G1 1/2", "G1 3/4",
  "G2", "G2 1/4", "G2 1/2", "G2 3/4", "G3", "G3 1/2", "G4",
];

/**
 * Eine Normgroesse beim Namen - kein Wert, der am Objekt steht, sondern eine
 * Abkuerzung fuer Durchmesser, Steigung und Profil. Deshalb steht sie nicht in
 * `shapeSettingSchema`, sondern daneben in beiden Werkzeugen; die Auskunft
 * meldet sie in `settings.threadSize`, wenn ein Gewinde eine Normgroesse hat.
 */
export const threadSizeSetting = {
  threadSize: {
    type: "string",
    enum: threadSizeNames,
    description: "Thread only: a standard size by name, as the editor's size menu lists it. Sets threadDiameter and threadPitch; if those come along (as in a settings block read back), they must match the size. A G size is a Whitworth pipe thread (BSPP, ISO 228-1, for fittings, water, gas, hydraulics and pneumatics): G1/2 is 20.955 mm with 14 threads per inch. It switches a v profile to whitworth, and an M, UNC or UNF size switches whitworth back to v; trapezoidal and round stay, and a threadProfile in the same call wins.",
  },
};

/**
 * Was eine Form ausser Lage und Mass ausmacht. Anlegen und Aendern nehmen
 * dieselben Felder - sonst entstuende wieder etwas, das sich hinterher nicht
 * mehr anfassen laesst. Jeder Wert wird im Editor gegen dieselben Grenzen
 * geprueft wie in den Einstellungen; was daneben liegt, wird eingefangen.
 */
export const shapeSettingSchema = {
  sides: { type: "number", description: "Cylinder, slot, cone, tube, polygon, pyramid, round roof, teardrop, counterbore, countersink, doubleCountersink, torus (around the ring). Left out on a round body, the side count follows the diameter." },
  steps: { type: "number", description: "Sphere and half sphere: how finely the surface is divided. Torus: how finely the tube is divided; left out, it follows the size." },
  bevel: { type: "number", description: "Tube: wall thickness. Text: rounding of the lettering." },
  segments: { type: "number", description: "Text only: steps in the rounding." },
  topRadius: { type: "number", description: "Cone only: radius of the flat top. 0 runs to a point." },
  baseRadius: { type: "number", description: "Cone only: radius at the base." },
  topWidth: { type: "number", description: "Pyramid only: width of the flat top. 0 runs to a point." },
  topDepth: { type: "number", description: "Pyramid only: depth of the flat top. 0 runs to a point." },
  taperTopWidth: { type: "number", description: "Taper, on every shape except gear, thread, spring, gridfinity, knurl, hinge, pyramid, bentTube, teardrop, counterbore, countersink and ruler: width of the top face. Setting one value of a face pins the other." },
  taperTopDepth: { type: "number", description: "Taper, on every shape except gear, thread, spring, gridfinity, knurl, hinge, pyramid, bentTube, teardrop, counterbore, countersink and ruler: depth of the top face." },
  taperBottomWidth: { type: "number", description: "Taper, on every shape except gear, thread, spring, gridfinity, knurl, hinge, pyramid, bentTube, teardrop, counterbore, countersink and ruler: width of the bottom face." },
  taperBottomDepth: { type: "number", description: "Taper, on every shape except gear, thread, spring, gridfinity, knurl, hinge, pyramid, bentTube, teardrop, counterbore, countersink and ruler: depth of the bottom face." },
  extrudeTwist: { type: "number", description: "On every shape except gear, thread, spring, gridfinity, knurl, hinge, pyramid, bentTube, teardrop, counterbore, countersink and ruler: rotates the top face relative to the base, in degrees, for a twisted extrusion." },
  extrudeTopOffsetX: { type: "number", description: "On every shape except gear, thread, spring, gridfinity, knurl, hinge, pyramid, bentTube, teardrop, counterbore, countersink and ruler: shifts the top face along the shape's own X axis, in mm, for a leaning extrusion." },
  extrudeTopOffsetZ: { type: "number", description: "On every shape except gear, thread, spring, gridfinity, knurl, hinge, pyramid, bentTube, teardrop, counterbore, countersink and ruler: shifts the top face along the shape's own Z axis, in mm, for a leaning extrusion." },
  teeth: { type: "number", description: "Gear only." },
  gearProfile: { type: "string", enum: ["involute", "round", "simple"], description: "Gear only: involute teeth that mesh (new gears), round teeth made of arcs (like Tinkercad's Useful gear: forgiving on small printed gears, a smooth grip on knobs), or the plain straight teeth older designs have. An involute gear's width and depth are its outside diameter, module x (teeth + 2): for module 1.5 and 20 teeth give width and depth 33. Round teeth stand lower, so a round gear's outside diameter is module x (teeth + 1.2): module 1.5 and 20 teeth give 31.8. Two gears with the same module and tooth shape mesh at a centre distance of module x (teeth1 + teeth2) / 2; gearBacklash applies to both, gearPressureAngle only to involute teeth." },
  gearPressureAngle: { type: "number", description: "Involute gear only: pressure angle in degrees, 14.5 to 30 (default 20)." },
  gearBacklash: { type: "number", description: "Involute gear only: play of a meshing pair in mm, half taken off each gear (default 0.2, 0 for an exact gear)." },
  toothSize: { type: "number", description: "Gear with simple teeth only." },
  toothWidth: { type: "number", description: "Gear with simple teeth only." },
  centerHoleSize: { type: "number", description: "Gear only: bore through the middle." },
  gearType: { type: "string", enum: ["spur", "helical", "herringbone", "bevel", "internal", "rack"], description: "Gear only. \"herringbone\" is two helical halves turning opposite ways, like an arrow: it centres itself on its shaft and has no axial thrust, which is why it suits 3D printing; it takes the same helixAngle and helixQuality as a helical gear, and two meshing herringbone gears have angles of opposite sign. \"internal\" is a ring gear with its teeth pointing in, the outer wheel of a planetary set: width and depth are its outside diameter, module x (teeth + 2.5) + 2 x gearRim (round teeth: module x (teeth + 1.7)), and a pinion of the same module meshes inside it at a centre distance of module x (teeth - pinion teeth) / 2; ring teeth = sun teeth + 2 x planet teeth. \"rack\" is a bar along x with its teeth towards +z: width = teeth x pi x module (so racks of one module line up end to end), depth the bar's thickness, free above the teeth plus 0.5; a gear of the same module rolls on it with its centre teeth x module / 2 in front of the pitch line, which lies a module behind the tooth tips. Both take involute or round teeth, never simple ones, and no centerHoleSize." },
  gearRim: { type: "number", description: "Ring gear only: the rim outside the teeth, in mm (default 3)." },
  helixAngle: { type: "number", description: "Helical and herringbone gear only. With involute teeth the true helix angle on the pitch circle: two helical gears mesh with the same module and angle, one positive and one negative; with simple teeth the turn from foot to top." },
  helixQuality: { type: "number", description: "Helical gear only." },
  threadRole: { type: "string", enum: ["rod", "screw", "nut", "bore"], description: "Thread only. A bore becomes a cutter that threads the part it is grouped with." },
  threadHead: { type: "string", enum: ["cylinder", "countersunk", "hex"], description: "Thread only, and only for a screw." },
  threadHand: { type: "string", enum: ["right", "left"], description: "Thread only." },
  threadProfile: { type: "string", enum: threadProfiles, description: "Thread only: tooth shape. \"v\" is the sharp 60-degree ISO default (M, UNC, UNF); trapezoidal and round both leave a flat crest and root, which prints more reliably; \"whitworth\" is the 55-degree profile with rounded crest and root of the G pipe threads (ISO 228-1); \"custom\" is a symmetric trapezoid whose depth and flank angle you set with threadDepth and threadFlankAngle." },
  threadDiameter: { type: "number", description: "Thread only, in millimetres: 6 is an M6, 20.955 a G1/2 pipe thread. Width and depth follow it, they are not set separately. For a standard size, threadSize is simpler." },
  threadPitch: { type: "number", description: "Thread only, in millimetres per turn: an M6 runs 1.0 as standard." },
  threadClearance: { type: "number", description: "Thread only, for nuts and tapped holes: how much room the thread leaves so a printed pair still turns." },
  threadAxialClearance: { type: "number", description: "Thread only, for nuts and tapped holes: extra play along the axis (mm, 0 to 1 but at most a fifth of the pitch, default 0): each tooth of the part gets this much thinner while the diameter stays. Add it to a small threadClearance for a thread that turns freely without rattling sideways." },
  threadDepth: { type: "number", description: "Thread only, with threadProfile \"custom\": the thread depth in millimetres, outer minus core radius, so the core diameter is threadDiameter minus twice this. Default is the V thread's depth at the pitch (0.54 of it); at least a tenth of the pitch, at most 40 % of the diameter, and not so deep that the two flanks would take more than nine tenths of the pitch at the flank angle." },
  threadFlankAngle: { type: "number", description: "Thread only, with threadProfile \"custom\": the angle between the two flanks of a tooth in degrees, 10 to 90, default 60 (the V thread; 30 is a trapezoid thread). At 90 or less no flank is flatter than 45 degrees to the horizontal, so the thread prints without supports." },
  threadBoltClearance: { type: "number", description: "Thread only, for rods and screws: how much thinner in diameter (mm, 0 to 1, default 0) the bolt is built, so a printed bolt fits a metal nut. Try 0.2 to 0.3." },
  threadQuality: { type: "number", description: "Thread only: columns around the circumference." },
  threadChamfer: { type: "number", description: "Thread only: the break at the ends that leads the first turn in. On a nut, tapped hole and rod it is the top end (and the bottom end too, unless threadChamferBottom is given); on a screw it is the tip. On a nut or tapped hole the 45 degree cone reaches down to the thread core." },
  threadChamferBottom: { type: "number", description: "Thread only, for a rod, nut or tapped hole: the chamfer at the bottom end when it should differ from the top one. Left out, the bottom end has threadChamfer. A screw has no chamfer there." },
  threadHeadHeight: { type: "number", description: "Thread only, and only for a screw: height of the head. Left out it follows the standard for the size." },
  threadHeadChamfer: { type: "number", description: "Thread only, and only for a screw with a cylinder or hex head: the chamfer that breaks the sharp rim of the head. 0 leaves it sharp." },
  springTurns: { type: "number", description: "Spring only." },
  springWire: { type: "number", description: "Spring only: thickness of the wire." },
  springHand: { type: "string", enum: ["right", "left"], description: "Spring only: winding direction; right-hand (default) like a usual compression spring, or left-hand." },
  springQuality: { type: "number", description: "Spring only." },
  starPoints: { type: "number", description: "Star only: number of points or rays (3 to 32)." },
  starInnerSize: { type: "number", description: "Star only: diameter of the inner valleys in mm." },
  starOuterFillet: { type: "number", description: "Star only: fillet radius at outer tips in mm." },
  starInnerFillet: { type: "number", description: "Star only: fillet radius at inner valleys in mm." },
  starQuality: { type: "number", description: "Star only: quality / segment count for fillet rounding (4 to 48)." },
  heartTipFillet: { type: "number", description: "Heart only: fillet radius at the bottom tip in mm (0 to 20)." },
  heartQuality: { type: "number", description: "Heart only: quality / segment count for lobe and tip rounding (16 to 64)." },
  crescentThickness: { type: "number", description: "Crescent only: thickness at the crescent center in mm." },
  crescentTipFillet: { type: "number", description: "Crescent only: fillet radius at horn tips in mm (0 to 8)." },
  crescentQuality: { type: "number", description: "Crescent only: quality / segment count for arc and tip rounding (16 to 64)." },
  knurlPattern: { type: "string", enum: ["straight", "diamond", "round"], description: "Knurl only: \"straight\" grooves along the axis (default; an exact CAD body, so the edge tool works on it), \"diamond\", two slanted rows crossing into small diamonds (a mesh), or \"round\", straight grooves and ridges as a smooth wave of arcs, a pleasant grip for knobs (an exact body; its depth stays below 0.45 of the pitch round the grip). A knurl is a round grip: width is the diameter (depth follows), height the length." },
  knurlCount: { type: "number", description: "Knurl only: number of grooves around the grip, 6 up to what fits at a 0.8 mm pitch around the diameter, at most 180 (default 30)." },
  knurlDepth: { type: "number", description: "Knurl only: depth of a groove in mm, 0.1 up to a third of the radius (default 0.6)." },
  knurlAngle: { type: "number", description: "Diamond knurl only: angle of the grooves to the axis in degrees, 10 to 60 (default 30)." },
  knurlChamfer: { type: "number", description: "Knurl only: 45-degree chamfer on both ends in mm (default 0.5, 0 for none), at most a quarter of the diameter and just under half the height. Straight knurling stays an exact body with it." },
  hingeKnuckles: { type: "number", description: "Hinge only: how many knuckles share the axis, odd from 3 to 15 (default 5) so the part with the pin holds both ends. A hinge is a print-in-place hinge lying open flat: width is its length along the axis (x), depth both leaves together (z), height the knuckle diameter; it prints in one piece and turns afterwards." },
  hingePinDiameter: { type: "number", description: "Hinge only: diameter of the pin in mm (default 3); the other part's bore is wider by the clearance." },
  hingeLeafThickness: { type: "number", description: "Hinge only: thickness of the two leaves in mm (default 2), at most the knuckle radius less the bore radius so a leaf stays below the bore." },
  hingeClearance: { type: "number", description: "Hinge only: gap in mm between the moving parts (0.1 to 1, default 0.4) - around the pin, between the knuckles and in front of the leaves. Go up for a printer that tends to fuse, down for a tighter hinge." },
  hingePinless: { type: "boolean", description: "Hinge only: leave the printed pin out. The bore (pin diameter plus the clearance) then runs through every knuckle, the ends included, for a pin of your own such as a piece of filament or wire (default false)." },
  gridfinityType: { type: "string", enum: ["bin", "baseplate"], description: "Gridfinity only: a bin, or the baseplate bins stand in, to the published Gridfinity measures so they fit parts printed from other designs. The size is whole grid units of 42 mm: a bin is 42 x units - 0.5 across and deep (41.5, 83.5, 125.5 ... up to 6 units, 251.5), 7 mm per height unit, up to 20 units, plus 4.4 for the stacking lip (a 3-unit bin is 25.4 tall); a baseplate is 42 x units across and deep and 5 tall. Any width, depth or height is rounded to the nearest whole units. When a baseplate becomes a bin, give its height too, or it gets one height unit." },
  gridfinityLip: { type: "boolean", description: "Gridfinity bin only: the stacking lip on top of the wall that the next bin's feet sit in (default true). Switching it keeps the height units and adds or takes off the 4.4 mm." },
  gridfinityMagnets: { type: "boolean", description: "Gridfinity bin only: holes for 6 x 2 mm magnets under each foot, 6.5 mm wide and 2.4 deep, 13 mm from the middle of the unit both ways (default false). A baseplate has none." },
  gridfinityLabelBack: { type: "boolean", description: "Gridfinity bin only, 3 height units or more: a label shelf along the inside of the back wall (default false). The shelf is flat on top, with a 1.2 mm strip down at the front and an underside rising at 36 degrees from the wall; its top is 0.85 mm below 7 mm per height unit (20.15 mm for 3 units), so the feet of a bin stacked on the lip stay 0.5 mm clear. Shelves on several walls join at the corners; each wall has its own width, length and offset (gridfinityLabelBackWidth, gridfinityLabelBackLength, gridfinityLabelBackOffset and the same for Front, Left and Right), and the corner settings apply to all of them." },
  gridfinityLabelFront: { type: "boolean", description: "Gridfinity bin only: a label shelf along the front wall (default false); see gridfinityLabelBack." },
  gridfinityLabelLeft: { type: "boolean", description: "Gridfinity bin only: a label shelf along the left wall (default false); see gridfinityLabelBack." },
  gridfinityLabelRight: { type: "boolean", description: "Gridfinity bin only: a label shelf along the right wall (default false); see gridfinityLabelBack." },
  gridfinityLabelBackWidth: { type: "number", description: "Gridfinity bin only: how far the back wall's label shelf reaches out from it in mm (default 14, at least 4). The underside ends above the floor (at most about 17 in a bin of 3 height units), and across the bin the shelves and their corner pieces leave at least 2 mm open." },
  gridfinityLabelBackLength: { type: "number", description: "Gridfinity bin only: the back wall's label shelf length in mm; 0 (the default), or a length that leaves at most 1 mm at both ends (1.8 mm with the stacking lip), runs it from wall to wall, into the round corners. At least 10; an end that comes that close to a wall, or stops on that wall's shelf, runs into it." },
  gridfinityLabelBackOffset: { type: "number", description: "Gridfinity bin only: moves the back wall's label shelf of a set length along the wall, in mm from the middle (default 0); positive is to the right (+x). It stays on its wall." },
  gridfinityLabelFrontWidth: { type: "number", description: "Gridfinity bin only: as gridfinityLabelBackWidth, for the front wall's label shelf." },
  gridfinityLabelFrontLength: { type: "number", description: "Gridfinity bin only: as gridfinityLabelBackLength, for the front wall's label shelf." },
  gridfinityLabelFrontOffset: { type: "number", description: "Gridfinity bin only: moves the front wall's label shelf of a set length along the wall, in mm from the middle (default 0); positive is to the right (+x). It stays on its wall." },
  gridfinityLabelLeftWidth: { type: "number", description: "Gridfinity bin only: as gridfinityLabelBackWidth, for the left wall's label shelf." },
  gridfinityLabelLeftLength: { type: "number", description: "Gridfinity bin only: as gridfinityLabelBackLength, for the left wall's label shelf." },
  gridfinityLabelLeftOffset: { type: "number", description: "Gridfinity bin only: moves the left wall's label shelf of a set length along the wall, in mm from the middle (default 0); positive is towards the front (+z). It stays on its wall." },
  gridfinityLabelRightWidth: { type: "number", description: "Gridfinity bin only: as gridfinityLabelBackWidth, for the right wall's label shelf." },
  gridfinityLabelRightLength: { type: "number", description: "Gridfinity bin only: as gridfinityLabelBackLength, for the right wall's label shelf." },
  gridfinityLabelRightOffset: { type: "number", description: "Gridfinity bin only: moves the right wall's label shelf of a set length along the wall, in mm from the middle (default 0); positive is towards the front (+z). It stays on its wall." },
  gridfinityLabelCorner: { type: "string", enum: ["round", "chamfer"], description: "Gridfinity bin only: where a label shelf meets a wall or another shelf, the corner rounded (default) or chamfered. With round, a shelf of a set length also has the front corners of its free ends rounded by the same size (at most half its width and half its length); with chamfer they stay square." },
  gridfinityLabelCornerSize: { type: "number", description: "Gridfinity bin only: the size of that rounding or chamfer in mm, 0 to 10 (default 2); 0 leaves the corners sharp." },
  dovetailNeckWidth: { type: "number", description: "Dovetail only: width of the narrow neck in mm; the shape's width is the wide end, its depth the length of the tail. Must be narrower than the width." },
  screwHoleShaft: { type: "number", description: "Counterbore, countersink and doubleCountersink: diameter of the shaft below the head (on the doubleCountersink, between the two cones) in mm. The shape's width is the head diameter, its height the whole length; the head end of a counterbore and a countersink is on top." },
  screwHoleHeadDepth: { type: "number", description: "Counterbore only: depth of the cylindrical head pocket in mm." },
  screwHoleAngle: { type: "number", description: "Countersink and doubleCountersink: opening angle of the cone in degrees (30 to 150, default 90 for a countersunk screw). A doubleCountersink is chamfered on both faces; if it is too short for two cones they meet in the middle at this angle." },
  loftBottomOutline: { type: "string", enum: ["round", "rectangle", "polygon"], description: "Loft (transition) only: the outline at the bottom - round (a circle, or an ellipse when width and length differ), rectangle (corners rounded by loftBottomCorner) or polygon (loftBottomSides corners). A loft joins its bottom outline to its top outline with a straight-ruled wall: a hose adapter, a square fan onto a round duct, a stand. Its frame is what both ends need together; width and depth stretch both ends alike." },
  loftTopOutline: { type: "string", enum: ["round", "rectangle", "polygon"], description: "Loft only: the outline at the top, as loftBottomOutline." },
  loftBottomWidth: { type: "number", description: "Loft only: width (x) of the bottom outline in mm." },
  loftBottomDepth: { type: "number", description: "Loft only: length (z) of the bottom outline in mm." },
  loftTopWidth: { type: "number", description: "Loft only: width (x) of the top outline in mm." },
  loftTopDepth: { type: "number", description: "Loft only: length (z) of the top outline in mm." },
  loftBottomCorner: { type: "number", description: "Loft only: corner radius of a rectangular bottom in mm (0 for sharp corners)." },
  loftTopCorner: { type: "number", description: "Loft only: corner radius of a rectangular top in mm." },
  loftBottomSides: { type: "number", description: "Loft only: number of corners of a polygonal bottom, 3 to 24." },
  loftTopSides: { type: "number", description: "Loft only: number of corners of a polygonal top, 3 to 24." },
  loftOffsetX: { type: "number", description: "Loft only: how far the top's middle sits from the bottom's along the width (x), in mm; the bottom stays in place when it changes." },
  loftOffsetZ: { type: "number", description: "Loft only: how far the top's middle sits from the bottom's along the length (z), in mm." },
  loftWall: { type: "number", description: "Loft only: wall thickness in mm. 0 (default) is a solid body; more makes a tube open at both ends, the opening inset by the wall at the bottom and at the top." },
  loftSmooth: { type: "number", description: "Loft only: 0 to 1 (default 0), how much of an S-curve the sides take between the two ends instead of a straight line: the sides leave both ends straight up and change their size in between, like a hose adapter that flares smoothly from a narrow to a wide pipe. It works with a wall, a twist, a tilt and an offset." },
  loftTwist: { type: "number", description: "Loft only: degrees the section turns from bottom to top about the vertical, evenly on the way up, -360 to 360 (default 0). The sides then wind round." },
  loftTiltX: { type: "number", description: "Loft only: degrees the top end tilts about the x axis, -45 to 45: positive raises its front (+z) edge. The sections tilt evenly on the way up; the highest point stays at the height, and a tilt too steep for the height is reduced." },
  loftTiltZ: { type: "number", description: "Loft only: degrees the top end tilts about the z axis, -45 to 45: positive raises its right (+x) side. Same as loftTiltX otherwise." },
  slotEndRatio: { type: "number", description: "Capsule (slot) only: the small end's diameter as a share of the large one, 0.1 to 1 (default 1, two equal ends). The large end sits at the start of the long axis, the small one at its end, the sides run as tangents to both - a belt guard. The large diameter is the capsule's short side; the centre distance is the long side less both radii." },
  dovetailClearance: { type: "number", description: "Dovetail only: gap in mm (0 to 2, default 0.2) added on every side while the dovetail is a hole - a copy of the tail set to hole cuts a socket the tail fits into." },
  cornerFillet: { type: "number", description: "Rounded box only: fillet radius of vertical corners in mm." },
  topBottomFillet: { type: "number", description: "Rounded box only: fillet radius of top and bottom edges in mm." },
  roundedBoxQuality: { type: "number", description: "Rounded box only: quality / segment count for fillet rounding (1 to 32; 1 gives chamfered corners)." },
  bentTubeProfile: { type: "string", enum: ["round", "square", "hexagon", "octagon"], description: "Bent tube only: outer cross-section." },
  bentTubeInnerProfile: { type: "string", enum: ["none", "round", "square", "hexagon", "octagon"], description: "Bent tube only: inner cross-section; \"none\" makes a solid tube." },
  bentTubeSize: { type: "number", description: "Bent tube only: outer diameter of a round tube, width across flats of a polygonal one, in mm (1 to 500)." },
  bentTubeWall: { type: "number", description: "Bent tube only: wall thickness in mm. With different inner and outer profiles it is the thinnest point of the wall." },
  bentTubeQuality: { type: "number", description: "Bent tube only: sides of a round profile and fineness of the bends (12 to 96)." },
  bentTubeSegments: {
    type: "array",
    maxItems: 12,
    items: {
      type: "object",
      properties: {
        length: { type: "number", description: "Straight run before the bend, in mm (0 to 1000)." },
        bendAngle: { type: "number", description: "Bend after the straight run, in degrees (-180 to 180); 0 means no bend." },
        bendRadius: { type: "number", description: "Centre-line radius of the bend in mm; at least half the outer size (corner distance for polygons) plus 0.1." },
        roll: { type: "number", description: "Turns the plane of this bend about the running direction, relative to the previous bend, in degrees." },
      },
      required: ["length", "bendAngle", "bendRadius", "roll"],
    },
    description: "Bent tube only: the chain of segments, each a straight run followed by an arc bend. The tube starts along +X; roll 0 bends within the workplane, roll 90 bends upward. layerling_read_scene reports this list as JSON text, which is accepted here as well.",
  },
  text: { type: "string", description: "Text only: the lettering itself." },
  font: { type: "string", description: "Text only: a built-in font (Multilanguage, Sans, Serif, Script, Monospace, Rounded, Stencil), or a font of one's own by its id (custom:...) or its name, as layerling_list_fonts gives them." },
  textCurved: { type: "boolean", description: "Text only: true bends the line along a circle. Width and depth then follow radius and letter size." },
  textRadius: { type: "number", description: "Curved text only: radius of the circle the baseline follows, in mm (5 to 500)." },
  textSize: { type: "number", description: "Curved text only: letter size in mm. Defaults to the size the straight text had." },
  textInward: { type: "boolean", description: "Curved text only: true runs the line along the bottom of the circle, letters pointing at the centre." },
  textFlipped: { type: "boolean", description: "Curved text only: true keeps the line where it is on the circle but turns the letters upside down, to be read from the other side." },
};

export const tools = [
  {
    name: "layerling_list_editors",
    description: "List Layerling editor tabs that are currently open and heartbeating, including editorNumber and projectName.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "layerling_open_editor",
    description: "Open a new Layerling editor tab in the user's default browser and wait (up to 45 s) until it has connected; returns it with its editorNumber. Only for a Layerling on this computer - for a copy on a NAS or server the browser is somewhere else and the user opens the editor. The other tools open an editor themselves when none is open (unless LAYERLING_MCP_OPEN_EDITOR=0 is set for the MCP server), so call this only to get another tab, for example for a second design.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "layerling_read_scene",
    description: "Read the current scene, selection, workspace units, and exact object dimensions from an open Layerling editor.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        includeRawShapes: { type: "boolean", description: "Include raw WorkplaneShape JSON. Can be large for imported meshes." },
      },
    },
  },
  {
    name: "layerling_list_objects",
    description: "List all current objects available in the editor with exact dimensions, position, rotation, and object ids.",
    inputSchema: editorTargetSchema,
  },
  {
    name: "layerling_select_objects",
    description: "Select objects by id in the Layerling editor.",
    inputSchema: {
      ...editorTargetSchema,
      required: ["ids"],
      properties: {
        ...editorTargetSchema.properties,
        ids: { type: "array", items: { type: "string" } },
      },
    },
  },
  {
    name: "layerling_delete_objects",
    description: "Delete objects by id, or delete the current selection when ids are omitted.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        ids: { type: "array", items: { type: "string" } },
        id: { type: "string" },
      },
    },
  },
  {
    name: "layerling_create_shape",
    description: "Create any of Layerling's shapes: boxes, cylinders, slots, polygons, spheres, cones, pyramids, wedges, roofs, tori, tubes, stars, hearts, crescents, print-in-place hinges, Gridfinity bins and baseplates, knurled grips, raised text, threads (rod, screw, nut, tapped hole), springs, gears, or a simple extruded sketch. Width, depth and height default to what the editor uses for that shape; everything a shape has beyond its size is optional and falls back to the same defaults as a shape placed by hand. With a workplane set on a face (layerling_set_workplane), the shape stands on that face and x and z count on it (0, 0 is where the workplane sits) - unless elevation or a rotation is given, which mean the base plate.",
    inputSchema: {
      ...editorTargetSchema,
      required: ["kind"],
      properties: {
        ...editorTargetSchema.properties,
        kind: { type: "string", enum: creatableShapeKinds },
        name: { type: "string" },
        color: { type: "string" },
        x: { type: "number" },
        z: { type: "number" },
        elevation: { type: "number" },
        width: { type: "number" },
        depth: { type: "number" },
        height: { type: "number", description: "For a screw this is head plus thread; set threadHeadHeight if the head should differ from the standard." },
        size: { type: "number" },
        rotation: { type: "number" },
        rotationX: { type: "number" },
        rotationZ: { type: "number" },
        stroke: {
          type: "object",
          description: "For kind sketch and kind text: build the outline as a frame of this width instead of the filled area, as the editor's fill modes do. align says where the wall lies against the outline (center, inside or outside), or grow keeps the area and widens it by the width all round (a base layer under a text or logo for a multicolour print); join how corners are filled (miter, round or bevel), cap the ends of an open line (flat, square or round). On a text the box grows with an outside, centred or grow stroke; the letters keep their size.",
          properties: {
            width: { type: "number" },
            align: { type: "string", enum: ["center", "inside", "outside", "grow"] },
            join: { type: "string", enum: ["miter", "round", "bevel"] },
            cap: { type: "string", enum: ["flat", "square", "round"] },
          },
          required: ["width"],
        },
        silhouette: { type: "boolean", description: "For kind sketch and kind text: leave out every outline inside another - holes, and islands in them; on a text the counters of O, A and e - so only the outermost outlines count, as Tinkercad's Silhouette." },
        ...shapeSettingSchema,
        ...threadSizeSetting,
      },
    },
  },
  {
    name: "layerling_import_file",
    description: "Import a file the way the editor's import window does: STL, OBJ, 3MF, STEP, SVG or a ZIP holding them. A coloured OBJ - vertex colours as layerling writes them, or materials with their .mtl (pass it as mtl, or inside the ZIP, as Tinkercad delivers it) - comes in as one body per colour, each in its place; so does a coloured 3MF (its own colours, or the filament of each part in a Bambu Studio, OrcaSlicer or PrusaSlicer project), and a 3MF with several objects comes in as one body per object. Slicer modifiers, negative volumes and support blockers are left out. Give the content as text (OBJ, SVG, ASCII STL, STEP) or as base64 (binary STL, 3MF, ZIP). Returns the imported bodies with id, name, colour, size and position. An SVG comes in as an extruded sketch body, reading from above as in the drawing; set its fill (stroke outside or inside, silhouette) with layerling_update_object.",
    inputSchema: {
      ...editorTargetSchema,
      required: ["fileName"],
      properties: {
        ...editorTargetSchema.properties,
        fileName: { type: "string", description: "File name with its extension, which decides the format, e.g. keyring.obj or obj.zip." },
        text: { type: "string", description: "The file content as text. Give text or base64, not both." },
        base64: { type: "string", description: "The file content as base64, for binary files." },
        mtl: { type: "string", description: "The .mtl material file of an OBJ, as text, for its colours." },
        svgWidth: { type: "number", description: "SVG and pictures (PNG, JPG): bring the drawing in at this width in millimetres, scaled from its own size, as the width field of the import window does. Left out, it comes in at its own size." },
        keepPagePosition: { type: "boolean", description: "SVG only: keep the drawing's place on its page (its viewBox) instead of centring it on itself, so that several files exported from one page - the layers of one document - line up when imported one after the other. Default false; a drawing that states no page is centred anyway." },
      },
    },
  },
  {
    name: "layerling_add_font",
    description: "Add a font of one's own for the text shape, as the editor's \"Your own fonts\" window does: a TrueType (.ttf), OpenType (.otf) or WOFF (.woff) file as base64. WOFF2 and font collections (.ttc) are refused. The font is kept in this browser, and a design keeps only the outlines of the letters its texts use. Returns its id (\"custom:...\") and name; pass either as `font` to layerling_create_shape or layerling_update_object. With `useOnSelection` true it goes onto the selected texts at once. Installed fonts of the computer can only be picked by hand in the editor (Chrome and Edge).",
    inputSchema: {
      ...editorTargetSchema,
      required: ["fileName", "base64"],
      properties: {
        ...editorTargetSchema.properties,
        fileName: { type: "string", description: "The font file's name, e.g. MyFont-Bold.ttf - its name is the fallback when the font names none." },
        base64: { type: "string", description: "The font file as base64." },
        useOnSelection: { type: "boolean", description: "Put the font on the selected texts straight away." },
      },
    },
  },
  {
    name: "layerling_list_fonts",
    description: "List the fonts a text can use: the built-in ones by name, and the fonts of one's own with their id, name, whether this browser keeps the whole font (`stored`) or only the letters an open design brought along.",
    inputSchema: { ...editorTargetSchema },
  },
  {
    name: "layerling_import_mesh",
    description: "Import a triangle mesh into Layerling from raw position and optional normal arrays.",
    inputSchema: {
      ...editorTargetSchema,
      required: ["positions"],
      properties: {
        ...editorTargetSchema.properties,
        name: { type: "string" },
        color: { type: "string" },
        x: { type: "number" },
        z: { type: "number" },
        elevation: { type: "number" },
        width: { type: "number" },
        depth: { type: "number" },
        height: { type: "number" },
        positions: { type: "array", items: { type: "number" } },
        normals: { type: "array", items: { type: "number" } },
      },
    },
  },
  {
    name: "layerling_update_object",
    description: "Update one object: exact dimensions, position, color, name, hole state, see-through display, rotations, locked and hidden state, and everything the shape has beyond its size - the side count of a cylinder, the diameter of a thread, the turns of a spring, the lettering of a text. Changing a thread's diameter or pitch moves width and depth with it.",
    inputSchema: {
      ...editorTargetSchema,
      required: ["id"],
      properties: {
        ...editorTargetSchema.properties,
        id: { type: "string" },
        name: { type: "string" },
        color: { type: "string" },
        hole: { type: "boolean" },
        makeEllipse: { type: "boolean", description: "Cylinder only: make it an ellipse - the same body, but width and depth can then differ (a cylinder always stays round). Not for a cylinder with an edge treatment or a wall, or a turned, imported or grouped one. Pass width and depth in the same call to set them." },
        transparent: { type: "boolean" },
        multicolor: { type: "boolean", description: "Groups only: show every part in its own colour (Tinkercad's Multicolor) instead of the group colour." },
        rotationPivot: {
          anyOf: [
            {
              type: "object",
              properties: { x: { type: "number" }, z: { type: "number" }, elevation: { type: "number" } },
              required: ["x", "z", "elevation"],
            },
            { type: "null" },
          ],
          description: "The point this body turns about, in workplane coordinates like x, z and elevation. It stays with the body: it moves, turns and scales with it, and the rotate handle and R key turn the body about it. null removes it.",
        },
        locked: { type: "boolean" },
        hidden: { type: "boolean" },
        stroke: {
          anyOf: [
            {
              type: "object",
              properties: {
                width: { type: "number" },
                align: { type: "string", enum: ["center", "inside", "outside", "grow"] },
                join: { type: "string", enum: ["miter", "round", "bevel"] },
                cap: { type: "string", enum: ["flat", "square", "round"] },
              },
            },
            { type: "null" },
          ],
          description: "Extruded sketch bodies (an imported SVG among them) and texts: how the body is filled. An object builds the outline as a frame - align outside is Tinkercad's outer line, inside its inner line, center on the line - or with align grow keeps the area and widens it by width all round; width in mm; join miter (sharp), round or bevel; values left out keep the current ones. null makes it a filled area again. A sketch body is built again from its sketch, where it stands; a text keeps its letters and its box grows by the stroke's reach (outside and grow by width, center by half).",
        },
        silhouette: { type: "boolean", description: "Extruded sketch bodies and texts: true leaves out every outline inside another - holes, and islands in them; on a text the counters of its letters - false brings them back. With an outside stroke this makes a cookie cutter from one SVG; with grow, a base layer under a text." },
        stretch: { type: "boolean", description: "Straight text only: true stretches the letters to fill the whole box in both directions, so a capital can be made lower or narrower as in Tinkercad; false (the default) fits them into the box with their proportions kept, centred. Set the box with width and depth." },
        letterEdge: {
          anyOf: [
            { type: "null" },
            {
              type: "object",
              properties: {
                kind: { type: "string", enum: ["round", "chamfer"] },
                size: { type: "number", description: "How wide and high the edge is, in mm (0.05 to 5, at most the text's height)." },
              },
              required: ["kind", "size"],
            },
          ],
          description: "Text only: the top edge of the letters rounded or chamfered, as the top layer of a name tag is finished. null takes it off. Built from the outline stepped inwards, so it works for every font and word; the edge tool takes such a text as a mesh.",
        },
        x: { type: "number" },
        z: { type: "number" },
        elevation: { type: "number" },
        width: { type: "number" },
        depth: { type: "number" },
        height: { type: "number" },
        size: { type: "number" },
        rotation: { type: "number" },
        rotationX: { type: "number" },
        rotationZ: { type: "number" },
        ...shapeSettingSchema,
        ...threadSizeSetting,
      },
    },
  },
  {
    name: "layerling_align_objects",
    description: "Align two or more Layerling objects using the same alignment logic as the editor Alignment button. On the plate the axes are the world's; with a workplane set on a face (layerling_set_workplane) the objects are measured and moved along that plane's axes instead - x along the face, y out of it, z across - so a part turned 45° lines up with its own edges.",
    inputSchema: {
      ...editorTargetSchema,
      required: ["axis", "target"],
      properties: {
        ...editorTargetSchema.properties,
        ids: { type: "array", items: { type: "string" }, description: "Object ids to align. If omitted, uses the current selection." },
        anchorId: { type: "string", description: "Optional object id to keep fixed as the alignment reference." },
        axis: { type: "string", enum: ["x", "y", "z"], description: "x=left/right, z=front/back, y=bottom/top - or along the set workplane's x, z and normal." },
        target: { type: "string", enum: ["min", "center", "max"], description: "Which side/center to align." },
      },
    },
  },
  {
    name: "layerling_scale_objects",
    description: "Scale objects by a percentage, the same in every direction - the editor's Scale by percent tool. 120 makes them a fifth larger, 50 half the size. mode together (default) scales them around their common centre, so the layout grows with them; each scales every object where it stands, so the gaps stay. The bottom stays where it is. Locked objects are left as they are. One undo step.",
    inputSchema: {
      ...editorTargetSchema,
      required: ["percent"],
      properties: {
        ...editorTargetSchema.properties,
        ids: { type: "array", items: { type: "string" }, description: "Object ids to scale. If omitted, uses the current selection." },
        percent: { type: "number", minimum: 1, maximum: 1000, description: "The new size in percent of the current one." },
        mode: { type: "string", enum: ["together", "each"], description: "together (default): around the common centre. each: every object in place." },
      },
    },
  },
  {
    name: "layerling_lay_flat",
    description: "Turn objects so one of their faces rests on the workplane - the editor's Lay flat on face tool. Name a side of the object's own box (face) or give the outward normal of the face in world coordinates (normal); either snaps to the nearest real face. Several objects turn together about their common centre and keep their spacing. One undo step.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        ids: { type: "array", items: { type: "string" }, description: "Object ids to lay flat. If omitted, uses the current selection." },
        face: { type: "string", enum: ["bottom", "top", "left", "right", "front", "back"], description: "Side of the object's own box that should end up on the plate, taken in the object's current turn." },
        normal: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3, description: "Outward normal [x, y, z] of the face to put down, in world coordinates (y is up). Wins over face." },
        referenceId: { type: "string", description: "With several ids: whose face is meant. Defaults to the first id." },
      },
    },
  },
  {
    name: "layerling_place_on_face",
    description: "Set objects down on a face of another object, as the editor's C key (Tinkercad's Cruise) does: their underside - the bottom of the first object as it stands - turns onto the face, sloped faces included, lined up with it the way a new shape dropped there would be (keeping its own turn about its up axis), and the middle of that underside lands on the point. Name the target object and its face as a side of its own box (snaps to the nearest real face; the point is then the middle of the target brought straight onto that face), or give point and normal yourself. Several objects move together and keep their spacing. One undo step.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        ids: { type: "array", items: { type: "string" }, description: "Object ids to set down. If omitted, uses the current selection." },
        targetId: { type: "string", description: "The object whose face they go on." },
        targetFace: { type: "string", enum: ["bottom", "top", "left", "right", "front", "back"], description: "Side of the target's own box, taken in its current turn (default top)." },
        point: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3, description: "Where the underside's middle lands, [x, y, z] in world coordinates (y up). With normal, wins over targetId." },
        normal: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3, description: "Outward normal [x, y, z] of the face at point, in world coordinates." },
      },
    },
  },
  {
    name: "layerling_sweep_sketch",
    description: "Pull a cross-section along a path as one exact body, like the editor's Sweep sketch (#400): a cable channel that turns a corner, a conduit, a guard round a belt, a ring round a hexagon. The path is a list of points in the sketch plane, [x, z] in mm on the workplane (z runs towards the front), joined by straight lines; closed joins the last point to the first and makes a ring. The section is a rectangle (width across the path, height up) or a circle (width is the diameter), solid or hollow with a wall thickness. It is drawn at the first point and seen looking along the path, so it starts there. The body stands on the plane with the lowest point of the section, a corner of the path is a mitre, and the result is an exact body: fillet, chamfer and the STEP export work on it. Returns the new object.",
    inputSchema: {
      ...editorTargetSchema,
      required: ["path", "section"],
      properties: {
        ...editorTargetSchema.properties,
        path: { type: "array", items: { anyOf: [{ type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 }, { type: "object", properties: { x: { type: "number" }, z: { type: "number" } } }] }, minItems: 2, description: "The points of the path, [x, z] or { x, z }, in mm." },
        closed: { type: "boolean", description: "Join the last point to the first: a ring." },
        section: {
          type: "object",
          description: "The cross-section.",
          properties: {
            kind: { type: "string", enum: ["rectangle", "circle"] },
            width: { type: "number", description: "Across the path in mm; the diameter of a circle." },
            height: { type: "number", description: "Up on the body in mm (rectangle only, default the width)." },
            wall: { type: "number", description: "A wall thickness in mm makes the section hollow." },
          },
          required: ["kind", "width"],
        },
        name: { type: "string" },
        color: { type: "string" },
      },
    },
  },
  {
    name: "layerling_perforate_face",
    description: "Cut a pattern of holes into a flat face of a solid body - the editor's Hole pattern tool (vents, speaker grilles, baskets). The holes are ordinary hole shapes standing on the face and grouped with the body (nothing is baked: ungroup frees them again). Name the body and a side of its own box (targetFace, snapped to the nearest real face; the whole flat face around its middle is used) or give point and normal on the face yourself. Only holes that lie wholly inside the face, at least margin away from its edge, are made. form: round (size = diameter), square (size = side), rectangle and slot (size = width, height = height), hexagon (size = diameter across the corners). spacing is centre to centre; staggered shifts every second row by half a spacing and packs the rows so each hole has neighbours one spacing away. Without depth the holes go through the whole body. A curved face is refused. One undo step.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        targetId: { type: "string", description: "The body to perforate. If omitted, the one selected object (id also works)." },
        targetFace: { type: "string", enum: ["bottom", "top", "left", "right", "front", "back"], description: "Side of the body's own box, taken in its current turn (default top)." },
        point: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3, description: "A point on the face, [x, y, z] in world coordinates (y up). With normal, wins over targetFace." },
        normal: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3, description: "Outward normal [x, y, z] of the face at point, in world coordinates." },
        form: { type: "string", enum: ["round", "square", "rectangle", "hexagon", "slot"], description: "Shape of the holes (default hexagon)." },
        size: { type: "number", minimum: 0.5, maximum: 200, description: "Diameter, side or width of a hole in millimetres (default 6)." },
        height: { type: "number", minimum: 0.5, maximum: 200, description: "Height of a rectangle or slot in millimetres (default: size)." },
        spacing: { type: "number", minimum: 0.5, maximum: 400, description: "Centre to centre in millimetres (default 9); raised to just over the hole size if smaller." },
        arrangement: { type: "string", enum: ["grid", "staggered"], description: "grid (rows and columns) or staggered (default)." },
        margin: { type: "number", minimum: 0, maximum: 100, description: "Clear distance between the holes and the face's edge in millimetres (default 4)." },
        depth: { type: "number", minimum: 0.1, description: "Depth of the holes in millimetres. Omit to go through the whole body." },
      },
    },
  },
  {
    name: "layerling_push_face",
    description: "Push a flat face of a solid body out or cut a pocket into it - the editor's Face tool. out adds a body standing on the face, in cuts a pocket reaching depth into it; inset keeps the new outline that far inside the face's edge (0 takes the whole face, so a wall gets thicker) and openings in the face grow by it; radius rounds every corner of the outline, the inner ones too, and closes a gap narrower than twice the radius. The new part is an ordinary sketch body grouped with the body (nothing is baked: Edit group and Edit sketch reach it). On the top or the bottom of a plain sketch body (one area, not grouped, mirrored, tapered, twisted or leaning, without a stroke, key ring or edge treatment) it keeps that body's own outline, exact where the CAD kernel can set it in, and keeps the inset when resized; on any other face, and on every face of an imported mesh, it follows the face's triangles. A pocket goes no deeper than the body behind the face. Name the body and a side of its own box (targetFace, snapped to the nearest real face) or give point and normal on the face yourself. A curved face is refused. One undo step.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        targetId: { type: "string", description: "The body whose face to push. If omitted, the one selected object (id also works)." },
        targetFace: { type: "string", enum: ["bottom", "top", "left", "right", "front", "back"], description: "Side of the body's own box, taken in its current turn (default top)." },
        point: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3, description: "A point on the face, [x, y, z] in world coordinates (y up). With normal, wins over targetFace." },
        normal: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3, description: "Outward normal [x, y, z] of the face at point, in world coordinates." },
        direction: { type: "string", enum: ["out", "in"], description: "out adds material on the face (default), in cuts a pocket into it." },
        inset: { type: "number", minimum: 0, maximum: 50, description: "How far the outline stays inside the face's edge, in millimetres (default 0)." },
        radius: { type: "number", minimum: 0, maximum: 30, description: "Corner radius of the outline in millimetres (default 0)." },
        depth: { type: "number", minimum: 0.2, maximum: 100, description: "How far the new part stands out, or the pocket reaches in, in millimetres (default 2)." },
      },
    },
  },
  {
    name: "layerling_mate_faces",
    description: "Move one object so a face of it meets a face of another object - the editor's Align faces tool. The moving object is turned the shortest way until the faces are parallel (not at all if they already are), then slid along the target face's normal only, so it keeps its place sideways. mode against puts the faces face to face (touching, back to back), flush lays them in one plane side by side. gap leaves that much room, measured out of the target face. Faces are named as sides of each object's own box and snap to the nearest real face. One undo step.",
    inputSchema: {
      ...editorTargetSchema,
      required: ["id", "face", "targetId", "targetFace"],
      properties: {
        ...editorTargetSchema.properties,
        id: { type: "string", description: "The object that moves." },
        face: { type: "string", enum: ["bottom", "top", "left", "right", "front", "back"], description: "Its face that should meet the other, as a side of its own box." },
        targetId: { type: "string", description: "The object that stays where it is." },
        targetFace: { type: "string", enum: ["bottom", "top", "left", "right", "front", "back"], description: "The face of the target to meet." },
        mode: { type: "string", enum: ["against", "flush"], description: "against (default): face to face. flush: in one plane, side by side." },
        gap: { type: "number", description: "Room between the planes in millimetres, measured out of the target face. Default 0." },
      },
    },
  },
  {
    name: "layerling_open_group",
    description: "Open a group to change its parts one by one, like 'Edit group' in the editor: the parts lie loose on the workplane (their ids come back) and can be changed with every other tool. Close it again with layerling_close_group. While a group is open, a group among its parts can be opened too, one level deeper each time; any other group is refused until the open one is closed. layerling_read_scene reports the innermost open group as openGroup and every level, outermost first, as openGroups.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        id: { type: "string", description: "The group to open: any group when none is open, otherwise one of the innermost open group's parts. If omitted, the one selected object." },
      },
    },
  },
  {
    name: "layerling_close_group",
    description: "Close the innermost open group: rebuild it from its parts (the editor's Done) as the same group, keeping its id, name, colour and solid/hole state; or pass cancel: true to put the untouched group back. The level around it, if any, stays open. Fillets and chamfers applied to the whole group are lost on rebuild.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        cancel: { type: "boolean", description: "true puts the group back unchanged instead of rebuilding it." },
      },
    },
  },
  {
    name: "layerling_group_objects",
    description: "Group objects by id using Layerling's normal grouping/boolean pipeline.",
    inputSchema: {
      ...editorTargetSchema,
      required: ["ids"],
      properties: {
        ...editorTargetSchema.properties,
        ids: { type: "array", items: { type: "string" } },
      },
    },
  },
  {
    name: "layerling_intersect_objects",
    description: "Keep only what the given objects have in common, like the editor's Intersection button. Pass two or more solids (each counts as it looks, a group with its holes) or solids and holes (all solids against all holes). The result replaces the operands and can be opened like a group; no overlap leaves nothing and reports empty.",
    inputSchema: {
      ...editorTargetSchema,
      required: ["ids"],
      properties: {
        ...editorTargetSchema.properties,
        ids: { type: "array", items: { type: "string" } },
      },
    },
  },
  {
    name: "layerling_ungroup_objects",
    description: "Ungroup one or more grouped objects by id and preserve their edited geometry.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        ids: { type: "array", items: { type: "string" } },
        id: { type: "string" },
      },
    },
  },
  {
    name: "layerling_boolean_cut",
    description: "Cut solids with hole objects. Provide solidIds and holeIds; the result replaces the operands.",
    inputSchema: {
      ...editorTargetSchema,
      required: ["solidIds", "holeIds"],
      properties: {
        ...editorTargetSchema.properties,
        solidIds: { type: "array", items: { type: "string" } },
        holeIds: { type: "array", items: { type: "string" } },
      },
    },
  },
  {
    name: "layerling_separate_parts",
    description: "Separate one disconnected multi-part object into independent objects.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        id: { type: "string" },
      },
    },
  },
  {
    name: "layerling_wrap_around_cylinder",
    description: "Wrap one body that lies flat on the plate around a cylinder about the vertical, as the editor's \"Wrap around a cylinder\" does - an imported SVG, text or any other body. Seen from above, left to right runs around the cylinder, the back edge becomes the top, and the thickness stands out of the wall (inward: true puts it into the wall, for an engraving with a hole). The result is one mesh body whose middle is the cylinder's axis: centre it on the cylinder with layerling_align_objects (x and z centre) and it sits on that wall. One undo step brings the flat body back; to try another diameter, undo first. Fails when the body is longer than the circumference. Returns the new object.",
    inputSchema: {
      ...editorTargetSchema,
      required: ["diameter"],
      properties: {
        ...editorTargetSchema.properties,
        id: { type: "string", description: "The body to wrap; defaults to the one selected body." },
        diameter: { type: "number", description: "Diameter of the cylinder wall in mm, for example the outside of a cup." },
        inward: { type: "boolean", description: "Put the thickness into the wall instead of out of it. Default false." },
      },
    },
  },
  {
    name: "layerling_simplify_mesh",
    description: "Reduce the triangle count of one imported mesh (decimation), as the editor's \"Simplify mesh\" does - for a dense STL, OBJ, 3MF or STEP import, or the mesh a cut, merge or wrap left behind. Use it when a mesh is too complex to cut (the cut reports the triangle count and the limit) or makes the editor slow. Pass either keepPercent or targetTriangles. Fine detail goes first; the body keeps its size and position, and the simplifier stops early rather than close holes or merge walls, so the count reached can stay above a very low target. The result is one plain mesh body: a group simplified this way can no longer be ungrouped or opened. One undo step brings the old mesh back. Shapes from the catalogue have no mesh to simplify; lower their sides or quality instead. Returns the object with trianglesBefore and trianglesAfter.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        id: { type: "string", description: "The mesh to simplify; defaults to the one selected body." },
        keepPercent: { type: "number", description: "Share of the triangles to keep, above 0 and below 100. 50 halves the count." },
        targetTriangles: { type: "number", description: "Number of triangles to aim for, below the current count (importedTriangles in layerling_list_objects)." },
      },
    },
  },
  {
    name: "layerling_save_custom_shape",
    description: "Keep bodies as a custom shape, as the shape library's \"Save selection\" does, to insert them into any design later. Several bodies become one shape and come back together. The shape is kept centred, standing on the plate. Where the shared server store is on, it goes to the server's \"Custom shapes\" folder unless location says \"browser\"; otherwise it stays in this browser. Returns the new shape's id, name and location.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        ids: { type: "array", items: { type: "string" }, description: "The bodies to keep; defaults to the selection." },
        name: { type: "string", description: "Name shown in the library; defaults to the body's name. On the server it is also the file name, so it must not be taken yet." },
        location: { type: "string", enum: ["server", "browser"], description: "Where to keep it. Default: the server when there is one, else the browser." },
      },
    },
  },
  {
    name: "layerling_list_custom_shapes",
    description: "List the custom shapes: those on the server (ids start with \"server:\") and those in this browser, with name, location and size. serverAvailable says whether this installation has the shared store.",
    inputSchema: editorTargetSchema,
  },
  {
    name: "layerling_insert_custom_shape",
    description: "Insert a custom shape into the open design, as a click on its tile does. Without x/z it lands at the workplane's origin; with them, the middle of its footprint goes there and it stands on the plate. Returns the inserted objects, which are selected.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        id: { type: "string", description: "Id from layerling_list_custom_shapes, or the shape's name." },
        name: { type: "string", description: "The shape's name, instead of the id." },
        x: { type: "number", description: "Where the middle goes, in mm." },
        z: { type: "number", description: "Where the middle goes, in mm." },
      },
    },
  },
  {
    name: "layerling_delete_custom_shape",
    description: "Remove a custom shape from the browser or the server. Bodies already inserted into designs stay. Cannot be undone.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        id: { type: "string", description: "Id from layerling_list_custom_shapes, or the shape's name." },
        name: { type: "string", description: "The shape's name, instead of the id." },
      },
    },
  },
  {
    name: "layerling_split_objects",
    description: "Cut solids or holes in two with a plane, like the editor's Split tool. Each object the plane crosses is replaced by two closed mesh bodies - two holes for a hole - and a hollowed body keeps its cavity; named with the side they lie on, e.g. \"Box (Z+)\" and \"Box (Z-)\"; objects the plane misses stay as they are. Axes as in a slicer: `axis` x cuts across left-right, y across front-back, z horizontally (default). `position` is where the plane crosses, in millimetres, in the numbers layerling_read_scene reports: position.x for x, position.z for y, elevation for z; it defaults to the middle and must lie inside the objects. `rotationX`, `rotationY` and `rotationZ` tilt the plane in degrees (-180 to 180, default 0) for an angled cut, about the two axes it does not cut across: an x cut turns about y and z, a y cut about z and x, a z cut about x and y; the angle about the cut axis itself is refused. With both set, the plane turns about the first of the pair (y for x, z for y, x for z) and then about the other. With a tilt, `position` is measured along the tilted plane's normal. The result returns the angles used, the new objects, the ids that were split and the plane's range (`min`, `max`). One undo step; the parts lose their editable shape settings.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        ids: { type: "array", items: { type: "string" }, description: "Solids or holes to split; the current selection when omitted." },
        axis: { type: "string", enum: ["x", "y", "z"], description: "Direction the plane cuts across (z is up), default z." },
        position: { type: "number", description: "Where the plane crosses in millimetres; the middle when omitted." },
        rotationX: { type: "number", description: "Tilt about the left-right axis in degrees, -180 to 180, default 0. Not for an x cut." },
        rotationY: { type: "number", description: "Tilt about the front-back axis in degrees, -180 to 180, default 0. Not for a y cut." },
        rotationZ: { type: "number", description: "Tilt about the vertical axis in degrees, -180 to 180, default 0. Not for a z cut." },
      },
    },
  },
  {
    name: "layerling_list_edges",
    description: "List real CAD edge ids for one object so a later chamfer/fillet can target specific edges.",
    inputSchema: {
      ...editorTargetSchema,
      required: ["id"],
      properties: {
        ...editorTargetSchema.properties,
        id: { type: "string" },
        sharpAngle: { type: "number" },
      },
    },
  },
  {
    name: "layerling_list_faces",
    description: "List the faces of one object's exact body, for layerling_delete_faces: each with its id, its kind (plane, cylinder, cone, sphere, torus, bspline, ...), its area in square millimetres, its middle and, for a flat face, its outward normal, in world coordinates (y up). Only for exact bodies, STEP imports and layerling's shapes; whatever layerling keeps as a mesh (an imported STL, OBJ or 3MF, a split, wrapped or simplified body, a very detailed shape such as a long text) has no exact faces.",
    inputSchema: {
      ...editorTargetSchema,
      required: ["id"],
      properties: {
        ...editorTargetSchema.properties,
        id: { type: "string" },
      },
    },
  },
  {
    name: "layerling_delete_faces",
    description: "Delete faces of an exact body, as the editor's Delete face tool does: the faces around them grow until they close the gap, so a fillet, a hole, a boss or a step is gone and the body stays exact (fillet, chamfer and STEP export still work on it). Give every face of the feature, with ids from layerling_list_faces - the four faces of a box's rounded top edges, the wall of a hole, the side and top of a boss. When the faces around them cannot close the gap, nothing changes and the answer says so. Deleting only the floor of a pocket makes it a hole straight through. One undo step; undone like an edge treatment.",
    inputSchema: {
      ...editorTargetSchema,
      required: ["id", "faceIds"],
      properties: {
        ...editorTargetSchema.properties,
        id: { type: "string" },
        faceIds: { type: "array", items: { type: "integer" }, description: "Face ids from layerling_list_faces." },
      },
    },
  },
  {
    name: "layerling_hollow_object",
    description: "Hollow a solid into walls of equal thickness, like a box, cup or case. The walls grow inward, so the outside keeps its size. `openings` chooses which flat sides stay open, measured against the world's axes: a list of any of top, bottom, front (+z), back (-z), left (-x) and right (+x) - for example [\"front\"] for a drawer slot - or one of the names top (default), bottom, top-bottom, or none for a sealed cavity. A side asked for in a list must have a flat face at the very edge of the body on that side. `edges` sets how the inner walls meet where the body has a step or opening: round (default, radius = wall thickness) or sharp. Can be undone like an edge treatment. Resizing the body later hollows it again at the new size a moment afterwards, so the walls keep their thickness.",
    inputSchema: {
      ...editorTargetSchema,
      required: ["id", "thickness"],
      properties: {
        ...editorTargetSchema.properties,
        id: { type: "string" },
        thickness: { type: "number", description: "Wall thickness in millimetres." },
        openings: {
          anyOf: [
            { type: "string", enum: ["top", "bottom", "top-bottom", "none"] },
            { type: "array", items: { type: "string", enum: ["top", "bottom", "front", "back", "left", "right"] } },
          ],
        },
        edges: { type: "string", enum: ["round", "sharp"] },
      },
    },
  },
  {
    name: "layerling_array_objects",
    description: "Repeat objects n times in a row or around a circle - hole rows, hole grids, bolt circles, the teeth of a ring - like the editor's Pattern tool. `count` includes the originals. Coordinates are as in a slicer: X to the right, Y to the back, Z up. A row steps `spacing` millimetres along `direction` (negative runs the other way), or along several axes at once with `spacingX`, `spacingY` and `spacingZ` (a diagonal row, a staircase; give any of them and the others count as 0). A circle turns about the vertical axis through (`centerX`, `centerY`) over `angle` degrees: 360 (default) spreads the pieces evenly, a smaller angle puts the first and last piece on its ends; positive runs counter-clockwise seen from above. `rise` lifts every copy that many millimetres more than the one before (a screw, an ascending spiral) and `radiusChange` moves it that far further from the centre (negative: closer) for a flat or conical spiral. `rotateCopies` (default true) turns each copy with the circle. The copies are added as one undo step and returned with their ids; the originals stay where they are.",
    inputSchema: {
      ...editorTargetSchema,
      required: ["mode", "count"],
      properties: {
        ...editorTargetSchema.properties,
        ids: { type: "array", items: { type: "string" }, description: "Objects to repeat; the current selection when omitted." },
        mode: { type: "string", enum: ["row", "circle"] },
        count: { type: "number", description: "Pieces including the originals, 2 to 100." },
        spacing: { type: "number", description: "Row: centre-to-centre distance in millimetres." },
        direction: { type: "string", enum: ["x", "y", "z"], description: "Row: axis to step along (z is up). Used with `spacing`." },
        spacingX: { type: "number", description: "Row: step along X in millimetres per copy. With spacingY / spacingZ the row runs along several axes at once." },
        spacingY: { type: "number", description: "Row: step along Y (towards the back) in millimetres per copy." },
        spacingZ: { type: "number", description: "Row: step along Z (up) in millimetres per copy." },
        angle: { type: "number", description: "Circle: total angle in degrees, default 360." },
        centerX: { type: "number", description: "Circle: centre X in millimetres, default 0." },
        centerY: { type: "number", description: "Circle: centre Y in millimetres (towards the back), default 0." },
        rotateCopies: { type: "boolean", description: "Circle: turn the copies with the circle, default true." },
        rise: { type: "number", description: "Circle: height gained per copy in millimetres, default 0 (a screw when not 0)." },
        radiusChange: { type: "number", description: "Circle: distance from the centre gained per copy in millimetres, default 0 (a spiral when not 0; negative tightens)." },
      },
    },
  },
  {
    name: "layerling_apply_edge_treatment",
    description: "Apply chamfer or fillet to specific edge ids returned by layerling_list_edges, to \"all\" sharp edges, to the \"top\" edges (every edge along the body's highest level, such as the rim of a cookie cutter), to the \"bottom\" edges (every edge along its lowest level, such as the foot of a part), or to the \"vertical\" edges (every edge that stands straight up, such as the corners of a box), as the editor's Top edges, Bottom edges and Vertical edges buttons pick them.",
    inputSchema: {
      ...editorTargetSchema,
      required: ["id", "kind", "edgeIds", "amount"],
      properties: {
        ...editorTargetSchema.properties,
        id: { type: "string" },
        kind: { type: "string", enum: ["chamfer", "fillet"] },
        edgeIds: {
          anyOf: [
            { type: "array", items: { type: "number" } },
            { type: "string", enum: ["all", "top", "bottom", "vertical"] },
          ],
        },
        allEdges: { type: "boolean" },
        amount: { type: "number" },
        chamferAngle: { type: "number" },
        sharpAngle: { type: "number" },
        quality: { type: "string", enum: ["draft", "standard", "fine"] },
        preserveEdgeSize: { type: "boolean" },
      },
    },
  },
  {
    name: "layerling_inspect_errors",
    description: "Inspect the editor notice, last MCP error and active edge modifier error, plus the last messages and errors of this session (recentNotices, recentErrors, with times) - the same lists the editor's bug report carries.",
    inputSchema: editorTargetSchema,
  },
  {
    name: "layerling_bundle_objects",
    description: "Bundle objects like Tinkercad's Ctrl+B: they move, turn and scale together as one object, but nothing is merged - every part keeps its colour and its solid or hole setting, holes cut nothing, and in an STL, 3MF or OBJ export every part is a body of its own (so a two-colour logo on a plate stays two coloured parts). A bundle is not one body: the edge tools and hollowing refuse it. layerling_ungroup_objects takes it apart again, layerling_open_group opens it for editing. Use layerling_group_objects instead when holes should cut or the parts should become one body.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        ids: { type: "array", items: { type: "string" }, description: "At least two objects to bundle." },
      },
      required: ["ids"],
    },
  },
  {
    name: "layerling_layer_text",
    description: "Layered text for a multicolour print (#215): one text as a stack of bodies - the letters on top, under them the same letters a little wider in another colour, at the bottom a plate wider still, usually as a silhouette without the holes in the letters. Every layer is an ordinary text with a 'Wider' fill (so each has its own colour, height and edge treatments) and the stack is a bundle flagged as layered text, whose properties panel edits words, font and layers together. Pass the id of a text (it is replaced by the stack) or of such a bundle (it is built again); layers top to bottom, each with grow (mm wider than the letters, 0 for the letters), height, color and silhouette. Left out, the layers stay as they are, or a new stack takes the classic three: white letters, a red rim 1.5 mm wider, a dark plate 3 mm wider without holes. A layer may take join (round, bevel or miter): how it goes round the corners of the letters; left out it is round, as before. keyring { side, diameter } gives the bottom layer a tab with a round end and a key ring hole on the left, right or top, cut through every layer it reaches; the tab is the hole plus a 1.75 mm wall either side wide (6.5 mm for 3 mm) and the hole's edge 2 mm beyond the bottom layer's outline, so it sticks out 6.75 mm; it follows the words and the font, true puts a 3 mm hole on the left, false takes it off, and left out it stays as it is. With names, one stack per name is made instead, laid out in rows under the first, each as its own object - a list of name tags in one go.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        id: { type: "string", description: "A text, or a layered-text bundle to build again." },
        text: { type: "string", description: "New words for every layer." },
        font: { type: "string", description: "New font for every layer: a built-in name or a font of one's own by name or id." },
        layers: {
          type: "array",
          maxItems: 6,
          description: "The layers top to bottom.",
          items: {
            type: "object",
            properties: {
              grow: { type: "number", description: "How much wider than the letters, in mm all round. 0 is the letters themselves." },
              height: { type: "number", description: "The layer's height in mm." },
              color: { type: "string", description: "Hex colour such as #d41721." },
              silhouette: { type: "boolean", description: "Without the holes in the letters - for the base plate." },
              join: { type: "string", enum: ["round", "bevel", "miter"], description: "How a wider layer goes round the corners of the letters: round (default), bevel or miter (sharp)." },
              edge: {
                type: "object",
                description: "The top edge of this layer's letters rounded or chamfered, as the card's Letter edge row does for the top layer.",
                properties: {
                  kind: { type: "string", enum: ["round", "chamfer"] },
                  size: { type: "number", description: "How wide and high the edge is, in mm (0.05 to 5)." },
                },
                required: ["kind", "size"],
              },
            },
          },
        },
        keyring: {
          description: "A key ring hole: { side, diameter } puts it on (a tab with a round end on the bottom layer, the hole through every layer it reaches), true puts a 3 mm hole on the left, false takes it off. Left out, it stays as it is. A side other than left, right or top, or a diameter outside 1 to 20 mm, is refused.",
          anyOf: [
            {
              type: "object",
              properties: {
                side: { type: "string", enum: ["left", "right", "top"], description: "Where the ear sits, seen from above (default left)." },
                diameter: { type: "number", minimum: 1, maximum: 20, description: "The hole's diameter in mm (default 3); the tab grows with it." },
              },
            },
            { type: "boolean" },
          ],
        },
        names: { type: "array", items: { type: "string" }, maxItems: 100, description: "One tag per name, laid out in rows under the first; the text of each stack is its name." },
        gap: { type: "number", description: "Space between the tags of a list in mm (default 5)." },
      },
      required: ["id"],
    },
  },
  {
    name: "layerling_layer_icon",
    description: "An SVG icon as a layered tag for a multicolour print, like the editor's Icon tag (the shape library) and its card: the icon on top, under it the same outline a little wider in another colour, at the bottom a plate without holes - one bundle of extruded sketch bodies, each with its own colour and height. Two ways in. `svg` (the text of an SVG file) makes a new icon tag standing on the middle of the plate, named after `name`; the drawing is checked as the import checks it and refused when the kernel would build it differently. `id` of an extruded sketch body (an imported SVG, say) turns that body into an icon tag, or of an icon tag builds it again with a new width or new layers; the place and the turn stay. `width` is how wide the icon on top is, seen from above, in mm (2 to 250; 30 for a new tag, the current width otherwise). `layers` are the layers top to bottom as for layerling_layer_text - grow, height, color, silhouette, join - without the letter edge; left out, a new tag gets the name tag's start layers (the icon, a 1.5 mm rim, a 3 mm plate without holes) and an existing one keeps its own. `keyring` puts a key ring hole on the tag as on a name tag (a tab with a round end on the bottom layer, the hole through every layer, beyond the icon on the side chosen). `count` (1 to 100) lays that many copies out on the middle of the plate 5 mm apart, the first being the tag itself - for small logos one prints a full plate. One undo step. The result returns the tag(s) and the layers.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        svg: { type: "string", description: "The text of an SVG file: makes a new icon tag." },
        name: { type: "string", description: "With svg: the tag's name (the file's name, without .svg)." },
        id: { type: "string", description: "An extruded sketch body, or an icon tag to build again." },
        width: { type: "number", minimum: 2, maximum: 250, description: "How wide the icon on top is, in mm." },
        layers: {
          type: "array",
          maxItems: 6,
          description: "The layers top to bottom.",
          items: {
            type: "object",
            properties: {
              grow: { type: "number", description: "How much wider than the icon, in mm all round. 0 is the icon itself." },
              height: { type: "number", description: "The layer's height in mm." },
              color: { type: "string", description: "Hex colour such as #d41721." },
              silhouette: { type: "boolean", description: "Without the holes of the icon - for the base plate." },
              join: { type: "string", enum: ["round", "bevel", "miter"], description: "How a wider layer goes round the corners of the icon: round (default), bevel or miter (sharp)." },
            },
          },
        },
        keyring: {
          description: "A key ring hole: { side, diameter } puts it on (a tab with a round end on the bottom layer, the hole through every layer, beyond the icon), true puts a 3 mm hole on the left, false takes it off. Left out, it stays as it is. A side other than left, right or top, or a diameter outside 1 to 20 mm, is refused.",
          anyOf: [
            {
              type: "object",
              properties: {
                side: { type: "string", enum: ["left", "right", "top"], description: "Where the ear sits, seen from above (default left)." },
                diameter: { type: "number", minimum: 1, maximum: 20, description: "The hole's diameter in mm (default 3); the tab grows with it." },
              },
            },
            { type: "boolean" },
          ],
        },
        count: { type: "integer", minimum: 1, maximum: 100, description: "Copies of the tag on the plate (default 1)." },
      },
    },
  },
  {
    name: "layerling_measure_section",
    description: "Measure on a cut through the design, like \"Measure\" in the editor's section view: wall thickness, a gap, a clearance. Both points snap to the outline of the cut (within snapRadius mm, default 1): first to the nearest wall, then the second one preferably square to its wall as seen from the first - give it a point near the opposite wall and it returns the true thickness. Points are in the editor's coordinates (x, z, elevation); the one along the axis is set to the plane. axis and offset work like layerling_export_section_svg and default to the section view or the middle of the design. Round outlines (a hole, a cylinder) also snap: the centre of the circle; a second point near the spot across the centre from a first one on the circle lands exactly across, so the distance is the diameter; and with the centre as the first point the second lands on the circle, so the distance is the radius. Returns the snapped points with their snap kind (perpendicular, corner, outline, center, opposite or free), distance, circle (\"diameter\", \"radius\" or null) and deltaX, deltaZ, deltaElevation. The section view itself is left as it is.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        axis: { type: "string", enum: ["x", "y", "z"], description: "Cutting axis, as in layerling_set_section_view." },
        offset: { type: "number", description: "Where the plane cuts, in mm." },
        from: { type: "object", description: "First point near a wall: { x, z, elevation }." },
        to: { type: "object", description: "Second point near the other wall: { x, z, elevation }." },
        snapRadius: { type: "number", description: "How far a point may be from the outline to snap, mm (default 1)." },
      },
      required: ["from", "to"],
    },
  },
  {
    name: "layerling_show_overhangs",
    description: "Find overhangs that would need supports, like \"Show overhangs\" in the editor's visibility menu: faces that lean towards the plate more steeply than angle (degrees from vertical; a wall is 0, a flat ceiling 90). enabled switches the red tint in the view on or off; angle (30-70, default 45) is kept in the design's settings. Faces lying on the plate do not count. Returns enabled, angle and, for each visible solid (or the given ids), overhangAreaMm2 and lowestOverhangHeight - 0 means it prints without supports at that angle. A face resting on another body still counts. Use layerling_capture_image afterwards to see where the red is.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        enabled: { type: "boolean", description: "Switch the red tint on or off. Left out it stays as it is." },
        angle: { type: "number", description: "Steepest overhang the printer manages without supports, degrees from vertical, 30-70." },
        ids: { type: "array", items: { type: "string" }, description: "Only report these objects." },
      },
    },
  },
  {
    name: "layerling_estimate_print",
    description: "Estimate the material a print needs, like the Material box in the editor's export window: volume, weight and length of 1.75 mm filament, for a solid body (the upper bound) and, in `estimate`, a rough guess with walls and infill as the export window shows it - default 2 walls and 15 % infill; the slicer's own settings decide the real number. Counts what an STL export would hold: visible solid bodies only, groups with their holes taken off, overlapping bodies counted once. Without ids it takes the selection, or the whole design when nothing is selected. Returns volumeMm3, volumeCm3, grams, filamentMeters (all for a solid body), estimate (infillPercent, walls, printedVolumeMm3, grams, filamentMeters with the infill), the material and its density, solids (bodies counted) and unionFailed (overlaps that could not be joined and so count twice).",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        ids: { type: "array", items: { type: "string" }, description: "Objects to weigh. Left out: the selection, or the whole design." },
        material: { type: "string", enum: ["pla", "petg", "abs", "asa", "tpu", "pa"], description: "Filament for the weight, default pla (1.24 g/cm3); pa is nylon." },
        infillPercent: { type: "number", minimum: 0, maximum: 100, description: "Infill for `estimate`, in percent. Default 15." },
        walls: { type: "integer", minimum: 1, maximum: 6, description: "Number of walls (lines) for `estimate`. Default 2." },
      },
    },
  },
  {
    name: "layerling_add_reference_points",
    description: "Mark reference points - bare marks in space that shapes snap to when they are dragged, like pencil marks and layout points in a workshop. They are not part of any body, are never printed or exported, and are saved with the design. Mark the centre, the four corners or the four edge middles of objects (on their top face), or pass exact positions with `points`. Points already marked are not added twice. Returns the new points with their ids; shapes can then be placed on them with layerling_update_object.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        ids: { type: "array", items: { type: "string" }, description: "Objects to mark. Left out: the selection." },
        at: { type: "string", enum: ["center", "corners", "midpoints"], description: "Where on the objects' top face (their axis-parallel box, several objects as one): the centre, the four corners or the four edge middles. Default center." },
        points: {
          type: "array",
          items: {
            type: "object",
            properties: {
              x: { type: "number", description: "Position along the plate's X, in mm." },
              z: { type: "number", description: "Position along the plate's depth, in mm, positive towards the front. The editor's Y counts the other way (towards the back), so Y = -z." },
              elevation: { type: "number", description: "Height in mm, default 0." },
            },
            required: ["x", "z"],
          },
          description: "Exact positions instead of marking objects.",
        },
      },
    },
  },
  {
    name: "layerling_list_reference_points",
    description: "List the reference points of the design: id, x, z and elevation in mm.",
    inputSchema: { ...editorTargetSchema, properties: { ...editorTargetSchema.properties } },
  },
  {
    name: "layerling_remove_reference_points",
    description: "Delete reference points by id, or all of them when no ids are given.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        ids: { type: "array", items: { type: "string" }, description: "Points to delete. Left out: all reference points." },
      },
    },
  },
  {
    name: "layerling_show_workplane",
    description: "Show or hide the plate with its grid, labels and any workplane set on a face, like the eye over a grid in the editor's camera bar. Only the view changes: new shapes still land on the workplane, and nothing is saved with the design. Hide it before layerling_capture_image with view \"bottom\" to see the underside, for example with layerling_show_overhangs. Call without visible to read the state. Returns visible.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        visible: { type: "boolean", description: "true shows the plate, false hides it. Left out it stays as it is." },
      },
    },
  },
  {
    name: "layerling_set_section_view",
    description: "Cut the view open along a plane to look inside: walls, cavities, threads in their nuts, parts fitting into each other. Only the view is cut; the design and every export stay whole. Call with no settings to read the current state. axis uses the editor's own coordinates, the same as an object's x, z and elevation: \"x\" cuts across left-right (offset is an x position), \"z\" across front-back (a z position), \"y\" horizontally (offset is a height above the plate, like elevation). The editor's panel names them like its position fields instead: X, Y for the depth (z here) and Z for the height (y here). Switching on, changing the axis or center: true puts the plane in the middle of the design unless offset is given. By default the part on the far side of the plane (greater x, z or height) stays visible; flipped shows the other side. Returns the settings and the plane's useful range (min, max, center). Combine with layerling_capture_image to see the cut.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        enabled: { type: "boolean", description: "Switch the section view on or off." },
        axis: { type: "string", enum: ["x", "y", "z"] },
        offset: { type: "number", description: "Position of the plane in millimetres along the axis." },
        center: { type: "boolean", description: "Move the plane to the middle of the design." },
        flipped: { type: "boolean", description: "Show the other side of the plane." },
        showPlane: { type: "boolean", description: "Draw the blue plane (false hides it, the cut stays)." },
      },
    },
  },
  {
    name: "layerling_set_history_view",
    description: "Look back at an earlier state of the project, like the editor's History view: the workplane shows that state while the real design stays untouched. Give `index` (0 is the oldest state, the last one is the current design) to open the view at that state or move it, `open: false` to close it, or no settings to read where it stands. While it is open, tools that change the design answer with an error - close it first; reading, `layerling_capture_image` (a picture of the shown state) and the section view still work. `layerling_read_scene` keeps describing the live design. Returns the state shown, how many there are and its bodies; a group lists its `parts` at every depth, whose ids `layerling_restore_from_history` takes.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        open: { type: "boolean", description: "false closes the view; true (or an index) opens it." },
        index: { type: "number", description: "The state to show, 0 = oldest. Clamped to the existing states." },
      },
    },
  },
  {
    name: "layerling_restore_from_history",
    description: "Bring objects back from an earlier state of the history into the current design, as the History view's \"Bring into design\" button does: each comes in as a copy with new ids, exactly as it was in that state and at the spot it had there, and the copies end up selected. Each copy is named after the time of that state, such as \"Box (12:32)\" (the date too for a state of an earlier day), so it is easy to tell from the current version. A part inside a group can be brought back on its own - give its id from the `parts` that `layerling_set_history_view` lists for a group; it comes out where opening the group would put it, and the group itself stays untouched. It is one step: Undo takes it back. Closes the History view if it is open. Notes and reference points attached to the objects are not brought along. Returns the new objects.",
    inputSchema: {
      ...editorTargetSchema,
      required: ["index", "ids"],
      properties: {
        ...editorTargetSchema.properties,
        index: { type: "number", description: "The state to bring the objects back from, 0 = oldest, as layerling_set_history_view numbers them." },
        ids: { type: "array", items: { type: "string" }, description: "Ids of objects in that state, at any depth inside groups." },
      },
    },
  },
  {
    name: "layerling_clear_history",
    description: "Delete every undo and redo step of the design for good, as the History view's \"Delete history\" button does: the design keeps its current state as its only one, so Undo has nothing to go back to, and a LYL file saved afterwards carries no history. It cannot be undone. Needs `confirm: true`, so it is never done by accident. Closes the History view if it is open. Returns how many steps were removed.",
    inputSchema: {
      ...editorTargetSchema,
      required: ["confirm"],
      properties: {
        ...editorTargetSchema.properties,
        confirm: { type: "boolean", description: "Must be true: every earlier state is deleted for good." },
      },
    },
  },
  {
    name: "layerling_export_section_svg",
    description: "Cut the design with a plane and return the outlines as an SVG at 1:1 in millimetres - the editor's \"Section as SVG\". Same bodies as the export: visible solids only, holes already taken off, groups combined, bodies of one colour joined; one unfilled path per body in its colour. An x cut is seen from the right, y from above, z from the front (seenFrom). axis and offset (an x position, a height or a z position, like layerling_set_section_view) default to the current section view, or the middle of the design on that axis; the section view itself is left as it is. Returns svg, loops, openLoops (should be 0), widthMm, heightMm and hiddenSkipped. Fails with a message when the plane misses every visible solid.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        axis: { type: "string", enum: ["x", "y", "z"], description: "Cutting axis. Defaults to the axis of the section view." },
        offset: { type: "number", description: "Where the plane cuts, in mm: an x position, a height above the plate or a z position. Defaults to the section view's position, or the middle of the design." },
      },
    },
  },
  {
    name: "layerling_export_drawing",
    description: "Make the editor's \"Drawing\" export: front, top and right-side views in first-angle layout on an ISO sheet at 1:1, with the overall size of each view, hidden edges and a table of the round bores that run parallel to a view axis (diameter and position from the lower-left corner of the view). Same bodies as the export: visible solids only, holes already taken off. ids limits it to those objects (loose holes still cut them); without ids it is the whole design. Returns sheet (\"ISO A3\" and so on, or \"custom\"), widthMm and heightMm of the sheet, views (id F, T or R, size, bore count), bores (id, view, diameterMm, xMm, yMm) and, by format, svg (the drawing as SVG text, the default) or pdfBase64 (the vector PDF, base64). Threads, depths, tolerances and bores at an angle are not dimensioned. Fails with a message when there is no visible solid or the design is too complex (over 100,000 triangles, 200 bores, 5,080 mm).",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        ids: { type: "array", items: { type: "string" }, description: "Objects to draw. Defaults to the whole design." },
        format: { type: "string", enum: ["svg", "pdf"], description: "svg returns the drawing as text, pdf as base64. Defaults to svg." },
      },
    },
  },
  {
    name: "layerling_export_mesh",
    description: "Make the file the editor's export window writes as STL, 3MF or OBJ, from the same bodies: visible solids only, loose holes already taken off, overlapping bodies merged into one (STL) or separated by colour (3MF and OBJ, where a group in Multicolor keeps its part colours), and the tiny loose pieces a cut leaves behind left out. ids limits it to those objects (holes still cut). The answer lists the file name, its size in bytes, the number of bodies and triangles, how many bodies were merged or failed to merge, and how many loose pieces were left out. With path the file is written to that place on this computer and the answer carries no content; without it the file comes back as base64. Neither the editor's dialogs nor a download is involved.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        format: { type: "string", enum: ["stl", "3mf", "obj"], description: "The file format. Defaults to stl." },
        ids: { type: "array", items: { type: "string" }, description: "Objects to export. Defaults to the whole design." },
        path: { type: "string", description: "Where to write the file, e.g. C:/print/part.stl. Directories are made as needed. Omit it to get the file as base64." },
      },
    },
  },
  {
    name: "layerling_save_project",
    description: "Save the whole editable design as a .lyl file, as the export window's Layerling project (.lyl) does: shapes, groups, sketches, CAD and imported assets, settings, notes and the undo history as chosen. The file is written at path on the computer where this MCP server runs, without any dialog. An existing file is only replaced with overwrite true; the file is written through a temporary one, so a failure leaves no half file. It does not change the file that Ctrl+S in the editor saves to. The answer gives the full path, the size in bytes and how many objects and history steps the file holds. In the History view it saves the state shown.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        path: { type: "string", description: "Where to write the file, e.g. C:/Projects/drawer/drawer-r01.lyl. A missing .lyl ending is added. Directories are made as needed." },
        overwrite: { type: "boolean", description: "Replace a file that is already there. Defaults to false: the call fails and leaves the file alone." },
        history: { description: "How much undo history goes into the file: a number of steps (0 for none) or \"all\". Defaults to the limit set under Workspace settings.", anyOf: [{ type: "number" }, { type: "string", enum: ["all"] }] },
      },
      required: ["path"],
    },
  },
  {
    name: "layerling_set_workplane",
    description: "Set, reset or hide the workplane. A workplane on a face of a body makes new shapes land on that face (layerling_create_shape places onto it), and rotating turns about its normal - the editor's W and a click. id with face puts it on that side of the object's own box, snapped to the real face and centred on it; a face standing up keeps the sketch's up pointing up. flip: true turns it to face inwards. reset: true puts it back on the base plate. visible: false hides a face workplane without dropping it - it still applies, only the drawing goes, which gives a clear view or picture; visible: true shows it again. Setting a new workplane shows it again by itself. Call with no settings to read the state; layerling_read_scene reports it as workplane.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        id: { type: "string", description: "Object whose face takes the workplane." },
        face: { type: "string", enum: ["top", "bottom", "left", "right", "front", "back"], description: "Side of the object's own box, taken in its current turn. Defaults to top." },
        flip: { type: "boolean", description: "Let the workplane face into the object instead of out of it." },
        onSection: { type: "boolean", description: "Put the workplane on the cut of the section view (layerling_section_view must have it switched on), facing out of the body that stays; a sketch started there shows the outline of the cut." },
        reset: { type: "boolean", description: "Put the workplane back on the base plate." },
        visible: { type: "boolean", description: "Show (true) or hide (false) a workplane set on a face." },
      },
    },
  },
  {
    name: "layerling_capture_image",
    description: "Capture a PNG image of the editor viewport from current/home/top/bottom/front/back/right/left view, or from an edge or corner of the view cube by joining neighbouring faces with \"-\" (\"front-right\", \"top-front\", \"front-right-top\"). By default it is the screen as the user sees it, handles and selection frame included. clean: true gives the picture the editor's export saves as \"PNG\": only the bodies, at twice the resolution, without handles, selection frames or guides; plate and transparent then choose whether the build plate shows and whether the background is left out.",
    inputSchema: {
      ...editorTargetSchema,
      properties: {
        ...editorTargetSchema.properties,
        face: { type: "string", pattern: "^(current|home|(top|bottom|front|back|right|left)(-(top|bottom|front|back|right|left)){0,2})$", description: "current, home, a face, or two or three neighbouring faces joined with \"-\" for an edge or a corner view, like \"front-right-top\"." },
        clean: { type: "boolean", description: "Only the bodies, as the PNG export saves them. Implied by plate or transparent." },
        plate: { type: "boolean", description: "With clean: show the build plate and grid (default true)." },
        transparent: { type: "boolean", description: "With clean: leave the background out (default false)." },
      },
    },
  },
];
