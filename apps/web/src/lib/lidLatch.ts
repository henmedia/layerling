/**
 * The measures and the clip of a lid's latches (`LidOptions.latches`), like those on a camera battery box: the body and
 * the lid each carry a pin held by two cheeks on the outside, the body's just below its rim and the lid's on a nose at
 * the edge of its plate, and a clip, a short strip with a C-shaped socket at each end, snaps over both pins. The socket
 * over the lid's pin stays on and turns, so the clip swings down over the body's pin and clicks on; pulled at its tab,
 * below the body's pin, it comes off that pin and hangs from the lid. Everything here comes from the clip's width and its
 * grip, so one clip fits every latch made with the same two.
 *
 * A socket holds its pin by its shape, not by a tight fit (Discussion #2047): its two jaws reach round past the pin's
 * middle and end in round noses, so the way in is narrower than the pin by a share of the pin's thickness, whatever the
 * grip, and the grip narrows it further. The socket on the lid's pin, which stays on, is the narrower of the two; the one
 * on the body's pin, which is opened every time, lets go a little more easily.
 *
 * In the frame used here v runs up along the wall and n out from it; the clip's profile lies in that plane, and the clip
 * is that profile drawn out across the wall by its width.
 */

export const DEFAULT_LID_LATCH_WIDTH = 12;
export const MIN_LID_LATCH_WIDTH = 6;
export const MAX_LID_LATCH_WIDTH = 30;
export const DEFAULT_LID_LATCH_GRIP = 0.3;
export const MIN_LID_LATCH_GRIP = 0.05;
export const MAX_LID_LATCH_GRIP = 1;
export const MAX_LID_LATCHES = 4;
/** The play between a pin and its socket, mm, so the clip turns on the lid's pin. */
const PIN_PLAY = 0.15;
/** How far the cheeks' round ends stay off the wall, mm: the lid's hang beside the body's wall and must not touch it. */
const CHEEK_WALL_GAP = 0.4;
/** The play on each side between the clip and the cheeks, mm. */
const SIDE_PLAY = 0.4;
/** How far the clip reaches past the body's pin as a tab to pull it open, mm. */
const TAB = 6;
/** How much room the clip's two sockets keep between them beyond their own size, mm. */
const SOCKET_SPACING = 3;
/**
 * How much narrower than its pin a socket opens before the grip, as a share of the pin's thickness: the body's socket,
 * which is opened and closed, and the lid's, which stays on. The jaws bend by half of that and half the grip each as the
 * pin goes in, which a printed jaw as long and as thick as these takes without breaking.
 */
const BODY_SOCKET_HOLD = 0.1;
const LID_SOCKET_HOLD = 0.15;
/** The least a socket opens, as a share of its pin's thickness, so a pin still goes in at the most grip. */
const MIN_SOCKET_OPENING = 0.4;

export type LidLatchMeasures = {
  /** The clip's width across the wall. */
  width: number;
  grip: number;
  /** Pin radius. */
  pin: number;
  /** Radius of a socket round the pin (pin and play), and of the socket's outside. */
  socket: number;
  rim: number;
  /**
   * Half the opening of the socket on the body's pin, between its jaws' noses: narrower than the pin by a share of the
   * pin's thickness and by the grip.
   */
  opening: number;
  /** Half the opening of the socket on the lid's pin, a little narrower: that socket stays on. */
  lidOpening: number;
  /** How far the pins' middles stand out from the wall. */
  reach: number;
  /** How far apart the two pins are, the lid's above the body's. */
  spacing: number;
  /** Radius of a cheek's round end round the pin, and a cheek's thickness along the pin. */
  cheekRadius: number;
  cheek: number;
  /** How wide one latch is along the wall: the clip, its play and both cheeks. */
  span: number;
  /** The clip's tab below the body's pin. */
  tab: number;
  /** The play between the clip and a cheek. */
  sidePlay: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** The latch's measures from the clip's width and its grip (both held within their limits). */
export function lidLatchMeasures(width: number, grip: number): LidLatchMeasures {
  const clipWidth = clamp(Number.isFinite(width) ? width : DEFAULT_LID_LATCH_WIDTH, MIN_LID_LATCH_WIDTH, MAX_LID_LATCH_WIDTH);
  const clipGrip = clamp(Number.isFinite(grip) ? grip : DEFAULT_LID_LATCH_GRIP, MIN_LID_LATCH_GRIP, MAX_LID_LATCH_GRIP);
  // A pin a quarter as thick as the clip is wide, 2.5 to 5 mm: 3 mm for the 12 mm clip.
  const diameter = clamp(clipWidth / 4, 2.5, 5);
  const pin = diameter / 2;
  const socket = pin + PIN_PLAY;
  const rim = socket + clamp(diameter / 2, 1.2, 2.5);
  const cheekRadius = pin + clamp(diameter * 0.4, 1, 2);
  const cheek = clamp(diameter * 0.8, 2, 4);
  return {
    width: clipWidth,
    grip: clipGrip,
    pin,
    socket,
    rim,
    opening: Math.max(diameter * (1 - BODY_SOCKET_HOLD) - clipGrip, diameter * MIN_SOCKET_OPENING) / 2,
    lidOpening: Math.max(diameter * (1 - LID_SOCKET_HOLD) - clipGrip, diameter * MIN_SOCKET_OPENING) / 2,
    // The cheeks' round ends stay off the wall, so the lid's can hang beside the body's wall.
    reach: cheekRadius + CHEEK_WALL_GAP,
    spacing: 2 * rim + SOCKET_SPACING,
    cheekRadius,
    cheek,
    span: clipWidth + 2 * (SIDE_PLAY + cheek),
    tab: TAB,
    sidePlay: SIDE_PLAY,
  };
}

/**
 * The clip's profile: a strip with a C-shaped socket at each end, the sockets open towards the wall. A socket's jaws reach
 * round past the pin's middle and end in round noses as thick as the jaws, the way in between the noses as wide as the
 * socket's opening, so the pin has to push the jaws apart to get in or out. v runs from the body's pin (0) up to the lid's
 * (`spacing`), n out from the wall, the pins' middles at n = reach. Below the body's pin the strip goes on as the tab.
 * Clockwise.
 */
export function lidLatchClipProfile(measures: LidLatchMeasures): Array<[number, number]> {
  const { socket, rim, reach, spacing, tab } = measures;
  // A nose is a half circle between the socket's inside and its outside, its middle on the circle halfway between them.
  const nose = (rim - socket) / 2;
  const middle = (rim + socket) / 2;
  const out: Array<[number, number]> = [];
  const arc = (v: number, n: number, radius: number, from: number, to: number) => {
    const steps = Math.max(2, Math.ceil(Math.abs(to - from) / (Math.PI / 24)));
    for (let step = 0; step <= steps; step += 1) {
      const angle = from + ((to - from) * step) / steps;
      out.push([v + Math.cos(angle) * radius, n + Math.sin(angle) * radius]);
    }
  };
  // One socket: down its outside on the far side, round that jaw's nose, round its inside, round the other jaw's nose and
  // back up its outside. `past` is how far round past the pin's middle the noses sit, which leaves `opening` between them.
  const socketAt = (centre: number, from: number, opening: number) => {
    const past = Math.acos(clamp((opening + nose) / middle, 0, 1));
    arc(centre, reach, rim, from, -past);
    arc(centre + Math.cos(past) * middle, reach - Math.sin(past) * middle, nose, -past, -past - Math.PI);
    arc(centre, reach, socket, -past, Math.PI + past);
    arc(centre - Math.cos(past) * middle, reach - Math.sin(past) * middle, nose, past, past - Math.PI);
    arc(centre, reach, rim, Math.PI + past, Math.PI);
  };
  out.push([-rim - tab, reach + rim]);
  socketAt(spacing, Math.PI / 2, measures.lidOpening);
  socketAt(0, 0, measures.opening);
  out.push([-rim - tab, reach]);
  return out.filter((point, index) => {
    const next = out[(index + 1) % out.length];
    return Math.hypot(next[0] - point[0], next[1] - point[1]) > 1e-6;
  });
}
