import { describe, expect, it } from "vitest";
import { CURVE_OFFSET_TOLERANCE } from "@/lib/sketchCurveOffsets";
import { sketchOffsetGeometry, offsetGeometryProfile, updateSketchOffsets } from "@/lib/sketchOffsets";
import { applySketchConstraints } from "@/lib/sketchConstraints";
import { sketchPrimitiveGeometry } from "@/lib/sketchPrimitives";
import { cubicPoint, curveControls } from "@/lib/sketchPaths";
import { cloneSketchProfile, orderedSketchPaths } from "@/lib/sketchSmoothHandles";
import type { SketchOffset, SketchProfile } from "@/types/layerling";
type Vec = {x:number;z:number};
function ellipse(size=62): SketchProfile {
  let n=0;return sketchPrimitiveGeometry("ellipse",{x:0,z:0},()=>`ellipse-${++n}`,size);
}
const ids=(p:SketchProfile)=>p.segments.map(s=>s.id);
const feature=(p:SketchProfile,distance=3,id="offset"):SketchOffset=>({id,sourceSegmentIds:ids(p),distance,join:"miter",miterLimit:4,pointIds:[],segmentIds:[]});
function offset(p:SketchProfile,distance:number,join:SketchOffset["join"]="miter") {
  return offsetGeometryProfile(feature(p,distance),sketchOffsetGeometry(p,ids(p),distance,join));
}
function samples(profile:SketchProfile,count=64) {
  const points:Vec[]=[];
  for(const path of orderedSketchPaths(profile)) for(const step of path.steps) {
    const {first,second}=curveControls(step);
    for(let i=0;i<count;i++) points.push(step.segment.kind==="line"||!first||!second
      ? {x:step.from.x+(step.to.x-step.from.x)*i/count,z:step.from.z+(step.to.z-step.from.z)*i/count}
      : cubicPoint(step.from,first,second,step.to,i/count));
    if(!path.closed && step===path.steps.at(-1))points.push(step.to);
  }
  return points;
}
function distance(point:Vec,path:Vec[],closed=true) {
  let best=Infinity;
  for(let i=0;i<(closed?path.length:path.length-1);i++) {
    const a=path[i],b=path[(i+1)%path.length],dx=b.x-a.x,dz=b.z-a.z;
    const t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.z-a.z)*dz)/(dx*dx+dz*dz||1)));
    best=Math.min(best,Math.hypot(point.x-a.x-t*dx,point.z-a.z-t*dz));
  }
  return best;
}
const arch=():SketchProfile=>({points:[{id:"a",x:0,z:0,handleOut:{x:0,z:20}},{id:"b",x:30,z:0,handleIn:{x:30,z:20}}],segments:[{id:"curve",kind:"bezier",startId:"a",endId:"b"}]});

describe("curved sketch offsets",()=>{
  it.each([5,-3])("keeps a constant %s mm gap around a 62 × 31 oval",d=>{
    const source=ellipse(),result=offset(source,d),sourceSamples=samples(source,1024);
    expect(result.segments.every(s=>s.kind==="bezier")).toBe(true);
    expect(result.points.length).toBeLessThan(100);
    for(const point of samples(result,12)) expect(Math.abs(distance(point,sourceSamples)-Math.abs(d))).toBeLessThan(CURVE_OFFSET_TOLERANCE);
    const points=result.points;
    expect(Math.max(...points.map(p=>p.x))).toBeCloseTo(31+d,5);
    expect(Math.min(...points.map(p=>p.z))).toBeCloseTo(-15.5-d,5);
  });
  it("handles rotated/translated ovals and reversed curve storage",()=>{
    const original=ellipse(),angle=.7;
    const turn=(p:Vec)=>({x:20+p.x*Math.cos(angle)-p.z*Math.sin(angle),z:-8+p.x*Math.sin(angle)+p.z*Math.cos(angle)});
    const source={...original,points:original.points.map(p=>({...p,...turn(p),handleIn:turn(p.handleOut!),handleOut:turn(p.handleIn!)})),segments:original.segments.map(s=>({...s,startId:s.endId,endId:s.startId}))};
    const result=offset(source,4),sourceSamples=samples(source,512);
    for(const point of samples(result,8))expect(Math.abs(distance(point,sourceSamples)-4)).toBeLessThan(CURVE_OFFSET_TOLERANCE);
  });
  it.each([2,-2])("offsets an open Bézier on side %s without closing it",d=>{
    const source=arch(),result=offset(source,d),path=orderedSketchPaths(result)[0];
    expect(path.closed).toBe(false);
    expect(result.points[0].x).toBeCloseTo(-d);
    expect(result.points.at(-1)!.x).toBeCloseTo(30+d);
    const sourceSamples=samples(source,2048);
    for(const point of samples(result,12))expect(Math.abs(distance(point,sourceSamples,false)-Math.abs(d))).toBeLessThan(CURVE_OFFSET_TOLERANCE);
  });
  it.each([2,-2])("offsets an open circular arc on side %s",d=>{
    let n=0;const circle=sketchPrimitiveGeometry("circle",{x:0,z:0},()=>`arc-${++n}`,20);
    const source={...circle,segments:[circle.segments[0]]},result=offset(source,d);
    expect(orderedSketchPaths(result)[0].closed).toBe(false);
    for(const point of samples(result,32))expect(Math.abs(Math.hypot(point.x,point.z)-(10-d))).toBeLessThan(CURVE_OFFSET_TOLERANCE);
  });
  it("supports smooth curves, mixed paths and corner joins",()=>{
    const source=arch();source.segments[0].kind="smooth";
    source.points.push({id:"c",x:40,z:-10});source.segments.push({id:"line",kind:"line",startId:"b",endId:"c"});
    for(const join of ["miter","round","bevel"] as const)for(const d of [1,-1]) {
      const result=offset(source,d,join);
      expect(orderedSketchPaths(result)).toHaveLength(1);
      expect(result.segments.some(s=>s.kind==="bezier")).toBe(true);
      expect(result.segments.some(s=>s.kind==="line")).toBe(true);
    }
  });
  it.each(["miter","round","bevel"] as const)("offsets a closed line/curve profile with %s corners",join=>{
    const source=arch();source.segments.push({id:"base",kind:"line",startId:"b",endId:"a"});
    // Existing sketch paths require at least three edges to constitute a closed profile.
    source.points.push({id:"mid",x:15,z:0});source.segments[1].endId="mid";
    source.segments.push({id:"base2",kind:"line",startId:"mid",endId:"a"});
    for(const d of [1,-1])expect(orderedSketchPaths(offset(source,d,join))[0].closed).toBe(true);
  });
  it("rejects cusps and invalid insets without changing valid geometry",()=>{
    const source=ellipse(),f=feature(source,3),linked=updateSketchOffsets({...source,offsets:[f]});
    expect(linked.ok).toBe(true);if(!linked.ok)return;
    const before=JSON.stringify(linked.profile);
    expect(()=>offset(source,-9)).toThrow(/cusp|fold/);
    const failed=applySketchConstraints({...linked.profile,offsets:[{...linked.profile.offsets![0],distance:-9}]});
    expect(failed.ok).toBe(false);
    expect(JSON.stringify(linked.profile)).toBe(before);
    const degenerate=arch();degenerate.points[0].handleOut={x:0,z:0};
    expect(()=>offset(degenerate,1)).toThrow(/tangent/);
  });
  it("keeps an inflected S curve smooth on either side",()=>{
    const source=arch();source.points[1].handleIn={x:30,z:-20};
    for(const d of [1,-1]) {
      const result=offset(source,d),sourceSamples=samples(source,4096);
      for(const point of samples(result,16))expect(Math.abs(distance(point,sourceSamples,false)-1)).toBeLessThan(CURVE_OFFSET_TOLERANCE);
    }
  });
  it("keeps a whole-path child linked when adaptive fitting changes its parent layout",()=>{
    const source=ellipse(),parent=updateSketchOffsets({...source,offsets:[feature(source,1)]});
    if(!parent.ok)throw Error(parent.message);
    const parentGeometry={points:parent.profile.points.filter(p=>parent.profile.offsets![0].pointIds.includes(p.id)),segments:parent.profile.segments.filter(s=>parent.profile.offsets![0].segmentIds.includes(s.id))};
    const chained=updateSketchOffsets({...parent.profile,offsets:[...parent.profile.offsets!,feature(parentGeometry,2,"child")]});
    if(!chained.ok)throw Error(chained.message);
    const changed=updateSketchOffsets({...chained.profile,offsets:chained.profile.offsets!.map(f=>f.id==="offset"?{...f,distance:100}:f)});
    if(!changed.ok)throw Error(changed.message);
    expect(changed.profile.offsets).toHaveLength(2);
    expect(changed.profile.offsets![0].segmentIds.length).not.toBe(parent.profile.offsets![0].segmentIds.length);
    expect(new Set(changed.profile.offsets![1].sourceSegmentIds)).toEqual(new Set(changed.profile.offsets![0].segmentIds));
  });
  it("regenerates linked curves after handle edits and preserves source geometry",()=>{
    const source=arch(),linked=updateSketchOffsets({...source,offsets:[feature(source,2)]});
    expect(linked.ok).toBe(true);if(!linked.ok)return;
    const changed={...linked.profile,points:linked.profile.points.map(p=>p.id==="a"?{...p,handleOut:{x:3,z:18}}:p)};
    const result=applySketchConstraints(changed,new Set(["a"]));
    expect(result.ok).toBe(true);if(!result.ok)return;
    expect(result.profile.points.find(p=>p.id==="a")?.handleOut).toEqual({x:3,z:18});
    expect(result.profile.points.find(p=>p.id==="offset-point-1")).not.toEqual(linked.profile.points.find(p=>p.id==="offset-point-1"));
    expect(cloneSketchProfile(result.profile).offsets).toEqual(result.profile.offsets);
  });
});
