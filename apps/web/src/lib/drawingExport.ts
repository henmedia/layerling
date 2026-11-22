import * as THREE from "three";
import { drawingInfoText, type DrawingInfo } from "@/lib/drawingInfo";
import { drawingRotation, projectDrawingMeshes, type DrawingMesh, type DrawingPoint, type DrawingPoint3, type DrawingProjection } from "@/lib/drawingProjection";

export type DrawingHole = { center: DrawingPoint; diameter: number };
type Stroke = { kind: "line"; a: DrawingPoint; b: DrawingPoint; width: number; dash?: number[] };
type Label = { kind: "text"; at: DrawingPoint; text: string; size: number; anchor?: "middle" };
type Primitive = Stroke | Label;
/** `id` is the letter of the view in the bore table (F, T, R); `name` is what the sheet calls it. */
export type DrawingView = { id: "F" | "T" | "R"; name: string; projection: DrawingProjection; holes: DrawingHole[] };
export type GeneratedDrawing = {
  width: number; height: number; title: string; primitives: Primitive[];
  /** "ISO A3" and the like, or null when the sheet had to grow past A0. */
  paper: string | null;
  views: DrawingView[];
};

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

/** First-angle engineering sheet: right view to the left, top below front.
 * One unit = 1 mm; larger parts use larger sheets rather than changing scale. */
export function generateDrawing(
  meshes: readonly DrawingMesh[],
  title: string,
  labels: DrawingLabels = DRAWING_LABELS_EN,
  /** What the title block says besides the name (drawingInfo.ts); an empty field shows a dash. */
  info: Partial<DrawingInfo> = {},
  /** The day the sheet is dated; the day of the export unless a test fixes it. */
  today = new Date(),
): GeneratedDrawing {
  const presets: { id: DrawingView["id"]; name: string; rotation: DrawingPoint3 }[] = [
    { id: "F", name: labels.front, rotation: [0, 0, 0] }, { id: "T", name: labels.top, rotation: [90, 0, 0] }, { id: "R", name: labels.right, rotation: [0, -90, 0] },
  ];
  const views: DrawingView[] = presets.map(({ id, name, rotation }) => {
    const projection = projectDrawingMeshes(meshes, rotation);
    return { id, name, projection, holes: findDrawingHoles(meshes, rotation, projection.center) };
  });
  const [front, top, side] = views.map((v) => v.projection);
  const boreRows = drawingBoreRows({ views });
  const left = 20, margin = 10, gap = 12, titleHeight = 36;
  // Reserve space for dimensions and captions, even on very small parts.
  const sideCell = Math.max(100, side.width + 32);
  const frontCell = Math.max(100, front.width + 32, top.width + 32);
  const upperRow = Math.max(front.height, side.height) + 28;
  const lowerRow = top.height + 28;
  const tableHeight = boreRows.length ? 18 + boreRows.length * 5 : 0;
  const requiredWidth = left + sideCell + gap + frontCell + margin;
  const requiredHeight = 15 + upperRow + gap + lowerRow + tableHeight + 6 + titleHeight + margin;
  const papers = [[297, 210], [420, 297], [594, 420], [841, 594], [1189, 841]];
  const paperIndex = papers.findIndex(([w, h]) => w >= requiredWidth && h >= requiredHeight);
  const [width, height] = papers[paperIndex] ?? [Math.ceil(requiredWidth), Math.ceil(requiredHeight)];
  // PDF's default user-space maximum is 200 inches per side.
  if (width > 5080 || height > 5080) throw new Error("The 1:1 drawing exceeds 5,080 mm. Select a smaller part.");
  const primitives: Primitive[] = [];
  const line = (a: DrawingPoint, b: DrawingPoint, width = 0.18, dash?: number[]) => primitives.push({ kind: "line", a, b, width, dash });
  const text = (at: DrawingPoint, text: string, size = 3, anchor?: "middle") => primitives.push({ kind: "text", at, text, size, anchor });
  const rectangle = (x: number, y: number, w: number, h: number, weight = 0.25) => {
    line([x, y], [x + w, y], weight); line([x + w, y], [x + w, y + h], weight);
    line([x + w, y + h], [x, y + h], weight); line([x, y + h], [x, y], weight);
  };
  const titleTop = height - margin - titleHeight;
  const drawingBottom = titleTop - tableHeight - 6;
  const availableHeight = drawingBottom - 15;
  const rowSpace = (availableHeight - upperRow - lowerRow) / 3;
  const extraWidth = width - margin - left - sideCell - gap - frontCell;
  const sideX = left + (sideCell + extraWidth / 2) / 2;
  const frontX = left + sideCell + extraWidth / 2 + gap + (frontCell + extraWidth / 2) / 2;
  const frontY = 15 + rowSpace + (upperRow - 28) / 2;
  const topY = 15 + rowSpace * 2 + upperRow + (lowerRow - 28) / 2;

  rectangle(left, margin, width - left - margin, height - margin * 2, 0.45);
  for (let zone = 0; zone < 4; zone++) {
    text([left + (width - left - margin) * (zone + 0.5) / 4, margin - 3], String(zone + 1), 2.5, "middle");
  }
  const arrow = (tip: DrawingPoint, direction: DrawingPoint) => {
    const [dx, dy] = direction;
    line(tip, [tip[0] + dx * 2 - dy * 0.7, tip[1] + dy * 2 + dx * 0.7]);
    line(tip, [tip[0] + dx * 2 + dy * 0.7, tip[1] + dy * 2 - dx * 0.7]);
  };
  const origins: DrawingPoint[] = [[frontX, frontY], [frontX, topY], [sideX, frontY]];
  views.forEach((view, index) => {
    const [ox, oy] = origins[index]!;
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
    const cellWidth = (index === 2 ? sideCell : frontCell) + extraWidth / 2;
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
    text([left + 3, drawingBottom + 5], labels.bores, 2.5);
    line([left, drawingBottom + 8], [width - margin, drawingBottom + 8]);
    text([left + 3, drawingBottom + 12], labels.id, 2.5); text([left + 20, drawingBottom + 12], labels.view, 2.5);
    text([left + 56, drawingBottom + 12], labels.diameter, 2.5); text([left + 86, drawingBottom + 12], "X", 2.5); text([left + 116, drawingBottom + 12], "Y", 2.5);
  }
  boreRows.forEach((row, i) => {
    const y = drawingBottom + 17 + i * 5;
    text([left + 3, y], row.id, 2.5); text([left + 20, y], row.view, 2.5); text([left + 56, y], dimension(row.diameter), 2.5);
    text([left + 86, y], dimension(row.x), 2.5);
    text([left + 116, y], dimension(row.y), 2.5);
  });
  const blockWidth = Math.min(180, (width - left - margin) * 0.7);
  const blockX = width - margin - blockWidth;
  rectangle(blockX, titleTop, blockWidth, titleHeight, 0.35);
  line([blockX, titleTop + 14], [width - margin, titleTop + 14]);
  line([blockX, titleTop + 25], [width - margin, titleTop + 25]);
  line([blockX + blockWidth / 2, titleTop + 14], [blockX + blockWidth / 2, titleTop + 25]);
  for (let column = 1; column < 3; column++) line([blockX + blockWidth * column / 3, titleTop + 25], [blockX + blockWidth * column / 3, height - margin]);
  const paper = paperIndex >= 0 ? `ISO A${4 - paperIndex}` : null;
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
  [ [labels.scale, "1:1"], [labels.units, "mm"], [labels.sheet, "1 / 1"] ].forEach(([label, value], i) => {
    const x = blockX + blockWidth * i / 3 + 2;
    text([x, titleTop + 28], label, 1.8); text([x, titleTop + 33], value, 2.5);
  });
  // Keep the manufacturing caveats separate from the drawing's title block.
  text([left + 2, titleTop + 6], labels.notes, 1.8);
  labels.notesLines.forEach((note, i) => text([left + 2, titleTop + 11 + i * 4], note, 1.8));
  return { width, height, title, primitives, paper, views };
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

/** Direct vector PDF download, using the same millimetre primitives as SVG. */
export function drawingToPdf(drawing: GeneratedDrawing): Uint8Array {
  const pt = 72 / 25.4;
  const n = (mm: number) => number(mm * pt);
  const stream = drawing.primitives.map((p) => p.kind === "line"
    ? `${n(p.width)} w [${(p.dash ?? []).map(n).join(" ")}] 0 d ${n(p.a[0])} ${n(drawing.height - p.a[1])} m ${n(p.b[0])} ${n(drawing.height - p.b[1])} l S`
    : `BT /F1 ${n(p.size)} Tf 1 0 0 1 ${n(p.at[0] - (p.anchor === "middle" ? textWidth(p.text) * p.size / 2 : 0))} ${n(drawing.height - p.at[1])} Tm (${pdfText(p.text)}) Tj ET`).join("\n") + "\n";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R /ViewerPreferences << /PrintScaling /None >> >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(drawing.width)} ${n(drawing.height)}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
    `<< /Title (${pdfText(drawing.title)}) /Creator (Layerling) >>`,
  ];
  let output = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => { offsets.push(output.length); output += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = output.length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(output);
}
