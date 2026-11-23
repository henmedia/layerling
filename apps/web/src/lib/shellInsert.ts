import type { CrossSection, ManifoldToplevel, Mat4 } from "manifold-3d";
import type { ManifoldSolid } from "@/lib/editorMeshCore";

/**
 * The dividers of a hollowed box as a loose insert (asked for with the box generator, now with Hollow): a thin plate
 * that lies on the box's floor, the play smaller than the box's inside all round, with the dividers standing on it as
 * they would stand in the box. The box itself is hollowed without them and stays smooth inside, so the insert can be
 * taken out and the box used as one compartment, or another insert put in.
 *
 * It is worked out from two bodies, both as Hollow makes them: the box with its dividers and the box without. Cut level
 * at a height, the second leaves the opening and the difference of the two the dividers, so any box Hollow can divide
 * gets its insert: turned on the plate, with walls set by hand or at a slant, round. The insert must go in from above:
 * at every height it is no wider than the opening is there and anywhere above it, the play less, so rounded edges at the
 * floor and walls that lean are cleared in steps.
 */

export const SHELL_INSERT_PLATE = 0.8;
export const SHELL_INSERT_PLAY = 0.25;
export const MIN_SHELL_INSERT_PLAY = 0.05;
export const MAX_SHELL_INSERT_PLAY = 1;

export type ShellInsertError = "notOpen" | "noDividers" | "tooSmall";
export type ShellInsertResult = { insert: ManifoldSolid; plate: number; height: number; play: number } | { error: ShellInsertError };

const SCENE_TO_UP: Mat4 = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1];
const UP_TO_SCENE: Mat4 = [1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1];
/** An opening or a wall's section smaller than this, in mm², is none. */
const MIN_AREA = 1;
/** Slabs reach this far into the one below, so they are joined and do not merely touch. */
const BITE = 0.02;
/** How finely the floor and the dividers' top are found, in mm. */
const FOUND = 0.02;

type Kept = { delete?: () => void };

/**
 * The insert for the box `smooth` (hollowed without dividers) whose dividers are those of `divided` (the same box
 * hollowed with them), both in the scene's frame (y up) and in the same place: sitting in the box, on its floor.
 * `play` is the room between the insert and the box per side, `plate` the plate's thickness; the dividers stand as high
 * as in `divided`, so the plate takes its thickness from them, not from the room above.
 */
export function shellInsertForSolids(runtime: ManifoldToplevel, divided: ManifoldSolid, smooth: ManifoldSolid, options: { play?: number; plate?: number } = {}): ShellInsertResult {
  const play = Math.min(MAX_SHELL_INSERT_PLAY, Math.max(MIN_SHELL_INSERT_PLAY, options.play ?? SHELL_INSERT_PLAY));
  const plate = Math.max(0.4, options.plate ?? SHELL_INSERT_PLATE);
  const created: Kept[] = [];
  const keep = <T extends Kept>(value: T): T => {
    created.push(value);
    return value;
  };
  try {
    const box = keep(smooth.transform(SCENE_TO_UP));
    const walled = keep(divided.transform(SCENE_TO_UP));
    const bounds = box.boundingBox();
    const bottom = bounds.min[2];
    const top = bounds.max[2];
    const height = top - bottom;
    const rim = top - Math.min(0.3, height * 0.02);
    const filled = (section: CrossSection) => keep(new runtime.CrossSection(section.toPolygons().filter((polygon) => {
      let area = 0;
      polygon.forEach(([x, y], index) => {
        const [nx, ny] = polygon[(index + 1) % polygon.length];
        area += x * ny - nx * y;
      });
      return area > 0;
    }), "Positive"));
    /** What is open at a height: inside the body's outline, and no body. */
    const openingAt = (z: number) => {
      const cut = keep(box.slice(z));
      return keep(filled(cut).subtract(cut));
    };
    const atRim = openingAt(rim);
    if (atRim.area() < MIN_AREA) return { error: "notOpen" };
    // The floor: the lowest height at which the box is open, found between the bottom and the rim.
    let closed = bottom;
    let open = rim;
    while (open - closed > FOUND) {
      const middle = (open + closed) / 2;
      if (openingAt(middle).area() >= MIN_AREA) open = middle;
      else closed = middle;
    }
    const floor = open;
    // The dividers at a height: what the box with dividers has there and the box without has not. Where the two bodies'
    // walls differ by a facet, slivers of it lie in the wall, outside the insert's outline, which cuts them away.
    const wallsAt = (z: number) => keep(keep(walled.slice(z)).subtract(keep(box.slice(z))));
    // Dividers stand 3 mm high at least: looked for a little above the floor, clear of its rounded edges where they are small.
    const probe = Math.min(floor + 1.5, (floor + rim) / 2);
    const walls = wallsAt(probe);
    if (walls.area() < MIN_AREA) return { error: "noDividers" };
    // Their top: the highest height at which there are still dividers.
    let standing = probe;
    let above = top + FOUND;
    while (above - standing > FOUND) {
      const middle = (above + standing) / 2;
      if (middle < top && wallsAt(middle).area() >= walls.area() * 0.5) standing = middle;
      else above = middle;
    }
    const wallTop = Math.min(top, above);
    if (wallTop - floor <= plate + 0.5) return { error: "tooSmall" };
    // The dividers seen from above, taken high up: near the floor a rounded edge of the box hides their ends.
    const section = wallsAt(floor + plate + 0.75 * (wallTop - floor - plate));
    // The heights the insert is cut to the opening at: close together near the floor, where its edges may be rounded,
    // then in quarters up to the dividers' top; the plate's top is one of them.
    const steps = new Set<number>([0.05, 0.4, plate, 1.2, 1.6, 2.4, 3.2, 4.5, 6].filter((step) => floor + step < wallTop - 0.05).map((step) => Math.round((floor + step) * 1000) / 1000));
    for (const share of [0.25, 0.5, 0.75]) steps.add(Math.round((floor + plate + share * (wallTop - floor - plate)) * 1000) / 1000);
    const heights = [...steps].sort((a, b) => b - a);
    // From the rim down: what is open at a height and at every height above it, so what goes down into the box.
    let free = atRim;
    if (wallTop < rim) free = keep(free.intersect(openingAt(wallTop - FOUND)));
    const levels: { z: number; free: CrossSection }[] = [];
    for (const z of heights) {
      free = keep(free.intersect(openingAt(z)));
      levels.push({ z, free });
    }
    // Slabs from each height up to the one above it, each with the outline that is free at its own foot.
    const slabs: ManifoldSolid[] = [];
    const prism = (area: CrossSection, low: number, high: number) => keep(keep(area.extrude(high - low)).translate([0, 0, low]));
    levels.forEach((level, index) => {
      const upper = index === 0 ? wallTop : levels[index - 1].z;
      const lowest = index === levels.length - 1;
      const outline = keep(level.free.offset(-play, "Round", 2, 48));
      if (outline.area() < MIN_AREA) return;
      // The lowest slab stands on the floor itself; the others reach a little into the one below.
      const low = lowest ? floor : level.z - BITE;
      const area = upper <= floor + plate + 1e-6 ? outline : keep(outline.intersect(section));
      if (area.area() < 0.01) return;
      slabs.push(prism(area, low, upper));
    });
    if (!slabs.length) return { error: "tooSmall" };
    const joined = keep(runtime.Manifold.union(slabs));
    // In one piece with its plate: a wall the box's rounded floor would leave standing apart is no part of it.
    const pieces = joined.decompose().map((piece) => keep(piece)).sort((a, b) => b.volume() - a.volume());
    if (!pieces.length || pieces[0].volume() < 1) return { error: "tooSmall" };
    const insert = pieces[0].transform(UP_TO_SCENE);
    return { insert, plate, height: wallTop - floor, play };
  } finally {
    Array.from(new Set(created)).forEach((value) => value.delete?.());
  }
}
