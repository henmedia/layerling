import type { CrossSection, ManifoldToplevel } from "manifold-3d";

/**
 * A draw latch for a lid (`latchStyle` "draw"), an over-centre toggle latch as on a tool case or a flight case, printed
 * in place on the box: a lever turns on a pin between two cheeks on the box's wall, and a link hangs from a cross pin
 * low on the lever, its hook going over a pin on two cheeks at the lid's edge. Pushing the lever down towards the wall
 * swings the cross pin past the line from the lever's pin to the lid's (dead centre): the link is pulled tightest just
 * there, so the lever snaps past it, and the link holds the lid down and the lever shut.
 *
 * Everything here is in the side view, the plane across the wall: o out from the wall's face, z up from the lid's pin as
 * it is when closed. The parts are these profiles drawn out along the wall:
 * - the box's pin (`pivot`) between two cheeks outside the lever, as the clip's (lidLatch.ts), and a small rest on the
 *   wall under the lever's lowest edge, which it prints on with the play between them;
 * - the lever: a closed ring round that pin, two plates below it holding the cross pin (`link` closed), and a handle
 *   below with a tab to pull it open by; between the plates a slot where the link turns;
 * - the link, in the slot: a closed ring round the cross pin and a band from it round the outside of the lever's ring up
 *   to a hook over the lid's pin. The band is bowed round the ring, so it gives a little as it is pulled tight: that is
 *   the spring that holds the lid;
 * - the lid's pin, on two cheeks hanging from a nose at the plate's edge, as the clip's.
 *
 * The parts print upright with the box, as they are when closed: each part that turns has `DRAW_LATCH_PLAY` round its
 * pin and below it, where it rests on the part under it (the link on the lever, the lever on the rest), and the rest
 * of it grows out at 45 degrees or steeper. The hook prints lower than where it bears on the lid's pin by the three
 * plays (pin to hook, link to cross pin, lever to its pin), which pulling takes up, and by `clamp`: so much the link
 * gives when the lever is shut, and that is what holds the lid down.
 */

export const DEFAULT_LID_DRAW_CLAMP = 0.2;
export const MIN_LID_DRAW_CLAMP = 0;
export const MAX_LID_DRAW_CLAMP = 0.8;
/** The narrowest draw latch, mm: the lever's two plates and the link between them. */
export const MIN_LID_DRAW_WIDTH = 10;
export const MAX_LID_DRAW_WIDTH = 30;
/** The play between the parts that move, mm: round each pin, beside the link and under the parts that rest on others. */
export const DRAW_LATCH_PLAY = 0.3;
/** How far the parts keep off the box's wall and the lid's edge, mm. */
const WALL_GAP = 0.4;
/** The play between the lever (or the link) and the cheeks beside it, mm. */
const SIDE_PLAY = 0.4;
/** How thick the lever's ring is round its pin, and the link's round the cross pin, mm. */
const RING_WALL = 1.6;
const LINK_RING_WALL = 1.4;
/** How thick the link's band and its hook are, mm. */
const BAND = 2;
/** How far the cross pin is past dead centre when the lever is shut, degrees. */
const PAST = 20;
/** How far round past the top of the lid's pin the hook reaches, from the band, degrees. */
const HOOK_TIP = 150;
/** How far the handle reaches below the cross pin, mm, and how far its lip stands out past the plates. */
const HANDLE = 7;
const TAB = 1.5;
/** How wide the handle's foot is at the wall side before its underside rises, mm. */
const FOOT = 2.5;
/** How far the cheeks and the rest reach into the wall, so they join it. */
export const DRAW_LATCH_EMBED = 0.4;
const EMBED = DRAW_LATCH_EMBED;

type Point = [number, number];

export type LidDrawLatchMeasures = {
  /** The lever's width along the wall, and the link's between its plates. */
  width: number;
  linkWidth: number;
  /** How thick each of the lever's plates is, beside the link. */
  plate: number;
  /** Radius of the three pins. */
  pin: number;
  play: number;
  clamp: number;
  /** Outer radius of the lever's ring round its pin, of the link's round the cross pin, and of the plates round it. */
  ring: number;
  linkRing: number;
  fork: number;
  /** Radius of the hook's inside and of its outside round the lid's pin. */
  hookInside: number;
  hookOutside: number;
  /** Radius of the middle of the link's band where it goes round the lever's ring. */
  bow: number;
  /** How far the pins stand out of the wall: the lid's above the box's. */
  out: number;
  /** The box's pin (the lever turns on it), the cross pin as the lever is shut, and the hook's middle as it prints. */
  pivot: Point;
  link: Point;
  hook: Point;
  /** Where the cross pin is at dead centre, straight below the lever's pin, the lid's pin above. */
  dead: Point;
  /** From the lever's pin to the cross pin. */
  arm: number;
  /** How much lower the hook prints than it bears on the lid's pin: the plays and the clamp. */
  drop: number;
  /** The lever's lowest point, at its wall side, and the rest's top below it. */
  handleBottom: number;
  restTop: number;
  /** The lowest point of what goes on the box: the rest's or the cheeks' underside, sloping back to the wall. */
  lowest: number;
  /** How far the handle's wall side and its far side are out from the wall. */
  handleIn: number;
  handleOut: number;
  /** The cheeks' radius round the pins and their thickness along them, both on box and lid. */
  cheekRadius: number;
  cheek: number;
  sidePlay: number;
  /** How wide one latch is along the wall: the lever, its play and the box's cheeks. */
  span: number;
  /** The link's length from the cross pin to the hook's middle as it prints. */
  length: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** The draw latch's measures from its width along the wall and its clamp, both held within their limits. */
export function lidDrawLatchMeasures(width: number, clampAmount: number): LidDrawLatchMeasures {
  const w = clamp(Number.isFinite(width) ? width : MIN_LID_DRAW_WIDTH, MIN_LID_DRAW_WIDTH, MAX_LID_DRAW_WIDTH);
  const c = clamp(Number.isFinite(clampAmount) ? clampAmount : DEFAULT_LID_DRAW_CLAMP, MIN_LID_DRAW_CLAMP, MAX_LID_DRAW_CLAMP);
  const g = DRAW_LATCH_PLAY;
  // A pin an eighth of the width round, 2.5 to 5 mm thick: 3 mm for a 12 mm latch.
  const pin = clamp(w / 8, 1.25, 2.5);
  const plate = clamp(0.15 * w, 1.6, 3);
  const linkWidth = w - 2 * plate - 2 * g;
  const ring = pin + g + RING_WALL;
  const linkRing = pin + g + LINK_RING_WALL;
  const fork = pin + RING_WALL;
  const hookInside = pin + g;
  const hookOutside = hookInside + BAND;
  // The band goes round the lever's ring with the play and a little more, as the lever shuts a little further than it
  // prints (until it lies on the wall).
  const bow = ring + g + 0.2 + BAND / 2;
  const cheekRadius = pin + clamp(0.8 * pin, 1, 2);
  const cheek = clamp(1.6 * pin, 2, 4);
  // The cross pin's ring just clears the lever's; the lid's pin is high enough above the box's that its cheeks clear the
  // lever's ring.
  const arm = ring + linkRing + 0.4;
  const rise = cheekRadius + ring + g + 0.3;
  const past = (PAST * Math.PI) / 180;
  // Far enough out that the lever and the link, shut, keep off the wall, and the hook and the rings too as they turn.
  const out = Math.max(ring + WALL_GAP, hookOutside + WALL_GAP, cheekRadius + WALL_GAP, arm * Math.sin(past) + Math.max(linkRing, fork) + WALL_GAP);
  const drop = 3 * g + c;
  const pivot: Point = [out, -rise];
  const link: Point = [out - arm * Math.sin(past), -rise - arm * Math.cos(past)];
  // The hook prints `drop` from the lid's pin towards the cross pin, so the link is that much short of reaching it.
  const toLink = Math.hypot(link[0] - out, link[1]);
  const hook: Point = [out + (drop * (link[0] - out)) / toLink, (drop * link[1]) / toLink];
  const handleBottom = link[1] - HANDLE;
  const handleIn = link[0] - fork;
  const restTop = handleBottom - g;
  // The rest reaches out under the handle's wall side, 1.5 mm, and falls back to the wall at 45 degrees below.
  const restOut = handleIn + 1.5;
  const cheekBottom = -rise - out - EMBED - cheekRadius * Math.SQRT2;
  const lowest = Math.min(restTop - 1 - (restOut + EMBED), cheekBottom);
  return {
    width: w, linkWidth, plate, pin, play: g, clamp: c, ring, linkRing, fork, hookInside, hookOutside, bow, out,
    pivot, link, hook, dead: [out, -rise - arm], arm, drop, handleBottom, restTop, lowest, handleIn, handleOut: link[0] + fork,
    cheekRadius, cheek, sidePlay: SIDE_PLAY, span: w + 2 * (SIDE_PLAY + cheek), length: Math.hypot(hook[0] - link[0], hook[1] - link[1]),
  };
}

/**
 * How much the link has to give, with its hook on the lid's pin and every play taken up by the pull (mm): `shut`, with the
 * lever shut as it prints, which is the clamp; `dead`, with the cross pin at dead centre, which is more, so the lever
 * snaps past it and stays shut.
 */
export function lidDrawLatchPull(measures: LidDrawLatchMeasures) {
  const give = (point: Point) => Math.hypot(measures.out - point[0], point[1]) - measures.length - 3 * measures.play;
  return { shut: give(measures.link), dead: give(measures.dead) };
}

const SIDES = 48;

/** The 2D parts of one draw latch, in (o, z) about the lid's pin, as they print (see the comment at the top). */
export function lidDrawLatchSections(runtime: ManifoldToplevel, measures: LidDrawLatchMeasures, created: { delete?: () => void }[]) {
  const keep = <T extends { delete?: () => void }>(value: T) => (created.push(value), value);
  const circle = ([o, z]: Point, radius: number) => keep(keep(runtime.CrossSection.circle(radius, SIDES)).translate([o, z]));
  const polygon = (points: Point[]) => keep(new runtime.CrossSection([points], "NonZero"));
  const hull = (...parts: CrossSection[]) => keep(runtime.CrossSection.hull(parts));
  const union = (...parts: CrossSection[]) => keep(runtime.CrossSection.union(parts));
  const { pivot, link, hook, pin, play: g, ring, linkRing, fork, hookInside, bow, handleBottom, handleIn, handleOut, restTop } = measures;
  const at = (centre: Point, radius: number, degrees: number): Point => {
    const angle = (degrees * Math.PI) / 180;
    return [centre[0] + Math.cos(angle) * radius, centre[1] + Math.sin(angle) * radius];
  };
  const toDegrees = (radians: number) => (radians * 180) / Math.PI;

  // The lever's handle: from the plates round the cross pin down to its lowest edge at the wall side, its underside
  // rising outward at 45 degrees and, beside the link, on past the plates' outside as a lip to pull the lever open by.
  const foot: Point = [handleIn + FOOT, handleBottom + FOOT];
  const handle = hull(circle(link, fork), polygon([[handleIn, handleBottom], foot, [handleIn, foot[1]]]));
  const lipEnd = handleOut + TAB;
  const lip = polygon([[handleIn, handleBottom], [lipEnd, handleBottom + lipEnd - handleIn], [lipEnd, handleBottom + lipEnd - handleIn + 1.2], link]);
  const hole = circle(pivot, pin + g);
  // Beside the link: ring, plates, handle and tab; the cross pin is part of them.
  const leverSide = keep(union(hull(circle(pivot, ring), circle(link, fork)), handle, lip).subtract(hole));
  // In the slot: the ring and the cross pin, and the handle below the link's ring with the play between them.
  const slotTop = link[1] - linkRing - g;
  const below = polygon([[handleIn - 1, handleBottom - 1], [handleOut + 1, handleBottom - 1], [handleOut + 1, slotTop], [handleIn - 1, slotTop]]);
  const leverMiddle = keep(union(keep(circle(pivot, ring).subtract(hole)), circle(link, pin), keep(handle.intersect(below))));

  // The link: its ring round the cross pin; its band from the ring along the line that touches both the ring's middle and
  // the bow round the lever's ring on the far side, round that bow, along the line touching it and the hook, and round
  // the hook over the top of the lid's pin.
  const ringMiddle = linkRing - BAND / 2;
  const hookMiddle = hookInside + BAND / 2;
  // The common tangent on the far side of two circles (centre, radius), as the angle of the normal pointing out from both.
  const tangent = (a: Point, ra: number, b: Point, rb: number) => {
    const along = Math.atan2(b[1] - a[1], b[0] - a[0]);
    return toDegrees(along - Math.PI / 2 + Math.asin((ra - rb) / Math.hypot(b[0] - a[0], b[1] - a[1])));
  };
  const low = tangent(link, ringMiddle, pivot, bow);
  const high = tangent(pivot, bow, hook, hookMiddle);
  const path: Point[] = [at(link, ringMiddle, low)];
  for (let degrees = low; degrees < high; degrees += 5) path.push(at(pivot, bow, degrees));
  path.push(at(pivot, bow, high));
  for (let degrees = high; degrees < HOOK_TIP; degrees += 5) path.push(at(hook, hookMiddle, degrees));
  path.push(at(hook, hookMiddle, HOOK_TIP));
  const band = union(...path.slice(1).map((point, index) => hull(circle(path[index], BAND / 2), circle(point, BAND / 2))));
  const linkPart = keep(keep(union(circle(link, linkRing), band).subtract(circle(link, pin + g))).subtract(circle(hook, hookInside)));

  // The rest on the wall under the handle's lowest edge, falling back to the wall at 45 degrees below.
  const restOut = handleIn + 1.5;
  const rest = polygon([[-EMBED, restTop], [restOut, restTop], [restOut, restTop - 1], [-EMBED, restTop - 1 - (restOut + EMBED)]]);
  return { leverSide, leverMiddle, link: linkPart, rest, angles: { low, high } };
}
