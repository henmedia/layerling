import { numberLocale, t, type MessageKey } from "@/lib/i18n";

/**
 * The notes of the vase tool's import modules (SVG, mesh, photo) and of its core (checks, building
 * notes), which they write in German, in the current language. The modules stay as the vase tool has them; a note is recognised by its
 * wording, its numbers carried over. A note not known here stays as it is.
 */

/** A number the vase tool wrote the German way (12,5 or 1.234), in the current language's format. */
function number(text: string) {
  const value = Number(text.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(value) ? value.toLocaleString(numberLocale(), { maximumFractionDigits: 3 }) : text;
}

type Note = { pattern: RegExp; key: MessageKey; params?: (match: RegExpMatchArray) => Record<string, string | number> };

const NUMBER = "(-?[\\d.]+(?:,\\d+)?)";

const NOTES: Note[] = [
  { pattern: /^Keine SVG-Datei erkannt\.$/, key: "vaseNote.noSvg" },
  { pattern: /^Die Datei nennt keine Größe in mm/, key: "vaseNote.svgNoSize" },
  { pattern: /^In der Datei steht keine Form/, key: "vaseNote.svgNoShape" },
  { pattern: /^Keine geschlossene Form gefunden\.$/, key: "vaseNote.svgNoClosedShape" },
  { pattern: /^Eine weitere Form in der Datei bleibt unberücksichtigt/, key: "vaseNote.svgOneMoreShape" },
  { pattern: /^(\d+) weitere Formen in der Datei bleiben unberücksichtigt/, key: "vaseNote.svgMoreShapes", params: (m) => ({ count: m[1] }) },
  { pattern: /^Die Form war offen und wird geschlossen\.$/, key: "vaseNote.svgClosed" },
  { pattern: /^Die Mitte der Form liegt nicht in der Form/, key: "vaseNote.svgCentreOutside" },
  { pattern: /^Der Umriss hat (\d+) Abschnitte – auf (\d+) Punkte vereinfacht\.$/, key: "vaseNote.svgSimplified", params: (m) => ({ segments: m[1], points: m[2] }) },
  { pattern: /^Die Form hat keine Höhe oder Breite\.$/, key: "vaseNote.svgFlat" },
  { pattern: /^Gelesen als rechte Hälfte/, key: "vaseNote.svgRightHalf" },
  { pattern: /^Gelesen als ganze Silhouette/, key: "vaseNote.svgWhole" },
  { pattern: /^Aus der Form lässt sich keine Körperform ablesen\.$/, key: "vaseNote.svgNoProfile" },
  {
    pattern: new RegExp(`^Aus der Datei: ${NUMBER} mm hoch, ${NUMBER} mm breit, (\\d+) Punkte\\.$`),
    key: "vaseNote.svgSize",
    params: (m) => ({ height: number(m[1]), width: number(m[2]), points: m[3] }),
  },
  { pattern: /^Das Netz hat keine Höhe/, key: "vaseNote.meshFlat" },
  { pattern: /^Aus dem Netz lässt sich keine Körperform ablesen\.$/, key: "vaseNote.meshNoProfile" },
  {
    pattern: new RegExp(`^Aus dem Netz: ${NUMBER} mm hoch, ${NUMBER} mm breit, (\\d+) Punkte \\(größter Abstand zur senkrechten Achse an (\\d+) Höhen\\)\\.$`),
    key: "vaseNote.meshSize",
    params: (m) => ({ height: number(m[1]), width: number(m[2]), points: m[3], stations: m[4] }),
  },
  { pattern: /^Unten liegt keine ebene Fläche auf/, key: "vaseNote.meshLying" },
  { pattern: /^Das Teil ist um die senkrechte Achse nicht rund/, key: "vaseNote.meshNotRound" },
  { pattern: /^Kein Bild\.$/, key: "vaseNote.photoNone" },
  { pattern: /^Der Hintergrund ist unruhig/, key: "vaseNote.photoBusy" },
  { pattern: /^Im Foto hebt sich nichts deutlich vom Hintergrund ab\.$/, key: "vaseNote.photoNothing" },
  { pattern: /^Der gefundene Bereich füllt das ganze Foto/, key: "vaseNote.photoWhole" },
  { pattern: /^Der Gegenstand reicht bis an den Bildrand/, key: "vaseNote.photoEdge" },
  { pattern: /^Rand und Boden erscheinen als Ellipse/, key: "vaseNote.photoEllipse" },
  { pattern: /^Kein Gegenstand gefunden\.$/, key: "vaseNote.photoNoObject" },
  { pattern: /^Bitte die Höhe des Gegenstands in mm angeben\.$/, key: "vaseNote.photoHeight" },
  { pattern: /^Der Gegenstand ist im Foto zu klein für einen Umriss\.$/, key: "vaseNote.photoSmall" },
  { pattern: /^Aus dem Umriss lässt sich keine Körperform ablesen\.$/, key: "vaseNote.photoNoProfile" },
  { pattern: /^Breite und Höhe passen nicht zum Seitenverhältnis im Foto \(quer (-?\d+) % gestreckt\)/, key: "vaseNote.photoStretched", params: (m) => ({ percent: m[1] }) },
];

/** The parts "„Muss Wasser halten“ und …" names, in the current language. */
const CONFLICTS: Record<string, MessageKey> = {
  "Ablauflöcher": "vaseCheck.conflictDrains",
  "die durchbrochene Wand": "vaseCheck.conflictCutout",
  "der Lampenschirm": "vaseCheck.conflictLamp",
};

const LIDS: Record<string, MessageKey> = { "Stülpdeckel": "vase.lidSlip", "Schnappdeckel": "vase.lidSnap", "Schraubdeckel": "vase.lidScrew" };

/** The core's own checks and the notes it builds a vase with (vaseChecks, buildVase). */
const CHECKS: Note[] = [
  {
    pattern: new RegExp(`^Überhang bis (\\d+)° zwischen ${NUMBER} und ${NUMBER} mm Höhe`),
    key: "vaseCheck.overhang",
    params: (m) => ({ angle: m[1], from: number(m[2]), to: number(m[3]) }),
  },
  { pattern: new RegExp(`^Wand nur ${NUMBER} mm – unter zwei Linien`), key: "vaseCheck.thinWall", params: (m) => ({ mm: number(m[1]) }) },
  { pattern: new RegExp(`^Boden nur ${NUMBER} mm – unter 0,8 mm`), key: "vaseCheck.thinBottom", params: (m) => ({ mm: number(m[1]) }) },
  { pattern: /^Ein (Stülpdeckel|Schnappdeckel|Schraubdeckel) braucht eine hohle Vase/, key: "vaseCheck.lidNeedsHollow", params: (m) => ({ lid: t(LIDS[m[1]]) }) },
  { pattern: /^Ein Lampenschirm bekommt keinen Deckel\.$/, key: "vaseCheck.lampNoLid" },
  { pattern: /^Deckel und Steckeinsatz bzw\. Wasserröhrchen liegen beide auf dem Rand/, key: "vaseCheck.lidAndInsert" },
  { pattern: new RegExp(`^Neben dem Gewinde bleiben nur ${NUMBER} mm Wand`), key: "vaseCheck.threadWall", params: (m) => ({ mm: number(m[1]) }) },
  { pattern: new RegExp(`^Neben der Nut bleiben nur ${NUMBER} mm Wand`), key: "vaseCheck.grooveWall", params: (m) => ({ mm: number(m[1]) }) },
  { pattern: /^Durchbrüche: Die Oberkante jedes Lochs/, key: "vaseCheck.cutoutBridges" },
  {
    pattern: /^„Muss Wasser halten“ und (.+) widersprechen sich\.$/,
    key: "vaseCheck.watertightConflict",
    params: (m) => ({ watertight: t("prop.vaseWatertight"), parts: m[1].split(", ").map((part) => (CONFLICTS[part] ? t(CONFLICTS[part]) : part)).join(", ") }),
  },
  { pattern: new RegExp(`^Wasserdicht: Wand und Boden mindestens ${NUMBER} mm;`), key: "vaseCheck.watertightHollow", params: (m) => ({ mm: number(m[1]) }) },
  { pattern: /^Wasserdicht im Vasenmodus:/, key: "vaseCheck.watertightVaseMode" },
  { pattern: /^Ein Lampenschirm braucht eine hohle Vase/, key: "vaseCheck.lampNeedsHollow", params: () => ({ hollow: t("vase.bodyHollow") }) },
  { pattern: /^Steckbeine brauchen eine hohle Vase/, key: "vaseCheck.legsNeedHollow" },
  { pattern: /^Mit hohlem Fuß gibt es keine Buchsen für Steckbeine/, key: "vaseCheck.legsHollowFoot" },
  { pattern: /^Eine Buchse passt nicht in den Boden/, key: "vaseCheck.socketDropped" },
  { pattern: /^(\d+) Buchsen passen nicht in den Boden/, key: "vaseCheck.socketsDropped", params: (m) => ({ count: m[1] }) },
  { pattern: /^Nur (\d+) Mulden für Gummifüße passen in den Boden\.$/, key: "vaseCheck.feetFew", params: (m) => ({ count: m[1] }) },
  { pattern: /^Mulden für Gummifüße: die Vase normal drucken/, key: "vaseCheck.feetVaseMode" },
  { pattern: /^Ohne Boden \(über einem LED-Puck\) gibt es keine Buchsen und Mulden\.$/, key: "vaseCheck.puckNoSockets" },
  { pattern: new RegExp(`^Boden auf ${NUMBER} mm verstärkt, damit die Buchsen`), key: "vaseCheck.floorThicker", params: (m) => ({ mm: number(m[1]) }) },
  { pattern: /^Boden auf 2,5 mm verstärkt – er trägt den Schirm/, key: "vaseCheck.floorLamp" },
  { pattern: new RegExp(`^Das Loch für die Fassung \\(Ø ${NUMBER} mm\\) passt nicht in den Boden`), key: "vaseCheck.lampHoleTooBig", params: (m) => ({ mm: number(m[1]) }) },
  { pattern: /^Beim Lampenschirm gibt es statt Ablauflöchern/, key: "vaseCheck.lampNoDrains" },
  { pattern: new RegExp(`^Hängend: Zum Aufhängen umdrehen – die Platte mit dem Loch \\(Ø ${NUMBER} mm\\)`), key: "vaseCheck.lampHanging", params: (m) => ({ mm: number(m[1]) }) },
  { pattern: new RegExp(`^Stehend: Fassung im Bodenloch \\(Ø ${NUMBER} mm\\).* durch den hohlen Fuß und den Schlitz\\.`), key: "vaseCheck.lampStandingNotch", params: (m) => ({ mm: number(m[1]) }) },
  { pattern: new RegExp(`^Stehend: Fassung im Bodenloch \\(Ø ${NUMBER} mm\\)`), key: "vaseCheck.lampStanding", params: (m) => ({ mm: number(m[1]) }) },
  { pattern: new RegExp(`^Der LED-Puck \\(Ø ${NUMBER} mm\\) passt nicht hinein – unten innen sind es nur Ø ${NUMBER} mm\\.$`), key: "vaseCheck.puckTooBig", params: (m) => ({ puck: number(m[1]), inner: number(m[2]) }) },
  { pattern: /^Ohne Boden \(über einem LED-Puck\) gibt es keine Ablauflöcher\.$/, key: "vaseCheck.puckNoDrains" },
  { pattern: /^Ohne Boden gibt es keine Buchsen und Mulden\.$/, key: "vaseCheck.openNoSockets" },
  { pattern: /^Ohne Boden gibt es keine Ablauflöcher\.$/, key: "vaseCheck.openNoDrains" },
  { pattern: /^Ohne Boden: unten offen wie ein Rohr\./, key: "vaseCheck.openBottom" },
  { pattern: /^Nur LED-Leuchtmittel verwenden/, key: "vaseCheck.ledOnly" },
  { pattern: /^Nur (\d+) Ablauflöcher passen in den Boden\.$/, key: "vaseCheck.drainsFew", params: (m) => ({ count: m[1] }) },
  { pattern: /^Kein Ablaufloch passt in den Boden/, key: "vaseCheck.drainsNone" },
  { pattern: new RegExp(`^Gefälle auf ${NUMBER} mm begrenzt \\(Boden ${NUMBER} mm\\)\\.$`), key: "vaseCheck.slopeLimited", params: (m) => ({ slope: number(m[1]), floor: number(m[2]) }) },
  { pattern: /^Ablauflöcher gibt es nur bei einer hohlen Vase\.$/, key: "vaseCheck.drainsNeedHollow" },
  { pattern: new RegExp(`^Für den Kabelschlitz \\(${NUMBER} mm hoch\\) braucht es einen hohlen Fuß von mindestens ${NUMBER} mm\\.$`), key: "vaseCheck.notchFoot", params: (m) => ({ height: number(m[1]), foot: number(m[2]) }) },
  { pattern: /^Eine durchbrochene Wand gibt es nur bei einer hohlen Vase/, key: "vaseCheck.cutoutNeedsHollow", params: () => ({ hollow: t("vase.bodyHollow") }) },
  { pattern: /^Eine durchbrochene Wand geht nicht zusammen mit Facetten\.$/, key: "vaseCheck.cutoutLowpoly" },
  { pattern: /^Der Bereich für die Durchbrüche ist zu klein/, key: "vaseCheck.cutoutZoneSmall", params: () => ({ from: t("prop.vaseCutoutFrom"), to: t("prop.vaseCutoutTo") }) },
  { pattern: /^Bei „Nur ganze Löcher“ passt keine Lochreihe/, key: "vaseCheck.cutoutNoRow", params: () => ({ whole: t("vase.cutoutWhole") }) },
  { pattern: /^Rippen und Doppelwand sind für den Slicer-Vasenmodus/, key: "vaseCheck.reinforceHollow", params: () => ({ solid: t("vase.bodySolid") }) },
  { pattern: /^Rippen und Doppelwand gehen nicht zusammen mit Facetten\.$/, key: "vaseCheck.reinforceLowpoly" },
  { pattern: new RegExp(`^Die Wände stehen zu dicht für Stege – Abstand mindestens ${NUMBER} mm`), key: "vaseCheck.doubleWallClose", params: (m) => ({ mm: number(m[1]) }) },
  {
    pattern: new RegExp(`^Slicer: Spiral-Vasenmodus an, Linienbreite außen ${NUMBER} mm \\(wie hier eingestellt\\)\\. Die Schlitze \\(${NUMBER} mm\\) bleiben`),
    key: "vaseCheck.slitsKept",
    params: (m) => ({ line: number(m[1]), slit: number(m[2]) }),
  },
  {
    pattern: new RegExp(`^Slicer: Spiral-Vasenmodus an, Linienbreite außen ${NUMBER} mm \\(wie hier eingestellt\\)\\. Wichtig: .* auf höchstens ${NUMBER} mm stellen – sonst schließt der Slicer die ${NUMBER}-mm-Schlitze`),
    key: "vaseCheck.slitsGap",
    params: (m) => ({ line: number(m[1]), radius: number(m[2]), slit: number(m[3]) }),
  },
];

/** A note of the vase tool's import modules in the current language. */
export function vaseNote(text: string): string {
  for (const { pattern, key, params } of [...NOTES, ...CHECKS]) {
    const match = text.match(pattern);
    if (match) return t(key, params?.(match));
  }
  return text;
}
