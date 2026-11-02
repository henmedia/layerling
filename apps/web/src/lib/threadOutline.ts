/*
 * The outlines of nut bodies and screw heads beyond the plain hexagon and circle (Discussion #1131): a square nut or
 * head, a flange nut or flange head (a disc under the hexagon), a wing nut or wing head (a hub with a flat bar across
 * it, so it prints lying flat without supports) and a star knob (a disc with round scallops cut from its rim).
 *
 * Each outline is seen from above and stands straight up through its tier, so it is a function of the angle round
 * the axis alone: `outlineRadius`. The display mesh (`createThreadGeometry`) samples it at `outlineAngles`, which
 * include every corner, and the exact body (`threadSolid.ts`) builds the same outline from prisms and cylinders.
 */

export type ThreadOutline =
  | { kind: "round"; radius: number }
  | { kind: "hex"; acrossFlats: number }
  | { kind: "square"; acrossFlats: number }
  /** A disc of `radius` with `lobes` round scallops cut from its rim, each a circle of `scallopRadius` whose centre lies `scallopCenter` out, between two lobes. */
  | { kind: "knob"; radius: number; lobes: number; scallopCenter: number; scallopRadius: number }
  /** A hub of `hubRadius` and a bar along x with round ends: `halfSpan` from the axis to the end of a wing, `halfWidth` across. */
  | { kind: "wing"; hubRadius: number; halfSpan: number; halfWidth: number };

/** One straight piece of a nut body or screw head: the outline from `from` to `to` up the axis. */
export type ThreadOutlineTier = { from: number; to: number; outline: ThreadOutline };

const TWO_PI = Math.PI * 2;

/**
 * The six lobes of a star knob and the scallops between them, as shares of its radius. A scallop must meet the rim
 * nearer the axis than where a ray from the axis touches it (centre squared at least rim squared plus scallop squared),
 * or the ray would leave the knob and come back into a sliver of rim beyond the scallop, which no radius per angle draws.
 */
export const KNOB_LOBES = 6;
const KNOB_SCALLOP_CENTER = 1.12;
const KNOB_SCALLOP_RADIUS = 0.4;

export function knobOutline(radius: number): ThreadOutline {
  return { kind: "knob", radius, lobes: KNOB_LOBES, scallopCenter: radius * KNOB_SCALLOP_CENTER, scallopRadius: radius * KNOB_SCALLOP_RADIUS };
}

function wrap(angle: number) {
  const wrapped = angle % TWO_PI;
  return wrapped < 0 ? wrapped + TWO_PI : wrapped;
}

/** The angle of the n-th scallop of a star knob: half way between two lobes, the first lobe on +x. */
function scallopAngle(outline: Extract<ThreadOutline, { kind: "knob" }>, index: number) {
  return ((index + 0.5) * TWO_PI) / outline.lobes;
}

/** The far end of the bar of a wing outline along the ray at `angle`: the rectangle and the round end beyond it. */
function stadiumRadius(halfSpan: number, halfWidth: number, angle: number) {
  const along = Math.abs(Math.cos(angle));
  const across = Math.abs(Math.sin(angle));
  const straight = Math.max(0, halfSpan - halfWidth);
  const rectangle = Math.min(across > 1e-12 ? halfWidth / across : Infinity, along > 1e-12 ? straight / along : Infinity);
  const projection = straight * along;
  const offAxis = straight * straight - projection * projection;
  const end = offAxis <= halfWidth * halfWidth ? projection + Math.sqrt(halfWidth * halfWidth - offAxis) : -Infinity;
  return Math.max(rectangle, end);
}

/** How far the outline reaches from the axis at `angle` (from +x towards +z). */
export function outlineRadius(outline: ThreadOutline, angle: number): number {
  switch (outline.kind) {
    case "round":
      return outline.radius;
    case "hex": {
      const sector = Math.PI / 3;
      const within = wrap(angle) % sector;
      return outline.acrossFlats / 2 / Math.cos(within - sector / 2);
    }
    case "square":
      return outline.acrossFlats / 2 / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));
    case "knob": {
      let radius = outline.radius;
      for (let index = 0; index < outline.lobes; index += 1) {
        const off = angle - scallopAngle(outline, index);
        const ahead = outline.scallopCenter * Math.cos(off);
        const aside = outline.scallopCenter * Math.sin(off);
        if (ahead <= 0 || Math.abs(aside) >= outline.scallopRadius) continue;
        radius = Math.min(radius, ahead - Math.sqrt(outline.scallopRadius * outline.scallopRadius - aside * aside));
      }
      return radius;
    }
    case "wing":
      return Math.max(outline.hubRadius, stadiumRadius(outline.halfSpan, outline.halfWidth, angle));
  }
}

/** The angles in [0, 2 pi) where the outline turns a corner, which a sampled ring must hit. */
function outlineCorners(outline: ThreadOutline): number[] {
  switch (outline.kind) {
    case "round":
      return [];
    case "hex":
      return Array.from({ length: 6 }, (_, index) => (index * Math.PI) / 3);
    case "square":
      return Array.from({ length: 4 }, (_, index) => Math.PI / 4 + (index * Math.PI) / 2);
    case "knob": {
      const { radius, scallopCenter: center, scallopRadius: scallop } = outline;
      const cosine = (radius * radius + center * center - scallop * scallop) / (2 * radius * center);
      const half = Math.acos(Math.max(-1, Math.min(1, cosine)));
      return Array.from({ length: outline.lobes }, (_, index) => [scallopAngle(outline, index) - half, scallopAngle(outline, index) + half]).flat();
    }
    case "wing": {
      const corners: number[] = [];
      const straight = Math.max(0, outline.halfSpan - outline.halfWidth);
      // Where the straight sides of the bar meet its round ends: no corner, but a column there keeps the side straight.
      const sideEnd = Math.atan2(outline.halfWidth, straight);
      corners.push(sideEnd, Math.PI - sideEnd, Math.PI + sideEnd, TWO_PI - sideEnd);
      if (outline.halfWidth < outline.hubRadius) {
        const meet = Math.asin(outline.halfWidth / outline.hubRadius);
        corners.push(meet, Math.PI - meet, Math.PI + meet, TWO_PI - meet);
      }
      return corners;
    }
  }
}

/** The angles a ring round the outline is sampled at, ascending in [0, 2 pi): `count` even steps and every corner. */
export function outlineAngles(outline: ThreadOutline, count: number): number[] {
  const steps = Array.from({ length: count }, (_, index) => (index / count) * TWO_PI);
  const all = [...steps, ...outlineCorners(outline).map(wrap)].sort((a, b) => a - b);
  return all.filter((angle, index) => index === 0 || angle - all[index - 1] > 1e-7).filter((angle) => TWO_PI - angle > 1e-7);
}

/** How far the outline reaches along x and along z from the axis, both ways alike. */
export function outlineExtents(outline: ThreadOutline): { x: number; z: number } {
  switch (outline.kind) {
    case "round":
      return { x: outline.radius, z: outline.radius };
    case "hex":
      return { x: outline.acrossFlats / Math.sqrt(3), z: outline.acrossFlats / 2 };
    case "square":
      return { x: outline.acrossFlats / 2, z: outline.acrossFlats / 2 };
    case "wing":
      return { x: Math.max(outline.halfSpan, outline.hubRadius), z: Math.max(outline.halfWidth, outline.hubRadius) };
    case "knob": {
      let x = 0;
      let z = 0;
      for (const angle of outlineAngles(outline, 2880)) {
        const radius = outlineRadius(outline, angle);
        x = Math.max(x, Math.abs(Math.cos(angle)) * radius);
        z = Math.max(z, Math.abs(Math.sin(angle)) * radius);
      }
      return { x, z };
    }
  }
}

/** How far the tiers reach from the axis, as a footprint: width along x, depth along z. */
export function tiersFootprint(tiers: readonly ThreadOutlineTier[]) {
  const extents = tiers.map((tier) => outlineExtents(tier.outline));
  return { width: 2 * Math.max(...extents.map((extent) => extent.x)), depth: 2 * Math.max(...extents.map((extent) => extent.z)) };
}
