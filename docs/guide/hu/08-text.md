---
title: Szöveg és íves feliratok
summary: Kiemelt vagy bemélyített felirat hét betűtípusban vagy egy saját betűtípussal, ha kell, körív mentén, például egy érmén, fedélen vagy gyűrűn.
---

## Szöveg hozzáadása

Válaszd az alakzattárban a {{ui:shape.text}} alakzatot, és helyezd el. Jobbra a {{ui:prop.text}} mezőbe írd be, mi álljon rajta. Az alatta lévő beállítások:

- **{{ui:prop.font}}:** Hét betűtípus érhető el: Multilanguage, Sans, Serif, Script, Monospace, Rounded és Stencil (egyenes vonalakból álló betűk). Az új szöveg Sans betűtípussal indul. Az ékezetes betűk, mint az á, ö, ő, ü, ű, é és az € jel, minden betűtípusban megvannak. Ezeken felül saját betűtípusokat is használhatsz, lásd lent a [Saját betűtípusok](#sajat-betutipusok) részt.
- **{{ui:nameTag.letterSize}}:** Milyen nagyok a betűk felülről nézve; a {{ui:prop.height}} azt adja meg, milyen vastagok.
- **{{ui:prop.height}}:** Milyen messze áll ki a felirat a felületből.
- **{{ui:prop.bevel}}:** Lekerekíti a betűk éleit, hogy lágyabbnak tűnjenek. A {{ui:prop.segments}} értékkel döntöd el, hány lépésben.
- **{{ui:nameTag.letterEdge}}:** lekerekíti vagy letöri a betűk felső élét, ahogy egy névtáblán: {{ui:nameTag.edge.none}}, {{ui:nameTag.edge.round}} vagy {{ui:nameTag.edge.chamfer}}, a {{ui:nameTag.letterEdgeSize}} értékkel (kezdetben 0,4 mm, legfeljebb olyan magas, mint a szöveg). Tovább megy, mint a {{ui:prop.bevel}}, de csak addig, amíg a vonások szélesek: ahol egy vonás vékonyabb a méret kétszeresénél, az él keskenyebb tetőben végződik. Az alja lapos marad, így az egyes betűk utólag felragaszthatók. Amíg egy él ki van választva, az a {{ui:prop.bevel}} helyét veszi át.
- **Méret:** A sor hosszát és szélességét úgy állítod, mint bármely alakzatnál. Húzd a fogantyúkat, vagy gépeld be a méreteket.

A szöveg kezdetben egyetlen test. Ha a betűket egyenként kezelnéd, kattints a {{ui:inspector.separateParts}} gombra. Ekkor minden betű önálló alakzat lesz.

A szöveg élei is letörhetők vagy lekerekíthetők, egyenes és íves szövegnél egyaránt, lásd az [Élek letörése és testek kiüregelése](chapter:edges-and-hollowing) fejezetet. Kis méreteket használj, például 0,2–0,5 mm-t, mert a betűk vonalai keskenyek.

## Saját betűtípusok

A hét beépített betűtípus mellett bármilyen saját betűtípust használhatsz: egy betűtípusfájlt a számítógépedről, vagy Chrome-ban és Edge-ben egy a számítógépedre telepített betűtípust. Válaszd a {{ui:prop.font}} lista alján a {{ui:font.manage}} lehetőséget. Megnyílik a {{ui:font.title}} ablak.

- A **{{ui:font.addFile}}** TrueType (`.ttf`), OpenType (`.otf`) vagy WOFF (`.woff`) fájlt fogad. A fájlt egyszerűen az ablakba is húzhatod.
- **Windowson** a telepített betűtípusok a Betűtípusok mappában vannak (`C:\Windows\Fonts`). A böngésző fájlválasztó ablaka ezt elrejti. Nyisd meg inkább a Fájlkezelőben, és húzd a betűtípust a {{ui:font.title}} ablakba. A csak a te felhasználódra telepített betűtípusok a `%LOCALAPPDATA%\Microsoft\Windows\Fonts` mappában vannak, ezt a fájlválasztó ablak is mutatja. Macen a betűtípusok a `/Library/Fonts` és a `~/Library/Fonts` mappában vannak.
- A **{{ui:font.fromSystem}}** felsorolja a számítógépedre telepített betűtípusokat. Az első alkalommal a böngésző megkérdezi, hogy a layerling beolvashatja-e őket. A keresőmező gyorsan megtalál egy betűtípust, egy kattintás kiválasztja.

Ha egy szöveg ki van jelölve, azonnal megkapja az új betűtípust. Különben a betűtípus a {{ui:prop.font}} alatt a {{ui:font.customGroup}} csoportban jelenik meg, és az ablakban a {{ui:font.use}} gomb a kijelölt szövegekre teszi. A saját betűtípusok úgy működnek, mint a beépítettek: a körív menti szöveg, az élek letörése és lekerekítése és a STEP-export ugyanúgy működik. Azokat a betűket, amelyek egy betűtípusból hiányoznak, a Sans-ból veszi.

### Arab és héber

Az arab, a perzsa, az urdu és a héber jobbról balra íródik: az első betű jobbra áll, egy vegyes szövegben, például „Name عربي”, pedig csak az arab szó fut visszafelé, a számjegyek a szokásos módon maradnak. Az arab betűk úgy kapcsolódnak a szomszédaikhoz, ahogy az írás megkívánja, a lám-alif pedig ligatúra lesz. Ehhez olyan betűtípus kell, amelyben ezek a betűk megvannak; a beépítettekben nincsenek. Adj hozzá egy sajátot, például Windowson az Arialt, a Tahomát vagy a Segoe UI-t, vagy egy ingyeneset, mint a Noto Naskh Arabic, a Noto Sans Arabic vagy az Amiri. A magánhangzójelek arra a betűre kerülnek, amelyhez tartoznak. A körív menti szöveg, a körvonal, a sziluett, a rétegek és a névcímkék ugyanúgy működnek vele, mint bármely más szöveggel.

### Mi működik melyik böngészőben

| Böngésző | Betűtípusfájl kiválasztása | Betűtípus a számítógépről |
| --- | --- | --- |
| Chrome és Edge számítógépen, a telepített layerling alkalmazás is | igen | igen, miután a böngésző rákérdez |
| Firefox | igen | nem |
| Safari Macen | igen | nem |
| Táblagép és telefon | igen, az eszköz fájljai közül | nem |

A weboldalak nem olvashatják be csak úgy a telepített betűtípusokat. Csak a Chrome-nak és az Edge-nek van erre engedélye, és csak biztonságos oldalakon, `https`-en keresztül, mint a layerling.com-on. Ha a layerling `http`-n fut, mondjuk a saját szervereden vagy Docker-telepítésként az otthoni hálózatodban, a {{ui:font.fromSystem}} hiányzik; ilyenkor húzd át a betűtípust a Fájlkezelőből. A többi böngészőben a betűtípusfájlt a betűtípusok mappájából választod ki, ugyanazzal az eredménnyel. Ha a Chrome-ban vagy az Edge-ben elutasítottad a kérdést, engedélyezd újra a webhely beállításaiban, a cím bal oldalán lévő lakat mögött.

A layerling nem tudja olvasni a WOFF2 fájlokat (szinte mindig van TTF vagy OTF változat), a betűtípus-gyűjteményeket (`.ttc`, több betűtípus egy fájlban) és a színes emoji betűtípusokat. A nagyon nagy betűtípusokból, például a kínaiakból a layerling az első 8000 karaktert veszi át. A változó betűtípusokat az alapbeállításukban olvassa be, ez általában a normál vastagság.

Egyes betűtípusok, főleg a kézírásos és a változó betűtípusok, egy betűt egymást átfedő vonalakból rajzolnak. A layerling a betűtípus beolvasásakor ezeket egyetlen tiszta körvonallá egyesíti, így a test nyomtatható marad. Az ilyen betűk ezután görbék helyett nagyon rövid egyenes darabokból állnak; ez nem látszik.

### Hol tárolódnak a betűtípusok

Egy saját betűtípus **ebben a böngészőben, ezen a számítógépen** marad. Egy másik böngésző vagy számítógép addig nem ismeri, amíg ott is hozzá nem adod. A böngésző webhelyadatainak törlése a betűtípusokat is törli. A {{ui:font.title}} ablakban a kuka eltávolít egy betűtípust a böngészőből. A terveid ettől semmit sem veszítenek, ahogy a következő rész mutatja.

### Saját betűtípusos tervek továbbadása

Egy terv **nem tárolja a betűtípusfájlt**, csak a szövegeiben használt betűk körvonalait, az előzmények korábbi lépéseiben lévőkét is. Ha egy szövegben „Szia” áll, csak az S, a z, az i és az a utazik vele. Ez minden mentési módra érvényes: a böngészőben, a saját szervereden, `.lyl` fájlként és a {{ui:myShapes.title}} között is.

Tehát:

- **A terv bárhol helyesen nyílik meg**, olyan számítógépen is, ahol nincs meg a betűtípus. A szövegek ugyanúgy néznek ki, és mozgathatók, forgathatók, méretezhetők és lekerekíthetők.
- **Az új betűkhöz kell a betűtípus.** Ha valaki, akinél nincs meg a betűtípus, olyan betűt gépel, amelyet a terv nem hozott magával, a layerling a Sans-ból rajzolja meg. A {{ui:prop.font}} alatt a betűtípus ilyenkor {{ui:font.fromDesign}} jelölést kap. A betűtípusfájl hozzáadása minden betűt visszahoz.
- **Az exportok csak geometriát tartalmaznak.** Az STL, a 3MF, az OBJ, a STEP és az SVG testeket és körvonalakat tartalmaz, betűtípust nem.
- **A régebbi layerling-verziók** még nem ismerik a saját betűtípusokat, és az ilyen szövegeket Multilanguage betűtípussal rajzolják.

**Licencek:** A betűtípusokat szerzői jog védi, és a licencük mondja meg, mit tehetsz velük. A beágyazott betűkörvonalak ugyanazok, amelyeket a PDF-fájlok is magukkal visznek egy betűtípusból, és a legtöbb licenc ezt megengedi. Egyes kereskedelmi betűtípusok viszont még egyes betűk továbbadását is tiltják. Mielőtt egy saját betűtípusos tervet továbbadsz vagy közzéteszel, nézd meg a betűtípus licencét. Az ingyenes betűtípusok, például a Google Fonts betűtípusai (többnyire SIL Open Font License alatt), gond nélkül továbbadhatók. Egy kinyomtatott alkatrésznél vagy egy exportált STL-nél ez nem számít: ezekben már nincs betűtípus, csak geometria.

## Kiemelt vagy bemélyített

- **Kiemelt:** Tedd a szöveget a felületre, és csoportosítsd a testtel. Domborműként nő ki belőle.
- **Bemélyített:** Állítsd a szöveget {{ui:inspector.hole}} típusúra, hagyd, hogy kicsit belenyúljon a felületbe, és csoportosítsd a testtel. A betűk ekkor bemélyednek.

Egy oldallapon lévő felirathoz előbb tedd a munkasíkot arra a lapra, lásd a [Nézet és munkasík](chapter:view-and-workplane) fejezetet.

## Körvonal, sziluett és szélesebb

Egy szöveget nem kell kitöltött betűkként felépíteni. A tulajdonságok között a {{ui:prop.textFill}} ugyanazt a választékot kínálja, mint a Tinkercad:

- **{{ui:prop.textFill.filled}}:** a betűk úgy, ahogy vannak.
- **{{ui:prop.textFill.outline}}:** egy vonal a betűk körvonala mentén, félig azon belül, félig kívül.
- **{{ui:prop.textFill.outer}}:** egy vonal a betűk külső oldalán körben.
- **{{ui:prop.textFill.inner}}:** egy vonal a betűk belső oldalán.

Ha vonalat választottál, közvetlenül a lista alatt két beállítás jelenik meg: a {{ui:prop.sketchLineWidth}} adja meg, milyen vastag a vonal, a {{ui:sketch.strokeJoin}} pedig azt, hogyan fordul a sarkoknál ({{ui:sketch.strokeJoin.round}}, {{ui:sketch.strokeJoin.bevel}} vagy {{ui:sketch.strokeJoin.miter}}). A ritkább beállítások a {{ui:inspector.more}} alatt vannak: a {{ui:prop.sketchSilhouette}} kihagyja a lyukakat az O, az A vagy az e betűben, a {{ui:prop.textWider}} pedig kitöltve hagyja a betűket, és körben a vonalvastagsággal vastagabbá teszi őket; az egymáshoz érő betűk egy darabbá nőnek össze.

Külső vonalnál, középre igazított vonalnál vagy a „Szélesebb” beállításnál a szöveg doboza nő, a betűk viszont megtartják a méretüket. A {{ui:prop.bevel}} és a {{ui:prop.segments}} csak kitöltött betűknél létezik.

## Rétegek és névcímkék

Egy többszínű nyomtatáshoz készült névcímke rétegekből álló szöveg: felül a betűk, alattuk ugyanaz a szöveg kicsit szélesebben egy második színben, legalul pedig egy lyukak nélküli lap egy harmadikban. A layerling egy kattintással elkészíti:

- **Új névcímke:** válaszd az alakzattárban a {{ui:shape.nameTag}} alakzatot, és helyezd el. Fehér betűkkel „Név” áll rajta, piros szegélyen és sötét lapon.
- **Szövegből:** jelöld ki a szöveget, és kattints a beállításai tetején a {{ui:nameTag.makeLayers}} gombra.

A címke összes beállítása a beállítások tetején lévő {{ui:nameTag.title}} kártyán van:

- **{{ui:prop.text}}** és **{{ui:prop.font}}**, saját betűtípusokkal is. A címke a szavakkal együtt nő.
- **{{ui:nameTag.letterSize}}:** milyen magasak a nagybetűk, mm-ben. Minden réteg követi, és egy vonalban marad.
- **{{ui:nameTag.layers}}:** rétegenként egy sor, fentről lefelé. Minden sorban ott a szín (kattints a színes négyzetre), hogy a réteg mennyivel szélesebb a betűknél, a magassága, valamint a {{ui:nameTag.noHoles}}, amely kitölti a lyukakat az olyan betűkben, mint az O és az A. A {{ui:nameTag.corners}} adja meg, hogyan fordul egy szélesebb réteg a betűk sarkainál: {{ui:nameTag.corner.round}}, {{ui:nameTag.corner.bevel}} vagy {{ui:nameTag.corner.miter}}. A legfelső sor maguk a betűk. A **+** alulra ad hozzá egy réteget, a **–** elveszi az alsó réteget. Egy címkének kettő–hat rétege lehet.
- **{{ui:nameTag.keyring}}:** az alsó rétegnek egy egyenes, kerek végű fület ad egy kulcstartókarika lyukával; a fül a lyukkal együtt nő. Egy 3 mm-es lyuk, az alapértelmezett, 6,5 mm széles fület ad, amely 6,75 mm-rel áll ki, a lyuk széle 2 mm-re van az alsó réteg szélétől. Válaszd ki a {{ui:nameTag.keyringDiameter}} és az {{ui:nameTag.keyringSide}} értékét: {{ui:nameTag.side.left}}, {{ui:nameTag.side.right}} vagy {{ui:nameTag.side.top}}. A {{ui:nameTag.side.free}} leveszi a lyukat a címkéről, és mellé tesz egy külön {{ui:nameTag.keyringTab}} alakzatot a legalsó réteg színében és magasságában: egy egészen közönséges alakzatot, amelyet a fogantyúival oda mozgatsz és forgatsz, ahová a címkén kell. Ha a helyén van, a paneljén a {{ui:nameTag.keyringTabFix}} gomb pontosan ott a legközelebbi címke részévé teszi: a lyuk minden rétegen átmegy, amelyet elér, a fül az alsó réteghez tartozik, és mindkettő a betűk azon sarkánál marad, ha a szöveg vagy a méret változik. A {{ui:nameTag.side.free}} újra kiveszi a fület oda, ahol volt, hogy ismét áthelyezhesd. A lyuk minden rétegen átmegy, amelyhez hozzáér, a fül pedig vele mozog, ha megváltoztatod a szavakat, a betűméretet vagy a betűtípust. {{ui:nameTag.keyringAlong}} feljebb vagy lejjebb tolja a fület az oldala mentén (felül balra vagy jobbra), egészen addig, ahol elhagyná az oldalt; a 0 a közép. Akkor hasznos, ha az oldal közepe egy résre esik, például egy J mellett: told a fület oda, ahol a betű kinyúlik.
- **{{ui:nameTag.letterEdge}}:** lekerekíti vagy letöri a felső rétegen a betűk felső élét, ahogy egy nyomtatott címkét szokás befejezni: {{ui:nameTag.edge.none}}, {{ui:nameTag.edge.round}} vagy {{ui:nameTag.edge.chamfer}}, az {{ui:nameTag.letterEdgeSize}} értékkel (kezdetben 0,4 mm, legfeljebb akkora, mint a réteg magassága). Minden betűtípusnál és szónál működik. Az él a betűk hálójának része, ezért az élműveleti eszköz az ilyen szöveget hálóként veszi, ami egy ilyen finom szövegnél nehézkes; az élt inkább itt válaszd ki.

Minden változás azonnal látszik. A címke köteg: egyben mozog, és minden réteg önálló test marad a saját színében, ahogy a szeletelőnek a többszínű nyomtatáshoz kellenek. Egy réteg éleinek lekerekítéséhez vagy letöréséhez kattints a {{ui:group.editBundle}} gombra, és válaszd ki a réteget, lásd az [Élek letörése és testek kiüregelése](chapter:edges-and-hollowing) fejezetet.

### Sok névcímke egyszerre

Gépeld be a neveket a {{ui:textLayers.names}} mezőbe, soronként egyet, legfeljebb százat. Az alatta lévő gomb megmondja, hány címkét fog készíteni, például „12 névcímke készítése”. Minden címke ugyanazokat a rétegeket, betűméretet és kulcstartólyukat kapja, és önálló objektum; az első alatt sorokba rendeződnek, egymástól 5 mm-re. Egy egyszerű szövegnek is van névlistája, a beállításai között lejjebb.

## Ikoncímkék

Az ikoncímke ugyanaz a címke betűk helyett egy SVG-ikonnal: egy szívvel, egy felhővel, egy klub logójával. Felül az ikon, alatta ugyanaz a körvonal kicsit szélesebben egy második színben, legalul egy lyukak nélküli lap.

- **Új ikoncímke:** válaszd az alakzattárban az {{ui:shape.iconTag}} alakzatot. Megnyílik egy kis ablak: kattints a {{ui:iconTag.browse}} gombra, válassz egy SVG-, PNG- vagy JPG-fájlt, ellenőrizd a képet, gépeld be az ikon {{ui:iconTag.width}} értékét, és kattints az {{ui:iconTag.ok}} gombra. A címke a tárgyasztal közepén áll, ugyanazokkal a rétegekkel, mint egy új névcímke.
- **Vázlattestből:** egy importált SVG-nek vagy egy általad rajzolt vázlatnak a beállításai tetején ott a {{ui:nameTag.makeLayers}} gomb.

A beállítások tetején lévő {{ui:iconTag.title}} kártyán ezek vannak:

- **{{ui:iconTag.replace}}:** egy másik fájl (SVG, PNG vagy JPG) ikonját teszi a címkére; a rétegek és a szélesség változatlanok maradnak.
- **{{ui:iconTag.iconWidth}}:** milyen széles a felső ikon, mm-ben. Minden réteg követi, és egy vonalban marad.
- **{{ui:nameTag.layers}}:** a sorok, mint egy névcímkénél – szín, mennyivel szélesebb, {{ui:nameTag.corners}}, magasság és {{ui:nameTag.noHoles}}, **+** és **–**, kettő–hat réteg. A legfelső sor maga az ikon.
- **{{ui:iconTag.count}}:** hány címkét szeretnél, 1-től 100-ig. Az {{ui:iconTag.fill}} a beállításokban kiválasztott nyomtató tárgyasztalából számolja ki, kis logóknál egy teljes tárgyasztalnyit. Az alatta lévő gomb elkészíti őket, egymástól 5 mm-re, a tárgyasztal közepére rendezve; az első maga a címke.

Az SVG-nek zárt körvonalak kellenek; egy csak nyitott vonalakból álló rajzból nem lehet címke. Az a vázlattest, amelynek a kitöltése vonal, megtartja ezt: ennek a vonalnak a felülete az ikon.

**Egy kép (PNG vagy JPG)** körvonallá alakul, és az előnézet a körvonalat mutatja. A {{ui:iconTag.part}} alatt választod ki, hogy a {{ui:iconTag.part.dark}} vagy a {{ui:iconTag.part.light}} legyen az ikon; kezdetben az a rész, amelyik nem a háttér. Az átlátszó pixelek sosem tartoznak az ikonhoz. Egy olyan SVG, amely csak egyetlen képet tartalmaz – az Inkscape így menti az importált bitképet –, ugyanígy alakul körvonallá. A körvonal a pixeleket követi, ezért egy kis kép durva szélt ad: a néhány száz vagy annál több pixeles képek működnek a legjobban. A {{ui:iconTag.replace}} egy képnek azt a részét veszi, amelyik nem a háttere.

## QR-kódok

A QR-kód egy szövegből vagy webcímből olyan mintát készít, amelyet a telefon kamerája elolvas: link a boltodra egy táblán, a Wi-Fi neve egy poháralátéten, telefonszám egy kulcstartón.

Válaszd az alakzatkönyvtárban a {{ui:shape.qrCode}} elemet. Megnyílik egy ablak; a kurzor már a szövegmezőben áll:

- **{{ui:qrCode.text}}:** amit a kód mond. Az Enter elkészíti a kódot, a Shift+Enter új sort kezd. A mező alatt látod, mennyi hely foglalt; az ékezetes betűk és más különleges jelek két bájtot foglalnak. Ha a szöveg túl hosszú, a mező jelzi.
- **{{ui:qrCode.errorCorrection}}:** L, M, Q vagy H. A magasabb szint akkor is olvasható, ha a kód egy része piszkos vagy karcos (L kb. 7 %, M 15 %, Q 25 %, H 30 %), de ugyanahhoz a szöveghez több modul kell, így minden modul kisebb lesz. Először az M van kiválasztva.
- **{{ui:qrCode.style}}:** a {{ui:qrCode.style.code}} csak a kódot építi meg, 4 mm magasan. A {{ui:qrCode.style.raised}} 1 mm magasan egy 3 mm vastag fehér lapra teszi, két szín kötegeként, így a többszínű nyomtatás a kódot sötéten, a lapot világosan nyomtatja. A {{ui:qrCode.style.engraved}} 1 mm mélyen bevágja a kódot a lapba.
- **{{ui:qrCode.sizeBy}}:** írd be az egész kód {{ui:qrCode.sizeBy.width}} értékét (először 40 mm) vagy egy modul méretét; a másik szám alatta látható. A 0,8 mm alatti modulok figyelmeztetést kapnak. Ez ökölszabály egy 0,4 mm-es fúvókához, nem garancia: a nyomtató, az anyag, a színek és a telefon is számít.
- **{{ui:qrCode.quietZone}}:** a szkennereknek négy modul széles üres szegély kell a kód körül. Lapon a szegély a lap része; csak akkor kapcsold ki, ha a lap egy nagyobb világos felületen ül. A lap nélküli kódnak nincs saját szegélye: hagyd szabadon körülötte a helyet.
- **Magasságok:** a kód magassága, lapon a kód magassága vagy a gravírozás mélysége, és a lap vastagsága.

Az előnézet úgy mutatja a kódot, ahogy megépül. Az {{ui:qrCode.ok}} a tárgyasztal közepére teszi.

A kód olyan test, mint bármelyik másik: mozgasd, forgasd, méretezd (a szélesség és a mélység maradjon egyforma, különben a kód torzul), csoportosítsd, vagy tedd üreggé, és csoportosítsd egy saját alkatrészbe, hogy oda gravírozd. A méretezés az egész kódot méretezi; minden modul négyzet marad.

A beállításai tetején lévő {{ui:qrCode.title}} kártya tartalmazza a szöveget. Módosítsd, és kattints az {{ui:qrCode.regenerate}} gombra: a kód ott épül újra, ahol áll, és olyan szélesen, amilyen most. A hibajavítás, a csendes zóna és a kivitel olyan marad, ahogy választottad; más beállításokhoz készíts új kódot a könyvtárból.

Nyomtatás előtt olvasd be a kódot a telefonoddal, és nyomtatás után még egyszer. A sötét a világoson olvasható a legjobban; a sötét lapon lévő világos kódot nem minden telefon olvassa el.

## Szöveg körív mentén

A felirat ne egyenesen fusson, hanem kövesse egy érme, egy fedél vagy egy gyűrű szélét? Erre való az {{ui:prop.textCurved}} beállítás.

![A szöveg egy kört követ. Minden betű egy közös vonalon áll.](shot:curved-text)

Amint bekapcsolod, a szöveg a kör mentén fut. Minden betű ugyanazon az alapvonalon áll, olyan egyenletesen, mint normál szövegnél. Négy beállítás van:

- **{{ui:prop.textRadius}}** (5–500 mm): Annak a körnek a sugara, amelyen a betűk alapvonala fut. A betűk a helyükön maradnak, csak a hajlításuk változik.
- **{{ui:nameTag.letterSize}}:** Milyen magasak a betűk. Már nem függ az alakzat szélességétől.
- **{{ui:prop.textInward}}:** A szöveget a kör tetejéről az aljára viszi. A betűk ilyenkor a fejükkel a középpont felé mutatnak.
- **{{ui:prop.textFlipped}}:** Csak a betűket fordítja meg, hogy a másik oldalról olvashasd őket. A szöveg a helyén marad a körön.

**A kör középpontja az alakzat középpontja.** Ezért az igazítás a szokásos módon működik: ha a szöveget egy hengerrel vagy gyűrűvel középre igazítod, pontosan koncentrikusan ül rajta. Ha egy fogantyút húzol, a sugár és a betűméret együtt nő, így a felirat nem torzul.

> **Tipp:** A kör tetején a betűk az alapvonalon kívül állnak; az {{ui:prop.textInward}} beállítással belül, a fejükkel a középpont felé. Hogy a felirat ráférjen egy korongra, a sugár és a betűméret összege legyen kisebb a korong sugaránál.
