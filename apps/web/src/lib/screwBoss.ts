import * as THREE from "three";
import { IndexedMesh } from "@/lib/enclosureMesh";

/*
 * The screw boss: a post with a hole from the top, for a heat-set insert or a self-tapping screw, as an enclosure
 * needs it for its lid or a board. Width and depth are its footprint, height the post; the hole's diameter and depth
 * follow the chosen size unless typed in. Gussets (two to six) can brace it against the floor: thin ribs from the
 * post outward, their top sloping down to the floor, as far out as the footprint reaches.
 *
 * The sizes are where one starts. Heat-set inserts (the usual brass ones with knurls, M2 to M5 and #2-56 to 1/4-20):
 * the hole as the common inserts' sheets give it (M3: 4.0 mm for an insert 5.7 mm long), a millimetre deeper than the
 * insert so the plastic it pushes aside has room, the post about twice the hole. Self-tapping screws for plastics
 * (DIN 7981 / ISO 7049 ST2.2 to ST4.2, the plastics screws of 2.5 to 5 mm, #2 to #10): a pilot hole of 0.8 times the
 * screw, the post 2.5 times it, the hole as deep as 2.5 screws. A printed hole comes out a little smaller than drawn,
 * so the hint suggests a test piece.
 */

export type ScrewBossFastener = "insert" | "selfTapping" | "custom";

export type ScrewBossSize = {
  id: string;
  /** What the size list shows: the name and, in mm, what the boss makes of it. */
  name: string;
  fastener: Exclude<ScrewBossFastener, "custom">;
  /** Hole diameter in mm. */
  hole: number;
  /** Insert length, or the screw's grip, in mm. */
  length: number;
  /** The post's outer diameter to start with. */
  outer: number;
  /** The least wall round the hole that holds it. */
  minWall: number;
  imperial?: boolean;
};

const insert = (id: string, hole: number, length: number, outer: number, minWall: number, imperial = false): ScrewBossSize => ({ id, name: id, fastener: "insert", hole, length, outer, minWall, imperial });
const selfTapping = (id: string, name: string, diameter: number, imperial = false): ScrewBossSize => ({
  id,
  name,
  fastener: "selfTapping",
  hole: Math.round(0.8 * diameter * 10) / 10,
  length: Math.round(2.5 * diameter * 10) / 10,
  outer: Math.round(2.5 * diameter * 2) / 2,
  minWall: Math.round(0.6 * diameter * 10) / 10,
  imperial,
});

/** Heat-set inserts: metric first, then the inch sizes (#4-40 and so on). */
export const SCREW_BOSS_INSERTS: ScrewBossSize[] = [
  insert("M2", 3.2, 4, 6, 1.3),
  insert("M2.5", 3.6, 5.7, 7, 1.4),
  insert("M3", 4, 5.7, 8, 1.6),
  { ...insert("M3 short", 4, 4, 8, 1.6), id: "M3S" },
  insert("M4", 5.6, 8.1, 10, 2.1),
  insert("M5", 6.4, 9.5, 12, 2.6),
  insert("#2-56", 3.2, 4, 6, 1.3, true),
  insert("#4-40", 3.9, 5.7, 8, 1.6, true),
  insert("#6-32", 4.8, 6.4, 9.5, 1.9, true),
  insert("#8-32", 5.3, 8.1, 10.5, 2.1, true),
  insert("#10-24", 6.4, 9.5, 12.5, 2.6, true),
  insert("1/4-20", 8, 12.7, 16, 3.2, true),
];

/** Self-tapping screws for plastics. */
export const SCREW_BOSS_SCREWS: ScrewBossSize[] = [
  selfTapping("ST2.2", "ST2.2", 2.2),
  selfTapping("K25", "K25 (2.5 mm)", 2.5),
  selfTapping("ST2.9", "ST2.9", 2.9),
  selfTapping("K30", "K30 (3 mm)", 3),
  selfTapping("ST3.5", "ST3.5", 3.5),
  selfTapping("K40", "K40 (4 mm)", 4),
  selfTapping("ST4.2", "ST4.2", 4.2),
  selfTapping("K50", "K50 (5 mm)", 5),
  selfTapping("#2", "#2", 2.18, true),
  selfTapping("#4", "#4", 2.84, true),
  selfTapping("#6", "#6", 3.51, true),
  selfTapping("#8", "#8", 4.17, true),
  selfTapping("#10", "#10", 4.83, true),
];

export const DEFAULT_SCREW_BOSS_FASTENER: ScrewBossFastener = "insert";
export const DEFAULT_SCREW_BOSS_SIZE = "M3";
export const MAX_SCREW_BOSS_GUSSETS = 6;
export const DEFAULT_SCREW_BOSS_GUSSET_THICKNESS = 1.6;
/** Holes and posts thinner than this are not printed. */
const MIN_HOLE = 0.4;
const MIN_WALL = 0.4;

export function normalizeScrewBossFastener(value: unknown): ScrewBossFastener {
  return value === "selfTapping" || value === "custom" ? value : "insert";
}

export function screwBossSizes(fastener: ScrewBossFastener) {
  return fastener === "selfTapping" ? SCREW_BOSS_SCREWS : SCREW_BOSS_INSERTS;
}

/** The size of a boss: its own, or the first of its kind's list (custom holes start from an M3 insert's). */
export function screwBossSize(fastener: ScrewBossFastener, id: unknown): ScrewBossSize {
  const list = screwBossSizes(fastener);
  return list.find((size) => size.id === id) ?? list.find((size) => size.id === (fastener === "selfTapping" ? "K30" : DEFAULT_SCREW_BOSS_SIZE)) ?? list[0];
}

export type ScrewBossFields = {
  /** Grouped as a hole, the boss cuts only its hole, the insert's or the screw's pocket, not the whole post (#1288). */
  hole?: boolean;
  width: number;
  depth?: number;
  height: number;
  screwBossFastener?: ScrewBossFastener;
  screwBossSize?: string;
  screwBossHole?: number;
  screwBossHoleDepth?: number;
  screwBossDiameter?: number;
  screwBossGussets?: number;
  screwBossGussetHeight?: number;
  screwBossGussetThickness?: number;
};

export type ScrewBossPlan = {
  fastener: ScrewBossFastener;
  size: ScrewBossSize;
  /** Outer radius of the post, hole radius, hole depth from the top, the lead-in chamfer at the hole's mouth. */
  radius: number;
  holeRadius: number;
  holeDepth: number;
  through: boolean;
  chamfer: number;
  height: number;
  /** Gussets: how many, how high, half their thickness, how far from the axis their outer end lies. */
  gussets: number;
  gussetHeight: number;
  gussetHalf: number;
  gussetReach: number;
  /** The wall round the hole and the least the fastener wants. */
  wall: number;
  minWall: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** What the boss's fields make: each value in its range, the gussets left out where they would not fit. */
export function screwBossPlan(shape: ScrewBossFields): ScrewBossPlan {
  const fastener = normalizeScrewBossFastener(shape.screwBossFastener);
  const size = screwBossSize(fastener === "custom" ? "insert" : fastener, shape.screwBossSize);
  const height = Math.max(0.5, shape.height);
  const footprint = Math.max(1, Math.min(shape.width, shape.depth ?? shape.width));
  const outer = clamp(finite(shape.screwBossDiameter) ? shape.screwBossDiameter : Math.min(size.outer, footprint), 2 * (MIN_HOLE / 2 + MIN_WALL), footprint);
  const radius = outer / 2;
  const holeRadius = clamp((finite(shape.screwBossHole) ? shape.screwBossHole : size.hole) / 2, MIN_HOLE / 2, radius - MIN_WALL);
  const wanted = finite(shape.screwBossHoleDepth) ? shape.screwBossHoleDepth : size.fastener === "insert" ? size.length + 1 : size.length + 1;
  const holeDepth = clamp(wanted, 0.2, height);
  const through = holeDepth >= height - 0.2;
  const chamfer = Math.min(fastener === "selfTapping" ? 0.3 : 0.5, radius - holeRadius - MIN_WALL, holeDepth / 4);
  const reach = footprint / 2;
  const gussetHalf = Math.min((finite(shape.screwBossGussetThickness) ? Math.max(0.4, shape.screwBossGussetThickness) : DEFAULT_SCREW_BOSS_GUSSET_THICKNESS) / 2, radius * 0.45);
  const asked = clamp(Math.round(finite(shape.screwBossGussets) ? shape.screwBossGussets : 0), 0, MAX_SCREW_BOSS_GUSSETS);
  // A gusset needs room beyond the post, and its two sides must not meet the next one's on the post.
  const base = Math.sqrt(radius * radius - gussetHalf * gussetHalf);
  const spreadOk = asked < 2 || 2 * Math.asin(gussetHalf / radius) < (2 * Math.PI) / asked - 0.05;
  const gussets = asked >= 1 && reach - base >= 0.5 && spreadOk ? asked : 0;
  const gussetHeight = clamp(finite(shape.screwBossGussetHeight) ? shape.screwBossGussetHeight : height * 0.6, 0.5, Math.max(0.5, height - 0.4));
  return {
    fastener,
    size,
    radius,
    holeRadius,
    holeDepth,
    through,
    chamfer: Math.max(0, chamfer),
    height,
    gussets,
    gussetHeight,
    gussetHalf,
    gussetReach: reach,
    wall: radius - holeRadius,
    minWall: fastener === "custom" ? MIN_WALL : size.minWall,
  };
}

/** The height of a gusset's short upright end out at the footprint, so it prints and does not end in a feather. */
export function screwBossGussetTip(plan: Pick<ScrewBossPlan, "gussetHeight">) {
  return Math.min(0.6, plan.gussetHeight / 2);
}

/** The directions the gussets point in, round the post from +x towards +z. */
export function screwBossGussetAngles(plan: Pick<ScrewBossPlan, "gussets">) {
  return Array.from({ length: plan.gussets }, (_, k) => (2 * Math.PI * k) / plan.gussets);
}

/** The footprint a boss's fields ask for: the post, and with gussets as far as they reach. */
export function screwBossFootprint(outer: number, gussets: number, reach: number) {
  return gussets > 0 ? Math.max(outer + 1, 2 * reach) : outer;
}

/**
 * The boss as a closed mesh, centred on the axis, from y = 0 up: the post's wall in rings round the axis, split at the
 * gussets' top; each gusset a plate from the post out to the footprint with a short upright end at the floor and a
 * sloping top up to the post; the top an annulus round the hole's chamfer; the hole down to its floor (or through).
 */
export function screwBossMesh(shape: ScrewBossFields, sides = 48) {
  const plan = screwBossPlan(shape);
  const { radius: R, holeRadius: rh, holeDepth, through, chamfer, height: H, gussets, gussetHeight: hg, gussetHalf: a, gussetReach } = plan;
  const mesh = new IndexedMesh();
  const n = Math.max(12, Math.round(sides));
  // The angles round the post: regular, with each gusset's two sides on the post among them and nothing between.
  const delta = gussets ? Math.asin(a / R) : 0;
  const gussetAngles = screwBossGussetAngles(plan);
  const inside = (angle: number) => gussetAngles.some((phi) => Math.abs(Math.atan2(Math.sin(angle - phi), Math.cos(angle - phi))) < delta + 1e-6);
  type Station = { angle: number; gusset: number; side: -1 | 0 | 1 };
  const stations: Station[] = [];
  for (let k = 0; k < n; k += 1) {
    const angle = (2 * Math.PI * k) / n;
    if (!inside(angle)) stations.push({ angle, gusset: -1, side: 0 });
  }
  gussetAngles.forEach((phi, g) => {
    stations.push({ angle: phi - delta, gusset: g, side: -1 }, { angle: phi + delta, gusset: g, side: 1 });
  });
  const norm = (angle: number) => ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  stations.sort((p, q) => norm(p.angle) - norm(q.angle));
  const m = stations.length;
  const ringAt = (y: number, r: number) => stations.map((s) => mesh.point(r * Math.cos(s.angle), y, r * Math.sin(s.angle)));
  const bottom = ringAt(0, R);
  const middle = gussets ? ringAt(hg, R) : null;
  const top = ringAt(H, R);
  // The post's wall: below the gussets' top only where no gusset stands; above it all round.
  for (let i = 0; i < m; i += 1) {
    const j = (i + 1) % m;
    const behindGusset = stations[i].side === -1 && stations[j].side === 1 && stations[i].gusset === stations[j].gusset;
    if (middle) {
      if (!behindGusset) mesh.quad(bottom[i], bottom[j], middle[j], middle[i]);
      mesh.quad(middle[i], middle[j], top[j], top[i]);
    } else mesh.quad(bottom[i], bottom[j], top[j], top[i]);
  }
  // The gussets, and the floor's outline with them: the post's ring with each gusset's end put in.
  const tip = screwBossGussetTip(plan);
  const floorOutline: number[] = [];
  const floorPoints: THREE.Vector2[] = [];
  const pushFloor = (index: number) => {
    floorOutline.push(index);
    floorPoints.push(new THREE.Vector2(mesh.positions[index * 3], mesh.positions[index * 3 + 2]));
  };
  for (let i = 0; i < m; i += 1) {
    pushFloor(bottom[i]);
    const s = stations[i];
    if (s.side !== -1 || !middle) continue;
    const j = (i + 1) % m;
    const phi = gussetAngles[s.gusset];
    const ex = Math.cos(phi), ez = Math.sin(phi), nx = -Math.sin(phi), nz = Math.cos(phi);
    const along = gussetReach;
    const at = (side: number, y: number) => mesh.point(along * ex + side * a * nx, y, along * ez + side * a * nz);
    const endL0 = at(-1, 0), endR0 = at(1, 0), endL1 = at(-1, tip), endR1 = at(1, tip);
    // Sides: the post's edge, the floor, the short end, the slope up to the post.
    mesh.quad(bottom[i], endL0, endL1, middle[i]);
    mesh.quad(bottom[j], middle[j], endR1, endR0);
    mesh.quad(endL0, endR0, endR1, endL1);
    mesh.quad(endL1, endR1, middle[j], middle[i]);
    pushFloor(endL0);
    pushFloor(endR0);
  }
  // The top: the post's ring round the hole's mouth.
  const holeSides = Math.max(12, Math.round(n * 0.75));
  const holeRing = (y: number, r: number) => Array.from({ length: holeSides }, (_, k) => {
    const angle = (2 * Math.PI * k) / holeSides;
    return mesh.point(r * Math.cos(angle), y, r * Math.sin(angle));
  });
  const mouth = holeRing(H, rh + chamfer);
  const cap = (outer: number[], hole: number[], y: number, up: boolean) => {
    const outline = outer.map((i) => new THREE.Vector2(mesh.positions[i * 3], mesh.positions[i * 3 + 2]));
    const holePts = hole.map((i) => new THREE.Vector2(mesh.positions[i * 3], mesh.positions[i * 3 + 2]));
    const all = [...outer, ...hole];
    THREE.ShapeUtils.triangulateShape(outline, hole.length ? [holePts] : []).forEach(([p, q, r]) => {
      // Seen from above (x right, z towards the viewer turned to -y): the winding fixed per face below.
      const ax = mesh.positions[all[p] * 3], az = mesh.positions[all[p] * 3 + 2];
      const bx = mesh.positions[all[q] * 3], bz = mesh.positions[all[q] * 3 + 2];
      const cx = mesh.positions[all[r] * 3], cz = mesh.positions[all[r] * 3 + 2];
      const turn = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
      // A face facing up (+y) has its points clockwise in x-z seen from above; facing down the other way.
      if ((turn < 0) === up) mesh.tri(all[p], all[q], all[r]);
      else mesh.tri(all[p], all[r], all[q]);
    });
    void y;
  };
  cap(top, mouth, H, true);
  const holeTop = chamfer > 0 ? holeRing(H - chamfer, rh) : mouth;
  if (chamfer > 0) for (let k = 0; k < holeSides; k += 1) mesh.quad(mouth[k], mouth[(k + 1) % holeSides], holeTop[(k + 1) % holeSides], holeTop[k]);
  const floorY = through ? 0 : H - holeDepth;
  const holeBottom = holeRing(floorY, rh);
  for (let k = 0; k < holeSides; k += 1) mesh.quad(holeTop[k], holeTop[(k + 1) % holeSides], holeBottom[(k + 1) % holeSides], holeBottom[k]);
  if (through) {
    // The floor is an annulus: the outline with the gussets round the hole.
    const outline = floorPoints;
    const holePts = holeBottom.map((i) => new THREE.Vector2(mesh.positions[i * 3], mesh.positions[i * 3 + 2]));
    const all = [...floorOutline, ...holeBottom];
    THREE.ShapeUtils.triangulateShape(outline, [holePts]).forEach(([p, q, r]) => {
      const A = all[p], B = all[q], C = all[r];
      const turn = (mesh.positions[B * 3] - mesh.positions[A * 3]) * (mesh.positions[C * 3 + 2] - mesh.positions[A * 3 + 2]) - (mesh.positions[B * 3 + 2] - mesh.positions[A * 3 + 2]) * (mesh.positions[C * 3] - mesh.positions[A * 3]);
      if (turn > 0) mesh.tri(A, B, C);
      else mesh.tri(A, C, B);
    });
  } else {
    // The hole's floor and the boss's floor: fans from the axis.
    const holeCentre = mesh.point(0, floorY, 0);
    for (let k = 0; k < holeSides; k += 1) mesh.tri(holeCentre, holeBottom[k], holeBottom[(k + 1) % holeSides]);
    const floorCentre = mesh.point(0, 0, 0);
    for (let k = 0; k < floorOutline.length; k += 1) mesh.tri(floorCentre, floorOutline[(k + 1) % floorOutline.length], floorOutline[k]);
  }
  return { mesh, plan };
}

/**
 * The boss's hole alone as a closed body, for a boss grouped as a hole: from the hole's floor (or the boss's foot, for a
 * hole going through) up to the top, with the lead-in chamfer at its mouth. Cut into a block, it leaves the pocket for
 * the insert or the screw and nothing else (#1288): the post round it is the block itself.
 */
export function screwBossCavityMesh(shape: ScrewBossFields, sides = 48) {
  const plan = screwBossPlan(shape);
  const { holeRadius: rh, holeDepth, through, chamfer, height: H } = plan;
  const mesh = new IndexedMesh();
  const n = Math.max(12, Math.round(Math.max(12, Math.round(sides)) * 0.75));
  const ring = (y: number, r: number) => Array.from({ length: n }, (_, k) => {
    const angle = (2 * Math.PI * k) / n;
    return mesh.point(r * Math.cos(angle), y, r * Math.sin(angle));
  });
  const floorY = through ? 0 : H - holeDepth;
  const bottom = ring(floorY, rh);
  const neck = chamfer > 0 ? ring(H - chamfer, rh) : bottom;
  const mouth = chamfer > 0 ? ring(H, rh + chamfer) : ring(H, rh);
  for (let k = 0; k < n; k += 1) {
    const j = (k + 1) % n;
    if (chamfer > 0) {
      mesh.quad(bottom[k], neck[k], neck[j], bottom[j]);
      mesh.quad(neck[k], mouth[k], mouth[j], neck[j]);
    } else mesh.quad(bottom[k], mouth[k], mouth[j], bottom[j]);
  }
  const low = mesh.point(0, floorY, 0), high = mesh.point(0, H, 0);
  for (let k = 0; k < n; k += 1) {
    const j = (k + 1) % n;
    mesh.tri(low, bottom[k], bottom[j]);
    mesh.tri(high, mouth[j], mouth[k]);
  }
  mesh.orient();
  return { mesh, plan };
}

export function createScrewBossGeometry(shape: ScrewBossFields, sides = 48): THREE.BufferGeometry {
  const geometry = (shape.hole ? screwBossCavityMesh(shape, sides) : screwBossMesh(shape, sides)).mesh.geometry(35);
  // As a hole the boss is its pocket alone, which opens at the boss's top and need not reach its floor. It keeps its
  // height in the box: set down on the floor like every other shape, it opened at the bottom of the part instead.
  if (shape.hole) geometry.userData.keepsItsHeight = true;
  return geometry;
}
