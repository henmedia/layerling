import { describe, expect, it } from "vitest";
import { sketchOffsetForSelection, sketchOffsetSliderLimit } from "@/lib/sketchOffsetSelection";
import { updateSketchOffsets } from "@/lib/sketchOffsets";
import type { SketchProfile } from "@/types/layerling";
const source:SketchProfile={points:[{id:"a",x:0,z:0},{id:"b",x:20,z:0},{id:"c",x:50,z:0},{id:"d",x:70,z:0}],segments:[{id:"one",startId:"a",endId:"b"},{id:"two",startId:"c",endId:"d"}]};
function profile(){const result=updateSketchOffsets({...source,offsets:[{id:"offset",sourceSegmentIds:["one"],pointIds:[],segmentIds:[],distance:2,join:"miter",miterLimit:4}]});if(!result.ok)throw Error(result.message);return result.profile;}
describe("offset inspector selection",()=>{
  it("finds an offset from either its source shape or derived path",()=>{
    const p=profile(),f=p.offsets![0];
    expect(sketchOffsetForSelection(p,["a"],[])?.offset?.id).toBe("offset");
    expect(sketchOffsetForSelection(p,[],["one"])?.offset?.id).toBe("offset");
    expect(sketchOffsetForSelection(p,[f.pointIds[0]],[])?.offset?.id).toBe("offset");
    expect(sketchOffsetForSelection(p,[],f.segmentIds)?.offset?.id).toBe("offset");
  });
  it("identifies an ordinary shape for create mode without guessing on multiple shapes",()=>{
    expect(sketchOffsetForSelection(profile(),[],["two"])?.offset).toBeUndefined();
    expect(sketchOffsetForSelection(profile(),[],["two"])?.segmentIds).toEqual(["two"]);
    expect(sketchOffsetForSelection(profile(),[],["one","two"])).toBeUndefined();
  });
  it("keeps the selected offset when several share one source",()=>{
    const p=profile();p.offsets!.push({...p.offsets![0],id:"second",pointIds:[],segmentIds:[]});
    expect(sketchOffsetForSelection(p,[],["one"],"second")?.offset?.id).toBe("second");
    expect(sketchOffsetForSelection(p,[],p.offsets![0].segmentIds,"second")?.offset?.id).toBe("offset");
  });
  it("bounds slider ranges by source size rather than the current distance",()=>{
    const p=profile();expect(sketchOffsetSliderLimit(p,["one"])).toBe(10);
    p.offsets![0].distance=10185.74;expect(sketchOffsetSliderLimit(p,["one"])).toBe(10);
    expect(sketchOffsetSliderLimit({...source,points:source.points.map(p=>({...p,x:p.x*1000}))},["one"])).toBe(100);
    expect(sketchOffsetSliderLimit({...source,points:source.points.map(p=>({...p,x:p.x/1000}))},["one"])).toBe(1);
  });
});
