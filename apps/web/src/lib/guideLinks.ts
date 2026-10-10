import type { Language } from "@/lib/i18n";
import type { ShapeKind } from "@/types/layerling";

/**
 * The chapters of the user guide (docs/guide) by what they are about, with the
 * file name each language gave them. The pages are static files next to the
 * program, so a link is a plain path. A test compares this table with the
 * chapters on disk - a chapter renamed there without a change here would leave
 * every question mark pointing nowhere.
 */
export const GUIDE_CHAPTERS = {
  start: { de: "erste-schritte", en: "getting-started" },
  view: { de: "ansicht-und-arbeitsebene", en: "view-and-workplane" },
  shapes: { de: "formen", en: "shapes" },
  select: { de: "auswaehlen-und-anordnen", en: "select-and-arrange" },
  solids: { de: "koerper-und-aussparungen", en: "solids-and-holes" },
  edges: { de: "kanten-und-aushoehlen", en: "edges-and-hollowing" },
  sketches: { de: "skizzen", en: "sketches" },
  text: { de: "text", en: "text" },
  threads: { de: "gewinde-und-mechanik", en: "threads-and-mechanics" },
  measuring: { de: "messen-und-notizen", en: "measuring-and-notes" },
  printing: { de: "drucken", en: "printing" },
  files: { de: "dateien-und-speichern", en: "files-and-saving" },
  shortcuts: { de: "tastenkuerzel", en: "shortcuts" },
  ai: { de: "ki-mit-mcp", en: "ai-with-mcp" },
  offline: { de: "offline-und-installieren", en: "offline-and-install" },
} as const satisfies Record<string, Record<Language, string>>;

export type GuideChapter = keyof typeof GUIDE_CHAPTERS;

/**
 * Sections inside a chapter that a question mark jumps to directly: the chapter
 * and the id each language's heading gets (slugify in build-guide.mjs). The
 * same test checks every id against the headings on disk.
 */
export const GUIDE_SECTIONS = {
  sectionView: { chapter: "view", de: "ins-innere-schauen-die-schnittansicht", en: "looking-inside-the-section-view" },
  gridAndSnapping: { chapter: "view", de: "gitter-und-raster", en: "grid-and-snapping" },
  shapeSettings: { chapter: "shapes", de: "die-einstellungen-der-form", en: "the-shape-s-settings" },
  wrapCylinder: { chapter: "shapes", de: "um-einen-zylinder-wickeln", en: "wrapping-around-a-cylinder" },
  textFill: { chapter: "text", de: "kontur-silhouette-und-breiter", en: "outline-silhouette-and-wider" },
  textLayers: { chapter: "text", de: "schichten-und-namensschilder", en: "layers-and-name-tags" },
  myShapes: { chapter: "shapes", de: "eigene-formen", en: "custom-shapes" },
  objectList: { chapter: "select", de: "die-objektliste", en: "the-object-list" },
  pattern: { chapter: "select", de: "muster-reihe-und-kreis", en: "patterns-row-and-circle" },
  scaleByPercent: { chapter: "select", de: "um-prozent-skalieren", en: "scaling-by-percent" },
  selectionProperties: { chapter: "select", de: "mehrere-teile-auf-einmal-aendern", en: "changing-several-parts-at-once" },
  historyView: { chapter: "select", de: "zurueckschauen-die-verlaufsansicht", en: "looking-back-the-history-view" },
  grouping: { chapter: "solids", de: "gruppieren", en: "grouping" },
  bundling: { chapter: "solids", de: "buendeln", en: "bundling" },
  intersection: { chapter: "solids", de: "schnittmenge", en: "intersection" },
  splitting: { chapter: "solids", de: "teilen", en: "splitting" },
  edgeTreatment: { chapter: "edges", de: "kanten-fasen-und-verrunden", en: "chamfering-and-filleting-edges" },
  hollowing: { chapter: "edges", de: "koerper-aushoehlen", en: "hollowing-bodies" },
  threads: { chapter: "threads", de: "gewinde", en: "threads" },
  gears: { chapter: "threads", de: "zahnraeder", en: "gears" },
  springs: { chapter: "threads", de: "federn", en: "springs" },
  bentTubes: { chapter: "threads", de: "gebogene-rohre", en: "bent-tubes" },
  loft: { chapter: "threads", de: "uebergang", en: "loft" },
  honeycomb: { chapter: "threads", de: "wabengitter", en: "honeycomb" },
  hinge: { chapter: "threads", de: "scharnier", en: "hinge" },
  knurl: { chapter: "threads", de: "raendelung", en: "knurling" },
  dovetail: { chapter: "threads", de: "schwalbenschwanz", en: "dovetail" },
  teardrop: { chapter: "threads", de: "tropfenbohrung", en: "teardrop-hole" },
  screwHoles: { chapter: "threads", de: "stufen-und-senkbohrung", en: "counterbore-and-countersink" },
  ruler: { chapter: "measuring", de: "das-lineal", en: "the-ruler" },
  printer: { chapter: "printing", de: "den-drucker-waehlen", en: "choosing-your-printer" },
  backingUp: { chapter: "files", de: "sichern-und-weitergeben", en: "backing-up-and-passing-on" },
  exporting: { chapter: "files", de: "exportieren", en: "exporting" },
  importing: { chapter: "files", de: "importieren", en: "importing" },
  simplifyMesh: { chapter: "files", de: "ein-importiertes-netz-vereinfachen", en: "simplifying-an-imported-mesh" },
  tapeMeasure: { chapter: "measuring", de: "das-massband", en: "the-tape-measure" },
  notes: { chapter: "measuring", de: "notizen", en: "notes" },
  sketchCorners: { chapter: "sketches", de: "ecken-runden-oder-fasen", en: "rounding-or-chamfering-corners" },
  sketchImage: { chapter: "sketches", de: "ein-bild-als-vorlage", en: "a-picture-as-template" },
  sketchStroke: { chapter: "sketches", de: "als-kontur-bauen", en: "building-as-a-stroke" },
  customFonts: { chapter: "text", de: "eigene-schriften", en: "your-own-fonts" },
  sketchFill: { chapter: "sketches", de: "fuellung-und-silhouette", en: "fill-and-silhouette" },
  sketchDrawing: { chapter: "sketches", de: "zeichnen", en: "drawing" },
  sketchToBody: { chapter: "sketches", de: "ein-koerper-daraus-machen", en: "making-a-body-from-it" },
  addShape: { chapter: "shapes", de: "eine-form-hinzufuegen", en: "adding-a-shape" },
  selecting: { chapter: "select", de: "auswaehlen", en: "selecting" },
  layFlat: { chapter: "select", de: "auf-eine-flaeche-legen", en: "laying-flat-on-a-face" },
  referencePoints: { chapter: "measuring", de: "bezugspunkte", en: "reference-points" },
  addingText: { chapter: "text", de: "text-hinzufuegen", en: "adding-text" },
  sketchCurve: { chapter: "sketches", de: "eine-gerade-seite-kruemmen", en: "curving-a-straight-side" },
  commandSearch: { chapter: "shortcuts", de: "befehlssuche", en: "command-search" },
  whatsNew: { chapter: "start", de: "neu-seit-deinem-letzten-besuch", en: "new-since-your-last-visit" },
} as const satisfies Record<string, { chapter: GuideChapter } & Record<Language, string>>;

export type GuideSection = keyof typeof GUIDE_SECTIONS;

/** The address of a chapter or one of its sections, or of the guide's overview when neither is named. */
export function guideHref(language: Language, chapter?: GuideChapter, section?: GuideSection): string {
  const directory = language === "de" ? "anleitung" : "guide";
  const target = section ? GUIDE_SECTIONS[section] : null;
  const page = target?.chapter ?? chapter;
  if (!page) return `/${directory}/index.html`;
  return `/${directory}/${GUIDE_CHAPTERS[page][language]}.html${target ? `#${target[language]}` : ""}`;
}

/**
 * Where in its chapter a shape is explained - the heading its question mark
 * jumps to. Text and sketches have a chapter of their own and open its top.
 */
type GuideShape = {
  kind: ShapeKind;
  groupedShapes?: readonly unknown[];
  groupOperation?: string;
  sketchProfile?: unknown;
  sketchOperation?: string;
  importedMesh?: { sourceFormat?: string };
  layeredText?: boolean;
};

export function guideSectionForShape(shape: GuideShape): GuideSection | undefined {
  // A name tag (#215) is a bundle, but its panel is explained with the text.
  if (shape.layeredText && shape.groupedShapes?.length) return "textLayers";
  if (shape.groupedShapes?.length) {
    if (shape.groupOperation === "bundle") return "bundling";
    if (shape.groupOperation === "intersection") return "intersection";
    return "grouping";
  }
  // A body made from a sketch, or a file brought in, is explained where it was made.
  // An extruded one shows its fill in the properties (#197); a revolved one, how it was made.
  if (shape.sketchProfile) return shape.sketchOperation === "revolve" ? "sketchToBody" : "sketchFill";
  if (shape.kind === "mesh" && shape.importedMesh && shape.importedMesh.sourceFormat !== "json") return "importing";
  switch (shape.kind) {
    case "text":
      return "addingText";
    case "sketch":
    case "scribble":
      return "sketchToBody";
    case "thread":
      return "threads";
    case "gear":
      return "gears";
    case "spring":
      return "springs";
    case "bentTube":
      return "bentTubes";
    case "loft":
      return "loft";
    case "honeycomb":
      return "honeycomb";
    case "hinge":
      return "hinge";
    case "knurl":
      return "knurl";
    case "dovetail":
      return "dovetail";
    case "teardrop":
      return "teardrop";
    case "counterbore":
    case "countersink":
      return "screwHoles";
    case "ruler":
      return "ruler";
    default:
      return "shapeSettings";
  }
}

/** Which chapter explains a shape - the one its question mark opens. */
export function guideChapterForShape(shape: GuideShape): GuideChapter {
  // The chapter always matches the section the question mark jumps to.
  const section = guideSectionForShape(shape);
  if (section) return GUIDE_SECTIONS[section].chapter;
  if (shape.groupedShapes?.length) return "solids";
  switch (shape.kind) {
    case "text":
      return "text";
    case "thread":
    case "spring":
    case "gear":
    case "bentTube":
    case "loft":
    case "honeycomb":
    case "hinge":
    case "knurl":
    case "dovetail":
    case "teardrop":
    case "counterbore":
    case "countersink":
      return "threads";
    case "ruler":
      return "measuring";
    case "sketch":
    case "scribble":
      return "sketches";
    default:
      return "shapes";
  }
}
