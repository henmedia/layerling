// Welche Formeinstellung zu welcher Form gehoert, und was die Bruecke mit dem `settings`-Objekt von
// layerling_create_shape und layerling_update_object macht. So muss die KI nicht alle Einstellungen aller Formen
// im Kontext halten, sondern fragt mit layerling_shape_settings nach den Formen, die sie braucht.
//
// Die Zuordnung stammt aus dem Verhalten des Editors: Was `normalizeShapeCustomizations` bei einer Form behaelt,
// gehoert zu ihr; was der Editor an anderer Stelle liest (gridfinity*, loft*, cove*, vase ...), ist von Hand
// eingetragen. tests/unit/mcpShapeSettingsLookup.test.ts haelt beides gegen den Editor. Im Zweifel steht ein Feld
// zu viel in der Liste: Das kostet ein paar Tokens, ein fehlendes dagegen eine Funktion.

/** Einstellungen, die jeder Koerper traegt: Verjuengung, Neigung, Verschmaelerung, Drehung beim Ausziehen. */
export const bodySettingKeys = ["taperTopWidth", "taperTopDepth", "taperBottomWidth", "taperBottomDepth", "extrudeTwist", "extrudeTopOffsetX", "extrudeTopOffsetZ", "slopeEnd", "slopeSide", "slopeCurve", "slopeFrom", "sideDrop", "sideCurve", "narrowEnd", "narrowSide", "narrowCurve", "narrowStart"];

export const settingKinds = {
  sides: ["cylinder", "slot", "ellipse", "polygon", "roof", "cone", "pyramid", "roundRoof", "curvedCone", "torus", "tube", "counterbore", "countersink", "doubleCountersink", "finishingWasher", "teardrop"],
  steps: ["sphere", "halfSphere", "paraboloid", "torus"],
  bevel: ["tube", "text"],
  segments: ["text"],
  topRadius: ["cone"],
  baseRadius: ["cone"],
  curvedConeTop: ["curvedCone"],
  curvedConeBend: ["curvedCone"],
  screwBossFastener: ["screwBoss"],
  screwBossSize: ["screwBoss"],
  screwBossHole: ["screwBoss"],
  screwBossHoleDepth: ["screwBoss"],
  screwBossDiameter: ["screwBoss"],
  screwBossGussets: ["screwBoss"],
  screwBossGussetHeight: ["screwBoss"],
  screwBossGussetThickness: ["screwBoss"],
  latchPart: ["latch"],
  latchWidth: ["latch"],
  latchGrip: ["latch"],
  latchSpacing: ["latch"],
  snapFitPart: ["snapFit"],
  snapFitThickness: ["snapFit"],
  snapFitUndercut: ["snapFit"],
  snapFitClearance: ["snapFit"],
  snapFitLeadAngle: ["snapFit"],
  snapFitRetainAngle: ["snapFit"],
  snapFitFoot: ["snapFit"],
  ribStyle: ["rib"],
  ribTop: ["rib"],
  ribFoot: ["rib"],
  ribThickness: ["rib"],
  ribFootThickness: ["rib"],
  ribFootShape: ["rib"],
  topWidth: ["pyramid"],
  topDepth: ["pyramid"],
  teeth: ["gear", "hirth", "pulley"],
  gearProfile: ["gear"],
  gearPressureAngle: ["gear"],
  gearBacklash: ["gear"],
  toothSize: ["gear", "hirth"],
  toothWidth: ["gear"],
  centerHoleSize: ["gear", "hirth", "pulley"],
  pulleyBeltWidth: ["pulley"],
  pulleyFlange: ["pulley"],
  pulleyFlangeRise: ["pulley"],
  pulleyHubHeight: ["pulley"],
  pulleyHubDiameter: ["pulley"],
  hirthSteepFlank: ["hirth"],
  hirthReverse: ["hirth"],
  gearType: ["gear"],
  gearRim: ["gear"],
  helixAngle: ["gear"],
  bevelHelixAngle: ["gear"],
  ringRackHelixAngle: ["gear"],
  ringRackHerringbone: ["gear"],
  helixQuality: ["gear"],
  threadRole: ["thread"],
  threadHead: ["thread"],
  threadHand: ["thread"],
  threadProfile: ["thread"],
  threadTaper: ["thread"],
  threadDiameter: ["thread"],
  threadPitch: ["thread"],
  threadStarts: ["thread"],
  threadClearance: ["thread"],
  threadAxialClearance: ["thread"],
  threadDepth: ["thread"],
  threadFlankAngle: ["thread"],
  threadBoltClearance: ["thread"],
  threadQuality: ["thread"],
  threadChamfer: ["thread"],
  threadChamferBottom: ["thread"],
  threadHeadHeight: ["thread"],
  threadHeadChamfer: ["thread"],
  threadHeadDiameter: ["thread"],
  threadDrive: ["thread"],
  threadDriveSize: ["thread"],
  threadDriveDepth: ["thread"],
  threadCollarHeight: ["thread"],
  threadCollarDiameter: ["thread"],
  springTurns: ["spring"],
  springWire: ["spring"],
  springForm: ["spring"],
  springPattern: ["spring"],
  springInner: ["spring"],
  springEnds: ["spring"],
  springHand: ["spring"],
  springQuality: ["spring"],
  starPoints: ["star"],
  starInnerSize: ["star"],
  starOuterFillet: ["star"],
  starInnerFillet: ["star"],
  starQuality: ["star"],
  heartTipFillet: ["heart"],
  heartQuality: ["heart"],
  crescentThickness: ["crescent"],
  crescentTipFillet: ["crescent"],
  crescentQuality: ["crescent"],
  sectorAngle: ["sector"],
  sectorInnerDiameter: ["sector"],
  sectorEndRadius: ["sector"],
  knurlPattern: ["knurl"],
  knurlCount: ["knurl"],
  knurlDepth: ["knurl"],
  knurlAngle: ["knurl"],
  knurlChamfer: ["knurl"],
  hingeKnuckles: ["hinge"],
  tubeBoreHole: ["tube", "bentTube"],
  hingeKnuckleWidth: ["hinge"],
  hingeStyle: ["hinge"],
  hingeConeSize: ["hinge"],
  hingeSnapGrip: ["hinge"],
  hingePinDiameter: ["hinge"],
  hingeLeafThickness: ["hinge"],
  hingeClearance: ["hinge"],
  hingePinless: ["hinge"],
  hingeAngle: ["hinge"],
  hingeScrewHoles: ["hinge"],
  hingeScrewDiameter: ["hinge"],
  hingeScrewSpacing: ["hinge"],
  hingeScrewAcross: ["hinge"],
  hingeScrewCountersink: ["hinge"],
  hingeScrewHead: ["hinge"],
  hingeNutWidth: ["hinge"],
  hingeCornerRadius: ["hinge"],
  hingeLeafStyle: ["hinge"],
  gridfinityType: ["gridfinity"],
  gridfinityLip: ["gridfinity"],
  gridfinityMagnets: ["gridfinity"],
  gridfinityHalfGrid: ["gridfinity"],
  gridfinityLargePlate: ["gridfinity"],
  gridfinitySwallowtail: ["gridfinity"],
  gridfinitySwallowtailClearance: ["gridfinity"],
  gridfinitySwallowtailCorners: ["gridfinity"],
  gridfinityClipNotches: ["gridfinity"],
  gridfinityClipCount: ["gridfinity"],
  gridfinityPuzzle: ["gridfinity"],
  gridfinityPuzzleSides: ["gridfinity"],
  gridfinityPuzzleFit: ["gridfinity"],
  gridfinityLabelBack: ["gridfinity"],
  gridfinityLabelFront: ["gridfinity"],
  gridfinityLabelLeft: ["gridfinity"],
  gridfinityLabelRight: ["gridfinity"],
  gridfinityLabelBackWidth: ["gridfinity"],
  gridfinityLabelBackLength: ["gridfinity"],
  gridfinityLabelBackOffset: ["gridfinity"],
  gridfinityLabelFrontWidth: ["gridfinity"],
  gridfinityLabelFrontLength: ["gridfinity"],
  gridfinityLabelFrontOffset: ["gridfinity"],
  gridfinityLabelLeftWidth: ["gridfinity"],
  gridfinityLabelLeftLength: ["gridfinity"],
  gridfinityLabelLeftOffset: ["gridfinity"],
  gridfinityLabelRightWidth: ["gridfinity"],
  gridfinityLabelRightLength: ["gridfinity"],
  gridfinityLabelRightOffset: ["gridfinity"],
  gridfinityLabelCorner: ["gridfinity"],
  gridfinityLabelCornerSize: ["gridfinity"],
  gridfinityLabelBackText: ["gridfinity"],
  gridfinityLabelFrontText: ["gridfinity"],
  gridfinityLabelLeftText: ["gridfinity"],
  gridfinityLabelRightText: ["gridfinity"],
  gridfinityLabelFont: ["gridfinity"],
  gridfinityLabelColor: ["gridfinity"],
  gridfinityLabelTextSize: ["gridfinity"],
  gridfinityScoopBack: ["gridfinity"],
  gridfinityScoopFront: ["gridfinity"],
  gridfinityScoopLeft: ["gridfinity"],
  gridfinityScoopRight: ["gridfinity"],
  gridfinityScoopRadius: ["gridfinity"],
  gridfinityFloorHeight: ["gridfinity"],
  gridfinityOpenBack: ["gridfinity"],
  gridfinityOpenFront: ["gridfinity"],
  gridfinityOpenLeft: ["gridfinity"],
  gridfinityOpenRight: ["gridfinity"],
  gridfinityOpenings: ["gridfinity"],
  gridfinityOutline: ["gridfinity"],
  gridfinityOpeningCorner: ["gridfinity"],
  gridfinityOpeningCornerSize: ["gridfinity"],
  gridfinityLipChamfer: ["gridfinity"],
  gridfinityWallThickness: ["gridfinity"],
  gridfinityPaddingBack: ["gridfinity"],
  gridfinityPaddingFront: ["gridfinity"],
  gridfinityPaddingLeft: ["gridfinity"],
  gridfinityPaddingRight: ["gridfinity"],
  gridfinityHalfCells: ["gridfinity"],
  gridfinityOverhangBack: ["gridfinity"],
  gridfinityOverhangFront: ["gridfinity"],
  gridfinityOverhangLeft: ["gridfinity"],
  gridfinityOverhangRight: ["gridfinity"],
  gridfinityOverhangChamfer: ["gridfinity"],
  gridfinityOverhangSolid: ["gridfinity"],
  gridfinityOverhangLipOnGrid: ["gridfinity"],
  gridfinityCornerRadius: ["gridfinity"],
  gridfinityBinCornerRadius: ["gridfinity"],
  gridfinityCompartmentsX: ["gridfinity"],
  gridfinityCompartmentsZ: ["gridfinity"],
  gridfinityDividerThickness: ["gridfinity"],
  gridfinityDividerHeight: ["gridfinity"],
  gridfinityDividerPositionsX: ["gridfinity"],
  gridfinityDividerPositionsZ: ["gridfinity"],
  gridfinityCompartmentLabels: ["gridfinity"],
  gridfinityCompartmentSplits: ["gridfinity"],
  dovetailNeckWidth: ["dovetail"],
  screwHoleShaft: ["counterbore", "countersink", "doubleCountersink", "finishingWasher"],
  screwHoleHeadDepth: ["counterbore", "countersink", "doubleCountersink", "finishingWasher"],
  screwHoleAngle: ["counterbore", "countersink", "doubleCountersink", "finishingWasher"],
  drillPointAngle: ["cylinder", "counterbore", "countersink"],
  screwHoleSlot: ["counterbore", "countersink", "doubleCountersink"],
  screwHoleRecess: ["countersink", "doubleCountersink"],
  screwHoleChamfer: ["counterbore"],
  loftBottomOutline: ["loft"],
  loftTopOutline: ["loft"],
  loftBottomWidth: ["loft"],
  loftBottomDepth: ["loft"],
  loftTopWidth: ["loft"],
  loftTopDepth: ["loft"],
  loftBottomCorner: ["loft"],
  loftTopCorner: ["loft"],
  loftBottomSides: ["loft"],
  loftTopSides: ["loft"],
  loftOffsetX: ["loft"],
  loftOffsetZ: ["loft"],
  loftWall: ["loft"],
  loftTopWall: ["loft"],
  loftSegments: ["loft"],
  loftSmooth: ["loft"],
  loftTwist: ["loft"],
  loftTiltX: ["loft"],
  loftTiltZ: ["loft"],
  loftSections: ["loft"],
  loftThrough: ["loft"],
  coveRadius: ["cove"],
  coveLand: ["cove"],
  slotEndRatio: ["slot"],
  torusTubeRatio: ["torus"],
  dovetailClearance: ["dovetail"],
  portProfile: ["port"],
  portClearance: ["port"],
  polygonFlat: ["polygon", "roof"],
  polygonRoof: ["polygon", "roof"],
  cornerFillet: ["roundedBox", "polygon", "roof", "port"],
  topBottomFillet: ["roundedBox"],
  bottomFillet: ["roundedBox"],
  roundedBoxQuality: ["roundedBox"],
  bentTubeProfile: ["bentTube"],
  bentTubeInnerProfile: ["bentTube"],
  bentTubeSize: ["bentTube"],
  bentTubeWall: ["bentTube"],
  bentTubeQuality: ["bentTube"],
  bentTubeSegments: ["bentTube"],
  patties: ["patties"],
  vase: ["vase"],
  text: ["text"],
  font: ["text"],
  textCurved: ["text"],
  textRadius: ["text"],
  textSize: ["text"],
  textInward: ["text"],
  textFlipped: ["text"],
};

/** Diese stehen weiter direkt an den beiden Werkzeugen: oft gebraucht, und die KI sieht das Format. */
export const directSettingKeys = ["sides", "steps", "text", "font", "threadSize"];

/*
 * Gridfinity hat mehr Einstellungen als jede andere Form: alle zusammen waren rund 50 KB. Antigravity legt eine so
 * grosse Antwort in eine Datei, statt sie der KI zu geben - sie riet dann Namen (28.11.2026). Deshalb kommt zuerst
 * das Grundlegende und die Namen der uebrigen Themen; deren Beschreibungen gibt es auf Nachfrage. Genauso die
 * Einstellungen, die jeder Koerper traegt ("body").
 */
const gridfinityTopicPatterns = {
  compartments: /^gridfinity(Compartment|Divider)/,
  labels: /^gridfinity(Label|CompartmentLabels)/,
  openings: /^gridfinityOpen/,
  overhang: /^gridfinityOverhang/,
  baseplate: /^gridfinity(LargePlate|Swallowtail|Clip|Puzzle|Outline|Padding|HalfCells)/,
};

export const settingTopics = ["body", ...Object.keys(gridfinityTopicPatterns)];

const topicsOf = (key) => Object.entries(gridfinityTopicPatterns).filter(([, pattern]) => pattern.test(key)).map(([topic]) => topic);

/** Die Beschreibungen zu den angefragten Formen und Themen: jede Einstellung einmal, dazu je Form die Namen. */
export function lookupShapeSettings(schema, allKinds, requested, requestedTopics) {
  const list = (value) => (Array.isArray(value) ? value : typeof value === "string" ? [value] : []);
  const kinds = list(requested);
  const unknown = kinds.filter((kind) => !allKinds.includes(kind));
  if (!kinds.length || unknown.length) {
    throw new Error(`${unknown.length ? `Unknown kind: ${unknown.join(", ")}. ` : "Give kinds, a list of shape kinds. "}Kinds: ${allKinds.join(", ")}`);
  }
  const topics = list(requestedTopics);
  const wrong = topics.filter((topic) => !settingTopics.includes(topic));
  if (wrong.length) throw new Error(`Unknown topic: ${wrong.join(", ")}. Topics: ${settingTopics.join(", ")}`);
  const names = new Set();
  const perKind = {};
  const more = {};
  for (const kind of kinds) {
    const own = Object.keys(schema).filter((key) => settingKinds[key]?.includes(kind));
    perKind[kind] = own;
    for (const key of own) {
      const within = kind === "gridfinity" ? topicsOf(key) : [];
      if (!within.length || within.some((topic) => topics.includes(topic))) names.add(key);
      else for (const topic of within) (more[topic] ??= []).push(key);
    }
  }
  const anyBody = bodySettingKeys.filter((key) => key in schema);
  if (topics.includes("body")) anyBody.forEach((key) => names.add(key));
  return {
    kinds: perKind,
    ...(Object.keys(more).length ? { moreTopics: more, moreHint: `For the descriptions of these, call again with the same kinds and topics, e.g. topics: ["${Object.keys(more)[0]}"].` } : {}),
    anyBody,
    ...(topics.includes("body") ? {} : { anyBodyHint: 'Taper, twist, lean and slope of any body; their descriptions with topics: ["body"].' }),
    settings: Object.fromEntries([...names].map((key) => [key, schema[key]])),
    use: "Pass these in the settings object of layerling_create_shape or layerling_update_object.",
  };
}

const words = (name) => String(name).split(/(?=[A-Z])|[_-]/).map((word) => word.toLowerCase().replace(/s$/, "")).filter(Boolean);

/** Die Namen, die einem erfundenen am naechsten kommen: nach gemeinsamen Wortteilen, hoechstens drei. */
export function similarSettingNames(wanted, names) {
  const asked = new Set(words(wanted));
  // Der Name der Form ("gridfinity") steht in fast allen und sagt nichts.
  asked.delete("gridfinity");
  return names
    .map((name) => {
      const have = words(name).filter((word) => word !== "gridfinity");
      const shared = have.filter((word) => asked.has(word)).length;
      return { name, score: shared ? shared / (asked.size + have.length - shared) : 0 };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.name.length - b.name.length)
    .slice(0, 3)
    .map((entry) => entry.name);
}

/** Die Namen im settings-Objekt, die es weder als Einstellung noch als Angabe des Werkzeugs gibt. */
export function unknownShapeSettings(args, { schema, toolProperties }) {
  const settings = parsedSettings(args);
  return settings ? Object.keys(settings).filter((key) => !(key in schema) && !(key in toolProperties)) : [];
}

function parsedSettings(args) {
  let settings = args?.settings;
  if (settings === undefined || settings === null) return null;
  if (typeof settings === "string") {
    try {
      settings = JSON.parse(settings);
    } catch {
      throw new Error("settings must be an object, or its JSON text");
    }
  }
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) throw new Error("settings must be an object of setting names and values");
  return settings;
}

/**
 * Legt das `settings`-Objekt flach neben die uebrigen Angaben, so wie der Editor sie liest. Steht ein Name beides
 * Mal da, gilt die direkte Angabe. Ein unbekannter Name ist ein Fehler, der aehnliche und die Namen der Form nennt,
 * damit die KI sich verbessern kann; ein bekannter, den die Form nicht hat, geht durch und bleibt wie bisher ohne
 * Wirkung.
 */
export function flattenShapeSettings(args, { schema, toolProperties, kind }) {
  if (!args || args.settings === undefined || args.settings === null) return args || {};
  const { settings: _given, ...flat } = args;
  const settings = parsedSettings(args);
  const unknown = unknownShapeSettings(args, { schema, toolProperties });
  if (unknown.length) {
    // Die der Form zuerst: Dort sucht die KI.
    const own = kind ? Object.keys(schema).filter((key) => settingKinds[key]?.includes(kind)) : [];
    const candidates = kind ? [...own, ...bodySettingKeys] : Object.keys(schema);
    const suggestions = unknown
      .map((key) => [key, similarSettingNames(key, candidates)])
      .filter(([, similar]) => similar.length)
      .slice(0, 8)
      .map(([key, similar]) => `${key} -> ${similar.join(" or ")}`);
    throw new Error(
      `Unknown setting: ${unknown.join(", ")}. ${suggestions.length ? `Similar: ${suggestions.join("; ")}. ` : ""}` +
      `${kind ? `Settings of ${kind}: ${own.join(", ") || "none of its own"}; of any body: ${bodySettingKeys.join(", ")}. ` : ""}` +
      `Do not guess: layerling_shape_settings describes them. Nothing was changed.`,
    );
  }
  return { ...settings, ...flat };
}
