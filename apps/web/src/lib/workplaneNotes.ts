import { createLocalId } from "@/lib/localIds";
import type { WorkplaneNote, WorkplaneNoteAnchor, WorkplaneShape } from "@/types/layerling";

/**
 * So lang darf eine Notiz werden. Grosszuegig genug fuer ein paar Saetze und
 * knapp genug, dass niemand ein halbes Handbuch in ein Projekt legt, das damit
 * bei jedem Sichern durch die Leitung geht.
 */
export const NOTE_TEXT_LIMIT = 2000;

/** Mehr Notizen als das nimmt ein Entwurf nicht an. */
export const NOTE_COUNT_LIMIT = 200;

export function createNoteId() {
  return createLocalId("note");
}

function finiteNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeAnchor(value: unknown): WorkplaneNoteAnchor | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<WorkplaneNoteAnchor>;
  if (typeof raw.shapeId !== "string" || !raw.shapeId) return undefined;
  const normalized = raw.normalized;
  if (!Array.isArray(normalized) || normalized.length !== 3) return undefined;
  const numbers = normalized.map((entry) => finiteNumber(entry));
  return { shapeId: raw.shapeId, normalized: [numbers[0], numbers[1], numbers[2]] };
}

/**
 * Eine Notiz auf ein Mass bringen, das in ein Projekt darf. Was nicht zu retten
 * ist - kein Text, keine Kennung - faellt weg, alles andere wird zurechtgerueckt
 * statt abgewiesen: Eine Notiz ist Beiwerk und soll nie ein Paket unlesbar
 * machen.
 */
export function normalizeNote(value: unknown): WorkplaneNote | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<WorkplaneNote>;
  const text = typeof raw.text === "string" ? raw.text.slice(0, NOTE_TEXT_LIMIT) : "";
  const id = typeof raw.id === "string" && raw.id ? raw.id : createNoteId();
  const note: WorkplaneNote = {
    id,
    text,
    x: finiteNumber(raw.x),
    y: finiteNumber(raw.y),
    z: finiteNumber(raw.z),
  };
  if (raw.kind === "point") {
    // A reference point is a bare mark: no text, no anchor; open, it shows its coordinates.
    const point: WorkplaneNote = { id, text: "", x: note.x, y: note.y, z: note.z, kind: "point" };
    if (raw.collapsed) point.collapsed = true;
    return point;
  }
  const anchor = normalizeAnchor(raw.anchor);
  if (anchor) note.anchor = anchor;
  if (raw.collapsed) note.collapsed = true;
  if (raw.forAi === true) note.forAi = true;
  if (typeof raw.reply === "string" && raw.reply) note.reply = raw.reply.slice(0, NOTE_TEXT_LIMIT);
  return note;
}

export function normalizeNotes(value: unknown): WorkplaneNote[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const notes: WorkplaneNote[] = [];
  for (const entry of value) {
    const note = normalizeNote(entry);
    if (!note || seen.has(note.id)) continue;
    seen.add(note.id);
    notes.push(note);
    if (notes.length >= NOTE_COUNT_LIMIT) break;
  }
  return notes;
}

/** The notes with one of them changed, or null when there is no such note. */
export function patchNote(notes: WorkplaneNote[], id: string, patch: Partial<WorkplaneNote>): WorkplaneNote[] | null {
  if (!notes.some((note) => note.id === id)) return null;
  return notes.map((note) => {
    if (note.id !== id) return note;
    const merged: WorkplaneNote = { ...note, ...patch, id: note.id };
    if (typeof patch.text === "string") merged.text = patch.text.slice(0, NOTE_TEXT_LIMIT);
    // `anchor: undefined` heisst „loese dich" und muss das Feld wirklich los
    // werden, sonst traegt die Notiz es nach dem Sichern wieder.
    if ("anchor" in patch && !patch.anchor) delete merged.anchor;
    if (typeof patch.reply === "string") merged.reply = patch.reply.slice(0, NOTE_TEXT_LIMIT);
    if (!merged.reply) delete merged.reply;
    if (!merged.forAi) delete merged.forAi;
    return merged;
  });
}

/**
 * Der Fingerabdruck der Notizen. Er geht in den Fingerabdruck des Standes ein,
 * damit zwei Staende, die sich nur in einer Notiz unterscheiden, nicht fuer
 * denselben gehalten werden - das Paketformat legt gleiche Staende zusammen,
 * und eine Notiz waere sonst beim Sichern weg.
 */
export function notesSignature(notes: WorkplaneNote[]) {
  if (notes.length === 0) return "";
  return notes
    .map((note) => [
      note.id,
      note.text,
      note.anchor ? `${note.anchor.shapeId}@${note.anchor.normalized.map((value) => value.toFixed(4)).join(",")}` : "free",
      `${note.x.toFixed(3)},${note.y.toFixed(3)},${note.z.toFixed(3)}`,
      note.collapsed ? "c" : "",
      note.kind === "point" ? "point" : "",
      note.forAi ? "ai" : "",
      note.reply ?? "",
    ].join("|"))
    .join("\n");
}

/** The reference points among the notes, and the notes proper. */
export function isReferencePoint(note: WorkplaneNote) {
  return note.kind === "point";
}

export function referencePoints(notes: readonly WorkplaneNote[]) {
  return notes.filter(isReferencePoint);
}

function collectShapeIds(shapes: readonly WorkplaneShape[], into = new Set<string>()) {
  for (const shape of shapes) {
    into.add(shape.id);
    if (shape.groupedShapes) collectShapeIds(shape.groupedShapes, into);
  }
  return into;
}

/**
 * The notes pinned to one of these bodies - what a custom shape takes along
 * (#109). Free notes and reference points belong to the design, not to a body,
 * and stay behind.
 */
export function notesAttachedToShapes(notes: readonly WorkplaneNote[], shapes: readonly WorkplaneShape[]): WorkplaneNote[] {
  const ids = collectShapeIds(shapes);
  return notes.filter((note) => !isReferencePoint(note) && note.anchor && ids.has(note.anchor.shapeId));
}

/** Moves the notes' last known spot; a pinned note follows its body anyway. */
export function translateNotes(notes: readonly WorkplaneNote[], dx: number, dy: number, dz: number): WorkplaneNote[] {
  const clean = (value: number) => (Math.abs(value) < 1e-9 ? 0 : Math.round(value * 1e6) / 1e6);
  return notes.map((note) => ({ ...note, x: clean(note.x + dx), y: clean(note.y + dy), z: clean(note.z + dz) }));
}

/**
 * Old body id to new, for bodies copied with fresh ids: the trees are walked
 * side by side, the parts inside groups included.
 */
export function shapeIdMapping(before: readonly WorkplaneShape[], after: readonly WorkplaneShape[], into = new Map<string, string>()) {
  before.forEach((shape, index) => {
    const copy = after[index];
    if (!copy) return;
    into.set(shape.id, copy.id);
    if (shape.groupedShapes && copy.groupedShapes) shapeIdMapping(shape.groupedShapes, copy.groupedShapes, into);
  });
  return into;
}

/**
 * Notes that come into a design with bodies from somewhere else (a custom
 * shape, an inserted design), made to fit it: each gets a fresh id - the package was saved from
 * some design and its note ids may well be ones this design already uses - and
 * its pin moves over to its body's new id. A note whose body did not come
 * along is let go, as `detachNotesFromMissingShapes` would. Each comes in
 * closed. Only as many as the design still has room for; `dropped` says how
 * many did not fit.
 */
export function notesForInsertedShapes(
  incoming: readonly WorkplaneNote[],
  shapeIds: ReadonlyMap<string, string>,
  existing: readonly WorkplaneNote[],
): { notes: WorkplaneNote[]; dropped: number } {
  const room = Math.max(0, NOTE_COUNT_LIMIT - existing.length);
  const taken = new Set(existing.map((note) => note.id));
  const candidates = normalizeNotes(incoming);
  const notes: WorkplaneNote[] = [];
  for (const source of candidates.slice(0, room)) {
    let id = createNoteId();
    while (taken.has(id)) id = createNoteId();
    taken.add(id);
    const { anchor, ...rest } = source;
    const shapeId = anchor ? shapeIds.get(anchor.shapeId) : undefined;
    // Closed: an open note would sit under the pointer while the shape is
    // still being put down, and take the click that should place it.
    const note: WorkplaneNote = { ...rest, id, collapsed: true };
    if (anchor && shapeId) note.anchor = { shapeId, normalized: [...anchor.normalized] };
    notes.push(note);
  }
  return { notes, dropped: candidates.length - notes.length };
}
