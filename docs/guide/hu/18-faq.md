---
title: Gyakori kérdések
summary: Rövid válaszok a leggyakoribb kérdésekre a mentésről, a nagy modellekről, a lekerekítésekről, az MI-ről és a nyomtatásról, mindegyik a részletes magyarázathoz vezető úttal.
contents: questions
---

Minden válasz rövid, és a végén megadja, hol magyarázza el részletesen ez az útmutató. A fent lévő keresőmező egy kérdést bármelyik benne lévő szó alapján megtalál.

## Mentés és biztonsági másolatok

### Hol tárolódnak a terveim, és van felhő?

A saját számítógépeden lévő böngészőben. Nincs fiók és nincs felhő, semmi sem töltődik fel, és minden változtatás magától mentődik. Aki a layerlinget saját szerveren futtatja, ott egy közös mappában is tarthat terveket.

Bővebben: [Hol vannak a terveid](chapter:files-and-saving#hol-vannak-a-terveid)

### Eltűntek a terveim. Mi történt?

A tervek egy számítógép egyetlen böngészőjében vannak. Eltűnnek, ha a böngészőben törölték az oldal adatait, és másik böngészőben vagy másik számítógépen nem jelennek meg. A Safari Macen, iPhone-on és iPaden hét látogatás nélküli nap után törli egy oldal adatait, kivéve, ha a layerling alkalmazásként van telepítve. Ha van biztonsági mentésed, a kezdőlapon a {{ui:dashboard.restoreBackup}} visszahozza a terveket a mappáikkal és képeikkel együtt.

Bővebben: [A terveid, a te biztonsági mentésed](chapter:files-and-saving#a-terveid-a-te-biztonsagi-mentesed)

### Hogyan menthetek el mindent, akár magától egy mappába is?

A kezdőlapon a {{ui:dashboard.backupAll}} az összes tervet egyetlen ZIP-fájlba csomagolja. Emellett a layerling magától megőrzi minden terv korábbi változatait, és Chrome-ban és Edge-ben mindegyiket .lyl-fájlként egy általad választott mappába is tudja írni. A böngészőben tárolt változatok a böngésző adataival együtt eltűnnek, ezért nem helyettesítik sem a ZIP-et, sem a mappát.

Bővebben: [Korábbi változatok](chapter:files-and-saving#korabbi-valtozatok)

### Hogyan vihetek át egy tervet másik számítógépre vagy böngészőbe?

Mentsd az exportablakban .lyl-fájlként, és nyisd meg ezt a fájlt a másik számítógépen a kezdőlapról. Ha az összes tervet egyszerre akarod átvinni, itt használd a {{ui:dashboard.backupAll}}, ott pedig a {{ui:dashboard.restoreBackup}} gombot; a már meglévő tervek nem kerülnek be még egyszer.

Bővebben: [Biztonsági mentés és továbbadás](chapter:files-and-saving#biztonsagi-mentes-es-tovabbadas)

### Mi történik, ha törlöm a böngésző adatait?

Az abban a böngészőben tárolt tervek törlődnek, és azok a korábbi változatok is, amelyeket a layerling ott őrzött. A {{ui:dashboard.backupAll}} által készített ZIP, a .lyl-fájljaid és a lemezeden lévő mentési mappa érintetlen marad. Először ments, aztán törölj.

Bővebben: [A terveid, a te biztonsági mentésed](chapter:files-and-saving#a-terveid-a-te-biztonsagi-mentesed)

### Hogyan térhetek vissza egy korábbi állapothoz?

A visszavonás lépésről lépésre halad visszafelé. Az előzménynézet egy csúszkával minden lépést megmutat anélkül, hogy a tervet módosítaná, és bármelyikből új tervet tud készíteni. Ha a ma reggeli vagy a múlt heti állapot kell, a korábbi változatok listája egy régi változatot új tervként nyit meg, a jelenlegit pedig úgy hagyja, ahogy van.

Bővebben: [Visszatekintés: az előzménynézet](chapter:select-and-arrange#visszatekintes-az-elozmenynezet) és [Korábbi változatok](chapter:files-and-saving#korabbi-valtozatok)

### Kerülhet az STL és a 3MF egyenesen a projektmappámba? És hogyan kapok megint letöltést?

Chrome-ban és Edge-ben egy terv első exportja megkérdezi, hova mentsen, a későbbi exportok pedig kérdés nélkül ugyanabba a fájlba írnak. A Firefox és a Safari mindig letölt. Ha minden alkalommal letöltést szeretnél, kapcsold be a beállításokban ezt: {{ui:workspace.stlAsDownload}}.

Bővebben: [Exportálás](chapter:files-and-saving#exportalas)

### Bezárult a mentési ablak, de nincs fájl. Miért?

Azt az ablakot, amelyet a böngésző nem tudott használni, ugyanúgy jelzi, mint azt, amelyet te vetettél el, és a víruskereső által letiltott fájlt sem lehet kiírni. A fent megjelenő üzenet ekkor felajánlja ezt: {{ui:status.saveAsDownload}}, amely a fájlt a letöltéseid közé teszi. Ha az ablakot teljesen ki akarod hagyni, kapcsold be a beállításokban ezeket: {{ui:workspace.lylAsDownload}} és {{ui:workspace.stlAsDownload}}.

Bővebben: [Biztonsági mentés és továbbadás](chapter:files-and-saving#biztonsagi-mentes-es-tovabbadas)

## Telepítés és frissítések

### Van letölthető alkalmazás?

A layerling a böngészőből telepíthető: ekkor saját ikonja és ablaka van, és hálózat nélkül is elindul. Letölthető telepítőprogram nincs, és az eredeti csak a layerling.com-on található. **Ne tölts le és ne futtass „layerling” telepítőt semmilyen más oldalról:** nem a layerlingtől származik, és kártevőt tartalmazhat. Saját példány futtatásához Windowshoz gyors indítás, valamint Docker-image áll rendelkezésre.

Bővebben: [Telepítés alkalmazásként](chapter:offline-and-install#telepites-alkalmazaskent) és [Saját üzemeltetés](chapter:offline-and-install#sajat-uezemeltetes)

### Működik a layerling internet nélkül?

Igen, az első látogatás után hálózat nélkül is elindul, legjobb alkalmazásként telepítve. Egy dolog csak akkor töltődik be, amikor először szükség van rá: a CAD-mag az első STEP-exporthoz, körülbelül 22 MB.

Bővebben: [Telepítés alkalmazásként](chapter:offline-and-install#telepites-alkalmazaskent)

### Hogyan kapok frissítést?

Magától. A nyitott oldal észreveszi az új változatot, és megjelenít egy kártyát az újdonságokkal; a {{ui:newVersion.reload}} először elmenti a nyitott tervet, majd betölti az új változatot. Az újabb változatot a kezdőlap is jelzi.

Bővebben: [Frissítések](chapter:offline-and-install#frissitesek)

### Mely böngészők és táblagépek működnek?

A Chrome, az Edge, a Firefox és a Safari számítógépen, táblagépen vagy telefonon; a 3D nézethez WebGL kell. Néhány dolgot csak a Chrome és az Edge tud: a saját fájljaidba és mappáidba írást, a mentési mappát és a .lyl-fájlok dupla kattintással való megnyitását. Táblagépen az ujj azt teszi, amit a bal egérgomb.

Bővebben: [Ujjak és érintőtoll](chapter:tablet-and-touch#fingers-and-a-stylus)

## MI

### Hogyan állíthatok be egy MI-t a legegyszerűbben?

Adj egy olyan MI-nek, amely a számítógépeden tud dolgozni, a `https://github.com/henmedia/layerling` címet, és kérd meg, hogy állítsa be neked a layerlinget az MCP-szerverével együtt. Ehhez egy program kell, például a Claude alkalmazás Code lapja, a Claude Code, a Codex, az Antigravity vagy a Gemini CLI. Windowshoz és Machez az útmutató a lépéseket egyenként is leírja.

Bővebben: [Lépésről lépésre kezdőknek](chapter:ai-with-mcp#lepesrol-lepesre-kezdoknek)

### Miért nem éri el az MI a layerling.com-ot?

Az MI és a szerkesztő közötti híd csak a layerling olyan példányában létezik, amely a saját számítógépeden fut. A layerling.com-on mindig ki van kapcsolva, egy böngészőbeli chat pedig semmit sem tud telepíteni. Az MI-nek ezért helyben elindított layerlingre és MCP-t ismerő programra van szüksége.

Bővebben: [Beállítás](chapter:ai-with-mcp#beallitas)

### Melyik MI működik, és mennyibe kerül?

Bármely program, amely ismeri az MCP-t; az útmutató a Claude-ot, a Codexet, a Geminit és az Antigravityt írja le. Maga a layerling semmibe sem kerül. Az MI árát a szolgáltatója határozza meg: a Claude alkalmazás Code lapja például a fizetős Claude-csomagok része.

Bővebben: [Beállítás](chapter:ai-with-mcp#beallitas)

### Milyen adatok jutnak el az MI szolgáltatójához?

Az, amit az MI beolvas: a nyitott terv objektumai és az általa a nézetről készített képek. Ezek ugyanúgy az MI-programod szolgáltatójához kerülnek, mint minden más, amit ott beírsz. Maga a híd a számítógépeden fut, és MI nélkül semmi sem hagyja el.

Bővebben: [Mit tud az MI](chapter:ai-with-mcp#mit-tud-az-mi)

## Memória, sebesség és előzmények

### Miért lassul le a layerling az STL-emmel?

Az STL háromszögekből álló háló, és egy nagyon nagy háló lelassítja a szerkesztőt, sok memóriát foglal, és lassítja a mentést. A layerling ezt importálás után jelzi, ha egy hálóban legalább 400 000 háromszög van, vagy az egész tervben egymillió. Először egyszerűsítsd a hálót, csak a szükséges részeket importáld, vagy építsd meg az alkatrészt a layerling saját alakzataiból.

Bővebben: [Nagy hálók](chapter:files-and-saving#nagy-halok)

### Miért hiányoznak lépések az előzményeimből?

Két dolog rövidíti le. A {{ui:workspace.savedHistory}} beállítás tervenként 100 lépést tart meg, amíg meg nem változtatod, a régebbiek pedig elvesznek. És ha egy terv túl nagy ahhoz, hogy a teljes előzményeivel mentse, a layerling a lépések felével menti el, aztán megint a felével, és ezt közli veled. Maga a terv mindig teljes egészében mentődik.

Bővebben: [Mentett előzmények](chapter:view-and-workplane#mentett-elozmenyek)

### Mit tegyek, ha betelt a böngésző tárhelye?

Ne zárd be és ne töltsd újra a lapot: a legújabb változtatásaid csak ott vannak meg. Először őrizz meg egy másolatot .lyl-exporttal. Aztán szabadíts fel helyet: törölj lépéseket az előzménynézetben, távolítsd el a már nem szükséges terveket, vagy mentsd el őket, és töröld.

Bővebben: [A terveid, a te biztonsági mentésed](chapter:files-and-saving#a-terveid-a-te-biztonsagi-mentesed)

### Túl nagy a tervem a mentéshez. Mit tegyek?

Az előzményei és a hálói együtt túl sok helyet foglalnak. A layerling már kevesebb előzménylépéssel is megpróbálta, mielőtt ezt jelezte. Töröld az előzményeket az előzménynézetben, egyszerűsítsd a legnehezebb importált hálókat, vagy ments .lyl-t csak a jelenlegi állapottal.

Bővebben: [Biztonsági mentés és továbbadás](chapter:files-and-saving#biztonsagi-mentes-es-tovabbadas) és [Importált háló egyszerűsítése](chapter:files-and-saving#importalt-halo-egyszerusitese)

### Elfogyott a böngésző memóriája. Mi segít?

Ez milliónyi háromszögből álló hálóknál fordul elő, amikor egyetlen lépéshez több memória kell, mint amennyit egy böngészőlap kap. Csökkentsd az importált hálók háromszögeit ezzel: {{ui:editor.tool.simplify}}, zárd be a többi lapot, és próbáld újra. Ha mentés közben történik, a rövidebb előzmények is segítenek.

Bővebben: [Nagy hálók](chapter:files-and-saving#nagy-halok)

### Egy terv nagyon lassan vagy egyáltalán nem nyílik meg. Mit tehetek?

Többnyire a visszavonási lépések előzményei nőttek nagyon nagyra. A kezdőlapon a terv menüjében a {{ui:dashboard.openWithoutHistory}} csak a jelenlegi állapotot olvassa be; a korábbi lépéseket végleg törli, ezért ha meg akarod tartani őket, előbb készíts biztonsági mentést a tervről. A biztonsági másolatokból származó korábbi változat új tervként nyílik meg.

Bővebben: [Biztonsági mentés és továbbadás](chapter:files-and-saving#biztonsagi-mentes-es-tovabbadas)

### Akadozik a layerling. Mely beállítások segítenek?

A beállításokban a {{ui:workspace.fastMode}} kikapcsolja az árnyékokat, minden test élvonalait és a kamera tehetetlenségét, és a nézetet csak a képernyő felbontásában rajzolja. Ellenőrizd, hogy a böngésző a videokártyát használja-e: a `chrome://gpu` vagy az `edge://gpu` oldalon a WebGL mellett „Hardware accelerated” kell, hogy álljon. A másik gyakori ok a nagy importált hálók.

Bővebben: [Ha a layerling lassúnak tűnik](chapter:view-and-workplane#ha-a-layerling-lassunak-tunik)

### A szerkesztő megáll vagy sokáig számol. Várjak, vagy töltsem újra?

Először várj. A vágásokat, csoportokat és élmunkákat a háttérben számolja, és közben ez látható: {{ui:status.computing}}; a hosszú feladatok, például a kivájás, maguktól leállnak egy üzenettel, és semmit sem változtatnak. Ha a CAD-magot újra kellett indítani, az üzenet ezt közli, és nem kell újratölteni. Az újratöltés biztonságos, mert minden változtatás magától mentődik, egy kivétellel: amíg a piros figyelmeztetés látszik ({{ui:notice.designNotSavedTitle}}), előbb exportálj egy .lyl-t.

Bővebben: [Ha a layerling lassúnak tűnik](chapter:view-and-workplane#ha-a-layerling-lassunak-tunik)

### A 3D nézet üres marad, vagy egy üzenet szerint nem tudott elindulni. Mit tegyek?

A böngésző nem tudta elindítani a WebGL-t, amely a 3D nézetet rajzolja. Az ok a böngészőben vagy a videokártya illesztőprogramjában van, nem a tervedben, és a tárolt terveid nem törlődnek. Zárd be a többi 3D tartalmú lapot, és indítsd újra a böngészőt, kapcsold be a hardveres gyorsítást, engedélyezd a WebGL-t, ha egy adatvédelmi beállítás vagy bővítmény blokkolja, és frissítsd a böngészőt és a videokártya illesztőprogramját. Gyors próba egy másik böngésző.

Bővebben: [Ha a layerling lassúnak tűnik](chapter:view-and-workplane#ha-a-layerling-lassunak-tunik)

## Importált modellek

### „Háló egyszerűsítése” vagy „Pontossá tétel”: melyiket válasszam?

A {{ui:editor.tool.simplify}} a háromszögek egy részét tartja meg, így a nehéz modell könnyebb lesz; háló marad. A {{ui:editor.tool.makeExact}} a síkokból, hengerekből, kúpokból és gömbökből álló modellt valódi CAD-testként építi újra, így a lekerekítések és letörések tiszta éleket követnek, a STEP-export pedig valódi lapokat tartalmaz. Legfeljebb 400 000 háromszöget fogad; egy figura vagy szkennelés háló marad. Nagy műszaki alkatrésznél: először egyszerűsítsd, bekapcsolva ezt: {{ui:simplify.keepEdges}}, majd tedd pontossá.

Bővebben: [Importált háló egyszerűsítése](chapter:files-and-saving#importalt-halo-egyszerusitese) és [Importált háló pontossá tétele](chapter:files-and-saving#importalt-halo-pontossa-tetele)

### Miért nem sikerül egy vágás, vagy miért „nem zárt” a hálóm?

Egy testet csak akkor lehet vágni, ha a felülete zárt. Ha egy importált hálóban rések vannak, a layerling megnevezi az alkatrészt és a nyitott élek számát, és kihagyja. A kis lyukakat maga zárja be; a nagyobbakat abban a programban kell kijavítani, amelyből a modell származik, vagy egy hálójavító eszközben. A nyomtatási ellenőrzés megmutatja, melyik test nyitott.

Bővebben: [A nyomtatás ellenőrzése](chapter:printing#a-nyomtatas-ellenorzese)

### Hogyan importáljak helyesen egy SVG-t?

Az SVG 4 mm magas vázlattestként érkezik, és a pontjai vázlatmódban módosíthatók. Importálás előtt írd be az importablakba a szélességet milliméterben; szám nélkül megtartja a saját méretét. Az önmagukat keresztező körvonalakból nem lehet test, ezért kimaradnak, és a program megszámolja őket: a rajzprogramban egyesítsd az átfedő darabokat, zárd be a körvonalakat, majd importáld újra.

Bővebben: [Importálás](chapter:files-and-saving#importalas)

## Lekerekítések és letörések

### Miért nem alkalmazható egy lekerekítés?

Többnyire túl nagy az adott helyhez: belefutna a szomszédos lapokba, vagy az él szűkebben kanyarodik, mint a sugár. Sokszor elég egy-két milliméterrel kevesebb, és hegyes szögeknél a lekerekítésnek több hely kell, mint amit a sugara sejtet. Ha az éleket nem lehet együtt lekerekíteni, vegyél egyszerre kevesebbet; az útban lévő él pirossal jelenik meg. A {{ui:edge.findLargest}} megkeresi helyetted a méretet.

Bővebben: [Élek letörése és lekerekítése](chapter:edges-and-hollowing#elek-letoerese-es-lekerekitese)

### Miért tűntek el a lekerekítéseim, miután módosítottam a vázlatot?

A {{ui:inspector.editSketch}} után a test újraépül, és új élei lesznek. A layerling a lekerekítéseket és letöréseket újra ráteszi azokra az élekre, amelyek ott vannak, ahol a régiek voltak, feltéve, hogy a testnek ugyanannyi éle van, mint korábban. Ha eggyel több vagy kevesebb a sarok, kimaradnak, és az üzenet megmondja, hány maradt ki. A visszavonás mindent visszahoz.

Bővebben: [Test készítése belőle](chapter:sketches#test-keszitese-belole)

### Miért nem tudom kiválasztani egy importált modell egyes éleit?

Az STL, az OBJ és a 3MF csak háromszögeket hoz magával, az éleszközök pedig legfeljebb 4 000 háromszögből álló hálókon működnek. A {{ui:editor.tool.makeExact}} egy műszaki alkatrészből valódi CAD-testet készít, amelyen egy furatnak egyetlen kerek pereme van, amelyet a lekerekítés követni tud. A STEP-fájl eleve pontos geometriát hoz.

Bővebben: [Importált háló pontossá tétele](chapter:files-and-saving#importalt-halo-pontossa-tetele)

## Csoportok, lyukak és méretek

### Miért lesznek oválisak a lyukak, amikor megnyújtok egy csoportot?

Az átméretezett csoport mindent megnyújt, ami benne van, mintha gumira lenne rajzolva. A csoport beállításaiban a {{ui:inspector.groupResize}} pontnál válaszd ezt: {{ui:inspector.groupResizeKeepParts}}. Az egész csoporton átérő részek megnyúlnak, a lyukak és a kis részek pedig megtartják a méretüket és a közelebbi oldaltól mért távolságukat.

Bővebben: [Csoport átméretezése: a lyukak és kis részek megmaradnak](chapter:solids-and-holes#csoport-atmeretezese-a-lyukak-es-kis-reszek-megmaradnak)

### Miért nem sikerül a csoportosítás, vagy miért vannak rések az eredményben?

Vagy valamelyik rész nem zárt, ezt az üzenet meg is nevezi, vagy két rész majdnem összeér, de valójában nem érinti egymást. Bontsd fel a csoportot, igazítsd pontosan egymáshoz a részeket, vagy változtass kicsit egy méreten vagy pozíción, és csoportosíts újra. Az importált hálók vágásának határát meghaladó, nagyon sűrű hálókat egyáltalán nem egyesíti.

Bővebben: [Csoportosítás](chapter:solids-and-holes#csoportositas)

### Hogyan módosíthatok egyetlen részt egy csoporton belül?

Jelöld ki a csoportot, és nyomd meg az [[E]] billentyűt, vagy kattints rá duplán. A részek ekkor külön vannak, és módosíthatók; a befejezéskor a csoport újraépül. Az egész csoportra tett lekerekítések és letörések az újraépítéskor elvesznek.

Bővebben: [Csoport szerkesztése](chapter:solids-and-holes#csoport-szerkesztese)

### Hogyan hozhatok vissza egy részt egy korábbi állapotból?

Nyisd meg az előzménynézetet, húzd a csúszkát arra az állapotra, amelyben a rész még megvolt, kattints a részre, és válaszd ezt: {{ui:historyView.bringBack}}. A jelenlegi tervbe egy másolat kerül, olyan, amilyen volt, és ott, ahol volt, a nevében az időponttal.

Bővebben: [Visszatekintés: az előzménynézet](chapter:select-and-arrange#visszatekintes-az-elozmenynezet)

## Nyomtatás és exportálás

### STL, 3MF, OBJ vagy STEP: melyiket válasszam?

A nyomtatóhoz 3MF vagy STL. A 3MF minden testet névvel és színnel ellátott részként őriz meg; az STL egyetlen háló egyetlen színben. Az OBJ is viszi a színeket. A STEP más CAD-programoknak való: a pontos geometriát tartalmazza a lekerekítésekkel és letörésekkel együtt.

Bővebben: [Exportálás](chapter:files-and-saving#exportalas)

### Hogyan jutnak el a színeim a szeletelőbe?

Exportálj 3MF-et. Minden test megtartja a színét, a több színnel festett testnél pedig a festés a lapokon marad. A Bambu Studio és az OrcaSlicer megnyitáskor megkérdezi, hogyan rendelje a színeket a filamentjeidhez.

Bővebben: [Festés több színben](chapter:shapes#festes-toebb-szinben)

### Nem illenek egymásba az alkatrészeim. Mekkora hézag kell nekik?

Általában 0,2–0,4 mm, a nyomtatótól függően. Az illesztési próba megméri: nyomtasd ki a hét lyukas kis lapot, keresd meg a legszűkebb lyukat, amelyben a csap még forog, és ezt az értéket add meg a nyomtatód hézagaként. Az új fedelek, fecskefarkak és menetek ezután ebből indulnak ki.

Bővebben: [A nyomtatód hézaga: az illesztési próba](chapter:printing#a-nyomtatod-hezaga-az-illesztesi-proba)

### Miért mondja a layerling, hogy egy alkatrész nem fér el a nyomtatóban?

Az alkatrész túlnyúlik a tárgyasztal szélén, vagy magasabb, mint amit a kiválasztott nyomtató nyomtatni tud. Ez csak egy figyelmeztetés, és bezárható. Válaszd ki a nyomtatódat a beállításokban, vagy vágd szét a túl nagy alkatrészt ezzel: {{ui:editor.tool.split}}.

Bővebben: [Ha valami nem fér el](chapter:printing#ha-valami-nem-fer-el)

## A layerlingről

### Ingyenes a layerling, és eladhatom, amit benne tervezek?

A layerling az AGPL-3.0 licenc alatt kiadott szabad szoftver, fiók nélkül. A licenc a programra vonatkozik: aki módosítja a layerlinget, és hálózaton keresztül mások rendelkezésére bocsátja, annak a forráskódot is elérhetővé kell tennie. Az általad készített modellekre nem szab feltételeket. Az importált betűtípusok és modellek megtartják a saját licencüket.

Ha szeretnéd támogatni a projektet, egy [kis adomány](support:) segít a szerver és a fejlesztés költségeiben. Önkéntes, és a layerlingben semmi sem függ tőle.

Bővebben: [Saját üzemeltetés](chapter:offline-and-install#sajat-uezemeltetes)

### Hogyan jelenthetek hibát, vagy kérhetek valamit?

A láblécben lévő {{ui:editor.bugReport}} egy ZIP-et ment a tervvel és egy rövid szöveggel a verzióról és a böngészőről; személyes adat nincs benne. Csatold a fórumon vagy a GitHub beszélgetéseiben. Mindkét helyen szívesen látják a kérdéseket és kéréseket.

Bővebben: [Hiba jelentése](chapter:files-and-saving#hiba-jelentese) és [Segítség és visszajelzés](chapter:offline-and-install#segitseg-es-visszajelzes)
