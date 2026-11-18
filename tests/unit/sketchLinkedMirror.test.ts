import { describe, expect, it } from "vitest";
import { linkedMirrorSketchSelection } from "@/lib/sketchLinkedMirror";
import { mirrorSketchSelection, SKETCH_MIRROR_VERTICAL } from "@/lib/sketchMirror";
import { applySketchConstraints, sketchConstraintRelationships, removeSketchConstraintRelationship, validSketchConstraints } from "@/lib/sketchConstraints";
import { cloneSketchProfile } from "@/lib/sketchSmoothHandles";
import type { SketchProfile } from "@/types/layerling";

const source = (): SketchProfile => ({points:[{id:"a",x:10,z:10},{id:"b",x:20,z:30},{id:"u",x:0,z:-50},{id:"v",x:0,z:50}],
  segments:[{id:"source",startId:"a",endId:"b"},{id:"axis",startId:"u",endId:"v",construction:true}]});
const selected={kind:"segment" as const,id:"source"};
const factory=()=>{let id=0;return(prefix:string)=>`${prefix}-${++id}`;};
function linked(profile=source(), across: "vertical" | "horizontal" | {segmentId:string}={segmentId:"axis"}) {
  const result=linkedMirrorSketchSelection(profile,selected,across,factory());expect(result.ok).toBe(true);
  if(!result.ok)throw Error(result.message);return result;
}
function solve(profile:SketchProfile,moved=new Set<string>()) {
  const result=applySketchConstraints(profile,moved);expect(result.ok).toBe(true);if(!result.ok)throw Error(JSON.stringify(result.failure));return result.profile;
}
const at=(p:SketchProfile,id:string)=>p.points.find(p=>p.id===id)!;
function expectReflected(profile:SketchProfile) {
  const rule=profile.constraints!.find(r=>r.kind==="symmetry")!;if(rule.kind!=="symmetry")throw Error("Missing symmetry");
  const a=at(profile,rule.axis[0]),b=at(profile,rule.axis[1]);const length=Math.hypot(b.x-a.x,b.z-a.z);
  for(const [pId,qId] of [[rule.a,rule.b],...(rule.pair?[rule.pair]:[])]){
    const p=at(profile,pId),q=at(profile,qId),nx=-(b.z-a.z)/length,nz=(b.x-a.x)/length,d=(p.x-a.x)*nx+(p.z-a.z)*nz;
    expect(q.x).toBeCloseTo(p.x-2*d*nx,4);expect(q.z).toBeCloseTo(p.z-2*d*nz,4);
  }
}

describe("optional associative Mirror",()=>{
  it("preserves independent Mirror behavior by default",()=>{
    const result=mirrorSketchSelection(source(),selected,SKETCH_MIRROR_VERTICAL,factory())!;
    expect(result.profile.constraints).toBeUndefined();expect(result.profile.points).toHaveLength(6);
  });
  it("creates one coherent segment symmetry with persisted correspondence",()=>{
    const result=linked();expect(result.profile.constraints).toHaveLength(1);expect(validSketchConstraints(result.profile)).toHaveLength(1);
    expectReflected(solve(result.profile));expect(result.profile.segments).toHaveLength(3);
  });
  it.each(["original","copy"])("updates in both directions when %s moves",side=>{
    const result=linked();let profile=solve(result.profile);at(profile,"u").locked=true;at(profile,"v").locked=true;
    const id=side==="original"?"a":result.pointIds[0];at(profile,id).x+=12;at(profile,id).z+=7;
    const desired={...at(profile,id)};profile=solve(profile,new Set([id]));expectReflected(profile);expect(at(profile,id)).toEqual(desired);
  });
  it.each(["a","copy"])("keeps an unheld origin axis steady during a normal %s drag",side=>{
    const result=linked(source(),"vertical"),profile=result.profile;
    const rule=profile.constraints![0];if(rule.kind!=="symmetry")throw Error("Missing symmetry");
    const axis=rule.axis.map(id=>({...at(profile,id)}));
    const id=side==="copy"?result.pointIds[0]:side;at(profile,id).x+=12;
    const solved=solve(profile,new Set([id]));expectReflected(solved);expect(rule.axis.map(id=>at(solved,id))).toEqual(axis);
  });
  it("follows axis movement and rotation",()=>{
    let profile=linked().profile;at(profile,"u").x=15;at(profile,"v").x=35;
    profile=solve(profile,new Set(["u","v"]));expectReflected(profile);
  });
  it.each(["vertical","horizontal"] as const)("persists an editable construction axis for %s mirrors",axis=>{
    const result=linked(source(),axis);expectReflected(solve(result.profile));
    const rule=result.profile.constraints![0];if(rule.kind!=="symmetry")throw Error("Missing symmetry");
    expect(result.profile.segments.some(s=>s.construction && s.startId===rule.axis[0] && s.endId===rule.axis[1])).toBe(true);
    expect(at(result.profile,rule.axis[0]).locked).not.toBe(true);
  });
  it("supports individual points",()=>{
    const result=linkedMirrorSketchSelection(source(),{kind:"point",id:"a"},{segmentId:"axis"},factory());
    expect(result.ok).toBe(true);if(!result.ok)return;expect(result.profile.constraints).toHaveLength(1);expectReflected(solve(result.profile));
  });
  it("keeps a shared on-axis endpoint on the axis without duplicate point equations",()=>{
    const profile=source();at(profile,"a").x=0;const result=linked(profile);expect(result.pointIds).toHaveLength(1);
    expect(result.profile.constraints?.map(r=>r.kind).sort()).toEqual(["point-on-line","symmetry"]);
    expect(validSketchConstraints(result.profile)).toHaveLength(2);expectReflected(solve(result.profile));
  });
  it("does not duplicate equations at shared polyline vertices",()=>{
    const profile=source();profile.points.push({id:"c",x:40,z:10});profile.segments.push({id:"second",startId:"b",endId:"c"});
    const result=linkedMirrorSketchSelection(profile,{kind:"multiple",pointIds:[],segmentIds:["source","second"]},{segmentId:"axis"},factory());
    expect(result.ok).toBe(true);if(!result.ok)return;
    expect(result.profile.constraints).toHaveLength(2);expect(validSketchConstraints(result.profile)).toHaveLength(2);
    const relationships=sketchConstraintRelationships(result.profile);expect(relationships).toHaveLength(1);expect(relationships[0].members).toHaveLength(2);
    const legacy={...result.profile,constraints:result.profile.constraints!.map(({relationshipId,...rule})=>rule)};
    expect(sketchConstraintRelationships(legacy)).toHaveLength(1);
    const detached=removeSketchConstraintRelationship(result.profile,result.profile.constraints![1].id);
    expect(detached.constraints).toEqual([]);expect(detached.points).toEqual(result.profile.points);expect(detached.segments).toEqual(result.profile.segments);
    expectReflected(solve(result.profile));
  });
  it("detaches by removing constraints without deleting either geometry, with independent history snapshots",()=>{
    const before=cloneSketchProfile(source()),after=cloneSketchProfile(linked().profile);
    const detached=solve({...after,constraints:[]});expect(detached.points).toEqual(after.points);expect(detached.segments).toEqual(after.segments);
    expect(before.points).toHaveLength(4);expectReflected(solve(cloneSketchProfile(after)));
    const redo=cloneSketchProfile(detached);expect(redo.constraints).toEqual([]);
  });
  it("keeps independent mirror operations separate even with the same source and axis",()=>{
    const profile=source();let id=0;const next=(prefix:string)=>`${prefix}-${++id}`;
    const first=linkedMirrorSketchSelection(profile,selected,{segmentId:"axis"},next);if(!first.ok)throw Error(first.message);
    const second=linkedMirrorSketchSelection(first.profile,selected,{segmentId:"axis"},next);if(!second.ok)throw Error(second.message);
    expect(sketchConstraintRelationships(second.profile)).toHaveLength(2);
    const removed=removeSketchConstraintRelationship(second.profile,first.profile.constraints![0].id);
    expect(removed.constraints).toHaveLength(1);expect(removed.points).toEqual(second.profile.points);
  });
  it("rejects curves, derived geometry, and invalid axes without partial changes",()=>{
    const profile=source(),before=structuredClone(profile);profile.segments[0].kind="bezier";
    expect(linkedMirrorSketchSelection(profile,selected,{segmentId:"axis"},factory()).ok).toBe(false);
    profile.segments[0].kind=undefined;
    expect(linkedMirrorSketchSelection(profile,selected,{segmentId:"missing"},factory()).ok).toBe(false);
    profile.offsets=[{id:"off",sourceSegmentIds:[],pointIds:["a","b"],segmentIds:["source"],distance:2,join:"miter",miterLimit:4}];
    expect(linkedMirrorSketchSelection(profile,selected,{segmentId:"axis"},factory()).ok).toBe(false);
    delete profile.offsets;expect(profile).toEqual(before);
  });
});
