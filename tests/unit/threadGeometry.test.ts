import { describe, expect, it } from "vitest";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import {
  createThreadGeometry,
  threadBuildPlan,
  defaultThreadPitch,
  normalizeThreadPitch,
  normalizeThreadQuality,
  threadNaturalFootprint,
  threadSettings,
  threadSizeFor,
  defaultThreadChamfer,
  defaultThreadHeadHeight,
  pitchToThreadsPerInch,
  threadUsesInchPitch,
  threadsPerInchToPitch,
  threadHeadDiameter,
  threadHeadChamferLimits,
  normalizeThreadHeadChamfer,
  threadDriveFields,
  threadDriveOutline,
  threadDriveOutlinePoints,
  threadDriveRadius,
  threadDriveSizeLimits,
  threadFootprintPatch,
} from "@/lib/threadGeometry";
import { THREAD_PROFILES } from "@/lib/threadProfiles";
import type { ThreadDrive, ThreadRole } from "@/types/layerling";

type Position = {
  count: number;
  getX: (index: number) => number;
  getY: (index: number) => number;
  getZ: (index: number) => number;
};

/**
 * Jede Kante eines geschlossenen Koerpers gehoert genau zwei Dreiecken. Steht
 * irgendwo eine Eins, hat der Koerper ein Loch; steht dort eine Drei, liegen
 * Flaechen doppelt. Beides faellt beim Drucken auf, hier vorher.
 */
function edgeUseCounts(position: Position) {
  const uses = new Map<string, number>();
  const keyForPoint = (index: number) => [position.getX(index), position.getY(index), position.getZ(index)]
    .map((value) => value.toFixed(5))
    .join(",");
  for (let index = 0; index + 2 < position.count; index += 3) {
    const triangle = [keyForPoint(index), keyForPoint(index + 1), keyForPoint(index + 2)];
    if (triangle[0] === triangle[1] || triangle[1] === triangle[2] || triangle[0] === triangle[2]) continue;
    for (let edge = 0; edge < 3; edge += 1) {
      const a = triangle[edge];
      const b = triangle[(edge + 1) % 3];
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      uses.set(key, (uses.get(key) ?? 0) + 1);
    }
  }
  return uses;
}

/** Positiv heisst: die Dreiecke schauen nach aussen. */
function signedVolume(position: Position) {
  let total = 0;
  for (let index = 0; index + 2 < position.count; index += 3) {
    const ax = position.getX(index);
    const ay = position.getY(index);
    const az = position.getZ(index);
    const bx = position.getX(index + 1);
    const by = position.getY(index + 1);
    const bz = position.getZ(index + 1);
    const cx = position.getX(index + 2);
    const cy = position.getY(index + 2);
    const cz = position.getZ(index + 2);
    total += (ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx)) / 6;
  }
  return total;
}

function geometryFor(role: ThreadRole, height: number, overrides: Record<string, unknown> = {}) {
  const settings = threadSettings({ threadRole: role, threadDiameter: 6, threadPitch: 1, ...overrides });
  const footprint = threadNaturalFootprint(settings);
  return {
    settings,
    footprint,
    geometry: createThreadGeometry({
      width: footprint.width,
      depth: footprint.depth,
      height,
      threadRole: role,
      threadDiameter: 6,
      threadPitch: 1,
      ...overrides,
    }),
  };
}

describe("thread geometry", () => {
  it.each<[ThreadRole, number]>([["rod", 20], ["screw", 24], ["nut", 5], ["bore", 14]])(
    "creates a closed %s that fills the requested bounds",
    (role, height) => {
      const { geometry, footprint } = geometryFor(role, height);
      const position = geometry.getAttribute("position") as unknown as Position;

      expect(position.count).toBeGreaterThan(1000);
      expect([...edgeUseCounts(position).values()].every((uses) => uses === 2)).toBe(true);
      expect(signedVolume(position)).toBeGreaterThan(0);
      expect(geometry.boundingBox?.min.y).toBeCloseTo(0, 5);
      expect(geometry.boundingBox?.max.y).toBeCloseTo(height, 5);
      expect((geometry.boundingBox?.max.x ?? 0) - (geometry.boundingBox?.min.x ?? 0)).toBeCloseTo(footprint.width, 4);
      expect((geometry.boundingBox?.max.z ?? 0) - (geometry.boundingBox?.min.z ?? 0)).toBeCloseTo(footprint.depth, 4);
    },
  );

  /*
   * Ein Rechtsgewinde steigt, wenn man es rechtsherum um die Hochachse dreht:
   * Daumen der rechten Hand nach +y, die Finger zeigen den Weg von +z nach +x.
   * Netz und CAD-Koerper werden nur gegeneinander geprueft; liefen beide
   * falsch herum, fiele das dort nicht auf - hier schon. Gemessen an den
   * Spitzen: Hoehe minus Vorschub ueber den Winkel bleibt fuer die richtige
   * Richtung ueberall gleich (bis auf ganze Steigungen), fuer die falsche nicht.
   */
  it.each<["right" | "left", 1 | -1]>([["right", 1], ["left", -1]])("winds a %s-hand thread the right way round", (threadHand, climb) => {
    const { geometry, settings } = geometryFor("rod", 20, { threadHand, threadChamfer: 0 });
    const position = geometry.getAttribute("position") as unknown as Position;
    const radii = Array.from({ length: position.count }, (_, index) => Math.hypot(position.getX(index), position.getZ(index)));
    const crest = Math.max(...radii);
    const coherence = (sign: number) => {
      let sumCos = 0;
      let sumSin = 0;
      let count = 0;
      for (let index = 0; index < position.count; index += 1) {
        const y = position.getY(index);
        if (radii[index] < crest - 0.02 || y < 3 || y > 17) continue;
        const turn = Math.atan2(position.getX(index), position.getZ(index)) / (Math.PI * 2);
        const phase = (y / settings.pitch - sign * turn) * Math.PI * 2;
        sumCos += Math.cos(phase);
        sumSin += Math.sin(phase);
        count += 1;
      }
      return Math.hypot(sumCos, sumSin) / count;
    };
    expect(coherence(climb)).toBeGreaterThan(0.9);
    expect(coherence(-climb)).toBeLessThan(0.5);
  });

  it("stays closed on a left-hand thread and on a coarse pitch", () => {
    for (const overrides of [{ threadHand: "left" }, { threadPitch: 4 }, { threadPitch: 0.35 }]) {
      const { geometry } = geometryFor("rod", 12, overrides);
      const position = geometry.getAttribute("position") as unknown as Position;
      expect([...edgeUseCounts(position).values()].every((uses) => uses === 2)).toBe(true);
      expect(signedVolume(position)).toBeGreaterThan(0);
    }
  });

  it("stays closed for every screw head", () => {
    for (const threadHead of ["cylinder", "countersunk", "hex"]) {
      const { geometry } = geometryFor("screw", 24, { threadHead });
      const position = geometry.getAttribute("position") as unknown as Position;
      expect([...edgeUseCounts(position).values()].every((uses) => uses === 2)).toBe(true);
      expect(signedVolume(position)).toBeGreaterThan(0);
    }
  });

  it("cuts the thread between the minor and the major diameter", () => {
    const { geometry } = geometryFor("rod", 20);
    const position = geometry.getAttribute("position") as unknown as Position;
    let smallest = Number.POSITIVE_INFINITY;
    let largest = 0;
    for (let index = 0; index < position.count; index += 1) {
      const y = position.getY(index);
      // Die Deckel ziehen den Radius bis zur Mitte, deshalb nur die Mantelflaeche.
      if (y < 4 || y > 16) continue;
      const radius = Math.hypot(position.getX(index), position.getZ(index));
      if (radius < smallest) smallest = radius;
      if (radius > largest) largest = radius;
    }
    // M6 mit einem Millimeter Steigung: Aussenradius 3, Kernradius rund 2,46.
    expect(largest).toBeCloseTo(3, 3);
    expect(smallest).toBeCloseTo(3 - 0.5413, 3);
  });

  it("hollows the nut out and leaves the bore wider than the bolt", () => {
    const nut = geometryFor("nut", 5);
    const nutVolume = signedVolume(nut.geometry.getAttribute("position") as unknown as Position);
    const acrossFlats = nut.footprint.depth;
    const solidHexVolume = ((Math.sqrt(3) / 2) * acrossFlats * acrossFlats) * 5;
    expect(nutVolume).toBeGreaterThan(solidHexVolume * 0.4);
    expect(nutVolume).toBeLessThan(solidHexVolume * 0.85);

    const bore = geometryFor("bore", 14, { threadClearance: 0.4, threadChamfer: 0 });
    const rod = geometryFor("rod", 14, { threadChamfer: 0 });
    expect(bore.footprint.width).toBeCloseTo(rod.footprint.width + 0.4, 6);
    // Die Fase weitet das Schneidwerkzeug am Mund zur Ansenkung auf.
    const sunk = geometryFor("bore", 14, { threadClearance: 0.4, threadChamfer: 0.8 });
    expect(sunk.footprint.width).toBeCloseTo(bore.footprint.width + 1.6, 6);
  });

  it("makes a rod or screw thinner by its bolt clearance, and leaves old ones alone", () => {
    const rod = geometryFor("rod", 14, { threadChamfer: 0 });
    // The 0.2 mm every rod already carries in threadClearance must not start to act.
    const oldRod = geometryFor("rod", 14, { threadChamfer: 0, threadClearance: 0.2 });
    expect(oldRod.footprint.width).toBeCloseTo(rod.footprint.width, 6);
    const thinner = geometryFor("rod", 14, { threadChamfer: 0, threadBoltClearance: 0.3 });
    expect(thinner.footprint.width).toBeCloseTo(rod.footprint.width - 0.3, 6);
    const plan = threadBuildPlan({ width: 6, depth: 6, height: 14, threadRole: "screw", threadDiameter: 6, threadPitch: 1, threadBoltClearance: 0.3 });
    expect(plan.major).toBeCloseTo(3 - 0.15, 6);
    // A nut ignores the bolt clearance and keeps its own.
    const nut = threadBuildPlan({ width: 10, depth: 10, height: 5, threadRole: "nut", threadDiameter: 6, threadPitch: 1, threadClearance: 0.2, threadBoltClearance: 0.3 });
    expect(nut.major).toBeCloseTo(3 + 0.1, 6);
    expect(threadSettings({ threadBoltClearance: 5 }).boltClearance).toBe(1);
    expect(threadSettings({}).boltClearance).toBe(0);
  });

  it("keeps the standard sizes reachable and the free values in range", () => {
    expect(threadSizeFor(6, 1)?.id).toBe("M6");
    expect(threadSizeFor(6, 1.25)).toBeNull();
    expect(defaultThreadPitch(8)).toBe(1.25);
    // Eine Steigung groesser als der Durchmesser haette keinen Kern mehr uebrig.
    expect(normalizeThreadPitch(40, 6)).toBe(4.5);
    expect(normalizeThreadQuality(50)).toBe(48);
    expect(normalizeThreadQuality(1000)).toBe(96);
  });

  it("carries the thread settings through a saved package", async () => {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "thread");
    expect(asset).toBeDefined();
    const shape = makeShapeFromAsset(asset!, { x: 4, z: 6 }, {
      threadRole: "screw",
      threadHead: "hex",
      threadHand: "left",
      threadDiameter: 8,
      threadPitch: 1.25,
      threadClearance: 0.35,
      threadBoltClearance: 0.25,
      threadQuality: 60,
    });
    const shapes = [shape];
    const bytes = await exportLylProject({
      projectId: "project-thread",
      projectName: "Gewinde",
      createdAt: 1_700_000_000_000,
      modifiedAt: 1_700_000_100_000,
      shapes,
      history: [editorHistoryEntry(shapes, [])],
      historyIndex: 0,
      assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      snapGrid: DEFAULT_SNAP_GRID,
      placementElevation: 0,
    });
    const restored = await importLylProject(bytes);
    const loaded = restored.shapes[0];

    expect(loaded.kind).toBe("thread");
    expect(loaded.threadRole).toBe("screw");
    expect(loaded.threadHead).toBe("hex");
    expect(loaded.threadHand).toBe("left");
    expect(loaded.threadDiameter).toBe(8);
    expect(loaded.threadPitch).toBe(1.25);
    expect(loaded.threadClearance).toBe(0.35);
    expect(loaded.threadBoltClearance).toBe(0.25);
    expect(loaded.threadQuality).toBe(60);
  });
  /*
   * Eine gedrehte Mutter ist im Datensatz ein Netz. Ohne `parametricSource`
   * waere nach dem Laden nicht mehr zu erkennen, dass sie eine Mutter war -
   * und ihre Bauwerte blieben fuer immer unerreichbar.
   */
  it("nimmt die Urform einer gedrehten Form mit ins gespeicherte Paket", async () => {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "thread");
    const mutter = makeShapeFromAsset(asset!, { x: 4, z: 6 }, { threadRole: "nut", threadDiameter: 12, threadPitch: 1.75 });
    const gedreht: typeof mutter = {
      ...mutter,
      kind: "mesh",
      importedMesh: {
        positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
        baseWidth: mutter.width,
        baseDepth: mutter.depth,
        baseHeight: mutter.height,
        triangleCount: 1,
        sourceFormat: "json",
      },
      parametricSource: {
        kind: "thread",
        width: mutter.width,
        depth: mutter.depth,
        height: mutter.height,
        size: mutter.size,
        rotation: 30,
        rotationX: 90,
        rotationZ: 0,
      },
    };
    const shapes = [gedreht];
    const bytes = await exportLylProject({
      projectId: "project-gedreht",
      projectName: "Gedrehte Mutter",
      createdAt: 1_700_000_000_000,
      modifiedAt: 1_700_000_100_000,
      shapes,
      history: [editorHistoryEntry(shapes, [])],
      historyIndex: 0,
      assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      snapGrid: DEFAULT_SNAP_GRID,
      placementElevation: 0,
    });
    const loaded = (await importLylProject(bytes)).shapes[0];

    expect(loaded.parametricSource?.kind).toBe("thread");
    expect(loaded.parametricSource?.rotation).toBe(30);
    expect(loaded.parametricSource?.rotationX).toBe(90);
    expect(loaded.parametricSource?.height).toBeCloseTo(mutter.height, 6);
    // Und die Bauwerte stehen weiter am Koerper selbst.
    expect(loaded.threadRole).toBe("nut");
    expect(loaded.threadDiameter).toBe(12);
  });

  it("turns a pull on the handles into a diameter, never into an oval", () => {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "thread");
    const shape = makeShapeFromAsset(asset!, { x: 0, z: 0 });
    expect(shape.threadDiameter).toBe(6);
    expect(shape.width).toBeCloseTo(6, 6);

    // So schreibt der Anfasser im Arbeitsbereich: direkt in Breite und Tiefe.
    const dragged = canonicalizeShape({ ...shape, width: 12, depth: 9 });

    expect(dragged.width).toBeCloseTo(dragged.depth as number, 6);
    expect(dragged.threadDiameter).toBeCloseTo(10.5, 6);
    expect(dragged.width).toBeCloseTo(10.5, 6);
    // Die Steigung waechst mit, sonst haette der Koerper kein stimmiges Profil.
    expect(dragged.threadPitch).toBeCloseTo(1.75, 6);

    // Ohne Zug bleibt alles, wie es ist - sonst liefe jedes Speichern davon.
    const again = canonicalizeShape(dragged);
    expect(again.threadDiameter).toBeCloseTo(dragged.threadDiameter as number, 9);
    expect(again.width).toBeCloseTo(dragged.width as number, 9);
  });

  it("keeps the head height on its own and lets the countersunk crown follow it", () => {
    const screw = threadSettings({ threadRole: "screw", threadHead: "cylinder", threadDiameter: 6, threadPitch: 1 });
    expect(screw.headHeight).toBeCloseTo(defaultThreadHeadHeight(screw), 6);
    expect(screw.headHeight).toBeCloseTo(6, 6);

    const flatter = threadSettings({ threadRole: "screw", threadHead: "cylinder", threadDiameter: 6, threadPitch: 1, threadHeadHeight: 3 });
    expect(flatter.headHeight).toBeCloseTo(3, 6);
    // Der Zylinderkopf behaelt seinen Durchmesser, der Senkkopf nicht.
    expect(threadHeadDiameter(flatter)).toBeCloseTo(threadHeadDiameter(screw), 6);

    const sunk = threadSettings({ threadRole: "screw", threadHead: "countersunk", threadDiameter: 6, threadPitch: 1 });
    expect(sunk.headHeight).toBeCloseTo(3, 6);
    expect(threadHeadDiameter(sunk)).toBeCloseTo(12, 6);
    const sunkFlat = threadSettings({ threadRole: "screw", threadHead: "countersunk", threadDiameter: 6, threadPitch: 1, threadHeadHeight: 2 });
    expect(threadHeadDiameter(sunkFlat)).toBeCloseTo(10, 6);
    expect(threadNaturalFootprint(sunkFlat).width).toBeCloseTo(10, 6);

    // Der Kopf darf die Gewindelaenge nicht auffressen.
    const tall = createThreadGeometry({
      width: 10,
      depth: 10,
      height: 24,
      threadRole: "screw",
      threadDiameter: 6,
      threadPitch: 1,
      threadHeadHeight: 9,
    });
    expect(tall.boundingBox?.max.y).toBeCloseTo(24, 5);
    expect(tall.boundingBox?.min.y).toBeCloseTo(0, 5);
  });
  it("breaks the sharp edge at the ends and stays closed doing it", () => {
    const plain = geometryFor("rod", 16, { threadChamfer: 0 });
    const plainPosition = plain.geometry.getAttribute("position") as unknown as Position;
    expect([...edgeUseCounts(plainPosition).values()].every((uses) => uses === 2)).toBe(true);

    const chamfer = defaultThreadChamfer(1);
    const broken = geometryFor("rod", 16, { threadChamfer: chamfer });
    const position = broken.geometry.getAttribute("position") as unknown as Position;
    expect([...edgeUseCounts(position).values()].every((uses) => uses === 2)).toBe(true);
    expect(signedVolume(position)).toBeGreaterThan(0);
    expect(signedVolume(position)).toBeLessThan(signedVolume(plainPosition));

    // Bei einem freien Ende (hier: Stange) ist die Vorgabe eine volle
    // Steigung, damit die Kuppe spuerbar unter den Kerndurchmesser hinauslaeuft
    // statt nur die Kante zu brechen - die Stirnflaeche endet entsprechend bei
    // Aussenradius minus dieser Fase, nicht erst beim Kern.
    let widest = 0;
    for (let index = 0; index < position.count; index += 1) {
      if (position.getY(index) > 0.001) continue;
      widest = Math.max(widest, Math.hypot(position.getX(index), position.getZ(index)));
    }
    expect(widest).toBeCloseTo(3 - chamfer, 3);

    // Auf halber Hoehe darf die Fase nichts weggenommen haben.
    let middle = 0;
    for (let index = 0; index < position.count; index += 1) {
      const y = position.getY(index);
      if (y < 7 || y > 9) continue;
      middle = Math.max(middle, Math.hypot(position.getX(index), position.getZ(index)));
    }
    expect(middle).toBeCloseTo(3, 3);
  });

  /*
   * Fraterculas Meldung aus dem Forum: das freie Gewindeende einer Schraube
   * lief bis dahin als scharfe Messerkante aus - schlecht zum Einfaedeln ins
   * Gegengewinde und schlecht druckbar. Ursache war nicht die Mechanik (die
   * Fase hat immer schon einen sauberen 45-Grad-Kegel gezogen), sondern die
   * Vorgabe: eine halbe Steigung ist auf einem M8-Gewinde weniger als ein
   * Millimeter und damit kaum wahrnehmbar. Ein Innengewinde (Mutter,
   * Gewindeloch) entgratet dagegen nur eine Muendung und soll dabei nicht
   * unnoetig vom Gewinde selbst opfern - dort bleibt die alte, flachere
   * Vorgabe richtig.
   */
  it("gives a free thread end a full pitch of lead-in instead of a knife edge", () => {
    expect(defaultThreadChamfer(1.25, "v", "screw")).toBeCloseTo(1.25, 6);
    expect(defaultThreadChamfer(1.25, "v", "rod")).toBeCloseTo(1.25, 6);
    // Innengewinde: unveraendert an die Gewindetiefe gekoppelt.
    expect(defaultThreadChamfer(1.25, "v", "nut")).toBeCloseTo(1.25 * 0.5413, 3);
    expect(defaultThreadChamfer(1.25, "v", "bore")).toBeCloseTo(1.25 * 0.5413, 3);

    // Ohne eigene Angabe zieht eine frisch angelegte Schraube diese Vorgabe:
    // die Spitze muss spuerbar unter den Kerndurchmesser hinauslaufen, nicht
    // nur bis auf ihn.
    const tip = geometryFor("screw", 30, { threadHead: "hex", threadDiameter: 8, threadPitch: 1.25 });
    const major = tip.settings.diameter / 2;
    const minor = major - tip.settings.pitch * 0.5413;
    const position = tip.geometry.getAttribute("position") as unknown as Position;
    let tipRadius = Infinity;
    for (let index = 0; index < position.count; index += 1) {
      if (position.getY(index) < 29.999) continue;
      tipRadius = Math.min(tipRadius, Math.hypot(position.getX(index), position.getZ(index)));
    }
    expect(tipRadius).toBeLessThan(minor - 0.1);
  });

  /*
   * Fraterculas Meldung aus dem Forum: am Schraubenkopf sind alle Kanten
   * scharf, und die Kantenbearbeitung laeuft an der tessellierten Wendel in
   * die Zeitueberschreitung. Die Kopffase bricht die Kante dort, wo sie
   * hingehoert - im Erzeuger.
   */
  it("bricht die Kante des Schraubenkopfs und bleibt dabei dicht", () => {
    for (const threadHead of ["cylinder", "hex"]) {
      const scharf = geometryFor("screw", 24, { threadHead });
      // Der Hoechstwert haengt vom Kopf ab - beim Sechskant frisst der Kegel
      // an den Ecken mehr Hoehe. Also von der Grenze her messen, nicht raten.
      const grenze = threadHeadChamferLimits(scharf.settings).max;
      expect(grenze).toBeGreaterThan(0.3);
      const fase = grenze * 0.8;
      const gebrochen = geometryFor("screw", 24, { threadHead, threadHeadChamfer: fase });
      const kante = gebrochen.geometry.getAttribute("position") as unknown as Position;

      expect(gebrochen.settings.headChamfer).toBeCloseTo(fase, 6);
      expect([...edgeUseCounts(kante).values()].every((uses) => uses === 2)).toBe(true);
      // Eine Fase nimmt Material weg, sie fuegt keines hinzu.
      const scharfesVolumen = signedVolume(scharf.geometry.getAttribute("position") as unknown as Position);
      const gebrochenesVolumen = signedVolume(kante);
      expect(gebrochenesVolumen).toBeGreaterThan(0);
      expect(gebrochenesVolumen).toBeLessThan(scharfesVolumen);
      // Der Koerper behaelt seinen Platzbedarf: die Fase sitzt innen.
      expect(gebrochen.geometry.boundingBox?.min.y).toBeCloseTo(0, 5);
      expect(gebrochen.geometry.boundingBox?.max.y).toBeCloseTo(24, 5);
      expect(gebrochen.footprint.width).toBeCloseTo(scharf.footprint.width, 6);
    }
  });

  /*
   * Beide Kanten, nicht nur die untere. Der Koerper steht auf seinem Kopf -
   * die freie Flaeche liegt also auf der Ebene, und wer nur dort brechen
   * wuerde, haette einen Regler gebaut, dem man nichts ansieht.
   */
  it("zieht beide Enden des Kopfes genau um die Fase ein", () => {
    const fase = 0.8;
    const { geometry, settings } = geometryFor("screw", 24, { threadHead: "cylinder", threadHeadChamfer: fase });
    const position = geometry.getAttribute("position") as unknown as Position;
    const kopfhoehe = settings.headHeight;
    let amFreienEnde = 0;
    let amSchaftende = 0;
    for (let index = 0; index < position.count; index += 1) {
      const y = position.getY(index);
      const radius = Math.hypot(position.getX(index), position.getZ(index));
      if (Math.abs(y) < 1e-6) amFreienEnde = Math.max(amFreienEnde, radius);
      // Am Kopfende zaehlt nur der Kopf selbst, nicht der Schaft darueber.
      if (Math.abs(y - kopfhoehe) < 1e-6) amSchaftende = Math.max(amSchaftende, radius);
    }
    const eingezogen = threadHeadDiameter(settings) / 2 - fase;
    expect(amFreienEnde).toBeCloseTo(eingezogen, 4);
    expect(amSchaftende).toBeCloseTo(eingezogen, 4);
  });

  /*
   * Dasselbe an der Mutter: sie *ist* ihr Kopf, also ist die ganze Hoehe der
   * Platz fuer die beiden Kegel, und von innen frisst die Ansenkung der
   * Bohrung mit. Eine echte Mutter ist an beiden Seiten gefast.
   */
  it("bricht beide Aussenkanten der Mutter und bleibt dabei dicht", () => {
    const scharf = geometryFor("nut", 5);
    const grenze = threadHeadChamferLimits(scharf.settings).max;
    expect(grenze).toBeGreaterThan(0.3);
    const fase = grenze * 0.8;
    const gebrochen = geometryFor("nut", 5, { threadHeadChamfer: fase });
    const position = gebrochen.geometry.getAttribute("position") as unknown as Position;

    expect(gebrochen.settings.headChamfer).toBeCloseTo(fase, 6);
    expect([...edgeUseCounts(position).values()].every((uses) => uses === 2)).toBe(true);
    const scharfesVolumen = signedVolume(scharf.geometry.getAttribute("position") as unknown as Position);
    const gebrochenesVolumen = signedVolume(position);
    expect(gebrochenesVolumen).toBeGreaterThan(0);
    expect(gebrochenesVolumen).toBeLessThan(scharfesVolumen);
    // Der Platzbedarf bleibt: die Schluesselweite ist die Schluesselweite.
    expect(gebrochen.footprint.width).toBeCloseTo(scharf.footprint.width, 6);
    expect(gebrochen.geometry.boundingBox?.min.y).toBeCloseTo(0, 5);
    expect(gebrochen.geometry.boundingBox?.max.y).toBeCloseTo(5, 5);
  });

  it("zieht beide Stirnflaechen der Mutter ein und laesst die Bohrung frei", () => {
    const scharf = geometryFor("nut", 5);
    const fase = threadHeadChamferLimits(scharf.settings).max * 0.8;
    const { geometry, settings } = geometryFor("nut", 5, { threadHeadChamfer: fase });
    const position = geometry.getAttribute("position") as unknown as Position;
    const spec = threadSizeFor(settings.diameter, settings.pitch);
    const eingezogen = (spec?.acrossFlats ?? 0) / 2 - fase;
    let unten = 0;
    let oben = 0;
    let engste = Number.POSITIVE_INFINITY;
    for (let index = 0; index < position.count; index += 1) {
      const y = position.getY(index);
      const radius = Math.hypot(position.getX(index), position.getZ(index));
      if (Math.abs(y) < 1e-6) { unten = Math.max(unten, radius); engste = Math.min(engste, radius); }
      if (Math.abs(y - 5) < 1e-6) oben = Math.max(oben, radius);
    }
    expect(unten).toBeCloseTo(eingezogen, 4);
    expect(oben).toBeCloseTo(eingezogen, 4);
    /*
     * Die Fase kommt von aussen, die Bohrung bleibt unberuehrt: der engste
     * Punkt der Stirnflaeche ist nach wie vor das angesenkte Mundloch -
     * Flankendurchmesser plus halbes Spiel plus die Ansenkung.
     */
    expect(engste).toBeCloseTo(settings.diameter / 2 + settings.clearance / 2 + settings.chamfer, 4);
    // Und zwischen Mundloch und Fase bleibt eine ebene Stirnflaeche stehen.
    expect(unten).toBeGreaterThan(engste + 0.2);
  });

  it("schneidet die Fase nach, wenn die Mutter flacher gezogen wurde", () => {
    /*
     * Die Grenze rechnet mit dem Normmass, weil `threadSettings` die Hoehe des
     * Koerpers nicht kennt. Wer die Mutter halb so hoch zieht, haette sonst
     * zwei Kegel, die sich in der Mitte treffen - der Erzeuger schneidet den
     * Wert deshalb noch einmal nach.
     */
    const voll = threadHeadChamferLimits(geometryFor("nut", 5).settings).max;
    const flach = geometryFor("nut", 2, { threadHeadChamfer: voll });
    const position = flach.geometry.getAttribute("position") as unknown as Position;
    expect([...edgeUseCounts(position).values()].every((uses) => uses === 2)).toBe(true);
    expect(signedVolume(position)).toBeGreaterThan(0);
    expect(flach.geometry.boundingBox?.max.y).toBeCloseTo(2, 5);
  });

  it("gibt dem Senkkopf keine Fase - sein Kegel ist schon eine", () => {
    const senkkopf = { role: "screw", head: "countersunk", diameter: 6, pitch: 1, headHeight: 2 } as const;
    expect(threadHeadChamferLimits(senkkopf).max).toBe(0);
    expect(normalizeThreadHeadChamfer(2, senkkopf)).toBe(0);
    // Die Gewindestange hat gar keine Aussenkante, das Gewindeloch erst recht.
    expect(threadHeadChamferLimits({ role: "rod", head: "cylinder", diameter: 6, pitch: 1, headHeight: 0 }).max).toBe(0);
    expect(threadHeadChamferLimits({ role: "bore", head: "cylinder", diameter: 6, pitch: 1, headHeight: 0 }).max).toBe(0);
    // Die Mutter dagegen schon, und ihre Kopfform steht auf gar nichts.
    expect(threadHeadChamferLimits({ role: "nut", head: "cylinder", diameter: 6, pitch: 1, headHeight: 0 }).max).toBeGreaterThan(0.3);
  });

  it("laesst ein gespeichertes Projekt unveraendert, wenn es die Kopffase noch nicht kennt", () => {
    // Eine fehlende Angabe heisst scharfkantig - sonst saehe jede alte
    // Schraube nach dem Oeffnen anders aus.
    expect(threadSettings({ threadRole: "screw", threadDiameter: 6, threadPitch: 1 }).headChamfer).toBe(0);
  });

  it.each<["trapezoidal" | "round" | "whitworth", ThreadRole, number]>([
    ["whitworth", "rod", 20],
    ["whitworth", "screw", 24],
    ["whitworth", "nut", 5],
    ["whitworth", "bore", 14],
    ["trapezoidal", "rod", 20],
    ["trapezoidal", "screw", 24],
    ["trapezoidal", "nut", 5],
    ["trapezoidal", "bore", 14],
    ["round", "rod", 20],
    ["round", "screw", 24],
    ["round", "nut", 5],
    ["round", "bore", 14],
  ])(
    "stays closed on a %s profile as a %s",
    (threadProfile, role, height) => {
      const { geometry } = geometryFor(role, height, { threadProfile });
      const position = geometry.getAttribute("position") as unknown as Position;
      expect(position.count).toBeGreaterThan(1000);
      expect([...edgeUseCounts(position).values()].every((uses) => uses === 2)).toBe(true);
      expect(signedVolume(position)).toBeGreaterThan(0);
    },
  );

  it("cuts a flatter trapezoidal and round profile than the ISO default", () => {
    // Dieselbe Pruefung wie beim Spitzgewinde, nur mit den Tiefen der beiden
    // neuen Profile - bewusst gewaehlte, dokumentierte Naeherungen an DIN 103
    // und DIN 405, keine geschaetzten Werte.
    const trapezoidal = geometryFor("rod", 20, { threadProfile: "trapezoidal" });
    const round = geometryFor("rod", 20, { threadProfile: "round" });
    const minorRadiusOf = (geometry: typeof trapezoidal.geometry) => {
      const position = geometry.getAttribute("position") as unknown as Position;
      let smallest = Number.POSITIVE_INFINITY;
      for (let index = 0; index < position.count; index += 1) {
        const y = position.getY(index);
        if (y < 4 || y > 16) continue;
        smallest = Math.min(smallest, Math.hypot(position.getX(index), position.getZ(index)));
      }
      return smallest;
    };
    expect(minorRadiusOf(trapezoidal.geometry)).toBeCloseTo(3 - 0.4815, 3);
    expect(minorRadiusOf(round.geometry)).toBeCloseTo(3 - 0.3, 3);
    // Beide Profile sind flacher als das scharfe ISO-Gewinde - genau der Punkt.
    expect(minorRadiusOf(trapezoidal.geometry)).toBeGreaterThan(3 - 0.5413);
    expect(minorRadiusOf(round.geometry)).toBeGreaterThan(3 - 0.5413);
  });

  it("carries every thread profile through a saved package", async () => {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "thread");
    for (const threadProfile of THREAD_PROFILES) {
      const shape = makeShapeFromAsset(asset!, { x: 0, z: 0 }, { threadProfile });
      const shapes = [shape];
      const bytes = await exportLylProject({
        projectId: `project-profile-${threadProfile}`,
        projectName: "Gewindeprofil",
        createdAt: 1_700_000_000_000,
        modifiedAt: 1_700_000_100_000,
        shapes,
        history: [editorHistoryEntry(shapes, [])],
        historyIndex: 0,
        assets: [],
        workspace: DEFAULT_WORKPLANE_WORKSPACE,
        snapGrid: DEFAULT_SNAP_GRID,
        placementElevation: 0,
      });
      const loaded = (await importLylProject(bytes)).shapes[0];
      expect(loaded.threadProfile).toBe(threadProfile);
    }
  });

  it("carries the inch sizes with the same profile", () => {
    const quarterUnc = threadSizeFor(6.35, 25.4 / 20);
    expect(quarterUnc?.id).toBe('1/4"-20 UNC');
    expect(quarterUnc?.system).toBe("inch");
    const quarterUnf = threadSizeFor(6.35, 25.4 / 28);
    expect(quarterUnf?.id).toBe('1/4"-28 UNF');
    // Grob und fein teilen sich den Durchmesser, nur die Steigung trennt sie.
    expect(quarterUnf?.diameter).toBeCloseTo(quarterUnc?.diameter as number, 9);

    expect(threadUsesInchPitch(6.35)).toBe(true);
    expect(threadUsesInchPitch(6)).toBe(false);
    expect(pitchToThreadsPerInch(threadsPerInchToPitch(20))).toBeCloseTo(20, 9);
    expect(pitchToThreadsPerInch(1.27)).toBeCloseTo(20, 6);

    const { geometry, footprint } = geometryFor("rod", 20, { threadDiameter: 6.35, threadPitch: 25.4 / 20 });
    const position = geometry.getAttribute("position") as unknown as Position;
    expect([...edgeUseCounts(position).values()].every((uses) => uses === 2)).toBe(true);
    expect(footprint.width).toBeCloseTo(6.35, 6);
  });
});

/** Die Flaeche eines Umrisses in der Kopfebene (Gaussche Trapezformel). */
function outlineArea(points: Array<[number, number]>) {
  let area = 0;
  for (let index = 0; index + 1 < points.length; index += 1) {
    area += points[index][0] * points[index + 1][1] - points[index + 1][0] * points[index][1];
  }
  return area / 2;
}

describe("screw drives and head diameter (#1052)", () => {
  const drives: ThreadDrive[] = ["hex", "torx", "phillips", "slot", "robertson"];

  it("stays closed for every drive in every head, chamfered or not", () => {
    for (const threadHead of ["cylinder", "countersunk", "hex"]) {
      for (const threadDrive of drives) {
        for (const threadHeadChamfer of threadHead === "countersunk" ? [0] : [0, 0.4]) {
          const { geometry } = geometryFor("screw", 24, { threadHead, threadDrive, threadHeadChamfer });
          const position = geometry.getAttribute("position") as unknown as Position;
          const open = [...edgeUseCounts(position).values()].filter((uses) => uses !== 2).length;
          expect(open, `${threadHead} head, ${threadDrive} drive, chamfer ${threadHeadChamfer}`).toBe(0);
          expect(signedVolume(position)).toBeGreaterThan(0);
        }
      }
    }
  });

  it("keeps the hex socket in a socket head and a plain hex head, as before", () => {
    const socket = threadSettings({ threadRole: "screw", threadHead: "cylinder", threadDiameter: 6, threadPitch: 1 });
    expect(socket.drive).toBe("hex");
    expect(socket.driveSize).toBeCloseTo(5, 6);
    expect(socket.driveDepth).toBeCloseTo(3.3, 6);
    expect(socket.headDiameter).toBeCloseTo(10, 6);
    const hex = threadSettings({ threadRole: "screw", threadHead: "hex", threadDiameter: 6, threadPitch: 1 });
    expect(hex.drive).toBe("none");
    expect(hex.driveDepth).toBe(0);
    expect(hex.headDiameter).toBeCloseTo(10, 6);
    expect(threadBuildPlan({ width: 10, depth: 10, height: 24, threadRole: "screw", threadHead: "hex", threadDiameter: 6, threadPitch: 1 }).driveOutline).toBeNull();
  });

  it("cuts exactly the drive's outline as deep as set", () => {
    const volumeOf = (overrides: Record<string, unknown>) => {
      const { geometry } = geometryFor("screw", 24, { threadHead: "cylinder", ...overrides });
      return signedVolume(geometry.getAttribute("position") as unknown as Position);
    };
    const plain = volumeOf({ threadDrive: "none" });
    expect(volumeOf({ threadDriveDepth: 0 })).toBeCloseTo(plain, 6);
    // A hex socket of 5 mm across flats, 3.3 mm deep.
    expect(plain - volumeOf({})).toBeCloseTo((Math.sqrt(3) / 2) * 25 * 3.3, 4);
    for (const drive of drives) {
      const settings = threadSettings({ threadRole: "screw", threadDiameter: 6, threadPitch: 1, threadDrive: drive, threadDriveDepth: 2.5 });
      const area = outlineArea(threadDriveOutlinePoints(threadDriveOutline(drive, settings.driveSize)!));
      expect(plain - volumeOf({ threadDrive: drive, threadDriveDepth: 2.5 }), drive).toBeCloseTo(area * 2.5, 4);
    }
  });

  it("gives the flat head of discussion #1052 a usable drive", () => {
    // 20 mm across at a pitch of 2 mm, no standard size, and a 2 mm head: the socket used to be 11 mm wide and 1.2 mm deep, whatever one did.
    const before = threadSettings({ threadRole: "screw", threadDiameter: 20, threadPitch: 2, threadHeadHeight: 2 });
    expect(before.driveSize).toBeCloseTo(11, 6);
    expect(before.driveDepth).toBeCloseTo(1.2, 6);
    const set = threadSettings({ threadRole: "screw", threadDiameter: 20, threadPitch: 2, threadHeadHeight: 2, threadDrive: "torx", threadDriveSize: 6, threadDriveDepth: 1.8, threadHeadDiameter: 26 });
    expect(set.drive).toBe("torx");
    expect(set.driveSize).toBeCloseTo(6, 6);
    expect(set.driveDepth).toBeCloseTo(1.8, 6);
    expect(set.headDiameter).toBeCloseTo(26, 6);
    expect(threadNaturalFootprint(set).width).toBeCloseTo(26, 6);
    // Never deeper than nine tenths of the head, and never wider than the head.
    expect(threadSettings({ threadRole: "screw", threadDiameter: 20, threadPitch: 2, threadHeadHeight: 2, threadDriveDepth: 5 }).driveDepth).toBeCloseTo(1.8, 6);
    expect(threadSettings({ threadRole: "screw", threadDiameter: 20, threadPitch: 2, threadHeadHeight: 2, threadHeadDiameter: 26, threadDriveSize: 40 }).driveSize)
      .toBeCloseTo(threadDriveSizeLimits({ ...set, drive: "hex" }).max, 6);
  });

  it("draws a Torx as six lobes on the outer and six hollows on the inner diameter, once round", () => {
    const points = threadDriveOutlinePoints(threadDriveOutline("torx", 10)!);
    const angles = points.slice(0, -1).map(([x, z]) => Math.atan2(z, x)).map((angle) => (angle < -1e-9 ? angle + Math.PI * 2 : angle));
    expect(angles.every((angle, index) => index === 0 || angle > angles[index - 1])).toBe(true);
    const radii = points.map(([x, z]) => Math.hypot(x, z));
    expect(Math.max(...radii)).toBeCloseTo(5, 6);
    expect(Math.min(...radii)).toBeCloseTo(3.6, 6);
    expect(points[points.length - 1]).toEqual(points[0]);
  });

  it("runs a slot as far across the head as it fits, a fifth as wide as long", () => {
    // M6 with a 10 mm cylinder head: a tenth of the head stays standing round the slot's corners.
    const settings = threadSettings({ threadRole: "screw", threadHead: "cylinder", threadDiameter: 6, threadPitch: 1, threadDrive: "slot" });
    expect(settings.driveSize).toBeCloseTo(4.5 / Math.hypot(0.5, 0.1), 6);
    const points = threadDriveOutlinePoints(threadDriveOutline("slot", settings.driveSize)!);
    const xs = points.map(([x]) => x);
    const zs = points.map(([, z]) => z);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(settings.driveSize, 6);
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(settings.driveSize / 5, 6);
    expect(Math.max(...points.map(([x, z]) => Math.hypot(x, z)))).toBeCloseTo(4.5, 6);
    // A shorter slot stays as set, and a slot is stored like any other drive.
    expect(threadSettings({ threadRole: "screw", threadDiameter: 6, threadPitch: 1, threadDrive: "slot", threadDriveSize: 6 }).driveSize).toBeCloseTo(6, 6);
    const head = { role: "screw", head: "cylinder", diameter: 6, pitch: 1, headHeight: 6 } as const;
    expect(threadDriveFields({ threadDrive: "slot" }, head)).toEqual({ threadHeadDiameter: undefined, threadDrive: "slot", threadDriveSize: undefined, threadDriveDepth: undefined });
  });

  it("gives a Robertson drive the square of the bit that fits the size", () => {
    const square = (threadDiameter: number, threadPitch: number) =>
      threadSettings({ threadRole: "screw", threadHead: "cylinder", threadDiameter, threadPitch, threadDrive: "robertson" }).driveSize;
    // #0 on M3, #2 (red) on M4 and M5, #3 on M6, #4 on M8.
    expect(square(3, 0.5)).toBeCloseTo(1.79, 6);
    expect(square(4, 0.7)).toBeCloseTo(2.84, 6);
    expect(square(5, 0.8)).toBeCloseTo(2.84, 6);
    expect(square(6, 1)).toBeCloseTo(3.36, 6);
    expect(square(8, 1.25)).toBeCloseTo(4.83, 6);
    const points = threadDriveOutlinePoints(threadDriveOutline("robertson", 4)!);
    expect(outlineArea(points)).toBeCloseTo(16, 6);
    expect(Math.max(...points.map(([x, z]) => Math.hypot(x, z)))).toBeCloseTo(threadDriveRadius("robertson", 4), 6);
    expect(points[points.length - 1]).toEqual(points[0]);
  });

  it("stores only what was set, and lets the rest follow the size", () => {
    const head = { role: "screw", head: "cylinder", diameter: 6, pitch: 1, headHeight: 6 } as const;
    expect(threadDriveFields({}, head)).toEqual({ threadHeadDiameter: undefined, threadDrive: undefined, threadDriveSize: undefined, threadDriveDepth: undefined });
    expect(threadDriveFields({ threadDriveSize: 4 }, head).threadDriveSize).toBe(4);
    expect(threadDriveFields({ threadDriveSize: 5 }, head).threadDriveSize).toBeUndefined();
    expect(threadDriveFields({ threadDrive: "phillips" }, head).threadDrive).toBe("phillips");
  });

  it("scales the drive with the screw when its body is pulled bigger", () => {
    const shape = { threadRole: "screw" as const, threadDiameter: 6, threadPitch: 1, threadDrive: "torx" as const, threadDriveSize: 5, threadDriveDepth: 2 };
    const footprint = threadNaturalFootprint(threadSettings(shape));
    const patch = threadFootprintPatch({ ...shape, width: footprint.width * 2, depth: footprint.depth * 2 });
    expect(patch.threadDiameter).toBeCloseTo(12, 6);
    expect(patch.threadDrive).toBe("torx");
    expect(patch.threadDriveSize).toBeCloseTo(10, 6);
    expect(patch.threadDriveDepth).toBeCloseTo(4, 6);
  });

  it("carries drive and head diameter through a saved project", async () => {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "thread")!;
    const shape = makeShapeFromAsset(asset, { x: 0, z: 0 }, { threadRole: "screw", threadDiameter: 8, threadPitch: 1.25 });
    // The frame goes with the wider head, as the properties set it; a narrower one would read as the body pulled smaller.
    const screw = { ...shape, threadDrive: "phillips" as const, threadDriveSize: 6, threadDriveDepth: 3, threadHeadDiameter: 15, width: 15, depth: 15, size: 15 };
    const bytes = await exportLylProject({
      projectId: "project-drive",
      projectName: "Antrieb",
      createdAt: 1_700_000_000_000,
      modifiedAt: 1_700_000_100_000,
      shapes: [screw],
      history: [editorHistoryEntry([screw], [])],
      historyIndex: 0,
      assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      snapGrid: DEFAULT_SNAP_GRID,
      placementElevation: 0,
    });
    const loaded = (await importLylProject(bytes)).shapes[0];
    expect(loaded.threadDrive).toBe("phillips");
    expect(loaded.threadDriveSize).toBe(6);
    expect(loaded.threadDriveDepth).toBe(3);
    expect(loaded.threadHeadDiameter).toBe(15);
  });
});
