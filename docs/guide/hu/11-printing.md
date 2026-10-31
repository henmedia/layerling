---
title: Előkészítés 3D nyomtatásra
summary: A saját nyomtatód kiválasztása, figyelmeztetés, ha valami nem fér el, és az alkatrész helyes fektetése.
---

## A nyomtatód kiválasztása

Nyisd meg a beállításokat (a fogaskerék a szalagon, {{ui:editor.workspaceSettings}}), és válts a {{ui:workspace.workplane}} részre. A {{ui:workspace.printer}} alatt egy több mint 230 elterjedt modellt tartalmazó listából választod ki a nyomtatódat, köztük Bambu Lab, Prusa, Creality, Anycubic, Elegoo és sok más gyártó gépeit.

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

## Ha kész vagy

Válaszd az {{ui:editor.export}} lehetőséget, majd az **STL** vagy a **3MF** formátumot. Az STL a legegyszerűbb formátum. A 3MF megtartja az egyes testek nevét és színét, ezért hasznos, ha több színnel nyomtatsz. Az exportálási ablak azt is mutatja, hány gramm és méter filament kellene az alkatrészhez tömören nyomtatva. Bővebben a [Fájlok és mentés](chapter:files-and-saving) fejezetben.
