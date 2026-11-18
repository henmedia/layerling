import { describe, expect, it } from "vitest";
import { applySketchConstraints, validSketchConstraints, withSketchConstraint, sketchConstraintReferences } from "@/lib/sketchConstraints";
import { cloneSketchProfile } from "@/lib/sketchSmoothHandles";
import { updateSketchOffsets } from "@/lib/sketchOffsets";
import { addLineIntersectionPoints } from "@/lib/sketchPointRefinement";
import { turnedSketchProfile } from "@/lib/sketchEditTurn";
import type { SketchConstraint, SketchProfile } from "@/types/layerling";

const base = (): SketchProfile => ({
  points: [{ id: "a", x: 0, z: 0 }, { id: "b", x: 100, z: 0 }, { id: "p", x: 30, z: 20 }, { id: "q", x: 80, z: 30 }],
  segments: [{ id: "line", startId: "a", endId: "b" }],
});
const relation = (kind: "midpoint" | "point-on-line"): SketchConstraint => ({ id: "r", kind, a: "a", b: "b", c: "p" });
const symmetry: SketchConstraint = { id: "s", kind: "symmetry", a: "p", b: "q", axis: ["a", "b"] };
function solve(profile: SketchProfile, moved = new Set<string>()) {
  const result = applySketchConstraints(profile, moved);
  expect(result.ok).toBe(true);
  if (!result.ok) throw Error(JSON.stringify(result.failure));
  expect(result.profile.points.every(p => Number.isFinite(p.x) && Number.isFinite(p.z))).toBe(true);
  return result.profile;
}
const point = (profile: SketchProfile, id: string) => profile.points.find(p => p.id === id)!;
function expectMidpoint(profile: SketchProfile) {
  const a = point(profile, "a"), b = point(profile, "b"), p = point(profile, "p");
  expect(p.x).toBeCloseTo((a.x + b.x) / 2, 4);
  expect(p.z).toBeCloseTo((a.z + b.z) / 2, 4);
}
function expectOnLine(profile: SketchProfile, id = "p") {
  const a = point(profile, "a"), b = point(profile, "b"), p = point(profile, id);
  expect(((b.x-a.x)*(p.z-a.z)-(b.z-a.z)*(p.x-a.x))/Math.hypot(b.x-a.x,b.z-a.z)).toBeCloseTo(0, 4);
}
function expectSymmetry(profile: SketchProfile, pId = "p", qId = "q") {
  const a=point(profile,"a"),b=point(profile,"b"),p=point(profile,pId),q=point(profile,qId);
  const length=Math.hypot(b.x-a.x,b.z-a.z),tx=(b.x-a.x)/length,tz=(b.z-a.z)/length;
  const d=(p.x-a.x)*(-tz)+(p.z-a.z)*tx;
  expect(q.x).toBeCloseTo(p.x+2*d*tz,4);
  expect(q.z).toBeCloseTo(p.z-2*d*tx,4);
}

describe("midpoint and point-on-line", () => {
  it.each([[100,0],[100,60],[0,100],[-70,50]])("finds exact midpoint for fixed line ending at %s,%s", (x,z) => {
    const profile=base();Object.assign(profile.points[0],{locked:true});Object.assign(profile.points[1],{x,z,locked:true});
    profile.constraints=[relation("midpoint")];expectMidpoint(solve(profile));
  });
  it("moves free endpoints when the midpoint is dragged", () => {
    const profile=solve({...base(),constraints:[relation("midpoint")]});
    Object.assign(point(profile,"p"),{x:75,z:40});
    const result=solve(profile,new Set(["p"]));expectMidpoint(result);expect(point(result,"p").x).toBe(75);
  });
  it("follows endpoint movement and length changes with another constraint", () => {
    const profile=base();profile.constraints=[relation("midpoint"),{id:"length",kind:"distance",a:"a",b:"b",value:120}];
    Object.assign(point(profile,"a"),{z:40});
    expectMidpoint(solve(profile,new Set(["a"])));
  });
  it.each([[100,0],[0,100],[100,100],[-100,-100],[0.001,0]])("keeps a point on the infinite line %s,%s", (x,z) => {
    const profile=base();Object.assign(profile.points[0],{locked:true});Object.assign(profile.points[1],{x,z,locked:true});
    profile.constraints=[relation("point-on-line")];expectOnLine(solve(profile));
  });
  it("allows a point beyond endpoints to slide and handles reversed endpoints", () => {
    const profile=base();Object.assign(point(profile,"p"),{x:150});profile.points[0].locked=true;profile.points[1].locked=true;
    profile.constraints=[{...relation("point-on-line"),a:"b",b:"a"}];
    const result=solve(profile);expect(point(result,"p").x).toBe(150);expectOnLine(result);
    point(result,"p").x=200;expect(point(solve(result,new Set(["p"])),"p").x).toBe(200);
  });
  it("can move the reference line when a point is fixed", () => {
    const profile=base();point(profile,"p").locked=true;profile.constraints=[relation("point-on-line")];expectOnLine(solve(profile));
  });
  it.each(["midpoint","point-on-line"] as const)("rejects incompatible fixed %s without mutations", kind => {
    const profile=base();profile.points.forEach(p=>p.locked=true);profile.constraints=[relation(kind)];const before=structuredClone(profile);
    const result=applySketchConstraints(profile);expect(result.ok).toBe(false);expect(profile).toEqual(before);expect(result.profile).toBe(profile);
    if(!result.ok) {expect(result.failure.unsatisfied.map(r=>r.id)).toContain("r");expect(result.failure.conflicting).toEqual([]);}
  });
  it.each(["midpoint","point-on-line"] as const)("rejects zero-length %s references", kind => {
    const profile=base();profile.points[1].x=0;profile.points[0].locked=true;profile.points[1].locked=true;profile.constraints=[relation(kind)];
    expect(applySketchConstraints(profile).ok).toBe(false);
  });
  it.each(["midpoint","point-on-line"] as const)("deduplicates %s regardless of endpoint direction", kind => {
    const profile=withSketchConstraint(base(),relation(kind));
    expect(withSketchConstraint(profile,{...relation(kind),id:"other",a:"b",b:"a"})).toBe(profile);
    expect(withSketchConstraint(profile,{...relation(kind),id:"other",c:"q"}).constraints).toHaveLength(2);
  });
  it("drops missing references and refuses its own endpoint", () => {
    const profile={...base(),constraints:[relation("midpoint")]};profile.points=profile.points.filter(p=>p.id!=="p");expect(validSketchConstraints(profile)).toEqual([]);
    expect(validSketchConstraints({...base(),constraints:[{...relation("midpoint"),c:"a"}]})).toEqual([]);
  });
});

describe("symmetry", () => {
  it.each([[0,0,100,0],[50,0,50,100],[0,50,100,50],[0,0,100,100]])("reflects around axis %s,%s → %s,%s",(ax,az,bx,bz)=>{
    const profile=base();Object.assign(profile.points[0],{x:ax,z:az,locked:true});Object.assign(profile.points[1],{x:bx,z:bz,locked:true});
    profile.constraints=[symmetry];expectSymmetry(solve(profile));
  });
  it.each(["p","q"])("preserves bidirectionality when %s is dragged",id=>{
    const profile=solve({...base(),constraints:[symmetry]});profile.points[0].locked=true;profile.points[1].locked=true;
    Object.assign(point(profile,id),{x:45,z:id==="p"?60:-60});const result=solve(profile,new Set([id]));expectSymmetry(result);expect(point(result,id).x).toBe(45);
  });
  it("follows rotation and axis length changes",()=>{
    let profile=solve({...base(),constraints:[symmetry]});Object.assign(point(profile,"b"),{x:50,z:100});
    profile=solve(profile,new Set(["a","b"]));expectSymmetry(profile);
    const a=point(profile,"a"),b=point(profile,"b");Object.assign(b,{x:a.x+(b.x-a.x)*2,z:a.z+(b.z-a.z)*2});
    expectSymmetry(solve(profile,new Set(["a","b"])));
  });
  it("permits coincident reflected points on the axis",()=>{
    const profile=base();Object.assign(point(profile,"p"),{x:30,z:0});Object.assign(point(profile,"q"),{x:30,z:0});
    expectSymmetry(solve({...profile,constraints:[symmetry]}));
  });
  it("can reposition an unlocked axis for fixed reflected points",()=>{
    const profile=base();point(profile,"p").locked=true;point(profile,"q").locked=true;
    expectSymmetry(solve({...profile,constraints:[symmetry]}));
  });
  it("rejects incompatible fixed geometry and degenerate axes atomically",()=>{
    const profile=base();profile.points.forEach(p=>p.locked=true);profile.constraints=[symmetry];const before=structuredClone(profile);
    expect(applySketchConstraints(profile).ok).toBe(false);expect(profile).toEqual(before);
    profile.points[1].x=0;expect(applySketchConstraints(profile).ok).toBe(false);
  });
  it("deduplicates swapped pairs and axis direction",()=>{
    const profile=withSketchConstraint(base(),symmetry);
    expect(withSketchConstraint(profile,{...symmetry,id:"other",a:"q",b:"p",axis:["b","a"]})).toBe(profile);
  });
  it("persists segment endpoint correspondence through movement",()=>{
    const profile=base();profile.points.push({id:"r",x:60,z:40},{id:"s",x:70,z:-40});
    profile.segments.push({id:"first",startId:"p",endId:"r"},{id:"second",startId:"s",endId:"q"});
    profile.constraints=[{...symmetry,pair:["r","s"]}];profile.points[0].locked=true;profile.points[1].locked=true;
    let result=solve(profile);expectSymmetry(result);expectSymmetry(result,"r","s");
    Object.assign(point(result,"s"),{x:95,z:-15});result=solve(result,new Set(["s"]));expectSymmetry(result,"r","s");
    expect(result.constraints).toEqual(profile.constraints);
    expect(sketchConstraintReferences(result.constraints![0])).toEqual([["a","b"],["p","r"],["q","s"]]);
    const clone=cloneSketchProfile(result);const rule=clone.constraints![0];if(rule.kind==="symmetry"){rule.axis[0]="changed";rule.pair![0]="changed";}
    expect(result.constraints![0]).toEqual(profile.constraints![0]);
  });
});

describe("integration",()=>{
  it("regenerates an offset when a midpoint changes its source and rejects derived constraints",()=>{
    const profile=base();profile.constraints=[relation("midpoint")];
    const linked=updateSketchOffsets({...profile,offsets:[{id:"off",sourceSegmentIds:["line"],pointIds:[],segmentIds:[],distance:5,join:"miter",miterLimit:4}]});
    expect(linked.ok).toBe(true);if(!linked.ok)return;
    Object.assign(point(linked.profile,"p"),{x:70,z:40});const result=solve(linked.profile,new Set(["p"]));expectMidpoint(result);
    const feature=result.offsets![0];expect(feature.distance).toBe(5);expect(feature.pointIds).toHaveLength(2);
    const a=point(result,"a"),b=point(result,"b"),derived=point(result,feature.pointIds[0]);
    expect(Math.abs(((b.x-a.x)*(derived.z-a.z)-(b.z-a.z)*(derived.x-a.x))/Math.hypot(b.x-a.x,b.z-a.z))).toBeCloseTo(5,4);
    const rejected=applySketchConstraints({...result,constraints:[...result.constraints!,{...symmetry,a:feature.pointIds[0]}]});
    expect(rejected.ok).toBe(false);if(!rejected.ok)expect(rejected.failure.offsetError?.message).toContain("Detach");
  });
  it.each(["midpoint","point-on-line"] as const)("preserves a %s reference when another edge touches its interior", kind=>{
    const profile=base();profile.points.push({id:"end",x:60,z:50});profile.segments.push({id:"stem",startId:"p",endId:"end"});
    profile.constraints=[relation(kind)];const solved=solve(profile);let id=0;
    const refined=addLineIntersectionPoints(solved,()=>`new-${++id}`);
    expect(refined.segments.some(s=>s.id==="line")).toBe(true);expect(validSketchConstraints(refined)).toHaveLength(1);
  });
  it("deletion and independent history snapshots retain geometry and restore relations",()=>{
    const before=cloneSketchProfile(base());const after=cloneSketchProfile(solve({...before,constraints:[symmetry]}));
    const deleted=solve({...after,constraints:[]});expect(deleted.points).toEqual(after.points);
    const undo=cloneSketchProfile(after);expectSymmetry(solve(undo));expect(before.constraints).toBeUndefined();
    expect(solve(cloneSketchProfile(deleted)).constraints).toEqual([]);
  });
  it("keeps reference-based relationships invariant in a rotated sketch frame",()=>{
    const profile=solve({...base(),constraints:[symmetry,relation("midpoint")]});
    const transformed=turnedSketchProfile(profile,{origin:{x:5,z:9},xAxis:{x:0,z:1},zAxis:{x:-1,z:0}},"toPlate");
    expectSymmetry(solve(transformed));expectMidpoint(solve(transformed));
  });
});
