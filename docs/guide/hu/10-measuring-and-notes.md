---
title: Mérés és jegyzetek
summary: Mérőszalag, vonalzó és derékszögvonalzó, távolságok az origótól, egy alkatrészhez rögzített jegyzetek és referenciapontok, amelyekhez a dolgok illeszkednek.
---

Egy alkatrész pontos megépítéséhez mérni kell. A layerlingben erre több eszköz van. Egyik sem kerül bele az exportba. A falvastagságot és az alkatrészen belüli réseket legjobb a [metszeti nézetben](chapter:view-and-workplane) mérni a {{ui:camera.sectionMeasure}} eszközzel.

## A mérőszalag

A mérőszalag a bal szélen lévő kamerasáv alsó végén van ({{ui:camera.tapeTools}}). Sarkok, élek és lapok közötti távolságokat mér. Rákattintva öt gomb nyílik meg. Ha eltakarják, amit mérnél, húzd őket a bal oldali fogónál fogva bárhová a munkasíkon; a fogóra dupla kattintás visszateszi őket:

![A mérőszalag a gombjaival: mérés hozzáadása, mérési pontok mozgatása, mérés eltávolítása, teljes élek, minden mérés törlése.](shot:tape-menu)

1. **{{ui:camera.addMeasurement}}:** Kattints egy pontra, húzd a következőig, és kattints rá. A távolság felirattal jelenik meg, előtte a tengelyekkel, amelyek mentén halad: X, Y vagy Z egyenesnél, XY, XZ vagy YZ egy síkon át, 3D mindhárom esetén. Vidd a mutatót a felirat fölé, és látod, mennyit nyúlik a mérés az egyes tengelyek mentén; egy pont fölött a koordinátáit. A második pont elhelyezése közben a tengelyek, a távolság és az egyes tengelyek menti kiterjedés a mutató mellett látszik. Az a mérés, amely nagyrészt egy másik test mögött van, halványabb lesz; ha a vonala vagy a felirata fölé viszed a mutatót, újra teljesen látszik.
2. **{{ui:camera.moveMeasurement}}:** Fogd meg a pontokat, és mozgasd őket, a szám követi.
3. **{{ui:camera.deleteMeasurement}}:** Utána kattints egy mérésre, hogy eltávolítsd.
4. **{{ui:camera.tapeWholeEdges}}:** Egy élre kattintva az egészet méri, például egy kör kerületét. Ha ez ki van kapcsolva, a kattintás ehelyett egy pontot tesz az élre, a második pont pedig bárhová kerülhet, így az átmérőt vagy bármilyen más távolságot mérheted. Az [[Alt]] egy kattintás erejéig megfordítja a kapcsolót. Körön az elsővel szemközti pont beugrik, amikor a mutató a közelébe ér, és a pontok a valódi körön ülnek, így az átmérő pontosan jön ki.
5. **{{ui:camera.deleteAllMeasurements}}:** Egyszerre eltávolít minden mérést. Mivel ez nem vonható vissza, a layerling előbb rákérdez; ha nincs mérés, nincs mit tenni.
6. **{{ui:camera.tapeMarkMiddle}}:** Minden mérés közepén egy kis kerek jel ül, az alsó fele kitöltve. [Referenciapontot](#referenciapontok) tesz a mérés közepére: egy kerek élre, például egy lyuk peremére kattintva annak a körnek a középpontjába – importált hálón is, ahol semmi más nem jelöli egy lyuk közepét –, átmérőnél vagy bármilyen egyenes mérésnél pedig a felénél. Az az alakzat, amelyet ezután húzol, a középpontjával a ponthoz illeszkedik. Egy már meglévő pontot nem készít el kétszer. A mérőszalag úgy illeszkedik egy referenciaponthoz, mint egy sarokhoz, így egy kör középpontjától vagy egy vonal közepétől is mérhetsz: jelöld meg, majd kattints a pontra.
7. **{{ui:camera.tapeTypeLength}}:** Ha egy egyenes mérés legalább egyik vége egy testen van, a száma rákattintható. Írj be új hosszt, és nyomd meg az [[Enter]] billentyűt: a második pontnál lévő test a mért vonal mentén addig mozdul, amíg a távolság pontosan ennyi nem lesz, mint a Tinkercad vonalzójánál. Ha csak az első pontnál lévő test van kijelölve, az mozdul. A mérési pontok a testen maradnak, így a mérés követi. Mérj sarokból, élről vagy [referenciapontból](#referenciapontok), például egy kör közepéből, hogy az alkatrészeket pontos távolságra tedd.

Az [[Esc]] kilép a mérés módból.

## A vonalzó

A {{ui:shape.ruler}} alakzatot az alakzattárból veszed elő. Tisztán mérőeszköz: egyik exportban sem jelenik meg, és nem csoportosítható és nem vágható. Minden testnél, amely hozzáér a vonalzóhoz vagy átfed vele, lebegő számként közvetlenül a nézetben mutatja a kiterjedést. Ezt a számot ott helyben megváltoztathatod, és a test követi. A lebegő plusz jel másolatot készít a mért alakzatról. A rányomott skála milliméterben van; ha az egységet hüvelykre kapcsolod (a jobb alsó kapcsoló), hüvelykben jelenik meg, minden tizenhatod hüvelykhez egy vonással és megszámozott egész hüvelykekkel.

## A derékszögvonalzó

Néha derékszögben jobban mérsz. Kattints a kamerasávon a {{ui:camera.cornerRulerTool}} gombra, majd a munkasíkra. Oda egy derékszögvonalzó kerül két, egymásra merőleges szárral, osztásokkal, mint egy asztalos derékszögön. Ennek sincs saját teste. Ha egy test sarka közelébe kattintasz, a sarka pontosan oda illeszkedik.

A derékszögvonalzó a munkasíkon fekszik. Ha az egy test oldalán van, a derékszögvonalzó is azon az oldalon fekszik, lásd a [Nézet és munkasík](chapter:view-and-workplane) fejezetet. Így méretezel egy függőleges falon: tedd a munkasíkot a falra, helyezd a derékszögvonalzót a bal felső sarkára, és kattints a fogantyúra, amíg a szárak jobbra és lefelé nem mutatnak.

- **A fogantyú húzása** mozgatja.
- **Egy rövid kattintás a fogantyúra** 90°-kal elforgatja.
- **A mellette lévő ×** eltávolítja.
- **A fogantyútól balra lévő kis gomb** azt váltja, honnan mér: egy test külső oldalától (végpont, vonalas ikon) vagy a közepétől (középpont, célkereszt). Minden zöld szám mellett egy ugyanilyen kis kapcsoló van, amely csak azt a számot állítja: egy álló hengernél a két szárban a közepet, magasságban az alját, egy fekvőnél keresztben a közepet, hosszában az egyik végét. Ha mindhárom újra egyezik, a fogantyúnál lévő gomb a közös módot mutatja.

Ha testek állnak valamelyik szárnál, a derékszögvonalzó automatikusan mutatja a méreteiket. Ez csak az alaplapon működik, egy test oldalán nem. A derékszögvonalzó fogantyúja alatti nyilas gomb ezt kikapcsolja, így csak a kijelölt testek mutatják a méreteiket; a tervvel együtt mentődik.

Ha kijelölsz egy testet, a derékszögvonalzó zölddel mutatja, milyen messze van a saroktól, mindkét szár mentén és magasságban. Egy zöld számra kattintva távolságot gépelhetsz be, és a test pontosan oda mozdul. Több kijelölt testnél ezek egynek számítanak: a vonalzó a közös körvonalukat méri, egy begépelt érték pedig együtt mozgatja őket anélkül, hogy az egymáshoz viszonyított helyzetük megváltozna.

Középpontnál a zöld számok a test közepéig számolnak, magasságban is. Így egy gömböt a középpontjával pontosan 15 mm-re helyezel egy éltől, a sugár levonása nélkül. Egy falon egy lyukat így helyezel el balról 40, felülről 190 mm-re: jelöld ki a lyukat, válts középpontra, gépeld be a 40-et és a 190-et. A magasság ott a faltól kifelé számol.

A mérőszalag és a derékszögvonalzó is a helyén marad, amíg vázlatot készítesz, és visszatér a 3D nézetbe. Egyik sem kerül az előzményekbe. A derékszögvonalzó a tervvel együtt mentődik, és a mérőszalag mérései is, a böngészőben és a .lyl fájlban: a terv megnyitásakor újra ott vannak. A mérőszalag gombjai közötti szem gomb elrejti az összes mérést, és újra megmutatja őket; az is mentődik, hogy el vannak-e rejtve, és mérés felvétele, mozgatása vagy törlése előtt újra megjelennek.

## Távolságok az origótól és mozgatás közben

A beállításokban a {{ui:workspace.appearance}} alatt két kapcsoló van az élő méretekhez:

- A {{ui:workspace.showMoveDimensions}} húzás közben mutatja, mennyit mozdulsz.
- Az {{ui:workspace.showOriginDimensions}} a kijelölés távolságait mutatja a tárgyasztal origójától, több kijelölt testnél is.

A {{ui:workspace.dimensionsAlwaysVisible}} beállítással a méretek állandóan láthatók maradnak.

## Jegyzetek

Egy jegyzet azt rögzíti, amit a geometria nem mond el: „Ez a csavar 0,3 mm-rel túl szoros”, „a fedelet még ki kell nyomtatni”, „méret Pétertől”. A {{ui:editor.tool.note}} gombbal vagy az [[N]] billentyűvel helyezel el egyet.

- Ha a jegyzetet **egy testre** teszed, vele együtt utazik.
- Ha **mellé** teszed, a munkasíkon marad ({{ui:note.free}}).
- A {{ui:note.detach}} leválasztja a testről a hozzá csatolt jegyzetet.
- A {{ui:editor.tool.group}} a csatolt jegyzetet is beviszi a csoportba; a {{ui:editor.tool.ungroup}} az alatta lévő látható részhez adja tovább, akár egy belső csoporthoz is. Amíg egy csoport a {{ui:group.edit}} gombbal nyitva van, a jegyzetei az alattuk lévő résszel együtt mozognak, és a {{ui:group.done}} gombbal visszakerülnek a csoporthoz; a megszakítás visszaállítja őket az eredeti állapotukba.
- Ha a testét törlöd, vagy már nincs alatta látható test, a jegyzet ott marad, ahol volt, a munkasíkon.
- A tűt húzva a jegyzet elmozdul. Egy kattintás a tűre összecsukja a kártyát, csak a kis szám marad; egy újabb kattintás újra kinyitja. A szövegbe kattintva szerkesztheted.
- Írás közben az [[Enter]] megtartja a szöveget, az [[Esc]] visszaállítja olyanra, amilyen az írás megkezdése előtt volt; a [[Shift]]+[[Enter]] új sort kezd.
- **Vázlatban** is elhelyez egy jegyzetet a {{ui:editor.tool.note}} (a {{ui:editor.group.manage}} alatt) vagy az [[N]], bárhol a vázlaton. A vázlat összes jegyzete a vázlat testéhez tartozik: a 3D nézetben rajta ülnek, a {{ui:sketch.extrude}} vagy {{ui:sketch.sweep}} művelettel készült test tetején és a {{ui:sketch.revolve}} művelettel készült test megrajzolt profilján, és vele együtt mozognak. Ha újra megnyitod a vázlatot, megmutatja a test jegyzeteit, a 3D-ben elhelyezetteket is. A vázlatban a {{ui:sketch.undo}} egy jegyzetet ugyanúgy visszavon, mint egy vonalat, a {{ui:sketch.cancel}} pedig elveti, amit a jegyzeteken módosítottál. A [[Shift]]+[[N]] itt is megjeleníti vagy elrejti a jegyzeteket.

A jegyzetek a tervben mentődnek, egyik exportban sem jelennek meg, és a {{ui:visibility.notes}} (a {{ui:editor.visibilityOptions}} alatt, a szem ikon melletti nyílnál) kapcsolóval vagy a [[Shift]]+[[N]] billentyűkkel megjeleníthetők vagy elrejthetők.

## Referenciapontok

A referenciapont egy puszta jel a térben, mint egy ceruzajel vagy egy kijelölő pont a műhelyben: egyik testhez sem tartozik, sosem nyomtatódik ki, és más dolgok illeszkednek hozzá. Kattints jobb gombbal egy testre, és válaszd az {{ui:contextMenu.markCenter}}, az {{ui:contextMenu.markCorners}} vagy az {{ui:contextMenu.markMidpoints}} lehetőséget: a pontok a test felső lapján jelennek meg (a teljes kijelölésén, ha többet jelöltél ki). {{ui:contextMenu.markFaceCenter}} ehelyett annak a sík lapnak a közepére tesz egyet, amelyre jobb gombbal kattintottál, például egy oldalon vagy egy végén.

- Húzással mozgatsz egy pontot, vagy rákattintva megnézheted a koordinátáit, és újakat gépelhetsz be; a beállított mértékegységet használják. Minden kártya a címénél fogva elhúzható, ha eltakar valamit, önállóan: a többi a helyén marad, a címre dupla kattintás pedig visszateszi. Az utoljára megérintett kártya áll a többi előtt. Egy kártyán vagy a jobb gombos menüben a **Mind törlése** egyszerre minden pontot töröl. A {{ui:common.delete}} eltávolítja.
- A mérőszalag is meg tud jelölni egy pontot: az {{ui:camera.tapeMarkMiddle}}, a mérés közepén ülő, félig kitöltött jel a közepére tesz egyet, például egy kerek lyuk középpontjába. És egy ponttól is mér: a szalag úgy illeszkedik a referenciapontokhoz, mint a sarkokhoz.
- Amikor egy alakzatot húzol, az élei és a közepe úgy illeszkednek egy ponthoz, ahogy más alakzatokhoz ({{ui:workspace.objectSnap}}). A derékszögvonalzó is illeszkedik a pontokhoz.
- A pontok a tervben mentődnek, egyik exportban sem jelennek meg, és a jegyzetekkel együtt a {{ui:visibility.notes}} ([[Shift]]+[[N]]) kapcsolóval jeleníthetők meg vagy rejthetők el.
- Egy MI a `layerling_add_reference_points`, a `layerling_list_reference_points` és a `layerling_remove_reference_points` paranccsal jelölheti meg, sorolhatja fel és távolíthatja el őket.

## Mintaképek

A mintakép egy kép, amelyhez a részeket igazíthatod: tedd egy áramköri lap fotóját a doboza aljára, és pontosan rá helyezd a távtartókat, a furatokat és a csatlakozók kivágásait. Segédlet, nem test: sosem nyomtatódik ki, sosem exportálódik (STL, 3MF, OBJ, STEP, SVG), sosem lesz része csoportnak, kötegnek vagy vágásnak, és a nyomtatási becslés sem számol vele.

- Nyisd meg az {{ui:editor.import}} ablakot, és válaszd a {{ui:import.referenceImage}} lehetőséget, majd egy PNG, JPG, WebP, GIF vagy BMP képet. A munkasíkra kerül - a tárgyasztalra vagy arra a felületre, amelyre a munkasíkot tetted -, a hosszabbik oldala 100 mm, félig átlátszó.
- A fogantyúival úgy mozgatod, forgatod és méretezed, mint bármelyik alakzatot. Az előtte lévő testet választja ki először, így ha rajta dolgozol, nem a képet fogod meg véletlenül.
- A beállításaiban az {{ui:referenceImage.seeThrough}} a teljesen láthatótól az alig látszóig halványítja.
- A {{ui:referenceImage.calibrate}} a valódi méretére állítja, mint a vázlatban: kattints a képen két pontra, amelyek valódi távolságát ismered - például a lap két rögzítőfuratára -, és írd be ezt a távolságot a {{ui:referenceImage.distance}} mezőbe. A kép megtartja az arányait és a közepét.
- A beállításai fejlécében lévő lakattal zárold, és a helyén marad: a kattintások átmennek rajta a tárgyasztalra. Feloldáshoz az objektumlistában válaszd ki újra.
- A kép egyszer kerül a tervfájlba, akárhányszor másolod vagy vonod vissza. Egy nagy kép ennyivel nagyobbá teszi a fájlt; hozzáadáskor az üzenet megmondja a méretét.
- Egy MI a `layerling_reference_image` segítségével ad hozzá, mozgat, kalibrál, halványít és zárol egyet.
