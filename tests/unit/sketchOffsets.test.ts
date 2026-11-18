import { describe, expect, it } from "vitest";
import { offsetGeometryProfile, removeSketchOffset, sketchOffsetGeometry, updateSketchOffsets } from "@/lib/sketchOffsets";
import { applySketchConstraints } from "@/lib/sketchConstraints";
import { cloneSketchProfile } from "@/lib/sketchSmoothHandles";
import { sketchPrimitiveGeometry } from "@/lib/sketchPrimitives";
import type { SketchOffset, SketchProfile } from "@/types/layerling";

function path(coords: number[][], closed = true): SketchProfile {
  const points = coords.map(([x,z], i) => ({ id: `p${i}`, x, z }));
  return { points, segments: points.slice(0, closed ? undefined : -1).map((p,i) => ({ id: `s${i}`, startId: p.id, endId: points[(i+1)%points.length].id, kind: "line" })) };
}
const rectangle = () => path([[0,0],[100,0],[100,60],[0,60]]);
const feature = (source: SketchProfile, distance = 5, id = "offset"): SketchOffset => ({ id, sourceSegmentIds: source.segments.map(s=>s.id), pointIds: [], segmentIds: [], distance, join: "miter", miterLimit: 4 });
function linked(source = rectangle(), distance = 5) {
  const result = updateSketchOffsets({ ...source, offsets: [feature(source,distance)] });
  if (!result.ok) throw Error(result.message);
  return result.profile;
}
const bounds = (points: {x:number;z:number}[]) => [Math.min(...points.map(p=>p.x)),Math.min(...points.map(p=>p.z)),Math.max(...points.map(p=>p.x)),Math.max(...points.map(p=>p.z))];

describe("sketch offsets", () => {
  it("offsets closed profiles outward and inward independent of winding", () => {
    for (const source of [rectangle(),path([[0,60],[100,60],[100,0],[0,0]])]) {
      expect(bounds(sketchOffsetGeometry(source,source.segments.map(s=>s.id),5).points)).toEqual([-5,-5,105,65]);
      expect(bounds(sketchOffsetGeometry(source,source.segments.map(s=>s.id),-5).points)).toEqual([5,5,95,55]);
    }
  });
  it("maintains perpendicular distance for diagonal open lines on both sides", () => {
    const source=path([[0,0],[10,10]],false);
    for (const distance of [3,-3]) {
      const result=sketchOffsetGeometry(source,["s0"],distance);
      expect(result.closed).toBe(false);
      expect((result.points[0].z-result.points[0].x)/Math.sqrt(2)).toBeCloseTo(distance);
      expect(Math.hypot(result.points[1].x-result.points[0].x,result.points[1].z-result.points[0].z)).toBeCloseTo(Math.sqrt(200));
    }
  });
  it("joins open chains continuously", () => {
    const source=path([[0,0],[10,0],[10,10]],false);
    expect(sketchOffsetGeometry(source,["s0","s1"],2).points).toEqual(expect.arrayContaining([expect.objectContaining({x:8,z:2})]));
  });
  it("supports miter, bevel and cubic round corners", () => {
    const source=rectangle(),ids=source.segments.map(s=>s.id);
    expect(sketchOffsetGeometry(source,ids,5,"miter").points).toHaveLength(4);
    expect(sketchOffsetGeometry(source,ids,5,"bevel").points).toHaveLength(8);
    const round=sketchOffsetGeometry(source,ids,5,"round");
    expect(round.points).toHaveLength(8);
    expect(round.kinds.filter(k=>k==="bezier")).toHaveLength(4);
    expect(round.points.some(p=>p.handleOut)).toBe(true);
    expect(()=>sketchOffsetGeometry(source,ids,5,"miter",1)).toThrow(/miter limit/);
  });
  it("supports safe concave profiles and rejects collapsed insets", () => {
    const source=path([[0,0],[20,0],[20,10],[10,10],[10,20],[0,20]]);
    expect(sketchOffsetGeometry(source,source.segments.map(s=>s.id),1).points).toHaveLength(6);
    expect(()=>sketchOffsetGeometry(rectangle(),["s0","s1","s2","s3"],-31)).toThrow(/collaps/);
  });
  it("rejects crossing, disconnected and degenerate sources", () => {
    const bow=path([[0,0],[10,10],[0,10],[10,0]]);
    expect(()=>sketchOffsetGeometry(bow,bow.segments.map(s=>s.id),1)).toThrow(/intersects/);
    expect(()=>sketchOffsetGeometry(rectangle(),["s0","s2"],1)).toThrow(/connected/);
    const zero=path([[0,0],[0,0]],false);
    expect(()=>sketchOffsetGeometry(zero,["s0"],1)).toThrow(/zero length/);
    expect(()=>sketchOffsetGeometry(rectangle(),["s0"],0)).toThrow(/nonzero/);
    const curve=path([[0,0],[10,0]],false);curve.segments[0].kind="bezier";
    expect(sketchOffsetGeometry(curve,["s0"],1).points.every(p=>p.z===1)).toBe(true);
  });
  it("offsets circles analytically and rejects a nonpositive radius", () => {
    let n=0;const source=sketchPrimitiveGeometry("circle",{x:4,z:8},()=>`c${++n}`,20);
    const ids=source.segments.map(s=>s.id);
    const outer=sketchOffsetGeometry(source,ids,3);
    expect(bounds(outer.points)).toEqual([-9,-5,17,21]);
    expect(outer.kinds).toEqual(["bezier","bezier","bezier","bezier"]);
    expect(()=>sketchOffsetGeometry(source,ids,-10)).toThrow(/collapses the circle/);
    expect(offsetGeometryProfile(feature(source),outer).points[0].handleIn).toBeDefined();
  });
  it("regenerates after source edits with stable derived identifiers", () => {
    const initial=linked();
    const changed={...initial,points:initial.points.map(p=>p.id==="p1"||p.id==="p2"?{...p,x:120}:p)};
    const result=applySketchConstraints(changed,new Set(["p1","p2"]));
    expect(result.ok).toBe(true);
    if(!result.ok)return;
    expect(result.profile.offsets![0].pointIds).toEqual(initial.offsets![0].pointIds);
    expect(bounds(result.profile.points.filter(p=>p.id.startsWith("offset-")))).toEqual([-5,-5,125,65]);
  });
  it("follows source diameter constraints and supports distance edits", () => {
    let n=0; const source=sketchPrimitiveGeometry("circle",{x:0,z:0},()=>`c${++n}`,20);
    const initial=linked(source,3);
    const outline=source.points.map(p=>p.id);
    const resized=applySketchConstraints({...initial,constraints:[{id:"diameter",kind:"circle-diameter",a:outline[0],b:outline[2],outline,value:30}]});
    expect(resized.ok).toBe(true);if(!resized.ok)return;
    expect(bounds(resized.profile.points.filter(p=>p.id.startsWith("offset-")))).toEqual([-18,-18,18,18]);
    const edited=updateSketchOffsets({...resized.profile,offsets:resized.profile.offsets!.map(f=>({...f,distance:-2}))});
    expect(edited.ok).toBe(true);if(edited.ok)expect(bounds(edited.profile.points.filter(p=>p.id.startsWith("offset-")))).toEqual([-13,-13,13,13]);
  });
  it("rejects partial deletion of a linked target", () => {
    const initial=linked();
    const changed={...initial,segments:initial.segments.filter(s=>s.id!==initial.offsets![0].segmentIds[0])};
    const result=updateSketchOffsets(changed);
    expect(result.ok).toBe(false);if(!result.ok)expect(result.message).toMatch(/deleted in parts/);
  });
  it("accepts new constraints on an offset source and regenerates its boundary", () => {
    const initial=linked();
    const result=applySketchConstraints({...initial,constraints:[
      {id:"h0",kind:"horizontal",a:"p0",b:"p1"},
      {id:"h1",kind:"horizontal",a:"p2",b:"p3"},
      {id:"v0",kind:"vertical",a:"p1",b:"p2"},
      {id:"v1",kind:"vertical",a:"p3",b:"p0"},
      {id:"width",kind:"distance",a:"p0",b:"p1",value:120},
    ]});
    expect(result.ok, JSON.stringify(!result.ok && result.failure)).toBe(true);if(!result.ok)return;
    expect(result.profile.constraints).toHaveLength(5);
    const points=result.profile.points.filter(p=>p.id.startsWith("offset-"));
    const box=bounds(points);expect(box[2]-box[0]).toBeCloseTo(130,2);
    expect(result.profile.offsets![0].distance).toBe(5);
    expect(initial.constraints).toBeUndefined();
  });
  it("preserves explicit source locks when a new constraint cannot be satisfied", () => {
    const initial=linked();
    const locked={...initial,points:initial.points.map(p=>p.id==="p0"||p.id==="p1"?{...p,locked:true}:p),
      constraints:[{id:"width",kind:"distance" as const,a:"p0",b:"p1",value:120}]};
    const before=JSON.stringify(locked),result=applySketchConstraints(locked);
    expect(result.ok).toBe(false);expect(result.profile).toBe(locked);expect(JSON.stringify(locked)).toBe(before);
  });
  it("fails atomically without mutating the input", () => {
    const initial=linked(),before=JSON.stringify(initial);
    const invalid={...initial,offsets:initial.offsets!.map(f=>({...f,distance:-40}))};
    const result=applySketchConstraints(invalid);
    expect(result.ok).toBe(false);
    expect(result.profile).toBe(invalid);
    expect(JSON.stringify(initial)).toBe(before);
  });
  it("rejects direct derived moves and constraints with actionable feedback", () => {
    const initial=linked(),id=initial.offsets![0].pointIds[0];
    const result=applySketchConstraints(initial,new Set([id]));
    expect(result.ok).toBe(false);
    if(!result.ok)expect(result.failure.offsetError?.message).toMatch(/detach/);
    const constrained={...initial,constraints:[{id:"dimension",kind:"distance" as const,a:id,b:initial.offsets![0].pointIds[1],value:20}]};
    expect(applySketchConstraints(constrained).ok).toBe(false);
  });
  it("chains dependencies, rejects cycles and cascades source deletion", () => {
    const initial=linked();
    const child=feature({points:[],segments:initial.segments.filter(s=>s.id.startsWith("offset-"))},2,"child");
    const chain=updateSketchOffsets({...initial,offsets:[...initial.offsets!,child]});
    expect(chain.ok).toBe(true);if(!chain.ok)return;
    expect(chain.profile.offsets).toHaveLength(2);
    const cycle=updateSketchOffsets({...chain.profile,offsets:chain.profile.offsets!.map(f=>f.id==="offset"?{...f,sourceSegmentIds:chain.profile.offsets![1].segmentIds}:f)});
    expect(cycle.ok).toBe(false);
    if(!cycle.ok)expect(cycle.message).toMatch(/cycle/);
    const deleted=updateSketchOffsets({...chain.profile,segments:chain.profile.segments.filter(s=>s.id!=="s0")});
    expect(deleted.ok).toBe(true);if(deleted.ok)expect(deleted.profile.offsets).toHaveLength(0);
    expect(removeSketchOffset(chain.profile,"offset").points).toHaveLength(4);
  });
  it("detaches without changing geometry and preserves metadata through cloning/JSON", () => {
    const initial=linked(),copy=cloneSketchProfile(initial);
    expect(JSON.parse(JSON.stringify(copy)).offsets).toEqual(initial.offsets);
    copy.offsets![0].sourceSegmentIds.pop();expect(initial.offsets![0].sourceSegmentIds).toHaveLength(4);
    const detached=removeSketchOffset(initial,"offset",true);
    expect(detached.offsets).toHaveLength(0);expect(detached.points).toEqual(initial.points);expect(detached.segments).toEqual(initial.segments);
  });
});
