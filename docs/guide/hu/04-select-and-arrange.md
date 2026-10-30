---
title: Kijelölés és elrendezés
summary: Alakzatok kijelölése, megkeresése az objektumlistában, igazítás, tükrözés, forgatás, lapra fektetés és sokszorozás ismétléssel.
---

## Kijelölés

Egy alakzatra kattintva kijelölöd. A [[Shift]] billentyűvel továbbiakat adsz hozzá, vagy veszel el. Amíg a [[Shift]] le van nyomva, és legalább két alakzat ki van jelölve, egy kis szám számolja őket az egérmutató alatt. Egy üres helyre kattintva megszűnik a kijelölés, és az [[Esc]] is megszünteti. Az üres munkasíkon keretet húzva mindent kijelölsz, amihez a keret hozzáér; nyomva tartott [[Shift]] billentyűvel a keret hozzáadja, ami nem volt kijelölve, és elveszi, ami igen. A [[Ctrl]]+[[A]] pedig minden látható testet kijelöl. Amíg egy testet vagy a keret egy fogóját húzod, az [[Esc]] megszakítja, amíg az egérgomb még le van nyomva: minden visszaáll, ahogy volt, és az előzményekhez semmi nem kerül hozzá.

Ami útban van, azt elrejted ({{ui:editor.tool.hideSelected}}, [[Ctrl]]+[[H]]). Az elrejtett alakzatok a tervben maradnak, csak nem látszanak, és kimaradnak az exportból; az exportálási ablak előre megmondja, hány ilyen van. A [[Ctrl]]+[[Shift]]+[[H]] mindet visszahozza. Ami maradjon a helyén, azt a beállítások tetején lévő lakattal vagy a [[Ctrl]]+[[L]] billentyűvel zárolod. Egy zárolt alakzatot nem lehet mozgatni, átméretezni, forgatni, átszínezni vagy törölni: a fogantyúi szürkék lesznek, a felső nyíl mellett lakat jelenik meg, és az eszközök, amelyek megváltoztatnák, szürkék. Ha egy fogantyú fölé viszed az egeret, a méreteit továbbra is mutatja, egy billentyű pedig, amely megváltoztatná, azt írja ki: „Az objektum zárolva van”. Amíg egy zárolt alakzat a kijelölésben van, a többin sem változik semmi. Az elrejtés, az átnevezés, a másolás és a másolatkészítés továbbra is működik.

A {{ui:editor.group.visibility}} csoport gombján egy szám mutatja, hány alakzat van elrejtve, és egy kattintás mindet újra megjeleníti. Ha elrejtett alakzatokat tartalmazó tervet nyitsz meg, azt egyszer egy üzenet jelzi, a megjelenítésükhöz gombbal.

## Az objektumlista

Sok résznél a nézetben könnyű elveszíteni a fonalat. Az objektumlista ({{ui:editor.tool.showOutliner}} vagy [[Ctrl]]+[[Shift]]+[[O]]) listában mutatja az összes alakzatot. Nyitva vagy zárva marad, ahogy hagytad, minden tervnél, amíg be nem zárod; a választás a böngészőben megmarad.

![Az objektumlista: a „Group” csoport két résszel, mellette egy gömb. Egy mappa ikon megnyitja a csoportot.](shot:object-list)

- Egy bejegyzésre kattintva kijelölöd az alakzatot, a csoporton belüli részeket is. Nyomva tartott [[Shift]] billentyűvel további bejegyzéseket adsz hozzá vagy veszel el, mint a nézetben. A nyilak kinyitják és összecsukják a csoportokat.
- A címke mutatja, hogy egy rész {{ui:outliner.solid}} vagy {{ui:outliner.hole}}.
- A lakat és a szem egyes részeket zárol és rejt el.
- Az {{ui:outliner.rename}} saját nevet ad egy résznek; a beállítások tetején a név melletti ceruza ugyanezt teszi a kijelölt alakzattal. Nagyobb terveknél az értelmes nevek rengeteget segítenek.
- A keresőmező név és fajta szerint is megtalálja az alakzatokat, így a „henger” vagy a „lyuk” szóra is. A csoportokon belül is keres, akármilyen mélyen vannak egymásba ágyazva: egy találatot tartalmazó csoport a listában marad, és kinyílik, hogy megmutassa az egyező részeket és a hozzájuk vezető csoportokat. A saját neve alapján megtalált csoport megnyitáskor az összes részét mutatja.
- A címsor bal szélén lévő nyíl a címsoráig összecsukja a listát, majd újra kinyitja.

A lista a nézetkockától közvetlenül jobbra van rögzítve. A címsoránál fogva húzd bárhová a munkasíkon; a nézetkocka és a kamerasáv alatt halad el. Ejtsd vissza a nézetkocka mellé, vagy kattints duplán a címsorra, és újra rögzül. Hogy hol volt, és hogy össze volt-e csukva, ebben a böngészőben megmarad.

## Helyzet begépelése

A tulajdonságpanel {{ui:inspector.position}} kártyája mutatja, hol áll a kijelölt test, és be is gépelheted: a {{ui:prop.positionX}} és a {{ui:prop.positionY}} a dobozának közepe a tárgyasztalon, ugyanazzal az előjellel, mint a munkasíkon mutatott távolságok, a {{ui:prop.positionZ}} pedig az alja magassága. Az X jobbra, az Y hátrafelé, a Z felfelé számol, a jobbkéz-szabály szerint, mint a Tinkercadben és a CAD-programokban; a tárgyasztalon a tengelynyilak mutatják az irányokat. Az értékek a beállított mértékegységben vannak, a csúszkák pedig olyan messzire érnek, mint a húzás.

## Részek félretétele a tárgyasztal mellé

Egy alakzatot áthúzhatsz a tárgyasztal szélén túlra, és ott hagyhatod, mindegyik oldalon nagyjából egy tárgyasztal-szélességnyire, hogy későbbre félretedd. A nyílbillentyűkkel tetszőleges távolságra mozgathatod. Egy félretett rész továbbra is a terv része, és mindennel együtt bekerül az exportba. Ha ki akarod hagyni, rejtsd el, vagy csak a kijelölést exportáld. Ha kiválasztottál egy nyomtatót, a layerling exportáláskor figyelmeztet, ha valami a tárgyasztalán kívül van.

## Illesztés mozgatás közben

Amikor egy alakzatot a munkasíkon húzol, más alakzatokhoz illeszkedik: a bal, jobb, első vagy hátsó éle vagy a közepe pontosan egy másik alakzat élére vagy közepére kerül. Egy rózsaszín segédvonal mutatja, mihez tartja magát. Így két rész számok begépelése nélkül egy síkban egymás mellé vagy egymás mögé középre kerül. Kikapcsolt rácsnál is működik.

Húzás közben tartsd nyomva a [[Shift]] billentyűt, hogy a mozgás egy tengelyen maradjon: az alakzat abba az irányba, X-be vagy Y-ba megy, amerre jobban elhúztad, a másikat pedig békén hagyja. A [[Shift]] billentyűt legjobb akkor megnyomni, amikor már húzod; egy még ki nem jelölt alakzaton a nyomva tartott [[Shift]] billentyűvel végzett kattintás csak a kijelöléshez adja hozzá.

Ha az [[Alt]] már a húzás kezdetekor le van nyomva, egy másolatot húzol, mint a Tinkercadben: az alakzat a helyén marad, a másolat pedig oda kerül, ahol elengeded. Ha az [[Alt]] billentyűt csak húzás közben nyomod meg, az szünetelteti az illesztést; az alakzat ilyenkor csak a rácsot követi. A másolat is csak akkor illeszkedik, ha húzás közben elengeded az [[Alt]] billentyűt. Az illesztés végleges kikapcsolásához használd a jobb alsó rácsmenüt ({{ui:inspector.objectSnap}}) vagy a beállításokat. Egyelőre csak a normál munkasíkon való mozgatás illeszkedik, az emelés és az átméretezés nem.

## Igazítás

Két vagy több kijelölt alakzatot az {{ui:editor.tool.align}} paranccsal rendezel egy vonalba: a kijelölés körül pontok jelennek meg balra, középre és jobbra, előre, középre és hátra, valamint felülre, középre és alulra. Egy pontra kattintva minden alakzat oda kerül. Ha előbb az egyik kijelölt alakzatra kattintasz, az a helyén marad, a többi pedig hozzá igazodik. Egy zárolt alakzat a kijelölésben magától is ez a rögzített alakzat. A bal, jobb, első, hátsó, felső és alsó az alakzat körüli dobozhoz igazodik; egy háromszög, ötszög vagy csillag közepe viszont a saját közepe, így egy rá középre igazított lyuk az alakzat közepére kerül, nem a dobozáéra.

Egy szögben, mondjuk 45°-kal elforgatott alakzatnál a körülötte lévő dobozhoz igazodik, nem a saját éleihez. Ha az élekhez igazítanál, előbb tegyél egy munkasíkot az alakzat egyik lapjára ({{ui:camera.placeWorkplane}}, majd kattints a lapra): a pontok ekkor ennek a síknak a tengelyein állnak, az alakzatokat pedig ezek mentén méri és mozgatja, mint a Tinkercad. Állítsd vissza a munkasíkot, hogy újra a tárgyasztal mentén igazíts.

![Az Igazítás pontokként mutatja a lehetséges célokat a kijelölés körül.](shot:align)

A billentyűje az [[L]]. Az [[Esc]] megszakítja.

## Tükrözés

A {{ui:editor.tool.mirror}} ([[M]], vagy jobb kattintás a kijelölésen és kiválasztás) egy síkra tükrözi a kijelölést: {{ui:mirror.leftRight}}, {{ui:mirror.frontBack}} vagy {{ui:mirror.topBottom}}. Kattints a megfelelő tengelynyílra. Ez szimmetrikus alkatrészeknél hasznos: építsd meg az egyik felét, másold le, és tükrözd a másolatot.

## Forgatás és a forgatási pont megadása

Az alakzaton lévő íves nyilakkal, a beállításokban lévő számokkal vagy az [[R]] billentyűvel 45°-os lépésekben forgatsz. Ha a forgatókörön húzol, a forgatás minden osztásnál megáll, vagyis 22,5°-onként; finomabb lépésekhez tartsd nyomva a [[Shift]] billentyűt, ilyenkor 11,25°-onként további osztások jelennek meg. A körön kívül húzva szabadon forgatsz 1°-os lépésekben, [[Shift]] billentyűvel 45°-osakban. Általában a kijelölés a közepe körül fordul. Néha ez nem jó, például ha egy megdöntött csövet a végénél kellene tovább forgatni. Erre való a {{ui:editor.tool.rotationPivot}}: utána kattints egy lapra. Egy sík lap a közepét adja, például egy csővég tengelyét. A kijelölés most e pont körül fordul. Az eszközre még egyszer kattintva eltávolítod.

A szögek a testtel maradnak. A beállításaiban az {{ui:inspector.rotation}} mutatja őket {{ui:prop.rotateX}}, {{ui:prop.rotateY}} és {{ui:prop.rotateZ}} néven, a helyzethez hasonlóan elnevezve: az Y a tárgyasztalon keresztben fut, a Z felfelé mutat. Gépelj be ott egy szöget, és a test arra fordul – a közepe körül, vagy a saját forgatási pontja körül, ha van neki. Amíg egy elforgatott test ki van jelölve, a szögei a munkasíkon alatta is látszanak; a beállításokban az {{ui:workspace.showRotationAngles}} ezt kikapcsolja.

![Két tengely körül elforgatott test: a szögei alatta állnak, a beállításaiban lévő Elforgatás kártya pedig számként fogadja őket.](shot:rotation-card)

Ha **egy test** van kijelölve, a forgatási pont ahhoz a testhez tartozik: jelölj ki más részeket, térj vissza, és még mindig ott van. Mozog, fordul és méreteződik a testtel, a projektben mentődik, és a Visszavonással is visszajön. A {{ui:inspector.position}} alatt a forgatási pontnak saját X, Y és Z értéke van, amelyet begépelhetsz vagy léptethetsz, az {{ui:inspector.pivotRemove}} pedig eltávolítja. A forgatási pont piros jelölőjét egérrel is húzhatod: a testek felületén csúszik, és a sarkokhoz, élfelezőkhöz és élekhez illeszkedik, így egy zsanércsap pontosan egy sarokra kerül. Több kijelölt testnél a forgatási pont csak arra a kijelölésre érvényes, és egy új kijelölés eltávolítja. Ha csoportosítod vagy kötegbe fogod őket, megmarad: a csoport saját forgáspontként veszi át, X, Y és Z értékkel a {{ui:inspector.position}} alatt.

## Lapra fektetés

Nyomtatáshoz egy alkatrésznek a legjobb oldalán kellene feküdnie? Jelöld ki, kattints a {{ui:editor.tool.layFlat}} gombra, majd arra a lapra, amelyik lefelé kerüljön. Amíg a mutatót az alkatrész fölött mozgatod, az alatta lévő lap kivilágosodik, így látod, melyiket fogod kiválasztani; a többi oldal ellenőrzéséhez forgasd el a nézetet. Az alkatrész úgy fordul, hogy ez a lap feküdjön a munkasíkon.

Két alkatrésznek lappal lapra kellene illeszkednie, vagy egy síkba kerülnie? Jelöld ki a mozgatandó alkatrészt, kattints a {{ui:editor.tool.mateFaces}} gombra, majd kattints a lapjára, azután a másik alkatrész lapjára. A panelen a {{ui:mate.mode.against}} egymásnak fordítja a lapokat (háttal egymásnak, érintkezve), az {{ui:mate.mode.flush}} egy síkba fekteti őket egymás mellett; a {{ui:mate.gap}} helyet hagy közöttük, például hézagnak. Az {{ui:mate.apply}} elmozdítja az alkatrészt: a legrövidebb úton fordul, amíg a lapok párhuzamosak nem lesznek – egyáltalán nem, ha már azok –, majd csak a másik lap felé csúszik, így oldalirányban megtartja a helyét. A másik alkatrész a helyén marad, és egyetlen Visszavonás mindent visszavesz.

![A Lapok igazítása panel: a mozgó alkatrész ki van választva, következik a másik alkatrész egy lapja, aztán laptól lapig vagy egy síkba, és egy tetszőleges hézag.](shot:mate-faces)

**Furatok egy tengelyen:** {{ui:mate.mode.concentric}} ehelyett kerek lapokat igazít: furatot furat fölé, csapot furatba, csavart a menet nélküli furatába. Válaszd ki, mielőtt a lapokra kattintasz. Aztán kattints a mozgó alkatrészen egy furat kerek belsejére (vagy egy csap külsejére), majd a másik alkatrész egy kerek lapjára; az egész kerek lap kivilágosodik, amíg rámutatsz. Az {{ui:mate.apply}} a legrövidebb úton elforgatja az alkatrészt, amíg a két tengely párhuzamos nem lesz, majd keresztben a másik tengelyre tolja. A tengely mentén ott marad, ahol volt, így egy csap megtartja a magasságát; utána told be. Importált hálókon is működik, ha a furat egy tengely körüli lapokból áll.

**Pontos szög két lap között:** a {{ui:editor.tool.mateFaces}} párhuzamosan hagyja a lapokat; a köztük lévő szöghöz nincs külön eszköz, de így is célba érsz. Előbb hozd össze a lapokat a {{ui:editor.tool.mateFaces}} paranccsal, hogy párhuzamosak legyenek. Ezután tedd a forgatási pontot arra az élre, ahol találkoznak ({{ui:editor.tool.rotationPivot}}, kattints az élre vagy egy sarokra), és gépeld be a szöget, mondjuk 15-öt vagy 30-at, az alkatrész {{ui:inspector.rotation}} kártyáján. A forgatási pont körül fordul. A kártya tengelyei a tárgyasztal tengelyei, így ez akkor működik, ha az él X, Y vagy Z mentén fut.

Ugyanilyen egyszerű a {{ui:editor.tool.dropToWorkplane}} ([[D]]), amely a munkasíkra ejti a kijelölést, és a {{ui:editor.tool.centerOnWorkplane}}.

A [[C]] felveszi a kijelölést, mint a Cruise a Tinkercadben: követi az egérmutatót, és ráfekszik annak a testnek a lapjára, amely fölött jársz, a ferdékre is. Egy kattintás oda leteszi, az [[Esc]] ott hagyja, ahol volt. Az alja ezután a lapon nyugszik, a lap éleihez igazítva, ahogy egy új alakzat is; a függőleges tengelye körüli saját elfordulását megtartja. Több alkatrész együtt utazik, és megtartja a távolságát. Az üres tárgyasztal fölött a [[C]] egy megdöntött alkatrészt újra függőlegesen állít a munkasíkra.

## Ismétlés: sor és kör

Lyukrácsokhoz, furatkörökhöz és foggyűrűkhöz ott van az {{ui:editor.tool.array}}. Jelöld ki a sokszorozandó alakzatokat, és kattints rá a szalagon.

![Az ismétlés „Kör” módban: a másolatok előbb előnézetként jelennek meg.](shot:pattern-tool)

- **{{ui:array.mode.row}}:** A kijelölés egyenlő távolságonként ismétlődik. A sor egyszerre mindhárom tengely mentén lép, a {{ui:array.spacingX}}, a {{ui:array.spacingY}} és a {{ui:array.spacingZ}} értékkel: ezek közül egy egyenes sort ad, kettő vagy három átlós sort vagy lépcsőt. Negatív távolsággal a sor a másik irányba halad.
- **{{ui:array.mode.circle}}:** A kijelölés egy középpont körül oszlik el. Hogy hány másolat legyen, a {{ui:array.count}} alatt adod meg, a {{ui:array.angle}} pedig teljes körhöz 360°. Válaszd ki, hogy a másolatok forduljanak-e. Az {{ui:array.rise}} minden másolatot kicsit magasabbra emel az előzőnél (csavarvonal vagy emelkedő spirál), a {{ui:array.radiusChange}} pedig távolabb viszi a középponttól vagy közelebb hozza hozzá (lapos spirál); a kettő együtt kúpos spirált ad. A spirál legfeljebb egyet fordul: a 360° feletti szög teljes körnek számít, és legfeljebb 100 másolat lehet.

Tipp: előbb tedd a forgatási pontot egy lapra a {{ui:editor.tool.rotationPivot}} paranccsal, és a kör középpontja pontosan oda kerül.

![Az ismétlés „Kör” módban, másolatonkénti emelkedéssel és sugárváltozással: a másolatok spirálként emelkednek és tágulnak.](shot:pattern-spiral)

A másolatok előbb előnézetként jelennek meg. Csak a {{ui:array.apply}} hozza létre őket. Ha a másolatok lyukak, utána csoportosítsd őket azzal a testtel, amelybe vágniuk kell.

## Lyukminta egy lapon

Szellőzőkhöz, hangszórórácsokhoz, kosarakhoz és dobozokhoz a {{ui:holePattern.title}} egyenletesen elosztja a lyukakat egy sík lapon. Többé nem kell egy lyukat elkészítened, megismételned és a falra tenned. Jelölj ki pontosan egy testet, és kattints az eszköztár {{ui:editor.group.modify}} csoportjában az ismétlés melletti {{ui:holePattern.title}} gombra. Jobb kattintással is elérheted a testen, vagy megkeresheted a [[Ctrl]]+[[K]] billentyűvel.

1. Kattints a test egyik sík lapjára. A kattintás körüli teljes sík lap számít, nem csak a mutató alatti háromszög. Görbe lap nem működik: kapsz egy figyelmeztetést, és helyette egy sík lapra kattintasz.
2. Az ablakban állítsd be, milyenek legyenek a lyukak, és hogyan helyezkedjenek el:
   - **{{ui:holePattern.form}}:** {{ui:holePattern.form.round}}, {{ui:holePattern.form.square}}, {{ui:holePattern.form.rectangle}}, {{ui:holePattern.form.hexagon}} vagy {{ui:holePattern.form.slot}}.
   - **Méret:** a kerek lyuk {{ui:holePattern.size.diameter}} értéke, a négyzet alakúé az {{ui:holePattern.size.side}}, a téglalapé és a hosszlyuké a {{ui:holePattern.size.width}} és a {{ui:holePattern.size.height}}. A hatszögnél a méret a {{ui:holePattern.size.corners}}.
   - **{{ui:holePattern.spacing}}:** az egyik lyuk közepétől a következőéig mért távolság. Ha kisebb, mint amit a lyukak engednek, a layerling a lehető legkisebb értékre emeli, hogy fal maradjon a lyukak között.
   - **{{ui:holePattern.wall}}:** ugyanez a távolság másképp megadva: a két szomszédos lyuk között maradó fal, vagyis a falvastagság a nyomatban. Ha ezt állítod, a középtől középig mért osztás követi, és fordítva. Hatszögeknél, téglalapoknál és hosszlyukaknál a layerling az éleik közötti legkisebb távolságot méri.
   - **{{ui:holePattern.arrangement}}:** a {{ui:holePattern.arrangement.grid}} sorokba és oszlopokba rendezi a lyukakat. Az {{ui:holePattern.arrangement.staggered}} minden második sort fél osztással eltol, és közelebb hozza a sorokat, így minden lyuknak azonos távolságra vannak a szomszédai – hatszögekkel ebből méhsejt lesz.
   - **{{ui:holePattern.margin}}:** a lyukak és a lap széle közötti szabad távolság. Csak azok a lyukak készülnek el, amelyek teljesen a lap e szegéllyel csökkentett területén belül vannak; ami túlnyúlna rajta, kimarad. A szegély a lapon lévő nyílások körül is érvényes.
   - **{{ui:holePattern.depth}}:** az {{ui:holePattern.depth.through}} (alapértelmezett) átvágja az egész falat. Az {{ui:holePattern.depth.custom}} beállítással milliméterben adod meg a mélységet, például bemélyedésekhez.
3. A lyukak azonnal előnézetként látszanak a lapon, és minden értéket követnek. Az ablak megmondja, hány lyuk fér el. A {{ui:holePattern.repick}} másik lapot választ, az [[Esc]] bezárja az eszközt, és a többi eszközablakhoz hasonlóan a címsoránál fogva mozgatható.
4. Csak a {{ui:holePattern.apply}} készíti el a lyukakat.

A lyukak közönséges lyukak, a testtel csoportosítva, pont mint a {{ui:editor.tool.group}} után: semmi sincs „beégetve”. A {{ui:editor.tool.ungroup}} újra feloldja a csoportot, és minden lyukat felszabadít, amelyeket ezután egyenként mozgathatsz, módosíthatsz vagy törölhetsz. Az egész egyetlen lépés a {{ui:editor.tool.undo}} számára. Az eszköz egyszerre legfeljebb 400 lyukat készít; ilyenkor legyenek nagyobbak a lyukak, vagy nagyobb a távolság.

Egy MI ugyanezt az MCP-hídon keresztül is meg tudja tenni a `layerling_perforate_face` paranccsal (lásd az [MI MCP-vel](chapter:ai-with-mcp) fejezetet).

## Több rész módosítása egyszerre

Ha több rész van kijelölve, a jobb oldali tulajdonságpanel mutatja, hány van, és azt kínálja, ami mindegyikre együtt vonatkozik: {{ui:inspector.solid}} vagy {{ui:inspector.hole}}, egy szín mindegyiknek (a {{ui:inspector.solid}} gombra kattintva megnyílnak a színek) és a zárolás. Vegyes kijelölésnél egy kattintással mind tömör vagy mind lyuk lesz. Ha bármelyik rész zárolva van, csak a zárolás használható. A méreteket a fogantyúkkal, a {{ui:scalePercent.title}} paranccsal vagy egy méretcímkébe gépelt számmal változtatod. Több résznél a szám a teljes kijelölés mérete: minden rész vele nő, a köztük lévő hézagok is, mint amikor egy fogantyút húzol. A tömör és a lyuk jobb kattintással vagy az [[S]] és a [[H]] billentyűvel is működik.

## Méretezés százalékban

Ha egy vagy több részt ugyanannyival nagyobbítanál vagy kisebbítenél, mondjuk egy nyomtatási fájl összes részét 20%-kal, használd a {{ui:scalePercent.title}} parancsot. Jelöld ki a részeket, kattints rájuk jobb gombbal, és válaszd a {{ui:scalePercent.title}} parancsot, vagy keresd meg a [[Ctrl]]+[[K]] billentyűvel.

Az {{ui:scalePercent.percent}} alá a jelenlegi méret százalékában gépeled be az új méretet: 120% egyötöddel nagyobb, 50% fele akkora. A szélesség, a mélység és a magasság egyformán változik, így az arányok megmaradnak. Az alja a helyén marad, így semmi sem süllyed a tárgyasztalba.

Több résznél kiválasztod, hogyan nőjenek:

- **{{ui:scalePercent.mode.together}}:** A részek a közös középpontjuk körül nőnek, és a hézagok is velük nőnek. Az egész úgy lesz nagyobb, mintha egyetlen rész lenne.
- **{{ui:scalePercent.mode.each}}:** Minden rész ott nő, ahol áll, és a köztük lévő hézagok ugyanakkorák maradnak.

Csak a {{ui:scalePercent.apply}} módosítja a tervet, és egy lépés visszavonással visszacsinálható. Ha zárolt rész van a kijelölésben, nem nyílik meg.

## Visszavonás

A {{ui:editor.tool.undo}} ([[Ctrl]]+[[Z]]) és a {{ui:editor.tool.redo}} ([[Ctrl]]+[[Shift]]+[[Z]] vagy [[Ctrl]]+[[Y]]) végiglépked az előzményeiden. Hogy hány lépés kerüljön a mentett tervbe, azt a beállításokban az {{ui:workspace.history}} alatt adod meg. Ha valamelyik gomb fölé viszed a mutatót, a súgója megnevezi a lépést, amelyet visszavon vagy újra végrehajt, és a méretet is, ha a lépésnek van, például „Élek lekerekítve: Box (5 mm)”; az utána megjelenő üzenet ugyanezt mondja. Ha egyszerre több lépést mennél vissza, használd lejjebb az előzmények nézetet.

## Visszatekintés: az előzménynézet

Az {{ui:editor.tool.history}}, a visszavonás és a mégis mellett, anélkül nyit meg egy nézetet az előzményeidről, hogy bármit megváltoztatna. A munkaterület úgy mutatja a tervet, ahogy volt, alul pedig egy csúszka fut végig minden visszavonási lépésen: a jobb szélén a jelenlegi állapot van, balra minden lépés egy visszavonással korábbi, a visszavont állapotok pedig a jelenlegitől jobbra ülnek. A nyílbillentyűk végiglépkednek az állapotokon, az [[Esc]] visszavisz a jelenlegi állapothoz. Az egérgörgő a csúszka fölött ugyanezt teszi, kattanásonként egy állapotot, felfelé egy korábbira; a [[Page Up]] és a [[Page Down]] tíz állapotot ugrik, a [[Home]] a legrégebbi állapotra, az [[End]] vissza a jelenlegire visz. Közben forgathatod és nagyíthatod a nézetet, és rákattinthatsz objektumokra, hogy visszahozd őket (lásd lent), de semmit sem lehet mozgatni; maga a terv pontosan olyan marad, amilyen. Ha a sáv eltakar valamit, húzd el a címsoránál fogva; egy dupla kattintás rajta visszahozza. A címsor lista gombja névvel, listában mutatja az összes lépést, a legújabbat felül: egy lépésre kattintva arra az állapotra ugrasz, az az állapot, ahol a terv áll, {{ui:historyView.listNow}} jelölést kap, a visszavont lépések szürkék. Ha nyitva hagyod a listát, legközelebb is nyitva lesz.

Egy korábbi állapotból két dolgot vihetsz magaddal. Az {{ui:historyView.createProject}} ezt az állapotot egy új tervbe teszi az áttekintésben, ennek a tervnek a nevével, zárójelben az állapot idejével – egy olyan tervnél, amelyet még azelőtt mentettek, hogy a layerling időpontokat rögzített volna, helyette „másolat” áll –, és az addigi előzményekkel, így ott is működik a visszavonás. Az {{ui:historyView.export}} a szokásos exportot nyitja meg ezzel az állapottal mint tervvel, így elmentheted STL, 3MF, STEP, kép vagy LYL fájlként, az addigi előzményekkel.

Egyes objektumokat is visszahozhatsz a tervbe. Kattints egy objektumra a mutatott állapotban - a [[Shift]]+kattintás továbbiakat ad hozzá vagy egyet kivesz, az üres helyre kattintás semmit sem választ - és válaszd a {{ui:historyView.bringBack}} gombot. A nézet bezárul, és minden objektum egy másolata bekerül a jelenlegi tervbe pontosan úgy, ahogy abban az állapotban volt, és azon a helyen, ahol ott állt, kijelölve, minden mellé, amit a terv most tartalmaz; más nem változik. Ez egy lépés, a visszavonás visszaveszi. Akkor hasznos, ha egy azóta megváltoztatott vagy törölt alkatrész korábbi változata kell. Egy csoport egészben jön vissza; az objektum jegyzetei és referenciapontjai maradnak. A neve viseli az állapot idejét, például „Doboz (12:32)”, így könnyen megkülönböztethető a terv mostani változatától. Ha egy csoporton belüli alkatrészt akarsz visszahozni, jelöld ki a csoportot, és válaszd a {{ui:historyView.openGroup}} lehetőséget, vagy nyomd meg az [[E]] billentyűt, mint a tervben: az alkatrészei oda kerülnek, ahová a csoport szerkesztése tenné őket, kijelölhetően, a sáv pedig mutatja, melyik csoportban vagy. A {{ui:historyView.backOut}} újra bezárja. Ez csak nézelődésre szolgál - a csoport, a terv és az előzmények változatlanok maradnak.

Az {{ui:historyView.delete}} egyedül áll a sáv bal alsó részén. Egy rákérdezés után minden korábbi lépést véglegesen eltávolít: a terv megtartja a mostani állapotát (nem a megjelenítettet), a Visszavonásnak nincs hova visszalépnie, és az ezután mentett fájl nem tartalmaz előzményt. Akkor használd, ha egy tervet a múltja nélkül osztanál meg, vagy újrakezdenéd a visszavonási lépéseket. Nem vonható vissza; ha a saját terved érintése nélkül osztanál meg egy fájlt, inkább exportáláskor válaszd a {{ui:export.historyNone}} lehetőséget.
