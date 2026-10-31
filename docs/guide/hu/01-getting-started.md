---
title: Első lépések
summary: Az üres laptól az első 3D-nyomtatható alkatrészig, öt perc alatt, fiók és telepítés nélkül.
---

A layerling egy 3D nyomtatáshoz készült tervezőprogram, amely közvetlenül a böngésződben fut. Egyszerű alakzatokból építesz fel egy alkatrészt, lyukakat vágsz bele, lekerekíted az éleit, és elküldöd a szeletelődnek. Nincs mit telepíteni, és nem kell regisztrálni. Amit építesz, a gépeden marad.

![A layerling kezdőlapja: felül „Új 3D terv létrehozása”, alatta a terveid és a rövid útmutató.](shot:start-page)

## Terv létrehozása

Nyisd meg a [layerling.com](https://layerling.com/) oldalt. A kezdőlapon kattints az {{ui:dashboard.createDesign}} gombra. Megnyílik a szerkesztő egy üres munkasíkkal: ez az a rács, amelyen minden elkészül.

Ha már van egy fájlod, amellyel folytatnád, használd a {{ui:dashboard.importGeometry}} lehetőséget. Ez layerling tervekkel (`.lyl`) és STL, OBJ, 3MF, STEP vagy SVG fájlokkal is működik.

A terveid később előnézeti képpel jelennek meg a kezdőlapon. A böngésződ tárolójában maradnak, és minden változtatás után automatikusan mentődnek, ezért nincs mentés gomb. Hogy hogyan csomagolhatsz terveket fájlba és adhatod tovább őket, azt a [Fájlok és mentés](chapter:files-and-saving) fejezet írja le. Ha emlékeztetőt szeretnél, kapcsold be a beállításokban (a szalagon lévő fogaskerék) a {{ui:workspace.confirmTabClose}} opciót: a böngésző ilyenkor rákérdez, mielőtt egy nyitott tervet tartalmazó lapot bezárnál vagy újratöltenél.

## A szerkesztő egy pillantással

![A szerkesztő két alakzattal a munkasíkon. Felül a szalag, balra a kameravezérlők, jobbra a kijelölt alakzat beállításai.](shot:editor-overview)

- **Felül** van a szalag. Feladatok szerint van rendezve: {{ui:editor.group.clipboard}}, {{ui:editor.group.history}}, {{ui:editor.group.shapes}}, {{ui:editor.group.visibility}}, {{ui:editor.group.combine}}, {{ui:editor.group.modify}}, {{ui:editor.group.arrange}}, {{ui:editor.group.file}} és {{ui:editor.group.help}}. Ha egy ikon fölé viszed az egeret, látod a nevét. Ahol egy kis kérdőjelet látsz, például egy alakzat beállításainál, az alakzattárban vagy az eszközpaneleken, az egyenesen ennek az útmutatónak a megfelelő fejezetéhez visz.
- **Középen** van a munkasík. Itt helyezed el az alakzatokat, itt alakítod őket, és itt látod az eredményt.
- **Jobbra** jelennek meg a kijelölt alakzat beállításai: szín, méretek, helyzet és minden, ami még az alakzathoz tartozik. A számok begépelése pontosabb, mint a húzás.
- **Balra** vannak a kameravezérlők, fölöttük a nézetkocka. Ezekkel mozogsz a jelenetben, bővebben a [Nézet és munkasík](chapter:view-and-workplane) fejezetben.
- **Legfelül** váltasz a {{ui:editor.modeGeometry}} és a {{ui:editor.modeSketch}} között, itt nevezed át a tervet, és itt választod ki a nyelvet és a színsémát.

## A munkaterület körüli gombok

Vidd az egeret egy gomb fölé, és látod a nevét. Ha nem vagy biztos benne, mit csinál egy gomb, kattints a {{ui:editor.group.help}} területen az {{ui:interactiveHelp.title}} gombra ([[Shift]]+[[F1]]), majd a gombra. Itt vannak azok, amelyekről a legtöbbször kérdeznek.

### Beillesztés

{{ui:editor.tool.paste}} ([[Ctrl]]+[[V]]) beteszi a tervbe, amit a {{ui:editor.tool.copy}} gombbal másoltál. A {{ui:common.duplicate}} egy lépésben másol és beilleszt.

### Törlés

{{ui:common.delete}} ([[Delete]]) eltávolítja a kijelölt alakzatokat. A {{ui:editor.tool.undo}} visszahozza őket.

### Csoportbontás

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) a kijelölt csoportot újra szétszedi azokra az alakzatokra, amelyekből készült.

### Munkaterület beállításai

{{ui:editor.workspaceSettings}} megnyitja a munkaterület beállításait: mértékegység, a lap mérete, nyomtató, rács, színek, fény és más. Bővebben a [Nézet és munkasík](chapter:view-and-workplane) fejezetben.

### Téma

{{ui:common.theme}} egészen fent azt választja ki, hogyan néz ki a layerling: a rendszeredhez igazodva, világos, sötét vagy grafit.

### Terv átnevezése

{{ui:editor.renameProject}}: a ceruza a név mellett egészen fent. Írd be az új nevet, és nyomd meg az [[Enter]] billentyűt.

### A terv neve

A terv neve ({{ui:confirm.projectName}}) egészen fent áll. Kattints rá, írj, és az [[Enter]] megtartja a nevet.

### Láthatósági beállítások

{{ui:editor.visibilityOptions}}, a szem melletti nyíl, azt tartalmazza, amit megjeleníthetsz vagy elrejthetsz: az objektumlistát, mindent, amit elrejtettél, a jegyzeteket és a nyomtatás túlnyúlásait. Bővebben a [Kijelölés és elrendezés](chapter:select-and-arrange) fejezetben.

### Kijelöltek elrejtése

{{ui:editor.tool.hideSelected}} ([[Ctrl]]+[[H]]) elrejti a kijelölt alakzatokat. A tervben és az objektumlistában megmaradnak; a {{ui:editor.visibilityOptions}} újra megmutatja őket.

### Parancsok keresése

{{ui:palette.open}}: írd be, amit keresel, egy eszközt, egy alakzatot vagy egy beállítást, és kattints az eredményre.

### Kameravezérlők elrejtése

{{ui:camera.hide}} összecsukja a bal oldali kameravezérlőt, és több helyet ad a munkaterületnek; a {{ui:camera.show}} visszahozza.

### Illesztőrács

{{ui:inspector.snapGrid}} a tulajdonságok alján az a lépés, amelyhez az áthelyezés és az átméretezés igazodik. Mellette a kis **mm | in** kapcsoló váltja a mértékegységet. Bővebben a [Nézet és munkasík](chapter:view-and-workplane) fejezetben.

### Mértékegység: milliméter vagy hüvelyk

A {{ui:inspector.snapGrid}} melletti **mm | in** kapcsoló átváltja a mértékegységet, a lap rácsát és a rögzítési lépést ennél a tervnél.

### Az oldal alja

Az ablak alján: a {{ui:dashboard.sponsor}} arra az oldalra vezet, ahol támogathatod a projektet; a {{ui:dashboard.userGuide}} megnyitja ezt az útmutatót; a {{ui:dashboard.forum}} a kérdések, ötletek és hibajelentések helyére vezet (a GitHub-beszélgetésekre, németül a drucktipps3d fórumára); a {{ui:editor.bugReport}} ZIP-et készít a hibajelentéshez; a {{ui:dashboard.projectOnGitHub}} a projekthez vezet a GitHubon, a verziószám pedig megnyitja a kiadási jegyzeteket. A impresszumra és az adatvédelemre mutató hivatkozások azé, aki a használt layerling-példányt üzemelteti.

## Az első alkatrészed

Példaként egy lyukas kockát építünk.

1. Kattints a szalagon az {{ui:editor.addShape}} gombra, és válaszd a {{ui:shape.box}} alakzatot. Az alakzat most az egérmutatódon lóg. Egy kattintás a munkasíkon leteszi.
2. Jobbra állítsd be a méreteket, például 40 mm hosszú, 40 mm széles és 20 mm magas.
3. Ugyanígy tegyél a közepére egy {{ui:shape.cylinder}} alakzatot, 14 mm átmérővel és 30 mm magasan. Legyen magasabb a kockánál, hogy teljesen átérjen rajta.
4. Jelöld ki a hengert, és kattints jobbra a {{ui:inspector.hole}} gombra. Áttetsző lesz: a tömör testből anyagot elvevő szerszám lett.
5. Jelöld ki mindkét alakzatot, és kattints a {{ui:editor.tool.group}} gombra. A kockán most lyuk van.

![A henger lyuk, és kilóg a kocka tetejéből.](shot:hole-before)

![Csoportosítás után a kockában furat van.](shot:hole-after)

Így készülnek a furatok, hornyok és zsebek. A [Tömör testek és lyukak](chapter:solids-and-holes) fejezet részletesen elmagyarázza.

## Újdonságok a legutóbbi látogatásod óta

Ha egy frissítés után újra megnyitod a layerlinget, a kezdőlapon egy kártya felsorolja, mi került be azóta, hogy utoljára itt jártál: minden azóta megjelent verziót, a legújabbal kezdve. Hosszabb távollét után a kártyán belül görgethetsz lefelé. Alattuk a {{ui:whatsNew.earlier}} a legutóbbi látogatásod előtti verziókat is hozzáadja. Az {{ui:whatsNew.dismiss}} gombbal bezárod, és a következő frissítésig nem jelenik meg. A kezdőlap láblécében a {{ui:whatsNew.footerLink}} bármikor újra megmutatja a legutóbbi újdonságokat. A böngésző megjegyzi az utoljára látott verziót, és rólad semmi sem hagyja el.

A layerling saját gépen vagy szerveren futó példányán a „Frissítés érhető el” értesítésben van egy {{ui:update.previewShow}} gomb, amely telepítés előtt felsorolja, mit hoz a frissítés. A listát csak akkor tölti le a GitHubról, amikor megnyomod a gombot.

## A tervtől a nyomtatásig

Ha kész az alkatrészed, kattints az {{ui:editor.export}} gombra, válaszd az STL vagy a 3MF formátumot, és töltsd le a fájlt. Nyisd meg a szeletelődben, például a Bambu Studióban, a PrusaSlicerben, az OrcaSlicerben vagy a Curában. Ha a beállításokban kiválasztod a nyomtatódat, már építés közben látod, hogy az alkatrész elfér-e a tárgyasztalon. Bővebben a [Nyomtatás](chapter:printing) fejezetben.

> **Tipp:** Ha a Tinkercadből jössz, gyorsan eligazodsz: a tárgyasztal, az alakzatok, a tömör test és a lyuk, a csoportosítás, az igazítás és a tükrözés szinte ugyanúgy működik. Ami új, az főleg az élletörés és a lekerekítés, a kiüregelés, a menetek és a vázlatok. A saját Tinkercad-terveidet is áthozhatod, lásd [Fájlok, mentés és megosztás](chapter:files-and-saving).
