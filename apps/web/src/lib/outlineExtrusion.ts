import * as THREE from "three";
import { toCreasedNormals } from "@/lib/creasedNormals";

export type OutlinePoint = { x: number; y: number };

/**
 * A closed, watertight body from an outline seen from above, raised from 0 to `height`: the first loop
 * is the outline (x along the width, y along the depth), any further loops are holes through it.
 */
export function extrudeOutlineGeometry(loops: OutlinePoint[][], height: number): THREE.BufferGeometry {
  const safeHeight = Math.max(0.01, height);
  const all = loops.flat();
  const count = all.length;
  const positions: number[] = [];
  all.forEach((p) => positions.push(p.x, 0, p.y));
  all.forEach((p) => positions.push(p.x, safeHeight, p.y));
  const indices: number[] = [];

  const contour = loops[0].map((p) => new THREE.Vector2(p.x, p.y));
  const holes = loops.slice(1).map((loop) => loop.map((p) => new THREE.Vector2(p.x, p.y)));
  THREE.ShapeUtils.triangulateShape(contour, holes).forEach(([a, b, c]) => {
    const pa = all[a];
    const pb = all[b];
    const pc = all[c];
    const cross = (pb.x - pa.x) * (pc.y - pa.y) - (pb.y - pa.y) * (pc.x - pa.x);
    if (cross > 0) {
      indices.push(a, b, c);
      indices.push(count + a, count + c, count + b);
    } else {
      indices.push(a, c, b);
      indices.push(count + a, count + b, count + c);
    }
  });

  let offset = 0;
  loops.forEach((loop, loopIndex) => {
    const n = loop.length;
    const clockwise = THREE.ShapeUtils.isClockWise(loop.map((p) => new THREE.Vector2(p.x, p.y)));
    // A hole's wall faces into the hole: the other way round from an outline turning the same way.
    const asOutline = loopIndex === 0 ? clockwise : !clockwise;
    for (let i = 0; i < n; i += 1) {
      const b0 = offset + i;
      const b1 = offset + ((i + 1) % n);
      const t0 = count + b0;
      const t1 = count + b1;
      if (asOutline) {
        indices.push(b0, b1, t1, b0, t1, t0);
      } else {
        indices.push(b0, t1, b1, b0, t0, t1);
      }
    }
    offset += n;
  });

  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  indexed.setIndex(indices);
  const geometry = toCreasedNormals(indexed, THREE.MathUtils.degToRad(30));
  indexed.dispose();
  geometry.computeBoundingBox();
  return geometry;
}
