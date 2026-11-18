import { describe, expect, it } from "vitest";
import { constrainedSketchResizeIds, withoutResizedSketchConstraints } from "@/lib/sketchResizeConfirmation";
import type { WorkplaneShape } from "@/types/layerling";
const body = (id="sketch"): WorkplaneShape => ({id,name:"Sketch",kind:"mesh",width:20,depth:20,height:10,size:20,x:0,z:0,elevation:0,rotation:0,color:"#123456",locked:false,hidden:false,
  sketchProfile:{points:[{id:"a",x:0,z:0},{id:"b",x:20,z:0}],segments:[{id:"ab",startId:"a",endId:"b"}],constraints:[{id:"length",kind:"distance",a:"a",b:"b",value:20}]}} as WorkplaneShape);
describe("3D resize constraint confirmation",()=>{
  it.each(["width","depth","height","size"] as const)("detects %s edits without mutating the current sketch",key=>{
    const original=body(),before=structuredClone(original),next={...original,[key]:30};
    expect(constrainedSketchResizeIds([original],[next])).toEqual([original.id]);expect(original).toEqual(before);
  });
  it("does not warn for placement, rotation, unchanged size, or unconstrained bodies",()=>{
    const original=body();expect(constrainedSketchResizeIds([original],[{...original,x:30,rotation:45}])).toEqual([]);
    expect(constrainedSketchResizeIds([original],[original])).toEqual([]);
    const free={...original,sketchProfile:{...original.sketchProfile!,constraints:[]}};
    expect(constrainedSketchResizeIds([free],[{...free,width:30}])).toEqual([]);
  });
  it("removes only the approved bodies' constraints and preserves geometry and the original history snapshot",()=>{
    const original=body(),other=body("other"),next={...original,width:30};
    const approved=withoutResizedSketchConstraints([next,other],[original.id]);
    expect(approved[0].width).toBe(30);expect(approved[0].sketchProfile?.constraints).toBeUndefined();
    expect(approved[0].sketchProfile?.points).toEqual(original.sketchProfile?.points);
    expect(approved[1]).toBe(other);expect(original.sketchProfile?.constraints).toHaveLength(1);
  });
  it("detects every affected sketch in a selection, ignoring newly created geometry",()=>{
    const first=body(),second=body("second"),newBody=body("new");
    expect(constrainedSketchResizeIds([first,second],[{...first,width:30},{...second,depth:40},newBody])).toEqual([first.id,second.id]);
  });
});
