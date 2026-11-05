import * as THREE from "three";
import { toCreasedNormals } from "@/lib/creasedNormals";

/*
 * A small builder for the enclosure parts' closed meshes (screw boss, snap-fit, rib): points shared by index, so
 * neighbouring faces meet edge for edge, and the result turned outward as a whole by its volume.
 */
export class IndexedMesh {
  positions: number[] = [];
  indices: number[] = [];

  point(x: number, y: number, z: number) {
    this.positions.push(x, y, z);
    return this.positions.length / 3 - 1;
  }

  tri(a: number, b: number, c: number) {
    if (a === b || b === c || c === a) return;
    this.indices.push(a, b, c);
  }

  /** A quad a-b-c-d, its corners in turn. */
  quad(a: number, b: number, c: number, d: number) {
    this.tri(a, b, c);
    this.tri(a, c, d);
  }

  /** Signed volume: positive when the faces point outward. */
  volume() {
    const p = this.positions, I = this.indices;
    let sum = 0;
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
      sum += (p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c])) / 6;
    }
    return sum;
  }

  /**
   * Every face turned the way of its neighbours (over each shared edge the two run opposite ways), then the whole
   * outward by its volume. The builders only have to get the faces' points right, not each one's turn.
   */
  orient() {
    const I = this.indices;
    const T = I.length / 3;
    const byEdge = new Map<string, number[]>();
    const key = (a: number, b: number) => (a < b ? `${a},${b}` : `${b},${a}`);
    for (let f = 0; f < T; f += 1) for (let e = 0; e < 3; e += 1) {
      const k = key(I[f * 3 + e], I[f * 3 + ((e + 1) % 3)]);
      const list = byEdge.get(k);
      if (list) list.push(f);
      else byEdge.set(k, [f]);
    }
    const runs = (f: number, a: number, b: number) => {
      for (let e = 0; e < 3; e += 1) if (I[f * 3 + e] === a && I[f * 3 + ((e + 1) % 3)] === b) return true;
      return false;
    };
    const flip = (f: number) => {
      [I[f * 3 + 1], I[f * 3 + 2]] = [I[f * 3 + 2], I[f * 3 + 1]];
    };
    const p = this.positions;
    const faceVolume = (f: number) => {
      const a = I[f * 3] * 3, b = I[f * 3 + 1] * 3, c = I[f * 3 + 2] * 3;
      return (p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c])) / 6;
    };
    const done = new Uint8Array(T);
    for (let start = 0; start < T; start += 1) {
      if (done[start]) continue;
      done[start] = 1;
      const queue = [start];
      const part = [start];
      while (queue.length) {
        const f = queue.pop()!;
        for (let e = 0; e < 3; e += 1) {
          const a = I[f * 3 + e], b = I[f * 3 + ((e + 1) % 3)];
          for (const g of byEdge.get(key(a, b)) ?? []) {
            if (g === f || done[g]) continue;
            // A neighbour that runs this edge the same way is turned over.
            if (runs(g, a, b)) flip(g);
            done[g] = 1;
            queue.push(g);
            part.push(g);
          }
        }
      }
      // Each separate part (a snap-fit's hook and its catch) outward on its own.
      if (part.reduce((sum, f) => sum + faceVolume(f), 0) < 0) part.forEach(flip);
    }
    return this;
  }

  /** Turned outward, with creased normals (sharp edges stay sharp, round walls smooth). */
  geometry(creaseDegrees = 30) {
    this.orient();
    if (this.volume() < 0) {
      for (let t = 0; t < this.indices.length; t += 3) [this.indices[t + 1], this.indices[t + 2]] = [this.indices[t + 2], this.indices[t + 1]];
    }
    const indexed = new THREE.BufferGeometry();
    indexed.setAttribute("position", new THREE.Float32BufferAttribute(this.positions, 3));
    indexed.setIndex(this.indices);
    const geometry = toCreasedNormals(indexed, THREE.MathUtils.degToRad(creaseDegrees));
    indexed.dispose();
    geometry.computeBoundingBox();
    return geometry;
  }
}

/**
 * A point of a profile: across (`u`) and up (`v`). `arc` marks a point the outline reaches along a circle: the mesh
 * runs straight from point to point, the exact body (enclosureSolid.ts) draws the true arc through them.
 */
export type ProfilePoint = { u: number; v: number; arc?: ProfileArc };
export type ProfileArc = { center: { u: number; v: number }; radius: number };

/**
 * A closed outline pushed straight along x from -length/2 to length/2: `u` becomes z, `v` becomes y. Every outline
 * point is a corner; the two end faces are triangulated, the sides are quads.
 */
export function addPrismAlongX(mesh: IndexedMesh, outline: ProfilePoint[], length: number) {
  const n = outline.length;
  const half = length / 2;
  const left = outline.map((p) => mesh.point(-half, p.v, p.u));
  const right = outline.map((p) => mesh.point(half, p.v, p.u));
  const flat = outline.map((p) => new THREE.Vector2(p.u, p.v));
  const clockwise = THREE.ShapeUtils.isClockWise(flat);
  THREE.ShapeUtils.triangulateShape(flat, []).forEach(([a, b, c]) => {
    if (clockwise) {
      mesh.tri(left[a], left[b], left[c]);
      mesh.tri(right[a], right[c], right[b]);
    } else {
      mesh.tri(left[a], left[c], left[b]);
      mesh.tri(right[a], right[b], right[c]);
    }
  });
  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n;
    if (clockwise) mesh.quad(left[i], right[i], right[j], left[j]);
    else mesh.quad(left[i], left[j], right[j], right[i]);
  }
}

/**
 * Points along a circle from `from` to `to` (both included), the centre given, `steps` pieces. Every point after the
 * first is marked as reached along the arc; the first is where the arc starts.
 */
export function arcPoints(center: ProfilePoint, radius: number, fromAngle: number, toAngle: number, steps: number): ProfilePoint[] {
  const out: ProfilePoint[] = [];
  const arc: ProfileArc = { center: { u: center.u, v: center.v }, radius };
  for (let k = 0; k <= steps; k += 1) {
    const a = fromAngle + ((toAngle - fromAngle) * k) / steps;
    out.push(k === 0 ? { u: center.u + radius * Math.cos(a), v: center.v + radius * Math.sin(a) } : { u: center.u + radius * Math.cos(a), v: center.v + radius * Math.sin(a), arc });
  }
  return out;
}
