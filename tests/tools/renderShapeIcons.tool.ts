import { describe, it } from "vitest";
import { writeFileSync } from "node:fs";
import { encodePng } from "./png";
import type * as THREE from "three";
import { BoxGeometry } from "three";
import { regularPolygonAspect } from "@/lib/regularPolygonFootprint";
import { createPrismGeometry } from "@/lib/prismGeometry";
import { createSpringGeometry } from "@/lib/springGeometry";
import { createStarGeometry } from "@/lib/starGeometry";
import { createHeartGeometry } from "@/lib/heartGeometry";
import { createCrescentGeometry } from "@/lib/crescentGeometry";
import { createSlotGeometry } from "@/lib/slotGeometry";
import { createDovetailGeometry } from "@/lib/dovetailGeometry";
import { createHingeGeometry } from "@/lib/hingeGeometry";
import { createKnurlGeometry } from "@/lib/knurlGeometry";
import { createTeardropGeometry, teardropHeightForTipAngle } from "@/lib/teardropGeometry";
import { createLoftGeometry } from "@/lib/loftGeometry";
import { createScrewHoleGeometry } from "@/lib/screwHoleGeometry";
import { createHoneycombGeometry } from "@/lib/honeycombGeometry";
import { createRoundedBoxGeometry } from "@/lib/roundedBoxGeometry";
import { createThreadGeometry } from "@/lib/threadGeometry";
import { bentTubeNaturalDimensions, createBentTubeGeometry } from "@/lib/bentTubeGeometry";
import { createGearGeometry } from "@/lib/gearGeometry";
import manifoldModule from "manifold-3d";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { textLetterSizePatch } from "@/lib/nameTag";
import { textDisplayGeometry } from "@/lib/textFill";
import { loadTextFonts } from "@/lib/textFonts";
import { DEFAULT_TEXT_LAYERS, textLayerShapes } from "@/lib/textLayers";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * Zeichnet die Symbole fuer die Formenliste aus genau der Geometrie, die der
 * Editor auch auf die Arbeitsebene legt - ein gemaltes Gewinde war jedes Mal
 * daneben. Aufruf: npm run icons:shapes
 *
 * Orthografische Sicht auf derselben Achse wie die uebrigen Symbole,
 * Gouraud-Schattierung, Konturen aus Tiefen- und Normalensprung, vierfach
 * ueberabgetastet. Das Ergebnis liegt als PNG neben den anderen Symbolen.
 */

const SIZE = 256;
const SS = 4;
const W = SIZE * SS;
const MARGIN = 16 * SS;
const SILHOUETTE_RADIUS = 8;
const CREASE_RADIUS = 2;
const LINE = [0x33, 0x33, 0x33];

/** In die Ansicht drehen, die auch die uebrigen Symbole zeigen. */
function makeProject(AZIMUTH: number, ELEVATION: number, lay: boolean) {
  return function project(x: number, y: number, z: number) {
  // Die Stange steht in der Geometrie auf der Y-Achse; fuer ein liegendes
  // Symbol wird sie vorher umgelegt.
  const lx = lay ? y : x;
  const ly = lay ? -x : y;
  const lz = z;
  const ca = Math.cos(AZIMUTH);
  const sa = Math.sin(AZIMUTH);
  const rx = lx * ca + lz * sa;
  const rz = -lx * sa + lz * ca;
  const ce = Math.cos(ELEVATION);
  const se = Math.sin(ELEVATION);
  const ry = ly * ce - rz * se;
  const rz2 = ly * se + rz * ce;
  return { x: rx, y: ry, z: rz2 };
  };
}

function maxFilter(mask: Uint8Array, radius: number) {
  const out = new Uint8Array(W * W);
  const tmp = new Uint8Array(W * W);
  for (let y = 0; y < W; y += 1) {
    for (let x = 0; x < W; x += 1) {
      let value = 0;
      for (let k = -radius; k <= radius && value === 0; k += 1) {
        const sx = x + k;
        if (sx < 0 || sx >= W) continue;
        if (mask[y * W + sx]) value = 1;
      }
      tmp[y * W + x] = value;
    }
  }
  for (let y = 0; y < W; y += 1) {
    for (let x = 0; x < W; x += 1) {
      let value = 0;
      for (let k = -radius; k <= radius && value === 0; k += 1) {
        const sy = y + k;
        if (sy < 0 || sy >= W) continue;
        if (tmp[sy * W + x]) value = 1;
      }
      out[y * W + x] = value;
    }
  }
  return out;
}

type Variant = {
  name: string;
  build: () => THREE.BufferGeometry;
  height: number;
  lay: boolean;
  azimuth: number;
  elevation: number;
};

function render({ name, build, height, lay, azimuth, elevation }: Variant) {
  {
    const project = makeProject((azimuth * Math.PI) / 180, (elevation * Math.PI) / 180, lay);
    const geometry = build();
    const position = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    const count = position.count;

    const px = new Float64Array(count);
    const py = new Float64Array(count);
    const pz = new Float64Array(count);
    const nx = new Float64Array(count);
    const ny = new Float64Array(count);
    const nz = new Float64Array(count);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < count; i += 1) {
      const p = project(position.getX(i), position.getY(i) - height / 2, position.getZ(i));
      px[i] = p.x; py[i] = p.y; pz[i] = p.z;
      const n = project(normal.getX(i), normal.getY(i), normal.getZ(i));
      nx[i] = n.x; ny[i] = n.y; nz[i] = n.z;
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const scale = Math.min((W - MARGIN * 2) / (maxX - minX), (W - MARGIN * 2) / (maxY - minY));
    const offsetX = W / 2 - ((minX + maxX) / 2) * scale;
    const offsetY = W / 2 + ((minY + maxY) / 2) * scale;
    const sx = (i: number) => px[i] * scale + offsetX;
    const sy = (i: number) => -py[i] * scale + offsetY;

    const depth = new Float64Array(W * W).fill(-Infinity);
    const shade = new Float64Array(W * W);
    const normalBuffer = new Float64Array(W * W * 3);
    const cover = new Uint8Array(W * W);

    const lx = -0.45, ly = 0.74, lz = 0.5;
    const ll = Math.hypot(lx, ly, lz);

    for (let t = 0; t < count; t += 3) {
      const ax = sx(t), ay = sy(t);
      const bx = sx(t + 1), by = sy(t + 1);
      const cx = sx(t + 2), cy = sy(t + 2);
      const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
      if (Math.abs(area) < 1e-9) continue;
      const loX = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
      const hiX = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx)));
      const loY = Math.max(0, Math.floor(Math.min(ay, by, cy)));
      const hiY = Math.min(W - 1, Math.ceil(Math.max(ay, by, cy)));
      for (let y = loY; y <= hiY; y += 1) {
        for (let x = loX; x <= hiX; x += 1) {
          const qx = x + 0.5, qy = y + 0.5;
          const w0 = ((bx - ax) * (qy - ay) - (by - ay) * (qx - ax)) / area;
          const w1 = ((qx - ax) * (cy - ay) - (qy - ay) * (cx - ax)) / area;
          if (w0 < 0 || w1 < 0 || w0 + w1 > 1) continue;
          const w2 = 1 - w0 - w1;
          const z = pz[t] * w2 + pz[t + 2] * w0 + pz[t + 1] * w1;
          const index = y * W + x;
          if (z <= depth[index]) continue;
          depth[index] = z;
          cover[index] = 1;
          let vx = nx[t] * w2 + nx[t + 2] * w0 + nx[t + 1] * w1;
          let vy = ny[t] * w2 + ny[t + 2] * w0 + ny[t + 1] * w1;
          let vz = nz[t] * w2 + nz[t + 2] * w0 + nz[t + 1] * w1;
          const len = Math.hypot(vx, vy, vz) || 1;
          vx /= len; vy /= len; vz /= len;
          normalBuffer[index * 3] = vx;
          normalBuffer[index * 3 + 1] = vy;
          normalBuffer[index * 3 + 2] = vz;
          const lambert = Math.max(0, (vx * lx + vy * ly + vz * lz) / ll);
          shade[index] = 0.38 + 0.62 * lambert;
        }
      }
    }

    const silhouette = new Uint8Array(W * W);
    const crease = new Uint8Array(W * W);
    for (let y = 0; y < W - 1; y += 1) {
      for (let x = 0; x < W - 1; x += 1) {
        const a = y * W + x;
        const neighbours = [a + 1, a + W];
        for (const b of neighbours) {
          if (cover[a] !== cover[b]) {
            silhouette[cover[a] ? a : b] = 1;
            continue;
          }
          if (!cover[a]) continue;
          if (Math.abs(depth[a] - depth[b]) > 0.6) {
            crease[depth[a] < depth[b] ? a : b] = 1;
            continue;
          }
          const dot = normalBuffer[a * 3] * normalBuffer[b * 3]
            + normalBuffer[a * 3 + 1] * normalBuffer[b * 3 + 1]
            + normalBuffer[a * 3 + 2] * normalBuffer[b * 3 + 2];
          if (dot < Math.cos((42 * Math.PI) / 180)) crease[a] = 1;
        }
      }
    }
    const thickSilhouette = maxFilter(silhouette, SILHOUETTE_RADIUS);
    const thickCrease = maxFilter(crease, CREASE_RADIUS);

    const big = new Uint8Array(W * W * 4);
    for (let i = 0; i < W * W; i += 1) {
      const isLine = thickSilhouette[i] || thickCrease[i];
      if (isLine) {
        big[i * 4] = LINE[0];
        big[i * 4 + 1] = LINE[1];
        big[i * 4 + 2] = LINE[2];
        big[i * 4 + 3] = 255;
      } else if (cover[i]) {
        const grey = Math.max(0, Math.min(255, Math.round(126 + 129 * shade[i])));
        big[i * 4] = grey;
        big[i * 4 + 1] = grey;
        big[i * 4 + 2] = grey;
        big[i * 4 + 3] = 255;
      }
    }

    const small = new Uint8Array(SIZE * SIZE * 4);
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let oy = 0; oy < SS; oy += 1) {
          for (let ox = 0; ox < SS; ox += 1) {
            const i = ((y * SS + oy) * W + x * SS + ox) * 4;
            const alpha = big[i + 3] / 255;
            r += big[i] * alpha; g += big[i + 1] * alpha; b += big[i + 2] * alpha; a += alpha;
          }
        }
        const n = SS * SS;
        const index = (y * SIZE + x) * 4;
        small[index] = a > 0 ? Math.round(r / a) : 0;
        small[index + 1] = a > 0 ? Math.round(g / a) : 0;
        small[index + 2] = a > 0 ? Math.round(b / a) : 0;
        small[index + 3] = Math.round((a / n) * 255);
      }
    }

    writeFileSync(name, encodePng(small, SIZE));
  }
}

describe("palette icons", () => {
  it("renders them from the real geometry", () => {
    // The ring gear and the rack (#201), beside the drawn spur, helical and bevel gear pictures.
    render({
      name: "apps/web/public/assets/editor/gear-types/internal.png",
      height: 6,
      lay: false,
      azimuth: 35,
      elevation: 50,
      build: () => createGearGeometry({ width: 44, depth: 44, height: 6, teeth: 18, gearType: "internal", gearProfile: "involute", gearRim: 3, gearBacklash: 0 }),
    });
    render({
      name: "apps/web/public/assets/editor/gear-types/rack.png",
      height: 6,
      lay: false,
      azimuth: 35,
      elevation: 50,
      build: () => createGearGeometry({ width: 10 * Math.PI * 2, depth: 9, height: 6, teeth: 10, gearType: "rack", gearProfile: "involute", gearBacklash: 0 }),
    });
    render({
      name: "apps/web/public/assets/editor/shape-icons-gray/thread.png",
      height: 14,
      lay: true,
      azimuth: 45,
      elevation: 30,
      build: () => createThreadGeometry({
        width: 6,
        depth: 6,
        height: 14,
        threadRole: "rod",
        threadDiameter: 6,
        threadPitch: 1.4,
        threadQuality: 96,
      }),
    });
    render({
      name: "apps/web/public/assets/editor/shape-icons-gray/spring.png",
      height: 30,
      lay: false,
      azimuth: 35,
      elevation: 24,
      build: () => createSpringGeometry({
        width: 20,
        depth: 20,
        height: 30,
        springTurns: 5,
        springWire: 3.4,
        springQuality: 72,
      }),
    });
    render({
      name: "apps/web/public/assets/editor/shape-icons-gray/ruler.png",
      height: 3,
      lay: false,
      azimuth: 25,
      elevation: 28,
      build: () => new BoxGeometry(150, 3, 25),
    });
    render({
      name: "apps/web/public/assets/editor/shape-icons-gray/ellipse.png",
      height: 20,
      lay: false,
      azimuth: 40,
      elevation: 26,
      // Bewusst ungleiche Breite/Tiefe und eine hohe Seitenzahl, damit das
      // Symbol als Ellipse zu erkennen ist statt als Zylinder. render() geht
      // Dreiecke unindiziert durch - wie beim Vieleck muss die Geometrie das
      // vorher sein, sonst bleibt das Bild fast leer.
      build: () => createPrismGeometry(26, 20, 16, 72).toNonIndexed(),
    });
    render({
      name: "apps/web/public/assets/editor/shape-icons-gray/polygon.png",
      height: 20,
      lay: false,
      azimuth: 20,
      elevation: 30,
      build: () => {
        // Breite und Tiefe im Verhaeltnis des Sechskants: sonst waere das
        // Vieleck im Symbol gestaucht statt gleichseitig.
        const aspect = regularPolygonAspect(6);
        const longest = Math.max(aspect.width, aspect.depth);
        const prism = createPrismGeometry((20 * aspect.width) / longest, 20, (20 * aspect.depth) / longest, 6)
          .toNonIndexed();
        // Flache Normalen, damit die Flaechen als Flaechen stehen.
        prism.computeVertexNormals();
        return prism;
      },
    });
    render({
      name: "apps/web/public/assets/editor/shape-icons-gray/star.png",
      height: 10,
      lay: false,
      azimuth: 25,
      elevation: 32,
      build: () => createStarGeometry({
        width: 40,
        depth: 40,
        height: 10,
        starPoints: 5,
        starInnerSize: 20,
        starOuterFillet: 0,
        starInnerFillet: 0,
      }),
    });
    render({
      name: "apps/web/public/assets/editor/shape-icons-gray/heart.png",
      height: 10,
      lay: false,
      azimuth: 25,
      elevation: 32,
      build: () => createHeartGeometry({
        width: 40,
        depth: 40,
        height: 10,
        heartTipFillet: 0,
        heartQuality: 32,
      }),
    });
    render({
      name: "apps/web/public/assets/editor/shape-icons-gray/crescent.png",
      height: 10,
      lay: false,
      azimuth: 25,
      elevation: 32,
      build: () => createCrescentGeometry({
        width: 40,
        depth: 40,
        height: 10,
        crescentThickness: 12,
        crescentTipFillet: 0,
        crescentQuality: 32,
      }),
    });
    render({
      name: "apps/web/public/assets/editor/shape-icons-gray/slot.png",
      height: 16,
      lay: false,
      azimuth: 35,
      elevation: 28,
      build: () => createSlotGeometry({
        width: 36,
        depth: 18,
        height: 16,
        sides: 32,
      }),
    });
    render({
      // Steiler von oben, damit das Trapez als Schwalbenschwanz zu lesen ist.
      name: "apps/web/public/assets/editor/shape-icons-gray/dovetail.png",
      height: 8,
      lay: false,
      azimuth: 0,
      elevation: 55,
      build: () => createDovetailGeometry({
        width: 34,
        depth: 24,
        height: 8,
        dovetailNeckWidth: 16,
      }),
    });
    render({
      name: "apps/web/public/assets/editor/shape-icons-gray/counterbore.png",
      height: 12,
      lay: false,
      azimuth: 35,
      elevation: 32,
      build: () => createScrewHoleGeometry({ kind: "counterbore", width: 16, depth: 16, height: 24, screwHoleShaft: 8, screwHoleHeadDepth: 9 }),
    });
    render({
      name: "apps/web/public/assets/editor/shape-icons-gray/countersink.png",
      height: 12,
      lay: false,
      azimuth: 35,
      elevation: 32,
      build: () => createScrewHoleGeometry({ kind: "countersink", width: 16, depth: 16, height: 20, screwHoleShaft: 8, screwHoleAngle: 90 }),
    });
    render({
      // Schraeg von vorn auf die Stirnseite, damit Rundung und Spitze zu sehen sind.
      name: "apps/web/public/assets/editor/shape-icons-gray/teardrop.png",
      height: teardropHeightForTipAngle(16, 90),
      lay: false,
      azimuth: 35,
      elevation: 18,
      build: () => createTeardropGeometry({ width: 16, depth: 30, height: teardropHeightForTipAngle(16, 90) }),
    });
    render({
      // Von eckig auf rund, mit Wand: von oben schraeg, damit die Oeffnung zeigt, was der Uebergang ist (#188).
      name: "apps/web/public/assets/editor/shape-icons-gray/loft.png",
      height: 28,
      lay: false,
      azimuth: 30,
      elevation: 34,
      build: () => createLoftGeometry({
        size: 36,
        width: 36,
        depth: 36,
        height: 28,
        loftBottomOutline: "rectangle",
        loftTopOutline: "round",
        loftBottomWidth: 36,
        loftBottomDepth: 36,
        loftTopWidth: 22,
        loftTopDepth: 22,
        loftBottomCorner: 3,
        loftWall: 2.5,
      }),
    });
    render({
      name: "apps/web/public/assets/editor/shape-icons-gray/honeycomb.png",
      height: 8,
      lay: false,
      azimuth: 25,
      elevation: 32,
      build: () => createHoneycombGeometry({
        width: 36,
        depth: 36,
        height: 8,
        honeycombCellSize: 8,
        honeycombWallThickness: 2,
        honeycombFrameWidth: 2.5,
      }),
    });
    render({
      // Schraeg von vorn oben: beide Blaetter und die abwechselnden Knoechel.
      name: "apps/web/public/assets/editor/shape-icons-gray/hinge.png",
      height: 8,
      lay: false,
      azimuth: 30,
      elevation: 34,
      build: () => createHingeGeometry({ width: 36, depth: 30, height: 8, hingeKnuckles: 5 }),
    });
    render({
      // Gekreuzt, weil man eine Raendelung an den Rauten erkennt; schraeg von oben.
      name: "apps/web/public/assets/editor/shape-icons-gray/knurl.png",
      height: 26,
      lay: false,
      azimuth: 30,
      elevation: 24,
      build: () => createKnurlGeometry({ width: 24, height: 26, knurlPattern: "diamond", knurlCount: 18, knurlDepth: 1.2, knurlAngle: 30, knurlChamfer: 1.5 }),
    });
    render({
      name: "apps/web/public/assets/editor/shape-icons-gray/roundedBox.png",
      height: 20,
      lay: false,
      azimuth: 35,
      elevation: 28,
      build: () => createRoundedBoxGeometry({
        width: 36,
        depth: 28,
        height: 20,
        cornerFillet: 6,
        topBottomFillet: 0,
        roundedBoxQuality: 16,
      }),
    });
    {
      const fields = {
        bentTubeProfile: "round" as const,
        bentTubeInnerProfile: "round" as const,
        bentTubeSize: 10,
        bentTubeWall: 2,
        bentTubeQuality: 32,
        bentTubeSegments: [
          { length: 18, bendAngle: 90, bendRadius: 14, roll: 0 },
          { length: 18, bendAngle: 0, bendRadius: 14, roll: 0 },
        ],
      };
      const natural = bentTubeNaturalDimensions(fields);
      render({
        name: "apps/web/public/assets/editor/shape-icons-gray/bentTube.png",
        height: natural.height,
        lay: false,
        azimuth: 35,
        elevation: 28,
        build: () => createBentTubeGeometry({ ...fields, ...natural }),
      });
    }
  });
});

describe("palette icon of the name tag (#215)", () => {
  it("renders the default layers of a short word", async () => {
    const runtime = await manifoldModule();
    runtime.setup();
    rememberManifoldRuntime(runtime);
    await loadTextFonts();
    const words: WorkplaneShape = { id: "icon", name: "Text", kind: "text", color: "#ffffff", x: 0, z: 0, elevation: 0, rotation: 0, width: 40, depth: 20, height: 1, size: 40, text: "Ab", font: "Sans" };
    const layers = textLayerShapes({ ...words, ...textLetterSizePatch(words, 12) }, DEFAULT_TEXT_LAYERS);
    const pieces = layers.map((layer) => {
      const piece = textDisplayGeometry(layer);
      const flat = piece.index ? piece.toNonIndexed() : piece;
      Object.keys(flat.attributes).filter((name) => name !== "position").forEach((name) => flat.deleteAttribute(name));
      flat.translate(0, layer.elevation ?? 0, 0);
      return flat;
    });
    const stack = mergeGeometries(pieces, false);
    stack.computeVertexNormals();
    const height = Math.max(...layers.map((layer) => (layer.elevation ?? 0) + layer.height));
    render({
      name: "apps/web/public/assets/editor/shape-icons-gray/nameTag.png",
      height,
      lay: false,
      azimuth: 30,
      elevation: 42,
      build: () => stack,
    });
  });
});
