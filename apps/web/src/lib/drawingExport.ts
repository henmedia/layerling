import * as THREE from "three";
import { drawingInfoText, type DrawingInfo, type DrawingPrintPaper } from "@/lib/drawingInfo";
import { drawingRotation, projectDrawingMeshes, type DrawingMesh, type DrawingPoint, type DrawingPoint3, type DrawingProjection } from "@/lib/drawingProjection";

export type DrawingHole = { center: DrawingPoint; diameter: number };
type Stroke = { kind: "line"; a: DrawingPoint; b: DrawingPoint; width: number; dash?: number[] };
type Label = { kind: "text"; at: DrawingPoint; text: string; size: number; anchor?: "middle" };
type Primitive = Stroke | Label;
/** `id` is the letter of the view in the bore table (F, T, R); `name` is what the sheet calls it. */
export type DrawingView = { id: "F" | "T" | "R"; name: string; projection: DrawingProjection; holes: DrawingHole[] };
/** One sheet: its size in mm and what is drawn on it. */
export type DrawingSheet = {
  width: number; height: number; primitives: Primitive[];
  /** "ISO A3" and the like, or null when the sheet had to grow past A0. */
  paper: string | null;
};
/**
 * The drawing on one sheet, all three views (the SVG), and `pages`, the sheets the PDF is printed
 * on: that same sheet, or pages of the printer's paper with the views split over them when the one sheet is bigger.
 */
export type GeneratedDrawing = DrawingSheet & { title: string; views: DrawingView[]; pages: DrawingSheet[] };

/** The words on the sheet. English is the default; the editor hands in the interface language's own. */
export type DrawingLabels = {
  front: string; top: string; right: string;
  bores: string; id: string; view: string; diameter: string;
  firstAngle: string; customSheet: string; revision: string; drawnBy: string;
  scale: string; units: string; sheet: string; notes: string; notesLines: string[];
};
export const DRAWING_LABELS_EN: DrawingLabels = {
  front: "Front", top: "Top", right: "Right side",
  bores: "CIRCULAR BORES — positions from each view's lower-left corner (mm)",
  id: "ID", view: "View", diameter: "Diameter",
  firstAngle: "FIRST ANGLE", customSheet: "CUSTOM SHEET", revision: "DRAWING / REVISION", drawnBy: "DRAWN BY / DATE",
  scale: "SCALE", units: "DIMENSIONS IN", sheet: "SHEET", notes: "NOTES",
  notesLines: ["Print at 100% / actual size.", "Mesh-derived nominal geometry.", "Bores parallel to view axes only.", "Threads, depths and tolerances", "are not automatically dimensioned."],
};

/** One row of the bore table: the position is measured from the lower-left corner of the view's overall size. */
export type DrawingBoreRow = { id: string; view: string; diameter: number; x: number; y: number };
export function drawingBoreRows(drawing: Pick<GeneratedDrawing, "views">): DrawingBoreRow[] {
  return drawing.views.flatMap((view) => view.holes.map((hole, i) => ({
    id: `${view.id}${i + 1}`,
    view: view.name,
    diameter: hole.diameter,
    x: hole.center[0] + view.projection.width / 2,
    y: view.projection.height / 2 - hole.center[1],
  })));
}

/** Recognize complete, inward-facing cylindrical walls, not outside bosses.
 * Connected walls are fitted in view space so booleans/imported meshes work too.
 * Only round bores parallel to a standard view axis are called out. */
export function findDrawingHoles(meshes: readonly DrawingMesh[], rotation: DrawingPoint3, center: DrawingPoint3): DrawingHole[] {
  const matrix = drawingRotation(rotation);
  const holes: DrawingHole[] = [];
  for (const mesh of meshes) {
    const vertices = mesh.vertices.map((p) => new THREE.Vector3(...p).applyMatrix4(matrix).sub(new THREE.Vector3(...center)));
    const weld = new Map<string, number>();
    const ids = vertices.map((p, i) => {
      const key = p.toArray().map((v) => Math.round(v * 100000)).join(",");
      if (!weld.has(key)) weld.set(key, i);
      return weld.get(key)!;
    });
    const walls: { ids: number[]; normal: THREE.Vector3; midpoint: THREE.Vector3 }[] = [];
    const adjacent = new Map<number, number[]>();
    mesh.faces.forEach((face) => {
      const [a, b, c] = face.map((i) => vertices[i]!);
      const normal = b.clone().sub(a).cross(c.clone().sub(a));
      if (normal.lengthSq() < 1e-18) return;
      normal.normalize();
      if (Math.abs(normal.z) > 1e-5) return;
      const index = walls.length;
      const faceIds = face.map((i) => ids[i]!);
      walls.push({ ids: faceIds, normal, midpoint: a.clone().add(b).add(c).multiplyScalar(1 / 3) });
      faceIds.forEach((id) => { const list = adjacent.get(id) ?? []; list.push(index); adjacent.set(id, list); });
    });
    const visited = new Set<number>();
    for (let start = 0; start < walls.length; start++) {
      if (visited.has(start)) continue;
      const component = [start]; visited.add(start);
      for (let i = 0; i < component.length; i++) {
        for (const id of walls[component[i]]!.ids) for (const neighbor of adjacent.get(id) ?? []) {
          if (!visited.has(neighbor)) { visited.add(neighbor); component.push(neighbor); }
        }
      }
      const points = new Map<string, THREE.Vector3>();
      component.forEach((i) => walls[i]!.ids.forEach((id) => {
        const p = vertices[id]!;
        points.set(`${Math.round(p.x * 100000)},${Math.round(p.y * 100000)}`, p);
      }));
      const ring = [...points.values()];
      if (ring.length < 8) continue;
      // Three well-separated points determine the circle; every vertex must fit.
      const a = ring[0]!;
      const b = ring.reduce((best, p) => p.distanceToSquared(a) > best.distanceToSquared(a) ? p : best, a);
      const c = ring.reduce((best, p) => Math.abs((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x))
        > Math.abs((b.x - a.x) * (best.y - a.y) - (b.y - a.y) * (best.x - a.x)) ? p : best, a);
      const bx = b.x - a.x, by = b.y - a.y, cx = c.x - a.x, cy = c.y - a.y;
      const determinant = 2 * (bx * cy - by * cx);
      if (Math.abs(determinant) < 1e-9) continue;
      const x = a.x + (cy * (bx * bx + by * by) - by * (cx * cx + cy * cy)) / determinant;
      const y = a.y + (bx * (cx * cx + cy * cy) - cx * (bx * bx + by * by)) / determinant;
      const radius = Math.hypot(a.x - x, a.y - y);
      if (radius < 1e-4 || ring.some((p) => Math.abs(Math.hypot(p.x - x, p.y - y) - radius) > Math.max(0.001, radius * 0.0001))) continue;
      const angles = ring.map((p) => Math.atan2(p.y - y, p.x - x)).sort((a, b) => a - b);
      if (angles.some((angle, i) => (i + 1 < angles.length ? angles[i + 1]! : angles[0]! + 2 * Math.PI) - angle > Math.PI / 2)) continue;
      if (!component.every((i) => {
        const wall = walls[i]!;
        return wall.normal.x * (wall.midpoint.x - x) + wall.normal.y * (wall.midpoint.y - y) < -radius * 0.5;
      })) continue;
      const hole: DrawingHole = { center: [x, -y], diameter: radius * 2 };
      if (!holes.some((h) => Math.hypot(h.center[0] - x, h.center[1] + y) < 0.001 && Math.abs(h.diameter - hole.diameter) < 0.001)) holes.push(hole);
    }
  }
  if (holes.length > 200) throw new Error("This drawing has more than 200 circular holes. Select a smaller part.");
  return holes.sort((a, b) => a.center[1] - b.center[1] || a.center[0] - b.center[0] || a.diameter - b.diameter);
}

const number = (n: number) => String(Number(n.toFixed(5)));
const dimension = (n: number) => (Math.abs(n) < 0.005 ? 0 : n).toFixed(2);

/** A sheet's size from ISO A4 up, landscape; an index past A0 means a sheet grown to fit. */
const PAPERS: Array<[number, number]> = [[297, 210], [420, 297], [594, 420], [841, 594], [1189, 841]];
/**
 * The papers a printer takes, landscape, and what the title block calls them: ISO A4 and A3, and
 * for the printers in the USA and Canada Letter (8.5 x 11 in) and Tabloid (11 x 17 in) - an A4 page
 * hangs over a Letter sheet at 100 % and is no longer 1:1 shrunk to fit it (PR #2005).
 */
export const PRINT_PAPERS: Record<DrawingPrintPaper, { width: number; height: number; name: string }> = {
  A4: { width: 297, height: 210, name: "ISO A4" },
  A3: { width: 420, height: 297, name: "ISO A3" },
  Letter: { width: 279.4, height: 215.9, name: "US Letter" },
  Tabloid: { width: 431.8, height: 279.4, name: "US Tabloid" },
};
const LEFT = 20, MARGIN = 10, GAP = 12, TITLE_HEIGHT = 36, ROW_EXTRA = 28, CELL_MIN = 100;
const TABLE_TEXT = 2.5;

type SheetPlan = {
  width: number; height: number;
  /** What the title block calls the sheet, null for one grown past A0; `rank` orders the sheets by size. */
  paper: string | null; rank: number;
  leftCell: number; rightCell: number; upperRow: number; lowerRow: number;
  tableInCell: boolean; tableWidth: number; tableHeight: number;
};

/** The bore table's column widths, from the widest entry of each column, and the table's width and height. */
function boreTableSize(rows: readonly DrawingBoreRow[], labels: DrawingLabels) {
  const width = (value: string) => textWidth(value) * TABLE_TEXT + 4;
  const columns = [
    Math.max(width(labels.id), ...rows.map((row) => width(row.id))),
    Math.max(width(labels.view), ...rows.map((row) => width(row.view))),
    Math.max(width(labels.diameter), ...rows.map((row) => width(dimension(row.diameter)))),
    Math.max(width("X"), ...rows.map((row) => width(dimension(row.x)))),
    Math.max(width("Y"), ...rows.map((row) => width(dimension(row.y)))),
  ];
  const sum = columns.reduce((total, column) => total + column, 0);
  return { columns, width: sum + 3, height: rows.length ? 18 + rows.length * 5 : 0 };
}

/**
 * How the views of one sheet sit: the right side view in the left column, the front above the top
 * in the right one (first angle), and the bore table either in the cell left of the top view, which
 * is otherwise empty, or under the views. The smallest ISO sheet wins; with `onPaper` (one of
 * PRINT_PAPERS), the sheet is that paper, and views that do not fit it are no plan at all.
 */
function planSheet(views: readonly DrawingView[], table: { width: number; height: number }, onPaper: (typeof PRINT_PAPERS)[DrawingPrintPaper] | null): SheetPlan | null {
  const view = (id: DrawingView["id"]) => views.find((entry) => entry.id === id)?.projection;
  const front = view("F"), top = view("T"), side = view("R");
  const upperRow = front || side ? Math.max(front?.height ?? 0, side?.height ?? 0) + ROW_EXTRA : 0;
  const rightCell = front || top ? Math.max(CELL_MIN, (front?.width ?? 0) + 32, (top?.width ?? 0) + 32) : 0;
  const sideCell = side ? Math.max(CELL_MIN, side.width + 32) : 0;
  const plans: SheetPlan[] = [];
  for (const tableInCell of table.height && top ? [true, false] : [false]) {
    const leftCell = Math.max(sideCell, tableInCell ? table.width : 0);
    const lowerRow = top ? Math.max(top.height + ROW_EXTRA, tableInCell ? table.height : 0) : 0;
    const requiredWidth = LEFT + leftCell + (leftCell && rightCell ? GAP : 0) + rightCell + MARGIN;
    const requiredHeight = 15 + upperRow + (upperRow && lowerRow ? GAP : 0) + lowerRow + (tableInCell ? 0 : table.height) + 6 + TITLE_HEIGHT + MARGIN;
    // The table under the views runs from the left frame; it needs that width too.
    const tableRoom = tableInCell ? 0 : LEFT + table.width + MARGIN;
    const fits = (w: number, h: number) => w >= Math.max(requiredWidth, tableRoom) && h >= requiredHeight;
    const layout = { leftCell, rightCell, upperRow, lowerRow, tableInCell, tableWidth: table.width, tableHeight: table.height };
    if (onPaper) {
      // A page for the printer is that paper itself, the views spread over it.
      if (fits(onPaper.width, onPaper.height)) plans.push({ width: onPaper.width, height: onPaper.height, paper: onPaper.name, rank: 0, ...layout });
      continue;
    }
    const paperIndex = PAPERS.findIndex(([w, h]) => fits(w, h));
    const [width, height] = PAPERS[paperIndex] ?? [Math.ceil(Math.max(requiredWidth, tableRoom)), Math.ceil(requiredHeight)];
    const paper = paperIndex >= 0 ? `ISO A${4 - paperIndex}` : null;
    plans.push({ width, height, paper, rank: paperIndex < 0 ? PAPERS.length : paperIndex, ...layout });
  }
  if (!plans.length) return null;
  // The smaller sheet; on the same sheet, the table beside the top view.
  return plans.reduce((best, plan) => (plan.rank < best.rank || (plan.rank === best.rank && plan.width * plan.height < best.width * best.height) ? plan : best));
}

/** First-angle engineering sheet(s), one unit = 1 mm: larger parts use larger sheets rather than changing scale. */
export function generateDrawing(
  meshes: readonly DrawingMesh[],
  title: string,
  labels: DrawingLabels = DRAWING_LABELS_EN,
  /** What the title block says besides the name (drawingInfo.ts); an empty field shows a dash. */
  info: Partial<DrawingInfo> = {},
  /** The day the sheet is dated; the day of the export unless a test fixes it. */
  today = new Date(),
  /** The paper the printer takes: every page of the PDF is this paper, or the drawing is the one bigger sheet. */
  printPaper: DrawingPrintPaper = "A4",
): GeneratedDrawing {
  const presets: { id: DrawingView["id"]; name: string; rotation: DrawingPoint3 }[] = [
    { id: "F", name: labels.front, rotation: [0, 0, 0] }, { id: "T", name: labels.top, rotation: [90, 0, 0] }, { id: "R", name: labels.right, rotation: [0, -90, 0] },
  ];
  const views: DrawingView[] = presets.map(({ id, name, rotation }) => {
    const projection = projectDrawingMeshes(meshes, rotation);
    return { id, name, projection, holes: findDrawingHoles(meshes, rotation, projection.center) };
  });
  const printerPaper = PRINT_PAPERS[printPaper] ?? PRINT_PAPERS.A4;
  const sheetFor = (subset: DrawingView[], onPaper: typeof printerPaper | null) => {
    const rows = drawingBoreRows({ views: subset });
    const plan = planSheet(subset, boreTableSize(rows, labels), onPaper);
    return plan ? { subset, rows, plan } : null;
  };
  const whole = sheetFor(views, null)!;
  // The pages a PDF is printed on, each exactly the printer's paper - a browser fits any other page
  // size to the paper and the drawing would no longer be 1:1. A drawing bigger than the paper is
  // split over pages of it, as long as each page's views fit one: front and side, then the top; or
  // front and top, then the side; or one view a page. Otherwise the one bigger sheet.
  const byId = (ids: string) => views.filter((entry) => ids.includes(entry.id));
  let pagePlans: Array<NonNullable<typeof whole>> = [whole];
  for (const split of [["FTR"], ["FR", "T"], ["FT", "R"], ["F", "T", "R"]]) {
    const planned = split.map((ids) => sheetFor(byId(ids), printerPaper));
    if (planned.every(Boolean)) {
      pagePlans = planned as Array<NonNullable<typeof whole>>;
      break;
    }
  }
  const draw = (entry: NonNullable<typeof whole>, sheetNumber: number, sheetCount: number) =>
    drawSheet(entry.subset, entry.rows, entry.plan, title, labels, info, today, sheetNumber, sheetCount);
  const single = draw(whole, 1, 1);
  const pages = pagePlans[0] === whole ? [single] : pagePlans.map((entry, index) => draw(entry, index + 1, pagePlans.length));
  return { ...single, title, views, pages };
}

function drawSheet(
  views: readonly DrawingView[], boreRows: readonly DrawingBoreRow[], plan: SheetPlan, title: string, labels: DrawingLabels,
  info: Partial<DrawingInfo>, today: Date, sheetNumber: number, sheetCount: number,
): DrawingSheet {
  const { width, height, paper, leftCell, rightCell, upperRow, lowerRow, tableInCell } = plan;
  // PDF's default user-space maximum is 200 inches per side.
  if (width > 5080 || height > 5080) throw new Error("The 1:1 drawing exceeds 5,080 mm. Select a smaller part.");
  const primitives: Primitive[] = [];
  const line = (a: DrawingPoint, b: DrawingPoint, width = 0.18, dash?: number[]) => primitives.push({ kind: "line", a, b, width, dash });
  const text = (at: DrawingPoint, text: string, size = 3, anchor?: "middle") => primitives.push({ kind: "text", at, text, size, anchor });
  const rectangle = (x: number, y: number, w: number, h: number, weight = 0.25) => {
    line([x, y], [x + w, y], weight); line([x + w, y], [x + w, y + h], weight);
    line([x + w, y + h], [x, y + h], weight); line([x, y + h], [x, y], weight);
  };
  const titleTop = height - MARGIN - TITLE_HEIGHT;
  const drawingBottom = titleTop - (tableInCell ? 0 : plan.tableHeight) - 6;
  const availableHeight = drawingBottom - 15;
  const rows = (upperRow ? 1 : 0) + (lowerRow ? 1 : 0);
  const rowSpace = (availableHeight - upperRow - lowerRow) / (rows + 1);
  const columnGap = leftCell && rightCell ? GAP : 0;
  const extraWidth = width - MARGIN - LEFT - leftCell - columnGap - rightCell;
  const columns = (leftCell ? 1 : 0) + (rightCell ? 1 : 0);
  const leftWidth = leftCell + extraWidth / columns;
  const rightWidth = rightCell + extraWidth / columns;
  const sideX = LEFT + (leftCell ? leftWidth / 2 : 0);
  const frontX = LEFT + (leftCell ? leftWidth + columnGap : 0) + rightWidth / 2;
  const upperTop = 15 + rowSpace;
  const lowerTop = upperTop + (upperRow ? upperRow + rowSpace : 0);
  const upperY = upperTop + (upperRow - ROW_EXTRA) / 2;
  const lowerY = lowerTop + (lowerRow - ROW_EXTRA) / 2;

  rectangle(LEFT, MARGIN, width - LEFT - MARGIN, height - MARGIN * 2, 0.45);
  for (let zone = 0; zone < 4; zone++) {
    text([LEFT + (width - LEFT - MARGIN) * (zone + 0.5) / 4, MARGIN - 3], String(zone + 1), 2.5, "middle");
  }
  const arrow = (tip: DrawingPoint, direction: DrawingPoint) => {
    const [dx, dy] = direction;
    line(tip, [tip[0] + dx * 2 - dy * 0.7, tip[1] + dy * 2 + dx * 0.7]);
    line(tip, [tip[0] + dx * 2 + dy * 0.7, tip[1] + dy * 2 - dx * 0.7]);
  };
  views.forEach((view) => {
    const ox = view.id === "R" ? sideX : frontX;
    const oy = view.id === "T" ? lowerY : upperY;
    const p = view.projection;
    const translate = ([x, y]: DrawingPoint): DrawingPoint => [ox + x, oy + y];
    // Draw hidden edges first so visible edges remain crisp.
    [...p.lines].sort((a, b) => Number(b.hidden) - Number(a.hidden)).forEach((edge) => line(translate(edge.a), translate(edge.b), edge.hidden ? 0.13 : 0.25, edge.hidden ? [2, 1] : undefined));
    const x0 = ox - p.width / 2, x1 = ox + p.width / 2, y0 = oy - p.height / 2, y1 = oy + p.height / 2;
    const dy = y1 + 10, dx = x1 + 10;
    line([x0, y1 + 1], [x0, dy + 2]); line([x1, y1 + 1], [x1, dy + 2]);
    line([x0, dy], [x1, dy]); arrow([x0, dy], [1, 0]); arrow([x1, dy], [-1, 0]);
    text([(x0 + x1) / 2 - 6, dy - 1.5], dimension(p.width));
    line([x1 + 1, y0], [dx + 2, y0]); line([x1 + 1, y1], [dx + 2, y1]);
    line([dx, y0], [dx, y1]); arrow([dx, y0], [0, 1]); arrow([dx, y1], [0, -1]);
    text([dx + 1.5, (y0 + y1) / 2], dimension(p.height));
    const captionTitle = title.length > 36 ? `${title.slice(0, 33)}...` : title;
    const caption = `${captionTitle} — ${view.name} · 1:1`;
    const cellWidth = view.id === "R" ? leftWidth : rightWidth;
    text([ox, y1 + 20], caption, Math.min(3, (cellWidth - 8) / textWidth(caption)), "middle");
    view.holes.forEach((hole, i) => {
      const [hx, hy] = translate(hole.center);
      const extent = hole.diameter / 2 + 2;
      line([hx - extent, hy], [hx + extent, hy], 0.13, [3, 1, 0.4, 1]);
      line([hx, hy - extent], [hx, hy + extent], 0.13, [3, 1, 0.4, 1]);
      // Keep labels in the table; leader IDs sit just outside the bore.
      const id = `${view.id}${i + 1}`;
      const label: DrawingPoint = [hx + hole.diameter / 2 + 3, hy - hole.diameter / 2 - 3];
      line([hx, hy], label, 0.13); text(label, id, 2.5);
    });
  });
  if (boreRows.length) {
    const { columns: widths } = boreTableSize(boreRows, labels);
    // In the cell beside the top view, centred in its row, or under the views; from the left frame.
    const tableX = LEFT;
    const tableTop = tableInCell ? lowerTop + (lowerRow - plan.tableHeight) / 2 : drawingBottom;
    const tableRight = tableInCell ? LEFT + leftWidth : width - MARGIN;
    const starts = widths.map((_, i) => tableX + 3 + widths.slice(0, i).reduce((sum, w) => sum + w, 0));
    text([tableX + 3, tableTop + 5], labels.bores, Math.min(TABLE_TEXT, (tableRight - tableX - 4) / Math.max(1, textWidth(labels.bores))));
    line([tableX, tableTop + 8], [tableRight, tableTop + 8]);
    [labels.id, labels.view, labels.diameter, "X", "Y"].forEach((head, i) => text([starts[i]!, tableTop + 12], head, TABLE_TEXT));
    boreRows.forEach((row, i) => {
      const y = tableTop + 17 + i * 5;
      [row.id, row.view, dimension(row.diameter), dimension(row.x), dimension(row.y)].forEach((value, column) => text([starts[column]!, y], value, TABLE_TEXT));
    });
  }
  const blockWidth = Math.min(180, (width - LEFT - MARGIN) * 0.7);
  const blockX = width - MARGIN - blockWidth;
  rectangle(blockX, titleTop, blockWidth, TITLE_HEIGHT, 0.35);
  line([blockX, titleTop + 14], [width - MARGIN, titleTop + 14]);
  line([blockX, titleTop + 25], [width - MARGIN, titleTop + 25]);
  line([blockX + blockWidth / 2, titleTop + 14], [blockX + blockWidth / 2, titleTop + 25]);
  for (let column = 1; column < 3; column++) line([blockX + blockWidth * column / 3, titleTop + 25], [blockX + blockWidth * column / 3, height - MARGIN]);
  text([blockX + 3, titleTop + 4], `LAYERLING · ${paper ?? labels.customSheet} · ${labels.firstAngle}`, 2);
  const displayTitle = title.length > 64 ? `${title.slice(0, 61)}...` : title;
  text([blockX + 3, titleTop + 10], displayTitle, Math.min(4, (blockWidth - 6) / Math.max(1, textWidth(displayTitle))));
  // Number / revision and name / date as typed in the export window (forum, Lofo): a long entry shrinks to fit
  // its half of the block, as the title does, and an empty one keeps the dash the sheet always had.
  const filled = (value: string | undefined) => drawingInfoText(value) || "—";
  const cellText = (at: DrawingPoint, value: string) => text(at, value, Math.min(2.5, (blockWidth / 2 - 4) / Math.max(1, textWidth(value))));
  text([blockX + 2, titleTop + 17], labels.revision, 1.8);
  cellText([blockX + 2, titleTop + 22], `${filled(info.number)} / ${filled(info.revision)}`);
  text([blockX + blockWidth / 2 + 2, titleTop + 17], labels.drawnBy, 1.8);
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  cellText([blockX + blockWidth / 2 + 2, titleTop + 22], `${filled(info.drawnBy)} / ${date}`);
  [ [labels.scale, "1:1"], [labels.units, "mm"], [labels.sheet, `${sheetNumber} / ${sheetCount}`] ].forEach(([label, value], i) => {
    const x = blockX + blockWidth * i / 3 + 2;
    text([x, titleTop + 28], label, 1.8); text([x, titleTop + 33], value, 2.5);
  });
  // Keep the manufacturing caveats separate from the drawing's title block.
  text([LEFT + 2, titleTop + 6], labels.notes, 1.8);
  labels.notesLines.forEach((note, i) => text([LEFT + 2, titleTop + 11 + i * 4], note, 1.8));
  return { width, height, primitives, paper };
}

// Helvetica advance widths (in ems) keep centered captions consistent in PDF/SVG.
function textWidth(value: string): number {
  const widths = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
  return [...value].reduce((sum, c) => sum + (c === "—" ? 1000 : c === "·" ? 278 : widths[c.charCodeAt(0) - 32] ?? 556) / 1000, 0);
}

function xml(value: string) {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export function drawingToSvg(drawing: GeneratedDrawing): string {
  const { width, height, title, primitives } = drawing;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${number(width)}mm" height="${number(height)}mm" viewBox="0 0 ${number(width)} ${number(height)}">`,
    `<title>${xml(title)}</title><desc>Layerling 1:1 dimensioned first-angle drawing</desc>`,
    '<rect width="100%" height="100%" fill="white"/>',
    ...primitives.map((p) => p.kind === "line"
      ? `<path d="M ${p.a.map(number).join(" ")} L ${p.b.map(number).join(" ")}" fill="none" stroke="black" stroke-width="${p.width}"${p.dash ? ` stroke-dasharray="${p.dash.join(" ")}"` : ""}/>`
      : `<text x="${number(p.at[0])}" y="${number(p.at[1])}"${p.anchor ? ` text-anchor="${p.anchor}"` : ""} font-family="Helvetica, Arial, sans-serif" font-size="${p.size}" fill="black">${xml(p.text)}</text>`),
    '</svg>',
  ].join("\n");
}

// Standard PDF Helvetica uses WinAnsi, with ASCII-only escaped literals so xref
// offsets are byte-exact. SVG keeps the full Unicode title.
function pdfText(value: string) {
  const extras: Record<string, number> = { "€": 128, "–": 150, "—": 151, "‘": 145, "’": 146, "“": 147, "”": 148 };
  return [...value].map((c) => {
    // Standard Helvetica lacks some Czech/Polish letters. Keep their base letter
    // readable in PDF rather than writing '?'; SVG retains the original Unicode.
    const printable = extras[c] !== undefined || c.codePointAt(0)! <= 255
      ? c : c.normalize("NFD").replace(/\p{M}/gu, "").replace(/Ł/g, "L").replace(/ł/g, "l");
    const code = extras[printable] ?? printable.codePointAt(0)!;
    if (code > 255 || code < 32) return "?";
    if (code > 126) return `\\${code.toString(8).padStart(3, "0")}`;
    return /[()\\]/.test(printable) ? `\\${printable}` : printable;
  }).join("");
}

/** Direct vector PDF download, using the same millimetre primitives as SVG: one page per sheet of `pages`. */
export function drawingToPdf(drawing: GeneratedDrawing): Uint8Array {
  const pt = 72 / 25.4;
  const n = (mm: number) => number(mm * pt);
  const sheets = drawing.pages.length ? drawing.pages : [drawing];
  const streams = sheets.map((sheet) => sheet.primitives.map((p) => p.kind === "line"
    ? `${n(p.width)} w [${(p.dash ?? []).map(n).join(" ")}] 0 d ${n(p.a[0])} ${n(sheet.height - p.a[1])} m ${n(p.b[0])} ${n(sheet.height - p.b[1])} l S`
    : `BT /F1 ${n(p.size)} Tf 1 0 0 1 ${n(p.at[0] - (p.anchor === "middle" ? textWidth(p.text) * p.size / 2 : 0))} ${n(sheet.height - p.at[1])} Tm (${pdfText(p.text)}) Tj ET`).join("\n") + "\n");
  // 1 catalog, 2 pages, 3 font, 4 info, then a page and its content for each sheet.
  const pageId = (index: number) => 5 + index * 2;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R /ViewerPreferences << /PrintScaling /None >> >>",
    `<< /Type /Pages /Kids [${sheets.map((_, index) => `${pageId(index)} 0 R`).join(" ")}] /Count ${sheets.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Title (${pdfText(drawing.title)}) /Creator (Layerling) >>`,
    ...sheets.flatMap((sheet, index) => [
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(sheet.width)} ${n(sheet.height)}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${pageId(index) + 1} 0 R >>`,
      `<< /Length ${streams[index]!.length} >>\nstream\n${streams[index]}endstream`,
    ]),
  ];
  let output = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => { offsets.push(output.length); output += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = output.length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 4 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(output);
}
