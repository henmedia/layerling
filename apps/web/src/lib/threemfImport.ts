import { unzipSync } from "fflate";
import { zUpToLayerling } from "@/lib/meshCoordinates";
import { importedMeshName, importedShapeFromTriangleSoup } from "@/lib/stlImport";
import type { WorkplaneShape } from "@/types/layerling";
import { normalizeHexColor, placeColoredParts } from "@/lib/coloredImport";

// ---------------------------------------------------------------------------
// 3MF spec: https://github.com/3MFConsortium/spec_core/blob/master/3MF%20Core%20Specification.md
//
// A 3MF file is a ZIP archive containing (at minimum):
//   3D/3dmodel.model  — UTF-8 XML with vertices and triangles
//
// Coordinate system: millimetres, Z-up (same as slicers).
// We apply the same zUpToLayerling transform used for STL/OBJ.
// ---------------------------------------------------------------------------

/** A 4×4 column-major transform matrix from the 3MF "m" attribute (12 values, row-major in spec). */
type Matrix4x3 = readonly [
  number, number, number,
  number, number, number,
  number, number, number,
  number, number, number,
];

const IDENTITY_M: Matrix4x3 = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];

function parseMatrix(attr: string | null): Matrix4x3 {
  if (!attr) return IDENTITY_M;
  const values = attr.trim().split(/\s+/).map(Number);
  if (values.length !== 12 || values.some((v) => !Number.isFinite(v))) return IDENTITY_M;
  return values as unknown as Matrix4x3;
}

function applyMatrix(m: Matrix4x3, x: number, y: number, z: number): [number, number, number] {
  // 3MF row-major 3×4: [m00..m02 | m10..m12 | m20..m22 | m30..m32]
  return [
    m[0] * x + m[3] * y + m[6] * z + m[9],
    m[1] * x + m[4] * y + m[7] * z + m[10],
    m[2] * x + m[5] * y + m[8] * z + m[11],
  ];
}

function isIdentity(m: Matrix4x3) {
  return m === IDENTITY_M || (
    m[0] === 1 && m[1] === 0 && m[2] === 0 &&
    m[3] === 0 && m[4] === 1 && m[5] === 0 &&
    m[6] === 0 && m[7] === 0 && m[8] === 1 &&
    m[9] === 0 && m[10] === 0 && m[11] === 0
  );
}

/** Farben und Namen einer Modelldatei, nach ihren Ressourcen-ids. */
type PropertyGroups = {
  colorGroups: Map<string, Array<string | undefined>>;
  baseMaterials: Map<string, Array<{ name?: string; color?: string }>>;
};

/** One model file of the package, with its objects by id. */
type ModelPart = { objects: Map<string, Element>; doc: Document; properties: PropertyGroups };

/** How deep components may nest before we assume a loop. */
const MAX_COMPONENT_DEPTH = 16;

function localName(element: Element) {
  return element.localName || element.nodeName.replace(/^.*:/, "");
}

/** Elemente nach ihrem Namen ohne Praefix - die Materials-Erweiterung schreibt `m:colorgroup`. */
function elementsByLocalName(root: Document | Element, name: string) {
  // Asked by name first, prefixed or not, instead of walking every element of a mesh of millions.
  const named = [...root.getElementsByTagNameNS("*", name)];
  if (named.length) return named;
  return [...root.getElementsByTagName("*")].filter((element) => localName(element) === name);
}

function parseProperties(doc: Document): PropertyGroups {
  const colorGroups = new Map<string, Array<string | undefined>>();
  elementsByLocalName(doc, "colorgroup").forEach((group) => {
    const id = group.getAttribute("id");
    if (!id) return;
    colorGroups.set(id, [...group.children].filter((child) => localName(child) === "color").map((color) => normalizeHexColor(color.getAttribute("color"))));
  });
  const baseMaterials = new Map<string, Array<{ name?: string; color?: string }>>();
  elementsByLocalName(doc, "basematerials").forEach((group) => {
    const id = group.getAttribute("id");
    if (!id) return;
    baseMaterials.set(id, [...group.children].filter((child) => localName(child) === "base").map((base) => ({
      name: base.getAttribute("name") ?? undefined,
      color: normalizeHexColor(base.getAttribute("displaycolor")),
    })));
  });
  return { colorGroups, baseMaterials };
}

function parseXml(bytes: Uint8Array, what: string) {
  const xml = new TextDecoder("utf-8").decode(bytes);
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) throw new Error(`${what} is invalid: ${parseError.textContent?.slice(0, 120)}`);
  return doc;
}

function parseModelPart(bytes: Uint8Array): ModelPart {
  const doc = parseXml(bytes, "3MF XML");
  const objects = new Map<string, Element>();
  doc.querySelectorAll("object").forEach((el) => {
    const id = el.getAttribute("id");
    if (id) objects.set(id, el);
  });
  return { doc, objects, properties: parseProperties(doc) };
}

/** The production extension's p:path, which names another model file of the package. */
function componentPath(component: Element): string | null {
  const path = component.getAttribute("p:path") ?? component.getAttributeNS("http://schemas.microsoft.com/3dmanufacturing/production/2015/06", "path");
  return path ? path.replace(/^\/+/, "").toLowerCase() : null;
}

/**
 * Was ein Slicer-Projekt ueber Filamente weiss. Bambu Studio und OrcaSlicer
 * legen das Filament je Objekt und Teil in `model_settings.config` ab und die
 * Farben der Filamente in `project_settings.config`; PrusaSlicer je Objekt und
 * Volumen (als Dreiecksbereich) in `Slic3r_PE_model.config`, die Farben in
 * `Slic3r_PE.config`. Das Filament 0 heisst: das des Objekts.
 */
type SlicerFilaments = {
  colors: Array<string | undefined>;
  objectExtruder: Map<string, number>;
  partExtruder: Map<string, number>;
  /** Ein Volumen, das nicht druckt (Modifier, negatives Volumen, Stuetzblocker), traegt `skip`. */
  volumes: Map<string, Array<{ first: number; last: number; extruder: number; skip: boolean }>>;
  /** Wie der Slicer ein Objekt nennt. */
  objectNames: Map<string, string>;
};

function fileByName(files: Record<string, Uint8Array>, name: string) {
  const key = Object.keys(files).find((entry) => entry.toLowerCase() === name.toLowerCase());
  return key ? files[key] : undefined;
}

function metadataOf(element: Element, key: string) {
  const entry = [...element.children].find((child) => localName(child) === "metadata" && child.getAttribute("key") === key);
  return entry?.getAttribute("value") ?? undefined;
}

function extruderOf(element: Element) {
  const value = Number(metadataOf(element, "extruder"));
  return Number.isInteger(value) && value > 0 ? value : 0;
}

/** PrusaSlicer: ein Volumen ist Modifier, negatives Volumen oder Stuetzblocker/-erzwinger statt Teil. */
function prusaVolumeSkipped(volume: Element) {
  if (metadataOf(volume, "modifier") === "1") return true;
  const type = metadataOf(volume, "volume_type");
  return type !== undefined && type !== "ModelPart";
}

function readSlicerFilaments(files: Record<string, Uint8Array>): SlicerFilaments | null {
  const result: SlicerFilaments = { colors: [], objectExtruder: new Map(), partExtruder: new Map(), volumes: new Map(), objectNames: new Map() };
  let found = false;

  const bambuModel = fileByName(files, "Metadata/model_settings.config");
  if (bambuModel) {
    try {
      const doc = parseXml(bambuModel, "model_settings.config");
      elementsByLocalName(doc, "object").forEach((object) => {
        const id = object.getAttribute("id");
        if (!id) return;
        found = true;
        result.objectExtruder.set(id, extruderOf(object));
        const name = metadataOf(object, "name");
        if (name) result.objectNames.set(id, name);
        [...object.children].filter((child) => localName(child) === "part").forEach((part) => {
          const partId = part.getAttribute("id");
          if (partId) result.partExtruder.set(`${id}/${partId}`, extruderOf(part));
        });
      });
    } catch {
      // Ein kaputtes Slicer-Detail kostet nur die Farbe, nicht den Import.
    }
  }
  const bambuProject = fileByName(files, "Metadata/project_settings.config");
  if (bambuProject) {
    try {
      const settings = JSON.parse(new TextDecoder("utf-8").decode(bambuProject)) as { filament_colour?: unknown };
      if (Array.isArray(settings.filament_colour)) result.colors = settings.filament_colour.map((color) => normalizeHexColor(String(color)));
    } catch {
      // wie oben
    }
  }

  const prusaModel = fileByName(files, "Metadata/Slic3r_PE_model.config");
  if (prusaModel) {
    try {
      const doc = parseXml(prusaModel, "Slic3r_PE_model.config");
      elementsByLocalName(doc, "object").forEach((object) => {
        const id = object.getAttribute("id");
        if (!id) return;
        found = true;
        result.objectExtruder.set(id, extruderOf(object));
        const name = metadataOf(object, "name");
        if (name) result.objectNames.set(id, name);
        const volumes = [...object.children].filter((child) => localName(child) === "volume").map((volume) => ({
          first: Number(volume.getAttribute("firstid")),
          last: Number(volume.getAttribute("lastid")),
          extruder: extruderOf(volume),
          skip: prusaVolumeSkipped(volume),
        })).filter((volume) => Number.isInteger(volume.first) && Number.isInteger(volume.last));
        if (volumes.length) result.volumes.set(id, volumes);
      });
    } catch {
      // wie oben
    }
  }
  const prusaConfig = fileByName(files, "Metadata/Slic3r_PE.config");
  if (prusaConfig && !result.colors.length) {
    const line = /^;\s*filament_colour\s*=\s*(.*)$/m.exec(new TextDecoder("utf-8").decode(prusaConfig));
    if (line) result.colors = line[1].split(";").map((color) => normalizeHexColor(color));
  }

  return found ? result : null;
}

/** Ein Dreieck mit seiner Farbe, so weit die Datei sie nennt. */
type ColoredTriangles = {
  positions: number[];
  /** Je Dreieck: das Objekt im Bauraum (Index in `itemNames`), aus dem es kommt. */
  items: number[];
  /** Je Objekt im Bauraum sein Name, so weit die Datei ihn nennt. */
  itemNames: Array<string | undefined>;
  /** Je Dreieck: Schluessel der Farbe ("" = keine), Farbe, Bezeichnung. */
  keys: string[];
  colors: Map<string, { color?: string; label?: string }>;
  painted: number;
};

/** Woher ein Dreieck kommt: das Objekt im Bauraum und der Teil darin - fuer die Slicer-Angaben. */
type ObjectContext = { buildObjectId: string; item: number; partId?: string };

/** Extract all vertex/triangle data from a single <object> element. */
function extractObjectMesh(
  objectEl: Element,
  part: ModelPart,
  out: ColoredTriangles,
  transform: Matrix4x3,
  context: ObjectContext,
  slicer: SlicerFilaments | null,
) {
  const meshEl = objectEl.querySelector("mesh");
  if (!meshEl) return;

  const vertexEls = meshEl.querySelectorAll("vertices > vertex");
  const vertices: [number, number, number][] = [];
  for (let i = 0; i < vertexEls.length; i++) {
    const el = vertexEls[i];
    const x = Number(el.getAttribute("x"));
    const y = Number(el.getAttribute("y"));
    const z = Number(el.getAttribute("z"));
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      throw new Error("3MF contains a non-finite vertex");
    }
    vertices.push(isIdentity(transform) ? [x, y, z] : applyMatrix(transform, x, y, z));
  }

  const objectPid = objectEl.getAttribute("pid");
  const objectPindex = Number(objectEl.getAttribute("pindex") ?? 0);
  const objectExtruder = slicer?.objectExtruder.get(context.buildObjectId) ?? 0;
  const partExtruder = context.partId ? slicer?.partExtruder.get(`${context.buildObjectId}/${context.partId}`) ?? 0 : 0;
  const volumes = slicer?.volumes.get(context.buildObjectId);

  type FoundColor = { key: string; color?: string; label?: string };
  const colorFor = (pid: string | null, index: number): FoundColor | undefined => {
    if (!pid) return undefined;
    const group = part.properties.colorGroups.get(pid);
    if (group) return group[index] ? { key: `rgb:${group[index]}`, color: group[index] } : undefined;
    const base = part.properties.baseMaterials.get(pid)?.[index];
    if (!base?.color) return undefined;
    const generic = !base.name || /^(colou?r|material|base)\s*\d*$/i.test(base.name.trim());
    return { key: `rgb:${base.color}`, color: base.color, label: generic ? undefined : base.name };
  };
  const extruderFor = (volume: { extruder: number } | undefined): FoundColor | undefined => {
    const extruder = volume?.extruder || partExtruder || objectExtruder;
    if (!extruder) return undefined;
    const color = slicer?.colors[extruder - 1];
    return color ? { key: `rgb:${color}`, color } : { key: `filament:${extruder}`, color: undefined };
  };

  const triangleEls = meshEl.querySelectorAll("triangles > triangle");
  for (let i = 0; i < triangleEls.length; i++) {
    const el = triangleEls[i];
    const v1 = Number(el.getAttribute("v1"));
    const v2 = Number(el.getAttribute("v2"));
    const v3 = Number(el.getAttribute("v3"));
    if (v1 < 0 || v1 >= vertices.length || v2 < 0 || v2 >= vertices.length || v3 < 0 || v3 >= vertices.length) {
      throw new Error("3MF triangle references out-of-range vertex");
    }
    // Ein Modifier aus PrusaSlicer steckt im selben Netz; er druckt nicht.
    const volume = volumes?.find((entry) => i >= entry.first && i <= entry.last);
    if (volume?.skip) continue;
    const [ax, ay, az] = zUpToLayerling(vertices[v1]);
    const [bx, by, bz] = zUpToLayerling(vertices[v2]);
    const [cx, cy, cz] = zUpToLayerling(vertices[v3]);
    out.positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    out.items.push(context.item);

    // Erst die Farbe am Dreieck, dann die am Objekt, dann das Filament aus
    // dem Slicer-Projekt.
    const trianglePid = el.getAttribute("pid");
    const p1 = el.getAttribute("p1");
    const own = colorFor(trianglePid ?? objectPid, Number(p1 ?? (trianglePid ? 0 : objectPindex)));
    const found = own ?? extruderFor(volume);
    if (el.hasAttribute("paint_color") || el.hasAttribute("slic3rpe:mmu_segmentation")) out.painted += 1;
    const key = found?.key ?? "";
    out.keys.push(key);
    if (found && !out.colors.has(key)) out.colors.set(key, { color: found.color, label: found.label });
  }
}

/**
 * Resolve all <item> references in <build> and gather triangles. An object is
 * either a mesh or a list of components; a component names another object,
 * in this file or - the way Bambu Studio, OrcaSlicer and PrusaSlicer write
 * their projects - in another model file of the package (p:path). Components
 * may nest.
 */
function gatherMeshes(files: Record<string, Uint8Array>, mainKey: string, main: ModelPart, slicer: SlicerFilaments | null): ColoredTriangles {
  const out: ColoredTriangles = { positions: [], items: [], itemNames: [], keys: [], colors: new Map(), painted: 0 };
  const parts = new Map<string, ModelPart>([[mainKey.toLowerCase(), main]]);
  const keyByLowerCase = new Map(Object.keys(files).map((key) => [key.toLowerCase(), key]));
  const partFor = (path: string): ModelPart | null => {
    const cached = parts.get(path);
    if (cached) return cached;
    const key = keyByLowerCase.get(path);
    if (!key) return null;
    const part = parseModelPart(files[key]);
    parts.set(path, part);
    return part;
  };

  const addObject = (part: ModelPart, partPath: string, objectEl: Element, transform: Matrix4x3, depth: number, context: ObjectContext) => {
    if (depth > MAX_COMPONENT_DEPTH) return;
    if (objectEl.querySelector(":scope > mesh")) {
      extractObjectMesh(objectEl, part, out, transform, context, slicer);
      return;
    }
    objectEl.querySelectorAll(":scope > components > component").forEach((comp) => {
      const compId = comp.getAttribute("objectid");
      if (!compId) return;
      const externalPath = componentPath(comp);
      const targetPath = externalPath ?? partPath;
      const targetPart = externalPath ? partFor(externalPath) : part;
      const compObj = targetPart?.objects.get(compId);
      if (!targetPart || !compObj) return;
      // Modifier, negative Volumen und Stuetzblocker sind keine Teile
      // (Bambu Studio und OrcaSlicer schreiben sie als type="other").
      if (!printable(compObj)) return;
      // Component first, then the transform of whatever contains it. The
      // first level of components are the slicer's parts of the object.
      addObject(targetPart, targetPath, compObj, combineTransforms(transform, parseMatrix(comp.getAttribute("transform"))), depth + 1, {
        buildObjectId: context.buildObjectId,
        item: context.item,
        partId: context.partId ?? compId,
      });
    });
  };

  const mainPath = mainKey.toLowerCase();
  const startItem = (objectId: string, objectEl: Element) => {
    out.itemNames.push(objectEl.getAttribute("name")?.trim() || slicer?.objectNames.get(objectId));
    return out.itemNames.length - 1;
  };
  // Process each <item> in <build>
  const items = main.doc.querySelectorAll("build > item");
  if (items.length === 0) {
    // Fallback: no <build> section, just import all printable objects. One
    // that is only a component of another one comes in with that one.
    const referenced = new Set([...main.doc.querySelectorAll("component")].filter((comp) => !componentPath(comp)).map((comp) => comp.getAttribute("objectid")));
    main.objects.forEach((objectEl, id) => {
      if (referenced.has(id) || !printable(objectEl)) return;
      addObject(main, mainPath, objectEl, IDENTITY_M, 0, { buildObjectId: id, item: startItem(id, objectEl) });
    });
    return out;
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const objectId = item.getAttribute("objectid");
    if (!objectId) continue;
    const transform = parseMatrix(item.getAttribute("transform"));

    const objectEl = main.objects.get(objectId);
    if (!objectEl) continue;

    // Skip support / other structural types
    if (!printable(objectEl)) continue;

    addObject(main, mainPath, objectEl, transform, 0, { buildObjectId: objectId, item: startItem(objectId, objectEl) });
  }

  return out;
}

/** Ein Objekt, das gedruckt wird: ohne type oder type="model" (3MF Core). */
function printable(objectEl: Element) {
  const type = objectEl.getAttribute("type");
  return !type || type === "model";
}

/** Combine two 3×4 row-major transforms: result = outer(inner(v)). */
function combineTransforms(outer: Matrix4x3, inner: Matrix4x3): Matrix4x3 {
  if (isIdentity(outer)) return inner;
  if (isIdentity(inner)) return outer;
  // Multiply 3×3 rotation parts and add translations
  const result: number[] = [
    outer[0]*inner[0] + outer[3]*inner[1] + outer[6]*inner[2],
    outer[1]*inner[0] + outer[4]*inner[1] + outer[7]*inner[2],
    outer[2]*inner[0] + outer[5]*inner[1] + outer[8]*inner[2],
    outer[0]*inner[3] + outer[3]*inner[4] + outer[6]*inner[5],
    outer[1]*inner[3] + outer[4]*inner[4] + outer[7]*inner[5],
    outer[2]*inner[3] + outer[5]*inner[4] + outer[8]*inner[5],
    outer[0]*inner[6] + outer[3]*inner[7] + outer[6]*inner[8],
    outer[1]*inner[6] + outer[4]*inner[7] + outer[7]*inner[8],
    outer[2]*inner[6] + outer[5]*inner[7] + outer[8]*inner[8],
    outer[0]*inner[9] + outer[3]*inner[10] + outer[6]*inner[11] + outer[9],
    outer[1]*inner[9] + outer[4]*inner[10] + outer[7]*inner[11] + outer[10],
    outer[2]*inner[9] + outer[5]*inner[10] + outer[8]*inner[11] + outer[11],
  ];
  return result as unknown as Matrix4x3;
}

function readPackage(buffer: ArrayBuffer) {
  // 1. Unzip
  let files: ReturnType<typeof unzipSync>;
  try {
    files = unzipSync(new Uint8Array(buffer));
  } catch {
    throw new Error("3MF file could not be unzipped — is the file corrupt?");
  }

  // 2. Find the model file (case-insensitive; may be in a subdirectory)
  const modelKey = Object.keys(files).find(
    (k) => k.toLowerCase() === "3d/3dmodel.model",
  );
  if (!modelKey) throw new Error("3MF file does not contain 3D/3dmodel.model");

  // 3. Parse XML and gather all triangles with their colours
  const triangles = gatherMeshes(files, modelKey, parseModelPart(files[modelKey]), readSlicerFilaments(files));
  if (!triangles.positions.length) throw new Error("3MF file contains no readable geometry");
  return triangles;
}

/**
 * Die ganze Datei als ein Koerper, wie bisher. Darueber baut eine .lyl einen
 * einteiligen 3MF-Import aus der mitgespeicherten Datei wieder auf.
 */
export function importedShapeFrom3mf(fileName: string, buffer: ArrayBuffer): WorkplaneShape {
  // Normals computed from triangle positions
  return importedShapeFromTriangleSoup(fileName, readPackage(buffer).positions, undefined, "3mf");
}

export type ThreeMfImportResult = {
  shapes: WorkplaneShape[];
  /** Mehr als ein Objekt oder eine Farbe: je ein Koerper, die ihr Netz selbst tragen. */
  split: boolean;
  /** Wie viele Objekte im Bauraum Dreiecke beitragen. */
  objects: number;
  /** Dreiecke, die im Slicer bemalt wurden - deren Farben liest layerling nicht. */
  painted: number;
};

/** Ein Name aus dem Slicer ohne die Endung der Quelldatei ("tray.step" -> "tray"). */
function itemLabel(name: string | undefined) {
  return name?.replace(/\.(step|stp|stl|obj|3mf|amf)$/i, "").trim() || undefined;
}

/**
 * Eine 3MF wird zu einem Koerper je Objekt im Bauraum und darin je Farbe, alle
 * an ihrem Platz zueinander. Die Farbe kommt aus der Datei selbst
 * (`basematerials`, `m:colorgroup`, auch je Dreieck - so schreibt layerling)
 * oder aus dem Filament, das Bambu Studio, OrcaSlicer oder PrusaSlicer einem
 * Objekt oder Teil zugewiesen hat. Ein Objekt in einer Farbe bleibt ein
 * Koerper wie bisher.
 */
export function importedShapesFrom3mf(fileName: string, buffer: ArrayBuffer): ThreeMfImportResult {
  const triangles = readPackage(buffer);
  const order: Array<{ item: number; key: string }> = [];
  const byGroup = new Map<string, number[]>();
  triangles.keys.forEach((key, index) => {
    const item = triangles.items[index];
    const group = `${item}|${key}`;
    let positions = byGroup.get(group);
    if (!positions) {
      positions = [];
      byGroup.set(group, positions);
      order.push({ item, key });
    }
    for (let offset = index * 9; offset < index * 9 + 9; offset += 1) positions.push(triangles.positions[offset]);
  });
  const objects = new Set(order.map((group) => group.item)).size;

  if (order.length <= 1) {
    const whole = importedShapeFromTriangleSoup(fileName, triangles.positions, undefined, "3mf");
    const color = triangles.colors.get(order[0]?.key ?? "")?.color;
    return { shapes: [color ? { ...whole, color } : whole], split: false, objects, painted: triangles.painted };
  }
  const colorsIn = (item: number) => order.filter((group) => group.item === item).length;
  const seenIn = new Map<number, number>();
  // The parts are named after the file as one body would be; that body itself is not built.
  const shapes = placeColoredParts(
    importedMeshName(fileName, "3mf"),
    order.map(({ item, key }) => {
      const found = triangles.colors.get(key);
      const nth = (seenIn.get(item) ?? 0) + 1;
      seenIn.set(item, nth);
      // Mehrere Objekte: der Name des Objekts, bei mehreren Farben darin dazu
      // die Farbe - oder, wenn sie keinen Namen hat (ein Filament), ihre Nummer.
      const label = objects > 1
        ? [itemLabel(triangles.itemNames[item]), colorsIn(item) > 1 ? found?.label || String(nth) : undefined].filter(Boolean).join(" ") || undefined
        : found?.label;
      return { color: found?.color, label, positions: byGroup.get(`${item}|${key}`)! };
    }),
    (positions) => importedShapeFromTriangleSoup(fileName, positions, undefined, "3mf"),
  );
  return { shapes, split: true, objects, painted: triangles.painted };
}
