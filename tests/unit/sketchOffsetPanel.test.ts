// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setLanguage, translate } from "@/lib/i18n";
import { SketchOffsetPanel } from "@/components/SketchOffsetPanel";
import { updateSketchOffsets } from "@/lib/sketchOffsets";
import type { SketchProfile } from "@/types/layerling";
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const source: SketchProfile = {points:[{id:"a",x:0,z:0},{id:"b",x:20,z:0}],segments:[{id:"line",startId:"a",endId:"b"}]};
describe("offset settings",()=>{
  let container:HTMLDivElement,root:Root;
  beforeEach(()=>{container=document.createElement("div");document.body.append(container);root=createRoot(container);});
  afterEach(()=>{act(()=>root.unmount());container.remove();});
  function render(profile=source,featureId:string|null=null){
    const props={profile,featureId,selectedSegmentIds:["line"],accuracy:2 as const,onCommit:vi.fn(()=>true),onPreview:vi.fn(),onEdit:vi.fn(),onClose:vi.fn()};
    act(()=>root.render(createElement(SketchOffsetPanel,props)));return props;
  }
  function click(text:string){const button=[...container.querySelectorAll("button")].find(b=>b.textContent===text)!;act(()=>button.click());}
  function value(label:string,value:string){
    if(label==="Offset name"&&!container.querySelector('[aria-label="Offset name"]')) act(()=>container.querySelector<HTMLButtonElement>('[aria-label^="Rename offset"]')!.click());
    act(()=>{const input=container.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}));});}
  it("previews signed distance, flips and commits a persistent relationship",()=>{
    const props=render();expect(props.onPreview.mock.calls.at(-1)?.[0]?.points).toHaveLength(2);
    value("Offset distance","4");click("Flip direction");click("Create offset");
    const next=props.onCommit.mock.calls[0][0] as SketchProfile;
    expect(next.offsets?.[0].distance).toBe(-4);expect(next.points).toHaveLength(4);expect(next.points.at(-1)?.z).toBe(-4);
  });
  it("translates an open panel without saving its default label as a custom name", async () => {
    const props = render();
    try {
      await act(async () => { await setLanguage("de", false); });
      expect(container.textContent).toContain(translate("de", "sketchUi.offset", { value0: 1 }));
      expect(container.querySelector('aside')?.getAttribute("aria-label"))
        .toBe(translate("de", "sketchUi.offsetAndInset"));
      const button = [...container.querySelectorAll("button")].find(button => button.textContent === translate("de", "sketchUi.createOffset"))!;
      act(() => button.click());
      const next = props.onCommit.mock.calls[0][0] as SketchProfile;
      expect(next.offsets?.[0].name).toBeUndefined();
    } finally {
      await act(async () => { await setLanguage("en", false); });
    }
  });
  it("accepts a workplane drag request as a draft without committing",()=>{
    const props=render();
    act(()=>root.render(createElement(SketchOffsetPanel,{...props,distanceRequest:{value:7}})));
    expect(container.querySelector<HTMLInputElement>('[aria-label="Offset distance"]')!.value).toBe("7.00");
    expect(props.onCommit).not.toHaveBeenCalled();
    click("Create offset");expect((props.onCommit.mock.calls[0][0] as SketchProfile).offsets?.[0].distance).toBe(7);
  });
  it("names a new offset and keeps large typed values from expanding the slider",()=>{
    const props=render();value("Offset name","Clearance");
    act(()=>container.querySelector<HTMLInputElement>('[aria-label="Offset name"]')!.dispatchEvent(new FocusEvent("focusout",{bubbles:true})));
    value("Offset distance","10185.74");
    const slider=container.querySelector<HTMLInputElement>('[aria-label="Drag offset distance"]')!;
    expect(slider.min).toBe("-10");expect(slider.max).toBe("10");expect(slider.value).toBe("10");
    click("Create offset");const next=props.onCommit.mock.calls[0][0] as SketchProfile;
    expect(next.offsets?.[0].name).toBe("Clearance");expect(next.offsets?.[0].distance).toBe(10185.74);
    expect(container.querySelector('[aria-label="Create new offset"]')?.getAttribute("style")).toContain("outline");
  });
  it("renames an existing offset without changing its distance",()=>{
    const result=updateSketchOffsets({...source,offsets:[{id:"offset",sourceSegmentIds:["line"],pointIds:[],segmentIds:[],distance:2,join:"miter",miterLimit:4}]});if(!result.ok)throw Error(result.message);
    const props=render(result.profile,"offset");value("Offset name","Lip");
    act(()=>container.querySelector<HTMLInputElement>('[aria-label="Offset name"]')!.dispatchEvent(new FocusEvent("focusout",{bubbles:true})));
    const next=props.onCommit.mock.calls[0][0] as SketchProfile;
    expect(next.offsets?.[0].name).toBe("Lip");expect(next.offsets?.[0].distance).toBe(2);
  });
  it("expands settings beneath its name bar and collapses them again",()=>{
    const result=updateSketchOffsets({...source,offsets:[{id:"offset",name:"Rim",sourceSegmentIds:["line"],pointIds:[],segmentIds:[],distance:2,join:"miter",miterLimit:4}]});if(!result.ok)throw Error(result.message);
    const props=render(result.profile,"offset");
    const row=container.querySelector('[data-offset-id="offset"]')!;
    expect(row.querySelector('[aria-label="Offset distance"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Create new offset"] [aria-label="Offset distance"]')).toBeNull();
    act(()=>row.querySelector('summary')!.click());
    expect(row.querySelector('[aria-label="Offset distance"]')).toBeNull();
    expect(props.onPreview.mock.calls.at(-1)?.[0]).toBeNull();
    act(()=>row.querySelector('summary')!.click());
    expect(row.querySelector('[aria-label="Offset distance"]')).not.toBeNull();
  });
  it("edits names in the bar without toggling it and lets Escape cancel",()=>{
    const props=render();
    const summary=container.querySelector('summary')!;
    expect(summary.getAttribute("aria-expanded")).toBe("true");
    value("Offset name","Discard me");
    expect(summary.querySelector('[aria-label="Offset name"]')).not.toBeNull();
    act(()=>summary.querySelector('input')!.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true})));
    expect(summary.querySelector('input')).toBeNull();expect(summary.textContent).toContain("Offset 1");
    expect(summary.getAttribute("aria-expanded")).toBe("true");expect(props.onCommit).not.toHaveBeenCalled();expect(props.onClose).not.toHaveBeenCalled();
  });
  it("enables Apply only for changed settings and disables it after saving or reverting",()=>{
    const result=updateSketchOffsets({...source,offsets:[{id:"offset",sourceSegmentIds:["line"],pointIds:[],segmentIds:[],distance:2,join:"miter",miterLimit:4}]});if(!result.ok)throw Error(result.message);
    const props=render(result.profile,"offset");
    const apply=()=>[...container.querySelectorAll("button")].find(b=>b.textContent==="Apply offset")!;
    expect(apply().disabled).toBe(true);expect(props.onPreview.mock.calls.at(-1)?.[1]?.changed).toBe(false);
    click("Apply offset");expect(props.onCommit).not.toHaveBeenCalled();
    value("Offset distance","2.000");expect(apply().disabled).toBe(true);
    value("Offset distance","3");expect(apply().disabled).toBe(false);expect(props.onPreview.mock.calls.at(-1)?.[1]?.changed).toBe(true);
    value("Offset distance","2");expect(apply().disabled).toBe(true);expect(props.onPreview.mock.calls.at(-1)?.[1]?.changed).toBe(false);
    value("Offset miter limit","5");expect(apply().disabled).toBe(false);
    value("Offset miter limit","4");expect(apply().disabled).toBe(true);
    act(()=>{const select=container.querySelector<HTMLSelectElement>('[aria-label="Offset corner style"]')!;select.value="bevel";select.dispatchEvent(new Event("change",{bubbles:true}));});
    expect(apply().disabled).toBe(false);click("Apply offset");
    const next=props.onCommit.mock.calls[0][0] as SketchProfile;
    act(()=>root.render(createElement(SketchOffsetPanel,{...props,profile:next})));
    expect(apply().disabled).toBe(true);
    value("Offset distance","0");expect(apply().disabled).toBe(true);
  });
  it("does not treat display rounding as an edit or round the saved distance when changing joins",()=>{
    const result=updateSketchOffsets({...source,offsets:[{id:"offset",sourceSegmentIds:["line"],pointIds:[],segmentIds:[],distance:2.34567,join:"miter",miterLimit:4}]});if(!result.ok)throw Error(result.message);
    const props=render(result.profile,"offset");
    const apply=()=>[...container.querySelectorAll("button")].find(b=>b.textContent==="Apply offset")!;
    expect(apply().disabled).toBe(true);
    value("Offset miter limit","5");click("Apply offset");
    expect((props.onCommit.mock.calls[0][0] as SketchProfile).offsets?.[0].distance).toBe(2.34567);
  });
  it("creates independent paths on both sides",()=>{
    const props=render();const labels=[...container.querySelectorAll("label")];
    act(()=>labels.find(l=>l.textContent==="Both sides")!.querySelector<HTMLInputElement>("input")!.click());click("Create offset");
    const next=props.onCommit.mock.calls[0][0] as SketchProfile;
    expect(next.offsets?.map(f=>f.distance)).toEqual([2,-2]);
  });
  it("blocks invalid input and cancels without committing",()=>{
    const props=render();value("Offset distance","0");expect(container.querySelector('[role="alert"]')?.textContent).toContain("nonzero");
    expect([...container.querySelectorAll("button")].find(b=>b.textContent==="Create offset")?.disabled).toBe(true);
    act(()=>container.querySelector<HTMLButtonElement>('[aria-label="Close offset settings"]')!.click());expect(props.onClose).toHaveBeenCalled();expect(props.onCommit).not.toHaveBeenCalled();
  });
  it("edits, hides, detaches and deletes without deleting source",()=>{
    const result=updateSketchOffsets({...source,offsets:[{id:"offset",sourceSegmentIds:["line"],pointIds:[],segmentIds:[],distance:2,join:"miter",miterLimit:4}]});if(!result.ok)throw Error(result.message);
    const props=render(result.profile,"offset");value("Offset distance","5");click("Apply offset");
    expect((props.onCommit.mock.calls[0][0] as SketchProfile).offsets?.[0].distance).toBe(5);
    act(()=>container.querySelector<HTMLButtonElement>('[aria-label="Hide offset geometry"]')!.click());
    expect((props.onCommit.mock.calls[1][0] as SketchProfile).offsets?.[0].hidden).toBe(true);
    click("Detach geometry");expect((props.onCommit.mock.calls[2][0] as SketchProfile).points).toHaveLength(4);
    act(()=>container.querySelector<HTMLButtonElement>('[aria-label="Delete offset"]')!.click());
    expect((props.onCommit.mock.calls[3][0] as SketchProfile).points).toEqual(source.points);
  });
});
