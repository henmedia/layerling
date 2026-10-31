import { describe, expect, it } from "vitest";
import {
  createThreadGeometry,
  defaultThreadChamfer,
  defaultThreadPitch,
  normalizeThreadProfile,
  pitchToThreadsPerInch,
  THREAD_SIZE_GROUPS,
  threadNaturalFootprint,
  threadProfileForSize,
  threadProfileShape,
  threadSettings,
  threadSizeById,
  threadSizeFor,
  threadUsesInchPitch,
  WHITWORTH_PROFILE_CONSTANTS,
} from "@/lib/threadGeometry";
import { mcpThreadSizeName, mcpThreadSizeParams } from "@/lib/mcpShapeSettings";
import { normalizeShapeCustomizations } from "@/lib/workplaneSettings";
import type { ThreadRole } from "@/types/layerling";

/*
 * Das Whitworth-Rohrgewinde G nach ISO 228-1. Die Zahlen hier stammen aus der
 * Norm, nicht aus dem Code: Profilkennzahlen aus ISO 228-1 Bild 1, Aussen- und
 * Kerndurchmesser und Gangzahl aus ihrer Tabelle 1.
 */

/** Groesse, Gaenge je Zoll, Aussen- und Kerndurchmesser in mm (ISO 228-1, Tabelle 1). */
const ISO_228_1: ReadonlyArray<[string, number, number, number]> = [
  ["1/16", 28, 7.723, 6.561],
  ["1/8", 28, 9.728, 8.566],
  ["1/4", 19, 13.157, 11.445],
  ["3/8", 19, 16.662, 14.95],
  ["1/2", 14, 20.955, 18.631],
  ["5/8", 14, 22.911, 20.587],
  ["3/4", 14, 26.441, 24.117],
  ["7/8", 14, 30.201, 27.877],
  ["1", 11, 33.249, 30.291],
  ["1 1/8", 11, 37.897, 34.939],
  ["1 1/4", 11, 41.91, 38.952],
  ["1 1/2", 11, 47.803, 44.845],
  ["1 3/4", 11, 53.746, 50.788],
  ["2", 11, 59.614, 56.656],
  ["2 1/4", 11, 65.71, 62.752],
  ["2 1/2", 11, 75.184, 72.226],
  ["2 3/4", 11, 81.534, 78.576],
  ["3", 11, 87.884, 84.926],
  ["3 1/2", 11, 100.33, 97.372],
  ["4", 11, 113.03, 110.072],
];

type Position = { count: number; getX: (index: number) => number; getY: (index: number) => number; getZ: (index: number) => number };

/** Kleinster und groesster Radius der Mantelflaeche zwischen zwei Hoehen. */
function radiusRange(position: Position, fromY: number, toY: number) {
  let smallest = Number.POSITIVE_INFINITY;
  let largest = 0;
  for (let index = 0; index < position.count; index += 1) {
    const y = position.getY(index);
    if (y < fromY || y > toY) continue;
    const radius = Math.hypot(position.getX(index), position.getZ(index));
    smallest = Math.min(smallest, radius);
    largest = Math.max(largest, radius);
  }
  return { smallest, largest };
}

/** Kanten, die nicht genau zwei Dreiecken gehoeren: ein Loch oder doppelte Flaechen. */
function openOrDoubledEdges(position: Position) {
  const uses = new Map<string, number>();
  const key = (index: number) => [position.getX(index), position.getY(index), position.getZ(index)].map((value) => value.toFixed(5)).join(",");
  for (let index = 0; index + 2 < position.count; index += 3) {
    const corners = [key(index), key(index + 1), key(index + 2)];
    if (corners[0] === corners[1] || corners[1] === corners[2] || corners[0] === corners[2]) continue;
    for (let edge = 0; edge < 3; edge += 1) {
      const a = corners[edge];
      const b = corners[(edge + 1) % 3];
      const id = a < b ? `${a}:${b}` : `${b}:${a}`;
      uses.set(id, (uses.get(id) ?? 0) + 1);
    }
  }
  return [...uses.values()].filter((count) => count !== 2).length;
}

function geometry(role: ThreadRole, size: string, height: number, extra: Record<string, unknown> = {}) {
  const spec = threadSizeById(size);
  if (!spec) throw new Error(`no size ${size}`);
  const fields = { threadRole: role, threadDiameter: spec.diameter, threadPitch: spec.pitch, threadProfile: "whitworth", threadChamfer: 0, ...extra } as const;
  const footprint = threadNaturalFootprint(threadSettings(fields));
  const built = createThreadGeometry({ ...fields, width: footprint.width, depth: footprint.depth, height });
  return { position: built.getAttribute("position") as unknown as Position, footprint };
}

/**
 * Die Hoehe des wahren Whitworth-Profils ueber dem Grund, in Steigungen, an
 * der axialen Lage u (Kuppe bei u = 0): unabhaengig vom Code aus den Zahlen
 * der Norm gerechnet - Kuppenbogen, gerade Flanke unter 27,5 Grad, Grundbogen.
 */
function isoProfileHeight(u: number) {
  const r = 0.137329;
  const h = 0.640327;
  const half = (27.5 * Math.PI) / 180;
  const distance = Math.abs(u - Math.round(u));
  const tangentU = r * Math.cos(half);
  const tangentHeight = h - r * (1 - Math.sin(half));
  if (distance <= tangentU) return h - r + Math.sqrt(r * r - distance * distance);
  if (distance >= 0.5 - tangentU) {
    const fromRoot = 0.5 - distance;
    return r - Math.sqrt(r * r - fromRoot * fromRoot);
  }
  return tangentHeight - (distance - tangentU) / Math.tan(half);
}

describe("Whitworth profile (ISO 228-1)", () => {
  it("has the standard's 55 degree form, depth and radius", () => {
    expect(WHITWORTH_PROFILE_CONSTANTS.flankAngleDegrees).toBe(55);
    expect(WHITWORTH_PROFILE_CONSTANTS.heightPerPitch).toBeCloseTo(0.960491, 6);
    expect(WHITWORTH_PROFILE_CONSTANTS.depthPerPitch).toBeCloseTo(0.640327, 6);
    expect(WHITWORTH_PROFILE_CONSTANTS.radiusPerPitch).toBeCloseTo(0.137329, 6);
    expect(threadProfileShape("whitworth").depthPerPitch).toBe(WHITWORTH_PROFILE_CONSTANTS.depthPerPitch);
  });

  it("puts every profile point on the true profile and stays within 0.0013 P between them", () => {
    const { depthPerPitch, points } = threadProfileShape("whitworth");
    expect(points[0]).toEqual({ u: 0, level: 1 });
    points.forEach((point, index) => {
      if (index > 0) expect(point.u).toBeGreaterThan(points[index - 1].u);
      expect(point.u).toBeLessThan(1);
      expect(point.level * depthPerPitch).toBeCloseTo(isoProfileHeight(point.u), 5);
    });
    // Die Mitte des Grunds ist ein Punkt: dort liegt der Kerndurchmesser.
    expect(points.some((point) => Math.abs(point.u - 0.5) < 1e-12 && Math.abs(point.level) < 1e-12)).toBe(true);
    // Linear zwischen den Punkten, wie threadWall die Wendel zieht: jede
    // Sehne liegt auf der Flanke oder spannt einen Bogen, und dessen Pfeilhoehe
    // ist der groesste Abstand zum wahren Profil.
    const r = 0.137329;
    const h = 0.640327;
    const centers = [{ u: 0, y: h - r }, { u: 0.5, y: r }, { u: 1, y: h - r }];
    const flankSlope = Math.tan((27.5 * Math.PI) / 180);
    const closed = [...points, { u: 1, level: 1 }].map((point) => ({ u: point.u, y: point.level * depthPerPitch }));
    let worst = 0;
    let arcs = 0;
    let flanks = 0;
    for (let index = 0; index + 1 < closed.length; index += 1) {
      const start = closed[index];
      const end = closed[index + 1];
      const center = centers.find((entry) => [start, end].every((point) => Math.abs(Math.hypot(point.u - entry.u, point.y - entry.y) - r) < 1e-5));
      if (center) {
        arcs += 1;
        const middle = { u: (start.u + end.u) / 2, y: (start.y + end.y) / 2 };
        worst = Math.max(worst, r - Math.hypot(middle.u - center.u, middle.y - center.y));
      } else {
        // Keine Sehne eines Bogens, also die Flanke: gerade, unter 27,5 Grad.
        flanks += 1;
        expect(Math.abs(end.u - start.u) / Math.abs(end.y - start.y)).toBeCloseTo(flankSlope, 4);
      }
    }
    expect({ arcs, flanks }).toEqual({ arcs: 16, flanks: 2 });
    expect(worst).toBeLessThan(0.0013);
    expect(worst).toBeCloseTo(r * (1 - Math.cos((7.8125 * Math.PI) / 180)), 5);
    // Zwei Nachbarsehnen knicken weniger ab als die 20 Grad, ab denen
    // createThreadGeometry die Normalen trennt - sonst saehe die Rundung kantig aus.
    let sharpest = 0;
    for (let index = 0; index + 2 < closed.length + 1; index += 1) {
      const a = closed[index];
      const b = closed[(index + 1) % closed.length];
      const c = closed[(index + 2) % closed.length];
      const bu = index + 1 >= closed.length ? b.u + 1 : b.u;
      const cu = index + 2 >= closed.length ? c.u + 1 : c.u;
      const first = Math.atan2(b.y - a.y, bu - a.u);
      const second = Math.atan2(c.y - b.y, cu - bu);
      sharpest = Math.max(sharpest, Math.abs(second - first) * (180 / Math.PI));
    }
    expect(sharpest).toBeLessThan(20);
  });

  it("keeps the profile when saved and normalised", () => {
    expect(normalizeThreadProfile("whitworth")).toBe("whitworth");
    expect(normalizeThreadProfile("bsw")).toBe("v");
    expect(normalizeShapeCustomizations({ thread: { threadProfile: "whitworth" } }).thread?.threadProfile).toBe("whitworth");
  });
});

describe("G pipe thread series (ISO 228-1)", () => {
  const group = THREAD_SIZE_GROUPS.find((entry) => entry.series === "G");

  it("is its own series in the menu, after UNC and UNF", () => {
    expect(THREAD_SIZE_GROUPS.map((entry) => entry.series)).toEqual(["metric", "UNC", "UNF", "G", "bottle"]);
    expect(group?.sizes.map((size) => size.id)).toEqual(ISO_228_1.map(([label]) => `G${label}`));
  });

  it.each(ISO_228_1)("G%s has the standard's diameters and pitch", (label, threadsPerInch, major, minor) => {
    const size = threadSizeById(`G${label}`);
    expect(size?.system).toBe("pipe");
    expect(size?.profile).toBe("whitworth");
    expect(size?.diameter).toBe(major);
    expect(pitchToThreadsPerInch(size?.pitch as number)).toBeCloseTo(threadsPerInch, 9);
    // Der Kerndurchmesser ist der Aussendurchmesser weniger zweimal die Tiefe.
    const computedMinor = major - 2 * (size?.pitch as number) * WHITWORTH_PROFILE_CONSTANTS.depthPerPitch;
    expect(Math.abs(computedMinor - minor)).toBeLessThan(0.001);
    expect(threadSizeFor(major, size?.pitch as number)?.id).toBe(`G${label}`);
    expect(threadUsesInchPitch(major)).toBe(true);
    expect(defaultThreadPitch(major)).toBe(size?.pitch);
  });

  it("cuts a G1 rod between the standard's major and minor diameter", () => {
    const { position } = geometry("rod", "G1", 30);
    const { smallest, largest } = radiusRange(position, 5, 25);
    expect(largest).toBeCloseTo(33.249 / 2, 4);
    expect(smallest).toBeCloseTo(30.291 / 2, 3);
  });

  it("gives a G nut and tapped hole their clearance the way every profile does", () => {
    // Spiel heisst: das Innengewinde rueckt als Ganzes um die Haelfte nach aussen.
    for (const role of ["nut", "bore"] as const) {
      for (const threadProfile of ["v", "whitworth"] as const) {
        const tight = radiusRange(geometry(role, "G1/2", 12, { threadProfile, threadClearance: 0 }).position, 3, 9);
        const loose = radiusRange(geometry(role, "G1/2", 12, { threadProfile, threadClearance: 0.4 }).position, 3, 9);
        expect(loose.smallest - tight.smallest).toBeCloseTo(0.2, 4);
        if (role === "bore") expect(loose.largest - tight.largest).toBeCloseTo(0.2, 4);
      }
    }
    const tight = geometry("bore", "G1/2", 12, { threadClearance: 0 });
    const loose = geometry("bore", "G1/2", 12, { threadClearance: 0.4 });
    expect(loose.footprint.width).toBeCloseTo(tight.footprint.width + 0.4, 6);
    // Die Ansenkung reicht wie bei den anderen Profilen genau die Gewindetiefe hinunter.
    const pitch = threadSizeById("G1/2")?.pitch as number;
    expect(defaultThreadChamfer(pitch, "whitworth", "bore")).toBeCloseTo(pitch * 0.640327, 5);
  });

  it("leaves the pitch of free diameters as it was", () => {
    // Die G-Durchmesser liegen zwischen den Schraubengroessen; ein freies Mass
    // dazwischen behaelt die Steigung des naechsten Schraubengewindes.
    expect(defaultThreadPitch(9)).toBeCloseTo(25.4 / 16, 9);
    expect(defaultThreadPitch(13)).toBeCloseTo(25.4 / 13, 9);
    // Since M14 to M24 are in the list (#659), 21 mm lies between M20 and M22, nearer than 3/4".
    expect(defaultThreadPitch(21)).toBe(2.5);
    expect(defaultThreadPitch(33)).toBeCloseTo(25.4 / 8, 9);
    expect(defaultThreadPitch(8)).toBe(1.25);
    expect(threadUsesInchPitch(21)).toBe(false);
  });

  it("brings its profile along when picked, and leaves a chosen print profile alone", () => {
    const g = threadSizeById("G1/2")!;
    const m = threadSizeById("M8")!;
    const unc = threadSizeById('1/4"-20 UNC')!;
    expect(threadProfileForSize(g, "v")).toBe("whitworth");
    expect(threadProfileForSize(g, "whitworth")).toBe("whitworth");
    expect(threadProfileForSize(m, "whitworth")).toBe("v");
    expect(threadProfileForSize(unc, "whitworth")).toBe("v");
    expect(threadProfileForSize(g, "round")).toBe("round");
    expect(threadProfileForSize(m, "trapezoidal")).toBe("trapezoidal");
  });

  it.each(["G1/16", "G4"].flatMap((size) => (["rod", "screw", "nut", "bore"] as const).flatMap((role) => (["right", "left"] as const).map((hand) => [size, role, hand] as const))))(
    "builds a closed %s %s, %s-hand",
    (size, role, threadHand) => {
      const { position } = geometry(role, size, role === "nut" ? 20 : 40, { threadChamfer: undefined, threadHand });
      expect(position.count).toBeGreaterThan(1000);
      expect(openOrDoubledEdges(position)).toBe(0);
    },
  );
});

describe("threadSize through the MCP bridge", () => {
  it("turns a size name into diameter, pitch and profile", () => {
    const g = threadSizeById("G3/4")!;
    expect(mcpThreadSizeParams({ threadSize: "G3/4", threadRole: "nut" }, "v")).toEqual({
      threadSize: "G3/4",
      threadRole: "nut",
      threadDiameter: g.diameter,
      threadPitch: g.pitch,
      threadProfile: "whitworth",
    });
    expect(mcpThreadSizeParams({ threadSize: "M6" }, "whitworth").threadProfile).toBe("v");
    expect(mcpThreadSizeParams({ threadSize: "G1", threadProfile: "round" }, "v").threadProfile).toBe("round");
    expect(mcpThreadSizeParams({ threadSize: "G1" }, "trapezoidal").threadProfile).toBe("trapezoidal");
    const untouched = { threadDiameter: 6 };
    expect(mcpThreadSizeParams(untouched, "v")).toBe(untouched);
  });

  it("takes back the settings block it reported, unchanged", () => {
    // Die Auskunft meldet threadSize neben Durchmesser und Steigung; derselbe
    // Block muss sich wieder senden lassen.
    const g = threadSizeById("G1/2")!;
    const reported = { threadSize: "G1/2", threadDiameter: g.diameter, threadPitch: g.pitch, threadProfile: "whitworth", threadRole: "nut" };
    expect(mcpThreadSizeParams(reported, "whitworth")).toEqual(reported);
    // Nur die Rolle geaendert: genauso.
    expect(mcpThreadSizeParams({ ...reported, threadRole: "bore" }, "whitworth").threadDiameter).toBe(g.diameter);
  });

  it("ignores an invalid profile next to a size instead of losing the switch", () => {
    expect(mcpThreadSizeParams({ threadSize: "G1", threadProfile: "bsp" }, "v").threadProfile).toBe("whitworth");
  });

  it("refuses unknown names and a size together with a diameter or pitch that does not match", () => {
    expect(() => mcpThreadSizeParams({ threadSize: "G5" }, "v")).toThrow(/Unknown threadSize "G5"/);
    expect(() => mcpThreadSizeParams({ threadSize: 12 }, "v")).toThrow(/standard size/);
    expect(() => mcpThreadSizeParams({ threadSize: "G1", threadDiameter: 33 }, "v")).toThrow(/say otherwise/);
    expect(() => mcpThreadSizeParams({ threadSize: "G1", threadPitch: 2.3 }, "v")).toThrow(/say otherwise/);
    expect(() => mcpThreadSizeParams({ threadSize: "G1", threadDiameter: "33.249" }, "v")).toThrow(/say otherwise/);
  });

  it("reports the size name only for a thread on a standard size", () => {
    const g = threadSizeById("G1/2")!;
    expect(mcpThreadSizeName({ kind: "thread", threadDiameter: g.diameter, threadPitch: g.pitch })).toBe("G1/2");
    expect(mcpThreadSizeName({ kind: "thread", threadDiameter: 6, threadPitch: 1 })).toBe("M6");
    expect(mcpThreadSizeName({ kind: "thread", threadDiameter: 21, threadPitch: 1.5 })).toBeUndefined();
    expect(mcpThreadSizeName({ kind: "cylinder", threadDiameter: 6, threadPitch: 1 })).toBeUndefined();
  });
});
