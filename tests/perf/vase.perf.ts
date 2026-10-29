import { it } from "vitest";
import * as THREE from "three";
import { toCreasedNormals as threeCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { toCreasedNormals } from "@/lib/creasedNormals";
import { buildVase } from "@/lib/vase/vase-geometry.mjs";
import { normalizeVaseSettings, vaseSettingsInFrame } from "@/lib/vaseSettings";

function timed(run: () => void) {
  const start = performance.now();
  run();
  return Number((performance.now() - start).toFixed(0));
}

it("prints what a vase costs: the body, and its shading with three's and with our creased normals", () => {
  for (const over of [{ body: "hohl", cutout: "voronoi" }, { quality: "fein", body: "hohl", cutout: "voronoi" }]) {
    const settings = vaseSettingsInFrame(normalizeVaseSettings(over), 100, 100, 150);
    buildVase(settings);
    let mesh = buildVase(settings);
    const buildMs = timed(() => { mesh = buildVase(settings); });
    const geometry = () => {
      const indexed = new THREE.BufferGeometry();
      indexed.setAttribute("position", new THREE.BufferAttribute(new Float32Array(mesh.vertices), 3));
      indexed.setIndex(new THREE.BufferAttribute(mesh.indices.slice(), 1));
      return indexed;
    };
    const threeMs = timed(() => threeCreasedNormals(geometry(), Math.PI / 6));
    const oursMs = timed(() => toCreasedNormals(geometry(), Math.PI / 6));
    process.stdout.write(`${JSON.stringify({ ...over, triangles: mesh.triangleCount, buildMs, threeMs, oursMs })}\n`);
  }
});
