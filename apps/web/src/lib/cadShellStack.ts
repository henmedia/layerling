import type { OcctKernel, ShapeHandle } from "occt-wasm";
import { block, moved, rimFaces, tracking } from "@/lib/cadLid";
import { type ShellStackFoot, SHELL_STACK_GRIP_AT_MAX, SHELL_STACK_GRIP_RIM, normalizeShellStackFoot, shellStackGripHeight, DEFAULT_SHELL_STACK_HEIGHT, SHELL_STACK_FOOT_CHAMFER, SHELL_STACK_MAX_HEIGHT, SHELL_STACK_MIN_DEPTH, SHELL_STACK_MIN_HEIGHT, SHELL_STACK_MIN_WALL, SHELL_STACK_PLAY, clampShellStackHeight, shellStackFloor, shellStackInset } from "@/lib/shellStackLimits";
import { STACK_FAILED_MESSAGE, STACK_NEEDS_TOP_MESSAGE, STACK_NOT_STRAIGHT_MESSAGE, STACK_TOO_LOW_MESSAGE, STACK_WALL_THIN_MESSAGE } from "@/lib/shellStackMessages";

export { DEFAULT_SHELL_STACK_HEIGHT, SHELL_STACK_FOOT_CHAMFER, SHELL_STACK_MAX_HEIGHT, SHELL_STACK_MIN_DEPTH, SHELL_STACK_MIN_HEIGHT, SHELL_STACK_MIN_WALL, SHELL_STACK_PLAY, clampShellStackHeight, shellStackFloor, shellStackInset };
export { STACK_FAILED_MESSAGE, STACK_NEEDS_TOP_MESSAGE, STACK_NOT_STRAIGHT_MESSAGE, STACK_TOO_LOW_MESSAGE, STACK_WALL_THIN_MESSAGE };

/*
 * Stacking for a hollowed box with its top open, the way Gridfinity bins stack: the bottom is a foot, narrower than the box by
 * the wall and a little play per side, that goes into the opening of the box below; above it the box widens to its full size
 * at 45 degrees, so it prints standing on its foot without support. The floor is raised to the top of that widening and the
 * foot is solid, so nothing in it is thin. The top stays as it was: every lid fits as before. The foot's lowest edge is
 * chamfered a little against the squash of the first layer. Everything here is in the scene's frame, y up.
 */

/** The area of what the outlines of the faces at the rim enclose, in mm². */
function outerArea(cad: OcctKernel, faces: Array<{ outer: ShapeHandle }>) {
  return faces.reduce((sum, { outer }) => sum + cad.getSurfaceArea(cad.makeFace(outer)), 0);
}

/**
 * The hollowed `solid` (made from `original`, the body before, which holds the cavity as solid) with the foot. Throws an error
 * with one of the messages above where it cannot be done; the caller shows it.
 */
export function shellStackSolid(kernel: OcctKernel, solid: ShapeHandle, height: number, wall: number, original: ShapeHandle, footStyle?: ShellStackFoot | null): ShapeHandle {
  const made: ShapeHandle[] = [];
  const cad = tracking(kernel, made);
  let result: ShapeHandle | null = null;
  try {
    const foot = clampShellStackHeight(height);
    const style = normalizeShellStackFoot(footStyle);
    if (wall < SHELL_STACK_MIN_WALL - 1e-9) throw new Error(STACK_WALL_THIN_MESSAGE);
    const box = cad.getBoundingBox(solid);
    const top = box.ymax;
    const bottom = box.ymin;
    const total = top - bottom;
    const inset = shellStackInset(wall);
    const floorTop = bottom + shellStackFloor(foot, wall);
    // The raised floor and the room above it fit into the body's height.
    if (top - floorTop < SHELL_STACK_MIN_DEPTH) throw new Error(STACK_TOO_LOW_MESSAGE);
    const rim = top - Math.min(0.3, total * 0.02);
    const faces = rimFaces(cad, solid, rim);
    if (!faces || faces.length === 0 || faces.every(({ openings }) => openings.length === 0)) throw new Error(STACK_NEEDS_TOP_MESSAGE);
    // The foot of the box above goes into the opening of the box below: the walls stand straight between just above the foot
    // and half way up. Measured there, not at the very bottom and top, so a rounded or chamfered bottom or top edge counts
    // as straight: the foot is cut out of the bottom one anyway, and a top edge rounded outside leaves the opening as it is.
    const footPlane = Math.min(bottom + foot + inset + 0.5, top - 0.5);
    const midPlane = (footPlane + top) / 2;
    const footFaces = rimFaces(cad, solid, footPlane);
    const midFaces = rimFaces(cad, solid, midPlane);
    if (!footFaces || !midFaces) throw new Error(STACK_NOT_STRAIGHT_MESSAGE);
    const midArea = outerArea(cad, midFaces);
    if (Math.abs(midArea - outerArea(cad, footFaces)) > 0.01 * midArea) throw new Error(STACK_NOT_STRAIGHT_MESSAGE);
    // The foot is the opening at the top, less the play: it fits whatever narrows the opening there (a top edge rounded outside
    // narrows it a little). Above the foot the box widens at 45 degrees by the wall and the play.
    // Cut at the very top first; where the kernel cannot move that outline (its edges come out broken there, as after a
    // rounded bottom), a little lower, then half way up, where the walls stand straight.
    let found: { lip: number; feet: Array<{ hole: ShapeHandle; foot: ShapeHandle; lowest: ShapeHandle | null; inner: ShapeHandle | null }> } | null = null;
    for (const lip of [top - 0.02, top - 0.3, midPlane]) {
      const faces = rimFaces(cad, solid, lip);
      if (!faces || faces.every(({ openings: holes }) => holes.length === 0)) continue;
      const feet = faces.flatMap(({ openings: holes }) => holes.map((hole) => ({ hole, foot: moved(cad, hole, -SHELL_STACK_PLAY), lowest: moved(cad, hole, -(SHELL_STACK_PLAY + SHELL_STACK_FOOT_CHAMFER)), inner: style?.hollow ? moved(cad, hole, -(SHELL_STACK_PLAY + wall)) : null })));
      if (feet.every(({ foot: f, inner }) => f && (!style?.hollow || inner))) {
        found = { lip, feet: feet as Array<{ hole: ShapeHandle; foot: ShapeHandle; lowest: ShapeHandle | null; inner: ShapeHandle | null }> };
        break;
      }
    }
    if (!found) throw new Error(STACK_FAILED_MESSAGE);
    const { lip } = found;
    const keep: ShapeHandle[] = [];
    const chamfer = Math.min(SHELL_STACK_FOOT_CHAMFER, foot / 2);
    for (const { foot: footFace, lowest } of found.feet) {
      if (lowest && chamfer > 0) {
        // The lowest edge: widening at 45 degrees from the chamfer's inset to the foot's.
        keep.push(cad.draftPrism(cad.translate(lowest, 0, bottom - lip, 0), 0, chamfer, 0, -45));
        keep.push(block(cad, footFace, lip, bottom + chamfer, bottom + foot));
      } else {
        keep.push(block(cad, footFace, lip, bottom - 1, bottom + foot));
      }
      // Above the foot, widening at 45 degrees to the full outline.
      // It runs on past the outline; the body's own outside cuts it back, so no hair-thin ring is left where they meet.
      keep.push(cad.draftPrism(cad.translate(footFace, 0, bottom + foot - lip, 0), 0, inset + 1, 0, -45));
    }
    const wide = { x0: box.xmin - 1, z0: box.zmin - 1, x1: box.xmax + 1, z1: box.zmax + 1 };
    const slab = (low: number, high: number) => cad.makeBoxFromCorners({ x: wide.x0, y: low, z: wide.z0 }, { x: wide.x1, y: high, z: wide.z1 });
    const feet = cad.fuseAll(keep);
    // Starting inside the widening, which runs on past the outline: no hair-thin ring where they meet.
    keep.push(slab(bottom + foot + inset + 0.3, top + 1));
    // The floor raised to the top of the widening: the foot is solid.
    // Within the cavity's outline only, from the bottom: the outside (a rounded bottom edge) is not touched twice.
    // The cavity's outline half way up, where the walls stand straight (the top may be narrowed by a rounded edge).
    const middle = rimFaces(cad, solid, midPlane) ?? [];
    // A hollow foot: filled only up to where the inside's own 45 degree widening ends, then hollowed out again below.
    // Its inside widens a little higher than the outside, so the slope keeps the wall's thickness square to it.
    const rise = wall * (Math.SQRT2 - 1);
    const fillTop = style?.hollow ? bottom + foot + rise + inset : floorTop;
    // A hollow foot's inside: the wall's thickness in from the foot, from the floor (a wall thick) up, widening at 45 degrees
    // to the inside above, and on up into it. It is left out of the fill rather than cut out after: filling and cutting
    // the same place again leaves a sheet in the kernel where the two meet.
    const hollow: ShapeHandle[] = [];
    if (style?.hollow) {
      for (const { hole, inner } of found.feet) {
        if (!inner) continue;
        // The widening runs on past the inside and is cut back to it, so it ends exactly on the inside's own wall: ending it
        // there by itself leaves a ring a hundredth of a millimetre wide, which the mesher fills as a sheet across the box.
        const column = block(cad, cad.makeFace(hole), lip, bottom + wall, fillTop + 1);
        const widening = cad.draftPrism(cad.translate(inner, 0, bottom + foot + rise - lip, 0), 0, inset + 1, 0, -45);
        hollow.push(cad.common(cad.fuse(block(cad, inner, lip, bottom + wall, bottom + foot + rise + 0.01), widening), column));
      }
    }
    // A hair wider than the inside, into the wall: a fill face lying on a round wall leaves a sheet in the kernel.
    const fill = middle.flatMap(({ openings: holes }) => holes.map((hole) => {
      const wider = moved(cad, hole, 0.05);
      const whole = block(cad, wider ?? cad.makeFace(hole), midPlane, bottom, fillTop);
      return hollow.reduce((current, tool) => cad.cut(current, tool), whole);
    }));
    if (!fill.length) throw new Error(STACK_FAILED_MESSAGE);
    const filled = cad.fuseAll([solid, ...fill]);
    let body = cad.common(filled, cad.fuseAll(keep));
    let solids = cad.isSolid(body) ? [body] : cad.getSubShapes(body, "solid");
    if (solids.length !== 1) {
      // The kernel sometimes loses that common part (a rounded bottom edge): the same cut the other way, as what goes away.
      body = cad.cut(filled, cad.cut(slab(bottom - 1, bottom + foot + inset - 0.005), feet));
      solids = cad.isSolid(body) ? [body] : cad.getSubShapes(body, "solid");
    }
    if (style?.grip && solids.length === 1) {
      // The grip: a recess at the front (+z) of the bottom, `grip` wide and `gripDepth` deep, its ceiling at 45 degrees so it
      // prints without support. Where it comes near the inside, a hump the wall's thickness round it closes it off.
      // On each side asked for (the front by default), in the middle of it; never wider than that side less 2 mm each end.
      const depth = style.gripDepth ?? 4;
      const gripWidth = style.grip;
      const tall = Math.min(shellStackGripHeight(foot, depth, style.gripHeight), top - bottom - SHELL_STACK_GRIP_RIM);
      // Up the side: at 0 % open at the bottom, at 100 % its top 2 mm under the rim; in between a pocket with a floor.
      const at = Math.min(SHELL_STACK_GRIP_AT_MAX, Math.max(0, style.gripAt ?? 0)) / 100;
      const low = at > 0 ? bottom + at * Math.max(0, top - SHELL_STACK_GRIP_RIM - tall - bottom) : bottom - 1;
      const high = (at > 0 ? low : bottom) + tall;
      const middle = { x: (box.xmin + box.xmax) / 2, z: (box.zmin + box.zmax) / 2 };
      // Each side: the axis along it, the face's coordinate across it, and which way is out.
      const sideOf = { front: { along: "x", face: box.zmax, out: 1 }, back: { along: "x", face: box.zmin, out: -1 }, right: { along: "z", face: box.xmax, out: 1 }, left: { along: "z", face: box.xmin, out: -1 } } as const;
      // The recess seen from its side: its floor at `from` (level, it prints), its inner face `inward` in, its ceiling from
      // `to` at the outside down at 45 degrees. The hump round it, a wall thicker, slopes at 45 degrees underneath too.
      const profile = (side: keyof typeof sideOf, wide: number, inward: number, from: number, to: number, under = 0) => {
        const { along, face, out } = sideOf[side];
        const length = along === "x" ? box.xmax - box.xmin : box.zmax - box.zmin;
        const width = Math.min(wide, length - 4);
        const start = (along === "x" ? middle.x : middle.z) - width / 2;
        // A point `o` outward of the face (negative: in) at height y, at the start of the width.
        const at2 = (o: number, y: number) => (along === "x" ? { x: start, y, z: face + out * o } : { x: face + out * o, y, z: start });
        const points = [at2(1, from - under), at2(-inward, from), at2(-inward, to - inward), at2(0, to), at2(1, to)];
        const edges = points.map((point, index) => cad.makeLineEdge(point, points[(index + 1) % points.length]));
        return cad.extrude(cad.makeFace(cad.makeWire(edges)), along === "x" ? width : 0, 0, along === "z" ? width : 0);
      };
      const sides = style.gripSides?.length ? style.gripSides : (["front"] as const);
      const envelope = cad.common(original, cad.fuseAll(keep));
      const recess = cad.fuseAll(sides.map((side) => profile(side, gripWidth, depth, low, high)));
      const hump = cad.common(cad.fuseAll(sides.map((side) => profile(side, gripWidth + 2 * wall, depth + wall, at > 0 ? low - wall : low, high + wall * Math.SQRT2, at > 0 ? depth + wall + 1 : 0))), envelope);
      body = cad.cut(cad.fuse(solids[0], hump), recess);
      solids = cad.isSolid(body) ? [body] : cad.getSubShapes(body, "solid");
    }
    body = cad.simplify(solids.length === 1 ? solids[0] : body);
    solids = cad.isSolid(body) ? [body] : cad.getSubShapes(body, "solid");
    if (solids.length !== 1 || !cad.isValid(solids[0]) || cad.getVolume(solids[0]) <= 0) throw new Error(STACK_FAILED_MESSAGE);
    result = solids[0];
    return result;
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
