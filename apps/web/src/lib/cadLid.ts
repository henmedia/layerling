import { JoinType, type OcctKernel, type ShapeHandle } from "occt-wasm";
import { isCadModifierWasmMemoryFault } from "@/lib/cadModifierRuntime";
import type { LidType } from "@/lib/lidTool";

/*
 * The lid as an exact body (#1154). The mesh lid (lidTool.ts) is worked out first, with every check and the magnets'
 * places; where the body it closes is exact, the same lid is then built by the CAD kernel: the body cut just below
 * its rim gives its outline and opening as faces, their outlines are moved out or in (a line stays a plane, an arc a
 * cylinder) and pushed up into the plate, the lip and the rim. So its edges can be rounded like any other, and a STEP
 * file gets it round. Everything here is in the scene's frame, y up.
 */

/** A pocket for a magnet in the lid's plate, where the body stands: its middle, radius and depth below the rim. */
export type CadLidPocket = { x: number; z: number; radius: number; depth: number; overcut: number };

export type CadLidRequest = {
  type: LidType;
  thickness: number;
  gap: number;
  depth: number;
  wall: number;
  pockets: CadLidPocket[];
  /** Where the turned-over lid's box starts, as the mesh lid lies: it lands in the same place. */
  place: { x: number; y: number; z: number };
};

/** An opening smaller than this, in mm², is none, as in lidTool.ts. */
const MIN_OPENING_AREA = 1;
const FLAT = 1e-4;

/** The kernel's calls that hand back new shapes, so each can be let go of afterwards. */
const MAKING = new Set(["makeFace", "offsetWire2D", "translate", "extrude", "makeBoxFromCorners", "common", "getSubShapes", "cut", "cutAll", "fuseAll", "makeCircleEdge", "makeWire", "simplify", "transform"]);

/** The kernel, with every shape its making calls hand back noted in `made`. */
function tracking(cad: OcctKernel, made: ShapeHandle[]): OcctKernel {
  return new Proxy(cad, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver);
      if (typeof value !== "function" || typeof key !== "string" || !MAKING.has(key)) return typeof value === "function" ? value.bind(target) : value;
      return (...args: unknown[]) => {
        const out = value.apply(target, args);
        if (Array.isArray(out)) made.push(...(out as ShapeHandle[]));
        else made.push(out as ShapeHandle);
        return out;
      };
    },
  });
}

/** A face for the wire moved by `distance` outward (negative: inward), checked by its area; null when the kernel cannot. */
function moved(cad: OcctKernel, wire: ShapeHandle, distance: number): ShapeHandle | null {
  const base = cad.getSurfaceArea(cad.makeFace(wire));
  if (Math.abs(distance) < 1e-9) return cad.makeFace(wire);
  // Which way a wire moves depends on how it runs: the one whose area changes the way it should is the right one.
  for (const sign of [1, -1]) {
    try {
      const face = cad.makeFace(cad.offsetWire2D(wire, sign * distance, JoinType.Arc));
      const area = cad.getSurfaceArea(face);
      if (area > 1e-9 && (distance > 0 ? area > base + 1e-9 : area < base - 1e-9)) return face;
    } catch {
      // The other way round, or nothing.
    }
  }
  return null;
}

/** A face at the rim pushed into a block from `low` to `high`. */
function block(cad: OcctKernel, face: ShapeHandle, rim: number, low: number, high: number) {
  return cad.extrude(cad.translate(face, 0, low - rim, 0), 0, high - low, 0);
}

/**
 * The body's faces at the rim, each as its outline and its openings (a box hollowed with its top open has one face, a
 * ring). Null when an opening holds another face, a wall standing inside it: the mesh lid handles that.
 */
function rimFaces(cad: OcctKernel, body: ShapeHandle, rim: number) {
  const box = cad.getBoundingBox(body);
  const slab = cad.makeBoxFromCorners({ x: box.xmin - 1, y: rim - 1, z: box.zmin - 1 }, { x: box.xmax + 1, y: rim, z: box.zmax + 1 });
  const below = cad.common(body, slab);
  // The slab's top lies just below the rim, where the body has no face of its own: what is flat there is the cut.
  const faces = cad.getSubShapes(below, "face").filter((face) => {
    const faceBox = cad.getBoundingBox(face);
    return Math.abs(faceBox.ymin - rim) <= FLAT && Math.abs(faceBox.ymax - rim) <= FLAT;
  });
  if (!faces.length) return null;
  const outlined = faces.map((face) => {
    const wires = cad.getSubShapes(face, "wire").map((wire) => ({ wire, area: cad.getSurfaceArea(cad.makeFace(wire)) }));
    wires.sort((a, b) => b.area - a.area);
    return { outer: wires[0].wire, openings: wires.slice(1).filter(({ area }) => area >= MIN_OPENING_AREA).map(({ wire }) => wire) };
  });
  // A face inside another's opening: the lip would have to go round it.
  for (const face of outlined) {
    for (const opening of face.openings) {
      const hole = block(cad, cad.makeFace(opening), rim, rim - 1, rim);
      for (const other of outlined) {
        if (other === face) continue;
        const inside = cad.common(hole, block(cad, cad.makeFace(other.outer), rim, rim - 1, rim));
        if (cad.getVolume(inside) > 1e-6) return null;
      }
    }
  }
  return outlined;
}

/**
 * The lid for `body` built exactly, turned over and laid where `request.place` says, or null wherever the kernel cannot
 * (the editor then keeps the mesh lid).
 */
export function cadLidSolid(kernel: OcctKernel, body: ShapeHandle, request: CadLidRequest): ShapeHandle | null {
  const made: ShapeHandle[] = [];
  const cad = tracking(kernel, made);
  let result: ShapeHandle | null = null;
  try {
    const box = cad.getBoundingBox(body);
    const top = box.ymax;
    const height = top - box.ymin;
    // Just below the rim, as lidTool.ts cuts it.
    const rim = top - Math.min(0.3, height * 0.02);
    const faces = rimFaces(cad, body, rim);
    if (!faces) return null;
    // A lip needs an opening to go into; without one the mesh lid says so.
    if (request.type !== "flat" && faces.every(({ openings }) => openings.length === 0)) return null;
    const parts: ShapeHandle[] = [];
    for (const { outer, openings } of faces) {
      if (request.type === "flat" || request.type === "plug") {
        parts.push(block(cad, cad.makeFace(outer), rim, top, top + request.thickness));
      } else {
        const wide = moved(cad, outer, request.gap + request.wall);
        const inner = moved(cad, outer, request.gap);
        if (!wide || !inner) return null;
        parts.push(block(cad, wide, rim, top, top + request.thickness));
        parts.push(cad.cut(block(cad, wide, rim, top - request.depth, top), block(cad, inner, rim, top - request.depth - 1, top + 1)));
      }
      if (request.type === "plug" || request.type === "both") {
        for (const opening of openings) {
          const lip = moved(cad, opening, -request.gap);
          if (!lip) return null;
          const inside = moved(cad, opening, -(request.gap + request.wall));
          const piece = block(cad, lip, rim, top - request.depth, top);
          parts.push(inside && cad.getSurfaceArea(inside) >= MIN_OPENING_AREA
            ? cad.cut(piece, block(cad, inside, rim, top - request.depth - 1, top + 1))
            : piece);
        }
      }
    }
    let lid = parts.length === 1 ? parts[0] : cad.fuseAll(parts);
    // The lid's pockets open in the plate's underside, where it lies on the rim.
    if (request.pockets.length) {
      const pockets = request.pockets.map((pocket) => {
        const circle = cad.makeFace(cad.makeWire([cad.makeCircleEdge({ x: pocket.x, y: top - pocket.overcut, z: pocket.z }, { x: 0, y: 1, z: 0 }, pocket.radius)]));
        return cad.extrude(circle, 0, pocket.depth + pocket.overcut, 0);
      });
      lid = cad.cutAll(lid, pockets);
    }
    // One plane where plate and lip meet, so the edges are the lid's own and round cleanly.
    lid = cad.simplify(lid);
    // Turned over about the x axis (y and z change sign, nothing is mirrored), then laid where the mesh lid lies.
    const turned = cad.transform(lid, [1, 0, 0, 0, 0, -1, 0, 0, 0, 0, -1, 0]);
    const turnedBox = cad.getBoundingBox(turned);
    const placed = cad.translate(turned, request.place.x - turnedBox.xmin, request.place.y - turnedBox.ymin, request.place.z - turnedBox.zmin);
    // A lid is one piece: the edge tool wants the solid itself, not a compound round it.
    const solids = cad.isSolid(placed) ? [placed] : cad.getSubShapes(placed, "solid");
    if (solids.length !== 1 || !cad.isValid(solids[0]) || cad.getVolume(solids[0]) <= 0) return null;
    result = solids[0];
    return result;
  } catch (error) {
    // A kernel that has run out of memory goes up to the worker, which starts it again; anything else leaves the mesh lid.
    if (error instanceof Error && isCadModifierWasmMemoryFault(error.message, error.name)) throw error;
    return null;
  } finally {
    made.forEach((handle) => {
      if (handle === result) return;
      try {
        kernel.release(handle);
      } catch {
        // already gone
      }
    });
  }
}
