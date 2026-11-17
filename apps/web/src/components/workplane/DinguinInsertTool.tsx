"use client";
export function DinguinInsertTool({onClick,active=false,disabled=false}:{onClick:()=>void;active?:boolean;disabled?:boolean}) {
 return <button type="button" className={active?"toolbar-icon active":"toolbar-icon"} data-layerling-tool="dinguin-thread-insert" title="DinguinCAD: Gewindeeinsätze" aria-label="Gewindeeinsätze" aria-pressed={active} disabled={disabled} onClick={onClick}><img src="/assets/dinguin/gewindeeinsatz.svg" width={30} height={30} alt="" draggable={false}/></button>;
}
