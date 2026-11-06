---
title: Előkészítés 3D nyomtatásra
summary: A saját nyomtatód kiválasztása, figyelmeztetés, ha valami nem fér el, és az alkatrész helyes fektetése.
---

## A nyomtatód kiválasztása

Nyisd meg a beállításokat (a fogaskerék a címsorban, {{ui:editor.workspaceSettings}}), és válts a {{ui:workspace.workplane}} részre. A {{ui:workspace.printer}} alatt egy több mint 230 elterjedt modellt tartalmazó listából választod ki a nyomtatódat, köztük Bambu Lab, Prusa, Creality, Anycubic, Elegoo és sok más gyártó gépeit.

![A munkasík beállításai kiválasztott nyomtatóval. A tárgyasztal és a legnagyobb nyomtatási magasság a szeletelőprofilból származik.](shot:settings-workplane)

Három dolog történik:

- A munkasík felveszi a tárgyasztal méretét.
- A munkasík sarkában megjelenik a nyomtató neve és a nyomtatási tere. Ha a felirat zavar, kapcsold ki a {{ui:workspace.workplane}} alatt a {{ui:workspace.showPlateLabels}} kapcsolóval; ez a terv bal elöl lévő nevére is vonatkozik.
- A layerling **figyelmeztet**, ha valami nem fér el.

A nyomtatóprofilok az OrcaSlicerből származnak, így ugyanazok, amelyeket a szeletelőd is ismer. Ha inkább nyomtató nélkül dolgoznál, válaszd a {{ui:workspace.printerNone}} lehetőséget. A munkasík méretét kézzel is beállíthatod.

A delta nyomtatók, például az FLSun vagy a SeeMeCNC gépei vagy az Anycubic Predator, kerek tárgyasztalra nyomtatnak. Ezekkel a munkafelület is kerek, olyan széles, mint a tárgyasztal, és egy test túl nagy, amint túlnyúlik a peremen. Egy kerek testet a saját körvonala alapján mér a program, nem a köré írt doboz alapján, így egy majdnem asztalnyi széles henger is elfér.

## Ha valami nem fér el

Egy test, amely túlnyúlik a tárgyasztal szélén, jelölést kap. Egy üzenet megmondja, mely oldalakon és mennyivel lóg ki. Ugyanez történik, ha az alkatrész **túl magas**: a magasság a legalsó testtől számít, ahogy a szeletelő is leteszi a modellt.

![A doboz szélesebb, mint a Bambu Lab A1 mini tárgyasztala. Az alul lévő üzenet megmondja, mennyivel.](shot:printer-overhang)

A figyelmeztetés nem akadályoz meg abban, hogy tovább dolgozz. Csak jelzés, hogy ne a szeletelőben derüljön ki, hogy az alkatrész túl nagy. Egy túl nagy alkatrész gyakran kettévágható: vágd ketté a {{ui:editor.tool.split}} paranccsal, és nyomtasd ki a két felét külön.

## Az alkatrész helyes fektetése

Hogy egy alkatrész hogyan fekszik a tárgyasztalon, az dönti el az erősségét és a kinézetét. Az {{ui:editor.group.arrange}} terület két eszköze segít:

- {{ui:editor.tool.layFlat}}: kattints egy lapra, és az alkatrész azzal az oldalával lefelé fekszik. A legjobb nyomtatási irány egy kattintással.
- {{ui:editor.tool.dropToWorkplane}} ([[D]]): a munkasíkra teszi az alkatrészt, ha valahol a levegőben lebeg.

Néhány ökölszabály az irányhoz:

- A nagy sík lapok kerüljenek alulra. Azok tapadnak a legjobban.
- A hosszú, terhelt alkatrészeket úgy fektesd, hogy a rétegek ne a terhelésre merőlegesen fussanak. A rétegek mentén a leggyengébb az alkatrész.
- Kerüld a 45°-nál meredekebb túlnyúlásokat, vagy adj nekik támaszt a szeletelőben.

## Túlnyúlások keresése

A szem melletti menüben ({{ui:editor.group.visibility}}) a **Túlnyúlások mutatása** bekapcsolja a túlnyúlások jelölését. Minden olyan lap, amely 45°-nál meredekebben néz lefelé, ilyenkor piros-fehér sraffozást kap – ott kellene a nyomtatónak támasz. Ami a tárgyasztalon nyugszik, az jelöletlen marad. Így már tervezés közben látod, hogy egy gömb, egy boltív vagy egy vízszintes lyuk kinyomtatható-e támasz nélkül; a [csepp alakú lyuk](chapter:threads-and-mechanics) pont erre való. Fordítsd el az alkatrészt, vagy fektesd egy másik lapjára a {{ui:editor.tool.layFlat}} paranccsal, és a sraffozás azonnal követi.

Hogy a nyomtatód milyen meredeket bír, azt a beállításokban a {{ui:workspace.appearance}} alatt adod meg: 30°-tól (óvatos) 70°-ig (jó alkatrészhűtésű nyomtatókhoz). Egy másik testen nyugvó lap is jelölést kap – a layerling csak magát a lapot nézi.

## Falvastagság, hézag és letörések

- A falak legyenek legalább két extrudálási vonal szélesek, vagyis 0,4 mm-es fúvókánál 0,8 mm. Az erős alkatrészeknek 1,2–2 mm kell.
- Ahol két alkatrész egymásba illeszkedik, hézag kell: általában 0,2–0,4 mm, a nyomtatótól függően. Mielőtt a nagy alkatrészt kinyomtatnád, készíts egy kis próbapárt.
- Sokan enyhén letörik a tárgyasztalon ülő alsó élt. Így az első réteg nem terül szét („elefántláb”).

## A nyomtatód hézaga: az illesztési próba

Minden nyomtató egy kicsit kisebbre nyomtatja a furatokat és egy kicsit vastagabbra a csapokat, mint ahogy rajzolva vannak, mindegyik a maga mértékével, így a két nyomtatott alkatrész közé kellő hézag eleinte csak tipp. Inkább mérd meg egyszer: a beállításokban, a(z) {{ui:workspace.workplane}} alatt a(z) {{ui:workspace.fitTestMake}} illesztési próbát tesz a tárgyasztalra. Ez egy 60 × 20 × 4 mm-es lap hét furattal egyetlen 5 mm-es csaphoz, mindegyik 5 mm plusz kétszer 0,05, 0,10, 0,15, 0,20, 0,25, 0,30 vagy 0,40 mm méretre rajzolva, mellette kiemelkedő számmal, és maga az 5 mm-es csap, amely a lap mellett áll, a tetején kis letöréssel. Közönséges formákból áll, így a tárgyasztal többi részével együtt nyomtatható, támasz nélkül.

Nyomtasd ki úgy, ahogy fekszik, aztán told a csapot letört végével előre a furatokba, a legszűkebbel kezdve. **A legszűkebb furat, amelyben a csap még forog,** adja meg a nyomtatód hézagát. Írd be a számát a(z) {{ui:workspace.printerPlay}} mezőbe, vagy kattints rá a mező alatti értékek között. A hézag oldalanként értendő, milliméterben, és a böngésző minden tervhez megőrzi; az üres mező azt jelenti, hogy nincs megmérve.

Ettől kezdve az új használatok a beépített érték helyett ebből a hézagból indulnak: a(z) {{ui:lid.gap}} és a(z) {{ui:lid.hingePinPlay}} a(z) {{ui:editor.tool.lid}} eszközben, egy új {{ui:shape.dovetail}} és {{ui:shape.snapFit}} hézaga, egy új anya vagy menetes furat {{ui:prop.clearance}} értéke – a hézag kétszerese, mert az a teljes átmérőre jutó hely –, valamint a(z) {{ui:clearance.threshold}} a(z) {{ui:editor.tool.clearance}} eszközben. Ugyanígy a(z) {{ui:editor.tool.split}} eszköz csapjainak {{ui:split.connectorClearance}} értéke is. Amíg egy ilyen mező még ezt az értéket tartja, a mellette álló „{{ui:printerPlay.fromFitTest}}” megmondja, honnan jön a szám. Az egyben nyomtatott zsanér és a(z) {{ui:editor.tool.flexi}} eszköz ízületei megtartják a 0,4 mm-t: egy darabban nyomtatva a réseiknek a rétegek között is nyitva kell maradniuk, ezt pedig egy külön nyomtatott csap nem méri. A mágnes vagy Gridfinity-kulcs bepréseléséhez szükséges hely és a megvásárolt aljzatnak vagy lapnak hagyott hely is megtartja a saját értékét. A tervben már meglévő testek sosem változnak, és az a terv sem, amelyet megnyitsz.

## A nyomtatás ellenőrzése

A {{ui:editor.tool.printCheck}} a {{ui:editor.group.combine}} csoportban, a {{ui:editor.tool.clearance}} mellett megnézi a kijelölt objektumokat, vagy ha nincs kijelölés, az összes láthatót, és egy ablakban megmondja, mi romlana el nyomtatáskor. Öt sora közül az zöld, amelyik nem talált semmit, és narancssárga, azzal együtt, hogy mit és hol, amelyik talált:

- **{{ui:printCheck.thin.title}}**: a fúvóka két vonalánál vékonyabb helyek - 0,4 mm-es fúvókánál 0,8 mm. A szeletelő az ilyen falat kihagyja, vagy egyetlen gyenge vonalként nyomtatja ki. Az ablak tetején, a {{ui:printCheck.nozzle}} résznél válaszd ki a fúvókádat (0,2-től 0,8-ig egy kattintással, bármely mást a mezőben). A vékony helyeket a testeken piros színnel, világos ráccsal jelöli, a sor pedig megadja a legvékonyabb helyet és azt, mekkora felület túl vékony. Az 1 mm²-nél kisebb helyek és az éles élek, például egy ék éle, kimaradnak.
- **{{ui:printCheck.floating.title}}**: egy test vagy egy test különálló része, amely sem a tálcához, sem más alkatrészhez nem ér hozzá (0,05 mm-en belül). A levegőben nyomtatódna. Az az alkatrész, amely egy álló alkatrészen fekszik, rendben van.
- **{{ui:printCheck.contact.title}}**: a tálcán álló alkatrész, amelynek első rétege a magasságához képest nagyon kicsi, például egy gömb vagy egy hegyén álló kúp. Nyomtatás közben leválhat. A figyelmeztetés 0,5 mm² alatti talpfelületnél jelenik meg magasságmilliméterenként, a tálca felett 0,1 mm-rel mérve: egy gömb mindig ez alatt van, egy 10 mm-es kocka 10-et ad.
- **{{ui:printCheck.overhang.title}}**: ugyanazok a számok, mint a **Túlnyúlások mutatása** esetén, az ott beállított szöggel.
- **{{ui:printCheck.openMesh.title}}**: importált háló nyitott élekkel, vagy olyan élekkel, amelyeken három vagy több lap osztozik. A szeletelőnek ilyenkor találgatnia kell, hol van a belseje.

![Egy tálca, amelynek jobb fala csak 0,6 mm vastag: a nyomtatás ellenőrzése pirosra festi, és megnevezi az ablakban.](shot:print-check)

Egy sor {{ui:printCheck.show}} gombja odaviszi a kamerát; kijelöli a lebegő alkatrészeket, a kevés felületen állókat és a nyitott hálókat, a túlnyúlásoknál pedig bekapcsolja a **Túlnyúlások mutatása** nézetet. Az egymásba érő testeket egyesítve ellenőrzi, ahogy a szeletelő is egyesíti őket. Ha az ablak nyitva van, miközben a tervet módosítod, megjelenik a {{ui:printCheck.stale}} felirat; kattints rá vagy a {{ui:printCheck.checkAgain}} gombra. Az [[Esc]] bezárja az ablakot. A tervben semmi sem változik. Egy MI ugyanezt az ellenőrzést a `layerling_check_print` eszközzel végzi.

## Ha kész vagy

Válaszd az {{ui:editor.export}} lehetőséget, majd az **STL** vagy a **3MF** formátumot. Az STL a legegyszerűbb formátum. A 3MF megtartja az egyes testek nevét és színét, ezért hasznos, ha több színnel nyomtatsz. Az exportálási ablak azt is mutatja, hány gramm és méter filament kellene az alkatrészhez tömören nyomtatva. Bővebben a [Fájlok és mentés](chapter:files-and-saving) fejezetben.
