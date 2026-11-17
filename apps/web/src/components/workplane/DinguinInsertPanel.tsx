"use client";
import { useEffect, useRef, useState } from "react";
import type { DinguinInsertSpec,DinguinInsertResult } from "@/lib/dinguinThreadInsertSafety";
import { DINGUIN_INSERT_SIZES,customDinguinInsert } from "@/lib/dinguinThreadInsertSafety";

type Props={ name:string; preset:string; customD3:string; customL:string; onPreset:(v:string)=>void; onCustomD3:(v:string)=>void; onCustomL:(v:string)=>void; result:(DinguinInsertResult & {edgeDistance:number;materialDepth:number})|null; busy:boolean; coordinates:{x:number;y:number}|null; onCoordinates:(x:number,y:number)=>void; centerAvailable:boolean; onCenter:()=>void; onPick:()=>void; onCreate:()=>void; onCancel:()=>void; };
const translations = {
 de: {
  title:"Gewindeeinsätze", drag:"ziehen", move:"Hier anfassen und Fenster verschieben", expand:"Fenster ausklappen",collapse:"Fenster einklappen",close:"Schließen",part:"Bauteil",size:"Größe",custom:"Benutzerdefiniert",length:"Länge L (mm)",bore:"Bohrung Ø",depth:"Bohrtiefe L",wall:"Mindest-Randabstand W",centerEdge:"Lochmitte zur Kante",invalid:"Bitte gültigen Durchmesser und Länge eingeben.",yes:"🟢 GRÜN – Bohrung passt",no:"🔴 ROT – Bohrung gesperrt",coordinateTitle:"📐 Bohrungsmitte (mm)",coordinateHint:"X/Y ab unterer linker Ecke einer ebenen Flächenkontur. Auf Rundflächen wird die Position derzeit mit der Maus bestimmt. Du kannst Werte aus deiner Zeichnung eingeben oder den Kreis ziehen.",recheck:"Mindest-Randabstand W und Materialtiefe L werden bei jeder Positionsänderung neu geprüft.",purple:"Lila Mittelpunkt – feste Orientierung",center:"Auf Mittelpunkt zentrieren",centerOk:"Die lila Markierung bleibt fest; der Bohrkreis springt dorthin. W und L werden erneut geprüft.",centerNone:"Keine sichere Flächenmitte ermittelt. Bitte Bohrpunkt von Hand platzieren.",dragHint:"Bohrstelle am Bauteil anklicken und mit gedrückter linker Maustaste über die Flächen ziehen. Grün = beide Prüfungen OK, Rot = keine Bohrung.",availableDepth:"Vorhandene Materialtiefe",actualEdge:"Abstand Lochmitte zur Kante",passed:"✓ Beide Prüfungen bestanden",pickHint:"Bitte die Bohrstelle auf dem 3D-Bauteil anklicken.",repick:"Bohrstelle neu wählen",create:"Bohrung erzeugen",busy:"Berechne…",minimum:"Bei einer mittigen Bohrung sollte die Bauteilbreite bzw. der Zylinderdurchmesser mit 0,1 mm Reserve mindestens",minimumEnd:"betragen. Ist das Bauteil kleiner, muss es vergrößert oder ein kleinerer Einsatz gewählt werden.",actualWall:"Vorhandener Randabstand",neededWall:"Erforderlicher Randabstand",missingWall:"Fehlender Randabstand",depthMissing:"Fehlende Materialtiefe",invalidValues:"Ungültige Maße. Bohrung gesperrt." },
 en: {
  title:"Thread inserts",drag:"drag",move:"Drag here to move the window",expand:"Expand window",collapse:"Collapse window",close:"Close",part:"Part",size:"Size",custom:"Custom",length:"Insert length L (mm)",bore:"Hole diameter Ø",depth:"Drilling depth L",wall:"Minimum edge clearance W",centerEdge:"Hole center to edge",invalid:"Enter a valid diameter and length.",yes:"🟢 GREEN – Hole is allowed",no:"🔴 RED – Hole blocked",coordinateTitle:"📐 Hole center (mm)",coordinateHint:"X/Y measured from the bottom-left corner of a planar face outline. For curved surfaces, position the hole with the mouse. You can also enter drawing coordinates.",recheck:"Minimum edge clearance W and material depth L are rechecked after every change.",purple:"Purple center – fixed reference",center:"Center hole",centerOk:"The purple reference stays fixed; the hole moves there. W and L are checked again.",centerNone:"No reliable face center found. Position the hole manually.",dragHint:"Click the part and drag the hole marker across surfaces with the left mouse button. Green = both checks pass; red = no drilling.",availableDepth:"Available material depth",actualEdge:"Hole center to edge",passed:"✓ Both checks passed",pickHint:"Click a hole location on the 3D part.",repick:"Choose another point",create:"Create hole",busy:"Calculating…",minimum:"For a centered hole, the part width or cylinder diameter should be at least (including 0.1 mm clearance)",minimumEnd:". If the part is smaller, enlarge it or select a smaller insert.",actualWall:"Available edge clearance",neededWall:"Required edge clearance",missingWall:"Missing edge clearance",depthMissing:"Missing material depth",invalidValues:"Invalid dimensions. Hole blocked." }
} as const;
type Language = keyof typeof translations;
const mm=(x:number,language:Language)=>x.toLocaleString(language==="de"?"de-DE":"en-US",{maximumFractionDigits:2});

export function DinguinInsertPanel(p:Props) {
 const [collapsed, setCollapsed] = useState(false);
 const [language,setLanguage] = useState<Language>("de");
 const t=translations[language];
 const format=(x:number)=>mm(x,language);
 const [location, setLocation] = useState<{left:number;top:number}|null>(null);
 const [choosingPoint,setChoosingPoint] = useState(false);
 useEffect(()=>{if(p.result) setChoosingPoint(false);},[p.result]);
 const dragging = useRef<{startX:number;startY:number;left:number;top:number;width:number;height:number}|null>(null);
 const beginDrag = (event:React.PointerEvent<HTMLElement>) => {
   if (event.button !== 0 || p.busy) return;
   // Eingaben, Schaltflaechen und Scrollbar nicht zum Ziehen verwenden.
   const target = event.target;
   if (!(target instanceof Element)) return;
   if (target.closest('button,input,select,textarea,a,[role="button"],[data-no-panel-drag]')) return;
   const panel = event.currentTarget;
   const bounds = panel.getBoundingClientRect();
   // Rechte Scrollleiste bleibt weiterhin bedienbar.
   if (event.clientX > bounds.right - (panel.offsetWidth - panel.clientWidth)) return;
   dragging.current = {startX:event.clientX,startY:event.clientY,left:bounds.left,top:bounds.top,width:bounds.width,height:bounds.height};
   event.currentTarget.setPointerCapture(event.pointerId);
   event.preventDefault();
 };
 const moveDrag = (event:React.PointerEvent<HTMLElement>) => {
   if (!dragging.current) return;
   const d=dragging.current;
   setLocation({
     left: Math.max(0,Math.min(window.innerWidth-d.width,d.left+event.clientX-d.startX)),
     top: Math.max(0,Math.min(window.innerHeight-48,d.top+event.clientY-d.startY)),
   });
 };
 const endDrag = (event:React.PointerEvent<HTMLElement>) => {
   dragging.current=null;
   if(event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
 };
 const [xInput,setXInput]=useState("");
 const [yInput,setYInput]=useState("");
 useEffect(()=>{setXInput(p.coordinates ? format(p.coordinates.x) : "");},[p.coordinates?.x,language]);
 useEffect(()=>{setYInput(p.coordinates ? format(p.coordinates.y) : "");},[p.coordinates?.y,language]);
 const coordinateChange=(axis:"x"|"y",value:string)=>{
   if(axis==="x") setXInput(value); else setYInput(value);
   if(!p.coordinates || p.busy || value.trim()==="") return;
   const parsed=Number(value.replace(",","."));
   if(!Number.isFinite(parsed)) return;
   p.onCoordinates(axis==="x"?parsed:p.coordinates.x,axis==="y"?parsed:p.coordinates.y);
 };
 const spec: DinguinInsertSpec|undefined = p.preset==="Benutzerdefiniert" ? customDinguinInsert(Number(p.customD3.replace(",",".")),Number(p.customL.replace(",","."))) : DINGUIN_INSERT_SIZES.find(x=>x.name===p.preset);
 const valid=Boolean(spec&&Number.isFinite(spec.d3)&&Number.isFinite(spec.L)&&spec.d3>=0.1&&spec.L>=0.1);
 const field:React.CSSProperties={display:"block",width:"100%",background:"#fff",color:"#151515",borderRadius:5,padding:"8px",marginTop:5};
 return <aside role="region" aria-label={t.title} onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} title={t.move} style={{cursor:"grab",position:"fixed",left:location?.left,right:location?undefined:16,top:location?.top??95,width:316,maxWidth:"calc(100vw - 36px)",maxHeight:"calc(100vh - 36px)",overflowY:"auto",zIndex:90,padding:collapsed?10:16,background:"#292d37",color:"white",border:"1px solid #bf9639",borderRadius:11,boxShadow:"0 10px 30px #0008",fontFamily:"inherit"}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,cursor:"move",touchAction:"none",userSelect:"none",minHeight:30}} title={t.move}>
    <strong>🔩 {t.title} <span style={{fontSize:11,opacity:.7}}>⠿ {t.drag}</span></strong>
    <div style={{display:"flex",gap:6}}>
      <button type="button" aria-label={collapsed?t.expand:t.collapse} aria-expanded={!collapsed} onPointerDown={e=>e.stopPropagation()} onClick={()=>setCollapsed(v=>!v)} style={{minWidth:30,minHeight:28,cursor:"pointer"}}>{collapsed?"▢":"−"}</button>
      <button type="button" aria-label={t.close} onPointerDown={e=>e.stopPropagation()} onClick={p.onCancel} style={{minWidth:30,minHeight:28,cursor:"pointer"}}>✕</button>
    </div>
  </div>
  {!collapsed && <div>
  <div style={{display:"flex",justifyContent:"flex-end",marginTop:8,alignItems:"center",gap:7}}>
    <span style={{fontSize:12,opacity:.8}}>🌐</span>
    <select aria-label="Language / Sprache" value={language} onChange={e=>setLanguage(e.target.value as Language)} style={{background:"#20242c",color:"white",border:"1px solid #777",padding:"4px 7px",borderRadius:5}}>
      <option value="de">Deutsch</option><option value="en">English</option>
    </select>
  </div>
  <p style={{fontSize:12,opacity:.8}}>{t.part}: {p.name}</p>
  <label style={{display:"block",marginTop:12}}>{t.size}<select value={p.preset} onChange={e=>p.onPreset(e.target.value)} style={field}>{DINGUIN_INSERT_SIZES.map(s=><option key={s.name} value={s.name}>{s.name}</option>)}<option value="Benutzerdefiniert">{t.custom}</option></select></label>
  {p.preset==="Benutzerdefiniert"&&<div style={{display:"flex",gap:8,marginTop:8}}><label style={{flex:1}}>Ø d3 (mm)<input type="text" inputMode="decimal" pattern="[0-9]+([.,][0-9]+)?" value={p.customD3} onChange={e=>p.onCustomD3(e.target.value)} style={field}/></label><label style={{flex:1}}>{t.length}<input type="text" inputMode="decimal" pattern="[0-9]+([.,][0-9]+)?" value={p.customL} onChange={e=>p.onCustomL(e.target.value)} style={field}/></label></div>}
  {valid&&spec&&<div style={{marginTop:12,lineHeight:1.8,fontSize:13}}><div>{t.bore} <b>{format(spec.d3)} mm</b></div><div>{t.depth}: <b>{format(spec.L)} mm</b></div><div>{t.wall}: <b>{format(spec.W)} mm</b></div><div>{t.centerEdge}: <b>{format(spec.d3/2+spec.W)} mm</b></div></div>}
  {!valid&&<p role="alert" style={{color:"#ffb4b4"}}>{t.invalid}</p>}
  {p.result&&valid&&spec?<div role="status" style={{marginTop:12,padding:10,border:`2px solid ${p.result.allowed?"#18d66b":"#ff5555"}`,borderRadius:8,background:p.result.allowed?"#123c2a":"#4a2020",fontWeight:700}}>{p.result.allowed?t.yes:t.no}</div>:null}
  <div style={{marginTop:12,padding:10,border:"1px solid #626875",borderRadius:8}}>
    <strong style={{fontSize:13}}>{t.coordinateTitle}</strong>
    <p style={{fontSize:11,opacity:.8,margin:"4px 0"}}>{t.coordinateHint}</p>
    <div style={{display:"flex",gap:8}}>
      <label style={{flex:1,fontSize:12}}>X (mm)
        <input aria-label="Bohrungsposition X in Millimeter" inputMode="decimal" value={xInput} disabled={!p.coordinates||p.busy} onChange={e=>coordinateChange("x",e.target.value)} style={field}/>
      </label>
      <label style={{flex:1,fontSize:12}}>Y (mm)
        <input aria-label="Bohrungsposition Y in Millimeter" inputMode="decimal" value={yInput} disabled={!p.coordinates||p.busy} onChange={e=>coordinateChange("y",e.target.value)} style={field}/>
      </label>
    </div>
    <p style={{fontSize:11,opacity:.8,margin:"7px 0 0"}}>{t.recheck}</p>
  </div>
  <div style={{marginTop:10,padding:9,border:"1px solid #9954e8",borderRadius:8,background:"#382b4f"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><span style={{color:"#bb82ff",fontSize:21}}>⊕</span><strong style={{fontSize:13}}>{t.purple}</strong></div>
    <button type="button" disabled={!p.centerAvailable||p.busy} onClick={p.onCenter}
      style={{width:"100%",padding:"8px",borderRadius:6,background:p.centerAvailable?"#9550d9":"#666",color:"white",cursor:p.centerAvailable?"pointer":"not-allowed"}}>
      {t.center}
    </button>
    <p style={{fontSize:11,opacity:.8,margin:"6px 0 0"}}>{p.centerAvailable
      ? t.centerOk
      : t.centerNone}</p>
  </div>
  <p style={{fontSize:12,opacity:.9}}>{t.dragHint}</p>
  {p.result && valid && spec ? <div style={{fontSize:13,borderTop:"1px solid #555",marginTop:12,paddingTop:10}}><p>{t.availableDepth}: <b>{format(p.result.materialDepth)} mm</b></p><p>{t.actualEdge}: <b>{format(p.result.edgeDistance)} mm</b></p>{p.result.warnings.length ? <div role="alert" style={{color:"#ffb4b4",lineHeight:1.6}}>
    {p.result.edgeDistance - spec.d3/2 + 1e-6 < spec.W && <>
      <p><b>{t.neededWall}: {format(spec.W)} mm</b></p>
      <p>{t.actualWall}: {format(p.result.edgeDistance-spec.d3/2)} mm</p>
      <p>{t.missingWall}: {format(spec.W-(p.result.edgeDistance-spec.d3/2))} mm</p>
      <p>{t.minimum} <b>{format(Math.round((p.result.minimumOuterDiameter + 0.1) * 10) / 10)} mm</b>{" "}{t.minimumEnd}</p>
    </>}
    {p.result.materialDepth + 1e-6 < spec.L && <>
      <p><b>{t.depth}: {format(spec.L)} mm</b></p>
      <p>{t.availableDepth}: {format(p.result.materialDepth)} mm</p>
      <p>{t.depthMissing}: {format(spec.L-p.result.materialDepth)} mm</p>
    </>}
    {(!Number.isFinite(p.result.edgeDistance)||!Number.isFinite(p.result.materialDepth))&&<p>{t.invalidValues}</p>}
  </div> : <p style={{color:"#92f0a6"}}>{t.passed}</p>}</div>:<p style={{fontSize:13,opacity:.8,marginTop:12}}>{t.pickHint}</p>}
  <div style={{display:"flex",gap:8,marginTop:12}}><button type="button" onClick={()=>{setChoosingPoint(true);p.onPick();}} disabled={p.busy} aria-pressed={choosingPoint} style={{padding:"10px 8px",flex:1,border:choosingPoint?"2px solid #92d8ff":"2px solid #6198cb",background:choosingPoint?"#126a9c":"#234f78",color:"#fff",fontWeight:700,borderRadius:6,cursor:p.busy?"not-allowed":"pointer",boxShadow:choosingPoint?"0 0 0 2px #7ad4ff55":"none"}}>{choosingPoint ? (language==="de"?"âž¤ Jetzt Bohrstelle anklicken":"âž¤ Click a new hole position") : t.repick}</button><button type="button" onClick={p.onCreate} disabled={!valid||!p.result?.allowed||p.busy} style={{padding:8,flex:1,background:p.result?.allowed?"#b88a27":"#666",color:"white",borderRadius:5}}>{p.busy?t.busy:t.create}</button></div>
  </div>}
 </aside>;
}
