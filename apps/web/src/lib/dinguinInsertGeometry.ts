import * as THREE from "three";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { placementPatchForNewShape } from "@/lib/placementWorkplane";
import { canonicalizeShape, withHoleMode } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";
import { isRoundWallFace, type HolePatternFace, type PerforableFace } from "@/lib/holePatternShapes";
import { checkDinguinThreadInsert, type DinguinInsertSpec } from "@/lib/dinguinThreadInsertSafety";

// The origin of the face workplane is the actual point chosen by the user.
// No bounding-box-only fit: every edge loop (including openings) is checked.
function inside(loops: PerforableFace["outline"]["loops"], u: number, v: number) {
  let hit = false;
  for (const poly of loops) for (let i=0,j=poly.length-1;i<poly.length;j=i++) {
    const a=poly[i], b=poly[j];
    if ((a.v>v)!==(b.v>v) && u<(b.u-a.u)*(v-a.v)/(b.v-a.v)+a.u) hit=!hit;
  }
  return hit;
}
function edgeDistance(face: PerforableFace) {
  const loops=face.outline.loops;
  if (!inside(loops,0,0)) return -1;
  let closest=Infinity;
  for (const loop of loops) for (let i=0;i<loop.length;i++) {
    const a=loop[i], b=loop[(i+1)%loop.length];
    const du=b.u-a.u, dv=b.v-a.v;
    const t=Math.max(0,Math.min(1,-(a.u*du+a.v*dv)/(du*du+dv*dv||1)));
    closest=Math.min(closest,Math.hypot(a.u+t*du,a.v+t*dv));
  }
  return Number.isFinite(closest)?closest:-1;
}
function depthAt(face: PerforableFace, u: number, v: number) {
  if (!face.body) return null;
  const w=face.workplane;
  const origin=new THREE.Vector3(w.origin.x,w.origin.y,w.origin.z)
    .addScaledVector(new THREE.Vector3(w.xAxis.x,w.xAxis.y,w.xAxis.z),u)
    .addScaledVector(new THREE.Vector3(w.zAxis.x,w.zAxis.y,w.zAxis.z),v);
  const n=new THREE.Vector3(w.normal.x,w.normal.y,w.normal.z).normalize();
  // Start just inside the face to avoid measuring its own front triangles.
  const ray=new THREE.Ray(origin.clone().addScaledVector(n,-0.0005),n.clone().negate());
  const p=face.body; let nearest=Infinity;
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),intersection=new THREE.Vector3();
  for (let i=0;i+8<p.length;i+=9) {
    a.set(p[i],p[i+1],p[i+2]); b.set(p[i+3],p[i+4],p[i+5]); c.set(p[i+6],p[i+7],p[i+8]);
    const hit=ray.intersectTriangle(a,b,c,false,intersection);
    if (hit) {
      const d=hit.distanceTo(origin);
      if (d>0.001 && d<nearest) nearest=d;
    }
  }
  return Number.isFinite(nearest)?nearest:null;
}
export type DinguinInsertFace = HolePatternFace;

/** Cylinder/radial wall check: finite-radius envelope, rim distance and actual back wall.
 * This handles cylindrical walls only; other curved meshes fail closed at face read. */
function measureRoundDinguinInsert(face: Extract<HolePatternFace, {round: unknown}>, spec: DinguinInsertSpec) {
  const wall = face.round;
  const reqRadius = spec.d3 / 2 + spec.W;
  const r = spec.d3 / 2;
  const origin = new THREE.Vector3(face.workplane.origin.x, face.workplane.origin.y, face.workplane.origin.z);
  const axis = new THREE.Vector3(wall.axis.x, wall.axis.y, wall.axis.z).normalize();
  const ref = new THREE.Vector3(wall.reference.x, wall.reference.y, wall.reference.z).normalize();
  const around = new THREE.Vector3(wall.around.x, wall.around.y, wall.around.z).normalize();
  const rel = origin.clone().sub(new THREE.Vector3(wall.axisPoint.x,wall.axisPoint.y,wall.axisPoint.z));
  const angle = Math.atan2(rel.dot(around), rel.dot(ref));
  const v0=rel.dot(axis), u0=angle*wall.radius;
  const candidates = [u0,u0+wall.outline.circumference,u0-wall.outline.circumference];
  // A cylindrical wall is flattened in (u,v) for rim and opening checks.
  const nearEdge = (u:number,v:number) => {
    let distance=Infinity;
    for(const [a,b] of wall.outline.edges) {
      const du=b.u-a.u,dv=b.v-a.v,denom=du*du+dv*dv;
      for(const offset of (wall.outline.closed?[-wall.outline.circumference,0,wall.outline.circumference]:[0])) {
        const au=a.u+offset;
        const t=denom>0?Math.max(0,Math.min(1,((u-au)*du+(v-a.v)*dv)/denom)):0;
        distance=Math.min(distance,Math.hypot(u-(au+t*du),v-(a.v+t*dv)));
      }
    }
    return distance;
  };
  const edge = Math.min(...candidates.map(u=>nearEdge(u,v0)));
  // Need both a large-enough cylinder and enough material beyond the entire hole footprint.
  const shellMargin = wall.radius - reqRadius;
  const edgeDistance = Math.min(edge, wall.radius);
  const n = new THREE.Vector3(face.workplane.normal.x,face.workplane.normal.y,face.workplane.normal.z).normalize();
  const tangent = new THREE.Vector3(face.workplane.xAxis.x,face.workplane.xAxis.y,face.workplane.xAxis.z).normalize();
  const vertical = new THREE.Vector3(face.workplane.zAxis.x,face.workplane.zAxis.y,face.workplane.zAxis.z).normalize();
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),intersection=new THREE.Vector3();
  const nearestOther = (start:THREE.Vector3) => {
    let nearest=Infinity;
    const ray=new THREE.Ray(start.clone().addScaledVector(n,-0.001),n.clone().negate());
    const p=wall.others;
    for(let i=0;i+8<p.length;i+=9) {
      a.set(p[i],p[i+1],p[i+2]);b.set(p[i+3],p[i+4],p[i+5]);c.set(p[i+6],p[i+7],p[i+8]);
      const hit=ray.intersectTriangle(a,b,c,false,intersection);
      if(hit) { const d=hit.distanceTo(start);if(d>0.002&&d<nearest) nearest=d; }
    }
    return nearest;
  };
  let available=Infinity;
  if (!wall.outside || shellMargin < 0) available=0;
  if (Number.isFinite(available)) { /* unsupported inner wall / insufficient cylinder radius */ }
  else for (const radial of [0,r*.5,r*.98]) {
    const steps=radial===0?1:32;
    for(let j=0;j<steps;j++) {
      const phi=2*Math.PI*j/steps;
      const u=radial*Math.cos(phi),v=radial*Math.sin(phi);
      // A cylinder's front recedes under the tangent plane: chord depth is conservative.
      if (Math.abs(u)>=wall.radius) {available=0;break;}
      const localFront=wall.radius-Math.sqrt(wall.radius*wall.radius-u*u);
      const chord=2*Math.sqrt(wall.radius*wall.radius-u*u);
      const localSurface=origin.clone().addScaledVector(tangent,u).addScaledVector(vertical,v).addScaledVector(n,-localFront);
      const other=nearestOther(localSurface);
      const thickness=Math.min(chord,other);
      available=Math.min(available,thickness);
    }
    if(available===0) break;
  }
  const materialDepth=Number.isFinite(available)?available:0;
  const checked=checkDinguinThreadInsert(spec,{edgeDistance:Number.isFinite(edgeDistance)?edgeDistance:0,materialDepth});
  // Sampling is a preview gate, not a formal proof of watertight printable geometry.
  return {...checked,edgeDistance:Number.isFinite(edgeDistance)?edgeDistance:0,materialDepth};
}

export function measureDinguinInsert(face: DinguinInsertFace, spec: DinguinInsertSpec) {
  if(isRoundWallFace(face)) return measureRoundDinguinInsert(face,spec);
  const distance=edgeDistance(face);
  const r=spec.d3/2;
  // Centre + two rings: reject any thin spot sampled under the bore footprint.
  // This is conservative sampling, not a mathematically exhaustive mesh clearance proof.
  const sites:[[number,number], ...[number,number][]]=[[0,0]];
  for (const radius of [r*0.5,r*0.98]) for (let k=0;k<16;k++) {
    const theta=k*Math.PI/8;
    sites.push([radius*Math.cos(theta),radius*Math.sin(theta)]);
  }
  let available=Infinity;
  for (const [u,v] of sites) {
    const depth=depthAt(face,u,v);
    if (depth===null) {available=0;break;}
    available=Math.min(available,depth);
  }
  const materialDepth=Number.isFinite(available)?available:0;
  return { ...checkDinguinThreadInsert(spec,{edgeDistance:distance,materialDepth}),edgeDistance:distance, materialDepth };
}

export function makeDinguinInsertHole(face: DinguinInsertFace, spec: DinguinInsertSpec): WorkplaneShape {
  const asset=toolbarShapeAssets.find(item=>item.kind==="cylinder");
  if (!asset) throw new Error("Zylinder-Grundform nicht gefunden");
  const w=face.workplane;
  const normal=new THREE.Vector3(w.normal.x,w.normal.y,w.normal.z).normalize();
  // Cut ends at L inside the body, with 0.2 mm overlap outside the surface.
  const base=new THREE.Vector3(w.origin.x,w.origin.y,w.origin.z).addScaledVector(normal,-spec.L);
  const h=spec.L+0.2;
  const created=makeShapeFromAsset({...asset,name:`Gewindebohrung ${spec.name}`},{x:0,z:0,elevation:0},{width:spec.d3,depth:spec.d3,height:h});
  const sized={...created,width:spec.d3,depth:spec.d3,size:spec.d3,height:h};
  return canonicalizeShape(withHoleMode({...sized,...placementPatchForNewShape(sized,w,base)},true));
}


/** Purple reference mark for the selected surface, never part of the export mesh.
 * On planar faces use the midpoint of the surface UV extents, but only when it
 * belongs to actual material (including the exclusion of existing openings).
 * On recognized cylinders keep the picked angular location and use mid-height.
 */
export function dinguinSurfaceCenter(face: DinguinInsertFace): { point: {x:number;y:number;z:number}; normal: {x:number;y:number;z:number} } | null {
  const w=face.workplane;
  if(isRoundWallFace(face)) {
    const values=face.round.outline.edges.flatMap(([a,b])=>[a.v,b.v]);
    if(values.length===0 || values.some(v=>!Number.isFinite(v))) return null;
    const lo=Math.min(...values),hi=Math.max(...values);
    if(!(hi>lo)) return null;
    const axis=face.round.axis;
    const p=face.round.axisPoint;
    const o=w.origin;
    const currentV=(o.x-p.x)*axis.x+(o.y-p.y)*axis.y+(o.z-p.z)*axis.z;
    const shift=(lo+hi)/2-currentV;
    return {point:{x:o.x+axis.x*shift,y:o.y+axis.y*shift,z:o.z+axis.z*shift},normal:{...w.normal}};
  }
  const loops=face.outline.loops;
  const pts=loops.flat();
  if(pts.length<3) return null;
  const minU=Math.min(...pts.map(p=>p.u)),maxU=Math.max(...pts.map(p=>p.u));
  const minV=Math.min(...pts.map(p=>p.v)),maxV=Math.max(...pts.map(p=>p.v));
  const u=(minU+maxU)/2,v=(minV+maxV)/2;
  if(![u,v].every(Number.isFinite) || !inside(loops,u,v)) return null;
  return {point:{
    x:w.origin.x+w.xAxis.x*u+w.zAxis.x*v,
    y:w.origin.y+w.xAxis.y*u+w.zAxis.y*v,
    z:w.origin.z+w.xAxis.z*u+w.zAxis.z*v,
  },normal:{...w.normal}};
}
