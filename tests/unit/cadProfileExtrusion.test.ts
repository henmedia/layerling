import { beforeAll, describe, expect, it } from "vitest";
import { loadTextFonts } from "@/lib/textFonts";
import { createTextGeometry, curvedTextFootprint } from "@/lib/textGeometry";
import * as THREE from "three";
import type { WorkplaneShape } from "@/types/layerling";
import type { CadModifierProfileLoop } from "@/lib/cadModifierTypes";
import { cadModifierHelicalGearForShape, cadModifierProfileForShape, cadProfileExpectation, cadProfileSegmentCount, closedMeshVolume, withinExactProfileLimit, crescentProfile, gearProfileLoops, textGlyphProfiles, heartProfileLoops, honeycombProfileLoops, polygonProfileLoops, slotProfileLoops, starProfileLoops } from "@/lib/cadProfileExtrusion";
import { isWholeEllipse, profileLoopBounds, validateCadProfile } from "@/lib/cadProfileSolid";
import { cadTransformRequiresGeneralTransform } from "@/lib/cadModifierRuntime";
import { cadModifierPrimitiveForAnalyticShape, cadTransformToMatrix } from "@/lib/cadBakeMetadata";
import { cadModifierPrepareTimeoutMs, CAD_MODIFIER_EXACT_SEGMENT_LIMIT, CAD_MODIFIER_MAX_PREPARE_TIMEOUT_MS } from "@/lib/cadModifierRuntime";
import { createStarGeometry } from "@/lib/starGeometry";
import { createHeartGeometry } from "@/lib/heartGeometry";
import { buildCrescentContourPoints, createCrescentGeometry } from "@/lib/crescentGeometry";
import { createSlotGeometry, taperedSlotOutline } from "@/lib/slotGeometry";
import { createHoneycombGeometry } from "@/lib/honeycombGeometry";
import { createPrismGeometry } from "@/lib/prismGeometry";
import { createBooleanHollowCylinderGeometry, createBooleanRoundRoofGeometry } from "@/lib/roundBodyGeometry";
import { regularPolygonFootprintScale } from "@/lib/regularPolygonFootprint";
import { meshForShape } from "@/lib/editorMeshCore";
import { BEVEL_GEAR_TOP_SCALE, createGearGeometry, normalizeGearCenterHoleSize, normalizeGearTeeth } from "@/lib/gearGeometry";

type Vec3 = [number, number, number];

function shape(kind: WorkplaneShape["kind"], extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id: `t-${kind}`, name: kind, kind, x: 0, z: 0, elevation: 0, size: 40, width: 40, depth: 40, height: 10, rotation: 0, color: "#ff8800", ...extra } as WorkplaneShape;
}

function meshOf(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const vertices: Vec3[] = [];
  for (let i = 0; i < position.count; i += 1) vertices.push([position.getX(i), position.getY(i), position.getZ(i)]);
  const faces: Vec3[] = [];
  const count = index ? index.count : position.count;
  for (let i = 0; i < count; i += 3) faces.push(index ? [index.getX(i), index.getX(i + 1), index.getX(i + 2)] : [i, i + 1, i + 2]);
  return { vertices, faces };
}

/** Enclosed area by Green's theorem - lines exactly, arcs by their closed form. */
function loopArea(loop: CadModifierProfileLoop) {
  let twice = 0;
  let current = { x: loop.x, z: loop.z };
  loop.segments.forEach((segment) => {
    if (segment.kind === "line") {
      twice += current.x * segment.z - segment.x * current.z;
    } else {
      const { cx, cz, rx, rz, start, end } = segment;
      twice += cx * rz * (Math.sin(end) - Math.sin(start)) - cz * rx * (Math.cos(end) - Math.cos(start)) + rx * rz * (end - start);
    }
    current = segment;
  });
  return twice / 2;
}

function profileArea(loops: CadModifierProfileLoop[]) {
  const [outer, ...holes] = loops;
  return Math.abs(loopArea(outer)) - holes.reduce((total, hole) => total + Math.abs(loopArea(hole)), 0);
}

/** Points along a loop, arcs finely sampled. */
function sampleLoop(loop: CadModifierProfileLoop) {
  const points = [{ x: loop.x, z: loop.z }];
  loop.segments.forEach((segment) => {
    if (segment.kind === "arc") {
      for (let step = 1; step <= 2000; step += 1) {
        const angle = segment.start + ((segment.end - segment.start) * step) / 2000;
        points.push({ x: segment.cx + segment.rx * Math.cos(angle), z: segment.cz + segment.rz * Math.sin(angle) });
      }
    } else {
      points.push({ x: segment.x, z: segment.z });
    }
  });
  return points;
}

/** The profile agrees with the display mesh: same footprint, nearly the same area. */
function expectMatchesMesh(loops: CadModifierProfileLoop[], geometry: THREE.BufferGeometry, height: number, areaTolerance = 0.02) {
  validateCadProfile({ kind: "extrusion", loops, height });
  const mesh = meshOf(geometry);
  const expected = cadProfileExpectation(mesh.vertices, mesh.faces);
  const [minX, minZ, maxX, maxZ] = profileLoopBounds(loops[0]);
  const size = Math.max(expected.bounds[3] - expected.bounds[0], expected.bounds[5] - expected.bounds[2]);
  [[minX, expected.bounds[0]], [minZ, expected.bounds[2]], [maxX, expected.bounds[3]], [maxZ, expected.bounds[5]]].forEach(([exact, sampled]) => {
    expect(Math.abs(exact - sampled)).toBeLessThan(0.03 * size);
  });
  const area = profileArea(loops);
  expect(Math.abs(area * height - expected.volume) / expected.volume).toBeLessThan(areaTolerance);
}

describe("exact profiles for catalog shapes", () => {
  it("builds polygons on the display prism's corners", () => {
    [3, 4, 5, 6, 8, 12].forEach((sides) => {
      [[40, 40], [60, 25], [20, 45]].forEach(([width, depth]) => {
        const loops = polygonProfileLoops(width, depth, sides);
        expect(loops[0].segments).toHaveLength(sides);
        expect(loops[0].segments.every((segment) => segment.kind === "line")).toBe(true);
        expectMatchesMesh(loops, createPrismGeometry(width, 10, depth, sides), 10, 1e-6);
      });
    });
  });

  it("builds stars of every kind, round-tipped or sharp, square or stretched", () => {
    const cases: Array<Partial<WorkplaneShape> & { width: number; depth: number }> = [
      { width: 40, depth: 40, starPoints: 5, starInnerSize: 20 },
      { width: 40, depth: 40, starPoints: 5, starInnerSize: 20, starOuterFillet: 3, starInnerFillet: 2 },
      { width: 60, depth: 30, starPoints: 6, starInnerSize: 30, starOuterFillet: 4, starInnerFillet: 3 },
      { width: 30, depth: 50, starPoints: 3, starInnerSize: 8, starOuterFillet: 80, starInnerFillet: 80 },
      { width: 80, depth: 80, starPoints: 32, starInnerSize: 70, starOuterFillet: 0.5, starInnerFillet: 0 },
    ];
    cases.forEach((options) => {
      const loops = starProfileLoops(options.width, options.depth, options);
      const points = options.starPoints ?? 5;
      const arcs = loops[0].segments.filter((segment) => segment.kind === "arc").length;
      const rounded = ((options.starOuterFillet ?? 0) > 0 ? points : 0) + ((options.starInnerFillet ?? 0) > 0 ? points : 0);
      expect(arcs).toBe(rounded);
      expectMatchesMesh(loops, createStarGeometry({ height: 10, starQuality: 48, ...options }), 10);
    });
  });

  it("builds slots with true half circles, lying or standing, and a round one as a circle", () => {
    [[40, 20], [20, 40], [50, 12], [20, 20]].forEach(([width, depth]) => {
      const loops = slotProfileLoops(width, depth);
      const radius = Math.min(width, depth) / 2;
      expect(profileArea(loops)).toBeCloseTo((Math.max(width, depth) - 2 * radius) * 2 * radius + Math.PI * radius * radius, 9);
      expectMatchesMesh(loops, createSlotGeometry({ width, depth, height: 10, sides: 256 }), 10, 0.005);
    });
  });

  it("builds a tapered capsule (#206) from two arcs joined by their tangents, lying or standing", () => {
    [[60, 20, 0.5], [20, 60, 0.5], [50, 30, 0.2], [40, 20, 0.999]].forEach(([width, depth, ratio]) => {
      const outline = taperedSlotOutline(width, depth, ratio);
      expect(outline).not.toBeNull();
      const { R, r, angle, centreDistance } = outline!;
      const tangent = Math.sqrt(centreDistance ** 2 - (R - r) ** 2);
      const loops = slotProfileLoops(width, depth, ratio);
      expect(profileArea(loops)).toBeCloseTo(R * R * (Math.PI - angle) + r * r * angle + (R + r) * tangent, 6);
      const [minX, minZ, maxX, maxZ] = profileLoopBounds(loops[0]);
      expect(maxX - minX).toBeCloseTo(width, 6);
      expect(maxZ - minZ).toBeCloseTo(depth, 6);
      expectMatchesMesh(loops, createSlotGeometry({ width, depth, height: 10, sides: 256, slotEndRatio: ratio }), 10, 0.005);
    });
    expect(taperedSlotOutline(40, 20, 1)).toBeNull();
  });

  it("builds hearts from two lobes, filling width and depth exactly", () => {
    [[40, 40, 0], [50, 36, 4], [25, 60, 20], [40, 40, 0.005]].forEach(([width, depth, heartTipFillet]) => {
      const loops = heartProfileLoops(width, depth, { heartTipFillet });
      const [minX, minZ, maxX, maxZ] = profileLoopBounds(loops[0]);
      expect(maxX - minX).toBeCloseTo(width, 9);
      // A rounded tip takes a little off the depth, exactly as on the display mesh.
      if (heartTipFillet <= 0.01) expect(maxZ - minZ).toBeCloseTo(depth, 9);
      else expect(maxZ - minZ).toBeLessThan(depth);
      expect(loops[0].segments.filter((segment) => segment.kind === "arc")).toHaveLength(heartTipFillet > 0.01 ? 3 : 2);
      expectMatchesMesh(loops, createHeartGeometry({ width, depth, height: 10, heartTipFillet, heartQuality: 64 }), 10);
    });
  });

  it("builds crescents from two arcs, with horns rounded as far back as the display rounds them", () => {
    const cases = [
      { width: 40, depth: 40, crescentThickness: 14, crescentTipFillet: 0, crescentQuality: 32 },
      { width: 40, depth: 40, crescentThickness: 14, crescentTipFillet: 0.5, crescentQuality: 32 },
      { width: 60, depth: 20, crescentThickness: 40, crescentTipFillet: 8, crescentQuality: 32 },
      { width: 40, depth: 40, crescentThickness: 4, crescentTipFillet: 3, crescentQuality: 32 },
      { width: 40, depth: 40, crescentThickness: 1, crescentTipFillet: 8, crescentQuality: 16 },
      { width: 30, depth: 60, crescentThickness: 8, crescentTipFillet: 2, crescentQuality: 64 },
    ];
    cases.forEach((options) => {
      const { loops } = crescentProfile(options.width, options.depth, options);
      const segments = loops[0].segments;
      expect(segments.every((segment) => segment.kind === "arc")).toBe(true);
      expect(segments).toHaveLength(options.crescentTipFillet > 0.01 ? 4 : 2);
      // Where each horn ends: the right-most point of the outline above and below the middle.
      const exact = sampleLoop(loops[0]);
      const display = buildCrescentContourPoints(options.width, options.depth, options.crescentThickness, options.crescentTipFillet, options.crescentQuality).map((point) => ({ x: point.x, z: point.y }));
      // The display rounds between chords, so its own horn moves 1.5-3.8 mm
      // with the quality slider alone; the exact horn stays within a fraction
      // of that of what is on screen (0.05 mm at the default settings).
      const tolerance = options.crescentThickness === 14 ? 0.06 : 0.3;
      [1, -1].forEach((side) => {
        const tip = (points: Array<{ x: number; z: number }>) => Math.max(...points.filter((point) => point.z * side > 0).map((point) => point.x));
        expect(Math.abs(tip(exact) - tip(display))).toBeLessThan(tolerance);
      });
      // A 1 mm sliver drawn at quality 16 loses almost 6 % of its area to the display's chords.
      expectMatchesMesh(loops, createCrescentGeometry({ ...options, height: 10 }), 10, options.crescentThickness === 1 ? 0.07 : 0.03);
    });
  });

  it("builds honeycombs with one hole loop per display cell", () => {
    [
      { width: 60, depth: 60, honeycombCellSize: 8, honeycombWallThickness: 1.6, honeycombFrameWidth: 3 },
      { width: 100, depth: 40, honeycombCellSize: 5, honeycombWallThickness: 1, honeycombFrameWidth: 0 },
      { width: 20, depth: 20, honeycombCellSize: 30, honeycombWallThickness: 2, honeycombFrameWidth: 2 },
    ].forEach((options) => {
      const loops = honeycombProfileLoops(options.width, options.depth, options);
      expectMatchesMesh(loops, createHoneycombGeometry({ ...options, height: 3 }), 3, 1e-6);
    });
  });

  it("builds spur gears on the display's tooth corners, with a round bore", () => {
    const cases: Array<Partial<WorkplaneShape> & { width: number; depth: number }> = [
      { width: 40, depth: 40 },
      { width: 40, depth: 40, teeth: 6 },
      { width: 80, depth: 80, teeth: 64 },
      { width: 60, depth: 40, teeth: 20, toothSize: 4 },
      { width: 40, depth: 40, centerHoleSize: 0 },
      { width: 30, depth: 30, teeth: 9, toothWidth: 1, centerHoleSize: 100 },
    ];
    cases.forEach((options) => {
      const loops = gearProfileLoops(options.width, options.depth, options);
      const teeth = normalizeGearTeeth(options.teeth);
      expect(loops[0].segments).toHaveLength(teeth * 4);
      expect(loops[0].segments.every((segment) => segment.kind === "line")).toBe(true);
      const bore = normalizeGearCenterHoleSize(options.centerHoleSize, options.width, options.depth, options.toothSize);
      if (bore > 0) {
        expect(loops).toHaveLength(2);
        expect(loops[1].segments.every((segment) => segment.kind === "arc" && Math.abs(segment.rx - bore / 2) < 1e-12)).toBe(true);
      } else {
        expect(loops).toHaveLength(1);
      }
      // The display draws the bore as a polygon of teeth x 4 sides; the round bore takes a hair more.
      expectMatchesMesh(loops, createGearGeometry({ height: 8, ...options }), 8, 0.005);
    });
  });

  it("measures closed meshes whatever way their triangles are wound", () => {
    // Crescent caps are wound the other way round from its walls.
    const crescent = meshOf(createCrescentGeometry({ width: 40, depth: 40, height: 10, crescentTipFillet: 0, crescentQuality: 32 }));
    const outline = crescentProfile(40, 40, { crescentTipFillet: 0, crescentQuality: 32 });
    expect(closedMeshVolume(crescent.vertices, crescent.faces) / (profileArea(outline.loops) * 10)).toBeGreaterThan(0.97);
    const box = meshOf(new THREE.BoxGeometry(2, 3, 4));
    expect(closedMeshVolume(box.vertices, box.faces)).toBeCloseTo(24, 9);
    const scrambled = box.faces.map(([a, b, c], index) => (index % 3 === 0 ? [a, c, b] as Vec3 : [a, b, c] as Vec3));
    expect(closedMeshVolume(box.vertices, scrambled)).toBeCloseTo(24, 9);
  });
});

/** Points along a loop, lines by their ends, arcs and Bezier curves finely sampled. */
function denseLoop(loop: CadModifierProfileLoop) {
  const points = [{ x: loop.x, z: loop.z }];
  let current = { x: loop.x, z: loop.z };
  loop.segments.forEach((segment) => {
    if (segment.kind === "bezier") {
      const control = [current, ...segment.controls, { x: segment.x, z: segment.z }];
      for (let step = 1; step <= 200; step += 1) {
        const t = step / 200;
        // de Casteljau
        let row = control.map((point) => ({ ...point }));
        while (row.length > 1) row = row.slice(1).map((point, index) => ({ x: row[index].x + (point.x - row[index].x) * t, z: row[index].z + (point.z - row[index].z) * t }));
        points.push(row[0]);
      }
    } else if (segment.kind === "arc") {
      for (let step = 1; step <= 200; step += 1) {
        const angle = segment.start + ((segment.end - segment.start) * step) / 200;
        points.push({ x: segment.cx + segment.rx * Math.cos(angle), z: segment.cz + segment.rz * Math.sin(angle) });
      }
    } else {
      points.push({ x: segment.x, z: segment.z });
    }
    current = { x: segment.x, z: segment.z };
  });
  return points;
}

function polygonArea(points: Array<{ x: number; z: number }>) {
  let twice = 0;
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    twice += point.x * next.z - next.x * point.z;
  });
  return Math.abs(twice) / 2;
}

describe("exact outlines for raised text", () => {
  beforeAll(async () => {
    await loadTextFonts();
  });

  const fonts = ["Multilanguage", "Sans", "Serif", "Script", "Monospace", "Rounded", "Stencil"];
  const texts = ["Pécs", "Hello 123", "ŐŰőű@&%8B", "Íjász Ödön"];

  it("gives every glyph of every face its own outline, in the order the display mesh lists them", () => {
    fonts.forEach((font) => texts.forEach((text) => {
      const source = shape("text", { text, font, width: 60, depth: 20, height: 5 });
      const glyphs = textGlyphProfiles(source);
      expect(glyphs).not.toBeNull();
      const display = createTextGeometry(source);
      // The edge tool tells the glyph pieces apart by these counts.
      expect(glyphs!.reduce((total, glyph) => total + glyph.triangleCount, 0)).toBe(display.getAttribute("position").count / 3);
      glyphs!.forEach((glyph) => {
        expect(glyph.profile).not.toBeNull();
        const kinds = new Set(glyph.profile!.loops.flatMap((loop) => loop.segments.map((segment) => segment.kind)));
        // Stencil draws every curve as one straight segment; the other faces keep their curves.
        if (font === "Stencil") expect(kinds.has("bezier")).toBe(false);
      });
      if (font !== "Stencil") expect(glyphs!.some((glyph) => glyph.profile!.loops.some((loop) => loop.segments.some((segment) => segment.kind === "bezier")))).toBe(true);
    }));
  });

  it("puts the outlines where the display draws the text, with the same area", () => {
    fonts.forEach((font) => ["Pécs", "Íjász Ödön"].forEach((text) => {
      const source = shape("text", { text, font, width: 60, depth: 20, height: 5 });
      const glyphs = textGlyphProfiles(source)!;
      const display = createTextGeometry(source);
      display.computeBoundingBox();
      const box = display.boundingBox as THREE.Box3;
      const outlines = glyphs.map((glyph) => glyph.profile!.loops.map(denseLoop));
      const all = outlines.flat(2);
      const spanX = Math.max(...all.map((point) => point.x)) - Math.min(...all.map((point) => point.x));
      expect(Math.abs(Math.min(...all.map((point) => point.x)) - box.min.x)).toBeLessThan(0.02 * spanX);
      expect(Math.abs(Math.max(...all.map((point) => point.x)) - box.max.x)).toBeLessThan(0.02 * spanX);
      expect(Math.abs(Math.min(...all.map((point) => point.z)) - box.min.z)).toBeLessThan(0.02 * spanX);
      expect(Math.abs(Math.max(...all.map((point) => point.z)) - box.max.z)).toBeLessThan(0.02 * spanX);
      // Area of the exact outlines (outer minus holes) against the display mesh's volume / height.
      const area = outlines.reduce((total, loops) => total + polygonArea(loops[0]) - loops.slice(1).reduce((holes, loop) => holes + polygonArea(loop), 0), 0);
      const mesh = meshOf(display);
      const meshArea = closedMeshVolume(mesh.vertices, mesh.faces) / 5;
      expect(Math.abs(area - meshArea) / meshArea).toBeLessThan(font === "Stencil" ? 1e-6 : 0.01);
    }));
  });

  it("follows curved text glyph by glyph: same order, same triangles, on the drawn letters", () => {
    const variants: Array<Partial<WorkplaneShape>> = [{}, { textInward: true }, { textFlipped: true }, { textInward: true, textFlipped: true }];
    fonts.forEach((font) => variants.forEach((variant) => {
      const curved = shape("text", { text: "Íjász 2026", font, height: 4, textCurved: true, textRadius: 20, textSize: 7, ...variant });
      const footprint = curvedTextFootprint(curved);
      // As laid out, and once in a box that no longer matches (the display then fits it uniformly).
      const boxes = variant.textInward && variant.textFlipped ? [footprint, { width: footprint.width * 1.25, depth: footprint.depth * 0.9 }] : [footprint];
      boxes.forEach((box) => {
        const source = { ...curved, ...box } as WorkplaneShape;
        const glyphs = textGlyphProfiles(source)!;
        const position = createTextGeometry(source).getAttribute("position");
        expect(glyphs.reduce((total, glyph) => total + glyph.triangleCount, 0)).toBe(position.count / 3);
        let first = 0;
        glyphs.forEach((glyph) => {
          expect(glyph.profile).not.toBeNull();
          // This glyph's own display triangles: every outline point is one of their corners (to float precision) ...
          const cell = (value: number) => Math.floor(value / 1e-4);
          const corners = new Map<string, Array<{ x: number; z: number }>>();
          for (let vertex = first * 3; vertex < (first + glyph.triangleCount) * 3; vertex += 1) {
            const corner = { x: position.getX(vertex), z: position.getZ(vertex) };
            const key = `${cell(corner.x)},${cell(corner.z)}`;
            const list = corners.get(key);
            if (list) list.push(corner);
            else corners.set(key, [corner]);
          }
          const nearest = (point: { x: number; z: number }) => {
            let best = Infinity;
            for (let dx = -1; dx <= 1; dx += 1) for (let dz = -1; dz <= 1; dz += 1) {
              (corners.get(`${cell(point.x) + dx},${cell(point.z) + dz}`) ?? []).forEach((corner) => { best = Math.min(best, Math.hypot(corner.x - point.x, corner.z - point.z)); });
            }
            return best;
          };
          glyph.profile!.loops.forEach((loop) => loop.segments.forEach((segment) => expect(nearest(segment)).toBeLessThan(1e-5)));
          // ... and the outline encloses the area the display glyph covers.
          const loops = glyph.profile!.loops.map(denseLoop);
          const area = polygonArea(loops[0]) - loops.slice(1).reduce((holes, loop) => holes + polygonArea(loop), 0);
          const vertices: Vec3[] = [];
          const faces: Vec3[] = [];
          for (let vertex = first * 3; vertex < (first + glyph.triangleCount) * 3; vertex += 3) {
            faces.push([vertices.length, vertices.length + 1, vertices.length + 2]);
            for (let corner = 0; corner < 3; corner += 1) vertices.push([position.getX(vertex + corner), position.getY(vertex + corner), position.getZ(vertex + corner)]);
          }
          const meshArea = closedMeshVolume(vertices, faces) / 4;
          expect(Math.abs(area - meshArea) / meshArea).toBeLessThan(font === "Stencil" ? 1e-5 : 0.02);
          first += glyph.triangleCount;
        });
      });
    }));
  }, 20_000);

  it("leaves bevelled text, and text of several glyphs, to the glyph pieces or the mesh", () => {
    expect(textGlyphProfiles(shape("text", { text: "Pécs", bevel: 2 }))).toBeNull();
    expect(cadModifierProfileForShape(shape("text", { text: "Pécs" }))).toBeNull();
    expect(cadModifierProfileForShape(shape("text", { text: "I", width: 10, depth: 20 }))?.loops).toHaveLength(1);
    expect(cadModifierProfileForShape(shape("text", { text: "O", width: 20, depth: 20 }))?.loops).toHaveLength(2);
    expect(cadModifierProfileForShape(shape("text", { text: "I", bevel: 1 }))).toBeNull();
    // Taper, twist and lean reshape the display mesh the glyph outlines are matched to.
    expect(textGlyphProfiles(shape("text", { text: "Pécs", extrudeTwist: 2 }))).toBeNull();
    expect(textGlyphProfiles(shape("text", { text: "Pécs", extrudeTopOffsetX: 0.5 }))).toBeNull();
    expect(textGlyphProfiles(shape("text", { text: "Pécs", taperTopWidth: 57 }))).toBeNull();
  });
});

describe("which shapes get an exact profile", () => {
  it("covers the extruded catalog shapes and the spur gear, placed like the display mesh", () => {
    ["polygon", "star", "heart", "crescent", "slot", "honeycomb", "gear"].forEach((kind) => {
      const profile = cadModifierProfileForShape(shape(kind as WorkplaneShape["kind"], { x: 5, z: -3, elevation: 2, rotation: 30 }));
      expect(profile?.kind).toBe("extrusion");
      expect(profile?.height).toBe(10);
      expect(profile?.transform).toHaveLength(12);
      expect(profile?.transform?.[3]).toBeCloseTo(5, 9);
      expect(profile?.transform?.[7]).toBeCloseTo(2, 9);
      expect(profile?.transform?.[11]).toBeCloseTo(-3, 9);
    });
    expect(cadModifierProfileForShape(shape("star"))?.transform).toBeUndefined();
    // Since #184 a twisted star is a loft too, turning as it rises.
    expect(cadModifierProfileForShape(shape("star", { extrudeTwist: 45 }))).toMatchObject({ kind: "loft", twist: 45 });
    expect(cadModifierProfileForShape(shape("star", { taperTopWidth: 10 }))?.kind).toBe("loft");
  });

  it("lofts a bevel gear from its foot outline to the same outline shrunk at the top, round its straight bore", () => {
    const part = cadModifierProfileForShape(shape("gear", { gearType: "bevel", width: 30, depth: 30, height: 6, teeth: 12, centerHoleSize: 6 }));
    expect(part?.kind).toBe("loft");
    expect(part!.loops.length).toBe(2);
    const [foot, top] = [part!.loops[0], part!.topLoops![0]];
    expect(foot.segments.length).toBe(48);
    foot.segments.forEach((segment, index) => {
      expect(top.segments[index].x).toBeCloseTo(segment.x * BEVEL_GEAR_TOP_SCALE, 12);
      expect(top.segments[index].z).toBeCloseTo(segment.z * BEVEL_GEAR_TOP_SCALE, 12);
    });
    // The bore keeps its size; one too wide for the smaller top stays on the mesh.
    expect(part!.topLoops![1]).toEqual(part!.loops[1]);
    expect(cadModifierProfileForShape(shape("gear", { gearType: "bevel", width: 30, depth: 30, height: 6, teeth: 12, centerHoleSize: 18 }))).toBeNull();
  });

  it("gives a helical gear its turning ring, stretched by what the turning ring spans, and keeps an oval one on its mesh", () => {
    const part = cadModifierHelicalGearForShape(shape("gear", { gearType: "helical", width: 30, depth: 30, height: 6, teeth: 12, helixAngle: 22.5, centerHoleSize: 6 }));
    expect(part!.corners.length).toBe(48);
    expect(part!.twist).toBeCloseTo((22.5 * Math.PI) / 180, 12);
    expect(part!.boreRadius).toBeCloseTo(3, 12);
    // At 22.5 degrees a tooth tip passes every direction: the ring spans its full tip circle, unstretched.
    expect(part!.stretch.x).toBeCloseTo(1, 12);
    expect(part!.stretch.z).toBeCloseTo(1, 12);
    // At 0 degrees it is stretched like the spur gear, until its corners span the width.
    const straight = cadModifierHelicalGearForShape(shape("gear", { gearType: "helical", width: 30, depth: 30, height: 6, teeth: 7, helixAngle: 0 }))!;
    const reach = (pick: (angle: number) => number) => {
      const values = straight.corners.map(({ angle, radius }) => pick(angle) * radius);
      return Math.max(...values) - Math.min(...values);
    };
    expect(reach(Math.cos) * straight.stretch.x).toBeCloseTo(30, 9);
    expect(reach(Math.sin) * straight.stretch.z).toBeCloseTo(30, 9);
    expect(cadModifierHelicalGearForShape(shape("gear", { gearType: "helical", width: 30, depth: 18 }))).toBeNull();
    expect(cadModifierHelicalGearForShape(shape("gear", { gearType: "spur" }))).toBeNull();
  });

  it("leaves everything else on its old path", () => {
    expect(cadModifierProfileForShape(shape("box"))).toBeNull();
    // A helical gear turns its outline as it rises: its own part (cadModifierHelicalGearForShape), no profile.
    expect(cadModifierProfileForShape(shape("gear", { gearType: "helical" }))).toBeNull();
    expect(cadModifierProfileForShape(shape("text"))).toBeNull();
    // A twist, a taper and a lean are all lofts (tests/unit/taperedLoft.test.ts).
    expect(cadModifierProfileForShape(shape("polygon", { extrudeTwist: 45 }))?.kind).toBe("loft");
    expect(cadModifierProfileForShape(shape("polygon", { extrudeTopOffsetX: 5 }))?.kind).toBe("loft");
    expect(cadModifierProfileForShape(shape("polygon", { taperTopWidth: 20, taperTopDepth: 20 }))?.kind).toBe("loft");
    expect(cadModifierProfileForShape(shape("star", { cadBrep: "brep" }))).toBeNull();
    expect(cadModifierProfileForShape(shape("star", { importedMesh: { positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], baseWidth: 1, baseDepth: 1, baseHeight: 1 } } as Partial<WorkplaneShape>))).toBeNull();
    expect(cadModifierProfileForShape(shape("star", { groupedShapes: [shape("box")] }))).toBeNull();
    expect(cadModifierProfileForShape(shape("star", { height: 0 }))).toBeNull();
    // Anything the outline builder cannot make sense of stays on the mesh instead of throwing.
    expect(cadModifierProfileForShape(shape("polygon", { sides: Number.NaN }))).toBeNull();
    expect(cadModifierProfileForShape(shape("star", { width: Number.NaN }))).toBeNull();
  });

  it("sends only as much of a big request back to the display meshes as it takes, cheapest meshes first", () => {
    const star = cadModifierProfileForShape(shape("star", { starOuterFillet: 2, starInnerFillet: 1 }));
    const bigHoneycomb = cadModifierProfileForShape(shape("honeycomb", { width: 150, depth: 150, height: 3 }));
    const midHoneycomb = cadModifierProfileForShape(shape("honeycomb", { width: 100, depth: 100, height: 3 }));
    expect(cadProfileSegmentCount(star!)).toBe(20);
    expect(cadProfileSegmentCount(midHoneycomb!)).toBeLessThanOrEqual(CAD_MODIFIER_EXACT_SEGMENT_LIMIT);
    expect(cadProfileSegmentCount(bigHoneycomb!)).toBeGreaterThan(CAD_MODIFIER_EXACT_SEGMENT_LIMIT);
    const mesh = (triangles: number) => ({ faces: { length: triangles } });
    const starMesh = mesh(680);
    const honeycombMesh = mesh(7248);
    const plain = mesh(12);
    const small = [{ profile: star!, profileMesh: starMesh }, { profile: midHoneycomb!, profileMesh: mesh(3000) }, { mesh: plain }];
    expect(withinExactProfileLimit(small)).toBe(small);
    // The honeycomb alone is over the limit: it goes back, the star stays exact.
    const big = withinExactProfileLimit([{ profile: star!, profileMesh: starMesh }, { profile: bigHoneycomb!, profileMesh: honeycombMesh }, { mesh: plain }]);
    expect(big[0].profile).toBe(star);
    expect(big[1].profile).toBeUndefined();
    expect(big[1].mesh).toBe(honeycombMesh);
    expect(big[2].mesh).toBe(plain);
    // Over the limit together: the part whose mesh costs least per piece saved goes first.
    const gear = cadModifierProfileForShape(shape("gear", { width: 90, depth: 90, teeth: 60 }))!;
    // A plate whose mesh is dear per piece, like a text's (about 25 triangles per piece).
    const plate = cadModifierProfileForShape(shape("honeycomb", { width: 100, depth: 100, height: 3 }))!;
    const gearMesh = mesh(cadProfileSegmentCount(gear) * 8);
    const plateMesh = mesh(cadProfileSegmentCount(plate) * 25);
    const mixed = withinExactProfileLimit([{ profile: gear, profileMesh: gearMesh }, { profile: plate, profileMesh: plateMesh }]);
    expect(cadProfileSegmentCount(gear) + cadProfileSegmentCount(plate)).toBeGreaterThan(CAD_MODIFIER_EXACT_SEGMENT_LIMIT);
    expect(mixed[0].profile).toBeUndefined();
    expect(mixed[1].profile).toBe(plate);
  });

  it("gives exact parts time of their own when the edge tool prepares them", () => {
    expect(cadModifierPrepareTimeoutMs(0, 0)).toBe(cadModifierPrepareTimeoutMs(0));
    expect(cadModifierPrepareTimeoutMs(1_000, 0)).toBe(cadModifierPrepareTimeoutMs(1_000));
    expect(cadModifierPrepareTimeoutMs(0, 1)).toBe(62_000);
    expect(cadModifierPrepareTimeoutMs(0, 20)).toBe(100_000);
    expect(cadModifierPrepareTimeoutMs(100_000, 3)).toBe(CAD_MODIFIER_MAX_PREPARE_TIMEOUT_MS);
    expect(cadModifierPrepareTimeoutMs(0, 1_000)).toBe(CAD_MODIFIER_MAX_PREPARE_TIMEOUT_MS);
    // A 150 mm honeycomb: 1,550 outline pieces, measured 26 s - the budget keeps the 2.5x margin.
    expect(cadModifierPrepareTimeoutMs(0, 1, 1_550)).toBeGreaterThanOrEqual(26_000 * 2.5);
    expect(cadModifierPrepareTimeoutMs(0, 1, 1_550)).toBeLessThanOrEqual(CAD_MODIFIER_MAX_PREPARE_TIMEOUT_MS);
  });
});

describe("the round shapes' exact parts", () => {
  /** Where the part's transform puts a point of the solid's own frame. */
  const placed = (transform: number[] | undefined, x: number, y: number, z: number) =>
    new THREE.Vector3(x, y, z).applyMatrix4(cadTransformToMatrix(transform)).toArray().map((value) => Number(value.toFixed(9)) + 0);

  it("builds an ellipse as one arc once round, which validation accepts only alone and only in an extrusion", () => {
    const part = cadModifierProfileForShape(shape("ellipse", { width: 30, depth: 16 }));
    expect(part?.loops).toHaveLength(1);
    expect(part?.loops[0].segments).toHaveLength(1);
    expect(isWholeEllipse(part!.loops[0].segments[0])).toBe(true);
    expect(part?.loops[0].segments[0]).toMatchObject({ kind: "arc", rx: 15, rz: 8, start: 0, end: Math.PI * 2 });
    expect(profileLoopBounds(part!.loops[0])).toEqual([-15, -8, 15, 8]);
    const tube = cadModifierProfileForShape(shape("tube", { width: 30, depth: 16, bevel: 3 }));
    expect(tube?.loops.map((loop) => loop.segments.length)).toEqual([1, 1]);
    const whole = part!.loops[0];
    // Next to other segments, or turned around an axis, a whole ellipse is refused.
    expect(() => validateCadProfile({ kind: "extrusion", height: 5, loops: [{ ...whole, segments: [...whole.segments, { kind: "line", x: 0, z: 0 }, { kind: "line", x: 15, z: 0 }] }] })).toThrow();
    expect(() => validateCadProfile({ kind: "revolution", height: 5, loops: [whole] })).toThrow();
    // A single arc short of once round does not close.
    expect(() => validateCadProfile({ kind: "extrusion", height: 5, loops: [{ ...whole, segments: [{ ...whole.segments[0], end: Math.PI * 1.5 } as typeof whole.segments[0]] }] })).toThrow();
  });

  it("turns the sphere's half ellipse around its axis and stretches it to the depth", () => {
    const round = cadModifierProfileForShape(shape("sphere", { width: 20, depth: 20, height: 30 }));
    expect(round).toMatchObject({ kind: "revolution", height: 30 });
    expect(round?.loops[0].segments[0]).toMatchObject({ kind: "arc", cx: 0, cz: 15, rx: 10, rz: 15, start: -Math.PI / 2, end: Math.PI / 2 });
    // The axis stands up: the section's z becomes the height.
    expect(placed(round?.transform, 0, 0, 30)).toEqual([0, 30, 0]);
    expect(round?.transform && cadTransformRequiresGeneralTransform(round.transform)).toBeFalsy();
    const oval = cadModifierProfileForShape(shape("sphere", { width: 30, depth: 20, height: 16, x: 4, elevation: 2 }));
    // The section's radius runs along x at full width and along z at depth / width of it.
    expect(placed(oval?.transform, 15, 0, 8)).toEqual([19, 10, 0]);
    expect(placed(oval?.transform, 0, 15, 8)).toEqual([4, 10, -10]);
    expect(cadTransformRequiresGeneralTransform(oval!.transform!)).toBe(true);
  });

  it("builds an oval half sphere and an oval cone the same way, and leaves the round cone to its primitive", () => {
    const dome = cadModifierProfileForShape(shape("halfSphere", { width: 30, depth: 20, height: 10 }));
    expect(dome).toMatchObject({ kind: "revolution", height: 10 });
    expect(placed(dome?.transform, 0, 15, 0)).toEqual([0, 0, -10]);
    const frustum = cadModifierProfileForShape(shape("cone", { width: 30, depth: 15, height: 12, baseRadius: 15, topRadius: 4 }));
    expect(frustum?.kind).toBe("revolution");
    expect(frustum?.loops[0].segments.map((segment) => [segment.x, segment.z])).toEqual([[15, 0], [4, 12], [0, 12], [0, 0]]);
    expect(placed(frustum?.transform, 0, 4, 12)).toEqual([0, 12, -2]);
    const pointed = cadModifierProfileForShape(shape("cone", { width: 30, depth: 15, height: 12 }));
    expect(pointed?.loops[0].segments.map((segment) => [segment.x, segment.z])).toEqual([[15, 0], [0, 12], [0, 0]]);
    expect(cadModifierProfileForShape(shape("cone", { width: 20, depth: 20, height: 12 }))).toBeNull();
    // A cone standing on its tip: the section starts up the side from the axis.
    const tip = cadModifierProfileForShape(shape("cone", { width: 30, depth: 15, height: 12, baseRadius: 0, topRadius: 5 }));
    expect(tip?.loops[0].segments.map((segment) => [segment.x, segment.z])).toEqual([[5, 12], [0, 12], [0, 0]]);
    expect(cadModifierProfileForShape(shape("cone", { width: 30, depth: 15, baseRadius: 0, topRadius: 0 }))).toBeNull();
  });
});

describe("round shapes drawn with few sides", () => {
  const key = (x: number, z: number) => `${(Math.round(x * 1e4) / 1e4 + 0).toFixed(4)},${(Math.round(z * 1e4) / 1e4 + 0).toFixed(4)}`;
  const cornersOf = (loops: CadModifierProfileLoop[]) => loops.flatMap((loop) => loop.segments.map((segment) => {
    expect(segment.kind).toBe("line");
    return key(segment.x, segment.z);
  })).sort();
  /** The corners on the display mesh's floor (y = 0), leaving out a cap's centre where a fan of triangles meets. */
  const floorOf = (geometry: THREE.BufferGeometry, capCentre?: { x: number; z: number }) => {
    const floor = new Set(meshOf(geometry).vertices.filter(([, y]) => Math.abs(y) < 1e-6).map(([x, , z]) => key(x, z)));
    if (capCentre) floor.delete(key(capCentre.x, capCentre.z));
    return [...floor].sort();
  };
  const prismCentre = (width: number, depth: number, sides: number) => {
    const fit = regularPolygonFootprintScale(width, depth, sides);
    return { x: fit.offsetX, z: fit.offsetZ };
  };
  const loopsOf = (source: WorkplaneShape) => {
    const part = cadModifierProfileForShape(source);
    expect(part?.kind).toBe("extrusion");
    return part!.loops;
  };

  it("builds a cylinder or ellipse of few sides as the display prism, corner for corner", () => {
    const hexagon = loopsOf(shape("cylinder", { width: 20, depth: 20, sides: 6 }));
    expect(hexagon).toEqual(polygonProfileLoops(20, 20, 6));
    expect(cornersOf(hexagon)).toEqual(floorOf(createPrismGeometry(20, 10, 20, 6), prismCentre(20, 20, 6)));
    const octagon = loopsOf(shape("ellipse", { width: 30, depth: 15, sides: 8 }));
    expect(cornersOf(octagon)).toEqual(floorOf(createPrismGeometry(30, 10, 15, 8), prismCentre(30, 15, 8)));
    const coarse = loopsOf(shape("cylinder", { width: 150, depth: 150, sides: 24 }));
    expect(coarse[0].segments).toHaveLength(24);
  });

  it("puts a turned prism where the viewport draws it, beyond half a side step", () => {
    // The viewport turns the stretched polygon by the shape's own rotation (WorkplaneViewport.tsx).
    [[6, 33], [6, 70], [5, 50], [3, 70], [8, 50]].forEach(([sides, rotation]) => {
      const source = shape("cylinder", { width: 20, depth: 20, sides, rotation, x: 4, z: -2 });
      const part = cadModifierProfileForShape(source)!;
      const placed = part.loops[0].segments.map((segment) => new THREE.Vector3(segment.x, 0, segment.z).applyMatrix4(cadTransformToMatrix(part.transform)));
      const turn = new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(rotation));
      const viewport = meshOf(createPrismGeometry(20, 10, 20, sides)).vertices
        .filter(([, y]) => Math.abs(y) < 1e-6)
        .map(([x, , z]) => new THREE.Vector3(x, 0, z).applyMatrix4(turn).add(new THREE.Vector3(4, 0, -2)));
      placed.forEach((corner) => {
        expect(Math.min(...viewport.map((point) => point.distanceTo(corner))), `${sides} sides at ${rotation} degrees`).toBeLessThan(1e-6);
      });
    });
  });

  it("keeps them round with sides following the size, the former 96, or a polygon within the tolerance of the circle", () => {
    // A round cylinder that is round is the analytic primitive.
    expect(cadModifierPrimitiveForAnalyticShape(shape("cylinder", { width: 200, depth: 200, sides: 96 }))?.kind).toBe("cylinder");
    expect(cadModifierPrimitiveForAnalyticShape(shape("cylinder", { width: 200, depth: 200 }))?.kind).toBe("cylinder");
    expect(cadModifierProfileForShape(shape("cylinder", { width: 200, depth: 200, sides: 96 }))).toBeNull();
    expect(cadModifierProfileForShape(shape("cylinder", { width: 200, depth: 200 }))).toBeNull();
    expect(loopsOf(shape("ellipse", { width: 200, depth: 100, sides: 96 }))[0].segments).toHaveLength(1);
    expect(loopsOf(shape("ellipse", { width: 1, depth: 1, sides: 12 }))[0].segments).toHaveLength(1);
  });

  it("builds a tube of few sides as the display's two polygons, never fewer than its twelve", () => {
    const tube = loopsOf(shape("tube", { width: 20, depth: 20, bevel: 4, sides: 8 }));
    expect(tube.map((loop) => loop.segments.length)).toEqual([12, 12]);
    expect(cornersOf(tube)).toEqual(floorOf(createBooleanHollowCylinderGeometry(20, 10, 20, 4, 8)));
    expect(loopsOf(shape("ring", { width: 30, depth: 30, height: 5 })).map((loop) => loop.segments.length)).toEqual([1, 1]);
  });

  it("builds a round roof of few sides as the display's cross-section, twice as many chords as sides", () => {
    const roof = cadModifierProfileForShape(shape("roundRoof", { width: 20, depth: 30, height: 10, sides: 4 }));
    expect(roof?.loops[0].segments).toHaveLength(9);
    // The display's front face, at z = depth / 2, carries the cross-section: profile (x, z) is display (x, y).
    const front = new Set(meshOf(createBooleanRoundRoofGeometry(20, 10, 30, 4)).vertices.filter(([, , z]) => Math.abs(z - 15) < 1e-6).map(([x, y]) => key(x, y)));
    expect(cornersOf(roof!.loops)).toEqual([...front].sort());
    expect(roof?.loops[0].segments.every((segment) => segment.kind === "line")).toBe(true);
    // Its own 64 sides are round however large.
    expect(cadModifierProfileForShape(shape("roundRoof", { width: 160, depth: 30, height: 80, sides: 64 }))?.loops[0].segments[0].kind).toBe("arc");
  });

  it("leaves faceted balls and few-sided oval cones on their display meshes", () => {
    expect(cadModifierProfileForShape(shape("sphere", { width: 30, depth: 20, height: 15, steps: 6 }))).toBeNull();
    expect(cadModifierProfileForShape(shape("sphere", { width: 200, depth: 150, height: 120, steps: 24 }))?.kind).toBe("revolution");
    expect(cadModifierProfileForShape(shape("halfSphere", { width: 30, depth: 20, height: 10, steps: 5 }))).toBeNull();
    expect(cadModifierProfileForShape(shape("halfSphere", { width: 200, depth: 200, height: 80, steps: 32 }))?.kind).toBe("revolution");
    expect(cadModifierProfileForShape(shape("cone", { width: 30, depth: 15, height: 15, sides: 6 }))).toBeNull();
    expect(cadModifierProfileForShape(shape("cone", { width: 30, depth: 15, height: 15, sides: 96 }))?.kind).toBe("revolution");
  });
});

describe("rounded box in the edge tool (#239)", () => {
  it("is the exact round, but not at quality 1, which is drawn as a flat chamfer", () => {
    const base = { width: 40, depth: 30, height: 20, cornerFillet: 4, topBottomFillet: 3 };
    expect(cadModifierProfileForShape(shape("roundedBox", { ...base, roundedBoxQuality: 8 }))).not.toBeNull();
    expect(cadModifierProfileForShape(shape("roundedBox", { ...base, roundedBoxQuality: 2 }))).not.toBeNull();
    expect(cadModifierProfileForShape(shape("roundedBox", { ...base, roundedBoxQuality: 1 }))).toBeNull();
    expect(cadModifierProfileForShape(shape("roundedBox", { ...base, topBottomFillet: 0, roundedBoxQuality: 1 }))).toBeNull();
  });
});

describe("the wedge, pyramid and paraboloid as exact parts (#1007)", () => {
  const placed = (transform: number[] | undefined, x: number, y: number, z: number) =>
    new THREE.Vector3(x, y, z).applyMatrix4(cadTransformToMatrix(transform)).toArray().map((value) => Number(value.toFixed(9)) + 0);
  const key = (x: number, z: number) => `${(Math.round(x * 1e6) / 1e6 + 0).toFixed(6)},${(Math.round(z * 1e6) / 1e6 + 0).toFixed(6)}`;
  const lineCorners = (loop: CadModifierProfileLoop) => loop.segments.map((segment) => {
    expect(segment.kind).toBe("line");
    return key(segment.x, segment.z);
  }).sort();
  /** The display mesh's corners at height y, as (x, z), leaving out a cap's centre where a fan of triangles meets. */
  const ringOf = (part: WorkplaneShape, y: number) => [...new Set(meshForShape(part).vertices.filter(([, vy]) => Math.abs(vy - y) < 1e-6).map(([x, , z]) => key(x, z)))].filter((corner) => corner !== key(0, 0)).sort();

  it("pushes the wedge's triangle from its front face along the depth, the right angle at +x", () => {
    const part = cadModifierProfileForShape(shape("wedge", { width: 30, depth: 12, height: 8 }));
    expect(part).toMatchObject({ kind: "extrusion", height: 12 });
    expect(lineCorners(part!.loops[0])).toEqual([key(-15, 0), key(15, 0), key(15, 8)].sort());
    // The display's front face (z = depth / 2) carries the triangle: profile (x, z) is display (x, y).
    const front = [...new Set(meshForShape(shape("wedge", { width: 30, depth: 12, height: 8 })).vertices.filter(([, , z]) => Math.abs(z - 6) < 1e-6).map(([x, y]) => key(x, y)))].sort();
    expect(lineCorners(part!.loops[0])).toEqual(front);
    // The profile's z is the height, the extrusion runs from the front face to the back one.
    expect(placed(part?.transform, 15, 0, 8)).toEqual([15, 8, 6]);
    expect(placed(part?.transform, 15, 12, 8)).toEqual([15, 8, -6]);
    // A tapered wedge stays on its display mesh, as before.
    expect(cadModifierProfileForShape(shape("wedge", { width: 30, depth: 12, height: 8, taperTopWidth: 10 }))).toBeNull();
  });

  it("turns the paraboloid's parabola, one Bezier curve, round its axis and stretches it to the depth", () => {
    const part = cadModifierProfileForShape(shape("paraboloid", { width: 30, depth: 20, height: 18, steps: 32 }));
    expect(part).toMatchObject({ kind: "revolution", height: 18 });
    const [first, curve, back] = part!.loops[0].segments;
    expect(part!.loops[0]).toMatchObject({ x: 0, z: 0 });
    expect(first).toMatchObject({ kind: "line", x: 15, z: 0 });
    expect(curve).toMatchObject({ kind: "bezier", x: 0, z: 18, controls: [{ x: 7.5, z: 18 }] });
    expect(back).toMatchObject({ kind: "line", x: 0, z: 0 });
    // The quadratic Bezier is the parabola y = h (1 - (r / R)^2) point for point.
    for (const t of [0.1, 0.35, 0.5, 0.8]) {
      const r = (1 - t) ** 2 * 15 + 2 * t * (1 - t) * 7.5;
      const y = 2 * t * (1 - t) * 18 + t * t * 18;
      expect(y).toBeCloseTo(18 * (1 - (r / 15) ** 2), 12);
    }
    // The radius runs along x at full width and along z at depth / width of it.
    expect(placed(part?.transform, 0, 15, 0)).toEqual([0, 0, -10]);
    expect(placed(part?.transform, 0, 0, 18)).toEqual([0, 18, 0]);
    // Drawn with few steps it is faceted and stays on its display mesh, as the half sphere.
    expect(cadModifierProfileForShape(shape("paraboloid", { width: 30, depth: 20, height: 18, steps: 5 }))).toBeNull();
  });

  it("lofts a pointed pyramid from its base to its tip, corner for corner the display's", () => {
    for (const sides of [3, 4, 5, 6]) {
      const pyramid = shape("pyramid", { width: 30, depth: 20, height: 25, sides, topWidth: 0, topDepth: 0 });
      const part = cadModifierProfileForShape(pyramid);
      expect(part).toMatchObject({ kind: "loft", height: 25, apex: { x: 0, z: 0 } });
      expect(part?.topLoops).toBeUndefined();
      expect(lineCorners(part!.loops[0])).toEqual(ringOf(pyramid, 0));
      // The display's tip, the one point at the full height, is the loft's.
      expect([...new Set(meshForShape(pyramid).vertices.filter(([, y]) => Math.abs(y - 25) < 1e-6).map(([x, , z]) => key(x, z)))]).toEqual([key(0, 0)]);
      expect(() => validateCadProfile(part!)).not.toThrow();
    }
    // A top under the smallest one the display draws is a point too.
    expect(cadModifierProfileForShape(shape("pyramid", { width: 30, depth: 20, height: 25, sides: 4, topWidth: 0.01, topDepth: 8 }))?.apex).toEqual({ x: 0, z: 0 });
  });

  it("lofts a pyramid with a top from its base to its top, both the display's corners", () => {
    for (const sides of [3, 4, 6]) {
      const frustum = shape("pyramid", { width: 30, depth: 20, height: 25, sides, topWidth: 12, topDepth: 6 });
      const part = cadModifierProfileForShape(frustum);
      expect(part).toMatchObject({ kind: "loft", height: 25 });
      expect(part?.apex).toBeUndefined();
      expect(lineCorners(part!.loops[0])).toEqual(ringOf(frustum, 0));
      expect(lineCorners(part!.topLoops![0])).toEqual(ringOf(frustum, 25));
    }
  });

  it("validates a loft to a point only with one outline of straight lines", () => {
    const base = cadModifierProfileForShape(shape("pyramid", { width: 30, depth: 20, height: 25, sides: 4 }))!;
    expect(base.apex).toEqual({ x: 0, z: 0 });
    expect(() => validateCadProfile(base)).not.toThrow();
    expect(() => validateCadProfile({ ...base, apex: { x: Number.NaN, z: 0 } })).toThrow();
    expect(() => validateCadProfile({ ...base, loops: [base.loops[0], base.loops[0]] })).toThrow();
    expect(() => validateCadProfile({ ...base, topLoops: base.loops })).toThrow();
    // A capsule's outline has arcs, and a loft to a point takes only straight sides.
    const capsule = cadModifierProfileForShape(shape("slot", { width: 30, depth: 10 }))!;
    expect(capsule.loops[0].segments.some((segment) => segment.kind === "arc")).toBe(true);
    expect(() => validateCadProfile({ ...base, loops: capsule.loops })).toThrow(/straight-sided/);
    expect(() => validateCadProfile({ ...base, apex: undefined })).toThrow();
    // Its sides are built flat, so nothing may turn, tilt, smooth or chamfer them.
    expect(() => validateCadProfile({ ...base, twist: 30 })).toThrow();
    expect(() => validateCadProfile({ ...base, tilt: { x: 5, z: 0 } })).toThrow();
    expect(() => validateCadProfile({ ...base, smooth: 0.5 })).toThrow();
    expect(() => validateCadProfile({ ...base, capChamfer: { radius: 15, size: 1 } })).toThrow();
    // Nothing turned is nothing turned.
    expect(() => validateCadProfile({ ...base, twist: 0, tilt: { x: 0, z: 0 } })).not.toThrow();
  });
});
