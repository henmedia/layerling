// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { useEditorNotice } from "@/components/workplane/useEditorNotice";
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(()=>vi.useRealTimers());
it("keeps multi-action decisions until a choice is made, including after hover",()=>{
  vi.useFakeTimers();const node=document.createElement('div'),root=createRoot(node);let controls!:ReturnType<typeof useEditorNotice>;
  function Harness(){controls=useEditorNotice();return createElement('span',null,controls.notice);}
  act(()=>root.render(createElement(Harness)));
  const cancel=vi.fn();act(()=>controls.setNotice('Resize removes constraints','stay',[{label:'Cancel',run:cancel}]));
  expect(Array.isArray(controls.noticeAction)).toBe(true);expect(controls.noticeOrdinary).toBe(false);
  act(()=>{controls.holdNotice();controls.releaseNotice();vi.advanceTimersByTime(60000);});
  expect(controls.notice).toBe('Resize removes constraints');
  act(()=>{const actions=controls.noticeAction;if(Array.isArray(actions))actions[0].run();controls.dismissNotice();});
  expect(cancel).toHaveBeenCalledOnce();expect(controls.notice).toBe('');expect(controls.noticeAction).toBeNull();act(()=>root.unmount());
});
it("retains the existing single-action notice interface",()=>{
  const node=document.createElement('div'),root=createRoot(node);let controls!:ReturnType<typeof useEditorNotice>;
  function Harness(){controls=useEditorNotice();return null;}
  act(()=>root.render(createElement(Harness)));const action={label:'Open',run:vi.fn()};act(()=>controls.setNotice('Ready','stay',action));
  expect(controls.noticeAction).toBe(action);act(()=>root.unmount());
});
